import React, { useState, useEffect } from 'react';
import { 
  X, Image as ImageIcon, UploadCloud, Trash2, ExternalLink, 
  HardDrive, Cloud, CheckCircle, RefreshCw 
} from 'lucide-react';

export default function MediaLibraryModal({ 
  isOpen, 
  onClose, 
  activeWorkspace, 
  pcloudStatus,
  onSelectMediaForPost 
}) {
  if (!isOpen) return null;

  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const fetchMedia = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/media?workspace_id=${activeWorkspace.id}`);
      const data = await res.json();
      setAssets(data);
    } catch (err) {
      console.error('Failed to load media:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMedia();
  }, [activeWorkspace.id]);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('workspace_id', activeWorkspace.id);

    try {
      const res = await fetch('/api/media/upload', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      await fetchMedia();
    } catch (err) {
      alert('Caricamento fallito.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="standard-modal" style={{ maxWidth: 850 }}>
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title">
            <Cloud size={22} color="#8B5CF6" />
            <span>Libreria Media Cloud ({activeWorkspace?.name})</span>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="modal-content-scroll">
          {/* Cloud Storage banner */}
          <div style={{
            background: pcloudStatus?.connected ? 'rgba(16, 185, 129, 0.1)' : 'rgba(139, 92, 246, 0.1)',
            border: `1px solid ${pcloudStatus?.connected ? 'rgba(16, 185, 129, 0.25)' : 'rgba(139, 92, 246, 0.25)'}`,
            borderRadius: 12,
            padding: 16,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <HardDrive size={28} color={pcloudStatus?.connected ? '#10B981' : '#8B5CF6'} />
              <div>
                <h4 style={{ fontSize: '0.92rem', fontWeight: 600 }}>
                  {pcloudStatus?.connected ? 'pCloud Storage Attivo' : 'Archiviazione Zero-Cost Attiva'}
                </h4>
                <p style={{ fontSize: '0.78rem', color: '#94A3B8' }}>
                  {pcloudStatus?.connected
                    ? `Account: ${pcloudStatus.email} | Spazio disponibile: ${pcloudStatus.quotaFreeMB} MB`
                    : 'I media sono archiviati localmente e pronti per Render. Inserisci il token pCloud in Impostazioni per il cloud 10GB.'}
                </p>
              </div>
            </div>

            <label className="btn-primary" style={{ cursor: 'pointer', margin: 0 }}>
              <UploadCloud size={16} />
              <span>{uploading ? 'Caricamento...' : 'Carica File'}</span>
              <input type="file" accept="image/*,video/*" style={{ display: 'none' }} onChange={handleUpload} disabled={uploading} />
            </label>
          </div>

          {/* Grid of assets */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#94A3B8' }}>
              Caricamento galleria media...
            </div>
          ) : assets.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#94A3B8' }}>
              Nessun file caricato per questo cliente. Carica un'immagine o video con il pulsante in alto.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 14 }}>
              {assets.map(asset => {
                const url = asset.pcloud_url || (asset.local_path ? `/uploads/${asset.pcloud_fileid}` : '');
                return (
                  <div 
                    key={asset.id}
                    style={{
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 10,
                      overflow: 'hidden',
                      display: 'flex',
                      flexDirection: 'column'
                    }}
                  >
                    <div style={{ height: 130, background: '#0F172A', overflow: 'hidden', position: 'relative' }}>
                      <img src={url} alt={asset.filename} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                    <div style={{ padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <span style={{ fontSize: '0.78rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {asset.filename}
                      </span>
                      <span style={{ fontSize: '0.68rem', color: '#94A3B8' }}>
                        {Math.round((asset.file_size || 0) / 1024)} KB
                      </span>
                      <button 
                        className="btn-secondary" 
                        style={{ marginTop: 4, padding: '4px 8px', fontSize: '0.72rem', width: '100%', justifyContent: 'center' }}
                        onClick={() => {
                          onSelectMediaForPost(url);
                          onClose();
                        }}
                      >
                        Usa nel Post
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>
            Totale asset cliente: {assets.length} file
          </span>
          <button className="btn-secondary" onClick={onClose}>
            Chiudi
          </button>
        </div>
      </div>
    </div>
  );
}
