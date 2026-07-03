import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../services/api.js';
import {
  ArrowLeft,
  FileText,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Download,
  Save,
  Loader,
  HelpCircle
} from 'lucide-react';

export const ReviewPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [doc, setDoc] = useState(null);
  const [ocr, setOcr] = useState(null);
  const [extraction, setExtraction] = useState(null);
  const [approval, setApproval] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notes, setNotes] = useState('');
  
  // Form states for root fields
  const [vendor, setVendor] = useState('');
  const [billDate, setBillDate] = useState('');
  const [billingPeriod, setBillingPeriod] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  
  // Form state for dynamic fields
  const [dynamicFields, setDynamicFields] = useState({});

  const fetchDocumentData = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/documents/${id}`);
      if (res.data?.success) {
        const { document, ocr_result, extraction: extData, approval: appData } = res.data.data;
        setDoc(document);
        setOcr(ocr_result);
        setExtraction(extData);
        setApproval(appData);
        setNotes(appData?.notes || '');

        if (extData) {
          setVendor(extData.vendor || '');
          setBillDate(extData.bill_date || '');
          setBillingPeriod(extData.billing_period || '');
          setDueDate(extData.due_date || '');
          setTotalAmount(extData.total_amount !== undefined ? extData.total_amount : '');
          setDynamicFields(extData.fields || {});
        }
      }
    } catch (err) {
      console.error('Error fetching document data:', err.message);
      alert('Failed to load document information.');
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocumentData();
  }, [id]);

  const handleDynamicFieldChange = (key, val) => {
    setDynamicFields(prev => {
      const updated = { ...prev };
      // Parse to number if it looks like a number, otherwise save as string
      if (val === '') {
        updated[key] = '';
      } else if (!isNaN(val) && val.trim() !== '') {
        updated[key] = parseFloat(val);
      } else {
        updated[key] = val;
      }
      return updated;
    });
  };

  const handleSaveDraft = async () => {
    if (!extraction) return;
    try {
      setSaving(true);
      
      const payload = {
        vendor,
        bill_date: billDate || null,
        billing_period: billingPeriod || null,
        due_date: dueDate || null,
        total_amount: totalAmount !== '' ? parseFloat(totalAmount) : null,
        fields: dynamicFields
      };

      const res = await api.patch(`/extractions/${extraction._id}`, payload);
      if (res.data?.success) {
        alert('Draft changes saved successfully.');
        setExtraction(res.data.data);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save draft changes.');
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async () => {
    if (!extraction) return;
    try {
      setSaving(true);
      
      // Calculate corrections (differences between original extraction and user edits)
      const corrections = {};
      const fieldsToCheck = { vendor, bill_date: billDate, billing_period: billingPeriod, due_date: dueDate, total_amount: totalAmount };
      
      Object.entries(fieldsToCheck).forEach(([k, v]) => {
        let orig = extraction[k];
        if (k === 'total_amount' && orig !== undefined) orig = orig.toString();
        let current = v?.toString() || '';
        if (orig !== current) {
          corrections[k] = { original: orig || null, corrected: v || null };
        }
      });

      // Also check dynamic fields corrections
      Object.entries(dynamicFields).forEach(([k, v]) => {
        const orig = extraction.fields?.[k];
        if (orig !== v) {
          corrections[`fields.${k}`] = { original: orig ?? null, corrected: v ?? null };
        }
      });

      // 1. Save PATCH changes first
      await api.patch(`/extractions/${extraction._id}`, {
        vendor,
        bill_date: billDate || null,
        billing_period: billingPeriod || null,
        due_date: dueDate || null,
        total_amount: totalAmount !== '' ? parseFloat(totalAmount) : null,
        fields: dynamicFields
      });

      // 2. Submit approval
      const res = await api.post(`/extractions/${extraction._id}/approve`, {
        notes,
        corrections
      });

      if (res.data?.success) {
        alert('Document approved successfully.');
        navigate('/');
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to approve document.');
    } finally {
      setSaving(false);
    }
  };

  const handleReject = async () => {
    if (!extraction) return;
    if (!notes.trim()) {
      alert('Please provide rejection notes explaining the reason.');
      return;
    }
    try {
      setSaving(true);
      const res = await api.post(`/extractions/${extraction._id}/reject`, { notes });
      if (res.data?.success) {
        alert('Document rejected.');
        navigate('/');
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to reject document.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '80vh', color: '#9ca3af' }}>
        <Loader size={36} className="animate-spin" style={{ marginRight: '12px' }} />
        <span>Loading document details...</span>
      </div>
    );
  }

  if (!doc) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '40px', color: '#ef4444' }}>
        <h3>Error: Document not found.</h3>
        <Link to="/" style={{ color: '#10b981', display: 'inline-block', marginTop: '16px' }}>Back to Dashboard</Link>
      </div>
    );
  }

  const isApproved = approval?.status === 'approved';
  const isRejected = approval?.status === 'rejected';
  const displayStatus = isApproved ? 'approved' : (isRejected ? 'rejected' : 'pending_review');

  return (
    <div>
      {/* ─── Back Nav ─── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', color: '#10b981', textDecoration: 'none', gap: '8px', fontSize: '0.95rem' }}>
          <ArrowLeft size={16} /> Back to Dashboard
        </Link>
        <div style={{ display: 'flex', gap: '12px' }}>
          <a
            href={`/uploads/${doc.filename}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary"
            style={{ padding: '8px 16px', fontSize: '0.9rem' }}
          >
            <Download size={16} /> Download Original File
          </a>
        </div>
      </div>

      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '1.75rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '12px' }}>
          Review Document: <span style={{ color: '#9ca3af', fontWeight: 400 }}>{doc.original_name}</span>
          {displayStatus === 'approved' && <span style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', border: '1px solid #10b981', fontSize: '0.8rem', padding: '2px 8px', borderRadius: '4px' }}>APPROVED</span>}
          {displayStatus === 'rejected' && <span style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid #ef4444', fontSize: '0.8rem', padding: '2px 8px', borderRadius: '4px' }}>REJECTED</span>}
        </h1>
        <p style={{ color: '#9ca3af', fontSize: '0.85rem', marginTop: '4px' }}>
          Uploaded by Admin on {new Date(doc.uploaded_at).toLocaleString('en-IN')}. Extraction Confidence Score: <strong>{(extraction?.confidence_score * 100).toFixed(0)}%</strong>
        </p>
      </div>

      {/* ─── Split Screen Layout ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', alignItems: 'start' }}>
        
        {/* ─── Left Side: Raw OCR Text ─── */}
        <div className="card" style={{ height: '70vh', display: 'flex', flexDirection: 'column', padding: '0px', overflow: 'hidden' }}>
          <div style={{ padding: '20px', borderBottom: '1px solid var(--panel-border)', background: 'rgba(255, 255, 255, 0.02)' }}>
            <h3 style={{ fontSize: '1.1rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileText size={18} color="#10b981" /> OCR Extracted Raw Text
            </h3>
          </div>
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '24px',
            fontFamily: 'monospace',
            fontSize: '0.85rem',
            whiteSpace: 'pre-wrap',
            color: '#cbd5e1',
            lineHeight: 1.6,
            background: 'rgba(0, 0, 0, 0.2)'
          }}>
            {ocr?.raw_text ? ocr.raw_text : 'No OCR raw text extracted. This could be due to parsing issues.'}
          </div>
        </div>

        {/* ─── Right Side: Editable Structured fields ─── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Validation warnings box */}
          {extraction?.validation_warnings && extraction.validation_warnings.length > 0 && (
            <div style={{
              backgroundColor: 'rgba(245, 158, 11, 0.1)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              borderRadius: '12px',
              padding: '16px 20px',
              display: 'flex',
              gap: '12px'
            }}>
              <AlertTriangle size={24} color="#f59e0b" style={{ flexShrink: 0 }} />
              <div>
                <h4 style={{ color: '#fbbf24', fontSize: '0.95rem', fontWeight: 600, marginBottom: '6px' }}>Agentic Validation Layer Warnings</h4>
                <ul style={{ color: '#fcd34d', fontSize: '0.85rem', paddingLeft: '16px', lineHeight: 1.5 }}>
                  {extraction.validation_warnings.map((w, idx) => <li key={idx}>{w}</li>)}
                </ul>
              </div>
            </div>
          )}

          {/* Form Card */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h3 style={{ fontSize: '1.1rem', color: '#fff', borderBottom: '1px solid var(--panel-border)', paddingBottom: '12px' }}>
              Structured Parameters Check
            </h3>

            {/* Document Type Label */}
            <div>
              <label style={{ display: 'block', color: '#9ca3af', fontSize: '0.85rem', marginBottom: '6px' }}>Document Type (Inferred)</label>
              <div style={{
                padding: '12px',
                background: 'rgba(16, 185, 129, 0.05)',
                border: '1px solid rgba(16, 185, 129, 0.2)',
                borderRadius: '8px',
                color: '#10b981',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                fontSize: '0.85rem'
              }}>
                {extraction?.document_type ? extraction.document_type.replace('_', ' ') : 'UNKNOWN'}
              </div>
            </div>

            {/* Standard Core Fields */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', color: '#9ca3af', fontSize: '0.85rem', marginBottom: '6px' }}>Vendor / Provider</label>
                <input
                  type="text"
                  className="input"
                  value={vendor}
                  onChange={(e) => setVendor(e.target.value)}
                  disabled={isApproved}
                />
              </div>

              <div>
                <label style={{ display: 'block', color: '#9ca3af', fontSize: '0.85rem', marginBottom: '6px' }}>Total Amount</label>
                <input
                  type="text"
                  className="input"
                  value={totalAmount}
                  placeholder="e.g. 15420.00"
                  onChange={(e) => setTotalAmount(e.target.value)}
                  disabled={isApproved}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', color: '#9ca3af', fontSize: '0.85rem', marginBottom: '6px' }}>Bill Date</label>
                <input
                  type="text"
                  className="input"
                  placeholder="YYYY-MM-DD"
                  value={billDate}
                  onChange={(e) => setBillDate(e.target.value)}
                  disabled={isApproved}
                />
              </div>

              <div>
                <label style={{ display: 'block', color: '#9ca3af', fontSize: '0.85rem', marginBottom: '6px' }}>Billing Period</label>
                <input
                  type="text"
                  className="input"
                  placeholder="e.g., Dec 2025"
                  value={billingPeriod}
                  onChange={(e) => setBillingPeriod(e.target.value)}
                  disabled={isApproved}
                />
              </div>

              <div>
                <label style={{ display: 'block', color: '#9ca3af', fontSize: '0.85rem', marginBottom: '6px' }}>Due Date</label>
                <input
                  type="text"
                  className="input"
                  placeholder="YYYY-MM-DD"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  disabled={isApproved}
                />
              </div>
            </div>

            {/* Dynamic Category-Specific Fields */}
            {Object.keys(dynamicFields).length > 0 && (
              <div style={{ borderTop: '1px solid var(--panel-border)', paddingTop: '20px' }}>
                <h4 style={{ fontSize: '0.95rem', color: '#fff', marginBottom: '16px' }}>Category Specific Fields</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  {Object.entries(dynamicFields).map(([key, val]) => (
                    <div key={key}>
                      <label style={{ display: 'block', color: '#9ca3af', fontSize: '0.85rem', marginBottom: '6px', textTransform: 'capitalize' }}>
                        {key.replace(/_/g, ' ')}
                      </label>
                      <input
                        type="text"
                        className="input"
                        value={val ?? ''}
                        onChange={(e) => handleDynamicFieldChange(key, e.target.value)}
                        disabled={isApproved}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Review Notes */}
            <div style={{ borderTop: '1px solid var(--panel-border)', paddingTop: '20px' }}>
              <label style={{ display: 'block', color: '#9ca3af', fontSize: '0.85rem', marginBottom: '6px' }}>Review Notes / Discrepancy Comments</label>
              <textarea
                className="input"
                rows={3}
                placeholder="Enter review findings, manual check details, or correction explanations..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={isApproved}
                style={{ resize: 'vertical' }}
              />
            </div>

            {/* Action Buttons */}
            {!isApproved && (
              <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleSaveDraft}
                  disabled={saving}
                  style={{ flex: 1 }}
                >
                  <Save size={16} /> Save Draft
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleApprove}
                  disabled={saving}
                  style={{ flex: 1.5 }}
                >
                  <CheckCircle size={16} /> Approve & Save
                </button>
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={handleReject}
                  disabled={saving}
                  style={{ flex: 1 }}
                >
                  <XCircle size={16} /> Reject
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReviewPage;
