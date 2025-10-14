import { Link } from 'react-router-dom';
import { getAuth, clearAuth } from '../api/client';

export default function Dashboard() {
  const { user } = getAuth();
  return (
    <div style={{ maxWidth: 720, margin: '3rem auto', padding: '1rem' }}>
      <h2>Dashboard</h2>
      <p>Welcome {user?.name || user?.email || 'there'}.</p>
      <div style={{ marginTop: '1rem' }}>
        <button onClick={() => { clearAuth(); location.href = '/login'; }}>Logout</button>
      </div>
      <p style={{ marginTop: '1rem' }}>
        Go to <Link to="/login">Login</Link> or <Link to="/register">Register</Link>
      </p>
    </div>
  );
}
