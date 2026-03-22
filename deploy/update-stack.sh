#!/usr/bin/env bash
# Update CloudFormation stack using params file (avoids CLI comma parsing for SubnetIds).
# Edit deploy/stack-params.json if your VpcId or SubnetIds differ.
# Usage: ./deploy/update-stack.sh [stack-name]
set -e
STACK_NAME="${1:-colibri-datazone}"
REGION="${AWS_REGION:-us-east-1}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PARAMS_FILE="${SCRIPT_DIR}/stack-params.json"
TEMPLATE_FILE="${SCRIPT_DIR}/cloudformation-ecs-full.yaml"

if [[ ! -f "$PARAMS_FILE" ]]; then
  echo "Missing $PARAMS_FILE. Create it with your VpcId and SubnetIds." >&2
  exit 1
fi

echo "Updating stack: $STACK_NAME (region: $REGION)"
aws cloudformation update-stack \
  --stack-name "$STACK_NAME" \
  --template-body "file://${TEMPLATE_FILE}" \
  --parameters "file://${PARAMS_FILE}" \
  --capabilities CAPABILITY_NAMED_IAM \
  --region "$REGION"

echo "Waiting for stack update to complete..."
aws cloudformation wait stack-update-complete --stack-name "$STACK_NAME" --region "$REGION"
echo "Stack update complete."
