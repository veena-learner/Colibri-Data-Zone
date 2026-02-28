import { CreateTableCommand, DynamoDBClient } from '@aws-sdk/client-dynamodb';
import dotenv from 'dotenv';

dotenv.config({ path: '../../.env' });

const client = new DynamoDBClient({
  region: process.env.AWS_REGION || 'us-east-1',
  endpoint: process.env.DYNAMODB_ENDPOINT || 'http://localhost:8000',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'local',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'local',
  },
});

const TABLE_NAME = process.env.DYNAMODB_TABLE || 'ColibriDataZone';

async function createTable() {
  try {
    const command = new CreateTableCommand({
      TableName: TABLE_NAME,
      KeySchema: [
        { AttributeName: 'PK', KeyType: 'HASH' },
        { AttributeName: 'SK', KeyType: 'RANGE' },
      ],
      AttributeDefinitions: [
        { AttributeName: 'PK', AttributeType: 'S' },
        { AttributeName: 'SK', AttributeType: 'S' },
      ],
      BillingMode: 'PAY_PER_REQUEST',
    });

    await client.send(command);
    console.log(`Table '${TABLE_NAME}' created successfully!`);
  } catch (error: any) {
    if (error.name === 'ResourceInUseException') {
      console.log(`Table '${TABLE_NAME}' already exists.`);
    } else {
      console.error('Error creating table:', error);
      process.exit(1);
    }
  }
}

createTable();
