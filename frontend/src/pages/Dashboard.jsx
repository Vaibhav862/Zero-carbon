import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import {
  FileText,
  Search,
  Filter,
  TrendingUp,
  Activity,
  Plus,
  Trash2,
  CheckCircle,
  AlertTriangle,
  Clock,
  Eye,
  Settings,
  ChevronRight
} from 'lucide-react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

export const Dashboard = () => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalDocs: 0,
    totalKwh: 0,
    totalDiesel: 0,
    totalCoal: 0,
    carbonFootprint: 0,
  });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const { user } = useAuth();
  const navigate = useNavigate();

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const params = {
        page,
        limit: 10,
        ...(search && { search }),
        ...(statusFilter && { status: statusFilter }),
      };
      
      const res = await api.get('/documents', { params });
      if (res.data?.success) {
        setDocuments(res.data.data);
        setTotalPages(res.data.pagination.pages || 1);
        
        // Calculate statistics locally from historical approvals or current documents
        calculateStats(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching documents:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (docsList) => {
    let kwh = 0;
    let diesel = 0;
    let coal = 0;
    
    docsList.forEach((doc) => {
      const summary = doc.extraction_summary;
      if (summary && doc.status === 'done') {
        const type = summary.document_type;
        const total = summary.total_amount || 0;
        
        // Dynamic fields are saved in the fields property
        if (type === 'electricity_bill') {
          kwh += summary.fields?.units_kwh || 0;
        } else if (type === 'diesel_invoice') {
          diesel += summary.fields?.quantity_litres || 0;
        } else if (type === 'coal_invoice') {
          coal += summary.fields?.quantity_tonnes || 0;
        }
      }
    });

    // Carbon factors:
    // Electricity (kWh): 0.82 kg CO2e / kWh
    // Diesel (Litres): 2.68 kg CO2e / Litre
    // Coal (Tonnes): 2400 kg CO2e / Tonne
    const co2 = (kwh * 0.82) + (diesel * 2.68) + (coal * 2400);

    setStats({
      totalDocs: docsList.length,
      totalKwh: Math.round(kwh),
      totalDiesel: Math.round(diesel),
      totalCoal: Math.round(coal),
      carbonFootprint: Math.round(co2),
    });
  };

  useEffect(() => {
    fetchDocuments();
  }, [page, statusFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchDocuments();
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    e.preventDefault();
    if (window.confirm('Are you sure you want to delete this document and all associated outputs?')) {
      try {
        const res = await api.delete(`/documents/${id}`);
        if (res.data?.success) {
          fetchDocuments();
        }
      } catch (err) {
        console.error('Delete failed:', err.message);
      }
    }
  };

  // Bar Chart Configuration
  const chartData = {
    labels: ['Electricity (kWh)', 'Diesel (Litres)', 'Coal (Tonnes)'],
    datasets: [
      {
        label: 'Resource Consumption Value',
        data: [stats.totalKwh, stats.totalDiesel, stats.totalCoal * 10], // scaled coal for visibility
        backgroundColor: [
          'rgba(16, 185, 129, 0.65)',
          'rgba(6, 182, 212, 0.65)',
          'rgba(139, 92, 246, 0.65)'
        ],
        borderColor: [
          '#10b981',
          '#06b6d4',
          '#8b5cf6'
        ],
        borderWidth: 1,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
    },
    scales: {
      y: {
        grid: { color: 'rgba(255,255,255,0.05)' },
        ticks: { color: '#9ca3af' }
      },
      x: {
        grid: { display: false },
        ticks: { color: '#9ca3af' }
      }
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'queued':
        return <span className="badge badge-queued"><Clock size={12} /> Queued</span>;
      case 'ocr_processing':
        return <span className="badge badge-ocr_processing pulse"><Activity size={12} /> Running OCR</span>;
      case 'ai_extracting':
        return <span className="badge badge-ai_extracting pulse"><Settings size={12} /> AI Extraction</span>;
      case 'done':
        return <span className="badge badge-done"><CheckCircle size={12} /> Approved</span>;
      case 'failed':
        return <span className="badge badge-failed"><AlertTriangle size={12} /> Failed</span>;
      default:
        return <span className="badge">{status}</span>;
    }
  };

  return (
    <div style={{ paddingBottom: '60px' }}>
      {/* ─── Top Header ─── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '2rem', color: '#fff', marginBottom: '6px' }}>Dashboard</h1>
          <p style={{ color: '#9ca3af' }}>Welcome back, <strong style={{ color: '#fff' }}>{user?.name}</strong>. Here is your enterprise carbon metrics overview.</p>
        </div>
        <Link to="/upload" className="btn btn-primary">
          <Plus size={18} /> Upload Bills
        </Link>
      </div>

      {/* ─── Stats Cards Grid ─── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '24px',
        marginBottom: '32px'
      }}>
        <div className="card" style={{ borderLeft: '4px solid #10b981' }}>
          <p style={{ color: '#9ca3af', fontSize: '0.85rem', textTransform: 'uppercase', marginBottom: '8px' }}>Carbon Footprint</p>
          <h2 style={{ fontSize: '2rem', color: '#10b981', marginBottom: '4px' }}>{stats.carbonFootprint.toLocaleString()} <span style={{ fontSize: '1rem', color: '#9ca3af' }}>kg CO₂e</span></h2>
          <p style={{ fontSize: '0.75rem', color: '#6b7280' }}>Calculated scope 1 & 2 carbon footprint</p>
        </div>

        <div className="card" style={{ borderLeft: '4px solid #06b6d4' }}>
          <p style={{ color: '#9ca3af', fontSize: '0.85rem', textTransform: 'uppercase', marginBottom: '8px' }}>Electricity Consumed</p>
          <h2 style={{ fontSize: '2rem', color: '#06b6d4', marginBottom: '4px' }}>{stats.totalKwh.toLocaleString()} <span style={{ fontSize: '1rem', color: '#9ca3af' }}>kWh</span></h2>
          <p style={{ fontSize: '0.75rem', color: '#6b7280' }}>Total utility grid power parsed</p>
        </div>

        <div className="card" style={{ borderLeft: '4px solid #8b5cf6' }}>
          <p style={{ color: '#9ca3af', fontSize: '0.85rem', textTransform: 'uppercase', marginBottom: '8px' }}>Diesel Fuel Quantity</p>
          <h2 style={{ fontSize: '2rem', color: '#8b5cf6', marginBottom: '4px' }}>{stats.totalDiesel.toLocaleString()} <span style={{ fontSize: '1rem', color: '#9ca3af' }}>Litres</span></h2>
          <p style={{ fontSize: '0.75rem', color: '#6b7280' }}>Industrial backup generators fuel</p>
        </div>

        <div className="card" style={{ borderLeft: '4px solid #f59e0b' }}>
          <p style={{ color: '#9ca3af', fontSize: '0.85rem', textTransform: 'uppercase', marginBottom: '8px' }}>Coal Purchases</p>
          <h2 style={{ fontSize: '2rem', color: '#f59e0b', marginBottom: '4px' }}>{stats.totalCoal.toLocaleString()} <span style={{ fontSize: '1rem', color: '#9ca3af' }}>Tonnes</span></h2>
          <p style={{ fontSize: '0.75rem', color: '#6b7280' }}>Solid fuel boiler inputs parsed</p>
        </div>
      </div>

      {/* ─── Chart & Filters Panel ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px', marginBottom: '32px' }}>
        <div className="card" style={{ height: '320px', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ fontSize: '1.1rem', color: '#fff', marginBottom: '16px' }}>Consumption Chart</h3>
          <div style={{ flex: 1, position: 'relative' }}>
            <Bar data={chartData} options={chartOptions} />
          </div>
        </div>

        <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', color: '#fff', marginBottom: '12px' }}>Carbon Footprint Breakdown</h3>
            <p style={{ color: '#9ca3af', fontSize: '0.85rem', marginBottom: '24px' }}>
              We convert physical fuel purchases into standardized Scope 1 emissions (Diesel direct burning, coal boilers) and Scope 2 emissions (purchased electricity grids).
            </p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <span style={{ color: '#9ca3af' }}>Scope 2 Grid Power Emissions</span>
              <strong style={{ color: '#10b981' }}>{Math.round(stats.totalKwh * 0.82).toLocaleString()} kg CO₂e</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <span style={{ color: '#9ca3af' }}>Scope 1 Diesel Generators Emissions</span>
              <strong style={{ color: '#06b6d4' }}>{Math.round(stats.totalDiesel * 2.68).toLocaleString()} kg CO₂e</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px' }}>
              <span style={{ color: '#9ca3af' }}>Scope 1 Coal Burning Emissions</span>
              <strong style={{ color: '#8b5cf6' }}>{Math.round(stats.totalCoal * 2400).toLocaleString()} kg CO₂e</strong>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Search & Filters Bar ─── */}
      <div className="card" style={{ padding: '16px 24px', marginBottom: '24px' }}>
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flex: 1, minWidth: '200px', position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#6b7280' }} />
            <input
              type="text"
              className="input"
              placeholder="Search documents by original filename..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: '40px' }}
            />
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Filter size={18} color="#9ca3af" />
            <select
              className="input"
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              style={{ width: '180px' }}
            >
              <option value="">All Statuses</option>
              <option value="queued">Queued</option>
              <option value="ocr_processing">Running OCR</option>
              <option value="ai_extracting">Awaiting Review</option>
              <option value="done">Approved</option>
              <option value="failed">Failed</option>
            </select>
          </div>

          <button type="submit" className="btn btn-secondary">Search</button>
        </form>
      </div>

      {/* ─── Document Table List ─── */}
      <div className="card" style={{ padding: '0px' }}>
        <div style={{ padding: '24px', borderBottom: '1px solid var(--panel-border)' }}>
          <h3 style={{ fontSize: '1.1rem', color: '#fff' }}>Document Queue & Extraction History</h3>
        </div>

        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>Loading document queue...</div>
        ) : documents.length === 0 ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#6b7280' }}>
            <FileText size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
            <p>No documents uploaded yet.</p>
            <Link to="/upload" style={{ color: '#10b981', textDecoration: 'underline', display: 'inline-block', marginTop: '12px' }}>Upload your first bill</Link>
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Original Filename</th>
                  <th>Upload Date</th>
                  <th>Vendor / Provider</th>
                  <th>Document Category</th>
                  <th>Status</th>
                  <th>Amount</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {documents.map((doc) => {
                  const extSummary = doc.extraction_summary;
                  const uploadDate = new Date(doc.uploaded_at).toLocaleDateString('en-IN', {
                    day: '2-digit', month: 'short', year: 'numeric'
                  });

                  return (
                    <tr key={doc._id}>
                      <td style={{ fontWeight: 500 }}>
                        <span style={{ display: 'block', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {doc.original_name}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                          {(doc.file_size / 1024 / 1024).toFixed(2)} MB
                        </span>
                      </td>
                      <td>{uploadDate}</td>
                      <td>
                        {extSummary?.vendor || <span style={{ color: '#6b7280' }}>Pending</span>}
                      </td>
                      <td style={{ textTransform: 'capitalize' }}>
                        {extSummary?.document_type ? extSummary.document_type.replace('_', ' ') : <span style={{ color: '#6b7280' }}>Pending</span>}
                      </td>
                      <td>{getStatusBadge(doc.status)}</td>
                      <td>
                        {extSummary?.total_amount ? (
                          <strong>₹{extSummary.total_amount.toLocaleString()}</strong>
                        ) : (
                          <span style={{ color: '#6b7280' }}>-</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                          {doc.status === 'ai_extracting' && (
                            <Link to={`/review/${doc._id}`} className="btn btn-primary" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
                              Review <ChevronRight size={14} />
                            </Link>
                          )}
                          {doc.status === 'done' && (
                            <Link to={`/review/${doc._id}`} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
                              <Eye size={14} /> View
                            </Link>
                          )}
                          <button
                            onClick={(e) => handleDelete(doc._id, e)}
                            className="btn btn-danger"
                            style={{ padding: '6px 10px' }}
                            title="Delete document"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* ─── Pagination ─── */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', padding: '24px', borderTop: '1px solid var(--panel-border)' }}>
            <button
              className="btn btn-secondary"
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
              style={{ padding: '6px 12px' }}
            >
              Previous
            </button>
            <span style={{ alignSelf: 'center', color: '#9ca3af', fontSize: '0.9rem' }}>Page {page} of {totalPages}</span>
            <button
              className="btn btn-secondary"
              disabled={page === totalPages}
              onClick={() => setPage(page + 1)}
              style={{ padding: '6px 12px' }}
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
