import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { useSidebar } from '../../contexts/SidebarContext';

export function MainLayout() {
  const { collapsed } = useSidebar();

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <main
        className={`transition-[margin] duration-200 ease-out ${
          collapsed ? 'ml-[72px]' : 'ml-64'
        }`}
      >
        <Outlet />
      </main>
    </div>
  );
}
