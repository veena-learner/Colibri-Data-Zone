import { v4 as uuidv4 } from 'uuid';
import { BaseModel } from './BaseModel';
import { OntologyColumn } from '../types';
import { ENTITY_TYPES } from '../config/constants';

export interface CreateOntologyInput {
  model: string;
  column: string;
  description: string;
  ontologyDefinition?: string;
}

export class OntologyModel extends BaseModel {
  private getKeys(id: string) {
    return {
      PK: `${ENTITY_TYPES.ONTOLOGY}#${id}`,
      SK: 'METADATA',
    };
  }

  async create(input: CreateOntologyInput): Promise<OntologyColumn> {
    const id = uuidv4();
    const now = new Date().toISOString();
    const { PK, SK } = this.getKeys(id);

    const item: OntologyColumn = {
      PK,
      SK,
      id,
      model: input.model.trim(),
      column: input.column.trim(),
      description: input.description?.trim() || '',
      ontologyDefinition: input.ontologyDefinition?.trim(),
      createdAt: now,
      updatedAt: now,
    };

    return this.put(item);
  }

  async getById(id: string): Promise<OntologyColumn | null> {
    const { PK, SK } = this.getKeys(id);
    return this.get<OntologyColumn>(PK, SK);
  }

  async update(id: string, updates: Partial<CreateOntologyInput>): Promise<OntologyColumn> {
    const { PK, SK } = this.getKeys(id);
    return this.update<OntologyColumn>(PK, SK, {
      ...updates,
      updatedAt: new Date().toISOString(),
    } as Partial<OntologyColumn>);
  }

  async deleteById(id: string): Promise<void> {
    const { PK, SK } = this.getKeys(id);
    await this.delete(PK, SK);
  }

  async listAll(limit?: number): Promise<OntologyColumn[]> {
    const results = await this.scan<OntologyColumn>(
      'begins_with(PK, :prefix)',
      { ':prefix': `${ENTITY_TYPES.ONTOLOGY}#` },
      limit
    );
    return results.filter((item) => item.SK === 'METADATA');
  }

  async listByModel(model: string): Promise<OntologyColumn[]> {
    const all = await this.listAll();
    return all.filter((o) => o.model === model);
  }

  async search(query: string): Promise<OntologyColumn[]> {
    const all = await this.listAll();
    const q = query.toLowerCase();
    return all.filter(
      (o) =>
        o.model.toLowerCase().includes(q) ||
        o.column.toLowerCase().includes(q) ||
        (o.description && o.description.toLowerCase().includes(q)) ||
        (o.ontologyDefinition && o.ontologyDefinition.toLowerCase().includes(q))
    );
  }

  async findByModelAndColumn(model: string, column: string): Promise<OntologyColumn | null> {
    const all = await this.listAll();
    return all.find((o) => o.model === model && o.column === column) || null;
  }

  async createOrUpdate(input: CreateOntologyInput): Promise<OntologyColumn> {
    const existing = await this.findByModelAndColumn(input.model.trim(), input.column.trim());
    if (existing) {
      return this.update(existing.id, {
        description: input.description?.trim() ?? existing.description,
        ontologyDefinition: input.ontologyDefinition?.trim() ?? existing.ontologyDefinition,
      });
    }
    return this.create(input);
  }
}

export const ontologyModel = new OntologyModel();
