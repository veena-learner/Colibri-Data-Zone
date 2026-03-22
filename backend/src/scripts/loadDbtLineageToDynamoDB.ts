/**
 * Load dbt lineage from manifest.json and catalog.json into DynamoDB (AWS or local).
 * The backend will serve this lineage from DynamoDB when the cache is empty (e.g. in ECS).
 *
 * Usage (AWS):
 *   AWS_REGION=us-east-1 DYNAMODB_TABLE=ColibriDataZone-production npx tsx src/scripts/loadDbtLineageToDynamoDB.ts /path/to/manifest.json /path/to/catalog.json
 *
 * Catalog is optional; omit or pass "-" to skip:
 *   npx tsx src/scripts/loadDbtLineageToDynamoDB.ts /path/to/manifest.json
 */

import * as fs from 'fs';
import * as path from 'path';
import { ScanCommand, BatchWriteCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, TABLE_NAME } from '../config/database';
import { parseDbtFiles, LINEAGE_DBT_PK } from '../lib/dbtLineage';

const BATCH_SIZE = 25;

async function main(): Promise<void> {
  const manifestPath = process.argv[2];
  const catalogPath = process.argv[3];

  if (!manifestPath) {
    console.error('Usage: npx tsx src/scripts/loadDbtLineageToDynamoDB.ts <manifest.json> [catalog.json]');
    process.exit(1);
  }

  const resolvedManifest = path.resolve(process.cwd(), manifestPath);
  if (!fs.existsSync(resolvedManifest)) {
    console.error('Manifest file not found:', resolvedManifest);
    process.exit(1);
  }

  let catalog: any;
  if (catalogPath && catalogPath !== '-') {
    const resolvedCatalog = path.resolve(process.cwd(), catalogPath);
    if (!fs.existsSync(resolvedCatalog)) {
      console.error('Catalog file not found:', resolvedCatalog);
      process.exit(1);
    }
    catalog = JSON.parse(fs.readFileSync(resolvedCatalog, 'utf8'));
  }

  console.log('Table:', TABLE_NAME);
  console.log('Manifest:', resolvedManifest);
  if (catalog) console.log('Catalog:', path.resolve(process.cwd(), catalogPath!));

  const manifest = JSON.parse(fs.readFileSync(resolvedManifest, 'utf8'));
  const lineage = parseDbtFiles(manifest, catalog);

  console.log('Parsed:', lineage.stats.totalModels, 'models,', lineage.stats.totalSources, 'sources,', lineage.stats.totalEdges, 'edges,', lineage.stats.totalSeeds, 'seeds');

  // 1) Delete existing LINEAGE#DBT items
  const keysToDelete: { PK: string; SK: string }[] = [];
  let lastKey: Record<string, unknown> | undefined;
  do {
    const result = await docClient.send(
      new ScanCommand({
        TableName: TABLE_NAME,
        ProjectionExpression: 'PK, SK',
        FilterExpression: 'PK = :pk',
        ExpressionAttributeValues: { ':pk': LINEAGE_DBT_PK },
        ExclusiveStartKey: lastKey,
      })
    );
    for (const item of result.Items || []) {
      keysToDelete.push({ PK: item.PK as string, SK: item.SK as string });
    }
    lastKey = result.LastEvaluatedKey;
  } while (lastKey);

  if (keysToDelete.length > 0) {
    console.log('Deleting', keysToDelete.length, 'existing lineage items...');
    for (let i = 0; i < keysToDelete.length; i += BATCH_SIZE) {
      const chunk = keysToDelete.slice(i, i + BATCH_SIZE);
      await docClient.send(
        new BatchWriteCommand({
          RequestItems: {
            [TABLE_NAME]: chunk.map((k) => ({ DeleteRequest: { Key: k } })),
          },
        })
      );
    }
  }

  // 2) Build put items: META, NODE#id, EDGE#id
  const now = new Date().toISOString();
  const putItems: Record<string, unknown>[] = [];

  putItems.push({
    PK: LINEAGE_DBT_PK,
    SK: 'META',
    stats: lineage.stats,
    updatedAt: now,
  });

  for (const n of lineage.nodes) {
    putItems.push({
      PK: LINEAGE_DBT_PK,
      SK: `NODE#${n.id}`,
      id: n.id,
      name: n.name,
      resourceType: n.resourceType,
      schema: n.schema,
      database: n.database,
      description: n.description ?? '',
      ...(n.source != null && { source: n.source }),
      tags: n.tags ?? [],
      columnCount: n.columnCount ?? 0,
    });
  }

  for (const e of lineage.edges) {
    putItems.push({
      PK: LINEAGE_DBT_PK,
      SK: `EDGE#${e.id}`,
      id: e.id,
      source: e.source,
      target: e.target,
    });
  }

  console.log('Writing', putItems.length, 'items...');
  for (let i = 0; i < putItems.length; i += BATCH_SIZE) {
    const chunk = putItems.slice(i, i + BATCH_SIZE);
    await docClient.send(
      new BatchWriteCommand({
        RequestItems: {
          [TABLE_NAME]: chunk.map((Item) => ({ PutRequest: { Item } })),
        },
      })
    );
    if ((i + BATCH_SIZE) % 250 === 0 || i + chunk.length >= putItems.length) {
      console.log('Wrote', Math.min(i + BATCH_SIZE, putItems.length), '/', putItems.length);
    }
  }

  console.log('Done. dbt lineage loaded into DynamoDB.');
  console.log('If using ECS: redeploy the backend so it serves lineage from DynamoDB (see deploy/FIX-32-ASSETS.md for update-service command).');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
