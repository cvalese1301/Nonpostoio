import React, { useState, useEffect, useRef } from 'react';
import { 
  X, Settings, Cloud, Key, Download, HardDrive, 
  Check, AlertCircle, RefreshCw, ExternalLink,
  ShieldCheck, UploadCloud, DownloadCloud, Copy, FileText, CheckCircle2
} from 'lucide-react';

export default function SettingsModal({ 
  isOpen, 
  onClose, 
  pcloudStatus, 
  onRefreshPcloudStatus,
  onRefreshChannels
}) {
  if (!isOpen) return null;

  const [pcloudToken, setPcloudToken] = useState('');
  const [pcloudRegion, setPcloudRegion] = useState('eu');
  const [cloudinaryCloudName, setCloudinaryCloudName] = useState('');
  const [cloudinaryApiKey, setCloudinaryApiKey] = useState('');
  const [cloudinaryApiSecret, setCloudinaryApiSecret] = useState('');
  const [aiKey, setAiKey] = useState('');
  const [rawSettings, setRawSettings] = useState({});

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  
  // Cloud Sync Vault State
  const [cloudSyncStatus, setCloudSyncStatus] = useState(null);
  const [isSyncingCloud, setIsSyncingCloud] = useState(false);
  const [isRestoringCloud, setIsRestoringCloud] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchSettings();
    fetchCloudSyncStatus();
  }, []);

  const fetchSettings = () => {
    fetch('/api/settings')
      .then(r => r.json())
      .then(data => {
        setRawSettings(data || {});
        if (data.pcloud_token) setPcloudToken(data.pcloud_token);
        if (data.pcloud_region) setPcloudRegion(data.pcloud_region);
        if (data.cloudinary_cloud_name) setCloudinaryCloudName(data.cloudinary_cloud_name);
        if (data.cloudinary_api_key) setCloudinaryApiKey(data.cloudinary_api_key);
        if (data.cloudinary_api_secret) setCloudinaryApiSecret(data.cloudinary_api_secret);
        if (data.ai_api_key) setAiKey(data.ai_api_key);
      })
      .catch(console.error);
  };

  const fetchCloudSyncStatus = () => {
    fetch('/api/cloud-sync/status')
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          setCloudSyncStatus(data);
        }
      })
      .catch(console.error);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pcloud_token: pcloudToken,
          pcloud_region: pcloudRegion,
          cloudinary_cloud_name: cloudinaryCloudName,
          cloudinary_api_key: cloudinaryApiKey,
          cloudinary_api_secret: cloudinaryApiSecret,
          ai_api_key: aiKey
        })
      });
      setSaveSuccess(true);
      if (onRefreshPcloudStatus) await onRefreshPcloudStatus();
      fetchSettings();
      fetchCloudSyncStatus();
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err) {
      alert('Errore salvataggio impostazioni: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Manual Trigger: Cloud Sync Backup
  const handleCloudBackup = async () => {
    setIsSyncingCloud(true);
    setSyncFeedback(null);
    try {
      const res = await fetch('/api/cloud-sync/backup', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setSyncFeedback({
          type: 'success',
          message: `Backup Cloud Vault completato con successo! (${data.activeChannels} canali, ${data.totalPosts} post)`
        });
        fetchCloudSyncStatus();
      } else {
        setSyncFeedback({
          type: 'error',
          message: data.message || data.error || 'Errore durante il backup cloud.'
        });
      }
    } catch (err) {
      setSyncFeedback({ type: 'error', message: err.message });
    } finally {
      setIsSyncingCloud(false);
    }
  };

  // Manual Trigger: Cloud Sync Restore
  const handleCloudRestore = async () => {
    if (!window.confirm('Vuoi ripristinare canali, impostazioni e token OAuth dall\'ultimo backup Cloud Vault? I dati attuali verranno aggiornati con la versione del vault.')) {
      return;
    }
    setIsRestoringCloud(true);
    setSyncFeedback(null);
    try {
      const res = await fetch('/api/cloud-sync/restore', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setSyncFeedback({
          type: 'success',
          message: `Ripristino completato con successo! ${data.restoredChannels} canali e ${data.restoredSettings} impostazioni ripristinati.`
        });
        fetchSettings();
        fetchCloudSyncStatus();
        if (onRefreshChannels) onRefreshChannels();
      } else {
        setSyncFeedback({
          type: 'error',
          message: data.message || data.error || 'Nessun backup ripristinabile trovato.'
        });
      }
    } catch (err) {
      setSyncFeedback({ type: 'error', message: err.message });
    } finally {
      setIsRestoringCloud(false);
    }
  };

  // Download instant JSON backup file to user PC
  const handleDownloadBackupJson = () => {
    window.open('/api/cloud-sync/export-json', '_blank');
  };

  // Upload and restore from JSON file
  const handleFileImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    setIsRestoringCloud(true);
    setSyncFeedback(null);
    try {
      const res = await fetch('/api/cloud-sync/import-json', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (data.success) {
        setSyncFeedback({
          type: 'success',
          message: `File di backup importato con successo! (${data.restoredChannels} canali, ${data.restoredPosts} post)`
        });
        fetchSettings();
        fetchCloudSyncStatus();
        if (onRefreshChannels) onRefreshChannels();
      } else {
        setSyncFeedback({
          type: 'error',
          message: data.error || 'Errore importazione file di backup.'
        });
      }
    } catch (err) {
      setSyncFeedback({ type: 'error', message: err.message });
    } finally {
      setIsRestoringCloud(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Copy Render environment variables to clipboard
  const handleCopyRenderEnv = () => {
    const envLines = [
      `CLOUDINARY_CLOUD_NAME=${cloudinaryCloudName || rawSettings.cloudinary_cloud_name || ''}`,
      `CLOUDINARY_API_KEY=${cloudinaryApiKey || rawSettings.cloudinary_api_key || ''}`,
      `CLOUDINARY_API_SECRET=${cloudinaryApiSecret || rawSettings.cloudinary_api_secret || ''}`,
      `OAUTH_META_APP_ID=${rawSettings.oauth_meta_app_id || ''}`,
      `OAUTH_META_APP_SECRET=${rawSettings.oauth_meta_app_secret || ''}`,
      `OAUTH_THREADS_APP_ID=${rawSettings.oauth_threads_app_id || rawSettings.oauth_meta_app_id || ''}`,
      `OAUTH_THREADS_APP_SECRET=${rawSettings.oauth_threads_app_secret || rawSettings.oauth_meta_app_secret || ''}`,
      aiKey ? `AI_API_KEY=${aiKey}` : null,
      pcloudToken ? `PCLOUD_ACCESS_TOKEN=${pcloudToken}` : null
    ].filter(Boolean).join('\n');

    navigator.clipboard.writeText(envLines).then(() => {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 3000);
    }).catch(err => {
      alert('Impossibile copiare negli appunti: ' + err.message);
    });
  };

  return (
    <div className="modal-overlay">
      <div className="standard-modal" style={{ maxWidth: 800 }}>
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title">
            <Settings size={22} color="#8B5CF6" />
            <span>Impostazioni & Persistenza Cloud (Render Anti-Reset)</span>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSave} className="modal-content-scroll">
          
          {/* Section 0: ANTI-RESET / PERSISTENCE VAULT (HERO SECTION) */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(56, 189, 248, 0.08) 100%)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: 12,
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: 12
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <ShieldCheck size={24} color="#10B981" />
                <div>
                  <h3 style={{ fontSize: '1.02rem', fontWeight: 700, color: '#F8FAFC', margin: 0 }}>
                    Protezione Permanente Token OAuth & Canali
                  </h3>
                  <p style={{ fontSize: '0.78rem', color: '#94A3B8', margin: '2px 0 0 0' }}>
                    Salvaguardia automatica contro il reset del filesystem effimero di Render.com ad ogni deploy
                  </p>
                </div>
              </div>

              {cloudSyncStatus?.configured ? (
                <span style={{ 
                  display: 'inline-flex', 
                  alignItems: 'center', 
                  gap: 5, 
                  fontSize: '0.74rem', 
                  fontWeight: 600, 
                  background: 'rgba(16, 185, 129, 0.18)', 
                  color: '#10B981', 
                  border: '1px solid rgba(16, 185, 129, 0.35)', 
                  padding: '4px 10px', 
                  borderRadius: 20 
                }}>
                  <CheckCircle2 size={13} /> Cloud Vault Attivo ({cloudSyncStatus.cloud_name})
                </span>
              ) : (
                <span style={{ 
                  display: 'inline-flex', 
                  alignItems: 'center', 
                  gap: 5, 
                  fontSize: '0.74rem', 
                  fontWeight: 600, 
                  background: 'rgba(245, 158, 11, 0.15)', 
                  color: '#F59E0B', 
                  border: '1px solid rgba(245, 158, 11, 0.35)', 
                  padding: '4px 10px', 
                  borderRadius: 20 
                }}>
                  <AlertCircle size={13} /> Cloudinary Non Configurato
                </span>
              )}
            </div>

            <div style={{ fontSize: '0.8rem', color: '#CBD5E1', lineHeight: 1.5, background: 'rgba(15, 23, 42, 0.5)', padding: '10px 14px', borderRadius: 8, border: '1px solid rgba(148, 163, 184, 0.15)' }}>
              <strong>🚀 Come funziona la protezione automatica:</strong><br />
              1. Ogni volta che colleghi un canale (Facebook, Instagram, Threads) o salvi impostazioni, NonPosto effettua un <strong>backup istantaneo automatico</strong> nel Cloud Vault di Cloudinary.<br />
              2. Quando Render viene aggiornato o riavviato, il server <strong>riscarica automaticamente tutti i tuoi canali e token OAuth</strong> appena si accende, senza che tu debba fare nulla!
            </div>

            {/* Status indicators */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10, fontSize: '0.76rem' }}>
              <div style={{ background: 'rgba(0,0,0,0.2)', padding: '8px 12px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.06)' }}>
                <span style={{ color: '#94A3B8' }}>Canali protetti attivi:</span><br />
                <strong style={{ color: '#F1F5F9', fontSize: '0.9rem' }}>{cloudSyncStatus?.activeChannels || 0} canali collegati</strong>
              </div>
              <div style={{ background: 'rgba(0,0,0,0.2)', padding: '8px 12px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.06)' }}>
                <span style={{ color: '#94A3B8' }}>Ultima sincronizzazione cloud:</span><br />
                <strong style={{ color: '#F1F5F9' }}>
                  {cloudSyncStatus?.lastSyncAt ? new Date(cloudSyncStatus.lastSyncAt).toLocaleString('it-IT') : 'Nessuna recente'}
                </strong>
              </div>
            </div>

            {/* Sync feedback banner */}
            {syncFeedback && (
              <div style={{
                padding: '8px 12px',
                borderRadius: 8,
                fontSize: '0.8rem',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                background: syncFeedback.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                border: `1px solid ${syncFeedback.type === 'success' ? '#10B981' : '#EF4444'}`,
                color: syncFeedback.type === 'success' ? '#10B981' : '#EF4444'
              }}>
                {syncFeedback.type === 'success' ? <Check size={16} /> : <AlertCircle size={16} />}
                <span>{syncFeedback.message}</span>
              </div>
            )}

            {/* Quick Action Buttons */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginTop: 4 }}>
              <button
                type="button"
                className="btn-secondary"
                style={{ fontSize: '0.76rem', padding: '6px 12px', background: 'rgba(56, 189, 248, 0.12)', color: '#38BDF8', borderColor: 'rgba(56, 189, 248, 0.3)' }}
                onClick={handleCloudBackup}
                disabled={isSyncingCloud}
              >
                <UploadCloud size={14} />
                <span>{isSyncingCloud ? 'Sincronizzazione...' : 'Sincronizza Cloud Ora'}</span>
              </button>

              <button
                type="button"
                className="btn-secondary"
                style={{ fontSize: '0.76rem', padding: '6px 12px' }}
                onClick={handleCloudRestore}
                disabled={isRestoringCloud}
              >
                <RefreshCw size={13} className={isRestoringCloud ? 'spin' : ''} />
                <span>{isRestoringCloud ? 'Ripristino...' : 'Ripristina da Cloud Ora'}</span>
              </button>

              <button
                type="button"
                className="btn-secondary"
                style={{ fontSize: '0.76rem', padding: '6px 12px' }}
                onClick={handleDownloadBackupJson}
                title="Scarica un file JSON completo di backup sul tuo computer"
              >
                <DownloadCloud size={14} />
                <span>Scarica Backup (.json)</span>
              </button>

              <input 
                type="file" 
                ref={fileInputRef} 
                style={{ display: 'none' }} 
                accept=".json" 
                onChange={handleFileImport} 
              />
              <button
                type="button"
                className="btn-secondary"
                style={{ fontSize: '0.76rem', padding: '6px 12px' }}
                onClick={() => fileInputRef.current?.click()}
                title="Carica e ripristina un file JSON di backup precedente"
              >
                <FileText size={14} />
                <span>Ripristina da File (.json)</span>
              </button>

              <button
                type="button"
                className="btn-secondary"
                style={{ fontSize: '0.76rem', padding: '6px 12px', marginLeft: 'auto', background: 'rgba(139, 92, 246, 0.12)', color: '#A78BFA', borderColor: 'rgba(139, 92, 246, 0.3)' }}
                onClick={handleCopyRenderEnv}
                title="Copia le variabili d'ambiente per il pannello Environment di Render.com"
              >
                {copySuccess ? <Check size={14} color="#10B981" /> : <Copy size={14} />}
                <span>{copySuccess ? 'Copiato!' : 'Copia Variabili per Render'}</span>
              </button>
            </div>
          </div>

          {/* Section 1: Cloudinary Storage */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Cloud size={20} color="#38BDF8" />
                <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Archiviazione Cloudinary (25GB Gratis & Cloud Vault)</h3>
              </div>
              <span style={{ fontSize: '0.68rem', fontWeight: 700, background: 'rgba(56, 189, 248, 0.15)', color: '#38BDF8', border: '1px solid rgba(56, 189, 248, 0.3)', padding: '2px 8px', borderRadius: 4 }}>
                RACCOMANDATA
              </span>
            </div>
            <p style={{ fontSize: '0.82rem', color: '#94A3B8' }}>
              Fornisce 25GB gratuiti per media foto/video e funge da <strong>Cloud Vault permanente</strong> per preservare tutti i token OAuth e canali collegati ad ogni deploy di Render.
            </p>

            <div style={{ fontSize: '0.74rem', color: '#94A3B8', lineHeight: 1.5, background: 'rgba(56, 189, 248, 0.08)', padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(56, 189, 248, 0.2)' }}>
              <strong style={{ color: '#E2E8F0' }}>Trova le credenziali nella console Cloudinary:</strong><br />
              Accedi a <a href="https://console.cloudinary.com/pm" target="_blank" rel="noreferrer" style={{ color: '#38BDF8', textDecoration: 'underline', fontWeight: 600 }}>console.cloudinary.com</a> e copia <strong>Cloud name</strong>, <strong>API Key</strong> e <strong>API Secret</strong>.
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div className="form-group">
                <label>Cloud Name:</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Es. dxyz123ab"
                  value={cloudinaryCloudName}
                  onChange={(e) => setCloudinaryCloudName(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>API Key:</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Es. 123456789012345"
                  value={cloudinaryApiKey}
                  onChange={(e) => setCloudinaryApiKey(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group">
              <label>API Secret:</label>
              <input
                type="password"
                className="input-field"
                placeholder="Incolla qui l'API Secret di Cloudinary"
                value={cloudinaryApiSecret}
                onChange={(e) => setCloudinaryApiSecret(e.target.value)}
              />
            </div>
          </div>

          <div style={{ height: 1, background: 'var(--border-subtle)' }} />

          {/* Section 2: pCloud Storage */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Cloud size={20} color="#10B981" />
              <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Archiviazione Cloud pCloud (Gratis 10GB)</h3>
            </div>
            <p style={{ fontSize: '0.82rem', color: '#94A3B8' }}>
              Opzione secondaria per il salvataggio file su account pCloud.
            </p>

            <div style={{
              background: pcloudStatus?.connected ? 'rgba(16, 185, 129, 0.1)' : 'rgba(148, 163, 184, 0.1)',
              border: `1px solid ${pcloudStatus?.connected ? 'rgba(16, 185, 129, 0.25)' : 'rgba(148, 163, 184, 0.25)'}`,
              borderRadius: 10,
              padding: '10px 14px',
              fontSize: '0.82rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <span>{pcloudStatus?.message || 'Verifica stato pCloud...'}</span>
              <button 
                type="button" 
                className="btn-secondary" 
                style={{ padding: '4px 8px', fontSize: '0.72rem' }}
                onClick={onRefreshPcloudStatus}
              >
                <RefreshCw size={12} /> Ricontrolla
              </button>
            </div>

            <div className="form-group">
              <label>pCloud Access Token (OAuth2):</label>
              <input
                type="password"
                className="input-field"
                placeholder="Access Token pCloud"
                value={pcloudToken}
                onChange={(e) => setPcloudToken(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Regione Account pCloud:</label>
              <select
                className="input-field"
                value={pcloudRegion}
                onChange={(e) => setPcloudRegion(e.target.value)}
              >
                <option value="eu">Europa (eapi.pcloud.com - Standard per account EU)</option>
                <option value="us">Stati Uniti (api.pcloud.com)</option>
              </select>
            </div>
          </div>

          <div style={{ height: 1, background: 'var(--border-subtle)' }} />

          {/* Section 3: AI Settings */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Key size={20} color="#8B5CF6" />
              <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Chiave API OpenAI / Claude (Opzionale)</h3>
            </div>
            <p style={{ fontSize: '0.82rem', color: '#94A3B8' }}>
              Se non inserita, NonPosto.io utilizza il suo motore algoritmico intelligente integrato a costo zero per ottimizzare i testi per tutti gli 8 canali.
            </p>

            <div className="form-group">
              <label>OpenAI / AI Key:</label>
              <input
                type="password"
                className="input-field"
                placeholder="sk-..."
                value={aiKey}
                onChange={(e) => setAiKey(e.target.value)}
              />
            </div>
          </div>

          {saveSuccess && (
            <div style={{ padding: '8px 12px', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid #10B981', borderRadius: 8, color: '#10B981', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Check size={16} /> Impostazioni salvate con successo!
            </div>
          )}

          {/* Footer inside form */}
          <div className="modal-footer" style={{ margin: '10px -24px -24px -24px' }}>
            <button type="button" className="btn-secondary" onClick={onClose}>
              Chiudi
            </button>
            <button type="submit" className="btn-primary" disabled={isSaving}>
              <span>{isSaving ? 'Salvataggio...' : 'Salva Impostazioni'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
