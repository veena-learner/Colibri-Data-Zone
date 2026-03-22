import { useQuery } from '@tanstack/react-query';
import { Database, FolderTree, BookOpen, GitBranch, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Header } from '../components/Layout/Header';
import { StatCard, Card } from '../components/ui/Card';
import { SensitivityBadge, AssetTypeBadge } from '../components/ui/Badge';
import { PageLoading } from '../components/ui/Loading';
import { statsApi } from '../services/api';
import type { DashboardStats } from '../types';

export function DashboardPage() {
  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ['dashboard-stats'],
    queryFn: statsApi.getDashboard,
  });

  if (isLoading) return <PageLoading />;

  return (
    <div>
      <Header
        title="Dashboard"
        subtitle="Overview of your data catalog and governance"
      />

      <div className="p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Data Assets"
            value={stats?.counts.assets || 0}
            icon={<Database className="w-6 h-6 text-colibri-600" />}
          />
          <StatCard
            title="Domains"
            value={stats?.counts.domains || 0}
            icon={<FolderTree className="w-6 h-6 text-colibri-600" />}
          />
          <StatCard
            title="Glossary Terms"
            value={stats?.counts.glossaryTerms || 0}
            icon={<BookOpen className="w-6 h-6 text-colibri-600" />}
          />
          <StatCard
            title="Lineage Connections"
            value={stats?.counts.lineageEdges || 0}
            icon={<GitBranch className="w-6 h-6 text-colibri-600" />}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Assets by Sensitivity</h3>
            </div>
            <div className="space-y-3">
              {stats?.distributions.sensitivity &&
                Object.entries(stats.distributions.sensitivity).map(([level, count]) => (
                  <div key={level} className="flex items-center justify-between">
                    <SensitivityBadge level={level as any} />
                    <div className="flex items-center gap-3">
                      <div className="w-32 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-colibri-500 rounded-full"
                          style={{
                            width: `${(count / (stats?.counts.assets || 1)) * 100}%`,
                          }}
                        />
                      </div>
                      <span className="text-sm text-gray-600 w-8">{count}</span>
                    </div>
                  </div>
                ))}
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Assets by Type</h3>
            </div>
            <div className="space-y-3">
              {stats?.distributions.type &&
                Object.entries(stats.distributions.type).map(([type, count]) => (
                  <div key={type} className="flex items-center justify-between">
                    <AssetTypeBadge type={type as any} />
                    <div className="flex items-center gap-3">
                      <div className="w-32 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary-500 rounded-full"
                          style={{
                            width: `${(count / (stats?.counts.assets || 1)) * 100}%`,
                          }}
                        />
                      </div>
                      <span className="text-sm text-gray-600 w-8">{count}</span>
                    </div>
                  </div>
                ))}
            </div>
          </Card>
        </div>

        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Recent Assets</h3>
            <Link
              to="/assets"
              className="text-sm text-colibri-600 hover:text-colibri-700 flex items-center gap-1"
            >
              View all <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="divide-y divide-gray-100">
            {stats?.recentAssets?.map((asset) => (
              <Link
                key={asset.id}
                to={`/assets/${asset.id}`}
                className="flex items-center justify-between py-3 hover:bg-gray-50 -mx-2 px-2 rounded-lg transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                    <Database className="w-5 h-5 text-gray-500" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{asset.name}</p>
                    <p className="text-sm text-gray-500 truncate max-w-xs">
                      {asset.description}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <AssetTypeBadge type={asset.type} />
                  <SensitivityBadge level={asset.sensitivity} />
                </div>
              </Link>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
