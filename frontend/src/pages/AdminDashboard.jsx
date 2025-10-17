import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import jsPDF from 'jspdf';

import { clearAuth, getAuth } from '../api/client';

const API_BASE = (import.meta.env?.VITE_API_BASE_URL || 'http://localhost:5000').replace(/\/$/, '');
const ADMIN_DASHBOARD_ENDPOINT = `${API_BASE}/api/admin/dashboard`;
const REPORTS_ENDPOINT = `${API_BASE}/api/admin/reports`;

const lightCardStyles = {
  borderRadius: '1rem',
  padding: '1.5rem',
  background: '#ffffff',
  border: '1px solid #e5e7eb',
  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
  color: '#374151'
};

const sidebarStyles = {
  width: '250px',
  background: '#f9fafb',
  borderRight: '1px solid #e5e7eb',
  padding: '1.5rem 1rem',
  minHeight: '100vh'
};

const navItemStyles = (active) => ({
  padding: '0.75rem 1rem',
  borderRadius: '0.5rem',
  cursor: 'pointer',
  background: active ? '#10b981' : 'transparent',
  color: active ? '#ffffff' : '#374151',
  fontWeight: active ? 600 : 400,
  marginBottom: '0.5rem'
});

const chartPalette = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444'];

function DonutChart({ series = [], colors = chartPalette }) {
  const total = series.reduce((sum, value) => sum + value, 0);
  if (!total) {
    return <div style={{ color: '#6b7280', fontSize: '0.9rem' }}>No data to display.</div>;
  }
  let accumulated = 0;
  const slices = series.map((value, idx) => {
    const start = (accumulated / total) * 360;
    accumulated += value;
    const end = (accumulated / total) * 360;
    return `${colors[idx % colors.length]} ${start}deg ${end}deg`;
  });
  return (
    <div style={{ position: 'relative', width: '160px', height: '160px', borderRadius: '50%', background: `conic-gradient(${slices.join(', ')})`, display: 'grid', placeItems: 'center' }}>
      <div style={{ width: '96px', height: '96px', borderRadius: '50%', background: '#ffffff', display: 'grid', placeItems: 'center', color: '#374151' }}>
        <div style={{ textAlign: 'center', lineHeight: 1.2 }}>
          <div style={{ fontWeight: 700, fontSize: '1.25rem' }}>{total}</div>
          <div style={{ fontSize: '0.7rem', color: '#6b7280' }}>Total</div>
        </div>
      </div>
    </div>
  );
}

function LineChart({ labels = [], series = {}, colors = chartPalette }) {
  const keys = Object.keys(series || {});
  if (!labels.length || !keys.length) {
    return <div style={{ color: '#6b7280', fontSize: '0.9rem' }}>No activity recorded.</div>;
  }
  const datasets = keys.map((key) => (Array.isArray(series[key]) ? series[key] : new Array(labels.length).fill(0)));
  const flatValues = datasets.flat();
  if (!flatValues.some((value) => value > 0)) {
    return <div style={{ color: '#6b7280', fontSize: '0.9rem' }}>No activity recorded.</div>;
  }

  const maxValue = Math.max(...flatValues);
  const width = Math.max(320, labels.length * 70);
  const height = 220;
  const chartWidth = width - 80;
  const chartHeight = height - 100;
  const xStep = labels.length > 1 ? chartWidth / (labels.length - 1) : 0;

  const gridLines = [0, 0.25, 0.5, 0.75, 1].map((fraction) => {
    const y = 40 + chartHeight * (1 - fraction);
    return (
      <line
        key={`grid-${fraction}`}
        x1={40}
        y1={y}
        x2={40 + chartWidth}
        y2={y}
        stroke="#e5e7eb"
        strokeDasharray="4 6"
      />
    );
  });

  const seriesElements = keys.map((key, idx) => {
    const values = datasets[idx];
    const color = colors[idx % colors.length];
    const points = values
      .map((value, valueIdx) => {
        const x = 40 + xStep * valueIdx;
        const y = 40 + chartHeight - (value / maxValue) * chartHeight;
        return `${x},${y}`;
      })
      .join(' ');
    return (
      <g key={`series-${key}`}>
        <polyline fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" points={points} />
        {values.map((value, valueIdx) => {
          const x = 40 + xStep * valueIdx;
          const y = 40 + chartHeight - (value / maxValue) * chartHeight;
          return <circle key={`point-${key}-${valueIdx}`} cx={x} cy={y} r="4" fill={color} />;
        })}
      </g>
    );
  });

  const axisLabels = labels.map((label, idx) => {
    const x = 40 + xStep * idx;
    return (
      <text key={`label-${label}-${idx}`} x={x} y={height - 30} textAnchor="middle" fill="#6b7280" fontSize="12">
        {label}
      </text>
    );
  });

  return (
    <div style={{ overflowX: 'auto', paddingBottom: '0.5rem' }}>
      <svg width={width} height={height} style={{ borderRadius: '1rem' }}>
        {gridLines}
        {seriesElements}
        {axisLabels}
      </svg>
    </div>
  );
}

function HorizontalBars({ labels = [], series = [], colors = chartPalette }) {
  const total = series.reduce((sum, value) => sum + value, 0);
  if (!total) {
    return <div style={{ color: '#6b7280', fontSize: '0.9rem' }}>No data to display.</div>;
  }
  return (
    <div style={{ display: 'grid', gap: '0.75rem' }}>
      {labels.map((label, idx) => {
        const value = series[idx] ?? 0;
        const pct = total ? Math.round((value / total) * 100) : 0;
        return (
          <div key={`${label}-${idx}`} style={{ display: 'grid', gap: '0.4rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#374151', fontSize: '0.9rem' }}>
              <span>{label}</span>
              <span>{value} • {pct}%</span>
            </div>
            <div style={{ height: '10px', borderRadius: '999px', background: '#e5e7eb', overflow: 'hidden' }}>
              <div style={{ width: `${pct}%`, height: '100%', background: colors[idx % colors.length] }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function AdminDashboard() {
  const [activeSection, setActiveSection] = useState('dashboard');
  const [payload, setPayload] = useState(null);
  const [reportData, setReportData] = useState(null);
  const [users, setUsers] = useState([]);
  const [bins, setBins] = useState([]);
  const [collections, setCollections] = useState([]);
  const [routeForm, setRouteForm] = useState({
    area: '',
    windowStart: '',
    windowEnd: '',
    truckCapacity: '8',
    truckId: ''
  });
  const [routeResult, setRouteResult] = useState(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const { token } = getAuth();
    if (!token) {
      setError('Authentication required.');
      setLoading(false);
      return;
    }

    fetch(ADMIN_DASHBOARD_ENDPOINT, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    })
      .then(async(res) => {
        if (!res.ok) {
          const message = (await res.json().catch(() => null))?.message || 'Failed to load admin data.';
          throw new Error(message);
        }
        return res.json();
      })
      .then((data) => setPayload(data))
      .catch((err) => {
        const friendly =
          err.message && err.message.includes('Unexpected token <')
            ? 'Received HTML from the server. Ensure VITE_API_BASE_URL points to your Express backend (e.g., http://localhost:5000).'
            : err.message;
        setError(friendly || 'Unexpected error.');
      })
      .finally(() => setLoading(false));
  }, []);

  const fetchReportData = async(reportType) => {
    const { token } = getAuth();
    try {
      const res = await fetch(`${REPORTS_ENDPOINT}/${reportType}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch report data.');
      const data = await res.json();
      setReportData({ type: reportType, data });
    } catch (err) {
      setError(err.message);
    }
  };

  const generatePDF = (reportType, data) => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(`${reportType.replace(/([A-Z])/g, ' $1').toUpperCase()} REPORT`, 20, 20);
    doc.setFontSize(12);
    let y = 40;
    if (reportType === 'users') {
      data.forEach((user, idx) => {
        doc.text(`${idx + 1}. ${user.name} - ${user.email} (${user.role})`, 20, y);
        y += 10;
      });
    } else if (reportType === 'bins') {
      data.forEach((bin, idx) => {
        doc.text(`${idx + 1}. Bin ID: ${bin._id} - Status: ${bin.status || 'N/A'}`, 20, y);
        y += 10;
      });
    } else if (reportType === 'collections') {
      data.forEach((col, idx) => {
        doc.text(`${idx + 1}. Collection ID: ${col._id} - Status: ${col.status}`, 20, y);
        y += 10;
      });
    } else if (reportType === 'overview') {
      doc.text(`Total Users: ${data.totalUsers}`, 20, y);
      y += 10;
      doc.text(`Total Bins: ${data.totalBins}`, 20, y);
      y += 10;
      doc.text(`Total Collections: ${data.totalCollections}`, 20, y);
    }
    doc.save(`${reportType}-report.pdf`);
  };

  const handleRouteSubmit = async(event) => {
    event.preventDefault();
    setRouteError('');
    setRouteResult(null);

    if (!routeForm.area.trim() || !routeForm.windowStart || !routeForm.windowEnd) {
      setRouteError('Area and collection window are required.');
      return;
    }

    setRouteLoading(true);
    const { token } = getAuth();
    try {
      const res = await fetch(`${API_BASE}/api/admin/routes/optimize`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          area: routeForm.area.trim(),
          schedule: { start: routeForm.windowStart, end: routeForm.windowEnd },
          truck: {
            id: routeForm.truckId.trim() || null,
            capacity: Number(routeForm.truckCapacity) || undefined
          }
        })
      });
      if (!res.ok) {
        const message = (await res.json().catch(() => null))?.message || 'Failed to optimize route.';
        throw new Error(message);
      }
      const data = await res.json();
      setRouteResult(data);
    } catch (err) {
      setRouteError(err.message || 'Route optimization failed.');
    } finally {
      setRouteLoading(false);
    }
  };

  const metricCards = useMemo(() => {
    const metrics = payload?.metrics;
    if (!metrics) return [];
    const { users, bins, collections } = metrics;
    const roles = users?.byRole || {};
    return [
      users && {
        title: 'Total Users',
        value: users.total ?? 0,
        accent: '#10b981',
        subtitle: `Residents: ${roles.resident ?? 0} • Collectors: ${roles.collector ?? 0} • Admins: ${roles.admin ?? 0}`
      },
      users && {
        title: 'Resident Accounts',
        value: roles.resident ?? 0,
        accent: '#3b82f6',
        subtitle: 'Households connected to SmartBin'
      },
      users && {
        title: 'Collector Network',
        value: roles.collector ?? 0,
        accent: '#10b981',
        subtitle: 'Active waste collection agents'
      },
      users && {
        title: 'Admin Operators',
        value: roles.admin ?? 0,
        accent: '#f59e0b',
        subtitle: 'Supervisors maintaining operations'
      },
      bins && {
        title: 'Smart Bins',
        value: bins.total,
        accent: '#ef4444',
        subtitle: 'Monitored units in the network'
      },
      collections && {
        title: 'Collections Logged',
        value: collections.total,
        accent: '#8b5cf6',
        subtitle: 'Historical pickup records'
      }
    ].filter(Boolean);
  }, [payload]);

  const registrationChart = useMemo(() => payload?.charts?.registrations ?? null, [payload]);
  const roleChart = useMemo(() => {
    if (payload?.charts?.roleDistribution) return payload.charts.roleDistribution;
    const users = payload?.metrics?.users;
    if (!users) return null;
    const labels = Object.keys(users.byRole || {});
    return { labels, series: labels.map((label) => users.byRole?.[label] ?? 0) };
  }, [payload]);
  const collectionChart = useMemo(() => payload?.charts?.collectionStatuses ?? null, [payload]);
  const binChart = useMemo(() => payload?.charts?.binStatus ?? null, [payload]);
  const registrationLegend = useMemo(() => {
    if (!registrationChart) return [];
    return Object.entries(registrationChart.series || {}).filter(([, values]) =>
      Array.isArray(values) && values.some((value) => value > 0)
    );
  }, [registrationChart]);

  const userMetrics = useMemo(() => {
    const metrics = payload?.metrics;
    if (!metrics) return [];
    const { users } = metrics;
    const roles = users?.byRole || {};
    return [
      users && {
        title: 'Total Users',
        value: users.total ?? 0,
        accent: '#10b981',
        subtitle: `Residents: ${roles.resident ?? 0} • Collectors: ${roles.collector ?? 0} • Admins: ${roles.admin ?? 0}`
      },
      users && {
        title: 'Resident Accounts',
        value: roles.resident ?? 0,
        accent: '#3b82f6',
        subtitle: 'Households connected to SmartBin'
      },
      users && {
        title: 'Collector Network',
        value: roles.collector ?? 0,
        accent: '#10b981',
        subtitle: 'Active waste collection agents'
      },
      users && {
        title: 'Admin Operators',
        value: roles.admin ?? 0,
        accent: '#f59e0b',
        subtitle: 'Supervisors maintaining operations'
      }
    ].filter(Boolean);
  }, [payload]);

  const binMetrics = useMemo(() => {
    const metrics = payload?.metrics;
    if (!metrics) return [];
    const { bins } = metrics;
    return bins ? [
      {
        title: 'Smart Bins',
        value: bins.total,
        accent: '#ef4444',
        subtitle: 'Monitored units in the network'
      }
    ] : [];
  }, [payload]);

  const collectionMetrics = useMemo(() => {
    const metrics = payload?.metrics;
    if (!metrics) return [];
    const { collections } = metrics;
    return collections ? [
      {
        title: 'Collections Logged',
        value: collections.total,
        accent: '#8b5cf6',
        subtitle: 'Historical pickup records'
      }
    ] : [];
  }, [payload]);

  const applyManagementData = (section, list) => {
    const safeList = Array.isArray(list) ? list : [];
    if (section === 'users') setUsers(safeList);
    if (section === 'bins') setBins(safeList);
    if (section === 'collections') setCollections(safeList);
  };

  const fetchManagementData = useCallback(async(section) => {
    setError('');
    const { token } = getAuth();
    try {
      const res = await fetch(`${API_BASE}/api/admin/${section}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.status === 404) {
        applyManagementData(section, []);
        return;
      }
      if (!res.ok) throw new Error('Failed to fetch data.');
      const data = await res.json();
      applyManagementData(section, data);
    } catch (err) {
      setError(err.message || 'Failed to fetch data.');
    }
  }, []);

  useEffect(() => {
    if (activeSection === 'users') fetchManagementData('users');
    else if (activeSection === 'bins') fetchManagementData('bins');
    else if (activeSection === 'collections') fetchManagementData('collections');
  }, [activeSection, fetchManagementData]);

  const handleLogout = () => {
    clearAuth();
    navigate('/login', { replace: true });
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f9fafb' }}>
      <aside style={sidebarStyles}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#10b981', marginBottom: '1rem' }}>Admin Panel</h2>
        <nav>
          <div style={navItemStyles(activeSection === 'dashboard')} onClick={() => setActiveSection('dashboard')}>
            Dashboard
          </div>
          <div style={navItemStyles(activeSection === 'reports')} onClick={() => setActiveSection('reports')}>
            Reports
          </div>
          <div style={navItemStyles(activeSection === 'routes')} onClick={() => setActiveSection('routes')}>
            Route Planning
          </div>
          <div style={navItemStyles(activeSection === 'users')} onClick={() => setActiveSection('users')}>
            Users
          </div>
          <div style={navItemStyles(activeSection === 'bins')} onClick={() => setActiveSection('bins')}>
            Bins
          </div>
          <div style={navItemStyles(activeSection === 'collections')} onClick={() => setActiveSection('collections')}>
            Collections
          </div>
        </nav>
        <button
          type="button"
          onClick={handleLogout}
          style={{ marginTop: '1.5rem', width: '100%', padding: '0.75rem 1rem', borderRadius: '0.75rem', border: '1px solid #ef4444', background: '#fff', color: '#dc2626', fontWeight: 600, cursor: 'pointer' }}
        >
          Log Out
        </button>
      </aside>
      <main style={{ flex: 1, padding: '2rem' }}>
        {activeSection === 'dashboard' && (
          <>
            <header style={{ marginBottom: '2rem' }}>
              <h1 style={{ fontSize: '2rem', fontWeight: 700, color: '#374151' }}>Dashboard</h1>
              <p style={{ color: '#6b7280' }}>Monitor system metrics and activity.</p>
            </header>
            {loading && <div style={{ ...lightCardStyles, textAlign: 'center' }}>Loading...</div>}
            {!loading && error && (
              <div style={{ ...lightCardStyles, border: '1px solid #ef4444', background: '#fef2f2', color: '#dc2626' }}>
                <h2 style={{ margin: '0 0 0.8rem' }}>Error</h2>
                <p style={{ margin: 0 }}>{error}</p>
              </div>
            )}
            {!loading && !error && payload && (
              <>
                <section style={{ display: 'grid', gap: '1.5rem', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', marginBottom: '2.5rem' }}>
                  {metricCards.map((card) => (
                    <article key={card.title} style={{ ...lightCardStyles, borderTop: `4px solid ${card.accent}` }}>
                      <h3 style={{ margin: '0 0 0.6rem', fontSize: '1.1rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#6b7280' }}>
                        {card.title}
                      </h3>
                      <div style={{ fontSize: '2.6rem', fontWeight: 700, color: card.accent }}>{card.value}</div>
                      <p style={{ marginTop: '0.7rem', color: '#6b7280' }}>{card.subtitle}</p>
                    </article>
                  ))}
                </section>
                <section style={{ display: 'grid', gap: '1.5rem', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', marginBottom: '2.5rem' }}>
                  {roleChart && (
                    <article style={lightCardStyles}>
                      <header style={{ marginBottom: '1rem' }}>
                        <h2 style={{ margin: 0, fontSize: '1.3rem', color: '#10b981' }}>Role Distribution</h2>
                        <p style={{ marginTop: '0.4rem', color: '#6b7280' }}>Proportion of active accounts</p>
                      </header>
                      <div style={{ display: 'flex', gap: '1.4rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center' }}>
                        <DonutChart labels={roleChart.labels} series={roleChart.series} />
                        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: '0.6rem' }}>
                          {roleChart.labels.map((label, idx) => (
                            <li key={label} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: '#374151' }}>
                              <span style={{ width: '0.75rem', height: '0.75rem', borderRadius: '50%', background: chartPalette[idx % chartPalette.length] }} />
                              <span style={{ fontWeight: 600 }}>{label.charAt(0).toUpperCase() + label.slice(1)}</span>
                              <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>{roleChart.series[idx]} users</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </article>
                  )}
                  {collectionChart && (
                    <article style={lightCardStyles}>
                      <header style={{ marginBottom: '1rem' }}>
                        <h2 style={{ margin: 0, fontSize: '1.3rem', color: '#10b981' }}>Collection Status</h2>
                        <p style={{ marginTop: '0.4rem', color: '#6b7280' }}>Current pickup operations</p>
                      </header>
                      <HorizontalBars labels={collectionChart.labels} series={collectionChart.series} />
                    </article>
                  )}
                  {binChart && (
                    <article style={lightCardStyles}>
                      <header style={{ marginBottom: '1rem' }}>
                        <h2 style={{ margin: 0, fontSize: '1.3rem', color: '#10b981' }}>Bin Network</h2>
                        <p style={{ marginTop: '0.4rem', color: '#6b7280' }}>Distribution by {binChart.dimension}</p>
                      </header>
                      <HorizontalBars labels={binChart.labels} series={binChart.series} />
                    </article>
                  )}
                </section>
                {registrationChart && (
                  <section style={lightCardStyles}>
                    <header style={{ marginBottom: '1rem' }}>
                      <h2 style={{ margin: 0, fontSize: '1.3rem', color: '#10b981' }}>New Accounts (last 7 days)</h2>
                      <p style={{ marginTop: '0.4rem', color: '#6b7280' }}>Daily onboarding velocity by role</p>
                    </header>
                    <LineChart labels={registrationChart.labels} series={registrationChart.series} />
                    <div style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap', marginTop: '1.2rem' }}>
                      {(registrationLegend.length ? registrationLegend : Object.entries(registrationChart.series || {})).map(([roleKey, values], idx) => (
                        <span key={roleKey} style={{ padding: '0.4rem 0.9rem', background: '#e5e7eb', borderRadius: '999px', fontSize: '0.85rem' }}>
                          <span style={{ width: '0.6rem', height: '0.6rem', borderRadius: '50%', background: chartPalette[idx % chartPalette.length], display: 'inline-block', marginRight: '0.4rem' }} />
                          {roleKey.charAt(0).toUpperCase() + roleKey.slice(1)} · {Array.isArray(values) ? values.reduce((sum, value) => sum + value, 0) : values}
                        </span>
                      ))}
                    </div>
                  </section>
                )}
              </>
            )}
          </>
        )}
        {activeSection === 'reports' && (
          <>
            <header style={{ marginBottom: '2rem' }}>
              <h1 style={{ fontSize: '2rem', fontWeight: 700, color: '#374151' }}>Reports</h1>
              <p style={{ color: '#6b7280' }}>Generate and download system reports.</p>
            </header>
            <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
              {['users', 'bins', 'collections', 'overview'].map((type) => (
                <button
                  key={type}
                  style={{ ...lightCardStyles, cursor: 'pointer', border: '1px solid #10b981', background: '#f0fdf4', color: '#10b981' }}
                  onClick={() => fetchReportData(type)}
                >
                  Generate {type.charAt(0).toUpperCase() + type.slice(1)} Report
                </button>
              ))}
            </div>
            {reportData && (
              <div style={{ ...lightCardStyles, marginTop: '2rem' }}>
                <h2 style={{ margin: 0, fontSize: '1.3rem', color: '#10b981' }}>{reportData.type.charAt(0).toUpperCase() + reportData.type.slice(1)} Report</h2>
                <button
                  style={{ marginTop: '1rem', padding: '0.5rem 1rem', background: '#10b981', color: '#ffffff', border: 'none', borderRadius: '0.5rem', cursor: 'pointer' }}
                  onClick={() => generatePDF(reportData.type, reportData.data)}
                >
                  Download PDF
                </button>
              </div>
            )}
          </>
        )}
        {activeSection === 'routes' && (
          <>
            <header style={{ marginBottom: '2rem' }}>
              <h1 style={{ fontSize: '2rem', fontWeight: 700, color: '#374151' }}>Route Planning</h1>
              <p style={{ color: '#6b7280' }}>
                Generate optimized collection routes using live bin data and schedule constraints.
              </p>
            </header>

            <form onSubmit={handleRouteSubmit} style={{ ...lightCardStyles, display: 'grid', gap: '1rem', marginBottom: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', fontWeight: 600, color: '#374151', fontSize: '0.9rem' }}>Target Area</label>
                <input
                  type="text"
                  value={routeForm.area}
                  onChange={(e) => setRouteForm((prev) => ({ ...prev, area: e.target.value }))}
                  placeholder="e.g. Downtown Zone A"
                  style={{ marginTop: '0.4rem', width: '100%', borderRadius: '0.5rem', border: '1px solid #d1d5db', padding: '0.6rem' }}
                />
              </div>

              <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
                <div>
                  <label style={{ display: 'block', fontWeight: 600, color: '#374151', fontSize: '0.9rem' }}>Window Start</label>
                  <input
                    type="datetime-local"
                    value={routeForm.windowStart}
                    onChange={(e) => setRouteForm((prev) => ({ ...prev, windowStart: e.target.value }))}
                    style={{ marginTop: '0.4rem', width: '100%', borderRadius: '0.5rem', border: '1px solid #d1d5db', padding: '0.6rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: 600, color: '#374151', fontSize: '0.9rem' }}>Window End</label>
                  <input
                    type="datetime-local"
                    value={routeForm.windowEnd}
                    onChange={(e) => setRouteForm((prev) => ({ ...prev, windowEnd: e.target.value }))}
                    style={{ marginTop: '0.4rem', width: '100%', borderRadius: '0.5rem', border: '1px solid #d1d5db', padding: '0.6rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: 600, color: '#374151', fontSize: '0.9rem' }}>Truck Capacity (bins)</label>
                  <input
                    type="number"
                    min="1"
                    value={routeForm.truckCapacity}
                    onChange={(e) => setRouteForm((prev) => ({ ...prev, truckCapacity: e.target.value }))}
                    style={{ marginTop: '0.4rem', width: '100%', borderRadius: '0.5rem', border: '1px solid #d1d5db', padding: '0.6rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: 600, color: '#374151', fontSize: '0.9rem' }}>Truck ID (optional)</label>
                  <input
                    type="text"
                    value={routeForm.truckId}
                    onChange={(e) => setRouteForm((prev) => ({ ...prev, truckId: e.target.value }))}
                    placeholder="e.g. TRK-17"
                    style={{ marginTop: '0.4rem', width: '100%', borderRadius: '0.5rem', border: '1px solid #d1d5db', padding: '0.6rem' }}
                  />
                </div>
              </div>

              {routeError && (
                <div style={{ borderRadius: '0.75rem', border: '1px solid #fecaca', background: '#fef2f2', color: '#b91c1c', padding: '0.75rem', fontSize: '0.9rem' }}>
                  {routeError}
                </div>
              )}

              <button
                type="submit"
                disabled={routeLoading}
                style={{
                  alignSelf: 'start',
                  padding: '0.75rem 1.5rem',
                  borderRadius: '0.75rem',
                  background: '#10b981',
                  color: '#ffffff',
                  border: 'none',
                  fontWeight: 600,
                  cursor: 'pointer',
                  opacity: routeLoading ? 0.7 : 1
                }}
              >
                {routeLoading ? 'Optimizing…' : 'Generate Optimized Route'}
              </button>
            </form>

            {routeResult && (
              <div style={{ display: 'grid', gap: '1.5rem' }}>
                <section style={{ ...lightCardStyles, display: 'grid', gap: '0.8rem' }}>
                  <h2 style={{ margin: 0, fontSize: '1.2rem', color: '#10b981' }}>Route Summary</h2>
                  <div style={{ display: 'grid', gap: '0.6rem', fontSize: '0.95rem' }}>
                    <div><strong>Area:</strong> {routeResult.summary?.area || '—'}</div>
                    <div><strong>Window:</strong> {routeResult.summary?.window?.start || '—'} → {routeResult.summary?.window?.end || '—'}</div>
                    <div><strong>Assigned Truck:</strong> {routeResult.summary?.assignedTruck || 'Queued for assignment'}</div>
                    <div><strong>Bins Selected:</strong> {routeResult.summary?.selectedBins ?? 0} of {routeResult.summary?.totalBinsConsidered ?? 0}</div>
                    <div><strong>Estimated Distance:</strong> {routeResult.estimated?.distanceKm ?? 0} km</div>
                    <div><strong>Estimated Duration:</strong> {routeResult.estimated?.durationMinutes ?? 0} mins</div>
                    <div><strong>Dispatch Status:</strong> {routeResult.delivery?.status || 'pending'}</div>
                  </div>
                  {routeResult.warnings?.length ? (
                    <ul style={{ margin: 0, paddingLeft: '1.2rem', color: '#f59e0b', fontSize: '0.9rem' }}>
                      {routeResult.warnings.map((warn, idx) => (
                        <li key={idx}>{warn}</li>
                      ))}
                    </ul>
                  ) : null}
                </section>

                <section style={{ ...lightCardStyles }}>
                  <h3 style={{ marginTop: 0, fontSize: '1.1rem', color: '#374151' }}>Route Stops</h3>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid #e5e7eb', textAlign: 'left' }}>
                          <th style={{ padding: '0.5rem' }}>Seq</th>
                          <th style={{ padding: '0.5rem' }}>Bin</th>
                          <th style={{ padding: '0.5rem' }}>Status</th>
                          <th style={{ padding: '0.5rem' }}>Fill</th>
                          <th style={{ padding: '0.5rem' }}>Location</th>
                          <th style={{ padding: '0.5rem' }}>Last Update</th>
                        </tr>
                      </thead>
                      <tbody>
                        {routeResult.route?.length ? (
                          routeResult.route.map((stop) => (
                            <tr key={stop.sequence} style={{ borderBottom: '1px solid #f3f4f6' }}>
                              <td style={{ padding: '0.5rem' }}>{stop.sequence}</td>
                              <td style={{ padding: '0.5rem' }}>{stop.displayName || stop.binId}</td>
                              <td style={{ padding: '0.5rem' }}>{stop.status || '—'}</td>
                              <td style={{ padding: '0.5rem' }}>
                                {stop.fillLevel != null ? `${stop.fillLevel}%` : '—'}
                              </td>
                              <td style={{ padding: '0.5rem' }}>
                                {stop.location?.street || stop.location?.address || JSON.stringify(stop.location) || '—'}
                              </td>
                              <td style={{ padding: '0.5rem' }}>
                                {stop.lastUpdated ? new Date(stop.lastUpdated).toLocaleString() : '—'}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td style={{ padding: '0.5rem' }} colSpan={6}>
                              No stops generated.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </section>
              </div>
            )}
          </>
        )}
        {activeSection === 'users' && (
          <>
            <header style={{ marginBottom: '2rem' }}>
              <h1 style={{ fontSize: '2rem', fontWeight: 700, color: '#374151' }}>Users</h1>
              <p style={{ color: '#6b7280' }}>Manage user accounts.</p>
            </header>
            {loading && <div style={{ ...lightCardStyles, textAlign: 'center' }}>Loading...</div>}
            {!loading && error && (
              <div style={{ ...lightCardStyles, border: '1px solid #ef4444', background: '#fef2f2', color: '#dc2626' }}>
                <h2 style={{ margin: '0 0 0.8rem' }}>Error</h2>
                <p style={{ margin: 0 }}>{error}</p>
              </div>
            )}
            {!loading && !error && payload && (
              <>
                <section style={{ display: 'grid', gap: '1.5rem', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', marginBottom: '2.5rem' }}>
                  {userMetrics.map((card) => (
                    <article key={card.title} style={{ ...lightCardStyles, borderTop: `4px solid ${card.accent}` }}>
                      <h3 style={{ margin: '0 0 0.6rem', fontSize: '1.1rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#6b7280' }}>
                        {card.title}
                      </h3>
                      <div style={{ fontSize: '2.6rem', fontWeight: 700, color: card.accent }}>{card.value}</div>
                      <p style={{ marginTop: '0.7rem', color: '#6b7280' }}>{card.subtitle}</p>
                    </article>
                  ))}
                </section>
                <section style={{ display: 'grid', gap: '1.5rem', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', marginBottom: '2.5rem' }}>
                  {roleChart && (
                    <article style={lightCardStyles}>
                      <header style={{ marginBottom: '1rem' }}>
                        <h2 style={{ margin: 0, fontSize: '1.3rem', color: '#10b981' }}>Role Distribution</h2>
                        <p style={{ marginTop: '0.4rem', color: '#6b7280' }}>Proportion of active accounts</p>
                      </header>
                      <div style={{ display: 'flex', gap: '1.4rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center' }}>
                        <DonutChart labels={roleChart.labels} series={roleChart.series} />
                        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: '0.6rem' }}>
                          {roleChart.labels.map((label, idx) => (
                            <li key={label} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: '#374151' }}>
                              <span style={{ width: '0.75rem', height: '0.75rem', borderRadius: '50%', background: chartPalette[idx % chartPalette.length] }} />
                              <span style={{ fontWeight: 600 }}>{label.charAt(0).toUpperCase() + label.slice(1)}</span>
                              <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>{roleChart.series[idx]} users</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </article>
                  )}
                  {registrationChart && (
                    <article style={lightCardStyles}>
                      <header style={{ marginBottom: '1rem' }}>
                        <h2 style={{ margin: 0, fontSize: '1.3rem', color: '#10b981' }}>New Accounts (last 7 days)</h2>
                        <p style={{ marginTop: '0.4rem', color: '#6b7280' }}>Daily onboarding velocity by role</p>
                      </header>
                      <LineChart labels={registrationChart.labels} series={registrationChart.series} />
                      <div style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap', marginTop: '1.2rem' }}>
                        {(registrationLegend.length ? registrationLegend : Object.entries(registrationChart.series || {})).map(([roleKey, values], idx) => (
                          <span key={roleKey} style={{ padding: '0.4rem 0.9rem', background: '#e5e7eb', borderRadius: '999px', fontSize: '0.85rem' }}>
                            <span style={{ width: '0.6rem', height: '0.6rem', borderRadius: '50%', background: chartPalette[idx % chartPalette.length], display: 'inline-block', marginRight: '0.4rem' }} />
                            {roleKey.charAt(0).toUpperCase() + roleKey.slice(1)} · {Array.isArray(values) ? values.reduce((sum, value) => sum + value, 0) : values}
                          </span>
                        ))}
                      </div>
                    </article>
                  )}
                </section>
                <section style={lightCardStyles}>
                  <header style={{ marginBottom: '1rem' }}>
                    <h2 style={{ margin: 0, fontSize: '1.3rem', color: '#10b981' }}>User List</h2>
                    <p style={{ marginTop: '0.4rem', color: '#6b7280' }}>All registered users</p>
                  </header>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                        <th style={{ textAlign: 'left', padding: '0.5rem' }}>Name</th>
                        <th style={{ textAlign: 'left', padding: '0.5rem' }}>Email</th>
                        <th style={{ textAlign: 'left', padding: '0.5rem' }}>Role</th>
                        <th style={{ textAlign: 'left', padding: '0.5rem' }}>Created</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((user) => (
                        <tr key={user._id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                          <td style={{ padding: '0.5rem' }}>{user.name}</td>
                          <td style={{ padding: '0.5rem' }}>{user.email}</td>
                          <td style={{ padding: '0.5rem' }}>{user.role}</td>
                          <td style={{ padding: '0.5rem' }}>{new Date(user.createdAt).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </section>
              </>
            )}
          </>
        )}
        {activeSection === 'bins' && (
          <>
            <header style={{ marginBottom: '2rem' }}>
              <h1 style={{ fontSize: '2rem', fontWeight: 700, color: '#374151' }}>Bins</h1>
              <p style={{ color: '#6b7280' }}>Manage smart bins.</p>
            </header>
            {loading && <div style={{ ...lightCardStyles, textAlign: 'center' }}>Loading...</div>}
            {!loading && error && (
              <div style={{ ...lightCardStyles, border: '1px solid #ef4444', background: '#fef2f2', color: '#dc2626' }}>
                <h2 style={{ margin: '0 0 0.8rem' }}>Error</h2>
                <p style={{ margin: 0 }}>{error}</p>
              </div>
            )}
            {!loading && !error && payload && (
              <>
                <section style={{ display: 'grid', gap: '1.5rem', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', marginBottom: '2.5rem' }}>
                  {binMetrics.map((card) => (
                    <article key={card.title} style={{ ...lightCardStyles, borderTop: `4px solid ${card.accent}` }}>
                      <h3 style={{ margin: '0 0 0.6rem', fontSize: '1.1rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#6b7280' }}>
                        {card.title}
                      </h3>
                      <div style={{ fontSize: '2.6rem', fontWeight: 700, color: card.accent }}>{card.value}</div>
                      <p style={{ marginTop: '0.7rem', color: '#6b7280' }}>{card.subtitle}</p>
                    </article>
                  ))}
                </section>
                <section style={{ display: 'grid', gap: '1.5rem', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', marginBottom: '2.5rem' }}>
                  {binChart && (
                    <article style={lightCardStyles}>
                      <header style={{ marginBottom: '1rem' }}>
                        <h2 style={{ margin: 0, fontSize: '1.3rem', color: '#10b981' }}>Bin Network</h2>
                        <p style={{ marginTop: '0.4rem', color: '#6b7280' }}>Distribution by {binChart.dimension}</p>
                      </header>
                      <HorizontalBars labels={binChart.labels} series={binChart.series} />
                    </article>
                  )}
                </section>
                <section style={lightCardStyles}>
                  <header style={{ marginBottom: '1rem' }}>
                    <h2 style={{ margin: 0, fontSize: '1.3rem', color: '#10b981' }}>Bin List</h2>
                    <p style={{ marginTop: '0.4rem', color: '#6b7280' }}>All smart bins</p>
                  </header>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                        <th style={{ textAlign: 'left', padding: '0.5rem' }}>ID</th>
                        <th style={{ textAlign: 'left', padding: '0.5rem' }}>Status</th>
                        <th style={{ textAlign: 'left', padding: '0.5rem' }}>Type</th>
                        <th style={{ textAlign: 'left', padding: '0.5rem' }}>Created</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bins.map((bin) => (
                        <tr key={bin._id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                          <td style={{ padding: '0.5rem' }}>{bin._id}</td>
                          <td style={{ padding: '0.5rem' }}>{bin.status || 'N/A'}</td>
                          <td style={{ padding: '0.5rem' }}>{bin.type || 'N/A'}</td>
                          <td style={{ padding: '0.5rem' }}>{new Date(bin.createdAt).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </section>
              </>
            )}
          </>
        )}
        {activeSection === 'collections' && (
          <>
            <header style={{ marginBottom: '2rem' }}>
              <h1 style={{ fontSize: '2rem', fontWeight: 700, color: '#374151' }}>Collections</h1>
              <p style={{ color: '#6b7280' }}>Manage collection records.</p>
            </header>
            {loading && <div style={{ ...lightCardStyles, textAlign: 'center' }}>Loading...</div>}
            {!loading && error && (
              <div style={{ ...lightCardStyles, border: '1px solid #ef4444', background: '#fef2f2', color: '#dc2626' }}>
                <h2 style={{ margin: '0 0 0.8rem' }}>Error</h2>
                <p style={{ margin: 0 }}>{error}</p>
              </div>
            )}
            {!loading && !error && payload && (
              <>
                <section style={{ display: 'grid', gap: '1.5rem', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', marginBottom: '2.5rem' }}>
                  {collectionMetrics.map((card) => (
                    <article key={card.title} style={{ ...lightCardStyles, borderTop: `4px solid ${card.accent}` }}>
                      <h3 style={{ margin: '0 0 0.6rem', fontSize: '1.1rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#6b7280' }}>
                        {card.title}
                      </h3>
                      <div style={{ fontSize: '2.6rem', fontWeight: 700, color: card.accent }}>{card.value}</div>
                      <p style={{ marginTop: '0.7rem', color: '#6b7280' }}>{card.subtitle}</p>
                    </article>
                  ))}
                </section>
                <section style={{ display: 'grid', gap: '1.5rem', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', marginBottom: '2.5rem' }}>
                  {collectionChart && (
                    <article style={lightCardStyles}>
                      <header style={{ marginBottom: '1rem' }}>
                        <h2 style={{ margin: 0, fontSize: '1.3rem', color: '#10b981' }}>Collection Status</h2>
                        <p style={{ marginTop: '0.4rem', color: '#6b7280' }}>Current pickup operations</p>
                      </header>
                      <HorizontalBars labels={collectionChart.labels} series={collectionChart.series} />
                    </article>
                  )}
                </section>
                <section style={lightCardStyles}>
                  <header style={{ marginBottom: '1rem' }}>
                    <h2 style={{ margin: 0, fontSize: '1.3rem', color: '#10b981' }}>Collection List</h2>
                    <p style={{ marginTop: '0.4rem', color: '#6b7280' }}>All collection records</p>
                  </header>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                        <th style={{ textAlign: 'left', padding: '0.5rem' }}>ID</th>
                        <th style={{ textAlign: 'left', padding: '0.5rem' }}>Status</th>
                        <th style={{ textAlign: 'left', padding: '0.5rem' }}>Created</th>
                      </tr>
                    </thead>
                    <tbody>
                      {collections.map((col) => (
                        <tr key={col._id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                          <td style={{ padding: '0.5rem' }}>{col._id}</td>
                          <td style={{ padding: '0.5rem' }}>{col.status}</td>
                          <td style={{ padding: '0.5rem' }}>{new Date(col.createdAt).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </section>
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
}
