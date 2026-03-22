import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams, Link } from 'react-router-dom';
import {
  Plus,
  Search,
  Grid,
  List,
  Database,
  Upload,
  Download,
  FileSpreadsheet,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { Header } from '../components/Layout/Header';
import { Card } from '../components/ui/Card';
import { SensitivityBadge, AssetTypeBadge, TagBadge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { PageLoading } from '../components/ui/Loading';
import { EmptyState } from '../components/ui/EmptyState';
import { assetsApi, domainsApi, uploadApi, usersApi, BulkUploadResult } from '../services/api';
import type { DataAsset, Domain, AssetType, SensitivityLevel } from '../types';

const ASSET_TYPES: AssetType[] = ['S3', 'Redshift', 'RDS', 'Glue', 'Athena', 'OLTP', 'Other'];
const SENSITIVITY_LEVELS: SensitivityLevel[] = ['Public', 'Internal', 'Confidential', 'Restricted'];

export function AssetsPage() {
  const [searchParams] = useSearchParams();
  const searchQuery = searchParams.get('search') || '';
  
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isBulkUploadModalOpen, setIsBulkUploadModalOpen] = useState(false);
  const [filterDomain, setFilterDomain] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('');
  const [filterSensitivity, setFilterSensitivity] = useState<string>('');
  const [localSearch, setLocalSearch] = useState(searchQuery);

  const { data: assets, isLoading } = useQuery({
    queryKey: ['assets', searchQuery],
    queryFn: () => assetsApi.list({ search: searchQuery || undefined }),
  });

  const { data: domains } = useQuery({
    queryKey: ['domains'],
    queryFn: domainsApi.list,
  });

  const filteredAssets = assets?.filter((asset) => {
    if (filterDomain && asset.domainId !== filterDomain) return false;
    if (filterType && asset.type !== filterType) return false;
    if (filterSensitivity && asset.sensitivity !== filterSensitivity) return false;
    if (localSearch && !searchQuery) {
      const search = localSearch.toLowerCase();
      return (
        asset.name.toLowerCase().includes(search) ||
        asset.description.toLowerCase().includes(search)
      );
    }
    return true;
  });

  const getDomainName = (domainId: string) => {
    return domains?.find((d) => d.id === domainId)?.name || 'Unknown';
  };

  if (isLoading) return <PageLoading />;

  return (
    <div>
      <Header
        title="Data Catalog"
        subtitle="Browse and manage your data assets"
      />

      <div className="p-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search assets..."
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
                className="pl-10 pr-4 py-2 w-64 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-colibri-500"
              />
            </div>

            <select
              value={filterDomain}
              onChange={(e) => setFilterDomain(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-colibri-500"
            >
              <option value="">All Domains</option>
              {domains?.map((domain) => (
                <option key={domain.id} value={domain.id}>
                  {domain.name}
                </option>
              ))}
            </select>

            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-colibri-500"
            >
              <option value="">All Types</option>
              {ASSET_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>

            <select
              value={filterSensitivity}
              onChange={(e) => setFilterSensitivity(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-colibri-500"
            >
              <option value="">All Sensitivity</option>
              {SENSITIVITY_LEVELS.map((level) => (
                <option key={level} value={level}>
                  {level}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 ${viewMode === 'grid' ? 'bg-colibri-50 text-colibri-600' : 'text-gray-500'}`}
              >
                <Grid className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 ${viewMode === 'list' ? 'bg-colibri-50 text-colibri-600' : 'text-gray-500'}`}
              >
                <List className="w-5 h-5" />
              </button>
            </div>

            <button
              onClick={() => setIsBulkUploadModalOpen(true)}
              className="btn-secondary flex items-center gap-2"
            >
              <Upload className="w-5 h-5" />
              Bulk Upload
            </button>

            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="btn-primary flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Register Asset
            </button>
          </div>
        </div>

        {filteredAssets?.length === 0 ? (
          <EmptyState
            icon={<Database className="w-8 h-8 text-gray-400" />}
            title="No assets found"
            description="Get started by registering your first data asset"
            action={
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="btn-primary"
              >
                Register Asset
              </button>
            }
          />
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAssets?.map((asset) => (
              <AssetCard
                key={asset.id}
                asset={asset}
                domainName={getDomainName(asset.domainId)}
              />
            ))}
          </div>
        ) : (
          <Card className="overflow-hidden p-0">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                    Name
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                    Type
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                    Domain
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                    Sensitivity
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                    Updated
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredAssets?.map((asset) => (
                  <tr key={asset.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <Link
                        to={`/assets/${asset.id}`}
                        className="font-medium text-gray-900 hover:text-colibri-600"
                      >
                        {asset.name}
                      </Link>
                      <p className="text-sm text-gray-500 truncate max-w-xs">
                        {asset.description}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <AssetTypeBadge type={asset.type} />
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {getDomainName(asset.domainId)}
                    </td>
                    <td className="px-6 py-4">
                      <SensitivityBadge level={asset.sensitivity} />
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(asset.updatedAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}

        <CreateAssetModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          domains={domains || []}
        />

        <BulkUploadModal
          isOpen={isBulkUploadModalOpen}
          onClose={() => setIsBulkUploadModalOpen(false)}
          domains={domains || []}
        />
      </div>
    </div>
  );
}

function AssetCard({
  asset,
  domainName,
}: {
  asset: DataAsset;
  domainName: string;
}) {
  return (
    <Link to={`/assets/${asset.id}`}>
      <Card className="hover:shadow-md transition-shadow h-full">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-colibri-50 flex items-center justify-center">
              <Database className="w-5 h-5 text-colibri-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{asset.name}</h3>
              <p className="text-xs text-gray-500">{domainName}</p>
            </div>
          </div>
          <AssetTypeBadge type={asset.type} />
        </div>

        <p className="text-sm text-gray-600 mb-4 line-clamp-2">
          {asset.description}
        </p>

        <div className="flex items-center justify-between">
          <SensitivityBadge level={asset.sensitivity} />
          <div className="flex gap-1">
            {asset.tags.slice(0, 2).map((tag) => (
              <TagBadge key={tag} tag={tag} />
            ))}
            {asset.tags.length > 2 && (
              <span className="text-xs text-gray-500">+{asset.tags.length - 2}</span>
            )}
          </div>
        </div>
      </Card>
    </Link>
  );
}

function CreateAssetModal({
  isOpen,
  onClose,
  domains,
}: {
  isOpen: boolean;
  onClose: () => void;
  domains: Domain[];
}) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'S3' as AssetType,
    source: '',
    location: '',
    domainId: '',
    dataOwnerId: '',
    dataStewardId: '',
    sensitivity: 'Internal' as SensitivityLevel,
    tags: '',
  });
  const [error, setError] = useState<string | null>(null);

  const queryClient = useQueryClient();

  const { data: usersByRole } = useQuery({
    queryKey: ['users-by-role'],
    queryFn: usersApi.getByRole,
  });

  const createMutation = useMutation({
    mutationFn: assetsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      setError(null);
      onClose();
      setFormData({
        name: '',
        description: '',
        type: 'S3',
        source: '',
        location: '',
        domainId: '',
        dataOwnerId: '',
        dataStewardId: '',
        sensitivity: 'Internal',
        tags: '',
      });
    },
    onError: (err: any) => {
      console.error('Create asset error:', err);
      setError(err.response?.data?.error || err.message || 'Failed to create asset');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (!formData.domainId) {
      setError('Please select a domain');
      return;
    }
    
    if (!formData.dataOwnerId) {
      setError('Please select a Data Owner');
      return;
    }
    
    createMutation.mutate({
      ...formData,
      tags: formData.tags.split(',').map((t) => t.trim()).filter(Boolean),
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Register New Asset" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Asset Name *
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
              Asset Type *
            </label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as AssetType })}
              className="input"
              required
            >
              {ASSET_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description *
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
              Source *
            </label>
            <input
              type="text"
              value={formData.source}
              onChange={(e) => setFormData({ ...formData, source: e.target.value })}
              className="input"
              placeholder="e.g. Fivetran, Salesforce, NetSuite"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Location / Path *
            </label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              className="input"
              placeholder="s3://bucket/path/ or redshift://cluster/schema.table"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Domain *
            </label>
            <select
              value={formData.domainId}
              onChange={(e) => setFormData({ ...formData, domainId: e.target.value })}
              className="input"
              required
            >
              <option value="">Select a domain</option>
              {domains.map((domain) => (
                <option key={domain.id} value={domain.id}>
                  {domain.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sensitivity Level *
            </label>
            <select
              value={formData.sensitivity}
              onChange={(e) =>
                setFormData({ ...formData, sensitivity: e.target.value as SensitivityLevel })
              }
              className="input"
              required
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
              Data Owner *
            </label>
            <select
              value={formData.dataOwnerId}
              onChange={(e) => setFormData({ ...formData, dataOwnerId: e.target.value })}
              className="input"
              required
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
            placeholder="analytics, daily, production"
          />
        </div>

        {error && (
          <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-3 pt-4">
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <button
            type="submit"
            className="btn-primary"
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? 'Creating...' : 'Register Asset'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function BulkUploadModal({
  isOpen,
  onClose,
  domains,
}: {
  isOpen: boolean;
  onClose: () => void;
  domains: Domain[];
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadResult, setUploadResult] = useState<BulkUploadResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const queryClient = useQueryClient();

  const { data: usersByRole } = useQuery({
    queryKey: ['users-by-role'],
    queryFn: usersApi.getByRole,
  });

  const uploadMutation = useMutation({
    mutationFn: uploadApi.bulkUploadAssets,
    onSuccess: (result) => {
      setUploadResult(result);
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
    onError: (err: any) => {
      setError(err.response?.data?.error || err.message || 'Upload failed');
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setError(null);
      setUploadResult(null);
    }
  };

  const handleUpload = () => {
    if (!selectedFile) {
      setError('Please select a file');
      return;
    }
    setError(null);
    uploadMutation.mutate(selectedFile);
  };

  const handleClose = () => {
    setSelectedFile(null);
    setUploadResult(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onClose();
  };

  const handleDownloadTemplate = async () => {
    const token = localStorage.getItem('token');
    const response = await fetch('http://localhost:3001/api/upload/template', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'asset_upload_template.xlsx';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Bulk Upload Assets" size="lg">
      <div className="space-y-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-blue-800 mb-2">Excel Template Format</h4>
          <p className="text-sm text-blue-700 mb-3">
            Your Excel file must have the following columns:
          </p>
          <div className="grid grid-cols-2 gap-2 text-xs text-blue-700 mb-3">
            <div><strong>name</strong> (required)</div>
            <div><strong>description</strong> (required)</div>
            <div><strong>type</strong> (required): S3, Redshift, RDS, Glue, Athena, Other</div>
            <div><strong>source</strong>: e.g. Fivetran, Salesforce, NetSuite</div>
            <div><strong>location</strong> (required): path/URL of the data</div>
            <div><strong>domainId</strong> (required): domain-1, domain-2, etc.</div>
            <div><strong>dataOwnerId</strong>: user-dataowner-1, user-steward-1, etc.</div>
            <div><strong>dataStewardId</strong>: user-steward-1, user-steward-2, etc.</div>
            <div><strong>sensitivity</strong>: Public, Internal, Confidential, Restricted</div>
            <div><strong>format</strong>: Parquet, CSV, JSON, etc.</div>
            <div><strong>tags</strong>: comma-separated tags</div>
          </div>

          <div className="grid grid-cols-3 gap-2 mb-3">
            <div className="bg-white rounded p-2 text-xs text-gray-600">
              <strong>Domains:</strong>
              <ul className="mt-1 space-y-1 max-h-24 overflow-y-auto">
                {domains.map((d) => (
                  <li key={d.id}>
                    <code className="bg-gray-100 px-1 rounded">{d.id}</code> - {d.name}
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-white rounded p-2 text-xs text-gray-600">
              <strong>Data Owners:</strong>
              <ul className="mt-1 space-y-1 max-h-24 overflow-y-auto">
                {usersByRole?.dataOwners.map((u) => (
                  <li key={u.id}>
                    <code className="bg-gray-100 px-1 rounded">{u.id}</code> - {u.name}
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-white rounded p-2 text-xs text-gray-600">
              <strong>Data Stewards:</strong>
              <ul className="mt-1 space-y-1 max-h-24 overflow-y-auto">
                {usersByRole?.dataStewards.map((u) => (
                  <li key={u.id}>
                    <code className="bg-gray-100 px-1 rounded">{u.id}</code> - {u.name}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <button
            onClick={handleDownloadTemplate}
            className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
          >
            <Download className="w-4 h-4" />
            Download Template
          </button>
        </div>

        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileSelect}
            className="hidden"
            id="excel-upload"
          />
          <label htmlFor="excel-upload" className="cursor-pointer">
            <FileSpreadsheet className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            {selectedFile ? (
              <p className="text-sm text-gray-700">
                <span className="font-medium">{selectedFile.name}</span>
                <br />
                <span className="text-gray-500">Click to change file</span>
              </p>
            ) : (
              <p className="text-sm text-gray-500">
                Click to select an Excel file (.xlsx or .xls)
              </p>
            )}
          </label>
        </div>

        {error && (
          <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg flex items-center gap-2">
            <XCircle className="w-5 h-5 flex-shrink-0" />
            {error}
          </div>
        )}

        {uploadResult && (
          <div className="space-y-3">
            <div className="flex items-center gap-4">
              <div className="bg-green-50 text-green-700 px-3 py-2 rounded-lg flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
                <span className="font-medium">{uploadResult.successCount}</span> assets created
              </div>
              {uploadResult.errorCount > 0 && (
                <div className="bg-red-50 text-red-700 px-3 py-2 rounded-lg flex items-center gap-2">
                  <XCircle className="w-5 h-5" />
                  <span className="font-medium">{uploadResult.errorCount}</span> errors
                </div>
              )}
            </div>

            {uploadResult.errors.length > 0 && (
              <div className="bg-gray-50 rounded-lg p-3 max-h-40 overflow-y-auto">
                <h5 className="text-sm font-medium text-gray-700 mb-2">Errors:</h5>
                <ul className="text-xs space-y-1">
                  {uploadResult.errors.map((err, idx) => (
                    <li key={idx} className="text-red-600">
                      Row {err.row} ({err.name}): {err.error}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end gap-3 pt-4">
          <button type="button" onClick={handleClose} className="btn-secondary">
            {uploadResult ? 'Done' : 'Cancel'}
          </button>
          {!uploadResult && (
            <button
              onClick={handleUpload}
              className="btn-primary flex items-center gap-2"
              disabled={!selectedFile || uploadMutation.isPending}
            >
              {uploadMutation.isPending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-5 h-5" />
                  Upload
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}
