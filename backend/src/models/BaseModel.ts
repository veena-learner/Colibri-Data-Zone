import {
  PutCommand,
  GetCommand,
  QueryCommand,
  DeleteCommand,
  UpdateCommand,
  ScanCommand,
} from '@aws-sdk/lib-dynamodb';
import { docClient, TABLE_NAME } from '../config/database';
import { mockDb } from '../config/mockDatabase';

const USE_MOCK = process.env.USE_MOCK_DB === 'true';

export class BaseModel {
  protected tableName = TABLE_NAME;

  protected async put<T>(item: T): Promise<T> {
    if (USE_MOCK) {
      await mockDb.put(item as Record<string, unknown>);
      return item;
    }
    await docClient.send(
      new PutCommand({
        TableName: this.tableName,
        Item: item as Record<string, unknown>,
      })
    );
    return item;
  }

  protected async get<T>(pk: string, sk: string): Promise<T | null> {
    if (USE_MOCK) {
      return mockDb.get(pk, sk) as Promise<T | null>;
    }
    const result = await docClient.send(
      new GetCommand({
        TableName: this.tableName,
        Key: { PK: pk, SK: sk },
      })
    );
    return (result.Item as T) || null;
  }

  protected async query<T>(
    pkValue: string,
    skPrefix?: string,
    limit?: number,
    startKey?: Record<string, unknown>
  ): Promise<{ items: T[]; lastKey?: Record<string, unknown> }> {
    if (USE_MOCK) {
      const items = await mockDb.query(pkValue, skPrefix);
      return { items: items as T[] };
    }
    const params: Parameters<typeof QueryCommand>[0] = {
      TableName: this.tableName,
      KeyConditionExpression: skPrefix
        ? 'PK = :pk AND begins_with(SK, :sk)'
        : 'PK = :pk',
      ExpressionAttributeValues: {
        ':pk': pkValue,
        ...(skPrefix && { ':sk': skPrefix }),
      },
      Limit: limit,
      ExclusiveStartKey: startKey,
    };

    const result = await docClient.send(new QueryCommand(params));
    return {
      items: (result.Items as T[]) || [],
      lastKey: result.LastEvaluatedKey,
    };
  }

  protected async queryByIndex<T>(
    indexName: string,
    pkName: string,
    pkValue: string,
    limit?: number
  ): Promise<T[]> {
    if (USE_MOCK) {
      const items = await mockDb.scan((item) => item[pkName] === pkValue);
      return items as T[];
    }
    const result = await docClient.send(
      new QueryCommand({
        TableName: this.tableName,
        IndexName: indexName,
        KeyConditionExpression: `${pkName} = :pk`,
        ExpressionAttributeValues: { ':pk': pkValue },
        Limit: limit,
      })
    );
    return (result.Items as T[]) || [];
  }

  protected async scan<T>(
    filterExpression?: string,
    expressionValues?: Record<string, unknown>,
    limit?: number
  ): Promise<T[]> {
    if (USE_MOCK) {
      let items = await mockDb.scan();
      if (filterExpression && expressionValues) {
        const prefix = expressionValues[':prefix'] as string;
        if (prefix) {
          items = items.filter((item) => 
            item.PK?.startsWith(prefix) || item.SK?.startsWith(prefix)
          );
        }
      }
      return items as T[];
    }
    const result = await docClient.send(
      new ScanCommand({
        TableName: this.tableName,
        FilterExpression: filterExpression,
        ExpressionAttributeValues: expressionValues,
        Limit: limit,
      })
    );
    return (result.Items as T[]) || [];
  }

  protected async delete(pk: string, sk: string): Promise<void> {
    if (USE_MOCK) {
      await mockDb.delete(pk, sk);
      return;
    }
    await docClient.send(
      new DeleteCommand({
        TableName: this.tableName,
        Key: { PK: pk, SK: sk },
      })
    );
  }

  protected async update<T>(
    pk: string,
    sk: string,
    updates: Partial<T>
  ): Promise<T> {
    if (USE_MOCK) {
      return mockDb.update(pk, sk, updates as Record<string, unknown>) as Promise<T>;
    }
    const updateExpressions: string[] = [];
    const expressionAttributeNames: Record<string, string> = {};
    const expressionAttributeValues: Record<string, unknown> = {};

    Object.entries(updates).forEach(([key, value], index) => {
      if (key !== 'PK' && key !== 'SK') {
        const attrName = `#attr${index}`;
        const attrValue = `:val${index}`;
        updateExpressions.push(`${attrName} = ${attrValue}`);
        expressionAttributeNames[attrName] = key;
        expressionAttributeValues[attrValue] = value;
      }
    });

    const result = await docClient.send(
      new UpdateCommand({
        TableName: this.tableName,
        Key: { PK: pk, SK: sk },
        UpdateExpression: `SET ${updateExpressions.join(', ')}`,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues,
        ReturnValues: 'ALL_NEW',
      })
    );

    return result.Attributes as T;
  }
}
