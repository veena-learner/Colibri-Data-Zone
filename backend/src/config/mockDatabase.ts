import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

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

  seedData(): void {
    console.log('Seeding mock database with sample data...');
    const now = new Date().toISOString();

    // --- Users ---
    this.put({
      PK: 'USER#admin@colibri.io', SK: 'METADATA',
      id: 'user-admin', email: 'admin@colibri.io', name: 'Admin User',
      password: '$2a$10$3opR1HBo2fyQluy38NM1/ejOMSrf5Ru8VelBxomkJC2MQcjh9KP.C',
      role: 'Admin', domainIds: [], createdAt: now, updatedAt: now,
    });

    this.put({
      PK: 'USER#veena.anantharam@colibrigroup.com', SK: 'METADATA',
      id: 'user-veena', email: 'veena.anantharam@colibrigroup.com', name: 'Veena Anantharam',
      password: '$2a$10$3opR1HBo2fyQluy38NM1/ejOMSrf5Ru8VelBxomkJC2MQcjh9KP.C',
      role: 'DataOwner', domainIds: [], createdAt: now, updatedAt: now,
    });

    this.put({
      PK: 'USER#pamela.betz@colibrigroup.com', SK: 'METADATA',
      id: 'user-pamela', email: 'pamela.betz@colibrigroup.com', name: 'Pamela Betz',
      password: '$2a$10$3opR1HBo2fyQluy38NM1/ejOMSrf5Ru8VelBxomkJC2MQcjh9KP.C',
      role: 'DataSteward', domainIds: [], createdAt: now, updatedAt: now,
    });

    this.put({
      PK: 'USER#sarah.chen@colibrigroup.com', SK: 'METADATA',
      id: 'user-sarah', email: 'sarah.chen@colibrigroup.com', name: 'Sarah Chen',
      password: '$2a$10$3opR1HBo2fyQluy38NM1/ejOMSrf5Ru8VelBxomkJC2MQcjh9KP.C',
      role: 'ProductManager', domainIds: [], createdAt: now, updatedAt: now,
    });

    // --- Domains ---
    const domains = [
      { id: 'domain-learner', name: 'Learner', description: 'Learner data and analytics' },
      { id: 'domain-marketing', name: 'Marketing', description: 'Marketing and customer engagement data' },
      { id: 'domain-finance', name: 'Finance', description: 'Financial data and reporting' },
      { id: 'domain-sales', name: 'Sales', description: 'Sales pipeline and revenue data' },
      { id: 'domain-customer-service', name: 'Customer Service', description: 'Customer support and service data' },
      { id: 'domain-lms', name: 'LMS', description: 'Learning Management System data' },
      { id: 'domain-financial', name: 'Financial', description: 'Financial systems and accounting data' },
      { id: 'domain-platform', name: 'Platform', description: 'Platform infrastructure and operations data' },
      { id: 'domain-b2b', name: 'B2B', description: 'Business-to-business partnership data' },
    ];

    for (const d of domains) {
      this.put({
        PK: `DOMAIN#${d.id}`, SK: 'METADATA',
        id: d.id, name: d.name, description: d.description,
        ownerId: 'user-veena', tags: [d.name.toLowerCase()],
        createdAt: now, updatedAt: now,
      });
    }

    // --- Glossary ---
    this.put({
      PK: 'GLOSSARY#glossary-1', SK: 'METADATA',
      id: 'glossary-1', term: 'Revenue',
      definition: 'Total income from sales of goods or services',
      synonyms: ['income', 'sales'], relatedTermIds: [],
      ownerId: 'user-admin', createdAt: now, updatedAt: now,
    });

    this.put({
      PK: 'GLOSSARY#glossary-2', SK: 'METADATA',
      id: 'glossary-2', term: 'Customer',
      definition: 'An individual or organization that purchases goods or services',
      synonyms: ['client', 'buyer'], relatedTermIds: [],
      ownerId: 'user-admin', createdAt: now, updatedAt: now,
    });

    // --- OLTP Source Tables (Persona 1: Product Manager ingestion catalog) ---
    this.seedOltpSourceTables();

    // --- Load CSV assets ---
    this.loadCsvAssets();

    console.log('Mock database seeded successfully!');
  }

  private seedOltpSourceTables(): void {
    const now = new Date().toISOString();

    const sourceTables = [
      // Learner domain
      { id: 'oltp-1', name: 'learner_profiles', sourceTable: 'oltp_lms.learner_profiles', desc: 'Core learner profile data including demographics and preferences', domain: 'domain-learner', owner: 'user-veena', steward: 'user-pamela', source: 'ColibriLMS', sensitivity: 'Confidential', ingestion: 'Completed', targets: [{ targetTableName: 'dim_learners', targetSchema: 'analytics', dbtModelName: 'stg_learner_profiles' }] },
      { id: 'oltp-2', name: 'enrollment_records', sourceTable: 'oltp_lms.enrollment_records', desc: 'Student enrollment and registration data', domain: 'domain-learner', owner: 'user-veena', steward: 'user-pamela', source: 'ColibriLMS', sensitivity: 'Confidential', ingestion: 'Completed', targets: [{ targetTableName: 'fact_enrollments', targetSchema: 'analytics', dbtModelName: 'stg_enrollments' }] },
      { id: 'oltp-3', name: 'course_completions', sourceTable: 'oltp_lms.course_completions', desc: 'Tracks learner course completion milestones and certificates', domain: 'domain-learner', owner: 'user-veena', steward: 'user-pamela', source: 'ColibriLMS', sensitivity: 'Internal', ingestion: 'Completed', targets: [{ targetTableName: 'fact_completions', targetSchema: 'analytics', dbtModelName: 'stg_course_completions' }] },
      { id: 'oltp-4', name: 'assessment_results', sourceTable: 'oltp_lms.assessment_results', desc: 'Exam and quiz results for all learners', domain: 'domain-learner', owner: 'user-veena', steward: 'user-pamela', source: 'ColibriLMS', sensitivity: 'Confidential', ingestion: 'InProgress', targets: [{ targetTableName: 'fact_assessments', targetSchema: 'analytics', dbtModelName: 'stg_assessment_results' }] },
      { id: 'oltp-5', name: 'learner_activity_log', sourceTable: 'oltp_lms.learner_activity_log', desc: 'Clickstream and activity tracking for learner engagement', domain: 'domain-learner', owner: 'user-veena', steward: 'user-pamela', source: 'ColibriLMS', sensitivity: 'Internal', ingestion: 'Pending', targets: [{ targetTableName: 'fact_learner_activity', targetSchema: 'analytics', dbtModelName: 'stg_learner_activity' }] },

      // LMS domain
      { id: 'oltp-6', name: 'courses', sourceTable: 'oltp_lms.courses', desc: 'Course catalog with metadata, prerequisites, and pricing', domain: 'domain-lms', owner: 'user-veena', steward: 'user-pamela', source: 'ColibriLMS', sensitivity: 'Public', ingestion: 'Completed', targets: [{ targetTableName: 'dim_courses', targetSchema: 'analytics', dbtModelName: 'stg_courses' }] },
      { id: 'oltp-7', name: 'course_modules', sourceTable: 'oltp_lms.course_modules', desc: 'Individual modules and lessons within courses', domain: 'domain-lms', owner: 'user-veena', steward: 'user-pamela', source: 'ColibriLMS', sensitivity: 'Public', ingestion: 'Completed', targets: [{ targetTableName: 'dim_course_modules', targetSchema: 'analytics', dbtModelName: 'stg_course_modules' }] },
      { id: 'oltp-8', name: 'instructors', sourceTable: 'oltp_lms.instructors', desc: 'Instructor profiles, certifications, and teaching assignments', domain: 'domain-lms', owner: 'user-veena', steward: 'user-pamela', source: 'ColibriLMS', sensitivity: 'Internal', ingestion: 'Completed', targets: [{ targetTableName: 'dim_instructors', targetSchema: 'analytics', dbtModelName: 'stg_instructors' }] },
      { id: 'oltp-9', name: 'learning_paths', sourceTable: 'oltp_lms.learning_paths', desc: 'Curated sequences of courses forming a learning path', domain: 'domain-lms', owner: 'user-veena', steward: 'user-pamela', source: 'ColibriLMS', sensitivity: 'Public', ingestion: 'DBTReady', targets: [{ targetTableName: 'dim_learning_paths', targetSchema: 'analytics', dbtModelName: 'stg_learning_paths' }] },

      // Sales domain
      { id: 'oltp-10', name: 'opportunities', sourceTable: 'oltp_crm.opportunities', desc: 'Sales pipeline opportunities with stage, amount, and probability', domain: 'domain-sales', owner: 'user-veena', steward: 'user-pamela', source: 'Salesforce', sensitivity: 'Confidential', ingestion: 'Completed', targets: [{ targetTableName: 'fact_opportunities', targetSchema: 'sales_analytics', dbtModelName: 'stg_sf_opportunities' }] },
      { id: 'oltp-11', name: 'accounts', sourceTable: 'oltp_crm.accounts', desc: 'Corporate and individual customer accounts', domain: 'domain-sales', owner: 'user-veena', steward: 'user-pamela', source: 'Salesforce', sensitivity: 'Confidential', ingestion: 'Completed', targets: [{ targetTableName: 'dim_accounts', targetSchema: 'sales_analytics', dbtModelName: 'stg_sf_accounts' }] },
      { id: 'oltp-12', name: 'contacts', sourceTable: 'oltp_crm.contacts', desc: 'Contact information for leads and customers', domain: 'domain-sales', owner: 'user-veena', steward: 'user-pamela', source: 'Salesforce', sensitivity: 'Restricted', ingestion: 'Completed', targets: [{ targetTableName: 'dim_contacts', targetSchema: 'sales_analytics', dbtModelName: 'stg_sf_contacts' }] },
      { id: 'oltp-13', name: 'quotes', sourceTable: 'oltp_crm.quotes', desc: 'Price quotes and proposals sent to prospects', domain: 'domain-sales', owner: 'user-veena', steward: 'user-pamela', source: 'Salesforce', sensitivity: 'Confidential', ingestion: 'InProgress', targets: [{ targetTableName: 'fact_quotes', targetSchema: 'sales_analytics', dbtModelName: 'stg_sf_quotes' }] },
      { id: 'oltp-14', name: 'sales_orders', sourceTable: 'oltp_crm.sales_orders', desc: 'Closed-won sales orders and contract details', domain: 'domain-sales', owner: 'user-veena', steward: 'user-pamela', source: 'Salesforce', sensitivity: 'Confidential', ingestion: 'Pending', targets: [{ targetTableName: 'fact_sales_orders', targetSchema: 'sales_analytics', dbtModelName: 'stg_sf_sales_orders' }] },

      // Finance domain
      { id: 'oltp-15', name: 'general_ledger', sourceTable: 'oltp_erp.general_ledger', desc: 'General ledger journal entries and postings', domain: 'domain-finance', owner: 'user-veena', steward: 'user-pamela', source: 'NetSuite', sensitivity: 'Restricted', ingestion: 'Completed', targets: [{ targetTableName: 'fact_gl_entries', targetSchema: 'finance_analytics', dbtModelName: 'stg_ns_general_ledger' }] },
      { id: 'oltp-16', name: 'accounts_receivable', sourceTable: 'oltp_erp.accounts_receivable', desc: 'Outstanding customer invoices and payment tracking', domain: 'domain-finance', owner: 'user-veena', steward: 'user-pamela', source: 'NetSuite', sensitivity: 'Restricted', ingestion: 'Completed', targets: [{ targetTableName: 'fact_ar', targetSchema: 'finance_analytics', dbtModelName: 'stg_ns_accounts_receivable' }] },
      { id: 'oltp-17', name: 'accounts_payable', sourceTable: 'oltp_erp.accounts_payable', desc: 'Vendor invoices and payment obligations', domain: 'domain-finance', owner: 'user-veena', steward: 'user-pamela', source: 'NetSuite', sensitivity: 'Restricted', ingestion: 'InProgress', targets: [{ targetTableName: 'fact_ap', targetSchema: 'finance_analytics', dbtModelName: 'stg_ns_accounts_payable' }] },
      { id: 'oltp-18', name: 'revenue_recognition', sourceTable: 'oltp_erp.revenue_recognition', desc: 'Revenue recognition schedules and deferred revenue', domain: 'domain-finance', owner: 'user-veena', steward: 'user-pamela', source: 'NetSuite', sensitivity: 'Restricted', ingestion: 'Pending', targets: [{ targetTableName: 'fact_revenue', targetSchema: 'finance_analytics', dbtModelName: 'stg_ns_revenue_recognition' }] },

      // Marketing domain
      { id: 'oltp-19', name: 'campaigns', sourceTable: 'oltp_marketing.campaigns', desc: 'Marketing campaign definitions, budgets, and schedules', domain: 'domain-marketing', owner: 'user-veena', steward: 'user-pamela', source: 'HubSpot', sensitivity: 'Internal', ingestion: 'Completed', targets: [{ targetTableName: 'dim_campaigns', targetSchema: 'marketing_analytics', dbtModelName: 'stg_hs_campaigns' }] },
      { id: 'oltp-20', name: 'email_events', sourceTable: 'oltp_marketing.email_events', desc: 'Email open, click, bounce, and unsubscribe events', domain: 'domain-marketing', owner: 'user-veena', steward: 'user-pamela', source: 'HubSpot', sensitivity: 'Internal', ingestion: 'Completed', targets: [{ targetTableName: 'fact_email_events', targetSchema: 'marketing_analytics', dbtModelName: 'stg_hs_email_events' }] },
      { id: 'oltp-21', name: 'leads', sourceTable: 'oltp_marketing.leads', desc: 'Inbound and outbound lead records with scoring', domain: 'domain-marketing', owner: 'user-veena', steward: 'user-pamela', source: 'HubSpot', sensitivity: 'Confidential', ingestion: 'InProgress', targets: [{ targetTableName: 'dim_leads', targetSchema: 'marketing_analytics', dbtModelName: 'stg_hs_leads' }] },
      { id: 'oltp-22', name: 'web_analytics', sourceTable: 'oltp_marketing.web_analytics', desc: 'Website visitor sessions, page views, and conversion tracking', domain: 'domain-marketing', owner: 'user-veena', steward: 'user-pamela', source: 'HubSpot', sensitivity: 'Internal', ingestion: 'Pending', targets: [{ targetTableName: 'fact_web_sessions', targetSchema: 'marketing_analytics', dbtModelName: 'stg_hs_web_analytics' }] },

      // Customer Service domain
      { id: 'oltp-23', name: 'support_tickets', sourceTable: 'oltp_support.support_tickets', desc: 'Customer support ticket records with SLA tracking', domain: 'domain-customer-service', owner: 'user-veena', steward: 'user-pamela', source: 'Zendesk', sensitivity: 'Confidential', ingestion: 'Completed', targets: [{ targetTableName: 'fact_support_tickets', targetSchema: 'cs_analytics', dbtModelName: 'stg_zd_tickets' }] },
      { id: 'oltp-24', name: 'customer_satisfaction', sourceTable: 'oltp_support.customer_satisfaction', desc: 'CSAT and NPS survey responses', domain: 'domain-customer-service', owner: 'user-veena', steward: 'user-pamela', source: 'Zendesk', sensitivity: 'Internal', ingestion: 'DBTReady', targets: [{ targetTableName: 'fact_csat_scores', targetSchema: 'cs_analytics', dbtModelName: 'stg_zd_csat' }] },
      { id: 'oltp-25', name: 'chat_transcripts', sourceTable: 'oltp_support.chat_transcripts', desc: 'Live chat and chatbot conversation logs', domain: 'domain-customer-service', owner: 'user-veena', steward: 'user-pamela', source: 'Zendesk', sensitivity: 'Confidential', ingestion: 'Pending', targets: [{ targetTableName: 'fact_chat_interactions', targetSchema: 'cs_analytics', dbtModelName: 'stg_zd_chats' }] },

      // Platform domain
      { id: 'oltp-26', name: 'user_sessions', sourceTable: 'oltp_platform.user_sessions', desc: 'Platform login sessions and authentication events', domain: 'domain-platform', owner: 'user-veena', steward: 'user-pamela', source: 'ColibriPlatform', sensitivity: 'Internal', ingestion: 'Completed', targets: [{ targetTableName: 'fact_user_sessions', targetSchema: 'platform_analytics', dbtModelName: 'stg_platform_sessions' }] },
      { id: 'oltp-27', name: 'api_usage_logs', sourceTable: 'oltp_platform.api_usage_logs', desc: 'API call logs with latency, status codes, and endpoints', domain: 'domain-platform', owner: 'user-veena', steward: 'user-pamela', source: 'ColibriPlatform', sensitivity: 'Internal', ingestion: 'InProgress', targets: [{ targetTableName: 'fact_api_usage', targetSchema: 'platform_analytics', dbtModelName: 'stg_platform_api_logs' }] },
      { id: 'oltp-28', name: 'feature_flags', sourceTable: 'oltp_platform.feature_flags', desc: 'Feature flag configurations and rollout percentages', domain: 'domain-platform', owner: 'user-veena', steward: 'user-pamela', source: 'ColibriPlatform', sensitivity: 'Internal', ingestion: 'Pending', targets: [{ targetTableName: 'dim_feature_flags', targetSchema: 'platform_analytics', dbtModelName: 'stg_platform_feature_flags' }] },

      // B2B domain
      { id: 'oltp-29', name: 'partner_organizations', sourceTable: 'oltp_b2b.partner_organizations', desc: 'B2B partner company profiles and tier classifications', domain: 'domain-b2b', owner: 'user-veena', steward: 'user-pamela', source: 'Salesforce', sensitivity: 'Confidential', ingestion: 'Completed', targets: [{ targetTableName: 'dim_partners', targetSchema: 'b2b_analytics', dbtModelName: 'stg_sf_partners' }] },
      { id: 'oltp-30', name: 'partner_contracts', sourceTable: 'oltp_b2b.partner_contracts', desc: 'Partnership agreements, terms, and renewal schedules', domain: 'domain-b2b', owner: 'user-veena', steward: 'user-pamela', source: 'Salesforce', sensitivity: 'Restricted', ingestion: 'DBTReady', targets: [{ targetTableName: 'fact_partner_contracts', targetSchema: 'b2b_analytics', dbtModelName: 'stg_sf_partner_contracts' }] },

      // Financial domain
      { id: 'oltp-31', name: 'budget_allocations', sourceTable: 'oltp_erp.budget_allocations', desc: 'Departmental budget allocations and spending limits', domain: 'domain-financial', owner: 'user-veena', steward: 'user-pamela', source: 'NetSuite', sensitivity: 'Restricted', ingestion: 'Completed', targets: [{ targetTableName: 'fact_budgets', targetSchema: 'finance_analytics', dbtModelName: 'stg_ns_budgets' }] },
      { id: 'oltp-32', name: 'expense_reports', sourceTable: 'oltp_erp.expense_reports', desc: 'Employee expense submissions and reimbursements', domain: 'domain-financial', owner: 'user-veena', steward: 'user-pamela', source: 'NetSuite', sensitivity: 'Confidential', ingestion: 'Failed', targets: [{ targetTableName: 'fact_expenses', targetSchema: 'finance_analytics', dbtModelName: 'stg_ns_expenses' }] },
    ];

    for (const t of sourceTables) {
      this.put({
        PK: `ASSET#${t.id}`, SK: 'METADATA',
        id: t.id,
        name: t.name,
        description: t.desc,
        type: 'OLTP',
        location: t.sourceTable,
        source: t.source,
        domainId: t.domain,
        dataOwnerId: t.owner,
        dataStewardId: t.steward,
        sensitivity: t.sensitivity,
        tags: ['oltp', 'source-table', t.source.toLowerCase()],
        glossaryTermIds: [],
        sourceSystem: t.source,
        sourceTableName: t.sourceTable,
        ingestionStatus: t.ingestion,
        targetRedshiftTables: t.targets,
        createdAt: now,
        updatedAt: now,
      });
    }
    console.log(`Seeded ${sourceTables.length} OLTP source tables.`);
  }

  private domainNameToId: Record<string, string> = {
    'customer service': 'domain-customer-service',
    'sales': 'domain-sales',
    'lms': 'domain-lms',
    'marketing': 'domain-marketing',
    'financial': 'domain-financial',
    'finance': 'domain-finance',
    'platform': 'domain-platform',
    'b2b': 'domain-b2b',
    'learner': 'domain-learner',
  };

  private ownerEmailToId: Record<string, string> = {
    'veena.anantharam@colibrigroup.com': 'user-veena',
    'pamela.betz@colibrigroup.com': 'user-pamela',
  };

  private parseCsvLine(line: string): string[] {
    const parts: string[] = [];
    let current = '';
    let inQuotes = false;
    for (const ch of line) {
      if (ch === '"') { inQuotes = !inQuotes; }
      else if (ch === ',' && !inQuotes) { parts.push(current.trim()); current = ''; }
      else { current += ch; }
    }
    parts.push(current.trim());
    return parts;
  }

  private loadCsvAssets(): void {
    const csvPath = path.resolve(__dirname, '../../../../Downloads/assets_from_redshift(Sheet1).csv');
    
    if (!fs.existsSync(csvPath)) {
      const altPath = path.join(process.env.HOME || '', 'Downloads', 'assets_from_redshift(Sheet1).csv');
      if (!fs.existsSync(altPath)) {
        console.log('CSV file not found, skipping bulk load.');
        return;
      }
      return this.loadCsvFromPath(altPath);
    }
    this.loadCsvFromPath(csvPath);
  }

  private loadCsvFromPath(csvPath: string): void {
    const data = fs.readFileSync(csvPath, 'utf8');
    const lines = data.split('\n').filter(l => l.trim());
    const now = new Date().toISOString();
    let loaded = 0;

    for (let i = 1; i < lines.length; i++) {
      const parts = this.parseCsvLine(lines[i]);
      if (parts.length < 5) continue;

      const [assetName, type, description, location, domain, sensitivity, dataOwner, dataSteward, tags] = parts;

      const domainId = this.domainNameToId[domain?.toLowerCase()] || 'domain-learner';
      const ownerId = this.ownerEmailToId[dataOwner?.toLowerCase()] || 'user-veena';
      const stewardId = this.ownerEmailToId[dataSteward?.toLowerCase()] || 'user-pamela';

      const validSensitivities = ['Public', 'Internal', 'Confidential', 'Restricted'];
      const sens = validSensitivities.includes(sensitivity) ? sensitivity : 'Internal';

      // Extract source from description (format: "Source: xyz / detail")
      let assetSource = '';
      if (description && description.toLowerCase().startsWith('source:')) {
        assetSource = description.replace(/^source:\s*/i, '').trim();
      }

      const assetTags = tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : [];
      const id = `asset-csv-${i}`;

      this.put({
        PK: `ASSET#${id}`, SK: 'METADATA',
        id, name: assetName, description: description || `${assetName} data asset`,
        type: type || 'Redshift', source: assetSource, location: location || '',
        domainId, dataOwnerId: ownerId, dataStewardId: stewardId,
        sensitivity: sens, tags: assetTags, glossaryTermIds: [],
        createdAt: now, updatedAt: now,
      });
      loaded++;
    }
    console.log(`Loaded ${loaded} assets from CSV.`);
  }
}

export const mockDb = new MockDynamoDB();
mockDb.seedData();
