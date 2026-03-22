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
  PanelLeftClose,
  PanelLeft,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useSidebar } from '../../contexts/SidebarContext';

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
  const { collapsed, toggle } = useSidebar();

  return (
    <aside
      className={`fixed left-0 top-0 z-40 h-screen bg-white border-r border-gray-200 flex flex-col transition-[width] duration-200 ease-out ${
        collapsed ? 'w-[72px]' : 'w-64'
      }`}
    >
      <div className={`p-4 border-b border-gray-200 flex items-center ${collapsed ? 'justify-center flex-col gap-2' : 'justify-between'}`}>
        <div className={`flex items-center gap-3 ${collapsed ? 'flex-col' : 'min-w-0 flex-1'}`}>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-colibri-500 to-primary-500 flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-lg">C</span>
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <h1 className="font-bold text-gray-900 truncate">Colibri</h1>
              <p className="text-xs text-gray-500">Data Zone</p>
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={toggle}
          className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-800 transition-colors"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <PanelLeft className="w-5 h-5" /> : <PanelLeftClose className="w-5 h-5" />}
        </button>
      </div>

      <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            title={collapsed ? label : undefined}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg transition-colors ${
                collapsed ? 'justify-center px-2 py-3' : 'px-4 py-3'
              } ${
                isActive
                  ? 'bg-colibri-50 text-colibri-700 font-medium'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`
            }
          >
            <Icon className="w-5 h-5 flex-shrink-0" />
            {!collapsed && <span className="truncate">{label}</span>}
          </NavLink>
        ))}
      </nav>

      <div className={`p-2 border-t border-gray-200 ${collapsed ? 'flex flex-col items-center' : ''}`}>
        {!collapsed && (
          <div className="flex items-center gap-3 mb-4 px-2">
            <div className="w-10 h-10 rounded-full bg-colibri-100 flex items-center justify-center flex-shrink-0">
              <span className="text-colibri-700 font-medium">
                {user?.name?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{user?.name}</p>
              <p className="text-xs text-gray-500 truncate">{user?.role}</p>
            </div>
          </div>
        )}
        {collapsed && (
          <div className="w-10 h-10 rounded-full bg-colibri-100 flex items-center justify-center mx-auto mb-2" title={user?.name}>
            <span className="text-colibri-700 font-medium text-sm">
              {user?.name?.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
        <button
          onClick={logout}
          title="Sign out"
          className={`flex items-center gap-2 w-full text-sm text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors ${
            collapsed ? 'justify-center px-2 py-2' : 'px-4 py-2'
          }`}
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          {!collapsed && <span>Sign out</span>}
        </button>
      </div>
    </aside>
  );
}
