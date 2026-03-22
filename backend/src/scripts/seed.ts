import dotenv from 'dotenv';
dotenv.config({ path: '../../.env' });

import { userModel } from '../models/UserModel';
import { domainModel } from '../models/DomainModel';
import { assetModel } from '../models/AssetModel';
import { glossaryModel } from '../models/GlossaryModel';
import { lineageModel } from '../models/LineageModel';
import { USER_ROLES, ASSET_TYPES, SENSITIVITY_LEVELS } from '../config/constants';

async function seed() {
  console.log('Seeding database...');

  try {
    // Create admin user
    const admin = await userModel.create({
      email: 'admin@colibri.io',
      name: 'Admin User',
      password: 'admin123',
      role: USER_ROLES.ADMIN,
    });
    console.log('Created admin user:', admin.email);

    // Create data steward
    const steward = await userModel.create({
      email: 'steward@colibri.io',
      name: 'Data Steward',
      password: 'steward123',
      role: USER_ROLES.DATA_STEWARD,
    });
    console.log('Created steward user:', steward.email);

    // Create analyst
    const analyst = await userModel.create({
      email: 'analyst@colibri.io',
      name: 'Data Analyst',
      password: 'analyst123',
      role: USER_ROLES.ANALYST,
    });
    console.log('Created analyst user:', analyst.email);

    // Create domains
    const financeDomain = await domainModel.create({
      name: 'Finance',
      description: 'Financial data and analytics',
      ownerId: admin.id,
      tags: ['finance', 'accounting', 'revenue'],
    });
    console.log('Created domain:', financeDomain.name);

    const marketingDomain = await domainModel.create({
      name: 'Marketing',
      description: 'Marketing and customer data',
      ownerId: steward.id,
      tags: ['marketing', 'campaigns', 'customers'],
    });
    console.log('Created domain:', marketingDomain.name);

    const engineeringDomain = await domainModel.create({
      name: 'Engineering',
      description: 'Engineering and product data',
      ownerId: admin.id,
      tags: ['engineering', 'product', 'metrics'],
    });
    console.log('Created domain:', engineeringDomain.name);

    // Create glossary terms
    const revenueTerm = await glossaryModel.create({
      term: 'Revenue',
      definition: 'The total income generated from the sale of goods or services related to the company\'s primary operations.',
      domainId: financeDomain.id,
      synonyms: ['income', 'sales', 'earnings'],
      ownerId: admin.id,
    });
    console.log('Created glossary term:', revenueTerm.term);

    const customerTerm = await glossaryModel.create({
      term: 'Customer',
      definition: 'An individual or organization that purchases goods or services from the company.',
      domainId: marketingDomain.id,
      synonyms: ['client', 'buyer', 'consumer'],
      ownerId: steward.id,
    });
    console.log('Created glossary term:', customerTerm.term);

    const churnTerm = await glossaryModel.create({
      term: 'Churn Rate',
      definition: 'The percentage of customers who stop using a product or service during a given time period.',
      domainId: marketingDomain.id,
      synonyms: ['attrition rate', 'customer turnover'],
      relatedTermIds: [customerTerm.id],
      ownerId: steward.id,
    });
    console.log('Created glossary term:', churnTerm.term);

    // Create assets
    const rawSalesData = await assetModel.create({
      name: 'Raw Sales Transactions',
      description: 'Daily sales transaction data from all channels',
      type: ASSET_TYPES.S3,
      location: 's3://colibri-data/raw/sales/transactions/',
      format: 'Parquet',
      domainId: financeDomain.id,
      dataOwnerId: admin.id,
      dataStewardId: steward.id,
      sensitivity: SENSITIVITY_LEVELS.CONFIDENTIAL,
      tags: ['sales', 'transactions', 'raw'],
      glossaryTermIds: [revenueTerm.id],
      schema: [
        { name: 'transaction_id', type: 'STRING', nullable: false, isPrimaryKey: true },
        { name: 'customer_id', type: 'STRING', nullable: false },
        { name: 'product_id', type: 'STRING', nullable: false },
        { name: 'amount', type: 'DECIMAL', nullable: false },
        { name: 'transaction_date', type: 'TIMESTAMP', nullable: false },
      ],
    });
    console.log('Created asset:', rawSalesData.name);

    const customerTable = await assetModel.create({
      name: 'Customer Master',
      description: 'Master customer data with demographics and preferences',
      type: ASSET_TYPES.REDSHIFT,
      location: 'redshift://colibri-dw/public.customers',
      domainId: marketingDomain.id,
      dataOwnerId: steward.id,
      sensitivity: SENSITIVITY_LEVELS.CONFIDENTIAL,
      tags: ['customer', 'master', 'pii'],
      glossaryTermIds: [customerTerm.id],
      schema: [
        { name: 'customer_id', type: 'VARCHAR(50)', nullable: false, isPrimaryKey: true },
        { name: 'email', type: 'VARCHAR(255)', nullable: false },
        { name: 'name', type: 'VARCHAR(100)', nullable: true },
        { name: 'signup_date', type: 'DATE', nullable: false },
        { name: 'segment', type: 'VARCHAR(50)', nullable: true },
      ],
    });
    console.log('Created asset:', customerTable.name);

    const salesAggregates = await assetModel.create({
      name: 'Daily Sales Aggregates',
      description: 'Aggregated daily sales metrics by product and region',
      type: ASSET_TYPES.REDSHIFT,
      location: 'redshift://colibri-dw/analytics.daily_sales',
      domainId: financeDomain.id,
      dataOwnerId: admin.id,
      dataStewardId: steward.id,
      sensitivity: SENSITIVITY_LEVELS.INTERNAL,
      tags: ['sales', 'aggregated', 'analytics'],
      glossaryTermIds: [revenueTerm.id],
      schema: [
        { name: 'date', type: 'DATE', nullable: false, isPrimaryKey: true },
        { name: 'product_id', type: 'VARCHAR(50)', nullable: false, isPrimaryKey: true },
        { name: 'region', type: 'VARCHAR(50)', nullable: false },
        { name: 'total_revenue', type: 'DECIMAL', nullable: false },
        { name: 'transaction_count', type: 'INTEGER', nullable: false },
      ],
    });
    console.log('Created asset:', salesAggregates.name);

    const churnPredictions = await assetModel.create({
      name: 'Customer Churn Predictions',
      description: 'ML model predictions for customer churn probability',
      type: ASSET_TYPES.S3,
      location: 's3://colibri-data/ml/churn_predictions/',
      format: 'CSV',
      domainId: marketingDomain.id,
      dataOwnerId: steward.id,
      sensitivity: SENSITIVITY_LEVELS.INTERNAL,
      tags: ['ml', 'churn', 'predictions'],
      glossaryTermIds: [churnTerm.id, customerTerm.id],
    });
    console.log('Created asset:', churnPredictions.name);

    const productCatalog = await assetModel.create({
      name: 'Product Catalog',
      description: 'Complete product catalog with pricing and attributes',
      type: ASSET_TYPES.RDS,
      location: 'rds://colibri-prod/products.catalog',
      domainId: engineeringDomain.id,
      dataOwnerId: admin.id,
      sensitivity: SENSITIVITY_LEVELS.PUBLIC,
      tags: ['product', 'catalog', 'pricing'],
    });
    console.log('Created asset:', productCatalog.name);

    // Create lineage
    await lineageModel.create({
      sourceAssetId: rawSalesData.id,
      targetAssetId: salesAggregates.id,
      transformationType: 'Aggregation',
      description: 'Daily aggregation job via Spark',
    });
    console.log('Created lineage: Raw Sales -> Sales Aggregates');

    await lineageModel.create({
      sourceAssetId: customerTable.id,
      targetAssetId: churnPredictions.id,
      transformationType: 'ML Pipeline',
      description: 'Churn prediction model training pipeline',
    });
    console.log('Created lineage: Customer Master -> Churn Predictions');

    await lineageModel.create({
      sourceAssetId: rawSalesData.id,
      targetAssetId: churnPredictions.id,
      transformationType: 'Feature Engineering',
      description: 'Transaction features for churn model',
    });
    console.log('Created lineage: Raw Sales -> Churn Predictions');

    console.log('\nSeeding completed successfully!');
    console.log('\nTest credentials:');
    console.log('  Admin: admin@colibri.io / admin123');
    console.log('  Steward: steward@colibri.io / steward123');
    console.log('  Analyst: analyst@colibri.io / analyst123');
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
}

seed();
