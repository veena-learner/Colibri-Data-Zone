#!/usr/bin/env bash
# Quick health check for Colibri ECS deployment. Run after deploy.sh.
# Usage: ./deploy/check-health.sh [stack-name]
set -e
STACK_NAME="${1:-colibri-datazone}"
REGION="${AWS_REGION:-us-east-1}"

echo "=== Colibri deployment health check ==="
echo "Stack: $STACK_NAME  Region: $REGION"
echo ""

get_output() {
  aws cloudformation describe-stacks --stack-name "$STACK_NAME" --region "$REGION" \
    --query "Stacks[0].Outputs[?OutputKey=='$1'].OutputValue" --output text 2>/dev/null || true
}

CLUSTER=$(get_output EcsClusterName)
ALB_DNS=$(get_output AlbDnsName)

if [[ -z "$CLUSTER" ]]; then
  echo "Stack or cluster not found. Is the stack in CREATE_COMPLETE/UPDATE_COMPLETE?"
  exit 1
fi

echo "1. ECS services and task counts"
aws ecs describe-services --cluster "$CLUSTER" --services colibri-backend colibri-frontend --region "$REGION" \
  --query 'services[*].{Service:serviceName,Running:runningCount,Desired:desiredCount,Status:status}' --output table 2>/dev/null || echo "  (could not list services)"
echo ""

echo "2. Target group health (503 = no healthy targets here)"
HEALTHY_ANY=0
for TG_NAME in colibri-backend-production colibri-frontend-production; do
  TG_ARN=$(aws elbv2 describe-target-groups --names "$TG_NAME" --region "$REGION" --query 'TargetGroups[0].TargetGroupArn' --output text 2>/dev/null || true)
  if [[ -n "$TG_ARN" && "$TG_ARN" != "None" ]]; then
    echo "  $TG_NAME:"
    aws elbv2 describe-target-health --target-group-arn "$TG_ARN" --region "$REGION" \
      --query 'TargetHealthDescriptions[*].{Target:Target.Id,Port:Target.Port,Health:TargetHealth.State,Reason:TargetHealth.Reason}' --output table 2>/dev/null || true
    COUNT=$(aws elbv2 describe-target-health --target-group-arn "$TG_ARN" --region "$REGION" --query 'length(TargetHealthDescriptions[?TargetHealth.State==`healthy`])' --output text 2>/dev/null || echo "0")
    [[ "${COUNT:-0}" -gt 0 ]] && HEALTHY_ANY=1
  fi
done
if [[ "$HEALTHY_ANY" -eq 0 ]]; then
  echo "  >>> No healthy targets yet. Wait 2-3 min for health checks, then re-run this script."
fi
echo ""

echo "3. ECS service events (why tasks stopped or could not be placed)"
for SVC in colibri-backend colibri-frontend; do
  echo "  --- $SVC ---"
  aws ecs describe-services --cluster "$CLUSTER" --services "$SVC" --region "$REGION" \
    --query 'services[0].events[0:5].[createdAt,message]' --output text 2>/dev/null | while read -r line; do echo "    $line"; done || true
done
echo ""

echo "4. Recent STOPPED tasks (exit code and reason)"
TASKS=$(aws ecs list-tasks --cluster "$CLUSTER" --region "$REGION" --desired-status STOPPED --max-items 5 --query 'taskArns' --output text 2>/dev/null || true)
if [[ -n "$TASKS" && "$TASKS" != "None" ]]; then
  aws ecs describe-tasks --cluster "$CLUSTER" --tasks $TASKS --region "$REGION" \
    --query 'tasks[*].{Task:taskArn,Reason:stoppedReason,ExitCode:containers[0].exitCode,ReasonDetail:containers[0].reason}' --output table 2>/dev/null || true
else
  echo "  (no stopped tasks listed)"
fi
echo ""

echo "5. UI URL"
echo "  http://${ALB_DNS}"
echo "  If Running=0 or targets unhealthy, check section 3 (events) and CloudWatch:"
echo "    aws logs filter-log-events --log-group-name /ecs/colibri-backend --region $REGION --start-time \$(( (\$(date +%s) - 1800) * 1000 )) --query 'events[*].message' --output text"
echo "    aws logs filter-log-events --log-group-name /ecs/colibri-frontend --region $REGION --start-time \$(( (\$(date +%s) - 1800) * 1000 )) --query 'events[*].message' --output text"
