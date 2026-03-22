/**
 * Bulk load assets from an Excel file (.xls or .xlsx) into DynamoDB.
 * Creates any domains that do not exist (by domain name in the file).
 * Uses BatchWriteItem (25 items per request) so ~3k assets complete in minutes.
 *
 * Usage (target AWS DynamoDB):
 *   AWS_REGION=us-east-1 DYNAMODB_TABLE=ColibriDataZone-production npm run bulk-load-assets -- backend/data/assets_from_redshift.xls
 *
 * Optional: DEFAULT_OWNER_ID=user-veena (owner for new domains)
 * Optional: DEFAULT_DOMAIN_NAME=Uncategorized (domain used when row has no domain)
 */

import * as fs from 'fs';
import * as path from 'path';
import * as XLSX from 'xlsx';
import { v4 as uuidv4 } from 'uuid';
import { BatchWriteCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, TABLE_NAME } from '../config/database';
import { assetModel } from '../models/AssetModel';
import { domainModel } from '../models/DomainModel';
import { userModel } from '../models/UserModel';
import { ASSET_TYPES, SENSITIVITY_LEVELS, ENTITY_TYPES } from '../config/constants';
import type { AssetType, SensitivityLevel } from '../config/constants';
import type { DataAsset } from '../types';

const DEFAULT_OWNER_ID = process.env.DEFAULT_OWNER_ID || 'user-veena';
const DEFAULT_DOMAIN_NAME = process.env.DEFAULT_DOMAIN_NAME || 'Uncategorized';
const BATCH_SIZE = 25;

type Row = Record<string, unknown>;

function str(row: Row, ...keys: string[]): string {
  for (const k of keys) {
    const v = row[k];
    if (v != null && String(v).trim()) return String(v).trim();
  }
  return '';
}

function normalizeHeader(s: string): string {
  const lower = s.trim().toLowerCase();
  if (lower === 'name' || lower === 'asset name' || lower === 'asset_name') return 'name';
  if (lower === 'description' || lower === 'desc') return 'description';
  if (lower === 'type' || lower === 'asset type') return 'type';
  if (lower === 'location' || lower === 'path') return 'location';
  if (lower === 'domain' || lower === 'domain name' || lower === 'domain_name') return 'domain';
  if (lower === 'sensitivity') return 'sensitivity';
  if (lower === 'data owner' || lower === 'dataowner' || lower === 'data_owner' || lower === 'owner') return 'dataOwner';
  if (lower === 'data steward' || lower === 'datasteward' || lower === 'data_steward' || lower === 'steward') return 'dataSteward';
  if (lower === 'tags') return 'tags';
  if (lower === 'source') return 'source';
  if (lower === 'format') return 'format';
  return s.trim();
}

function normalizeRow(raw: Record<string, unknown>): Row {
  const out: Row = {};
  for (const [k, v] of Object.entries(raw)) {
    const key = normalizeHeader(k);
    if (key && v != null) out[key] = v;
  }
  return out;
}

async function batchWriteItems(items: Record<string, unknown>[]): Promise<void> {
  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const chunk = items.slice(i, i + BATCH_SIZE);
    let request: Record<string, { PutRequest: { Item: Record<string, unknown> } }[]> = {
      [TABLE_NAME]: chunk.map((Item) => ({ PutRequest: { Item } })),
    };
    let retries = 3;
    while (Object.keys(request[TABLE_NAME] || {}).length > 0 && retries > 0) {
      const result = await docClient.send(
        new BatchWriteCommand({ RequestItems: request })
      );
      const unprocessed = result.UnprocessedItems?.[TABLE_NAME];
      if (!unprocessed?.length) break;
      request = {
        [TABLE_NAME]: unprocessed as { PutRequest: { Item: Record<string, unknown> } }[],
      };
      retries--;
      await new Promise((r) => setTimeout(r, 500));
    }
    const written = Math.min(i + chunk.length, items.length);
    if (written <= BATCH_SIZE || written % 250 === 0 || written >= items.length) {
      console.log('Wrote', written, '/', items.length, 'assets');
    }
  }
}

async function main(): Promise<void> {
  const filePath = process.argv[2] || process.env.ASSETS_FILE;
  if (!filePath) {
    console.error('Usage: npx tsx src/scripts/bulkLoadAssetsFromExcel.ts <path-to-assets.xls|xlsx>');
    process.exit(1);
  }
  let resolved = path.resolve(process.cwd(), filePath);
  if (!fs.existsSync(resolved)) {
    const backendRoot = path.resolve(__dirname, '../..');
    const withoutBackendPrefix = filePath.replace(/^backend[/\\]/, '');
    const fromBackendRoot = path.resolve(backendRoot, withoutBackendPrefix);
    if (fs.existsSync(fromBackendRoot)) resolved = fromBackendRoot;
  }
  console.log('Table:', TABLE_NAME);
  console.log('File:', resolved);

  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.readFile(resolved);
  } catch (e) {
    console.error('Failed to read file:', e);
    process.exit(1);
  }

  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rawRows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet);
  const rows = rawRows.map(normalizeRow).filter((r) => str(r, 'name'));

  if (rows.length === 0) {
    console.error('No rows with a name column found.');
    process.exit(1);
  }

  console.log('Loading users for owner/steward resolution...');
  const users = await userModel.listAll();
  const emailToUserId: Record<string, string> = {};
  for (const u of users) {
    if (u.email) emailToUserId[u.email.toLowerCase().trim()] = u.id;
  }
  function resolveUserId(value: string): string {
    if (!value) return DEFAULT_OWNER_ID;
    if (value.includes('@')) {
      return emailToUserId[value.trim().toLowerCase()] ?? DEFAULT_OWNER_ID;
    }
    return value.trim();
  }

  const domainNameToId: Record<string, string> = {};
  const existingDomains = await domainModel.listAll();
  for (const d of existingDomains) {
    domainNameToId[d.name.toLowerCase().trim()] = d.id;
  }

  const uniqueDomainNames = new Set<string>();
  uniqueDomainNames.add(DEFAULT_DOMAIN_NAME);
  for (const row of rows) {
    const domainName = str(row, 'domain');
    if (domainName) uniqueDomainNames.add(domainName);
  }

  console.log('Creating missing domains...');
  for (const domainName of uniqueDomainNames) {
    const key = domainName.toLowerCase().trim();
    if (domainNameToId[key]) continue;
    const created = await domainModel.create({
      name: domainName.trim(),
      description: `Domain: ${domainName}`,
      ownerId: DEFAULT_OWNER_ID,
      tags: [domainName.replace(/\s+/g, '-').toLowerCase()],
    });
    domainNameToId[key] = created.id;
    console.log('Created domain:', created.name, '->', created.id);
  }

  const validTypes = new Set<string>(Object.values(ASSET_TYPES));
  const validSensitivity = new Set<string>(Object.values(SENSITIVITY_LEVELS));

  console.log('Building asset items...');
  const items: Record<string, unknown>[] = [];
  const errors: { row: number; name: string; error: string }[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2;
    const name = str(row, 'name');
    const domainName = str(row, 'domain') || DEFAULT_DOMAIN_NAME;
    const domainId = domainNameToId[domainName.toLowerCase().trim()];

    if (!domainId) {
      errors.push({ row: rowNum, name, error: 'Domain not found' });
      continue;
    }

    const typeRaw = str(row, 'type') || 'Redshift';
    const assetType = (validTypes.has(typeRaw) ? typeRaw : 'Redshift') as AssetType;
    const sensRaw = str(row, 'sensitivity') || 'Internal';
    const sensitivity = (validSensitivity.has(sensRaw) ? sensRaw : 'Internal') as SensitivityLevel;
    const dataOwnerId = resolveUserId(str(row, 'dataOwner'));
    const dataStewardRaw = str(row, 'dataSteward');
    const dataStewardId = dataStewardRaw ? resolveUserId(dataStewardRaw) : undefined;
    const tags = str(row, 'tags') ? str(row, 'tags').split(',').map((t) => t.trim()).filter(Boolean) : [];

    const id = uuidv4();
    const now = new Date().toISOString();
    const asset: DataAsset = {
      PK: `${ENTITY_TYPES.ASSET}#${id}`,
      SK: 'METADATA',
      id,
      name,
      description: str(row, 'description') || name,
      type: assetType,
      location: str(row, 'location') || '',
      source: str(row, 'source') || undefined,
      format: str(row, 'format') || undefined,
      domainId,
      dataOwnerId,
      dataStewardId,
      sensitivity,
      tags,
      glossaryTermIds: [],
      createdAt: now,
      updatedAt: now,
    };
    items.push(asset as unknown as Record<string, unknown>);
  }

  if (items.length === 0) {
    console.log('No valid assets to write.');
    if (errors.length) {
      console.log('Errors:', errors.length);
      errors.slice(0, 20).forEach((e) => console.log('  Row', e.row, e.name, ':', e.error));
    }
    return;
  }

  console.log('Writing', items.length, 'assets in batches of', BATCH_SIZE, '...');
  await batchWriteItems(items);

  console.log('Done. Created', items.length, 'assets.');
  if (errors.length > 0) {
    console.log('Skipped/errors:', errors.length);
    errors.slice(0, 20).forEach((e) => console.log('  Row', e.row, e.name, ':', e.error));
    if (errors.length > 20) console.log('  ... and', errors.length - 20, 'more');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
