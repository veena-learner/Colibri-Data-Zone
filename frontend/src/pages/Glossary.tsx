import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, BookOpen, Search, Edit, Trash2 } from 'lucide-react';
import { Header } from '../components/Layout/Header';
import { Card } from '../components/ui/Card';
import { Modal } from '../components/ui/Modal';
import { PageLoading } from '../components/ui/Loading';
import { EmptyState } from '../components/ui/EmptyState';
import { glossaryApi, domainsApi } from '../services/api';
import type { GlossaryTerm, Domain } from '../types';

export function GlossaryPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingTerm, setEditingTerm] = useState<GlossaryTerm | null>(null);
  const [deletingTerm, setDeletingTerm] = useState<GlossaryTerm | null>(null);
  const [selectedTerm, setSelectedTerm] = useState<GlossaryTerm | null>(null);

  const queryClient = useQueryClient();

  const { data: terms, isLoading } = useQuery({
    queryKey: ['glossary', searchQuery],
    queryFn: () => glossaryApi.list({ search: searchQuery || undefined }),
  });

  const { data: domains } = useQuery({
    queryKey: ['domains'],
    queryFn: domainsApi.list,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => glossaryApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['glossary'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      setDeletingTerm(null);
    },
  });

  const getDomainName = (domainId?: string) => {
    if (!domainId) return null;
    return domains?.find((d) => d.id === domainId)?.name;
  };

  const groupedTerms = terms?.reduce((acc, term) => {
    const firstLetter = term.term.charAt(0).toUpperCase();
    if (!acc[firstLetter]) acc[firstLetter] = [];
    acc[firstLetter].push(term);
    return acc;
  }, {} as Record<string, GlossaryTerm[]>);

  if (isLoading) return <PageLoading />;

  return (
    <div>
      <Header
        title="Business Glossary"
        subtitle="Define and manage business terminology"
      />

      <div className="p-8">
        <div className="flex items-center justify-between mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search terms..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 w-64 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-colibri-500"
            />
          </div>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Add Term
          </button>
        </div>

        {terms?.length === 0 ? (
          <EmptyState
            icon={<BookOpen className="w-8 h-8 text-gray-400" />}
            title="No glossary terms"
            description="Start building your business glossary"
            action={
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="btn-primary"
              >
                Add Term
              </button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card className="p-0">
                {groupedTerms &&
                  Object.entries(groupedTerms)
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([letter, letterTerms]) => (
                      <div key={letter}>
                        <div className="px-6 py-2 bg-gray-50 border-b border-gray-100 sticky top-0">
                          <span className="font-bold text-colibri-600">{letter}</span>
                        </div>
                        <div className="divide-y divide-gray-100">
                          {letterTerms.map((term) => (
                            <div
                              key={term.id}
                              onClick={() => setSelectedTerm(term)}
                              className={`px-6 py-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                                selectedTerm?.id === term.id ? 'bg-colibri-50' : ''
                              }`}
                            >
                              <div className="flex items-start justify-between">
                                <div>
                                  <h3 className="font-medium text-gray-900">{term.term}</h3>
                                  <p className="text-sm text-gray-500 line-clamp-1 mt-1">
                                    {term.definition}
                                  </p>
                                </div>
                                {term.domainId && (
                                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                                    {getDomainName(term.domainId)}
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
              </Card>
            </div>

            <div>
              {selectedTerm ? (
                <Card className="sticky top-8">
                  <div className="flex items-start justify-between mb-4">
                    <h3 className="text-xl font-bold text-gray-900">{selectedTerm.term}</h3>
                    <div className="flex gap-1">
                      <button
                        onClick={() => setEditingTerm(selectedTerm)}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <Edit className="w-4 h-4 text-gray-500" />
                      </button>
                      <button
                        onClick={() => setDeletingTerm(selectedTerm)}
                        className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-medium text-gray-500 mb-1">Definition</h4>
                      <p className="text-gray-700">{selectedTerm.definition}</p>
                    </div>

                    {selectedTerm.synonyms.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-500 mb-1">Synonyms</h4>
                        <div className="flex flex-wrap gap-2">
                          {selectedTerm.synonyms.map((syn) => (
                            <span
                              key={syn}
                              className="px-2 py-1 bg-gray-100 text-gray-600 text-sm rounded"
                            >
                              {syn}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {selectedTerm.domainId && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-500 mb-1">Domain</h4>
                        <p className="text-gray-700">{getDomainName(selectedTerm.domainId)}</p>
                      </div>
                    )}

                    <div className="pt-4 border-t border-gray-100">
                      <p className="text-xs text-gray-400">
                        Created: {new Date(selectedTerm.createdAt).toLocaleDateString()}
                      </p>
                      <p className="text-xs text-gray-400">
                        Updated: {new Date(selectedTerm.updatedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </Card>
              ) : (
                <Card className="text-center py-12">
                  <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">Select a term to view details</p>
                </Card>
              )}
            </div>
          </div>
        )}

        <GlossaryFormModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          term={null}
          domains={domains || []}
        />

        {editingTerm && (
          <GlossaryFormModal
            isOpen={true}
            onClose={() => setEditingTerm(null)}
            term={editingTerm}
            domains={domains || []}
          />
        )}

        <Modal
          isOpen={!!deletingTerm}
          onClose={() => setDeletingTerm(null)}
          title="Delete Term"
          size="sm"
        >
          <p className="text-gray-600 mb-6">
            Are you sure you want to delete "{deletingTerm?.term}"?
          </p>
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setDeletingTerm(null)}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              onClick={() => deletingTerm && deleteMutation.mutate(deletingTerm.id)}
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

function GlossaryFormModal({
  isOpen,
  onClose,
  term,
  domains,
}: {
  isOpen: boolean;
  onClose: () => void;
  term: GlossaryTerm | null;
  domains: Domain[];
}) {
  const [formData, setFormData] = useState({
    term: term?.term || '',
    definition: term?.definition || '',
    domainId: term?.domainId || '',
    synonyms: term?.synonyms.join(', ') || '',
  });

  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: glossaryApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['glossary'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      onClose();
      setFormData({ term: '', definition: '', domainId: '', synonyms: '' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: Partial<GlossaryTerm>) => glossaryApi.update(term!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['glossary'] });
      onClose();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      ...formData,
      domainId: formData.domainId || undefined,
      synonyms: formData.synonyms.split(',').map((s) => s.trim()).filter(Boolean),
    };

    if (term) {
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
      title={term ? 'Edit Term' : 'Add Glossary Term'}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Term *
          </label>
          <input
            type="text"
            value={formData.term}
            onChange={(e) => setFormData({ ...formData, term: e.target.value })}
            className="input"
            placeholder="e.g., Revenue, Customer, Churn Rate"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Definition *
          </label>
          <textarea
            value={formData.definition}
            onChange={(e) => setFormData({ ...formData, definition: e.target.value })}
            className="input"
            rows={4}
            placeholder="Provide a clear business definition"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Domain
          </label>
          <select
            value={formData.domainId}
            onChange={(e) => setFormData({ ...formData, domainId: e.target.value })}
            className="input"
          >
            <option value="">No specific domain</option>
            {domains.map((domain) => (
              <option key={domain.id} value={domain.id}>
                {domain.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Synonyms (comma separated)
          </label>
          <input
            type="text"
            value={formData.synonyms}
            onChange={(e) => setFormData({ ...formData, synonyms: e.target.value })}
            className="input"
            placeholder="income, sales, earnings"
          />
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={isPending}>
            {isPending ? 'Saving...' : term ? 'Save Changes' : 'Add Term'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
