import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search,
  Upload,
  Download,
  Plus,
  FileSpreadsheet,
  Table2,
  ChevronDown,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { Header } from '../components/Layout/Header';
import { Card } from '../components/ui/Card';
import { Modal } from '../components/ui/Modal';
import { PageLoading } from '../components/ui/Loading';
import { EmptyState } from '../components/ui/EmptyState';
import { ontologyApi, uploadApi } from '../services/api';
import type { OntologyColumn } from '../types';

export function OntologyPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterModel, setFilterModel] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isBulkUploadModalOpen, setIsBulkUploadModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const queryClient = useQueryClient();

  const { data: items, isLoading } = useQuery({
    queryKey: ['ontology', filterModel, searchQuery],
    queryFn: () =>
      ontologyApi.list({
        ...(filterModel && { model: filterModel }),
        ...(searchQuery && { search: searchQuery }),
      }),
  });

  const { data: models } = useQuery({
    queryKey: ['ontology-models'],
    queryFn: () => ontologyApi.getModels(),
  });

  const filtered = items;

  if (isLoading) return <PageLoading />;

  return (
    <div>
      <Header
        title="Ontology & Column Descriptions"
        subtitle="DBT model and column descriptions with ontology definitions"
      />

      <div className="p-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search model, column, or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 w-80 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-colibri-500"
              />
            </div>
            <select
              value={filterModel}
              onChange={(e) => setFilterModel(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-colibri-500"
            >
              <option value="">All models</option>
              {models?.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsBulkUploadModalOpen(true)}
              className="btn-secondary flex items-center gap-2"
            >
              <Upload className="w-5 h-5" />
              Bulk Upload CSV
            </button>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="btn-primary flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Add Row
            </button>
          </div>
        </div>

        <div className="mb-4 text-sm text-gray-500">
          {filtered?.length ?? 0} column description(s)
        </div>

        {!filtered || filtered.length === 0 ? (
          <EmptyState
            icon={<Table2 className="w-8 h-8 text-gray-400" />}
            title="No ontology entries"
            description="Add column descriptions and ontology definitions via Bulk Upload CSV or Add Row"
            action={
              <div className="flex gap-2">
                <button
                  onClick={() => setIsBulkUploadModalOpen(true)}
                  className="btn-secondary flex items-center gap-2"
                >
                  <Upload className="w-5 h-5" />
                  Bulk Upload
                </button>
                <button onClick={() => setIsAddModalOpen(true)} className="btn-primary">
                  Add Row
                </button>
              </div>
            }
          />
        ) : (
          <Card className="overflow-hidden p-0">
            <div className="overflow-x-auto max-h-[70vh] overflow-y-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                      Model
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                      Column
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase min-w-[280px]">
                      Description
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase min-w-[200px]">
                      Ontology Definition
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map((row) => (
                    <OntologyRow key={row.id} row={row} />
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        <AddOntologyModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
        />

        <BulkUploadOntologyModal
          isOpen={isBulkUploadModalOpen}
          onClose={() => setIsBulkUploadModalOpen(false)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['ontology'] });
            queryClient.invalidateQueries({ queryKey: ['ontology-models'] });
          }}
          fileInputRef={fileInputRef}
        />
      </div>
    </div>
  );
}

function OntologyRow({ row }: { row: OntologyColumn }) {
  const [expanded, setExpanded] = useState(false);
  const descTruncated = row.description.length > 120;
  const ontologyTruncated = (row.ontologyDefinition?.length ?? 0) > 80;

  return (
    <tr className="hover:bg-gray-50">
      <td className="px-4 py-3 font-mono text-sm text-gray-900">{row.model}</td>
      <td className="px-4 py-3 font-mono text-sm text-gray-800">{row.column}</td>
      <td className="px-4 py-3 text-sm text-gray-600">
        {descTruncated && !expanded ? (
          <>
            {row.description.slice(0, 120)}…
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="ml-1 text-colibri-600 hover:underline"
            >
              <ChevronDown className="w-4 h-4 inline" />
            </button>
          </>
        ) : (
          <>
            {row.description}
            {descTruncated && expanded && (
              <button
                type="button"
                onClick={() => setExpanded(false)}
                className="ml-1 text-colibri-600 hover:underline"
              >
                Less
              </button>
            )}
          </>
        )}
      </td>
      <td className="px-4 py-3 text-sm text-gray-600">
        {row.ontologyDefinition ? (
          ontologyTruncated && !expanded ? (
            <>
              {row.ontologyDefinition.slice(0, 80)}…
            </>
          ) : (
            row.ontologyDefinition
          )
        ) : (
          <span className="text-gray-400 italic">—</span>
        )}
      </td>
    </tr>
  );
}

function AddOntologyModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [formData, setFormData] = useState({
    model: '',
    column: '',
    description: '',
    ontologyDefinition: '',
  });
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: ontologyApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ontology'] });
      queryClient.invalidateQueries({ queryKey: ['ontology-models'] });
      onClose();
      setFormData({ model: '', column: '', description: '', ontologyDefinition: '' });
      setError(null);
    },
    onError: (err: any) => {
      setError(err.response?.data?.error || err.message || 'Failed to add');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!formData.model.trim() || !formData.column.trim()) {
      setError('Model and Column are required');
      return;
    }
    createMutation.mutate({
      model: formData.model.trim(),
      column: formData.column.trim(),
      description: formData.description.trim(),
      ontologyDefinition: formData.ontologyDefinition.trim() || undefined,
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Column Description" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Model *</label>
            <input
              type="text"
              value={formData.model}
              onChange={(e) => setFormData({ ...formData, model: e.target.value })}
              className="input font-mono"
              placeholder="e.g. netsuite_customer"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Column *</label>
            <input
              type="text"
              value={formData.column}
              onChange={(e) => setFormData({ ...formData, column: e.target.value })}
              className="input font-mono"
              placeholder="e.g. customer_id"
              required
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="input"
            rows={3}
            placeholder="Column description"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Ontology Definition</label>
          <textarea
            value={formData.ontologyDefinition}
            onChange={(e) => setFormData({ ...formData, ontologyDefinition: e.target.value })}
            className="input"
            rows={2}
            placeholder="Optional ontology definition"
          />
        </div>
        {error && (
          <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg">{error}</div>
        )}
        <div className="flex justify-end gap-3 pt-4">
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={createMutation.isPending}>
            {createMutation.isPending ? 'Adding...' : 'Add'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function BulkUploadOntologyModal({
  isOpen,
  onClose,
  onSuccess,
  fileInputRef,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
}) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [result, setResult] = useState<{
    totalRows: number;
    successCount: number;
    errorCount: number;
    errors: { row: number; model: string; column: string; error: string }[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const uploadMutation = useMutation({
    mutationFn: uploadApi.bulkUploadOntology,
    onSuccess: (data) => {
      setResult(data);
      onSuccess();
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
      setResult(null);
    }
  };

  const handleUpload = () => {
    if (!selectedFile) {
      setError('Please select a CSV file');
      return;
    }
    setError(null);
    uploadMutation.mutate(selectedFile);
  };

  const handleClose = () => {
    setSelectedFile(null);
    setResult(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Bulk Upload Ontology (CSV)" size="lg">
      <div className="space-y-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-blue-800 mb-2">CSV format</h4>
          <p className="text-sm text-blue-700 mb-2">
            Header row: <code className="bg-blue-100 px-1 rounded">model,column,description,Ontology Definition</code>
          </p>
          <p className="text-sm text-blue-700 mb-2">
            Rows with the same model+column will be updated; new model+column pairs will be added.
          </p>
          <button
            type="button"
            onClick={async () => {
              try {
                const token = localStorage.getItem('token');
                const res = await fetch('/api/upload/ontology/template', {
                  headers: token ? { Authorization: `Bearer ${token}` } : {},
                });
                const blob = await res.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'ontology_column_descriptions_template.csv';
                a.click();
                window.URL.revokeObjectURL(url);
              } catch {
                window.open('/api/upload/ontology/template', '_blank');
              }
            }}
            className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
          >
            <Download className="w-4 h-4" />
            Download template
          </button>
        </div>

        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileSelect}
            className="hidden"
            id="ontology-csv-upload"
          />
          <label htmlFor="ontology-csv-upload" className="cursor-pointer">
            <FileSpreadsheet className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            {selectedFile ? (
              <p className="text-sm text-gray-700">
                <span className="font-medium">{selectedFile.name}</span>
                <br />
                <span className="text-gray-500">Click to change file</span>
              </p>
            ) : (
              <p className="text-sm text-gray-500">Click to select a CSV file</p>
            )}
          </label>
        </div>

        {error && (
          <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg flex items-center gap-2">
            <XCircle className="w-5 h-5 flex-shrink-0" />
            {error}
          </div>
        )}

        {result && (
          <div className="space-y-3">
            <div className="flex items-center gap-4">
              <div className="bg-green-50 text-green-700 px-3 py-2 rounded-lg flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
                <span className="font-medium">{result.successCount}</span> rows processed
              </div>
              {result.errorCount > 0 && (
                <div className="bg-red-50 text-red-700 px-3 py-2 rounded-lg flex items-center gap-2">
                  <XCircle className="w-5 h-5" />
                  <span className="font-medium">{result.errorCount}</span> errors
                </div>
              )}
            </div>
            {result.errors.length > 0 && (
              <div className="bg-gray-50 rounded-lg p-3 max-h-40 overflow-y-auto">
                <h5 className="text-sm font-medium text-gray-700 mb-2">Errors (first 100):</h5>
                <ul className="text-xs space-y-1">
                  {result.errors.map((err, idx) => (
                    <li key={idx} className="text-red-600">
                      Row {err.row} ({err.model}.{err.column}): {err.error}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end gap-3 pt-4">
          <button type="button" onClick={handleClose} className="btn-secondary">
            {result ? 'Done' : 'Cancel'}
          </button>
          {!result && (
            <button
              type="button"
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
