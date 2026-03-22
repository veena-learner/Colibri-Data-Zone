import { v4 as uuidv4 } from 'uuid';
import { BaseModel } from './BaseModel';
import { DataAsset, TargetTableMapping } from '../types';
import { ENTITY_TYPES, SENSITIVITY_LEVELS, SensitivityLevel, AssetType, IngestionStatus } from '../config/constants';

export interface CreateAssetInput {
  name: string;
  description: string;
  type: AssetType;
  location: string;
  source?: string;
  format?: string;
  schema?: DataAsset['schema'];
  domainId: string;
  dataOwnerId: string;
  dataStewardId?: string;
  sensitivity?: SensitivityLevel;
  tags?: string[];
  glossaryTermIds?: string[];
  metadata?: Record<string, string>;
  sourceSystem?: string;
  sourceTableName?: string;
  ingestionStatus?: IngestionStatus;
  targetRedshiftTables?: TargetTableMapping[];
}

export class AssetModel extends BaseModel {
  private getKeys(id: string) {
    return {
      PK: `${ENTITY_TYPES.ASSET}#${id}`,
      SK: 'METADATA',
    };
  }

  async create(input: CreateAssetInput): Promise<DataAsset> {
    const id = uuidv4();
    const now = new Date().toISOString();
    const { PK, SK } = this.getKeys(id);

    const asset: DataAsset = {
      PK,
      SK,
      id,
      name: input.name,
      description: input.description,
      type: input.type,
      location: input.location,
      source: input.source,
      format: input.format,
      schema: input.schema,
      domainId: input.domainId,
      dataOwnerId: input.dataOwnerId,
      dataStewardId: input.dataStewardId,
      sensitivity: input.sensitivity || SENSITIVITY_LEVELS.INTERNAL,
      tags: input.tags || [],
      glossaryTermIds: input.glossaryTermIds || [],
      metadata: input.metadata,
      sourceSystem: input.sourceSystem,
      sourceTableName: input.sourceTableName,
      ingestionStatus: input.ingestionStatus,
      targetRedshiftTables: input.targetRedshiftTables,
      createdAt: now,
      updatedAt: now,
    };

    return this.put(asset);
  }

  async getById(id: string): Promise<DataAsset | null> {
    const { PK, SK } = this.getKeys(id);
    return this.get<DataAsset>(PK, SK);
  }

  async update(id: string, updates: Partial<CreateAssetInput>): Promise<DataAsset> {
    const { PK, SK } = this.getKeys(id);
    return super.updateByKey<DataAsset>(PK, SK, {
      ...updates,
      updatedAt: new Date().toISOString(),
    } as Partial<DataAsset>);
  }

  async deleteById(id: string): Promise<void> {
    const { PK, SK } = this.getKeys(id);
    await this.delete(PK, SK);
  }

  async listAll(limit?: number): Promise<DataAsset[]> {
    const results = await this.scan<DataAsset>(
      'begins_with(PK, :prefix)',
      { ':prefix': `${ENTITY_TYPES.ASSET}#` },
      limit
    );
    // Filter to only include asset metadata records (not lineage edges)
    return results.filter(item => item.SK === 'METADATA');
  }

  async listByDomain(domainId: string): Promise<DataAsset[]> {
    const assets = await this.listAll();
    return assets.filter((a) => a.domainId === domainId);
  }

  async search(query: string): Promise<DataAsset[]> {
    const assets = await this.listAll();
    const lowerQuery = query.toLowerCase();
    return assets.filter(
      (a) =>
        a.name.toLowerCase().includes(lowerQuery) ||
        a.description.toLowerCase().includes(lowerQuery) ||
        a.tags.some((t) => t.toLowerCase().includes(lowerQuery))
    );
  }

  async listSourceTables(): Promise<DataAsset[]> {
    const assets = await this.listAll();
    return assets.filter((a) => a.type === 'OLTP');
  }

  async listBySourceSystem(sourceSystem: string): Promise<DataAsset[]> {
    const assets = await this.listSourceTables();
    return assets.filter((a) => a.sourceSystem === sourceSystem);
  }
}

export const assetModel = new AssetModel();
