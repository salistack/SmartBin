import { Route, Routes, Navigate } from 'react-router-dom';
import './App.css';
import Login from './pages/Login';
import Register from './pages/Register';

import Layout from './components/Layout';
import PrivateRoute from './components/PrivateRoute';
import UserDashboard from './pages/UserDashboard';
import CollectorDashboard from './pages/CollectorDashboard';
import { getAuth } from './api/client';

function RoleRoute({ role, children }) {
  const { user } = getAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== role) return <Navigate to="/dashboard" replace />;
  return children;
}

function DashboardRedirect() {
  const { user } = getAuth();
  if (!user) return <Navigate to="/login" replace />;
  const path = user.role === 'collector' ? '/dashboard/collector' : '/dashboard/user';
  return <Navigate to={path} replace />;
}

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Navigate to="/login" />} />
        <Route path="/login" element={<Login />} />
    <Route path="/register" element={<Register />} />
    {/* Generic /dashboard now redirects based on role */}
    <Route path="/dashboard" element={<PrivateRoute><DashboardRedirect /></PrivateRoute>} />
  {/* Role-specific dashboards */}
  <Route path="/dashboard/user" element={<PrivateRoute><RoleRoute role="resident"><UserDashboard /></RoleRoute></PrivateRoute>} />
  <Route path="/dashboard/collector" element={<PrivateRoute><RoleRoute role="collector"><CollectorDashboard /></RoleRoute></PrivateRoute>} />
        <Route path="*" element={<div style={{ padding: '2rem' }}>Not Found</div>} />
      </Routes>
    </Layout>
  );
}

