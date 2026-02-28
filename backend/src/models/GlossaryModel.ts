import { v4 as uuidv4 } from 'uuid';
import { BaseModel } from './BaseModel';
import { GlossaryTerm } from '../types';
import { ENTITY_TYPES } from '../config/constants';

export interface CreateGlossaryInput {
  term: string;
  definition: string;
  domainId?: string;
  synonyms?: string[];
  relatedTermIds?: string[];
  ownerId: string;
}

export class GlossaryModel extends BaseModel {
  private getKeys(id: string) {
    return {
      PK: `${ENTITY_TYPES.GLOSSARY}#${id}`,
      SK: 'METADATA',
    };
  }

  async create(input: CreateGlossaryInput): Promise<GlossaryTerm> {
    const id = uuidv4();
    const now = new Date().toISOString();
    const { PK, SK } = this.getKeys(id);

    const glossaryTerm: GlossaryTerm = {
      PK,
      SK,
      id,
      term: input.term,
      definition: input.definition,
      domainId: input.domainId,
      synonyms: input.synonyms || [],
      relatedTermIds: input.relatedTermIds || [],
      ownerId: input.ownerId,
      createdAt: now,
      updatedAt: now,
    };

    return this.put(glossaryTerm);
  }

  async getById(id: string): Promise<GlossaryTerm | null> {
    const { PK, SK } = this.getKeys(id);
    return this.get<GlossaryTerm>(PK, SK);
  }

  async update(id: string, updates: Partial<CreateGlossaryInput>): Promise<GlossaryTerm> {
    const { PK, SK } = this.getKeys(id);
    return this.update<GlossaryTerm>(PK, SK, {
      ...updates,
      updatedAt: new Date().toISOString(),
    } as Partial<GlossaryTerm>);
  }

  async deleteById(id: string): Promise<void> {
    const { PK, SK } = this.getKeys(id);
    await this.delete(PK, SK);
  }

  async listAll(limit?: number): Promise<GlossaryTerm[]> {
    return this.scan<GlossaryTerm>(
      'begins_with(PK, :prefix)',
      { ':prefix': `${ENTITY_TYPES.GLOSSARY}#` },
      limit
    );
  }

  async search(query: string): Promise<GlossaryTerm[]> {
    const terms = await this.listAll();
    const lowerQuery = query.toLowerCase();
    return terms.filter(
      (t) =>
        t.term.toLowerCase().includes(lowerQuery) ||
        t.definition.toLowerCase().includes(lowerQuery) ||
        t.synonyms.some((s) => s.toLowerCase().includes(lowerQuery))
    );
  }
}

export const glossaryModel = new GlossaryModel();
