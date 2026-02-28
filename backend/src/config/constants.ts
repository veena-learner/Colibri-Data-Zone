export const ENTITY_TYPES = {
  ASSET: 'ASSET',
  DOMAIN: 'DOMAIN',
  GLOSSARY: 'GLOSSARY',
  USER: 'USER',
  LINEAGE: 'LINEAGE',
  POLICY: 'POLICY',
  AUDIT: 'AUDIT',
} as const;

export const SENSITIVITY_LEVELS = {
  PUBLIC: 'Public',
  INTERNAL: 'Internal',
  CONFIDENTIAL: 'Confidential',
  RESTRICTED: 'Restricted',
} as const;

export const ASSET_TYPES = {
  S3: 'S3',
  REDSHIFT: 'Redshift',
  RDS: 'RDS',
  GLUE: 'Glue',
  ATHENA: 'Athena',
  OTHER: 'Other',
} as const;

export const USER_ROLES = {
  ADMIN: 'Admin',
  DATA_OWNER: 'DataOwner',
  DATA_STEWARD: 'DataSteward',
  ANALYST: 'Analyst',
  VIEWER: 'Viewer',
} as const;

export type SensitivityLevel = typeof SENSITIVITY_LEVELS[keyof typeof SENSITIVITY_LEVELS];
export type AssetType = typeof ASSET_TYPES[keyof typeof ASSET_TYPES];
export type UserRole = typeof USER_ROLES[keyof typeof USER_ROLES];
