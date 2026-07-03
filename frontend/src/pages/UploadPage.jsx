import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api.js';
import { UploadCloud, CheckCircle, AlertCircle, Loader, FileText, ArrowLeft } from 'lucide-react';

export const UploadPage = () => {
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [files, setFiles] = useState([]); // List of uploaded documents from API
  const [pollingList, setPollingList] = useState([]); // List of document IDs currently processing
  const [docStatuses, setDocStatuses] = useState({}); // docId -> status map
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await uploadFiles(e.dataTransfer.files);
    }
  };

  const handleFileChange = async (e) => {
    if (e.target.files && e.target.files[0]) {
      await uploadFiles(e.target.files);
    }
  };

  const onButtonClick = () => {
    fileInputRef.current.click();
  };

  const uploadFiles = async (fileList) => {
    setUploading(true);
    setProgress(10);
    const formData = new FormData();
    
    // Add all files
    for (let i = 0; i < fileList.length; i++) {
      formData.append('files', fileList[i]);
    }

    try {
      setProgress(40);
      const res = await api.post('/documents/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setProgress(40 + (percentCompleted * 0.6));
        }
      });

      if (res.data?.success) {
        setProgress(100);
        const uploadedDocs = res.data.data;
        setFiles(prev => [...uploadedDocs, ...prev]);

        // Add uploaded docs to the polling track
        const newIds = uploadedDocs.map(d => d._id);
        setPollingList(prev => [...prev, ...newIds]);

        // Initialize status map
        const initialStatus = {};
        uploadedDocs.forEach(d => {
          initialStatus[d._id] = { status: d.status, name: d.original_name };
        });
        setDocStatuses(prev => ({ ...prev, ...initialStatus }));
      }
    } catch (err) {
      alert(err.response?.data?.message || 'File upload failed. Make sure you upload PDF, PNG or JPG files under 20MB.');
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  // Poll status of processing documents every 2 seconds
  useEffect(() => {
    if (pollingList.length === 0) return;

    const interval = setInterval(async () => {
      const activePollIds = [...pollingList];
      const updatedStatuses = { ...docStatuses };
      const stillPolling = [];

      for (const id of activePollIds) {
        try {
          const res = await api.get(`/documents/${id}/status`);
          if (res.data?.success) {
            const data = res.data.data;
            updatedStatuses[id] = {
              ...updatedStatuses[id],
              status: data.status,
              error: data.error
            };
            
            // If the document is still queued, ocr_processing, or running, keep polling it
            if (data.status === 'queued' || data.status === 'ocr_processing') {
              stillPolling.push(id);
            }
          }
        } catch (err) {
          console.error(`Error polling status for ${id}:`, err.message);
          updatedStatuses[id] = { ...updatedStatuses[id], status: 'failed', error: 'Connection error' };
        }
      }

      setDocStatuses(updatedStatuses);
      setPollingList(stillPolling);
    }, 2000);

    return () => clearInterval(interval);
  }, [pollingList, docStatuses]);

  return (
    <div>
      {/* ─── Back Nav ─── */}
      <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', color: '#10b981', textDecoration: 'none', marginBottom: '24px', gap: '8px', fontSize: '0.95rem' }}>
        <ArrowLeft size={16} /> Back to Dashboard
      </Link>

      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '2rem', color: '#fff', marginBottom: '6px' }}>Upload Utility Documents</h1>
        <p style={{ color: '#9ca3af', marginBottom: '32px' }}>
          Upload your energy invoices, electricity, coal, diesel, water bills, or REC certificates (PDF, PNG, JPG formats allowed).
        </p>

        {/* ─── Drag & Drop Uploader Area ─── */}
        <div
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          style={{
            border: dragActive ? '2px dashed #10b981' : '2px dashed var(--panel-border)',
            background: dragActive ? 'rgba(16, 185, 129, 0.05)' : 'var(--panel-bg)',
            borderRadius: '16px',
            padding: '50px 30px',
            textAlign: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            marginBottom: '32px'
          }}
          onClick={onButtonClick}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileChange}
            style={{ display: 'none' }}
            accept=".pdf,.png,.jpg,.jpeg"
          />
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
            <UploadCloud size={48} color={dragActive ? '#10b981' : '#6b7280'} />
            <div>
              <p style={{ fontSize: '1.1rem', color: '#fff', fontWeight: 500, marginBottom: '6px' }}>
                Drag and drop files here, or <span style={{ color: '#10b981', textDecoration: 'underline' }}>browse</span>
              </p>
              <p style={{ color: '#6b7280', fontSize: '0.85rem' }}>
                Supports PDF, PNG, JPG, JPEG (Max 20MB per file)
              </p>
            </div>
          </div>
        </div>

        {/* ─── Upload progress bar ─── */}
        {uploading && (
          <div className="card" style={{ marginBottom: '24px', padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.85rem', color: '#9ca3af' }}>
              <span>Uploading files...</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
              <div style={{ width: `${progress}%`, height: '100%', background: 'linear-gradient(135deg, #10b981, #06b6d4)', transition: 'width 0.2s ease' }} />
            </div>
          </div>
        )}

        {/* ─── Processing Queue Tracker ─── */}
        {Object.keys(docStatuses).length > 0 && (
          <div className="card">
            <h3 style={{ fontSize: '1.1rem', color: '#fff', marginBottom: '20px', paddingBottom: '12px', borderBottom: '1px solid var(--panel-border)' }}>
              Processing Queue
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {Object.entries(docStatuses).map(([id, info]) => {
                const isProcessing = info.status === 'queued' || info.status === 'ocr_processing';
                const isAIReady = info.status === 'ai_extracting';
                const isCompleted = info.status === 'done';
                const isFailed = info.status === 'failed';

                return (
                  <div key={id} style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '16px',
                    borderRadius: '8px',
                    background: 'rgba(13, 18, 30, 0.4)',
                    border: '1px solid var(--panel-border)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                      <FileText size={20} color="#9ca3af" />
                      <div style={{ minWidth: 0 }}>
                        <p style={{ color: '#fff', fontSize: '0.9rem', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {info.name}
                        </p>
                        <p style={{ color: '#6b7280', fontSize: '0.75rem' }}>
                          {isProcessing && 'Extracting text and running agents...'}
                          {isAIReady && 'Ready for Human Review'}
                          {isCompleted && 'Extraction completed & approved'}
                          {isFailed && `Failed: ${info.error || 'Check file format'}`}
                        </p>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      {isProcessing && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#fbbf24', fontSize: '0.85rem' }}>
                          <Loader size={16} className="animate-spin" />
                          <span>{info.status === 'ocr_processing' ? 'Running OCR' : 'Queued'}</span>
                        </div>
                      )}
                      
                      {isAIReady && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem' }}>
                            <CheckCircle size={16} /> Extracted
                          </span>
                          <Link to={`/review/${id}`} className="btn btn-primary" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
                            Review
                          </Link>
                        </div>
                      )}

                      {isCompleted && (
                        <span style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem' }}>
                          <CheckCircle size={16} /> Approved
                        </span>
                      )}

                      {isFailed && (
                        <span style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem' }}>
                          <AlertCircle size={16} /> Failed
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UploadPage;
