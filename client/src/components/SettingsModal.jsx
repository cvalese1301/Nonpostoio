import React, { useState, useEffect } from 'react';
import { 
  X, Settings, Cloud, Key, Download, HardDrive, 
  Check, AlertCircle, RefreshCw, ExternalLink 
} from 'lucide-react';

export default function SettingsModal({ 
  isOpen, 
  onClose, 
  pcloudStatus, 
  onRefreshPcloudStatus 
}) {
  if (!isOpen) return null;

  const [pcloudToken, setPcloudToken] = useState('');
  const [pcloudRegion, setPcloudRegion] = useState('eu');
  const [aiKey, setAiKey] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [backupStatus, setBackupStatus] = useState(null);

  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then(data => {
        if (data.pcloud_token) setPcloudToken(data.pcloud_token);
        if (data.pcloud_region) setPcloudRegion(data.pcloud_region);
        if (data.ai_api_key) setAiKey(data.ai_api_key);
      })
      .catch(console.error);
  }, []);

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
          ai_api_key: aiKey
        })
      });
      setSaveSuccess(true);
      await onRefreshPcloudStatus();
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err) {
      alert('Errore salvataggio impostazioni.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRunBackup = async () => {
    setBackupStatus('Salvataggio backup in corso...');
    try {
      const res = await fetch('/api/settings/backup', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setBackupStatus(`Backup creato con successo (${data.backup.destination}): ${data.backup.filename}`);
      } else {
        setBackupStatus('Errore durante la creazione del backup.');
      }
    } catch (err) {
      setBackupStatus('Errore backup.');
    }
  };

  return (
    <div className="modal-overlay">
      <div className="standard-modal" style={{ maxWidth: 750 }}>
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title">
            <Settings size={22} color="#8B5CF6" />
            <span>Impostazioni & Archiviazione Cloud (pCloud & Render)</span>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSave} className="modal-content-scroll">
          {/* Section 1: pCloud Storage */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Cloud size={20} color="#10B981" />
              <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Archiviazione Cloud pCloud (Gratis 10GB)</h3>
            </div>
            <p style={{ fontSize: '0.82rem', color: '#94A3B8' }}>
              pCloud fornisce 10GB gratuiti per salvare le creatività foto e video senza occupare spazio sul server Render.com.
            </p>

            {/* Connection status pill */}
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
                placeholder="Incolla qui il tuo Access Token pCloud (o lascia vuoto per storage locale)"
                value={pcloudToken}
                onChange={(e) => setPcloudToken(e.target.value)}
              />
              <div style={{ fontSize: '0.74rem', color: '#94A3B8', marginTop: 6, lineHeight: 1.5, background: 'rgba(139, 92, 246, 0.08)', padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(139, 92, 246, 0.2)' }}>
                <strong style={{ color: '#E2E8F0' }}>Come ottenere il token in 30 secondi:</strong><br />
                1. Apri <a href="https://docs.pcloud.com/my_apps/" target="_blank" rel="noreferrer" style={{ color: '#A78BFA', textDecoration: 'underline', fontWeight: 600 }}>docs.pcloud.com/my_apps/</a> (o <a href="https://my.pcloud.com/#page=apps" target="_blank" rel="noreferrer" style={{ color: '#A78BFA', textDecoration: 'underline', fontWeight: 600 }}>my.pcloud.com/apps</a>)<br />
                2. Crea una nuova applicazione (es. <em>NonPosto</em>) con permessi standard.<br />
                3. Nella pagina dell'app, clicca <strong>"Generate access token"</strong>, copialo e incollalo nel campo qui sopra!
              </div>
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

          {/* Section 2: AI Settings */}
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

          <div style={{ height: 1, background: 'var(--border-subtle)' }} />

          {/* Section 3: Backup Database */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <HardDrive size={20} color="#F59E0B" />
              <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Backup e Persistenza su Render.com</h3>
            </div>
            <p style={{ fontSize: '0.82rem', color: '#94A3B8' }}>
              Puoi esportare in qualsiasi momento un backup completo in formato JSON di tutti i clienti, post, canali e copie, oppure salvarlo automaticamente su pCloud.
            </p>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={handleRunBackup}
              >
                <Download size={15} />
                <span>Esegui Backup Istantaneo</span>
              </button>
              {backupStatus && (
                <span style={{ fontSize: '0.8rem', color: '#10B981' }}>{backupStatus}</span>
              )}
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
