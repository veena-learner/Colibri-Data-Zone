import { v4 as uuidv4 } from 'uuid';
import { BaseModel } from './BaseModel';
import { Domain } from '../types';
import { ENTITY_TYPES } from '../config/constants';

export interface CreateDomainInput {
  name: string;
  description: string;
  ownerId: string;
  parentDomainId?: string;
  tags?: string[];
}

export class DomainModel extends BaseModel {
  private getKeys(id: string) {
    return {
      PK: `${ENTITY_TYPES.DOMAIN}#${id}`,
      SK: 'METADATA',
    };
  }

  async create(input: CreateDomainInput): Promise<Domain> {
    const id = uuidv4();
    const now = new Date().toISOString();
    const { PK, SK } = this.getKeys(id);

    const domain: Domain = {
      PK,
      SK,
      id,
      name: input.name,
      description: input.description,
      ownerId: input.ownerId,
      parentDomainId: input.parentDomainId,
      tags: input.tags || [],
      createdAt: now,
      updatedAt: now,
    };

    return this.put(domain);
  }

  async getById(id: string): Promise<Domain | null> {
    const { PK, SK } = this.getKeys(id);
    return this.get<Domain>(PK, SK);
  }

  async update(id: string, updates: Partial<CreateDomainInput>): Promise<Domain> {
    const { PK, SK } = this.getKeys(id);
    return this.update<Domain>(PK, SK, {
      ...updates,
      updatedAt: new Date().toISOString(),
    } as Partial<Domain>);
  }

  async deleteById(id: string): Promise<void> {
    const { PK, SK } = this.getKeys(id);
    await this.delete(PK, SK);
  }

  async listAll(limit?: number): Promise<Domain[]> {
    return this.scan<Domain>(
      'begins_with(PK, :prefix)',
      { ':prefix': `${ENTITY_TYPES.DOMAIN}#` },
      limit
    );
  }
}

export const domainModel = new DomainModel();
