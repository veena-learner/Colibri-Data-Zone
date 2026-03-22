import { Router, Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import multer from 'multer';
import { QueryCommand } from '@aws-sdk/lib-dynamodb';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { parseDbtFiles, buildLineageFromDynamoDBItems, LINEAGE_DBT_PK, type DbtLineageData } from '../lib/dbtLineage';
import { docClient, TABLE_NAME } from '../config/database';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

router.use(authMiddleware);

let cachedLineage: DbtLineageData | null = null;

// Load from DynamoDB (used in ECS when lineage was uploaded via script). Use Query on PK for speed.
async function loadLineageFromDynamoDBIfNeeded(): Promise<DbtLineageData | null> {
  try {
    const items: Record<string, unknown>[] = [];
    let lastKey: Record<string, unknown> | undefined;
    do {
      const result = await docClient.send(
        new QueryCommand({
          TableName: TABLE_NAME,
          KeyConditionExpression: 'PK = :pk',
          ExpressionAttributeValues: { ':pk': LINEAGE_DBT_PK },
          ExclusiveStartKey: lastKey,
        })
      );
      if (result.Items?.length) items.push(...(result.Items as Record<string, unknown>[]));
      lastKey = result.LastEvaluatedKey;
    } while (lastKey);
    const lineage = items.length ? buildLineageFromDynamoDBItems(items) : null;
    if (lineage) {
      console.log('dbt lineage loaded from DynamoDB:', TABLE_NAME, 'nodes=', lineage.nodes.length, 'edges=', lineage.edges.length);
    } else if (items.length > 0) {
      console.log('dbt lineage: DynamoDB had', items.length, 'items but build returned null');
    }
    return lineage;
  } catch (err) {
    console.log('DynamoDB lineage load failed:', (err as Error).message);
    return null;
  }
}

// Load from local files on first request
function loadLocalDbtFiles(): DbtLineageData | null {
  const baseDir = process.env.HOME || '';
  const manifestPath = path.join(baseDir, 'Project-Dev', 'Colibri-Data-zone', 'manifest.json');
  const catalogPath = path.join(baseDir, 'Project-Dev', 'Colibri-Data-zone', 'catalog.json');

  try {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    let catalog = undefined;
    if (fs.existsSync(catalogPath)) {
      catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
    }
    return parseDbtFiles(manifest, catalog);
  } catch (err) {
    console.log('Local dbt files not found, lineage empty until uploaded.');
    return null;
  }
}

router.get('/lineage', async (req: AuthRequest, res: Response): Promise<void> => {
  let source: 'dynamodb' | 'local' | 'none' = 'none';
  try {
    if (!cachedLineage) {
      cachedLineage = await loadLineageFromDynamoDBIfNeeded();
      if (cachedLineage) source = 'dynamodb';
    }
    if (!cachedLineage) {
      cachedLineage = loadLocalDbtFiles();
      if (cachedLineage) source = 'local';
    }
    if (!cachedLineage) {
      res.setHeader('X-Lineage-Source', 'none');
      res.setHeader('X-Lineage-Nodes', '0');
      res.setHeader('X-Lineage-Edges', '0');
      res.json({ success: true, data: { nodes: [], edges: [], stats: { totalModels: 0, totalSources: 0, totalEdges: 0, totalSeeds: 0 } } });
      return;
    }

    const { search, nodeId, depth } = req.query;
    let result = cachedLineage;

    if (nodeId) {
      // Return subgraph around a specific node
      const maxDepth = parseInt(depth as string) || 2;
      const relevantIds = new Set<string>();
      const queue: { id: string; d: number }[] = [{ id: nodeId as string, d: 0 }];
      relevantIds.add(nodeId as string);

      while (queue.length > 0) {
        const { id, d } = queue.shift()!;
        if (d >= maxDepth) continue;

        for (const edge of cachedLineage.edges) {
          if (edge.source === id && !relevantIds.has(edge.target)) {
            relevantIds.add(edge.target);
            queue.push({ id: edge.target, d: d + 1 });
          }
          if (edge.target === id && !relevantIds.has(edge.source)) {
            relevantIds.add(edge.source);
            queue.push({ id: edge.source, d: d + 1 });
          }
        }
      }

      result = {
        nodes: cachedLineage.nodes.filter(n => relevantIds.has(n.id)),
        edges: cachedLineage.edges.filter(e => relevantIds.has(e.source) && relevantIds.has(e.target)),
        stats: cachedLineage.stats,
      };
    } else if (search) {
      const q = (search as string).toLowerCase();
      const matchedIds = new Set(
        cachedLineage.nodes
          .filter(n => n.name.toLowerCase().includes(q) || n.schema.toLowerCase().includes(q) || (n.source || '').toLowerCase().includes(q))
          .map(n => n.id)
      );

      // Include direct neighbors
      for (const edge of cachedLineage.edges) {
        if (matchedIds.has(edge.source)) matchedIds.add(edge.target);
        if (matchedIds.has(edge.target)) matchedIds.add(edge.source);
      }

      result = {
        nodes: cachedLineage.nodes.filter(n => matchedIds.has(n.id)),
        edges: cachedLineage.edges.filter(e => matchedIds.has(e.source) && matchedIds.has(e.target)),
        stats: cachedLineage.stats,
      };
    }

    res.setHeader('X-Lineage-Source', source);
    res.setHeader('X-Lineage-Nodes', String(result.nodes.length));
    res.setHeader('X-Lineage-Edges', String(result.edges.length));
    res.json({ success: true, data: result });
  } catch (error: any) {
    console.error('Lineage error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/lineage/nodes', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!cachedLineage) {
      cachedLineage = await loadLineageFromDynamoDBIfNeeded();
    }
    if (!cachedLineage) {
      cachedLineage = loadLocalDbtFiles();
    }
    const nodes = cachedLineage?.nodes || [];
    const { type, search, limit: lim } = req.query;
    let filtered = nodes;
    if (type) filtered = filtered.filter(n => n.resourceType === type);
    if (search) {
      const q = (search as string).toLowerCase();
      filtered = filtered.filter(n => n.name.toLowerCase().includes(q));
    }
    const limit = parseInt(lim as string) || 50;
    res.json({ success: true, data: filtered.slice(0, limit) });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Upload dbt JSON files
router.post(
  '/upload',
  upload.fields([
    { name: 'manifest', maxCount: 1 },
    { name: 'catalog', maxCount: 1 },
  ]),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };

      if (!files?.manifest?.[0]) {
        res.status(400).json({ success: false, error: 'manifest.json is required' });
        return;
      }

      const manifest = JSON.parse(files.manifest[0].buffer.toString('utf8'));
      let catalog = undefined;
      if (files?.catalog?.[0]) {
        catalog = JSON.parse(files.catalog[0].buffer.toString('utf8'));
      }

      cachedLineage = parseDbtFiles(manifest, catalog);

      res.json({
        success: true,
        data: {
          message: 'dbt files processed successfully',
          stats: cachedLineage.stats,
        },
      });
    } catch (error: any) {
      console.error('dbt upload error:', error);
      res.status(500).json({ success: false, error: 'Failed to parse dbt files: ' + error.message });
    }
  }
);

export default router;
