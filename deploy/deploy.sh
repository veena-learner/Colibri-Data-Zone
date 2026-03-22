#!/usr/bin/env bash
# Deploy Colibri Data Zone to ECS (Fargate + ALB + DynamoDB).
# Requires: AWS CLI, Docker, jq. Set AWS credentials via env (e.g. AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_SESSION_TOKEN).
# Usage: ./deploy/deploy.sh [stack-name]

set -e
STACK_NAME="${1:-colibri-datazone}"
REGION="${AWS_REGION:-us-east-1}"
ENVIRONMENT="${ENVIRONMENT:-production}"
TABLE_NAME="ColibriDataZone-${ENVIRONMENT}"

echo "=== Colibri Data Zone ECS Deploy ==="
echo "Stack: $STACK_NAME  Region: $REGION  Table: $TABLE_NAME"

# Resolve VPC and subnets (use default VPC if available)
get_net() {
  local def_vpc
  def_vpc=$(aws ec2 describe-vpcs --region "$REGION" --filters "Name=isDefault,Values=true" --query 'Vpcs[0].VpcId' --output text 2>/dev/null || true)
  if [[ -z "$def_vpc" || "$def_vpc" == "None" ]]; then
    echo "No default VPC. Pass VpcId and SubnetIds to CloudFormation." >&2
    def_vpc=$(aws ec2 describe-vpcs --region "$REGION" --query 'Vpcs[0].VpcId' --output text)
  fi
  echo "$def_vpc"
}

# One subnet per AZ (ALB cannot attach to multiple subnets in the same AZ)
get_subnets() {
  local vpc_id="$1"
  aws ec2 describe-subnets --region "$REGION" --filters "Name=vpc-id,Values=$vpc_id" \
    --query 'sort_by(Subnets, &AvailabilityZone)[*].[AvailabilityZone,SubnetId]' --output text \
    | awk '!seen[$1]++ {print $2}' | paste -sd ',' -
}

if ! command -v aws &>/dev/null; then
  echo "AWS CLI not found." >&2
  exit 1
fi

VPC_ID=$(get_net)
SUBNET_IDS=$(get_subnets "$VPC_ID")
if [[ -z "$SUBNET_IDS" ]]; then
  echo "Could not get subnets for VPC $VPC_ID" >&2
  exit 1
fi
# CloudFormation expects comma-separated for List<AWS::EC2::Subnet::Id> in some versions; actually it's a list
# Pass as comma-separated and convert: we need to pass multiple values. Use --parameter-overrides with SubnetIds="subnet-1,subnet-2"
echo "Using VPC: $VPC_ID  Subnets: $SUBNET_IDS"

# Create or update stack (SubnetIds: comma-separated, escape commas for CLI)
TEMPLATE_FILE="$(dirname "$0")/cloudformation-ecs-full.yaml"
# Escape commas in SubnetIds so AWS CLI treats it as a single string value
SUBNET_IDS_ESC="${SUBNET_IDS//,/\\,}"
PARAMS=(
  "ParameterKey=Environment,ParameterValue=$ENVIRONMENT"
  "ParameterKey=VpcId,ParameterValue=$VPC_ID"
  "ParameterKey=SubnetIds,ParameterValue=$SUBNET_IDS_ESC"
  "ParameterKey=DynamoDBTableName,ParameterValue=$TABLE_NAME"
)

STACK_STATUS=$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" --region "$REGION" --query 'Stacks[0].StackStatus' --output text 2>/dev/null || echo "NO_STACK")
if [[ "$STACK_STATUS" == "ROLLBACK_COMPLETE" ]] || [[ "$STACK_STATUS" == "ROLLBACK_FAILED" ]]; then
  echo "Stack $STACK_NAME is in $STACK_STATUS. Deleting before re-create..."
  aws cloudformation delete-stack --stack-name "$STACK_NAME" --region "$REGION"
  aws cloudformation wait stack-delete-complete --stack-name "$STACK_NAME" --region "$REGION"
  STACK_STATUS="NO_STACK"
fi

if [[ "$STACK_STATUS" != "NO_STACK" ]]; then
  echo "Updating stack $STACK_NAME..."
  if aws cloudformation update-stack \
    --stack-name "$STACK_NAME" \
    --template-body "file://$TEMPLATE_FILE" \
    --parameters "${PARAMS[@]}" \
    --capabilities CAPABILITY_NAMED_IAM \
    --region "$REGION" 2>/dev/null; then
    aws cloudformation wait stack-update-complete --stack-name "$STACK_NAME" --region "$REGION"
  else
    echo "(Stack already up to date or update in progress)"
  fi
else
  echo "Creating stack $STACK_NAME..."
  aws cloudformation create-stack \
    --stack-name "$STACK_NAME" \
    --template-body "file://$TEMPLATE_FILE" \
    --parameters "${PARAMS[@]}" \
    --capabilities CAPABILITY_NAMED_IAM \
    --region "$REGION"
  aws cloudformation wait stack-create-complete --stack-name "$STACK_NAME" --region "$REGION"
fi

ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
ECR_BACKEND="${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com/colibri-backend:latest"
ECR_FRONTEND="${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com/colibri-frontend:latest"

echo "Logging in to ECR..."
aws ecr get-login-password --region "$REGION" | docker login --username AWS --password-stdin "${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com"

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# Build for linux/amd64 so images run on ECS Fargate (avoid "exec format error" on Apple Silicon)
echo "Building and pushing backend (linux/amd64)..."
docker build --platform linux/amd64 -t "$ECR_BACKEND" "$ROOT/backend"
docker push "$ECR_BACKEND"

echo "Building and pushing frontend (linux/amd64)..."
docker build --platform linux/amd64 -t "$ECR_FRONTEND" "$ROOT/frontend"
docker push "$ECR_FRONTEND"

# Create or update ECS services (services are not in the stack so stack completes quickly)
get_output() { aws cloudformation describe-stacks --stack-name "$STACK_NAME" --region "$REGION" --query "Stacks[0].Outputs[?OutputKey=='$1'].OutputValue" --output text 2>/dev/null || true; }
CLUSTER=$(get_output EcsClusterName)
SG_ID=$(get_output EcsSecurityGroupId)
BACKEND_TG=$(get_output BackendTargetGroupArn)
FRONTEND_TG=$(get_output FrontendTargetGroupArn)
SUBNETS_OUT=$(get_output SubnetIds)
# Use stack output subnets if available, else keep script-discovered subnets
if [[ -n "$SUBNETS_OUT" && "$SUBNETS_OUT" != "None" ]]; then
  SUBNETS_ECS="$SUBNETS_OUT"
else
  SUBNETS_ECS="$SUBNET_IDS"
fi
TASK_FAMILY_BACKEND="colibri-backend-${ENVIRONMENT}"
TASK_FAMILY_FRONTEND="colibri-frontend-${ENVIRONMENT}"

if [[ -z "$CLUSTER" || -z "$SG_ID" || -z "$BACKEND_TG" || -z "$FRONTEND_TG" ]]; then
  echo "Skipping ECS services (missing stack outputs)."
else
  # Grace period gives new tasks time to start before ALB health checks matter for ECS
  HEALTH_GRACE=300
  echo "Ensuring ECS services exist and deploying new images (healthCheckGracePeriod=${HEALTH_GRACE}s)..."
  for SVC in colibri-backend colibri-frontend; do
    if aws ecs describe-services --cluster "$CLUSTER" --services "$SVC" --region "$REGION" --query 'services[0].status' --output text 2>/dev/null | grep -q ACTIVE; then
      aws ecs update-service --cluster "$CLUSTER" --service "$SVC" --force-new-deployment --health-check-grace-period-seconds "$HEALTH_GRACE" --region "$REGION" --query 'service.serviceName' --output text 2>/dev/null || true
    else
      if [[ "$SVC" == "colibri-backend" ]]; then
        TASK_DEF="$TASK_FAMILY_BACKEND"
        TG_ARN="$BACKEND_TG"
        CONTAINER="colibri-backend"
        PORT=3001
      else
        TASK_DEF="$TASK_FAMILY_FRONTEND"
        TG_ARN="$FRONTEND_TG"
        CONTAINER="colibri-frontend"
        PORT=80
      fi
      aws ecs create-service \
        --cluster "$CLUSTER" \
        --service-name "$SVC" \
        --task-definition "$TASK_DEF" \
        --desired-count 1 \
        --launch-type FARGATE \
        --health-check-grace-period-seconds "$HEALTH_GRACE" \
        --network-configuration "awsvpcConfiguration={subnets=[$SUBNETS_ECS],securityGroups=[$SG_ID],assignPublicIp=ENABLED}" \
        --load-balancers "targetGroupArn=$TG_ARN,containerName=$CONTAINER,containerPort=$PORT" \
        --region "$REGION" \
        --query 'service.serviceName' --output text 2>/dev/null || true
    fi
  done
fi

echo "Seeding DynamoDB table: $TABLE_NAME"
export AWS_REGION="$REGION"
export DYNAMODB_TABLE="$TABLE_NAME"
(cd "$ROOT" && npm run seed:dynamodb --workspace=backend)

ALB_DNS=$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" --region "$REGION" --query "Stacks[0].Outputs[?OutputKey=='AlbDnsName'].OutputValue" --output text)
echo ""
echo "=== Deploy complete ==="
echo "UI URL: http://${ALB_DNS}"
echo "Login: admin@colibri.io (or veena.anantharam@colibrigroup.com) — same password as local."
echo "Table: $TABLE_NAME"
echo ""
echo "If you see 503: wait 3–5 min for health checks, then run: ./deploy/check-health.sh"
