import { SensitivityLevel, AssetType, UserRole, IngestionStatus } from '../config/constants';

export interface BaseEntity {
  PK: string;
  SK: string;
  createdAt: string;
  updatedAt: string;
}

export interface TargetTableMapping {
  targetTableName: string;
  targetSchema: string;
  dbtModelName?: string;
  transformationNotes?: string;
}

export interface DataAsset extends BaseEntity {
  id: string;
  name: string;
  description: string;
  type: AssetType;
  location: string;
  source?: string;
  format?: string;
  schema?: SchemaField[];
  domainId: string;
  dataOwnerId: string;
  dataStewardId?: string;
  sensitivity: SensitivityLevel;
  tags: string[];
  glossaryTermIds: string[];
  metadata?: Record<string, string>;
  sourceSystem?: string;
  sourceTableName?: string;
  ingestionStatus?: IngestionStatus;
  targetRedshiftTables?: TargetTableMapping[];
}

export interface SchemaField {
  name: string;
  type: string;
  description?: string;
  nullable: boolean;
  isPrimaryKey?: boolean;
}

export interface Domain extends BaseEntity {
  id: string;
  name: string;
  description: string;
  ownerId: string;
  parentDomainId?: string;
  tags: string[];
}

export interface GlossaryTerm extends BaseEntity {
  id: string;
  term: string;
  definition: string;
  domainId?: string;
  synonyms: string[];
  relatedTermIds: string[];
  ownerId: string;
}

export interface OntologyColumn extends BaseEntity {
  id: string;
  model: string;
  column: string;
  description: string;
  ontologyDefinition?: string;
}

export interface User extends BaseEntity {
  id: string;
  email: string;
  name: string;
  password: string;
  role: UserRole;
  domainIds: string[];
}

export interface LineageEdge extends BaseEntity {
  id: string;
  sourceAssetId: string;
  targetAssetId: string;
  transformationType?: string;
  description?: string;
}

export interface AccessPolicy extends BaseEntity {
  id: string;
  name: string;
  description: string;
  assetId?: string;
  domainId?: string;
  allowedUserIds: string[];
  allowedRoles: UserRole[];
}

export interface AuditLog extends BaseEntity {
  id: string;
  entityType: string;
  entityId: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'ACCESS';
  userId: string;
  timestamp: string;
  changes?: Record<string, { old: unknown; new: unknown }>;
}

export interface AuthPayload {
  userId: string;
  email: string;
  role: UserRole;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  nextToken?: string;
  total?: number;
}
