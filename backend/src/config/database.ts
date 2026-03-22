import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import dotenv from 'dotenv';

dotenv.config({ path: '../.env' });

// Use local DynamoDB only when DYNAMODB_ENDPOINT is set and we're not targeting the production table.
// This lets bulk-load scripts target AWS by setting DYNAMODB_TABLE=ColibriDataZone-production.
const useLocalDynamo =
  Boolean(process.env.DYNAMODB_ENDPOINT) &&
  !process.env.DYNAMODB_TABLE?.includes('production');

const client = new DynamoDBClient({
  region: process.env.AWS_REGION || 'us-east-1',
  ...(useLocalDynamo && {
    endpoint: process.env.DYNAMODB_ENDPOINT,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'local',
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'local',
    },
  }),
});

export const docClient = DynamoDBDocumentClient.from(client, {
  marshallOptions: {
    removeUndefinedValues: true,
  },
});

// Use DYNAMODB_TABLE from env (in ECS, set by task definition from CloudFormation param). Default for local dev.
function getTableName(): string {
  return process.env.DYNAMODB_TABLE || 'ColibriDataZone';
}
export const TABLE_NAME = getTableName();
