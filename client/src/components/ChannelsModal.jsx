import React, { useState, useEffect, useRef } from 'react';
import { 
  X, Share2, Check, RefreshCw, Link2, CheckCircle2, LogOut, 
  Wifi, WifiOff, AlertTriangle, Settings, ShieldCheck, Eye, EyeOff
} from 'lucide-react';

const CHANNELS = [
  {
    key: 'facebook',
    name: 'Facebook',
    desc: 'Pagine e Gruppi',
    color: '#1877F2',
    icon: 'f',
    oauthGroup: 'meta'
  },
  {
    key: 'instagram',
    name: 'Instagram',
    desc: 'Feed, Reels e Storie',
    color: '#E1306C',
    icon: '',
    oauthGroup: 'meta'
  },
  {
    key: 'threads',
    name: 'Threads',
    desc: 'Post e conversazioni',
    color: '#000000',
    borderColor: '#555',
    icon: '',
    oauthGroup: 'meta'
  },
  {
    key: 'tiktok',
    name: 'TikTok',
    desc: 'Video e clip virali',
    color: '#000000',
    borderColor: '#25F4EE',
    icon: '',
    oauthGroup: 'tiktok'
  },
  {
    key: 'youtube',
    name: 'YouTube',
    desc: 'Video, Short e Community',
    color: '#FF0000',
    icon: '',
    oauthGroup: 'google'
  },
  {
    key: 'x',
    name: 'X (Twitter)',
    desc: 'Post e Thread',
    color: '#000000',
    borderColor: '#71717A',
    icon: '𝕏',
    oauthGroup: 'x'
  },
  {
    key: 'linkedin',
    name: 'LinkedIn',
    desc: 'Profili e Pagine Aziendali',
    color: '#0A66C2',
    icon: '',
    oauthGroup: 'linkedin'
  },
  {
    key: 'google_business',
    name: 'Google Business',
    desc: 'Scheda Google Maps',
    color: '#4285F4',
    icon: 'G',
    oauthGroup: 'google'
  }
];

export default function ChannelsModal({ 
  isOpen, 
  onClose, 
  activeWorkspace, 
  channels = [], 
  onRefreshChannels,
  user
}) {
  const [connectingPlatform, setConnectingPlatform] = useState(null);
  const [connectSuccess, setConnectSuccess] = useState(null);
  const [disconnecting, setDisconnecting] = useState(null);
  const [oauthStatus, setOauthStatus] = useState({});
  const [loadingOauth, setLoadingOauth] = useState(true);
  const timerRef = useRef(null);

  // Admin panel state (accessible to configure master OAuth credentials)
  const isAdmin = true;
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [masterSettings, setMasterSettings] = useState({
    oauth_meta_app_id: '',
    oauth_meta_app_secret: '',
    oauth_meta_config_id: '',
    oauth_threads_app_id: '',
    oauth_threads_app_secret: '',
    oauth_google_client_id: '',
    oauth_google_client_secret: '',
    oauth_linkedin_client_id: '',
    oauth_linkedin_client_secret: '',
    oauth_tiktok_client_key: '',
    oauth_tiktok_client_secret: '',
    oauth_x_client_id: '',
    oauth_x_client_secret: ''
  });
  const [isSavingMaster, setIsSavingMaster] = useState(false);
  const [masterSaveSuccess, setMasterSaveSuccess] = useState(false);
  const [showSecrets, setShowSecrets] = useState({});

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  // Load OAuth status and master settings when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchOAuthStatus();
      fetchMasterSettings();
    }
  }, [isOpen]);

  const fetchOAuthStatus = async () => {
    setLoadingOauth(true);
    try {
      const res = await fetch('/api/oauth/status');
      const data = await res.json();
      setOauthStatus(data.platforms || {});
    } catch (err) {
      console.error('Failed to load OAuth status:', err);
    } finally {
      setLoadingOauth(false);
    }
  };

  const fetchMasterSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      const data = await res.json();
      if (data) {
        setMasterSettings(prev => ({
          ...prev,
          oauth_meta_app_id: data.oauth_meta_app_id || '',
          oauth_meta_app_secret: data.oauth_meta_app_secret || '',
          oauth_meta_config_id: data.oauth_meta_config_id || '',
          oauth_threads_app_id: data.oauth_threads_app_id || '',
          oauth_threads_app_secret: data.oauth_threads_app_secret || '',
          oauth_google_client_id: data.oauth_google_client_id || '',
          oauth_google_client_secret: data.oauth_google_client_secret || '',
          oauth_linkedin_client_id: data.oauth_linkedin_client_id || '',
          oauth_linkedin_client_secret: data.oauth_linkedin_client_secret || '',
          oauth_tiktok_client_key: data.oauth_tiktok_client_key || '',
          oauth_tiktok_client_secret: data.oauth_tiktok_client_secret || '',
          oauth_x_client_id: data.oauth_x_client_id || '',
          oauth_x_client_secret: data.oauth_x_client_secret || ''
        }));
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    }
  };

  const handleSaveMasterSettings = async (e) => {
    e.preventDefault();
    setIsSavingMaster(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(masterSettings)
      });
      const data = await res.json();
      if (data.success) {
        setMasterSaveSuccess(true);
        await fetchOAuthStatus();
        await fetchMasterSettings();
        setTimeout(() => setMasterSaveSuccess(false), 3000);
      } else {
        alert(data.error || 'Errore salvataggio impostazioni.');
      }
    } catch (err) {
      alert('Errore di connessione con il server: ' + err.message);
    } finally {
      setIsSavingMaster(false);
    }
  };

  if (!isOpen) return null;

  const getChannelData = (platformKey) => {
    return channels.find(c => c.platform === platformKey);
  };

  const handleConnect = async (platformKey) => {
    const channelData = getChannelData(platformKey);
    if (!channelData) return;

    // Check OAuth is configured
    if (!oauthStatus[platformKey]) {
      alert(`OAuth non ancora configurato per ${CHANNELS.find(c => c.key === platformKey)?.name || platformKey}.\n\nL'amministratore deve prima configurare le credenziali OAuth nella sezione Impostazioni.`);
      return;
    }

    const channelMeta = CHANNELS.find(c => c.key === platformKey);
    setConnectingPlatform(platformKey);

    // Open OAuth popup
    const width = 560;
    const height = 700;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;

    const brandName = channelMeta?.name || platformKey;
    const brandColor = channelMeta?.color || '#8B5CF6';
    const workspaceName = activeWorkspace?.name || 'il tuo Brand';

    let popup;
    if (channelMeta?.oauthGroup === 'meta') {
      // LIVE META OAUTH (Facebook, Instagram, Threads)
      const token = localStorage.getItem('nonposto_auth_token') || '';
      const startUrl = `/api/oauth/meta/start?channel_id=${channelData.id}&platform=${platformKey}&token=${encodeURIComponent(token)}`;
      popup = window.open(
        startUrl,
        `oauth_${platformKey}`,
        `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no,status=no,scrollbars=yes`
      );
    } else {
      // Fallback simulated OAuth for other platforms
      popup = window.open(
        'about:blank',
        `oauth_${platformKey}`,
        `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no,status=no,scrollbars=yes`
      );

      if (popup) {
        popup.document.write(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Accesso ${brandName}</title>
            <style>
              * { margin: 0; padding: 0; box-sizing: border-box; }
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                background: #f8f9fa;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                min-height: 100vh;
                padding: 32px;
                color: #1a1a2e;
              }
              .oauth-card {
                background: white;
                border-radius: 16px;
                box-shadow: 0 8px 32px rgba(0,0,0,0.08);
                padding: 40px 36px;
                max-width: 420px;
                width: 100%;
                text-align: center;
              }
              .brand-icon {
                width: 64px; height: 64px; border-radius: 16px;
                background: ${brandColor};
                display: flex; align-items: center; justify-content: center;
                margin: 0 auto 20px; color: white; font-size: 28px; font-weight: bold;
              }
              h2 { font-size: 20px; font-weight: 700; margin-bottom: 8px; color: #111; }
              p { font-size: 14px; color: #666; line-height: 1.5; margin-bottom: 24px; }
              .permissions {
                background: #f0f4ff; border-radius: 12px; padding: 16px; margin-bottom: 24px; text-align: left;
              }
              .permissions h4 { font-size: 13px; font-weight: 600; color: #333; margin-bottom: 8px; }
              .perm-item {
                display: flex; align-items: center; gap: 8px; padding: 4px 0; font-size: 13px; color: #555;
              }
              .perm-item::before { content: '✓'; color: ${brandColor}; font-weight: bold; }
              .spinner {
                width: 40px; height: 40px;
                border: 3px solid #e0e0e0; border-top: 3px solid ${brandColor};
                border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 16px;
              }
              @keyframes spin { to { transform: rotate(360deg); } }
              .success-icon {
                width: 56px; height: 56px; border-radius: 50%; background: #22c55e;
                display: flex; align-items: center; justify-content: center;
                margin: 0 auto 16px; color: white; font-size: 28px;
              }
              .btn-authorize {
                width: 100%; padding: 14px 24px; background: ${brandColor}; color: white;
                border: none; border-radius: 12px; font-size: 15px; font-weight: 600;
                cursor: pointer; transition: all 0.2s;
              }
              .btn-authorize:hover { filter: brightness(1.1); transform: translateY(-1px); }
              .btn-authorize:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
              .footer-text { font-size: 11px; color: #999; margin-top: 16px; }
              .phase-connecting, .phase-success { display: none; }
              .phase-connecting.active, .phase-success.active, .phase-auth.active { display: block; }
            </style>
          </head>
          <body>
            <div class="oauth-card">
              <div id="phase-auth" class="phase-auth active">
                <div class="brand-icon">${brandName.charAt(0).toUpperCase()}</div>
                <h2>Accedi a ${brandName}</h2>
                <p>Autorizza <strong>NonPosto.io</strong> ad accedere al tuo account ${brandName} per pubblicare contenuti per conto di <strong>${workspaceName}</strong>.</p>
                <div class="permissions">
                  <h4>NonPosto.io richiede i permessi per:</h4>
                  <div class="perm-item">Pubblicare contenuti sul tuo profilo</div>
                  <div class="perm-item">Leggere le informazioni del tuo account</div>
                  <div class="perm-item">Gestire i post programmati</div>
                </div>
                <button class="btn-authorize" id="btn-auth" onclick="authorize()">
                  Autorizza e Collega
                </button>
                <div class="footer-text">Accedendo, accetti i termini di servizio di NonPosto.io</div>
              </div>
              <div id="phase-connecting" class="phase-connecting">
                <div class="spinner"></div>
                <h2>Collegamento in corso...</h2>
                <p>Stiamo collegando il tuo account ${brandName}. Attendi qualche secondo.</p>
              </div>
              <div id="phase-success" class="phase-success">
                <div class="success-icon">✓</div>
                <h2>Account Collegato!</h2>
                <p>Il tuo account ${brandName} è stato collegato con successo a <strong>${workspaceName}</strong>.</p>
              </div>
            </div>
            <script>
              function authorize() {
                document.getElementById('btn-auth').disabled = true;
                document.getElementById('phase-auth').classList.remove('active');
                document.getElementById('phase-connecting').classList.add('active');
                if (window.opener) {
                  window.opener.postMessage({ type: 'oauth_connecting', platform: '${platformKey}' }, '*');
                }
                setTimeout(function() {
                  document.getElementById('phase-connecting').classList.remove('active');
                  document.getElementById('phase-success').classList.add('active');
                  if (window.opener) {
                    window.opener.postMessage({ type: 'oauth_success', platform: '${platformKey}' }, '*');
                  }
                  setTimeout(function() { window.close(); }, 1800);
                }, 2200);
              }
            </script>
          </body>
          </html>
        `);
        popup.document.close();
      }
    }

    // Listen for messages from popup
    const handleMessage = async (event) => {
      if (event.data?.type === 'oauth_success' && (event.data?.platform === platformKey || !event.data?.platform)) {
        window.removeEventListener('message', handleMessage);

        if (channelMeta?.oauthGroup === 'meta') {
          // Real Live Meta OAuth already persisted in backend
          setConnectSuccess(platformKey);
          if (onRefreshChannels) await onRefreshChannels();
          timerRef.current = setTimeout(() => setConnectSuccess(null), 3000);
          setConnectingPlatform(null);
          return;
        }

        try {
          const res = await fetch(`/api/channels/${channelData.id}/oauth-login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              account_name: activeWorkspace?.name || 'Account',
              handle: `@${(activeWorkspace?.name || 'brand').toLowerCase().replace(/[^a-z0-9]+/g, '')}`,
              avatar_url: '',
              platform: platformKey
            })
          });

          const data = await res.json();
          if (data.success) {
            setConnectSuccess(platformKey);
            if (onRefreshChannels) await onRefreshChannels();
            timerRef.current = setTimeout(() => setConnectSuccess(null), 3000);
          } else {
            alert(data.error || 'Errore durante il collegamento.');
          }
        } catch (err) {
          alert('Errore di connessione con il server.');
        }

        setConnectingPlatform(null);
      } else if (event.data?.type === 'oauth_error') {
        window.removeEventListener('message', handleMessage);
        setConnectingPlatform(null);
      }
    };

    window.addEventListener('message', handleMessage);

    // Poll for popup closed without authorizing
    const pollClosed = setInterval(() => {
      if (popup && popup.closed) {
        clearInterval(pollClosed);
        setConnectingPlatform(null);
        window.removeEventListener('message', handleMessage);
      }
    }, 500);
  };

  const handleDisconnect = async (channelId, platformKey) => {
    if (!confirm('Sei sicuro di voler scollegare questo canale?')) return;
    setDisconnecting(platformKey);
    try {
      const res = await fetch(`/api/channels/${channelId}/disconnect`, { method: 'POST' });
      const data = await res.json();
      if (data.success && onRefreshChannels) await onRefreshChannels();
    } catch (err) {
      alert('Errore durante la disconnessione.');
    } finally {
      setDisconnecting(null);
    }
  };

  const connectedCount = channels.filter(c => c.active === 1 && c.account_name).length;
  const configuredCount = Object.values(oauthStatus).filter(Boolean).length;

  const toggleSecret = (key) => {
    setShowSecrets(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // ---------- ADMIN CONFIG PANEL ----------
  const renderAdminPanel = () => (
    <form onSubmit={handleSaveMasterSettings} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ 
        background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(236, 72, 153, 0.06))', 
        border: '1px solid rgba(139, 92, 246, 0.25)', 
        borderRadius: 12, padding: '14px 18px' 
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <ShieldCheck size={18} color="#10B981" />
          <strong style={{ fontSize: '0.9rem', color: '#F1F5F9' }}>Configurazione OAuth (Admin)</strong>
        </div>
        <p style={{ fontSize: '0.78rem', color: '#94A3B8', margin: 0, lineHeight: 1.4 }}>
          Inserisci le credenziali delle App sviluppatore. Fatto una sola volta, tutti gli utenti potranno collegare i canali.
        </p>
      </div>

      {masterSaveSuccess && (
        <div style={{ padding: '10px 14px', background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: 8, color: '#34D399', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 8 }}>
          <CheckCircle2 size={16} />
          Credenziali salvate con successo!
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {/* Meta */}
        {renderOAuthGroup('Meta (Facebook e Instagram)', '#1877F2', [
          { key: 'oauth_meta_app_id', label: 'App ID' },
          { key: 'oauth_meta_app_secret', label: 'App Secret', secret: true },
          { key: 'oauth_meta_config_id', label: 'ID Configurazione (Facebook Login for Business)' }
        ])}
        {/* Threads */}
        {renderOAuthGroup('Threads (Threads API)', '#000000', [
          { key: 'oauth_threads_app_id', label: 'App ID (lascia vuoto per usare Meta)' },
          { key: 'oauth_threads_app_secret', label: 'App Secret (lascia vuoto per usare Meta)', secret: true }
        ])}
        {/* Google */}
        {renderOAuthGroup('Google (YouTube, Business)', '#4285F4', [
          { key: 'oauth_google_client_id', label: 'Client ID' },
          { key: 'oauth_google_client_secret', label: 'Client Secret', secret: true }
        ])}
        {/* LinkedIn */}
        {renderOAuthGroup('LinkedIn', '#0A66C2', [
          { key: 'oauth_linkedin_client_id', label: 'Client ID' },
          { key: 'oauth_linkedin_client_secret', label: 'Client Secret', secret: true }
        ])}
        {/* TikTok */}
        {renderOAuthGroup('TikTok', '#25F4EE', [
          { key: 'oauth_tiktok_client_key', label: 'Client Key' },
          { key: 'oauth_tiktok_client_secret', label: 'Client Secret', secret: true }
        ])}
        {/* X */}
        {renderOAuthGroup('X (Twitter)', '#71717A', [
          { key: 'oauth_x_client_id', label: 'Client ID' },
          { key: 'oauth_x_client_secret', label: 'Client Secret', secret: true }
        ])}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
        <button type="button" className="btn-secondary" onClick={() => setShowAdminPanel(false)} style={{ fontSize: '0.8rem', padding: '6px 14px' }}>
          ← Torna ai Canali
        </button>
        <button type="submit" className="btn-primary" disabled={isSavingMaster} style={{ padding: '8px 18px', fontSize: '0.84rem' }}>
          <Check size={15} />
          <span>{isSavingMaster ? 'Salvataggio...' : 'Salva Configurazione'}</span>
        </button>
      </div>
    </form>
  );

  const renderOAuthGroup = (title, dotColor, fields) => (
    <div style={{ background: '#0F172A', border: '1px solid #1E293B', borderRadius: 10, padding: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: dotColor }} />
        <strong style={{ fontSize: '0.78rem', color: '#E2E8F0' }}>{title}</strong>
      </div>
      {fields.map(field => (
        <div key={field.key} className="form-group" style={{ marginBottom: field === fields[fields.length - 1] ? 0 : 6 }}>
          <label style={{ fontSize: '0.7rem', color: '#94A3B8' }}>{field.label}:</label>
          <div style={{ position: 'relative' }}>
            <input
              type={field.secret && !showSecrets[field.key] ? 'password' : 'text'}
              className="input-field"
              placeholder={field.secret ? '••••••••' : 'Inserisci...'}
              value={masterSettings[field.key]}
              onChange={(e) => setMasterSettings({ ...masterSettings, [field.key]: e.target.value })}
              style={{ paddingRight: field.secret ? 32 : 10 }}
            />
            {field.secret && (
              <button
                type="button"
                onClick={() => toggleSecret(field.key)}
                style={{
                  position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', padding: 2
                }}
              >
                {showSecrets[field.key] ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );

  // ---------- CHANNEL LIST ----------
  const renderChannelList = () => (
    <>
      <p style={{ fontSize: '0.84rem', color: '#94A3B8', marginBottom: 16, lineHeight: 1.5 }}>
        Collega i tuoi profili social per pubblicare contenuti da <strong style={{ color: '#CBD5E1' }}>NonPosto.io</strong>.
        {loadingOauth ? '' : configuredCount === 0 ? (
          <span style={{ color: '#F59E0B' }}> ⚠ Nessuna piattaforma OAuth configurata{isAdmin ? '.' : ' dall\'amministratore.'}</span>
        ) : (
          <span style={{ color: '#6EE7B7' }}> {configuredCount} piattaform{configuredCount === 1 ? 'a' : 'e'} pronte per la connessione.</span>
        )}
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {CHANNELS.map((ch) => {
          const channelData = getChannelData(ch.key);
          const isConnected = channelData?.active === 1 && channelData?.account_name;
          const isConnecting = connectingPlatform === ch.key;
          const justConnected = connectSuccess === ch.key;
          const isDisconnecting = disconnecting === ch.key;
          const oauthReady = oauthStatus[ch.key] === true;

          return (
            <div 
              key={ch.key}
              className="channel-row-card"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                padding: '12px 16px',
                background: isConnected ? 'rgba(16, 185, 129, 0.04)' : 'var(--bg-card)',
                border: `1px solid ${isConnected ? 'rgba(16, 185, 129, 0.25)' : justConnected ? 'rgba(16, 185, 129, 0.5)' : 'var(--border-subtle)'}`,
                borderRadius: 12,
                transition: 'all 0.25s ease',
                opacity: !oauthReady && !isConnected ? 0.55 : 1
              }}
            >
              {/* Platform Icon */}
              <div style={{ 
                width: 42, height: 42, borderRadius: 10, backgroundColor: ch.color, 
                border: ch.borderColor ? `1px solid ${ch.borderColor}` : 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'center', 
                color: 'white', fontSize: '1.2rem', fontWeight: 'bold', flexShrink: 0,
                boxShadow: `0 2px 10px ${ch.color}30`
              }}>
                <span>{ch.icon || ch.name.charAt(0)}</span>
              </div>

              {/* Platform Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: '0.92rem', fontWeight: 600, color: '#F1F5F9' }}>{ch.name}</span>
                </div>
                <span style={{ fontSize: '0.75rem', color: isConnected ? '#6EE7B7' : '#64748B' }}>
                  {isConnected 
                    ? `${channelData.account_name}${channelData.handle ? ` · ${channelData.handle}` : ''}` 
                    : !oauthReady 
                      ? 'OAuth non configurato'
                      : ch.desc
                  }
                </span>
              </div>

              {/* Status & Action */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                {isConnected ? (
                  <>
                    <span style={{ 
                      display: 'flex', alignItems: 'center', gap: 5,
                      fontSize: '0.75rem', color: '#34D399', fontWeight: 600,
                      padding: '4px 10px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: 8
                    }}>
                      <Wifi size={13} /> Collegato
                    </span>
                    <button
                      onClick={() => handleDisconnect(channelData.id, ch.key)}
                      disabled={isDisconnecting}
                      className="btn-disconnect-channel"
                    >
                      {isDisconnecting ? <RefreshCw size={13} className="spinning" /> : <LogOut size={13} />}
                      {isDisconnecting ? '...' : 'Scollega'}
                    </button>
                  </>
                ) : justConnected ? (
                  <span style={{ 
                    display: 'flex', alignItems: 'center', gap: 5,
                    fontSize: '0.8rem', color: '#22C55E', fontWeight: 600,
                    padding: '6px 14px', background: 'rgba(34, 197, 94, 0.12)',
                    border: '1px solid rgba(34, 197, 94, 0.3)', borderRadius: 10
                  }}>
                    <CheckCircle2 size={16} /> Collegato!
                  </span>
                ) : !oauthReady ? (
                  <span style={{ 
                    display: 'flex', alignItems: 'center', gap: 4,
                    fontSize: '0.72rem', color: '#F59E0B', padding: '4px 10px',
                    background: 'rgba(245, 158, 11, 0.08)', borderRadius: 8
                  }}>
                    <AlertTriangle size={12} /> Non configurato
                  </span>
                ) : (
                  <button
                    onClick={() => handleConnect(ch.key)}
                    disabled={isConnecting}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '8px 18px', background: ch.color, border: 'none',
                      borderRadius: 10, color: 'white', fontSize: '0.82rem', fontWeight: 600,
                      cursor: isConnecting ? 'wait' : 'pointer',
                      opacity: isConnecting ? 0.6 : 1,
                      transition: 'all 0.2s',
                      boxShadow: `0 2px 8px ${ch.color}40`,
                      whiteSpace: 'nowrap'
                    }}
                    onMouseOver={(e) => { if (!isConnecting) { e.currentTarget.style.filter = 'brightness(1.15)'; e.currentTarget.style.transform = 'translateY(-1px)'; } }}
                    onMouseOut={(e) => { e.currentTarget.style.filter = 'none'; e.currentTarget.style.transform = 'none'; }}
                  >
                    {isConnecting ? (
                      <><RefreshCw size={14} className="spinning" /><span>Collegamento...</span></>
                    ) : (
                      <><Link2 size={14} /><span>Collega</span></>
                    )}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="standard-modal" style={{ maxWidth: showAdminPanel ? 800 : 720, maxHeight: '88vh' }}>
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title">
            <Share2 size={22} color="#8B5CF6" />
            <span>{showAdminPanel ? 'Configurazione OAuth' : 'Canali Social'}</span>
            {!showAdminPanel && (
              <span style={{ 
                fontSize: '0.72rem', 
                background: connectedCount > 0 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(148, 163, 184, 0.12)', 
                color: connectedCount > 0 ? '#34D399' : '#94A3B8', 
                padding: '3px 10px', borderRadius: 999, fontWeight: 600, marginLeft: 4
              }}>
                {connectedCount}/{CHANNELS.length} collegati
              </span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {isAdmin && !showAdminPanel && (
              <button 
                className="btn-secondary" 
                onClick={() => setShowAdminPanel(true)}
                style={{ fontSize: '0.75rem', padding: '5px 10px', display: 'flex', alignItems: 'center', gap: 4 }}
              >
                <Settings size={13} /> OAuth Config
              </button>
            )}
            <button className="modal-close-btn" onClick={onClose}>
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="modal-content-scroll" style={{ padding: '20px 24px' }}>
          {showAdminPanel && isAdmin ? renderAdminPanel() : renderChannelList()}
        </div>

        {/* Footer */}
        {!showAdminPanel && (
          <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.75rem', color: '#64748B' }}>
              {connectedCount > 0 
                ? `${connectedCount} canal${connectedCount === 1 ? 'e' : 'i'} collegat${connectedCount === 1 ? 'o' : 'i'}`
                : 'Nessun canale collegato'
              }
            </span>
            <button className="btn-secondary" onClick={onClose} style={{ padding: '6px 16px', fontSize: '0.82rem' }}>
              Chiudi
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
