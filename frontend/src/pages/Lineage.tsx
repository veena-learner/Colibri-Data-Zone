import { useState, useCallback, useMemo, useRef } from 'react';
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
import {
  Plus,
  GitBranch,
  Database,
  Search,
  Upload,
  FileJson,
  CheckCircle,
  XCircle,
  Layers,
  ArrowRight,
  ChevronRight,
} from 'lucide-react';
import { Header } from '../components/Layout/Header';
import { Card } from '../components/ui/Card';
import { Modal } from '../components/ui/Modal';
import { EmptyState } from '../components/ui/EmptyState';
import { dbtApi, lineageApi, assetsApi, DbtLineageData } from '../services/api';
import type { DataAsset } from '../types';

const typeColors: Record<string, string> = {
  model: '#8b5cf6',
  source: '#f97316',
  seed: '#10b981',
};

function DbtFlowNode({ data }: { data: { label: string; type: string; schema?: string; selected?: boolean } }) {
  const color = typeColors[data.type] || '#6b7280';
  return (
    <div
      className={`px-3 py-2 rounded-lg border-2 shadow-sm transition-all min-w-[180px] ${
        data.selected
          ? 'border-colibri-500 bg-colibri-50 ring-2 ring-colibri-200'
          : 'border-gray-200 bg-white hover:border-gray-300'
      }`}
    >
      <div className="flex items-center gap-2">
        <div
          className="w-7 h-7 rounded flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: `${color}20` }}
        >
          {data.type === 'source' ? (
            <Database className="w-3.5 h-3.5" style={{ color }} />
          ) : (
            <Layers className="w-3.5 h-3.5" style={{ color }} />
          )}
        </div>
        <div className="min-w-0">
          <p className="font-medium text-gray-900 text-xs truncate">{data.label}</p>
          <p className="text-[10px] text-gray-400">{data.type}{data.schema ? ` · ${data.schema}` : ''}</p>
        </div>
      </div>
    </div>
  );
}

const nodeTypes = { dbt: DbtFlowNode };

export function LineagePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'dbt' | 'manual'>('dbt');

  // Get stats (no search/node filter - light request for counts)
  const { data: statsData } = useQuery({
    queryKey: ['dbt-lineage-stats'],
    queryFn: () => dbtApi.getLineage(),
    select: (data) => data.stats,
  });

  // Get node list for browsing
  const { data: nodeList, isLoading: nodesLoading } = useQuery({
    queryKey: ['dbt-nodes', searchQuery],
    queryFn: () => dbtApi.getNodes({ search: searchQuery || undefined, limit: 100 }),
    enabled: activeTab === 'dbt',
  });

  // Get focused lineage when a node is selected
  const { data: focusedLineage, isLoading: lineageLoading } = useQuery({
    queryKey: ['dbt-lineage-focused', selectedNodeId],
    queryFn: () => dbtApi.getLineage({ nodeId: selectedNodeId!, depth: 2 }),
    enabled: !!selectedNodeId,
  });

  const { data: assets } = useQuery({
    queryKey: ['assets'],
    queryFn: () => assetsApi.list(),
    enabled: activeTab === 'manual',
  });

  const { data: manualLineage } = useQuery({
    queryKey: ['lineage'],
    queryFn: lineageApi.list,
    enabled: activeTab === 'manual',
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // searchQuery state already triggers the query
  };

  // Build graph from focused lineage data
  const { nodes: flowNodes, edges: flowEdges } = useMemo(() => {
    if (activeTab === 'manual') {
      return buildManualGraph(assets || [], manualLineage || []);
    }
    if (!focusedLineage || !selectedNodeId) return { nodes: [], edges: [] };
    return buildDbtGraph(focusedLineage, selectedNodeId);
  }, [focusedLineage, selectedNodeId, assets, manualLineage, activeTab]);

  const [rfNodes, setRfNodes, onNodesChange] = useNodesState(flowNodes);
  const [rfEdges, setRfEdges, onEdgesChange] = useEdgesState(flowEdges);

  useMemo(() => {
    setRfNodes(flowNodes);
    setRfEdges(flowEdges);
  }, [flowNodes, flowEdges, setRfNodes, setRfEdges]);

  const onNodeClick = useCallback((_: any, node: Node) => {
    setSelectedNodeId(node.id);
  }, []);

  // Separate upstream (sources) and downstream (targets) for selected node
  const upstreamNodes = useMemo(() => {
    if (!focusedLineage || !selectedNodeId) return [];
    const parentIds = focusedLineage.edges
      .filter(e => e.target === selectedNodeId)
      .map(e => e.source);
    return focusedLineage.nodes.filter(n => parentIds.includes(n.id));
  }, [focusedLineage, selectedNodeId]);

  const downstreamNodes = useMemo(() => {
    if (!focusedLineage || !selectedNodeId) return [];
    const childIds = focusedLineage.edges
      .filter(e => e.source === selectedNodeId)
      .map(e => e.target);
    return focusedLineage.nodes.filter(n => childIds.includes(n.id));
  }, [focusedLineage, selectedNodeId]);

  const selectedNode = focusedLineage?.nodes.find(n => n.id === selectedNodeId);

  return (
    <div>
      <Header title="Data Lineage" subtitle="Visualize data flow and dependencies across your dbt models" />

      <div className="p-8">
        {/* Tab bar */}
        <div className="flex items-center gap-4 mb-6 border-b border-gray-200 pb-3">
          <button
            onClick={() => { setActiveTab('dbt'); setSelectedNodeId(null); }}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              activeTab === 'dbt' ? 'bg-colibri-600 text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4" />
              dbt Lineage
            </div>
          </button>
          <button
            onClick={() => { setActiveTab('manual'); setSelectedNodeId(null); }}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              activeTab === 'manual' ? 'bg-colibri-600 text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <div className="flex items-center gap-2">
              <GitBranch className="w-4 h-4" />
              Manual Lineage
            </div>
          </button>
        </div>

        {/* Stats */}
        {activeTab === 'dbt' && statsData && (
          <div className="grid grid-cols-4 gap-4 mb-4">
            {[
              { label: 'Models', value: statsData.totalModels, color: 'text-purple-600 bg-purple-50' },
              { label: 'Sources', value: statsData.totalSources, color: 'text-orange-600 bg-orange-50' },
              { label: 'Seeds', value: statsData.totalSeeds, color: 'text-green-600 bg-green-50' },
              { label: 'Lineage Edges', value: statsData.totalEdges, color: 'text-blue-600 bg-blue-50' },
            ].map(s => (
              <Card key={s.label} className="py-3 px-4">
                <p className="text-xs text-gray-500">{s.label}</p>
                <p className={`text-2xl font-bold ${s.color.split(' ')[0]}`}>{s.value.toLocaleString()}</p>
              </Card>
            ))}
          </div>
        )}

        {activeTab === 'dbt' && (
          <div className="flex gap-4">
            {/* Left panel: Search & Browse */}
            <div className="w-80 flex-shrink-0">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-700">Browse Models</h3>
                <button
                  onClick={() => setIsUploadModalOpen(true)}
                  className="text-xs text-colibri-600 hover:text-colibri-700 flex items-center gap-1"
                >
                  <Upload className="w-3 h-3" />
                  Upload JSON
                </button>
              </div>

              <form onSubmit={handleSearch} className="mb-3">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search models, sources..."
                    className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-colibri-500 text-sm"
                  />
                </div>
              </form>

              <div className="border border-gray-200 rounded-lg overflow-hidden max-h-[600px] overflow-y-auto">
                {nodesLoading ? (
                  <div className="p-4 text-center text-sm text-gray-500">Loading...</div>
                ) : nodeList && nodeList.length > 0 ? (
                  nodeList.map(node => (
                    <button
                      key={node.id}
                      onClick={() => setSelectedNodeId(node.id)}
                      className={`w-full text-left px-3 py-2.5 border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                        selectedNodeId === node.id ? 'bg-colibri-50 border-l-2 border-l-colibri-600' : ''
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: typeColors[node.resourceType] || '#6b7280' }}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-900 truncate">{node.name}</p>
                          <p className="text-[11px] text-gray-400">{node.resourceType} · {node.schema}</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="p-4 text-center text-sm text-gray-500">
                    {searchQuery ? 'No matching models found' : 'No models loaded'}
                  </div>
                )}
              </div>
            </div>

            {/* Right panel: Lineage detail */}
            <div className="flex-1">
              {!selectedNodeId ? (
                <Card className="h-[650px] flex items-center justify-center">
                  <div className="text-center">
                    <GitBranch className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 font-medium">Select a model to view its lineage</p>
                    <p className="text-sm text-gray-400 mt-1">Click on any model from the list to see its upstream sources and downstream targets</p>
                  </div>
                </Card>
              ) : lineageLoading ? (
                <Card className="h-[650px] flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-8 h-8 border-2 border-colibri-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                    <p className="text-sm text-gray-500">Loading lineage...</p>
                  </div>
                </Card>
              ) : (
                <div className="space-y-4">
                  {/* Source -> Target Table */}
                  <div className="grid grid-cols-3 gap-4">
                    {/* Upstream (Sources) */}
                    <Card>
                      <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                        <Database className="w-4 h-4 text-orange-500" />
                        Upstream ({upstreamNodes.length})
                      </h4>
                      <div className="space-y-1.5 max-h-48 overflow-y-auto">
                        {upstreamNodes.length === 0 ? (
                          <p className="text-xs text-gray-400">No upstream dependencies</p>
                        ) : (
                          upstreamNodes.map(n => (
                            <button
                              key={n.id}
                              onClick={() => setSelectedNodeId(n.id)}
                              className="w-full text-left px-2 py-1.5 rounded hover:bg-gray-50 flex items-center gap-2"
                            >
                              <div
                                className="w-2 h-2 rounded-full flex-shrink-0"
                                style={{ backgroundColor: typeColors[n.resourceType] || '#6b7280' }}
                              />
                              <div className="min-w-0">
                                <p className="text-xs font-medium text-gray-800 truncate">{n.name}</p>
                                <p className="text-[10px] text-gray-400">{n.resourceType}</p>
                              </div>
                            </button>
                          ))
                        )}
                      </div>
                    </Card>

                    {/* Current Node */}
                    <Card className="border-colibri-200 bg-colibri-50">
                      <h4 className="text-sm font-semibold text-colibri-700 mb-3 flex items-center gap-2">
                        <Layers className="w-4 h-4" />
                        Selected Model
                      </h4>
                      {selectedNode && (
                        <div className="space-y-2">
                          <p className="font-semibold text-gray-900 text-sm">{selectedNode.name}</p>
                          <div className="text-xs space-y-1 text-gray-600">
                            <div className="flex justify-between"><span>Type</span><span className="font-medium">{selectedNode.resourceType}</span></div>
                            <div className="flex justify-between"><span>Schema</span><span className="font-medium">{selectedNode.schema}</span></div>
                            <div className="flex justify-between"><span>Database</span><span className="font-medium">{selectedNode.database}</span></div>
                            {selectedNode.source && <div className="flex justify-between"><span>Source</span><span className="font-medium">{selectedNode.source}</span></div>}
                            <div className="flex justify-between"><span>Columns</span><span className="font-medium">{selectedNode.columnCount}</span></div>
                          </div>
                          {selectedNode.description && (
                            <p className="text-xs text-gray-500 mt-2 border-t pt-2">{selectedNode.description}</p>
                          )}
                        </div>
                      )}
                    </Card>

                    {/* Downstream (Targets) */}
                    <Card>
                      <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                        <ArrowRight className="w-4 h-4 text-purple-500" />
                        Downstream ({downstreamNodes.length})
                      </h4>
                      <div className="space-y-1.5 max-h-48 overflow-y-auto">
                        {downstreamNodes.length === 0 ? (
                          <p className="text-xs text-gray-400">No downstream targets</p>
                        ) : (
                          downstreamNodes.map(n => (
                            <button
                              key={n.id}
                              onClick={() => setSelectedNodeId(n.id)}
                              className="w-full text-left px-2 py-1.5 rounded hover:bg-gray-50 flex items-center gap-2"
                            >
                              <div
                                className="w-2 h-2 rounded-full flex-shrink-0"
                                style={{ backgroundColor: typeColors[n.resourceType] || '#6b7280' }}
                              />
                              <div className="min-w-0">
                                <p className="text-xs font-medium text-gray-800 truncate">{n.name}</p>
                                <p className="text-[10px] text-gray-400">{n.resourceType}</p>
                              </div>
                            </button>
                          ))
                        )}
                      </div>
                    </Card>
                  </div>

                  {/* Graph */}
                  <Card className="p-0 overflow-hidden" style={{ height: '400px' }}>
                    <ReactFlow
                      nodes={rfNodes}
                      edges={rfEdges}
                      onNodesChange={onNodesChange}
                      onEdgesChange={onEdgesChange}
                      onNodeClick={onNodeClick}
                      nodeTypes={nodeTypes}
                      fitView
                      attributionPosition="bottom-left"
                      minZoom={0.1}
                    >
                      <Controls />
                      <Background gap={16} size={1} />
                    </ReactFlow>
                  </Card>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'manual' && (
          <div>
            <div className="flex items-center justify-end mb-4">
              <button
                onClick={() => setIsManualModalOpen(true)}
                className="btn-primary flex items-center gap-2 text-sm"
              >
                <Plus className="w-5 h-5" />
                Add Connection
              </button>
            </div>

            {manualLineage && manualLineage.length > 0 ? (
              <Card className="p-0 overflow-hidden" style={{ height: '600px' }}>
                <ReactFlow
                  nodes={rfNodes}
                  edges={rfEdges}
                  onNodesChange={onNodesChange}
                  onEdgesChange={onEdgesChange}
                  nodeTypes={nodeTypes}
                  fitView
                  attributionPosition="bottom-left"
                >
                  <Controls />
                  <Background gap={16} size={1} />
                </ReactFlow>
              </Card>
            ) : (
              <EmptyState
                icon={<GitBranch className="w-8 h-8 text-gray-400" />}
                title="No manual connections"
                description="Add manual lineage connections between registered assets"
                action={<button onClick={() => setIsManualModalOpen(true)} className="btn-primary">Add Connection</button>}
              />
            )}
          </div>
        )}

        {/* Legend */}
        <div className="mt-4 flex items-center gap-6 text-sm text-gray-500">
          <span className="font-medium">Legend:</span>
          {Object.entries(typeColors).map(([type, color]) => (
            <div key={type} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: color }} />
              {type}
            </div>
          ))}
        </div>

        <DbtUploadModal isOpen={isUploadModalOpen} onClose={() => setIsUploadModalOpen(false)} />
        {activeTab === 'manual' && (
          <ManualLineageModal isOpen={isManualModalOpen} onClose={() => setIsManualModalOpen(false)} assets={assets || []} />
        )}
      </div>
    </div>
  );
}

function buildDbtGraph(data: DbtLineageData, selectedId: string | null) {
  const levels: Record<string, number> = {};

  // Find roots
  const hasIncoming = new Set(data.edges.map(e => e.target));
  data.nodes.forEach(n => { if (!hasIncoming.has(n.id)) levels[n.id] = 0; });

  let changed = true;
  let iter = 0;
  while (changed && iter < 100) {
    changed = false;
    iter++;
    for (const edge of data.edges) {
      if (levels[edge.source] !== undefined && levels[edge.target] === undefined) {
        levels[edge.target] = levels[edge.source] + 1;
        changed = true;
      }
    }
  }
  data.nodes.forEach(n => { if (levels[n.id] === undefined) levels[n.id] = 0; });

  const levelCounts: Record<number, number> = {};
  const nodes: Node[] = data.nodes.map(n => {
    const level = levels[n.id] || 0;
    const count = levelCounts[level] || 0;
    levelCounts[level] = count + 1;
    return {
      id: n.id,
      type: 'dbt',
      position: { x: level * 300, y: count * 80 },
      data: { label: n.name, type: n.resourceType, schema: n.schema, selected: n.id === selectedId },
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
    };
  });

  const edges: Edge[] = data.edges.map(e => ({
    id: e.id,
    source: e.source,
    target: e.target,
    markerEnd: { type: MarkerType.ArrowClosed, color: '#9ca3af' },
    style: {
      stroke: (e.source === selectedId || e.target === selectedId) ? '#7c3aed' : '#d1d5db',
      strokeWidth: (e.source === selectedId || e.target === selectedId) ? 2.5 : 1.5,
    },
    animated: e.source === selectedId || e.target === selectedId,
  }));

  return { nodes, edges };
}

function buildManualGraph(assets: DataAsset[], lineage: any[]) {
  const connected = new Set<string>();
  lineage.forEach(e => { connected.add(e.sourceAssetId); connected.add(e.targetAssetId); });
  const filteredAssets = assets.filter(a => connected.has(a.id));

  const levels: Record<string, number> = {};
  const sources = new Set(lineage.map(e => e.sourceAssetId));
  const targets = new Set(lineage.map(e => e.targetAssetId));

  filteredAssets.forEach(a => { if (sources.has(a.id) && !targets.has(a.id)) levels[a.id] = 0; });

  let changed = true;
  while (changed) {
    changed = false;
    lineage.forEach(e => {
      if (levels[e.sourceAssetId] !== undefined && levels[e.targetAssetId] === undefined) {
        levels[e.targetAssetId] = levels[e.sourceAssetId] + 1;
        changed = true;
      }
    });
  }
  filteredAssets.forEach(a => { if (levels[a.id] === undefined) levels[a.id] = 0; });

  const levelCounts: Record<number, number> = {};
  const nodes: Node[] = filteredAssets.map(a => {
    const level = levels[a.id] || 0;
    const count = levelCounts[level] || 0;
    levelCounts[level] = count + 1;
    return {
      id: a.id,
      type: 'dbt',
      position: { x: level * 300, y: count * 80 },
      data: { label: a.name, type: a.type },
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
    };
  });

  const edges: Edge[] = lineage.map(e => ({
    id: e.id,
    source: e.sourceAssetId,
    target: e.targetAssetId,
    label: e.transformationType,
    labelStyle: { fontSize: 10, fill: '#6b7280' },
    labelBgStyle: { fill: '#fff', fillOpacity: 0.9 },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#9ca3af' },
    style: { stroke: '#d1d5db', strokeWidth: 1.5 },
  }));

  return { nodes, edges };
}

function DbtUploadModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const manifestRef = useRef<HTMLInputElement>(null);
  const catalogRef = useRef<HTMLInputElement>(null);
  const [manifestFile, setManifestFile] = useState<File | null>(null);
  const [catalogFile, setCatalogFile] = useState<File | null>(null);
  const [result, setResult] = useState<{ message: string; stats: DbtLineageData['stats'] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const queryClient = useQueryClient();

  const uploadMutation = useMutation({
    mutationFn: () => dbtApi.uploadFiles(manifestFile!, catalogFile || undefined),
    onSuccess: (data) => {
      setResult(data);
      queryClient.invalidateQueries({ queryKey: ['dbt-lineage-stats'] });
      queryClient.invalidateQueries({ queryKey: ['dbt-nodes'] });
      queryClient.invalidateQueries({ queryKey: ['dbt-lineage-focused'] });
    },
    onError: (err: any) => {
      setError(err.response?.data?.error || err.message || 'Upload failed');
    },
  });

  const handleUpload = () => {
    if (!manifestFile) { setError('manifest.json is required'); return; }
    setError(null);
    uploadMutation.mutate();
  };

  const handleClose = () => {
    setManifestFile(null); setCatalogFile(null); setResult(null); setError(null); onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Upload dbt JSON Files" size="lg">
      <div className="space-y-5">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-blue-800 mb-2">dbt Docs Files</h4>
          <p className="text-sm text-blue-700">
            Upload <code className="bg-blue-100 px-1 rounded">manifest.json</code> (required) and
            <code className="bg-blue-100 px-1 rounded ml-1">catalog.json</code> (optional) generated
            by <code className="bg-blue-100 px-1 rounded">dbt docs generate</code>.
          </p>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">manifest.json *</label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer" onClick={() => manifestRef.current?.click()}>
              <input ref={manifestRef} type="file" accept=".json" className="hidden" onChange={(e) => { setManifestFile(e.target.files?.[0] || null); setResult(null); setError(null); }} />
              <FileJson className="w-8 h-8 mx-auto mb-1 text-gray-400" />
              <p className="text-sm">{manifestFile ? <span className="font-medium text-colibri-600">{manifestFile.name}</span> : <span className="text-gray-500">Click to select manifest.json</span>}</p>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">catalog.json (optional)</label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer" onClick={() => catalogRef.current?.click()}>
              <input ref={catalogRef} type="file" accept=".json" className="hidden" onChange={(e) => { setCatalogFile(e.target.files?.[0] || null); setResult(null); }} />
              <FileJson className="w-8 h-8 mx-auto mb-1 text-gray-400" />
              <p className="text-sm">{catalogFile ? <span className="font-medium text-colibri-600">{catalogFile.name}</span> : <span className="text-gray-500">Click to select catalog.json</span>}</p>
            </div>
          </div>
        </div>

        {error && <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg flex items-center gap-2"><XCircle className="w-5 h-5 flex-shrink-0" /> {error}</div>}

        {result && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2"><CheckCircle className="w-5 h-5 text-green-600" /><span className="text-sm font-medium text-green-800">Upload successful!</span></div>
            <div className="grid grid-cols-4 gap-3 text-sm">
              <div><span className="text-gray-500">Models:</span> <strong>{result.stats.totalModels}</strong></div>
              <div><span className="text-gray-500">Sources:</span> <strong>{result.stats.totalSources}</strong></div>
              <div><span className="text-gray-500">Seeds:</span> <strong>{result.stats.totalSeeds}</strong></div>
              <div><span className="text-gray-500">Edges:</span> <strong>{result.stats.totalEdges}</strong></div>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={handleClose} className="btn-secondary">{result ? 'Done' : 'Cancel'}</button>
          {!result && (
            <button onClick={handleUpload} className="btn-primary flex items-center gap-2" disabled={!manifestFile || uploadMutation.isPending}>
              {uploadMutation.isPending ? (<><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Processing...</>) : (<><Upload className="w-4 h-4" /> Upload &amp; Process</>)}
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}

function ManualLineageModal({ isOpen, onClose, assets }: { isOpen: boolean; onClose: () => void; assets: DataAsset[] }) {
  const [formData, setFormData] = useState({ sourceAssetId: '', targetAssetId: '', transformationType: '', description: '' });
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: lineageApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lineage'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      onClose();
      setFormData({ sourceAssetId: '', targetAssetId: '', transformationType: '', description: '' });
    },
  });

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Manual Lineage Connection">
      <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(formData); }} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Source Asset *</label>
          <select value={formData.sourceAssetId} onChange={(e) => setFormData({ ...formData, sourceAssetId: e.target.value })} className="input" required>
            <option value="">Select source asset</option>
            {assets.map(a => <option key={a.id} value={a.id}>{a.name} ({a.type})</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Target Asset *</label>
          <select value={formData.targetAssetId} onChange={(e) => setFormData({ ...formData, targetAssetId: e.target.value })} className="input" required>
            <option value="">Select target asset</option>
            {assets.filter(a => a.id !== formData.sourceAssetId).map(a => <option key={a.id} value={a.id}>{a.name} ({a.type})</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Transformation Type</label>
          <select value={formData.transformationType} onChange={(e) => setFormData({ ...formData, transformationType: e.target.value })} className="input">
            <option value="">Select type</option>
            <option value="ETL">ETL</option><option value="Aggregation">Aggregation</option><option value="Join">Join</option>
            <option value="Filter">Filter</option><option value="dbt Model">dbt Model</option><option value="Copy">Copy</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="input" rows={2} />
        </div>
        <div className="flex justify-end gap-3 pt-4">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button type="submit" className="btn-primary" disabled={createMutation.isPending}>{createMutation.isPending ? 'Creating...' : 'Add Connection'}</button>
        </div>
      </form>
    </Modal>
  );
}
