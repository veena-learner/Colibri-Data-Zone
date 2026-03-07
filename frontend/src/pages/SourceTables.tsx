import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Search,
  Database,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Table2,
} from 'lucide-react';
import { Header } from '../components/Layout/Header';
import { Card } from '../components/ui/Card';
import { SensitivityBadge } from '../components/ui/Badge';
import { PageLoading } from '../components/ui/Loading';
import { EmptyState } from '../components/ui/EmptyState';
import { sourceTablesApi, domainsApi, usersApi } from '../services/api';
import type { DataAsset, IngestionStatus } from '../types';

const INGESTION_STATUSES: IngestionStatus[] = ['Pending', 'InProgress', 'DBTReady', 'Completed', 'Failed'];
const SOURCE_SYSTEMS = ['ColibriLMS', 'Salesforce', 'NetSuite', 'HubSpot', 'Zendesk', 'ColibriPlatform'];

const ingestionStatusStyles: Record<string, string> = {
  Pending: 'bg-gray-100 text-gray-700',
  InProgress: 'bg-blue-100 text-blue-700',
  DBTReady: 'bg-amber-100 text-amber-700',
  Completed: 'bg-green-100 text-green-700',
  Failed: 'bg-red-100 text-red-700',
};

function IngestionStatusBadge({ status }: { status?: string }) {
  const s = status || 'Pending';
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${ingestionStatusStyles[s] || ingestionStatusStyles.Pending}`}>
      {s === 'InProgress' ? 'In Progress' : s === 'DBTReady' ? 'DBT Ready' : s}
    </span>
  );
}

export function SourceTablesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDomain, setFilterDomain] = useState('');
  const [filterSourceSystem, setFilterSourceSystem] = useState('');
  const [filterIngestionStatus, setFilterIngestionStatus] = useState('');
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const { data: sourceTables, isLoading } = useQuery({
    queryKey: ['source-tables'],
    queryFn: () => sourceTablesApi.list(),
  });

  const { data: domains } = useQuery({
    queryKey: ['domains'],
    queryFn: domainsApi.list,
  });

  const { data: users } = useQuery({
    queryKey: ['users'],
    queryFn: usersApi.list,
  });

  const getDomainName = (domainId: string) =>
    domains?.find((d) => d.id === domainId)?.name || 'Unknown';

  const getUserName = (userId?: string) => {
    if (!userId) return 'Not Assigned';
    return users?.find((u) => u.id === userId)?.name || userId;
  };

  const getUserEmail = (userId?: string) => {
    if (!userId) return '';
    return users?.find((u) => u.id === userId)?.email || '';
  };

  const filtered = sourceTables?.filter((table) => {
    if (filterDomain && table.domainId !== filterDomain) return false;
    if (filterSourceSystem && table.sourceSystem !== filterSourceSystem) return false;
    if (filterIngestionStatus && table.ingestionStatus !== filterIngestionStatus) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        table.name.toLowerCase().includes(q) ||
        table.description.toLowerCase().includes(q) ||
        table.sourceTableName?.toLowerCase().includes(q) ||
        getDomainName(table.domainId).toLowerCase().includes(q)
      );
    }
    return true;
  });

  const statusCounts = sourceTables?.reduce((acc, t) => {
    const s = t.ingestionStatus || 'Pending';
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  const sourceSystemCounts = sourceTables?.reduce((acc, t) => {
    const s = t.sourceSystem || 'Unknown';
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  if (isLoading) return <PageLoading />;

  return (
    <div>
      <Header
        title="Source Table Catalog"
        subtitle="OLTP source tables for Data Engineering ingestion into Redshift"
      />

      <div className="p-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          {INGESTION_STATUSES.map((status) => (
            <Card key={status} className="text-center cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setFilterIngestionStatus(filterIngestionStatus === status ? '' : status)}>
              <p className="text-2xl font-bold text-gray-900">{statusCounts[status] || 0}</p>
              <p className="text-sm text-gray-500 mt-1">
                <IngestionStatusBadge status={status} />
              </p>
            </Card>
          ))}
        </div>

        {/* Source System Summary */}
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-6">
          {SOURCE_SYSTEMS.map((sys) => (
            <button
              key={sys}
              onClick={() => setFilterSourceSystem(filterSourceSystem === sys ? '' : sys)}
              className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                filterSourceSystem === sys
                  ? 'bg-colibri-50 border-colibri-300 text-colibri-700'
                  : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {sys}
              <span className="ml-1 text-xs text-gray-400">({sourceSystemCounts[sys] || 0})</span>
            </button>
          ))}
        </div>

        {/* Filters Bar */}
        <div className="flex items-center gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search source tables..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-colibri-500"
            />
          </div>

          <select
            value={filterDomain}
            onChange={(e) => setFilterDomain(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-colibri-500"
          >
            <option value="">All Domains</option>
            {domains?.map((domain) => (
              <option key={domain.id} value={domain.id}>{domain.name}</option>
            ))}
          </select>

          <select
            value={filterIngestionStatus}
            onChange={(e) => setFilterIngestionStatus(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-colibri-500"
          >
            <option value="">All Statuses</option>
            {INGESTION_STATUSES.map((s) => (
              <option key={s} value={s}>{s === 'InProgress' ? 'In Progress' : s === 'DBTReady' ? 'DBT Ready' : s}</option>
            ))}
          </select>

          {(filterDomain || filterSourceSystem || filterIngestionStatus || searchQuery) && (
            <button
              onClick={() => { setFilterDomain(''); setFilterSourceSystem(''); setFilterIngestionStatus(''); setSearchQuery(''); }}
              className="text-sm text-colibri-600 hover:text-colibri-700"
            >
              Clear filters
            </button>
          )}

          <div className="ml-auto text-sm text-gray-500">
            {filtered?.length || 0} of {sourceTables?.length || 0} tables
          </div>
        </div>

        {/* Source Tables Table */}
        {!filtered || filtered.length === 0 ? (
          <EmptyState
            icon={<Table2 className="w-8 h-8 text-gray-400" />}
            title="No source tables found"
            description="Adjust your filters or search criteria"
          />
        ) : (
          <Card className="overflow-hidden p-0">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="w-8 px-3 py-3" />
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Source Table</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Domain</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Source System</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Domain Owner</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Data Steward</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Sensitivity</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Ingestion Status</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Target Redshift</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((table) => (
                  <SourceTableRow
                    key={table.id}
                    table={table}
                    domainName={getDomainName(table.domainId)}
                    ownerName={getUserName(table.dataOwnerId)}
                    ownerEmail={getUserEmail(table.dataOwnerId)}
                    stewardName={getUserName(table.dataStewardId)}
                    stewardEmail={getUserEmail(table.dataStewardId)}
                    isExpanded={expandedRow === table.id}
                    onToggle={() => setExpandedRow(expandedRow === table.id ? null : table.id)}
                  />
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </div>
    </div>
  );
}

function SourceTableRow({
  table,
  domainName,
  ownerName,
  ownerEmail,
  stewardName,
  stewardEmail,
  isExpanded,
  onToggle,
}: {
  table: DataAsset;
  domainName: string;
  ownerName: string;
  ownerEmail: string;
  stewardName: string;
  stewardEmail: string;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const targetCount = table.targetRedshiftTables?.length || 0;

  return (
    <>
      <tr className="hover:bg-gray-50 cursor-pointer" onClick={onToggle}>
        <td className="px-3 py-3 text-gray-400">
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </td>
        <td className="px-4 py-3">
          <Link
            to={`/assets/${table.id}`}
            onClick={(e) => e.stopPropagation()}
            className="font-medium text-gray-900 hover:text-colibri-600"
          >
            {table.name}
          </Link>
          <p className="text-xs text-gray-400 font-mono mt-0.5">{table.sourceTableName}</p>
        </td>
        <td className="px-4 py-3">
          <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-colibri-50 text-colibri-700">
            {domainName}
          </span>
        </td>
        <td className="px-4 py-3 text-sm text-gray-600">{table.sourceSystem}</td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
              <span className="text-xs font-medium text-blue-700">{ownerName.charAt(0)}</span>
            </div>
            <div>
              <p className="text-sm text-gray-900">{ownerName}</p>
              <p className="text-xs text-gray-400">{ownerEmail}</p>
            </div>
          </div>
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center">
              <span className="text-xs font-medium text-purple-700">{stewardName.charAt(0)}</span>
            </div>
            <div>
              <p className="text-sm text-gray-900">{stewardName}</p>
              <p className="text-xs text-gray-400">{stewardEmail}</p>
            </div>
          </div>
        </td>
        <td className="px-4 py-3">
          <SensitivityBadge level={table.sensitivity} />
        </td>
        <td className="px-4 py-3">
          <IngestionStatusBadge status={table.ingestionStatus} />
        </td>
        <td className="px-4 py-3">
          {targetCount > 0 ? (
            <span className="text-sm text-gray-600">
              {targetCount} table{targetCount > 1 ? 's' : ''}
            </span>
          ) : (
            <span className="text-sm text-gray-400 italic">Unmapped</span>
          )}
        </td>
      </tr>
      {isExpanded && (
        <tr>
          <td colSpan={9} className="px-0 py-0">
            <div className="bg-gray-50 border-t border-b border-gray-200 px-8 py-5">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Description & Details */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">Description</h4>
                  <p className="text-sm text-gray-600 mb-4">{table.description}</p>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Source Location</span>
                      <p className="font-mono text-gray-800 mt-0.5">{table.location}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Source System</span>
                      <p className="text-gray-800 mt-0.5">{table.sourceSystem}</p>
                    </div>
                  </div>
                </div>

                {/* Target Redshift Mapping */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">
                    Target Redshift Table Mapping
                  </h4>
                  {table.targetRedshiftTables && table.targetRedshiftTables.length > 0 ? (
                    <div className="space-y-3">
                      {table.targetRedshiftTables.map((target, idx) => (
                        <div key={idx} className="bg-white rounded-lg p-3 border border-gray-200">
                          <div className="flex items-center gap-2 mb-2">
                            <Database className="w-4 h-4 text-purple-500" />
                            <span className="font-mono text-sm font-medium text-gray-900">
                              {target.targetSchema}.{target.targetTableName}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <div className="flex items-center gap-1">
                              <ArrowRight className="w-3 h-3" />
                              <span>Schema: <span className="font-medium text-gray-700">{target.targetSchema}</span></span>
                            </div>
                            {target.dbtModelName && (
                              <div className="flex items-center gap-1">
                                <span className="px-1.5 py-0.5 bg-amber-50 text-amber-700 rounded font-mono">
                                  dbt: {target.dbtModelName}
                                </span>
                              </div>
                            )}
                          </div>
                          {target.transformationNotes && (
                            <p className="text-xs text-gray-500 mt-1">{target.transformationNotes}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400 italic">No target tables mapped yet</p>
                  )}
                </div>
              </div>

              {/* Data Flow Visualization */}
              <div className="mt-4 pt-4 border-t border-gray-200">
                <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Data Flow</h4>
                <div className="flex items-center gap-3 text-sm">
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-200">
                    <Database className="w-4 h-4" />
                    <span className="font-medium">{table.sourceSystem}</span>
                    <span className="text-xs text-emerald-500">OLTP</span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-400" />
                  <div className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg border border-blue-200 text-xs font-medium">
                    Fivetran / Ingestion
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-400" />
                  <div className="px-3 py-1.5 bg-amber-50 text-amber-700 rounded-lg border border-amber-200 text-xs font-medium">
                    DBT Transform
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-400" />
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-50 text-purple-700 rounded-lg border border-purple-200">
                    <Database className="w-4 h-4" />
                    <span className="font-medium">Redshift</span>
                    <span className="text-xs text-purple-500">Target</span>
                  </div>
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
