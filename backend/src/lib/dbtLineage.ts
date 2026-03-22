/**
 * Parse dbt manifest.json and optional catalog.json into lineage nodes and edges.
 * Used by dbt routes and by the script that loads lineage into DynamoDB.
 */

/** DynamoDB PK for the dbt lineage graph (all items: META, NODE#id, EDGE#id). */
export const LINEAGE_DBT_PK = 'LINEAGE#DBT';

export interface DbtNode {
  unique_id: string;
  name: string;
  resource_type: string;
  schema: string;
  database: string;
  description?: string;
  columns?: Record<string, { name: string; description?: string; type?: string }>;
  tags?: string[];
  source_name?: string;
  depends_on?: { nodes: string[] };
}

export interface LineageNode {
  id: string;
  name: string;
  resourceType: string;
  schema: string;
  database: string;
  description: string;
  source?: string;
  tags: string[];
  columnCount: number;
}

export interface LineageEdge {
  id: string;
  source: string;
  target: string;
}

export interface DbtLineageData {
  nodes: LineageNode[];
  edges: LineageEdge[];
  stats: {
    totalModels: number;
    totalSources: number;
    totalEdges: number;
    totalSeeds: number;
  };
}

export function parseDbtFiles(manifestData: any, catalogData?: any): DbtLineageData {
  const nodes: LineageNode[] = [];
  const edges: LineageEdge[] = [];
  const nodeMap = new Map<string, boolean>();

  const catalogColumns: Record<string, number> = {};
  if (catalogData?.nodes) {
    for (const [id, node] of Object.entries(catalogData.nodes) as [string, any][]) {
      catalogColumns[id] = Object.keys((node as any).columns || {}).length;
    }
  }

  for (const [id, node] of Object.entries(manifestData.nodes || {}) as [string, DbtNode][]) {
    if (node.resource_type === 'test' || node.resource_type === 'operation') continue;
    nodes.push({
      id: node.unique_id,
      name: node.name,
      resourceType: node.resource_type,
      schema: node.schema,
      database: node.database,
      description: node.description || '',
      tags: node.tags || [],
      columnCount: catalogColumns[node.unique_id] ?? Object.keys(node.columns || {}).length,
    });
    nodeMap.set(node.unique_id, true);
  }

  for (const [id, src] of Object.entries(manifestData.sources || {}) as [string, DbtNode][]) {
    nodes.push({
      id: src.unique_id,
      name: src.name,
      resourceType: 'source',
      schema: src.schema,
      database: src.database,
      description: src.description || '',
      source: src.source_name,
      tags: src.tags || [],
      columnCount: Object.keys(src.columns || {}).length,
    });
    nodeMap.set(src.unique_id, true);
  }

  let edgeId = 0;
  for (const [childId, parents] of Object.entries(manifestData.parent_map || {}) as [string, string[]][]) {
    if (!nodeMap.has(childId)) continue;
    for (const parentId of parents) {
      if (!nodeMap.has(parentId)) continue;
      edges.push({ id: `edge-${edgeId++}`, source: parentId, target: childId });
    }
  }

  const stats = {
    totalModels: nodes.filter((n) => n.resourceType === 'model').length,
    totalSources: nodes.filter((n) => n.resourceType === 'source').length,
    totalEdges: edges.length,
    totalSeeds: nodes.filter((n) => n.resourceType === 'seed').length,
  };

  return { nodes, edges, stats };
}

/** Rebuild DbtLineageData from items stored in DynamoDB (PK = LINEAGE_DBT_PK). */
export function buildLineageFromDynamoDBItems(items: Record<string, unknown>[]): DbtLineageData | null {
  const nodeItems = items.filter((i) => String(i.SK || '').startsWith('NODE#'));
  const edgeItems = items.filter((i) => String(i.SK || '').startsWith('EDGE#'));
  if (nodeItems.length === 0 && edgeItems.length === 0) return null;

  const meta = items.find((i) => i.SK === 'META');
  const statsFromMeta = meta?.stats as DbtLineageData['stats'] | undefined;
  const stats: DbtLineageData['stats'] = statsFromMeta && typeof statsFromMeta.totalModels === 'number'
    ? statsFromMeta
    : {
        totalModels: nodeItems.filter((i) => i.resourceType === 'model').length,
        totalSources: nodeItems.filter((i) => i.resourceType === 'source').length,
        totalEdges: edgeItems.length,
        totalSeeds: nodeItems.filter((i) => i.resourceType === 'seed').length,
      };

  const nodes = nodeItems.map((i) => ({
    id: i.id as string,
    name: i.name as string,
    resourceType: i.resourceType as string,
    schema: i.schema as string,
    database: i.database as string,
    description: (i.description as string) || '',
    source: i.source as string | undefined,
    tags: (i.tags as string[]) || [],
    columnCount: (i.columnCount as number) ?? 0,
  }));

  const edges = edgeItems.map((i) => ({
    id: i.id as string,
    source: i.source as string,
    target: i.target as string,
  }));

  return { nodes, edges, stats };
}
