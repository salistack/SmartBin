import { Link, useLocation } from 'react-router-dom';

import { getAuth } from '../api/client';

export default function Layout({ children }) {
  const { user } = getAuth();
  const location = useLocation();
  const path = location.pathname || '';
  const hideNav = ['/login', '/register'].includes(path)
    || path.startsWith('/dashboard/user')
    || path.startsWith('/dashboard/collector')
    || path.startsWith('/dashboard/admin');
  return (
    <div className="min-h-screen bg-white text-gray-900">
      {!hideNav && (
        <nav className="border-b">
          <div className="max-w-6xl mx-auto px-4">
            <div className="h-14 flex items-center gap-4">
              <Link to="/" className="text-emerald-700 font-semibold">SmartBin</Link>
              <Link to="/login" className="text-gray-700 hover:text-emerald-700">Login</Link>
              <Link to="/register" className="text-gray-700 hover:text-emerald-700">Register</Link>
              {user && (
                <>
                  <Link to="/dashboard" className="text-gray-700 hover:text-emerald-700">Dashboard</Link>
                  {user.role === 'resident' && (
                    <Link to="/dashboard/user" className="text-gray-700 hover:text-emerald-700">User Panel</Link>
                  )}
                  {user.role === 'collector' && (
                    <Link to="/dashboard/collector" className="text-gray-700 hover:text-emerald-700">Collector Panel</Link>
                  )}
                </>
              )}
              <div className="ml-auto text-sm text-gray-500">{user ? `Hi, ${user.name || user.email}` : 'Guest'}</div>
            </div>
          </div>
        </nav>
      )}
      <main className="max-w-6xl mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  );
}
