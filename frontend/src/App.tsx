import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { MainLayout } from './components/Layout/MainLayout';
import { LoginPage } from './pages/Login';
import { DashboardPage } from './pages/Dashboard';
import { SourceTablesPage } from './pages/SourceTables';
import { AssetsPage } from './pages/Assets';
import { AssetDetailPage } from './pages/AssetDetail';
import { DomainsPage } from './pages/Domains';
import { GlossaryPage } from './pages/Glossary';
import { OntologyPage } from './pages/Ontology';
import { LineagePage } from './pages/Lineage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
}

function App() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return (
    <Routes>
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />}
      />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="source-tables" element={<SourceTablesPage />} />
        <Route path="assets" element={<AssetsPage />} />
        <Route path="assets/:id" element={<AssetDetailPage />} />
        <Route path="domains" element={<DomainsPage />} />
        <Route path="glossary" element={<GlossaryPage />} />
        <Route path="ontology" element={<OntologyPage />} />
        <Route path="lineage" element={<LineagePage />} />
      </Route>
    </Routes>
  );
}

export default App;
