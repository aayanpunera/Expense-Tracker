import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, UploadCloud, Sparkles, Check, AlertCircle, Camera, FileText, ArrowRight } from 'lucide-react';
import Tesseract from 'tesseract.js';
import { api } from '../api';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';

export default function ReceiptScannerModal({ isOpen, onClose, onTransactionAdded }) {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { user } = useAuth();
  const currency = user?.currency || '₹';
  const fileInputRef = useRef(null);

  const [imagePreview, setImagePreview] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('');
  const [extractedData, setExtractedData] = useState(null);
  const [savingDirect, setSavingDirect] = useState(false);

  if (!isOpen) return null;

  const resetState = () => {
    setImagePreview(null);
    setSelectedFile(null);
    setScanning(false);
    setProgress(0);
    setStatusText('');
    setExtractedData(null);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      processSelectedFile(file);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      processSelectedFile(file);
    }
  };

  const processSelectedFile = (file) => {
    setSelectedFile(file);
    setExtractedData(null);
    const reader = new FileReader();
    reader.onload = () => {
      setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const startScan = async () => {
    if (!selectedFile && !imagePreview) {
      addToast('Please select or upload a receipt image first.', 'warning');
      return;
    }

    setScanning(true);
    setProgress(10);
    setStatusText('Initializing AI OCR Engine...');

    try {
      // 1. Run client-side Tesseract OCR via WebAssembly
      const result = await Tesseract.recognize(
        imagePreview || selectedFile,
        'eng',
        {
          logger: (m) => {
            if (m.status === 'recognizing text') {
              const p = Math.round((m.progress || 0) * 85);
              setProgress(15 + p);
              setStatusText(`Scanning text from receipt... ${Math.round((m.progress || 0) * 100)}%`);
            } else if (m.status === 'loading tesseract core') {
              setStatusText('Loading OCR neural weights...');
              setProgress(20);
            }
          },
        }
      );

      const rawText = result?.data?.text || '';
      setStatusText('Analyzing invoice details, merchant, and totals...');
      setProgress(95);

      // 2. Send extracted text to backend intelligent parser
      const res = await api.receipts.parse(rawText, selectedFile?.name || 'receipt.jpg');
      if (res.success && res.parsed) {
        setExtractedData(res.parsed);
        setProgress(100);
        setStatusText('Receipt successfully analyzed!');
        addToast('Receipt scanned & parsed successfully!', 'success');
      } else {
        throw new Error(res.error || 'Could not parse receipt fields');
      }
    } catch (err) {
      console.error('Scan error:', err);
      addToast(err.message || 'Receipt scanning failed. Try another angle or clearer image.', 'error');
      setStatusText('Scanning encountered an issue.');
    } finally {
      setScanning(false);
    }
  };

  const handleSaveDirect = async () => {
    if (!extractedData || extractedData.amount <= 0) {
      addToast('Cannot save transaction without a valid amount.', 'error');
      return;
    }

    setSavingDirect(true);
    try {
      await api.transactions.create({
        title: extractedData.title,
        amount: extractedData.amount,
        kind: 'expense',
        category: extractedData.category,
        payment_method: extractedData.payment_method,
        transaction_date: extractedData.transaction_date,
        note: extractedData.note,
      });

      addToast(`Added "${extractedData.title}" (${currency}${extractedData.amount}) to your records!`, 'success');
      if (onTransactionAdded) onTransactionAdded();
      handleClose();
    } catch (err) {
      addToast(err.message || 'Failed to save transaction', 'error');
    } finally {
      setSavingDirect(false);
    }
  };

  const handleEditInNewPage = () => {
    if (!extractedData) return;
    // Store in sessionStorage so NewTransaction can pick it up
    sessionStorage.setItem('spendwise_scanned_receipt', JSON.stringify(extractedData));
    handleClose();
    navigate('/transactions/new');
  };

  return (
    <div className="modal-backdrop" onClick={handleClose}>
      <div
        className="modal-card"
        style={{ maxWidth: 620, width: '95%' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="brand-logo" style={{ width: 34, height: 34, fontSize: 16 }}>
              <Camera size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: 17, fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
                Smart Receipt Scanner & OCR
              </h3>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
                Upload or snap a photo of any bill to extract merchant, total, and category
              </p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={handleClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body" style={{ padding: '20px 24px' }}>
          {/* Upload Area */}
          {!imagePreview ? (
            <div
              className="dropzone"
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: '2px dashed var(--border-color)',
                borderRadius: 'var(--radius-lg)',
                padding: '36px 20px',
                textAlign: 'center',
                cursor: 'pointer',
                background: 'var(--bg-card-secondary)',
                transition: 'all 0.2s',
              }}
            >
              <UploadCloud size={42} style={{ color: 'var(--primary)', marginBottom: 12, opacity: 0.8 }} />
              <h4 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 6px', color: 'var(--text-main)' }}>
                Click to browse or drag & drop receipt image
              </h4>
              <p style={{ fontSize: 12.5, color: 'var(--text-muted)', margin: '0 0 12px' }}>
                Supports JPG, PNG, WEBP, or phone camera snapshots
              </p>
              <span className="btn btn-secondary btn-sm" style={{ pointerEvents: 'none' }}>
                Choose File
              </span>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
            </div>
          ) : (
            <div>
              {/* Image Preview & Scanner Visual */}
              <div
                style={{
                  position: 'relative',
                  maxHeight: 220,
                  overflow: 'hidden',
                  borderRadius: 'var(--radius-md)',
                  background: '#000',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginBottom: 16,
                }}
              >
                <img
                  src={imagePreview}
                  alt="Receipt Preview"
                  style={{ maxHeight: 220, width: 'auto', objectFit: 'contain', opacity: scanning ? 0.7 : 1 }}
                />
                {scanning && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      background: 'rgba(79, 70, 229, 0.15)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                    }}
                  >
                    <Sparkles size={28} className="spin-icon" style={{ color: 'var(--primary-light)' }} />
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#fff', textShadow: '0 2px 4px rgba(0,0,0,0.6)' }}>
                      {statusText}
                    </span>
                  </div>
                )}
              </div>

              {/* Progress bar */}
              {scanning && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ height: 6, background: 'var(--border-color)', borderRadius: 99, overflow: 'hidden' }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${progress}%`,
                        background: 'var(--gradient-primary)',
                        transition: 'width 0.2s ease',
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Actions row before or after scan */}
              {!extractedData && !scanning && (
                <div style={{ display: 'flex', gap: 10, justifyContent: 'space-between', alignItems: 'center' }}>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => {
                      setImagePreview(null);
                      setSelectedFile(null);
                    }}
                  >
                    Change Image
                  </button>
                  <button className="btn btn-primary" onClick={startScan}>
                    <Sparkles size={16} />
                    Extract Receipt Data with AI
                  </button>
                </div>
              )}

              {/* Extracted Details Card */}
              {extractedData && (
                <div
                  style={{
                    background: 'var(--bg-card-secondary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    padding: 16,
                    marginTop: 14,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <div>
                      <span className="badge badge-income" style={{ fontSize: 11, marginBottom: 4, display: 'inline-block' }}>
                        ✓ OCR Parsed
                      </span>
                      <h4 style={{ fontSize: 16, fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
                        {extractedData.title || 'Parsed Receipt'}
                      </h4>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Detected Total</span>
                      <h3 style={{ fontSize: 20, fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
                        {currency}{Number(extractedData.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </h3>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, fontSize: 12.5, color: 'var(--text-muted)' }}>
                    <div>
                      <strong>Category:</strong>
                      <div style={{ color: 'var(--text-main)', marginTop: 2 }}>{extractedData.category}</div>
                    </div>
                    <div>
                      <strong>Date:</strong>
                      <div style={{ color: 'var(--text-main)', marginTop: 2 }}>{extractedData.transaction_date}</div>
                    </div>
                    <div>
                      <strong>Payment:</strong>
                      <div style={{ color: 'var(--text-main)', marginTop: 2 }}>{extractedData.payment_method}</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
                    <button
                      className="btn btn-primary"
                      style={{ flex: 1 }}
                      onClick={handleSaveDirect}
                      disabled={savingDirect || extractedData.amount <= 0}
                    >
                      <Check size={16} />
                      {savingDirect ? 'Saving...' : 'Save to Expenses Now'}
                    </button>
                    <button
                      className="btn btn-secondary"
                      style={{ flex: 1 }}
                      onClick={handleEditInNewPage}
                    >
                      Review & Edit Details
                      <ArrowRight size={15} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
