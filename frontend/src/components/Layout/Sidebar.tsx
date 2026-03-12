import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Database,
  FolderTree,
  BookOpen,
  GitBranch,
  LogOut,
  Table2,
  Layers,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/source-tables', icon: Table2, label: 'Source Tables' },
  { to: '/assets', icon: Database, label: 'Data Catalog' },
  { to: '/domains', icon: FolderTree, label: 'Domains' },
  { to: '/glossary', icon: BookOpen, label: 'Glossary' },
  { to: '/ontology', icon: Layers, label: 'Ontology' },
  { to: '/lineage', icon: GitBranch, label: 'Lineage' },
];

export function Sidebar() {
  const { user, logout } = useAuthStore();

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-white border-r border-gray-200 flex flex-col">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-colibri-500 to-primary-500 flex items-center justify-center">
            <span className="text-white font-bold text-lg">C</span>
          </div>
          <div>
            <h1 className="font-bold text-gray-900">Colibri</h1>
            <p className="text-xs text-gray-500">Data Zone</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                isActive
                  ? 'bg-colibri-50 text-colibri-700 font-medium'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`
            }
          >
            <Icon className="w-5 h-5" />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-colibri-100 flex items-center justify-center">
            <span className="text-colibri-700 font-medium">
              {user?.name?.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{user?.name}</p>
            <p className="text-xs text-gray-500 truncate">{user?.role}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
