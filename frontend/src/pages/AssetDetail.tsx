import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Edit,
  Trash2,
  ExternalLink,
  GitBranch,
  Table,
  Shield,
  BookOpen,
  User as UserIcon,
  Calendar,
  MapPin,
} from 'lucide-react';
import { Header } from '../components/Layout/Header';
import { Card } from '../components/ui/Card';
import { SensitivityBadge, AssetTypeBadge, TagBadge } from '../components/ui/Badge';
import { PageLoading } from '../components/ui/Loading';
import { Modal } from '../components/ui/Modal';
import { assetsApi, domainsApi, lineageApi, glossaryApi, usersApi } from '../services/api';
import type { DataAsset, AssetType, SensitivityLevel, User } from '../types';

const ASSET_TYPES: AssetType[] = ['S3', 'Redshift', 'RDS', 'Glue', 'Athena', 'Other'];
const SENSITIVITY_LEVELS: SensitivityLevel[] = ['Public', 'Internal', 'Confidential', 'Restricted'];

export function AssetDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'schema' | 'lineage' | 'governance' | 'glossary'>('schema');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const { data: asset, isLoading } = useQuery({
    queryKey: ['asset', id],
    queryFn: () => assetsApi.getById(id!),
    enabled: !!id,
  });

  const { data: domain } = useQuery({
    queryKey: ['domain', asset?.domainId],
    queryFn: () => domainsApi.getById(asset!.domainId),
    enabled: !!asset?.domainId,
  });

  const { data: lineageGraph } = useQuery({
    queryKey: ['lineage-graph', id],
    queryFn: () => lineageApi.getGraph(id!, 2),
    enabled: !!id && activeTab === 'lineage',
  });

  const { data: glossaryTerms } = useQuery({
    queryKey: ['glossary'],
    queryFn: () => glossaryApi.list(),
    enabled: activeTab === 'glossary',
  });

  const { data: users } = useQuery({
    queryKey: ['users'],
    queryFn: usersApi.list,
  });

  const deleteMutation = useMutation({
    mutationFn: () => assetsApi.delete(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      navigate('/assets');
    },
  });

  if (isLoading) return <PageLoading />;
  if (!asset) return <div>Asset not found</div>;

  const linkedTerms = glossaryTerms?.filter((t) =>
    asset.glossaryTermIds?.includes(t.id)
  );

  return (
    <div>
      <Header title={asset.name} subtitle={asset.description} />

      <div className="p-8">
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => navigate('/assets')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="flex-1 flex items-center gap-3">
            <AssetTypeBadge type={asset.type} />
            <SensitivityBadge level={asset.sensitivity} />
            {asset.tags.map((tag) => (
              <TagBadge key={tag} tag={tag} />
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsEditModalOpen(true)}
              className="btn-secondary flex items-center gap-2"
            >
              <Edit className="w-4 h-4" />
              Edit
            </button>
            <button
              onClick={() => setIsDeleteModalOpen(true)}
              className="btn-danger flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <Card>
            <div className="flex items-center gap-3 mb-4">
              <MapPin className="w-5 h-5 text-gray-400" />
              <span className="text-sm font-medium text-gray-500">Location</span>
            </div>
            <p className="text-sm text-gray-900 font-mono break-all">{asset.location}</p>
          </Card>

          <Card>
            <div className="flex items-center gap-3 mb-4">
              <UserIcon className="w-5 h-5 text-gray-400" />
              <span className="text-sm font-medium text-gray-500">Domain</span>
            </div>
            <Link
              to={`/domains`}
              className="text-sm text-colibri-600 hover:text-colibri-700"
            >
              {domain?.name || 'Loading...'}
            </Link>
          </Card>

          <Card>
            <div className="flex items-center gap-3 mb-4">
              <Calendar className="w-5 h-5 text-gray-400" />
              <span className="text-sm font-medium text-gray-500">Last Updated</span>
            </div>
            <p className="text-sm text-gray-900">
              {new Date(asset.updatedAt).toLocaleString()}
            </p>
          </Card>
        </div>

        <Card className="p-0">
          <div className="border-b border-gray-200">
            <nav className="flex">
              {[
                { id: 'schema', label: 'Schema', icon: Table },
                { id: 'lineage', label: 'Lineage', icon: GitBranch },
                { id: 'governance', label: 'Governance', icon: Shield },
                { id: 'glossary', label: 'Glossary', icon: BookOpen },
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id as any)}
                  className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === id
                      ? 'border-colibri-600 text-colibri-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'schema' && (
              <SchemaTab schema={asset.schema} format={asset.format} />
            )}
            {activeTab === 'lineage' && (
              <LineageTab assetId={asset.id} assetName={asset.name} graph={lineageGraph} />
            )}
            {activeTab === 'governance' && (
              <GovernanceTab asset={asset} users={users} />
            )}
            {activeTab === 'glossary' && (
              <GlossaryTab terms={linkedTerms} />
            )}
          </div>
        </Card>

        <EditAssetModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          asset={asset}
        />

        <Modal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          title="Delete Asset"
          size="sm"
        >
          <p className="text-gray-600 mb-6">
            Are you sure you want to delete "{asset.name}"? This action cannot be undone.
          </p>
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setIsDeleteModalOpen(false)}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              onClick={() => deleteMutation.mutate()}
              className="btn-danger"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </Modal>
      </div>
    </div>
  );
}

function SchemaTab({ schema, format }: { schema?: DataAsset['schema']; format?: string }) {
  if (!schema || schema.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <Table className="w-12 h-12 mx-auto mb-3 text-gray-300" />
        <p>No schema defined for this asset</p>
        {format && <p className="text-sm mt-1">Format: {format}</p>}
      </div>
    );
  }

  return (
    <div>
      {format && (
        <p className="text-sm text-gray-500 mb-4">Format: {format}</p>
      )}
      <table className="w-full">
        <thead className="bg-gray-50">
          <tr>
            <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 uppercase">
              Column
            </th>
            <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 uppercase">
              Type
            </th>
            <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 uppercase">
              Nullable
            </th>
            <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 uppercase">
              Key
            </th>
            <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 uppercase">
              Description
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {schema.map((field, index) => (
            <tr key={index}>
              <td className="px-4 py-3 font-mono text-sm">{field.name}</td>
              <td className="px-4 py-3 font-mono text-sm text-gray-600">{field.type}</td>
              <td className="px-4 py-3 text-sm">
                {field.nullable ? (
                  <span className="text-gray-400">Yes</span>
                ) : (
                  <span className="text-red-600">No</span>
                )}
              </td>
              <td className="px-4 py-3 text-sm">
                {field.isPrimaryKey && (
                  <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 text-xs rounded">
                    PK
                  </span>
                )}
              </td>
              <td className="px-4 py-3 text-sm text-gray-500">
                {field.description || '-'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function LineageTab({
  assetId,
  assetName,
  graph,
}: {
  assetId: string;
  assetName: string;
  graph?: { nodes: any[]; edges: any[] };
}) {
  if (!graph) {
    return <div className="text-center py-8 text-gray-500">Loading lineage...</div>;
  }

  const upstream = graph.edges.filter((e) => e.targetAssetId === assetId);
  const downstream = graph.edges.filter((e) => e.sourceAssetId === assetId);

  return (
    <div>
      <div className="mb-6">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Upstream Sources ({upstream.length})</h4>
        {upstream.length === 0 ? (
          <p className="text-sm text-gray-500">No upstream dependencies</p>
        ) : (
          <div className="space-y-2">
            {upstream.map((edge) => {
              const sourceNode = graph.nodes.find((n) => n.id === edge.sourceAssetId);
              return (
                <div
                  key={edge.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <GitBranch className="w-4 h-4 text-gray-400" />
                    <Link
                      to={`/assets/${edge.sourceAssetId}`}
                      className="text-sm font-medium text-colibri-600 hover:text-colibri-700"
                    >
                      {sourceNode?.name || edge.sourceAssetId}
                    </Link>
                  </div>
                  <span className="text-xs text-gray-500">{edge.transformationType}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex items-center justify-center py-4">
        <div className="px-4 py-2 bg-colibri-100 text-colibri-700 rounded-lg font-medium">
          {assetName}
        </div>
      </div>

      <div className="mt-6">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Downstream Targets ({downstream.length})</h4>
        {downstream.length === 0 ? (
          <p className="text-sm text-gray-500">No downstream dependencies</p>
        ) : (
          <div className="space-y-2">
            {downstream.map((edge) => {
              const targetNode = graph.nodes.find((n) => n.id === edge.targetAssetId);
              return (
                <div
                  key={edge.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <GitBranch className="w-4 h-4 text-gray-400" />
                    <Link
                      to={`/assets/${edge.targetAssetId}`}
                      className="text-sm font-medium text-colibri-600 hover:text-colibri-700"
                    >
                      {targetNode?.name || edge.targetAssetId}
                    </Link>
                  </div>
                  <span className="text-xs text-gray-500">{edge.transformationType}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function GovernanceTab({ asset, users }: { asset: DataAsset; users?: User[] }) {
  const getUser = (userId?: string) => users?.find(u => u.id === userId);
  const dataOwner = getUser(asset.dataOwnerId);
  const dataSteward = getUser(asset.dataStewardId);

  return (
    <div className="space-y-6">
      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-3">Data Classification</h4>
        <div className="p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Sensitivity Level</span>
            <SensitivityBadge level={asset.sensitivity} />
          </div>
        </div>
      </div>

      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-3">Ownership</h4>
        <div className="space-y-2">
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div>
              <span className="text-sm text-gray-600">Data Owner</span>
              <p className="text-xs text-gray-400">Responsible for the data asset</p>
            </div>
            <div className="text-right">
              <span className="text-sm font-medium">{dataOwner?.name || asset.dataOwnerId || 'Not assigned'}</span>
              {dataOwner?.email && (
                <p className="text-xs text-gray-500">{dataOwner.email}</p>
              )}
            </div>
          </div>
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div>
              <span className="text-sm text-gray-600">Data Steward</span>
              <p className="text-xs text-gray-400">Governs data quality & standards</p>
            </div>
            <div className="text-right">
              <span className="text-sm font-medium">{dataSteward?.name || asset.dataStewardId || 'Not assigned'}</span>
              {dataSteward?.email && (
                <p className="text-xs text-gray-500">{dataSteward.email}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {asset.metadata && Object.keys(asset.metadata).length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3">Custom Metadata</h4>
          <div className="space-y-2">
            {Object.entries(asset.metadata).map(([key, value]) => (
              <div
                key={key}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <span className="text-sm text-gray-600">{key}</span>
                <span className="text-sm font-medium">{value}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function GlossaryTab({ terms }: { terms?: any[] }) {
  if (!terms || terms.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <BookOpen className="w-12 h-12 mx-auto mb-3 text-gray-300" />
        <p>No glossary terms linked to this asset</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {terms.map((term) => (
        <div key={term.id} className="p-4 bg-gray-50 rounded-lg">
          <h4 className="font-medium text-gray-900">{term.term}</h4>
          <p className="text-sm text-gray-600 mt-1">{term.definition}</p>
          {term.synonyms.length > 0 && (
            <div className="flex gap-2 mt-2">
              <span className="text-xs text-gray-500">Synonyms:</span>
              {term.synonyms.map((s: string) => (
                <span key={s} className="text-xs text-gray-600">
                  {s}
                </span>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function EditAssetModal({
  isOpen,
  onClose,
  asset,
}: {
  isOpen: boolean;
  onClose: () => void;
  asset: DataAsset;
}) {
  const [formData, setFormData] = useState({
    name: asset.name,
    description: asset.description,
    type: asset.type,
    location: asset.location,
    dataOwnerId: asset.dataOwnerId || '',
    dataStewardId: asset.dataStewardId || '',
    sensitivity: asset.sensitivity,
    tags: asset.tags.join(', '),
  });

  const queryClient = useQueryClient();

  const { data: usersByRole } = useQuery({
    queryKey: ['users-by-role'],
    queryFn: usersApi.getByRole,
  });

  const updateMutation = useMutation({
    mutationFn: (data: Partial<DataAsset>) => assetsApi.update(asset.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asset', asset.id] });
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      onClose();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate({
      ...formData,
      tags: formData.tags.split(',').map((t) => t.trim()).filter(Boolean),
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Asset" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Asset Name
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="input"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="input"
            rows={3}
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Asset Type
            </label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as AssetType })}
              className="input"
            >
              {ASSET_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sensitivity Level
            </label>
            <select
              value={formData.sensitivity}
              onChange={(e) =>
                setFormData({ ...formData, sensitivity: e.target.value as SensitivityLevel })
              }
              className="input"
            >
              {SENSITIVITY_LEVELS.map((level) => (
                <option key={level} value={level}>
                  {level}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Data Owner
            </label>
            <select
              value={formData.dataOwnerId}
              onChange={(e) => setFormData({ ...formData, dataOwnerId: e.target.value })}
              className="input"
            >
              <option value="">Select Data Owner</option>
              {usersByRole?.dataOwners.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name} ({user.email})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Data Steward
            </label>
            <select
              value={formData.dataStewardId}
              onChange={(e) => setFormData({ ...formData, dataStewardId: e.target.value })}
              className="input"
            >
              <option value="">Select Data Steward (optional)</option>
              {usersByRole?.dataStewards.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name} ({user.email})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Tags (comma separated)
          </label>
          <input
            type="text"
            value={formData.tags}
            onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
            className="input"
          />
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <button
            type="submit"
            className="btn-primary"
            disabled={updateMutation.isPending}
          >
            {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
