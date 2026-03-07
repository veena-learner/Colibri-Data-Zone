export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

export type UserRole = 'Admin' | 'ProductManager' | 'DataOwner' | 'DataSteward' | 'Analyst' | 'Viewer';

export type SensitivityLevel = 'Public' | 'Internal' | 'Confidential' | 'Restricted';

export type AssetType = 'S3' | 'Redshift' | 'RDS' | 'Glue' | 'Athena' | 'OLTP' | 'Other';

export type IngestionStatus = 'Pending' | 'InProgress' | 'DBTReady' | 'Completed' | 'Failed';

export interface TargetTableMapping {
  targetTableName: string;
  targetSchema: string;
  dbtModelName?: string;
  transformationNotes?: string;
}

export interface SchemaField {
  name: string;
  type: string;
  description?: string;
  nullable: boolean;
  isPrimaryKey?: boolean;
}

export interface DataAsset {
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
  createdAt: string;
  updatedAt: string;
}

export interface Domain {
  id: string;
  name: string;
  description: string;
  ownerId: string;
  parentDomainId?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface GlossaryTerm {
  id: string;
  term: string;
  definition: string;
  domainId?: string;
  synonyms: string[];
  relatedTermIds: string[];
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface LineageEdge {
  id: string;
  sourceAssetId: string;
  targetAssetId: string;
  transformationType?: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LineageGraph {
  nodes: (DataAsset | { id: string; name: string; type: string })[];
  edges: LineageEdge[];
}

export interface DashboardStats {
  counts: {
    assets: number;
    domains: number;
    glossaryTerms: number;
    lineageEdges: number;
    users: number;
  };
  distributions: {
    sensitivity: Record<string, number>;
    type: Record<string, number>;
    domain: Record<string, number>;
  };
  recentAssets: DataAsset[];
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}
