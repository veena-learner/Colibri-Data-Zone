import { v4 as uuidv4 } from 'uuid';
import { BaseModel } from './BaseModel';
import { LineageEdge } from '../types';
import { ENTITY_TYPES } from '../config/constants';

export interface CreateLineageInput {
  sourceAssetId: string;
  targetAssetId: string;
  transformationType?: string;
  description?: string;
}

export class LineageModel extends BaseModel {
  private getKeys(sourceAssetId: string, targetAssetId: string) {
    return {
      PK: `${ENTITY_TYPES.ASSET}#${sourceAssetId}`,
      SK: `${ENTITY_TYPES.LINEAGE}#${targetAssetId}`,
    };
  }

  async create(input: CreateLineageInput): Promise<LineageEdge> {
    const id = uuidv4();
    const now = new Date().toISOString();
    const { PK, SK } = this.getKeys(input.sourceAssetId, input.targetAssetId);

    const lineageEdge: LineageEdge = {
      PK,
      SK,
      id,
      sourceAssetId: input.sourceAssetId,
      targetAssetId: input.targetAssetId,
      transformationType: input.transformationType,
      description: input.description,
      createdAt: now,
      updatedAt: now,
    };

    return this.put(lineageEdge);
  }

  async getEdge(sourceAssetId: string, targetAssetId: string): Promise<LineageEdge | null> {
    const { PK, SK } = this.getKeys(sourceAssetId, targetAssetId);
    return this.get<LineageEdge>(PK, SK);
  }

  async getDownstream(assetId: string): Promise<LineageEdge[]> {
    const { items } = await this.query<LineageEdge>(
      `${ENTITY_TYPES.ASSET}#${assetId}`,
      `${ENTITY_TYPES.LINEAGE}#`
    );
    return items;
  }

  async getUpstream(assetId: string): Promise<LineageEdge[]> {
    const allEdges = await this.scan<LineageEdge>(
      'begins_with(SK, :prefix) AND targetAssetId = :targetId',
      {
        ':prefix': `${ENTITY_TYPES.LINEAGE}#`,
        ':targetId': assetId,
      }
    );
    return allEdges;
  }

  async deleteEdge(sourceAssetId: string, targetAssetId: string): Promise<void> {
    const { PK, SK } = this.getKeys(sourceAssetId, targetAssetId);
    await this.delete(PK, SK);
  }

  async listAll(): Promise<LineageEdge[]> {
    return this.scan<LineageEdge>('begins_with(SK, :prefix)', {
      ':prefix': `${ENTITY_TYPES.LINEAGE}#`,
    });
  }

  async getLineageGraph(assetId: string, depth: number = 3): Promise<{
    nodes: string[];
    edges: LineageEdge[];
  }> {
    const nodes = new Set<string>([assetId]);
    const edges: LineageEdge[] = [];
    const visited = new Set<string>();

    const traverse = async (id: string, currentDepth: number, direction: 'up' | 'down') => {
      if (currentDepth <= 0 || visited.has(`${id}-${direction}`)) return;
      visited.add(`${id}-${direction}`);

      const relatedEdges =
        direction === 'down' ? await this.getDownstream(id) : await this.getUpstream(id);

      for (const edge of relatedEdges) {
        edges.push(edge);
        const nextId = direction === 'down' ? edge.targetAssetId : edge.sourceAssetId;
        nodes.add(nextId);
        await traverse(nextId, currentDepth - 1, direction);
      }
    };

    await Promise.all([
      traverse(assetId, depth, 'up'),
      traverse(assetId, depth, 'down'),
    ]);

    return { nodes: Array.from(nodes), edges };
  }
}

export const lineageModel = new LineageModel();
