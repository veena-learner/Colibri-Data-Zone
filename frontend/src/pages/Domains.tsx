import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, FolderTree, Edit, Trash2, Database } from 'lucide-react';
import { Header } from '../components/Layout/Header';
import { Card } from '../components/ui/Card';
import { Modal } from '../components/ui/Modal';
import { PageLoading } from '../components/ui/Loading';
import { EmptyState } from '../components/ui/EmptyState';
import { TagBadge } from '../components/ui/Badge';
import { domainsApi, assetsApi } from '../services/api';
import type { Domain } from '../types';

export function DomainsPage() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingDomain, setEditingDomain] = useState<Domain | null>(null);
  const [deletingDomain, setDeletingDomain] = useState<Domain | null>(null);

  const queryClient = useQueryClient();

  const { data: domains, isLoading } = useQuery({
    queryKey: ['domains'],
    queryFn: domainsApi.list,
  });

  const { data: assets } = useQuery({
    queryKey: ['assets'],
    queryFn: () => assetsApi.list(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => domainsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['domains'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      setDeletingDomain(null);
    },
  });

  const getAssetCount = (domainId: string) => {
    return assets?.filter((a) => a.domainId === domainId).length || 0;
  };

  if (isLoading) return <PageLoading />;

  return (
    <div>
      <Header
        title="Domains"
        subtitle="Organize your data assets into logical domains"
      />

      <div className="p-8">
        <div className="flex items-center justify-between mb-6">
          <p className="text-gray-600">
            {domains?.length || 0} domains
          </p>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Create Domain
          </button>
        </div>

        {domains?.length === 0 ? (
          <EmptyState
            icon={<FolderTree className="w-8 h-8 text-gray-400" />}
            title="No domains yet"
            description="Create your first domain to organize your data assets"
            action={
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="btn-primary"
              >
                Create Domain
              </button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {domains?.map((domain) => (
              <Card key={domain.id} className="relative group">
                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                  <button
                    onClick={() => setEditingDomain(domain)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <Edit className="w-4 h-4 text-gray-500" />
                  </button>
                  <button
                    onClick={() => setDeletingDomain(domain)}
                    className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </button>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-colibri-50 flex items-center justify-center flex-shrink-0">
                    <FolderTree className="w-6 h-6 text-colibri-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-gray-900 mb-1">{domain.name}</h3>
                    <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                      {domain.description}
                    </p>
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1 text-gray-500">
                        <Database className="w-4 h-4" />
                        {getAssetCount(domain.id)} assets
                      </div>
                    </div>
                    {domain.tags.length > 0 && (
                      <div className="flex gap-1 mt-3 flex-wrap">
                        {domain.tags.slice(0, 3).map((tag) => (
                          <TagBadge key={tag} tag={tag} />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        <DomainFormModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          domain={null}
        />

        {editingDomain && (
          <DomainFormModal
            isOpen={true}
            onClose={() => setEditingDomain(null)}
            domain={editingDomain}
          />
        )}

        <Modal
          isOpen={!!deletingDomain}
          onClose={() => setDeletingDomain(null)}
          title="Delete Domain"
          size="sm"
        >
          <p className="text-gray-600 mb-6">
            Are you sure you want to delete "{deletingDomain?.name}"? Assets in this domain will become orphaned.
          </p>
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setDeletingDomain(null)}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              onClick={() => deletingDomain && deleteMutation.mutate(deletingDomain.id)}
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

function DomainFormModal({
  isOpen,
  onClose,
  domain,
}: {
  isOpen: boolean;
  onClose: () => void;
  domain: Domain | null;
}) {
  const [formData, setFormData] = useState({
    name: domain?.name || '',
    description: domain?.description || '',
    tags: domain?.tags.join(', ') || '',
  });

  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: domainsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['domains'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      onClose();
      setFormData({ name: '', description: '', tags: '' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: Partial<Domain>) => domainsApi.update(domain!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['domains'] });
      onClose();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      ...formData,
      tags: formData.tags.split(',').map((t) => t.trim()).filter(Boolean),
    };

    if (domain) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={domain ? 'Edit Domain' : 'Create Domain'}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Domain Name *
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="input"
            placeholder="e.g., Finance, Marketing, Engineering"
            required
          />
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
            placeholder="Describe the purpose and scope of this domain"
            required
          />
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
            placeholder="analytics, production, core"
          />
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={isPending}>
            {isPending ? 'Saving...' : domain ? 'Save Changes' : 'Create Domain'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
