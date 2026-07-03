import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import UploadPage from './pages/UploadPage.jsx';
import ReviewPage from './pages/ReviewPage.jsx';
import AdminPage from './pages/AdminPage.jsx';
import { LayoutGrid, Upload, ShieldAlert, LogOut, Leaf, User } from 'lucide-react';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', backgroundColor: '#0b0f19', color: '#10b981' }}>
        <h2>Loading Zero Carbon System...</h2>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return children;
};

const AdminRoute = ({ children }) => {
  const { user, loading, isAdmin } = useAuth();
  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', backgroundColor: '#0b0f19', color: '#10b981' }}>
        <h2>Loading Security Config...</h2>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/" replace />;
  return children;
};

// Sidebar Layout Wrapper
const AppLayout = ({ children }) => {
  const { user, logout, isAdmin } = useAuth();
  const location = useLocation();

  const isLinkActive = (path) => location.pathname === path;

  return (
    <div className="app-container">
      {/* ─── Premium Sustainability Sidebar ─── */}
      <aside className="sidebar">
        {/* Branding Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '40px', padding: '0 8px' }}>
          <Leaf size={24} color="#10b981" />
          <span style={{ fontSize: '1.25rem', fontWeight: 700, letterSpacing: '-0.02em', color: '#fff' }}>
            Zero Carbon
            <span style={{ color: '#10b981' }}> One</span>
          </span>
        </div>

        {/* Navigation Items */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
          <Link
            to="/"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px 16px',
              borderRadius: '8px',
              color: isLinkActive('/') ? '#10b981' : '#9ca3af',
              backgroundColor: isLinkActive('/') ? 'rgba(16, 185, 129, 0.08)' : 'transparent',
              borderLeft: isLinkActive('/') ? '3px solid #10b981' : '3px solid transparent',
              textDecoration: 'none',
              fontWeight: 500,
              transition: 'all 0.2s ease'
            }}
          >
            <LayoutGrid size={18} />
            <span>Dashboard</span>
          </Link>

          <Link
            to="/upload"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px 16px',
              borderRadius: '8px',
              color: isLinkActive('/upload') ? '#10b981' : '#9ca3af',
              backgroundColor: isLinkActive('/upload') ? 'rgba(16, 185, 129, 0.08)' : 'transparent',
              borderLeft: isLinkActive('/upload') ? '3px solid #10b981' : '3px solid transparent',
              textDecoration: 'none',
              fontWeight: 500,
              transition: 'all 0.2s ease'
            }}
          >
            <Upload size={18} />
            <span>Upload Bills</span>
          </Link>

          {isAdmin && (
            <Link
              to="/admin"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 16px',
                borderRadius: '8px',
                color: isLinkActive('/admin') ? '#10b981' : '#9ca3af',
                backgroundColor: isLinkActive('/admin') ? 'rgba(16, 185, 129, 0.08)' : 'transparent',
                borderLeft: isLinkActive('/admin') ? '3px solid #10b981' : '3px solid transparent',
                textDecoration: 'none',
                fontWeight: 500,
                transition: 'all 0.2s ease'
              }}
            >
              <ShieldAlert size={18} />
              <span>Admin Audit</span>
            </Link>
          )}
        </nav>

        {/* User Footer Profile & Logout */}
        <div style={{
          borderTop: '1px solid var(--panel-border)',
          paddingTop: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '0 8px' }}>
            <div style={{
              background: 'rgba(255, 255, 255, 0.05)',
              padding: '8px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid var(--panel-border)'
            }}>
              <User size={18} color="#9ca3af" />
            </div>
            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: '0.9rem', color: '#fff', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.name}</p>
              <p style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 500, textTransform: 'uppercase' }}>{user?.role}</p>
            </div>
          </div>

          <button
            onClick={logout}
            className="btn btn-secondary"
            style={{ width: '100%', padding: '10px', fontSize: '0.85rem' }}
          >
            <LogOut size={16} /> Sign Out
          </button>
        </div>
      </aside>
      <main className="main-content">{children}</main>
    </div>
  );
};

export const App = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route path="/" element={
            <ProtectedRoute>
              <AppLayout>
                <Dashboard />
              </AppLayout>
            </ProtectedRoute>
          } />

          <Route path="/upload" element={
            <ProtectedRoute>
              <AppLayout>
                <UploadPage />
              </AppLayout>
            </ProtectedRoute>
          } />

          <Route path="/review/:id" element={
            <ProtectedRoute>
              <AppLayout>
                <ReviewPage />
              </AppLayout>
            </ProtectedRoute>
          } />

          <Route path="/admin" element={
            <AdminRoute>
              <AppLayout>
                <AdminPage />
              </AppLayout>
            </AdminRoute>
          } />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
