import { Navigate } from 'react-router-dom';

import { getAuth } from '../api/client';

export default function PrivateRoute({ children }) {
  const { token } = getAuth();
  if (!token) return <Navigate to="/login" replace />;
  return children;
}
