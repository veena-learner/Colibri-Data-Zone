// In-memory mock database for development without Docker
// This allows testing the UI without DynamoDB Local

interface MockItem {
  [key: string]: any;
}

class MockDynamoDB {
  private store: Map<string, MockItem> = new Map();

  private getKey(pk: string, sk: string): string {
    return `${pk}#${sk}`;
  }

  async put(item: MockItem): Promise<void> {
    const key = this.getKey(item.PK, item.SK);
    this.store.set(key, { ...item });
  }

  async get(pk: string, sk: string): Promise<MockItem | null> {
    const key = this.getKey(pk, sk);
    return this.store.get(key) || null;
  }

  async delete(pk: string, sk: string): Promise<void> {
    const key = this.getKey(pk, sk);
    this.store.delete(key);
  }

  async query(pk: string, skPrefix?: string): Promise<MockItem[]> {
    const results: MockItem[] = [];
    for (const [key, item] of this.store.entries()) {
      if (item.PK === pk) {
        if (!skPrefix || item.SK.startsWith(skPrefix)) {
          results.push(item);
        }
      }
    }
    return results;
  }

  async scan(filterFn?: (item: MockItem) => boolean): Promise<MockItem[]> {
    const results: MockItem[] = [];
    for (const item of this.store.values()) {
      if (!filterFn || filterFn(item)) {
        results.push(item);
      }
    }
    return results;
  }

  async update(pk: string, sk: string, updates: Partial<MockItem>): Promise<MockItem> {
    const key = this.getKey(pk, sk);
    const existing = this.store.get(key);
    if (!existing) {
      throw new Error('Item not found');
    }
    const updated = { ...existing, ...updates };
    this.store.set(key, updated);
    return updated;
  }

  // Seed initial data
  seedData(): void {
    console.log('Seeding mock database with sample data...');
    
    // Admin user
    this.put({
      PK: 'USER#admin@colibri.io',
      SK: 'METADATA',
      id: 'user-admin',
      email: 'admin@colibri.io',
      name: 'Admin User',
      password: '$2a$10$3opR1HBo2fyQluy38NM1/ejOMSrf5Ru8VelBxomkJC2MQcjh9KP.C', // admin123
      role: 'Admin',
      domainIds: ['domain-1', 'domain-2'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Domain Owners (own the domains)
    this.put({
      PK: 'USER#finance.owner@colibri.io',
      SK: 'METADATA',
      id: 'user-finance-owner',
      email: 'finance.owner@colibri.io',
      name: 'Sarah Chen',
      password: '$2a$10$3opR1HBo2fyQluy38NM1/ejOMSrf5Ru8VelBxomkJC2MQcjh9KP.C', // admin123
      role: 'DataOwner',
      domainIds: ['domain-1'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    this.put({
      PK: 'USER#marketing.owner@colibri.io',
      SK: 'METADATA',
      id: 'user-marketing-owner',
      email: 'marketing.owner@colibri.io',
      name: 'Michael Rodriguez',
      password: '$2a$10$3opR1HBo2fyQluy38NM1/ejOMSrf5Ru8VelBxomkJC2MQcjh9KP.C', // admin123
      role: 'DataOwner',
      domainIds: ['domain-2'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Data Stewards (govern the data)
    this.put({
      PK: 'USER#steward1@colibri.io',
      SK: 'METADATA',
      id: 'user-steward-1',
      email: 'steward1@colibri.io',
      name: 'Emily Watson',
      password: '$2a$10$3opR1HBo2fyQluy38NM1/ejOMSrf5Ru8VelBxomkJC2MQcjh9KP.C', // admin123
      role: 'DataSteward',
      domainIds: ['domain-1', 'domain-2'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    this.put({
      PK: 'USER#steward2@colibri.io',
      SK: 'METADATA',
      id: 'user-steward-2',
      email: 'steward2@colibri.io',
      name: 'David Park',
      password: '$2a$10$3opR1HBo2fyQluy38NM1/ejOMSrf5Ru8VelBxomkJC2MQcjh9KP.C', // admin123
      role: 'DataSteward',
      domainIds: ['domain-1'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Data Owners (own specific data assets)
    this.put({
      PK: 'USER#dataowner1@colibri.io',
      SK: 'METADATA',
      id: 'user-dataowner-1',
      email: 'dataowner1@colibri.io',
      name: 'Alex Johnson',
      password: '$2a$10$3opR1HBo2fyQluy38NM1/ejOMSrf5Ru8VelBxomkJC2MQcjh9KP.C', // admin123
      role: 'DataOwner',
      domainIds: ['domain-1'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    this.put({
      PK: 'USER#dataowner2@colibri.io',
      SK: 'METADATA',
      id: 'user-dataowner-2',
      email: 'dataowner2@colibri.io',
      name: 'Jessica Lee',
      password: '$2a$10$3opR1HBo2fyQluy38NM1/ejOMSrf5Ru8VelBxomkJC2MQcjh9KP.C', // admin123
      role: 'DataOwner',
      domainIds: ['domain-2'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Analyst user
    this.put({
      PK: 'USER#analyst@colibri.io',
      SK: 'METADATA',
      id: 'user-analyst',
      email: 'analyst@colibri.io',
      name: 'Chris Taylor',
      password: '$2a$10$3opR1HBo2fyQluy38NM1/ejOMSrf5Ru8VelBxomkJC2MQcjh9KP.C', // admin123
      role: 'Analyst',
      domainIds: ['domain-1', 'domain-2'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Domains with Domain Owners
    this.put({
      PK: 'DOMAIN#domain-1',
      SK: 'METADATA',
      id: 'domain-1',
      name: 'Finance',
      description: 'Financial data and analytics',
      ownerId: 'user-finance-owner',
      tags: ['finance', 'accounting'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    this.put({
      PK: 'DOMAIN#domain-2',
      SK: 'METADATA',
      id: 'domain-2',
      name: 'Marketing',
      description: 'Marketing and customer data',
      ownerId: 'user-marketing-owner',
      tags: ['marketing', 'customers'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Assets with Data Owner and Data Steward
    this.put({
      PK: 'ASSET#asset-1',
      SK: 'METADATA',
      id: 'asset-1',
      name: 'Sales Transactions',
      description: 'Daily sales transaction data from all channels',
      type: 'S3',
      location: 's3://colibri-data/raw/sales/',
      format: 'Parquet',
      domainId: 'domain-1',
      dataOwnerId: 'user-dataowner-1',
      dataStewardId: 'user-steward-1',
      sensitivity: 'Confidential',
      tags: ['sales', 'transactions'],
      glossaryTermIds: ['glossary-1'],
      schema: [
        { name: 'transaction_id', type: 'STRING', nullable: false, isPrimaryKey: true },
        { name: 'amount', type: 'DECIMAL', nullable: false },
        { name: 'date', type: 'DATE', nullable: false },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    this.put({
      PK: 'ASSET#asset-2',
      SK: 'METADATA',
      id: 'asset-2',
      name: 'Customer Master',
      description: 'Master customer data with demographics',
      type: 'Redshift',
      location: 'redshift://dw/public.customers',
      domainId: 'domain-2',
      dataOwnerId: 'user-dataowner-2',
      dataStewardId: 'user-steward-1',
      sensitivity: 'Confidential',
      tags: ['customer', 'master'],
      glossaryTermIds: ['glossary-2'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    this.put({
      PK: 'ASSET#asset-3',
      SK: 'METADATA',
      id: 'asset-3',
      name: 'Revenue Dashboard',
      description: 'Aggregated revenue metrics',
      type: 'Redshift',
      location: 'redshift://dw/analytics.revenue',
      domainId: 'domain-1',
      dataOwnerId: 'user-dataowner-1',
      dataStewardId: 'user-steward-2',
      sensitivity: 'Internal',
      tags: ['revenue', 'analytics'],
      glossaryTermIds: ['glossary-1'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Lineage
    this.put({
      PK: 'ASSET#asset-1',
      SK: 'LINEAGE#asset-3',
      id: 'lineage-1',
      sourceAssetId: 'asset-1',
      targetAssetId: 'asset-3',
      transformationType: 'Aggregation',
      description: 'Daily aggregation job',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Glossary
    this.put({
      PK: 'GLOSSARY#glossary-1',
      SK: 'METADATA',
      id: 'glossary-1',
      term: 'Revenue',
      definition: 'Total income from sales of goods or services',
      synonyms: ['income', 'sales'],
      relatedTermIds: [],
      ownerId: 'user-admin',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    this.put({
      PK: 'GLOSSARY#glossary-2',
      SK: 'METADATA',
      id: 'glossary-2',
      term: 'Customer',
      definition: 'An individual or organization that purchases goods or services',
      synonyms: ['client', 'buyer'],
      relatedTermIds: [],
      ownerId: 'user-admin',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    console.log('Mock database seeded successfully!');
  }
}

export const mockDb = new MockDynamoDB();

// Auto-seed on import
mockDb.seedData();
