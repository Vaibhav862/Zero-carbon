import React, { useState, useEffect } from 'react';
import api from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { Shield, Eye, Trash2, Calendar, FileCheck, RefreshCw, Layers } from 'lucide-react';

export const AdminPage = () => {
  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const { user } = useAuth();

  const fetchApprovals = async () => {
    try {
      setLoading(true);
      const params = {
        page,
        limit: 10,
        ...(statusFilter && { status: statusFilter }),
      };
      // Endpoint is /api/extractions/approvals
      const res = await api.get('/extractions/approvals', { params });
      if (res.data?.success) {
        setApprovals(res.data.data);
        setTotalPages(Math.ceil(res.data.pagination.total / res.data.pagination.limit) || 1);
      }
    } catch (err) {
      console.error('Error fetching admin approvals:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApprovals();
  }, [page, statusFilter]);

  const getCorrectionsSummary = (corrections) => {
    if (!corrections || Object.keys(corrections).length === 0) {
      return <span style={{ color: '#6b7280' }}>No corrections</span>;
    }
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.85rem' }}>
        {Object.entries(corrections).map(([field, diff]) => (
          <div key={field} style={{ color: '#fbbf24' }}>
            <span style={{ textTransform: 'capitalize', fontWeight: 600 }}>{field.replace('fields.', '')}: </span>
            <span style={{ textDecoration: 'line-through', color: '#f87171', marginRight: '6px' }}>{diff.original || 'empty'}</span>
            <span style={{ color: '#34d399' }}>→ {diff.corrected || 'empty'}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '2rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Shield size={28} color="#10b981" /> Admin Audit Ledger
          </h1>
          <p style={{ color: '#9ca3af' }}>Audit logs of all human approvals, corrections, and carbon-accounting extractions.</p>
        </div>
        <button className="btn btn-secondary" onClick={fetchApprovals} disabled={loading}>
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Reload Audit Logs
        </button>
      </div>

      {/* ─── Filters ─── */}
      <div className="card" style={{ padding: '16px 24px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ color: '#9ca3af', fontSize: '0.9rem' }}>Filter Audit Log:</span>
          <select
            className="input"
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            style={{ width: '200px' }}
          >
            <option value="">All Review Statuses</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      {/* ─── Approvals List Table ─── */}
      <div className="card" style={{ padding: '0px' }}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>Loading admin ledger...</div>
        ) : approvals.length === 0 ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#6b7280' }}>
            <FileCheck size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
            <p>No reviewed documents in the ledger yet.</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Document Name</th>
                  <th>Reviewed By</th>
                  <th>Reviewed At</th>
                  <th>Extraction Type</th>
                  <th>Corrections Made</th>
                  <th>Status</th>
                  <th>Reviewer Notes</th>
                </tr>
              </thead>
              <tbody>
                {approvals.map((app) => {
                  const reviewedDate = new Date(app.reviewed_at).toLocaleDateString('en-IN', {
                    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                  });

                  return (
                    <tr key={app._id}>
                      <td style={{ fontWeight: 500 }}>
                        {app.document_id?.original_name || <span style={{ color: '#6b7280' }}>Deleted Document</span>}
                      </td>
                      <td>
                        <span style={{ display: 'block', color: '#fff' }}>{app.reviewed_by?.name || 'System'}</span>
                        <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>{app.reviewed_by?.email}</span>
                      </td>
                      <td>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}>
                          <Calendar size={14} color="#6b7280" /> {reviewedDate}
                        </span>
                      </td>
                      <td style={{ textTransform: 'capitalize' }}>
                        {app.final_json?.document_type ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                            <Layers size={14} color="#06b6d4" />
                            {app.final_json.document_type.replace('_', ' ')}
                          </span>
                        ) : (
                          <span style={{ color: '#6b7280' }}>Unknown</span>
                        )}
                      </td>
                      <td>{getCorrectionsSummary(app.corrections)}</td>
                      <td>
                        {app.status === 'approved' ? (
                          <span style={{ color: '#10b981', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            Approved
                          </span>
                        ) : (
                          <span style={{ color: '#ef4444', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            Rejected
                          </span>
                        )}
                      </td>
                      <td style={{ maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#9ca3af' }}>
                        {app.notes || <span style={{ color: '#6b7280', fontSize: '0.85rem' }}>No comments</span>}
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

export default AdminPage;
