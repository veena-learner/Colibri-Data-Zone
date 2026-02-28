import { useState, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  MarkerType,
  Position,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Plus, GitBranch, Database, RefreshCw } from 'lucide-react';
import { Header } from '../components/Layout/Header';
import { Card } from '../components/ui/Card';
import { Modal } from '../components/ui/Modal';
import { PageLoading } from '../components/ui/Loading';
import { EmptyState } from '../components/ui/EmptyState';
import { lineageApi, assetsApi } from '../services/api';
import type { DataAsset, LineageEdge } from '../types';

const nodeColors: Record<string, string> = {
  S3: '#f97316',
  Redshift: '#8b5cf6',
  RDS: '#3b82f6',
  Glue: '#06b6d4',
  Athena: '#6366f1',
  Other: '#6b7280',
};

function AssetNode({ data }: { data: { label: string; type: string; selected?: boolean } }) {
  return (
    <div
      className={`px-4 py-3 rounded-lg border-2 shadow-sm transition-all ${
        data.selected
          ? 'border-colibri-500 bg-colibri-50'
          : 'border-gray-200 bg-white hover:border-gray-300'
      }`}
    >
      <div className="flex items-center gap-2">
        <div
          className="w-8 h-8 rounded flex items-center justify-center"
          style={{ backgroundColor: `${nodeColors[data.type] || nodeColors.Other}20` }}
        >
          <Database
            className="w-4 h-4"
            style={{ color: nodeColors[data.type] || nodeColors.Other }}
          />
        </div>
        <div>
          <p className="font-medium text-gray-900 text-sm">{data.label}</p>
          <p className="text-xs text-gray-500">{data.type}</p>
        </div>
      </div>
    </div>
  );
}

const nodeTypes = {
  asset: AssetNode,
};

export function LineagePage() {
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const queryClient = useQueryClient();

  const { data: assets, isLoading: assetsLoading } = useQuery({
    queryKey: ['assets'],
    queryFn: () => assetsApi.list(),
  });

  const { data: allLineage, isLoading: lineageLoading } = useQuery({
    queryKey: ['lineage'],
    queryFn: lineageApi.list,
  });

  const { nodes, edges } = useMemo(() => {
    if (!assets || !allLineage) return { nodes: [], edges: [] };

    const connectedAssetIds = new Set<string>();
    allLineage.forEach((edge) => {
      connectedAssetIds.add(edge.sourceAssetId);
      connectedAssetIds.add(edge.targetAssetId);
    });

    const connectedAssets = assets.filter((a) => connectedAssetIds.has(a.id));

    const levels: Record<string, number> = {};
    const calculateLevels = () => {
      const sources = new Set(allLineage.map((e) => e.sourceAssetId));
      const targets = new Set(allLineage.map((e) => e.targetAssetId));
      
      connectedAssets.forEach((asset) => {
        if (sources.has(asset.id) && !targets.has(asset.id)) {
          levels[asset.id] = 0;
        }
      });

      let changed = true;
      while (changed) {
        changed = false;
        allLineage.forEach((edge) => {
          if (levels[edge.sourceAssetId] !== undefined && levels[edge.targetAssetId] === undefined) {
            levels[edge.targetAssetId] = levels[edge.sourceAssetId] + 1;
            changed = true;
          }
        });
      }

      connectedAssets.forEach((asset) => {
        if (levels[asset.id] === undefined) {
          levels[asset.id] = 0;
        }
      });
    };

    calculateLevels();

    const levelCounts: Record<number, number> = {};
    const nodePositions: Record<string, { x: number; y: number }> = {};

    connectedAssets.forEach((asset) => {
      const level = levels[asset.id] || 0;
      const countInLevel = levelCounts[level] || 0;
      levelCounts[level] = countInLevel + 1;
      nodePositions[asset.id] = {
        x: level * 300 + 50,
        y: countInLevel * 120 + 50,
      };
    });

    const flowNodes: Node[] = connectedAssets.map((asset) => ({
      id: asset.id,
      type: 'asset',
      position: nodePositions[asset.id],
      data: {
        label: asset.name,
        type: asset.type,
        selected: asset.id === selectedAssetId,
      },
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
    }));

    const flowEdges: Edge[] = allLineage.map((edge) => ({
      id: edge.id,
      source: edge.sourceAssetId,
      target: edge.targetAssetId,
      label: edge.transformationType,
      labelStyle: { fontSize: 10, fill: '#6b7280' },
      labelBgStyle: { fill: '#fff', fillOpacity: 0.9 },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: '#9ca3af',
      },
      style: { stroke: '#9ca3af', strokeWidth: 2 },
      animated: selectedAssetId
        ? edge.sourceAssetId === selectedAssetId || edge.targetAssetId === selectedAssetId
        : false,
    }));

    return { nodes: flowNodes, edges: flowEdges };
  }, [assets, allLineage, selectedAssetId]);

  const [flowNodes, setNodes, onNodesChange] = useNodesState(nodes);
  const [flowEdges, setEdges, onEdgesChange] = useEdgesState(edges);

  useMemo(() => {
    setNodes(nodes);
    setEdges(edges);
  }, [nodes, edges, setNodes, setEdges]);

  const onNodeClick = useCallback((_: any, node: Node) => {
    setSelectedAssetId(node.id === selectedAssetId ? null : node.id);
  }, [selectedAssetId]);

  const isLoading = assetsLoading || lineageLoading;

  if (isLoading) return <PageLoading />;

  return (
    <div>
      <Header
        title="Data Lineage"
        subtitle="Visualize data flow and dependencies"
      />

      <div className="p-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <select
              value={selectedAssetId || ''}
              onChange={(e) => setSelectedAssetId(e.target.value || null)}
              className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-colibri-500"
            >
              <option value="">All assets</option>
              {assets?.map((asset) => (
                <option key={asset.id} value={asset.id}>
                  {asset.name}
                </option>
              ))}
            </select>

            <button
              onClick={() => queryClient.invalidateQueries({ queryKey: ['lineage'] })}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Refresh"
            >
              <RefreshCw className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Add Lineage
          </button>
        </div>

        {allLineage?.length === 0 ? (
          <EmptyState
            icon={<GitBranch className="w-8 h-8 text-gray-400" />}
            title="No lineage connections"
            description="Define how your data assets relate to each other"
            action={
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="btn-primary"
              >
                Add Lineage
              </button>
            }
          />
        ) : (
          <Card className="p-0 overflow-hidden" style={{ height: '600px' }}>
            <ReactFlow
              nodes={flowNodes}
              edges={flowEdges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onNodeClick={onNodeClick}
              nodeTypes={nodeTypes}
              fitView
              attributionPosition="bottom-left"
            >
              <Controls />
              <Background gap={16} size={1} />
            </ReactFlow>
          </Card>
        )}

        <div className="mt-6 flex items-center gap-6 text-sm text-gray-500">
          <span className="font-medium">Legend:</span>
          {Object.entries(nodeColors).map(([type, color]) => (
            <div key={type} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded"
                style={{ backgroundColor: color }}
              />
              {type}
            </div>
          ))}
        </div>

        <CreateLineageModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          assets={assets || []}
        />
      </div>
    </div>
  );
}

function CreateLineageModal({
  isOpen,
  onClose,
  assets,
}: {
  isOpen: boolean;
  onClose: () => void;
  assets: DataAsset[];
}) {
  const [formData, setFormData] = useState({
    sourceAssetId: '',
    targetAssetId: '',
    transformationType: '',
    description: '',
  });

  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: lineageApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lineage'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      onClose();
      setFormData({
        sourceAssetId: '',
        targetAssetId: '',
        transformationType: '',
        description: '',
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Lineage Connection">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Source Asset *
          </label>
          <select
            value={formData.sourceAssetId}
            onChange={(e) => setFormData({ ...formData, sourceAssetId: e.target.value })}
            className="input"
            required
          >
            <option value="">Select source asset</option>
            {assets.map((asset) => (
              <option key={asset.id} value={asset.id}>
                {asset.name} ({asset.type})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Target Asset *
          </label>
          <select
            value={formData.targetAssetId}
            onChange={(e) => setFormData({ ...formData, targetAssetId: e.target.value })}
            className="input"
            required
          >
            <option value="">Select target asset</option>
            {assets
              .filter((a) => a.id !== formData.sourceAssetId)
              .map((asset) => (
                <option key={asset.id} value={asset.id}>
                  {asset.name} ({asset.type})
                </option>
              ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Transformation Type
          </label>
          <select
            value={formData.transformationType}
            onChange={(e) => setFormData({ ...formData, transformationType: e.target.value })}
            className="input"
          >
            <option value="">Select type</option>
            <option value="ETL">ETL</option>
            <option value="Aggregation">Aggregation</option>
            <option value="Join">Join</option>
            <option value="Filter">Filter</option>
            <option value="ML Pipeline">ML Pipeline</option>
            <option value="Feature Engineering">Feature Engineering</option>
            <option value="Copy">Copy</option>
            <option value="Other">Other</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="input"
            rows={2}
            placeholder="Describe the transformation"
          />
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <button
            type="submit"
            className="btn-primary"
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? 'Creating...' : 'Add Connection'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
