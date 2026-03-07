import type { SensitivityLevel, AssetType } from '../../types';

interface SensitivityBadgeProps {
  level: SensitivityLevel;
}

const sensitivityColors: Record<SensitivityLevel, string> = {
  Public: 'bg-green-100 text-green-800',
  Internal: 'bg-blue-100 text-blue-800',
  Confidential: 'bg-yellow-100 text-yellow-800',
  Restricted: 'bg-red-100 text-red-800',
};

export function SensitivityBadge({ level }: SensitivityBadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${sensitivityColors[level]}`}
    >
      {level}
    </span>
  );
}

interface AssetTypeBadgeProps {
  type: AssetType;
}

const typeColors: Record<AssetType, string> = {
  S3: 'bg-orange-100 text-orange-800',
  Redshift: 'bg-purple-100 text-purple-800',
  RDS: 'bg-blue-100 text-blue-800',
  Glue: 'bg-cyan-100 text-cyan-800',
  Athena: 'bg-indigo-100 text-indigo-800',
  OLTP: 'bg-emerald-100 text-emerald-800',
  Other: 'bg-gray-100 text-gray-800',
};

export function AssetTypeBadge({ type }: AssetTypeBadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${typeColors[type]}`}
    >
      {type}
    </span>
  );
}

interface TagBadgeProps {
  tag: string;
  onRemove?: () => void;
}

export function TagBadge({ tag, onRemove }: TagBadgeProps) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-700">
      {tag}
      {onRemove && (
        <button
          onClick={onRemove}
          className="hover:text-red-600 transition-colors"
        >
          ×
        </button>
      )}
    </span>
  );
}
