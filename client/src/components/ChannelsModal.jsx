import React, { useState } from 'react';
import { 
  X, Share2, Check, AlertCircle, RefreshCw, Power, 
  ExternalLink, ShieldCheck, Link2, Key, HelpCircle, CheckCircle2
} from 'lucide-react';

const CHANNELS_INFO = {
  facebook: {
    name: 'Facebook',
    desc: 'Pagine aziendali e Gruppi Meta tramite Graph API',
    color: '#1877F2',
    portalUrl: 'https://developers.facebook.com/apps/',
    fields: [
      { key: 'page_id', label: 'Meta Page ID', placeholder: 'Es. 102938475610293' },
      { key: 'access_token', label: 'Page Access Token (Permanente)', placeholder: 'EAA...' }
    ]
  },
  instagram: {
    name: 'Instagram',
    desc: 'Feed, Reels e Storie Business/Creator tramite Instagram Graph API',
    color: '#E1306C',
    portalUrl: 'https://developers.facebook.com/docs/instagram-platform',
    fields: [
      { key: 'ig_account_id', label: 'Instagram Business Account ID', placeholder: 'Es. 17841400000000000' },
      { key: 'access_token', label: 'Meta Graph Access Token', placeholder: 'EAA...' }
    ]
  },
  tiktok: {
    name: 'TikTok',
    desc: 'Video, Sound e Analytics tramite TikTok for Developers API',
    color: '#25F4EE',
    portalUrl: 'https://developers.tiktok.com/',
    fields: [
      { key: 'client_key', label: 'TikTok Client Key', placeholder: 'aw...' },
      { key: 'client_secret', label: 'TikTok Client Secret', placeholder: '••••••••' },
      { key: 'access_token', label: 'User Access Token (OpenID)', placeholder: 'act.example...' }
    ]
  },
  google_business: {
    name: 'Google My Business',
    desc: 'Scheda locale Google Maps e Post tramite Google Business Profile API',
    color: '#4285F4',
    portalUrl: 'https://console.cloud.google.com/apis/library/mybusiness.googleapis.com',
    fields: [
      { key: 'location_id', label: 'Google Location ID', placeholder: 'locations/1234567890...' },
      { key: 'api_key', label: 'Google Cloud API Key / OAuth Token', placeholder: 'AIzaSy...' }
    ]
  },
  linkedin: {
    name: 'LinkedIn',
    desc: 'Profili e Pagine Aziendali B2B tramite LinkedIn Community API',
    color: '#0A66C2',
    portalUrl: 'https://developer.linkedin.com/',
    fields: [
      { key: 'org_urn', label: 'Organization URN / Member ID', placeholder: 'urn:li:organization:123456' },
      { key: 'access_token', label: 'OAuth 2.0 Access Token', placeholder: 'AQV...' }
    ]
  },
  threads: {
    name: 'Threads',
    desc: 'Conversazioni e post tramite Meta Threads API ufficiale',
    color: '#FFFFFF',
    portalUrl: 'https://developers.facebook.com/docs/threads',
    fields: [
      { key: 'threads_user_id', label: 'Threads User ID', placeholder: 'Es. 789101112' },
      { key: 'access_token', label: 'Threads Access Token', placeholder: 'THQ...' }
    ]
  },
  x: {
    name: 'X (Twitter)',
    desc: 'Post, thread e media tramite X API v2',
    color: '#CBD5E1',
    portalUrl: 'https://developer.x.com/en/portal/dashboard',
    fields: [
      { key: 'api_key', label: 'API Key (Consumer Key)', placeholder: '••••••••' },
      { key: 'api_secret', label: 'API Key Secret', placeholder: '••••••••' },
      { key: 'access_token', label: 'Access Token', placeholder: '••••••••' },
      { key: 'access_token_secret', label: 'Access Token Secret', placeholder: '••••••••' }
    ]
  },
  youtube: {
    name: 'YouTube',
    desc: 'Shorts verticali e post community tramite YouTube Data API v3',
    color: '#FF0000',
    portalUrl: 'https://console.cloud.google.com/apis/library/youtube.googleapis.com',
    fields: [
      { key: 'channel_id', label: 'YouTube Channel ID', placeholder: 'UC...' },
      { key: 'oauth_token', label: 'OAuth 2.0 Refresh / Access Token', placeholder: 'ya29...' }
    ]
  }
};

export default function ChannelsModal({ 
  isOpen, 
  onClose, 
  activeWorkspace, 
  channels = [], 
  onRefreshChannels 
}) {
  if (!isOpen) return null;

  // Selected channel for API connection wizard
  const [connectingChannel, setConnectingChannel] = useState(null);
  const [accountName, setAccountName] = useState('');
  const [handle, setHandle] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [credentials, setCredentials] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const openConnectWizard = (ch) => {
    setConnectingChannel(ch);
    setAccountName(ch.account_name || activeWorkspace?.name || '');
    setHandle(ch.handle || '');
    setAvatarUrl(ch.avatar_url || '');
    setCredentials({});
    setSuccessMsg('');
  };

  const closeConnectWizard = () => {
    setConnectingChannel(null);
  };

  const handleCredentialChange = (fieldKey, value) => {
    setCredentials(prev => ({ ...prev, [fieldKey]: value }));
  };

  const submitApiConnection = async (e) => {
    e.preventDefault();
    if (!accountName.trim() || !handle.trim()) {
      alert('Inserisci il nome visualizzato e lo handle (@account) del canale.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/channels/${connectingChannel.id}/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          account_name: accountName.trim(),
          handle: handle.trim(),
          avatar_url: avatarUrl.trim(),
          credentials
        })
      });

      const data = await res.json();
      if (data.success) {
        setSuccessMsg(data.message);
        if (onRefreshChannels) await onRefreshChannels();
        setTimeout(() => {
          closeConnectWizard();
        }, 1200);
      } else {
        alert(data.error || 'Errore durante il collegamento.');
      }
    } catch (err) {
      alert('Errore di connessione API.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDisconnect = async (channelId) => {
    if (!confirm('Sei sicuro di voler disconnettere questo canale? Non potrai più pubblicarvi finché non lo ricolleghi.')) return;
    try {
      const res = await fetch(`/api/channels/${channelId}/disconnect`, { method: 'POST' });
      const data = await res.json();
      if (data.success && onRefreshChannels) {
        await onRefreshChannels();
      }
    } catch (err) {
      alert('Errore disconnessione canale.');
    }
  };

  return (
    <div className="modal-overlay">
      <div className="standard-modal" style={{ maxWidth: 880, maxHeight: '90vh' }}>
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title">
            <Share2 size={22} color="#8B5CF6" />
            <span>Gestione Collegamento Canali Social (8) - {activeWorkspace?.name}</span>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="modal-content-scroll">
          {connectingChannel ? (
            /* WIZARD COLLEGAMENTO API PER IL SINGOLO CANALE */
            <form onSubmit={submitApiConnection} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {(() => {
                const info = CHANNELS_INFO[connectingChannel.platform] || {};
                return (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 12, borderBottom: '1px solid var(--border-subtle)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 42, height: 42, borderRadius: 10, backgroundColor: info.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold' }}>
                          {connectingChannel.platform.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Collega {info.name} tramite API</h3>
                          <p style={{ fontSize: '0.8rem', color: '#94A3B8' }}>{info.desc}</p>
                        </div>
                      </div>
                      <a href={info.portalUrl} target="_blank" rel="noreferrer" className="btn-secondary" style={{ fontSize: '0.78rem', padding: '6px 12px' }}>
                        <span>Developer Portal</span>
                        <ExternalLink size={13} />
                      </a>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <div className="form-group">
                        <label>Nome Account / Pagina visualizzata:</label>
                        <input
                          type="text"
                          className="input-field"
                          placeholder="Es. Mario Rossi o Brand Ufficiale"
                          value={accountName}
                          onChange={(e) => setAccountName(e.target.value)}
                          required
                        />
                      </div>

                      <div className="form-group">
                        <label>Handle Social (@nome):</label>
                        <input
                          type="text"
                          className="input-field"
                          placeholder="@brand_official"
                          value={handle}
                          onChange={(e) => setHandle(e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label>URL Immagine Profilo / Avatar (Opzionale):</label>
                      <input
                        type="url"
                        className="input-field"
                        placeholder="https://..."
                        value={avatarUrl}
                        onChange={(e) => setAvatarUrl(e.target.value)}
                      />
                    </div>

                    {/* Parametri API specifici per questa piattaforma */}
                    <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-subtle)', borderRadius: 10, padding: 14 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                        <Key size={16} color="#8B5CF6" />
                        <h4 style={{ fontSize: '0.88rem', fontWeight: 600 }}>Chiavi API & Token di Accesso:</h4>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {info.fields?.map(field => (
                          <div key={field.key} className="form-group">
                            <label style={{ fontSize: '0.78rem' }}>{field.label}:</label>
                            <input
                              type="password"
                              className="input-field"
                              placeholder={field.placeholder}
                              value={credentials[field.key] || ''}
                              onChange={(e) => handleCredentialChange(field.key, e.target.value)}
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    {successMsg && (
                      <div style={{ padding: '10px 14px', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid #10B981', borderRadius: 8, color: '#10B981', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <CheckCircle2 size={18} />
                        <span>{successMsg}</span>
                      </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
                      <button type="button" className="btn-secondary" onClick={closeConnectWizard} disabled={isSubmitting}>
                        Annulla
                      </button>
                      <button type="submit" className="btn-primary" disabled={isSubmitting}>
                        <Link2 size={16} />
                        <span>{isSubmitting ? 'Verifica e Salvataggio...' : `Connetti ${info.name}`}</span>
                      </button>
                    </div>
                  </>
                );
              })()}
            </form>
          ) : (
            /* LISTA DI TUTTI GLI 8 CANALI SOCIAL */
            <>
              <div style={{ padding: '12px 16px', background: 'rgba(139, 92, 246, 0.08)', border: '1px solid rgba(139, 92, 246, 0.2)', borderRadius: 10, fontSize: '0.82rem', color: '#DDD6FE' }}>
                Collega ciascun canale inserendo le credenziali e i token API del rispettivo social. Solo i canali con stato <strong>"Collegato"</strong> saranno attivi per la pubblicazione e la pianificazione.
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {channels.map((ch) => {
                  const meta = CHANNELS_INFO[ch.platform] || { name: ch.platform, desc: '', color: '#8B5CF6' };
                  const isConnected = ch.active === 1 && ch.account_name;

                  return (
                    <div 
                      key={ch.id}
                      style={{
                        background: 'var(--bg-card)',
                        border: `1px solid ${isConnected ? 'rgba(16, 185, 129, 0.3)' : 'var(--border-subtle)'}`,
                        borderRadius: 12,
                        padding: '14px 18px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 16
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                        <div 
                          style={{ 
                            width: 44, 
                            height: 44, 
                            borderRadius: 10, 
                            backgroundColor: meta.color, 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            color: 'white',
                            fontWeight: 'bold',
                            fontSize: '1rem',
                            boxShadow: `0 0 12px ${meta.color}35`,
                            overflow: 'hidden'
                          }}
                        >
                          {ch.avatar_url ? (
                            <img src={ch.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            ch.platform.slice(0, 2).toUpperCase()
                          )}
                        </div>

                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <h4 style={{ fontSize: '0.95rem', fontWeight: 600 }}>{meta.name}</h4>
                            {isConnected ? (
                              <span style={{ fontSize: '0.72rem', background: 'rgba(16, 185, 129, 0.15)', color: '#34D399', padding: '2px 8px', borderRadius: 999, fontWeight: 600 }}>
                                ● {ch.account_name} ({ch.handle})
                              </span>
                            ) : (
                              <span style={{ fontSize: '0.72rem', background: 'rgba(148, 163, 184, 0.12)', color: '#94A3B8', padding: '2px 8px', borderRadius: 999 }}>
                                Non collegato
                              </span>
                            )}
                          </div>
                          <p style={{ fontSize: '0.75rem', color: '#94A3B8', marginTop: 2 }}>{meta.desc}</p>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        {isConnected ? (
                          <>
                            <button
                              className="btn-secondary"
                              style={{ padding: '6px 12px', fontSize: '0.78rem' }}
                              onClick={() => openConnectWizard(ch)}
                              title="Modifica impostazioni API"
                            >
                              Modifica API
                            </button>
                            <button
                              className="btn-secondary"
                              style={{ padding: '6px 12px', fontSize: '0.78rem', color: '#F87171' }}
                              onClick={() => handleDisconnect(ch.id)}
                            >
                              Disconnetti
                            </button>
                          </>
                        ) : (
                          <button
                            className="btn-primary"
                            style={{ padding: '7px 14px', fontSize: '0.82rem' }}
                            onClick={() => openConnectWizard(ch)}
                          >
                            <Link2 size={15} />
                            <span>Collega tramite API</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>
            {channels.filter(c => c.active === 1).length}/8 canali collegati per questo brand
          </span>
          <button className="btn-secondary" onClick={onClose}>
            Chiudi
          </button>
        </div>
      </div>
    </div>
  );
}
