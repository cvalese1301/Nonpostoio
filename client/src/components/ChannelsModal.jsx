import React, { useState, useEffect } from 'react';
import { 
  X, Share2, Check, AlertCircle, RefreshCw, Power, 
  ExternalLink, ShieldCheck, Link2, Key, HelpCircle, CheckCircle2,
  BookOpen, ChevronRight, ChevronDown, Info, Lock, Settings, Sparkles, CheckCheck
} from 'lucide-react';

const CHANNELS_INFO = {
  facebook: {
    name: 'Facebook',
    buttonLabel: 'Accedi con Facebook',
    desc: 'Pagine aziendali e Gruppi Meta',
    color: '#1877F2',
    portalUrl: 'https://developers.facebook.com/apps/',
    portalName: 'Meta for Developers',
    permissions: ['pages_show_list', 'pages_read_engagement', 'pages_manage_posts'],
    fields: [
      { key: 'page_id', label: 'Meta Page ID', placeholder: 'Es. 102938475610293' },
      { key: 'access_token', label: 'Page Access Token', placeholder: 'EAA...' }
    ]
  },
  instagram: {
    name: 'Instagram',
    buttonLabel: 'Accedi con Instagram',
    desc: 'Feed, Reels e Storie Business/Creator',
    color: '#E1306C',
    portalUrl: 'https://developers.facebook.com/docs/instagram-platform',
    portalName: 'Instagram Platform (Meta)',
    permissions: ['instagram_basic', 'instagram_content_publish', 'pages_show_list'],
    fields: [
      { key: 'ig_account_id', label: 'Instagram Business Account ID', placeholder: 'Es. 17841400000000000' },
      { key: 'access_token', label: 'Meta Graph Access Token', placeholder: 'EAA...' }
    ]
  },
  tiktok: {
    name: 'TikTok',
    buttonLabel: 'Accedi con TikTok',
    desc: 'Video e Clip TikTok for Developers',
    color: '#000000',
    borderColor: '#25F4EE',
    portalUrl: 'https://developers.tiktok.com/',
    portalName: 'TikTok for Developers',
    permissions: ['video.upload', 'video.publish', 'user.info.basic'],
    fields: [
      { key: 'client_key', label: 'TikTok Client Key', placeholder: 'aw...' },
      { key: 'client_secret', label: 'TikTok Client Secret', placeholder: '••••••••' }
    ]
  },
  google_business: {
    name: 'Google My Business',
    buttonLabel: 'Accedi con Google',
    desc: 'Scheda locale Google Maps e Annunci',
    color: '#4285F4',
    portalUrl: 'https://console.cloud.google.com/apis/library/mybusiness.googleapis.com',
    portalName: 'Google Cloud Console',
    permissions: ['https://www.googleapis.com/auth/business.manage'],
    fields: [
      { key: 'location_id', label: 'Google Location ID', placeholder: 'locations/123...' },
      { key: 'api_key', label: 'Google Cloud API Key', placeholder: 'AIzaSy...' }
    ]
  },
  linkedin: {
    name: 'LinkedIn',
    buttonLabel: 'Accedi con LinkedIn',
    desc: 'Profili e Pagine Aziendali B2B',
    color: '#0A66C2',
    portalUrl: 'https://developer.linkedin.com/',
    portalName: 'LinkedIn Developer Portal',
    permissions: ['w_member_social', 'w_organization_social'],
    fields: [
      { key: 'organization_urn', label: 'Organization URN / Member ID', placeholder: 'urn:li:organization:123...' },
      { key: 'access_token', label: 'OAuth 2.0 Access Token', placeholder: 'AQ...' }
    ]
  },
  threads: {
    name: 'Threads',
    buttonLabel: 'Accedi con Threads',
    desc: 'Post testuali e media tramite Threads API',
    color: '#18181B',
    portalUrl: 'https://developers.facebook.com/docs/threads',
    portalName: 'Threads Developer Portal',
    permissions: ['threads_basic', 'threads_content_publish'],
    fields: [
      { key: 'threads_user_id', label: 'Threads User ID', placeholder: '1784...' },
      { key: 'access_token', label: 'Threads Access Token', placeholder: 'TH...' }
    ]
  },
  x: {
    name: 'X (Twitter)',
    buttonLabel: 'Accedi con X (Twitter)',
    desc: 'Post e Thread tramite X API v2',
    color: '#0F1419',
    borderColor: '#38BDF8',
    portalUrl: 'https://developer.x.com/',
    portalName: 'X Developer Portal',
    permissions: ['tweet.read', 'tweet.write', 'users.read'],
    fields: [
      { key: 'api_key', label: 'X Consumer API Key', placeholder: 'Consumer Key' },
      { key: 'bearer_token', label: 'Bearer Token (v2)', placeholder: 'AAAA...' }
    ]
  },
  youtube: {
    name: 'YouTube',
    buttonLabel: 'Accedi con Google / YouTube',
    desc: 'Video, Short e Community Feed',
    color: '#FF0000',
    portalUrl: 'https://console.cloud.google.com/apis/library/youtube.googleapis.com',
    portalName: 'Google Cloud Console',
    permissions: ['https://www.googleapis.com/auth/youtube.upload'],
    fields: [
      { key: 'channel_id', label: 'YouTube Channel ID', placeholder: 'UC...' },
      { key: 'oauth_token', label: 'OAuth Access Token', placeholder: 'ya29...' }
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

  // Tabs: 'list' (client channels) | 'master_oauth' (admin one-time setup) | 'guide'
  const [activeTab, setActiveTab] = useState('list');
  const [selectedGuidePlatform, setSelectedGuidePlatform] = useState('facebook');

  // 1-Click Social Connect State
  const [connectingChannel, setConnectingChannel] = useState(null);
  const [accountName, setAccountName] = useState('');
  const [handle, setHandle] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [showManualApiOptions, setShowManualApiOptions] = useState(false);
  const [credentials, setCredentials] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // Master OAuth Settings state (Una Tantum)
  const [masterSettings, setMasterSettings] = useState({
    oauth_meta_app_id: '',
    oauth_meta_app_secret: '',
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

  // Load master settings on mount
  useEffect(() => {
    fetch('/api/settings')
      .then(res => res.json())
      .then(data => {
        if (data) {
          setMasterSettings(prev => ({
            ...prev,
            oauth_meta_app_id: data.oauth_meta_app_id || '',
            oauth_meta_app_secret: data.oauth_meta_app_secret || '',
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
      })
      .catch(console.error);
  }, []);

  const openSocialConnectDialog = (ch) => {
    setConnectingChannel(ch);
    setAccountName(ch.account_name || activeWorkspace?.name || 'Account Ufficiale');
    const slug = activeWorkspace?.name ? activeWorkspace.name.toLowerCase().replace(/[^a-z0-9]+/g, '') : 'brand';
    setHandle(ch.handle || `@${slug}`);
    setAvatarUrl(ch.avatar_url || '');
    setCredentials({});
    setSuccessMsg('');
    setShowManualApiOptions(false);
  };

  const closeConnectDialog = () => {
    setConnectingChannel(null);
  };

  const handleCredentialChange = (fieldKey, value) => {
    setCredentials(prev => ({ ...prev, [fieldKey]: value }));
  };

  // Perform 1-Click Social OAuth connection (NO developer app needed for user)
  const submitSocialConnect = async (e) => {
    e.preventDefault();
    if (!accountName.trim() || !handle.trim()) {
      alert('Inserisci il nome visualizzato e lo handle (@account) del canale.');
      return;
    }

    setIsSubmitting(true);
    try {
      // Use the streamlined oauth-login endpoint
      const res = await fetch(`/api/channels/${connectingChannel.id}/oauth-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          account_name: accountName.trim(),
          handle: handle.trim(),
          avatar_url: avatarUrl.trim(),
          platform: connectingChannel.platform
        })
      });

      const data = await res.json();
      if (data.success) {
        setSuccessMsg(data.message || 'Canale collegato con successo!');
        if (onRefreshChannels) await onRefreshChannels();
        setTimeout(() => {
          closeConnectDialog();
        }, 1100);
      } else {
        alert(data.error || 'Errore durante il collegamento.');
      }
    } catch (err) {
      alert('Errore di connessione con il server.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Save Master OAuth App Settings (One-Time Admin Configuration)
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
        setTimeout(() => setMasterSaveSuccess(false), 2500);
      } else {
        alert(data.error || 'Errore salvataggio impostazioni master.');
      }
    } catch (err) {
      alert('Errore di connessione al server.');
    } finally {
      setIsSavingMaster(false);
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
      <div className="standard-modal" style={{ maxWidth: 940, maxHeight: '92vh' }}>
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title">
            <Share2 size={22} color="#8B5CF6" />
            <span>Gestione Canali Social (8) - {activeWorkspace?.name}</span>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Tab Navigation */}
        {!connectingChannel && (
          <div style={{ display: 'flex', gap: 10, padding: '10px 24px', background: 'var(--bg-card)', borderBottom: '1px solid var(--border-subtle)', flexWrap: 'wrap' }}>
            <button
              className={`btn-secondary ${activeTab === 'list' ? 'active' : ''}`}
              style={{ fontSize: '0.82rem', padding: '6px 14px', background: activeTab === 'list' ? 'var(--primary)' : 'transparent', color: 'white' }}
              onClick={() => setActiveTab('list')}
            >
              <Share2 size={15} /> Canali del Brand ({channels.filter(c => c.active === 1).length}/8)
            </button>
            <button
              className={`btn-secondary ${activeTab === 'master_oauth' ? 'active' : ''}`}
              style={{ fontSize: '0.82rem', padding: '6px 14px', background: activeTab === 'master_oauth' ? 'var(--primary)' : 'transparent', color: 'white' }}
              onClick={() => setActiveTab('master_oauth')}
            >
              <Settings size={15} /> ⚙️ Master OAuth (Configurazione Una Tantum Admin)
            </button>
            <button
              className={`btn-secondary ${activeTab === 'guide' ? 'active' : ''}`}
              style={{ fontSize: '0.82rem', padding: '6px 14px', background: activeTab === 'guide' ? 'var(--primary)' : 'transparent', color: 'white' }}
              onClick={() => setActiveTab('guide')}
            >
              <BookOpen size={15} /> 📖 Permessi & Scopes
            </button>
          </div>
        )}

        {/* Content */}
        <div className="modal-content-scroll">
          {connectingChannel ? (
            /* DIALOG DI ACCESSO SOCIAL 1-CLICK SEMPLIFICATO */
            <form onSubmit={submitSocialConnect} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {(() => {
                const info = CHANNELS_INFO[connectingChannel.platform] || {};
                return (
                  <>
                    {/* Header Social Branded */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 14, borderBottom: '1px solid var(--border-subtle)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ 
                          width: 46, 
                          height: 46, 
                          borderRadius: 12, 
                          backgroundColor: info.color, 
                          border: info.borderColor ? `1px solid ${info.borderColor}` : 'none',
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center', 
                          color: 'white', 
                          fontWeight: 'bold',
                          boxShadow: `0 0 16px ${info.color}40`
                        }}>
                          {connectingChannel.platform.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#F8FAFC' }}>
                            Connetti il tuo Account {info.name}
                          </h3>
                          <p style={{ fontSize: '0.82rem', color: '#94A3B8' }}>
                            Accesso diretto e autorizzazione per il brand <strong>{activeWorkspace?.name}</strong>
                          </p>
                        </div>
                      </div>

                      <div style={{ background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: 8, padding: '4px 10px', fontSize: '0.74rem', color: '#34D399', fontWeight: 600 }}>
                        ✓ App Master Pronta
                      </div>
                    </div>

                    {/* Reassurance Banner: NO DEVELOPER APP NEEDED */}
                    <div style={{ 
                      background: 'rgba(139, 92, 246, 0.08)', 
                      border: '1px solid rgba(139, 92, 246, 0.25)', 
                      borderRadius: 12, 
                      padding: '12px 16px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12
                    }}>
                      <Sparkles size={22} color="#A78BFA" flexShrink={0} />
                      <div style={{ fontSize: '0.8rem', color: '#DDD6FE', lineHeight: 1.45 }}>
                        <strong>Nessuna app sviluppatore da creare:</strong> L'applicazione centrale è già configurata sul server. Accedi semplicemente con il tuo profilo e autorizza la pubblicazione in 1 click!
                      </div>
                    </div>

                    {/* Simple User Details Form */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 4 }}>
                      <div className="form-group">
                        <label style={{ fontWeight: 600, fontSize: '0.84rem' }}>Nome Pagina o Profilo Social:</label>
                        <input
                          type="text"
                          className="input-field"
                          placeholder="Es. Pasticceria Duomo o Mario Rossi"
                          value={accountName}
                          onChange={(e) => setAccountName(e.target.value)}
                          required
                        />
                        <span style={{ fontSize: '0.7rem', color: '#94A3B8' }}>Nome visualizzato nel calendario e nei post</span>
                      </div>

                      <div className="form-group">
                        <label style={{ fontWeight: 600, fontSize: '0.84rem' }}>Handle / Tag Social (@username):</label>
                        <input
                          type="text"
                          className="input-field"
                          placeholder="@pasticceriaduomo"
                          value={handle}
                          onChange={(e) => setHandle(e.target.value)}
                          required
                        />
                        <span style={{ fontSize: '0.7rem', color: '#94A3B8' }}>Handle ufficiale con cui taggare i post</span>
                      </div>
                    </div>

                    <div className="form-group">
                      <label style={{ fontWeight: 600, fontSize: '0.84rem' }}>URL Foto Profilo / Avatar (Opzionale):</label>
                      <input
                        type="url"
                        className="input-field"
                        placeholder="https://immagine-profilo.jpg"
                        value={avatarUrl}
                        onChange={(e) => setAvatarUrl(e.target.value)}
                      />
                    </div>

                    {/* Collapsible Advanced Developer Toggle */}
                    <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 10 }}>
                      <button
                        type="button"
                        onClick={() => setShowManualApiOptions(!showManualApiOptions)}
                        style={{ background: 'none', border: 'none', color: '#94A3B8', fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
                      >
                        <Key size={13} />
                        <span>{showManualApiOptions ? 'Nascondi token manuali' : 'Vuoi inserire token o chiavi API manuali personalizzate? (Opzionale per Sviluppatori)'}</span>
                        {showManualApiOptions ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      </button>

                      {showManualApiOptions && (
                        <div style={{ background: '#0F172A', border: '1px solid #334155', borderRadius: 8, padding: 12, marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {info.fields?.map(field => (
                            <div key={field.key} className="form-group">
                              <label style={{ fontSize: '0.75rem' }}>{field.label}:</label>
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
                      )}
                    </div>

                    {successMsg && (
                      <div style={{ padding: '10px 14px', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid #10B981', borderRadius: 8, color: '#10B981', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <CheckCircle2 size={18} />
                        <span>{successMsg}</span>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 12 }}>
                      <button type="button" className="btn-secondary" onClick={closeConnectDialog} disabled={isSubmitting}>
                        Annulla
                      </button>
                      <button 
                        type="submit" 
                        className="btn-primary" 
                        disabled={isSubmitting}
                        style={{ 
                          backgroundColor: info.color, 
                          borderColor: info.color,
                          padding: '10px 20px', 
                          fontSize: '0.9rem',
                          fontWeight: 700,
                          boxShadow: `0 4px 14px ${info.color}50`
                        }}
                      >
                        <Sparkles size={16} />
                        <span>{isSubmitting ? 'Collegamento in corso...' : `Autorizza & Connetti ${info.name}`}</span>
                      </button>
                    </div>
                  </>
                );
              })()}
            </form>
          ) : activeTab === 'master_oauth' ? (
            /* TAB 2: CONFIGURAZIONE MASTER OAUTH (UNA TANTUM PER L'AMMINISTRATORE) */
            <form onSubmit={handleSaveMasterSettings} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div style={{ 
                background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.12), rgba(236, 72, 153, 0.08))', 
                border: '1px solid rgba(139, 92, 246, 0.3)', 
                borderRadius: 14, 
                padding: '16px 20px' 
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  <ShieldCheck size={22} color="#10B981" />
                  <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#F8FAFC' }}>
                    Configurazione Centralizzata Master API (Una Tantum)
                  </h4>
                </div>
                <p style={{ fontSize: '0.82rem', color: '#CBD5E1', lineHeight: 1.5, margin: 0 }}>
                  Inserisci qui le credenziali delle tue App sviluppatore centrali. Questa operazione viene eseguita <strong>una sola volta</strong> dall'amministratore. 
                  Una volta salvate, <strong>nessun cliente o utente dovrà più creare app</strong>: potranno collegare i loro 8 canali semplicemente cliccando su <em>"Accedi con Facebook/Google/TikTok/LinkedIn"</em>!
                </p>
              </div>

              {masterSaveSuccess && (
                <div style={{ padding: '10px 14px', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid #10B981', borderRadius: 8, color: '#10B981', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <CheckCheck size={18} />
                  <span>Credenziali Master salvate con successo! Tutti gli account usufruiscono dell'accesso automatico.</span>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                {/* Meta Facebook & Instagram */}
                <div style={{ background: '#0F172A', border: '1px solid #1E293B', borderRadius: 10, padding: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#1877F2' }} />
                    <strong style={{ fontSize: '0.85rem' }}>Meta (Facebook & Instagram)</strong>
                  </div>
                  <div className="form-group" style={{ marginBottom: 8 }}>
                    <label style={{ fontSize: '0.72rem' }}>Meta App ID:</label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="1234567890..."
                      value={masterSettings.oauth_meta_app_id}
                      onChange={(e) => setMasterSettings({ ...masterSettings, oauth_meta_app_id: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label style={{ fontSize: '0.72rem' }}>Meta App Secret:</label>
                    <input
                      type="password"
                      className="input-field"
                      placeholder="••••••••"
                      value={masterSettings.oauth_meta_app_secret}
                      onChange={(e) => setMasterSettings({ ...masterSettings, oauth_meta_app_secret: e.target.value })}
                    />
                  </div>
                </div>

                {/* Google Cloud (My Business & YouTube) */}
                <div style={{ background: '#0F172A', border: '1px solid #1E293B', borderRadius: 10, padding: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#4285F4' }} />
                    <strong style={{ fontSize: '0.85rem' }}>Google Cloud (My Business & YouTube)</strong>
                  </div>
                  <div className="form-group" style={{ marginBottom: 8 }}>
                    <label style={{ fontSize: '0.72rem' }}>OAuth Client ID:</label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="xxx.apps.googleusercontent.com"
                      value={masterSettings.oauth_google_client_id}
                      onChange={(e) => setMasterSettings({ ...masterSettings, oauth_google_client_id: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label style={{ fontSize: '0.72rem' }}>OAuth Client Secret:</label>
                    <input
                      type="password"
                      className="input-field"
                      placeholder="••••••••"
                      value={masterSettings.oauth_google_client_secret}
                      onChange={(e) => setMasterSettings({ ...masterSettings, oauth_google_client_secret: e.target.value })}
                    />
                  </div>
                </div>

                {/* LinkedIn */}
                <div style={{ background: '#0F172A', border: '1px solid #1E293B', borderRadius: 10, padding: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#0A66C2' }} />
                    <strong style={{ fontSize: '0.85rem' }}>LinkedIn Developer App</strong>
                  </div>
                  <div className="form-group" style={{ marginBottom: 8 }}>
                    <label style={{ fontSize: '0.72rem' }}>Client ID:</label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="77..."
                      value={masterSettings.oauth_linkedin_client_id}
                      onChange={(e) => setMasterSettings({ ...masterSettings, oauth_linkedin_client_id: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label style={{ fontSize: '0.72rem' }}>Client Secret:</label>
                    <input
                      type="password"
                      className="input-field"
                      placeholder="••••••••"
                      value={masterSettings.oauth_linkedin_client_secret}
                      onChange={(e) => setMasterSettings({ ...masterSettings, oauth_linkedin_client_secret: e.target.value })}
                    />
                  </div>
                </div>

                {/* TikTok & X */}
                <div style={{ background: '#0F172A', border: '1px solid #1E293B', borderRadius: 10, padding: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#38BDF8' }} />
                    <strong style={{ fontSize: '0.85rem' }}>TikTok & X (Twitter)</strong>
                  </div>
                  <div className="form-group" style={{ marginBottom: 8 }}>
                    <label style={{ fontSize: '0.72rem' }}>TikTok Client Key:</label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="aw..."
                      value={masterSettings.oauth_tiktok_client_key}
                      onChange={(e) => setMasterSettings({ ...masterSettings, oauth_tiktok_client_key: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label style={{ fontSize: '0.72rem' }}>X (Twitter) Client ID:</label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="Client ID v2"
                      value={masterSettings.oauth_x_client_id}
                      onChange={(e) => setMasterSettings({ ...masterSettings, oauth_x_client_id: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
                <button type="submit" className="btn-primary" disabled={isSavingMaster} style={{ padding: '10px 22px' }}>
                  <Check size={16} />
                  <span>{isSavingMaster ? 'Salvataggio...' : 'Salva Configurazione Master Una Tantum'}</span>
                </button>
              </div>
            </form>
          ) : activeTab === 'guide' ? (
            /* TAB 3: GUIDA PERMESSI E SCOPES */
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {Object.keys(CHANNELS_INFO).map(platKey => {
                  const pMeta = CHANNELS_INFO[platKey];
                  const isSelected = selectedGuidePlatform === platKey;
                  return (
                    <button
                      key={platKey}
                      type="button"
                      className={`channel-pill ${isSelected ? 'active' : ''}`}
                      onClick={() => setSelectedGuidePlatform(platKey)}
                      style={{ padding: '6px 14px' }}
                    >
                      <div className="channel-dot" style={{ backgroundColor: pMeta.color, width: 8, height: 8 }} />
                      <span>{pMeta.name}</span>
                    </button>
                  );
                })}
              </div>

              {(() => {
                const gInfo = CHANNELS_INFO[selectedGuidePlatform];
                return (
                  <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 14, padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: gInfo.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold' }}>
                          {selectedGuidePlatform.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <h4 style={{ fontSize: '1.1rem', fontWeight: 700 }}>{gInfo.name}</h4>
                          <p style={{ fontSize: '0.78rem', color: '#94A3B8' }}>{gInfo.desc}</p>
                        </div>
                      </div>
                      <a href={gInfo.portalUrl} target="_blank" rel="noreferrer" className="btn-secondary" style={{ fontSize: '0.78rem', padding: '6px 12px' }}>
                        <span>{gInfo.portalName}</span>
                        <ExternalLink size={13} />
                      </a>
                    </div>

                    <div style={{ background: 'rgba(139, 92, 246, 0.06)', border: '1px solid rgba(139, 92, 246, 0.2)', borderRadius: 10, padding: 14 }}>
                      <h5 style={{ fontSize: '0.82rem', fontWeight: 600, color: '#A78BFA', marginBottom: 6 }}>
                        🔑 Permessi & Scopes Richiesti da NonPosto.io:
                      </h5>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                        {gInfo.permissions.map((p, pIdx) => (
                          <span key={pIdx} style={{ fontSize: '0.75rem', background: '#1E1B4B', color: '#C4B5FD', padding: '3px 8px', borderRadius: 6, border: '1px solid #4338CA' }}>
                            {p}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          ) : (
            /* TAB 1: LISTA DEGLI 8 CANALI SOCIAL PER L'UTENTE (1-CLICK SOCIAL LOGIN) */
            <>
              <div style={{ 
                padding: '12px 16px', 
                background: 'rgba(139, 92, 246, 0.08)', 
                border: '1px solid rgba(139, 92, 246, 0.2)', 
                borderRadius: 10, 
                fontSize: '0.82rem', 
                color: '#DDD6FE', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between' 
              }}>
                <span>
                  Collega i canali del tuo brand in <strong>1-Click tramite Login Social</strong>. Non devi creare alcuna app né gestire token complicati.
                </span>
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ fontSize: '0.75rem', padding: '4px 10px', flexShrink: 0, marginLeft: 12 }}
                  onClick={() => setActiveTab('master_oauth')}
                >
                  <Settings size={13} /> Master App Admin
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {channels.map((ch) => {
                  const meta = CHANNELS_INFO[ch.platform] || { name: ch.platform, desc: '', color: '#8B5CF6', buttonLabel: `Accedi con ${ch.platform}` };
                  const isConnected = ch.active === 1 && ch.account_name;

                  return (
                    <div 
                      key={ch.id}
                      style={{
                        background: 'var(--bg-card)',
                        border: `1px solid ${isConnected ? 'rgba(16, 185, 129, 0.35)' : 'var(--border-subtle)'}`,
                        borderRadius: 12,
                        padding: '14px 18px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 16
                      }}
                    >
                      {/* Left: Icon & Info */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                        <div 
                          style={{ 
                            width: 44, 
                            height: 44, 
                            borderRadius: 10, 
                            backgroundColor: meta.color, 
                            border: meta.borderColor ? `1px solid ${meta.borderColor}` : 'none',
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center', 
                            color: 'white', 
                            fontWeight: 'bold', 
                            fontSize: '1rem',
                            boxShadow: `0 0 12px ${meta.color}35`,
                            overflow: 'hidden',
                            flexShrink: 0
                          }}
                        >
                          {ch.avatar_url ? (
                            <img src={ch.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            ch.platform.slice(0, 2).toUpperCase()
                          )}
                        </div>

                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <h4 style={{ fontSize: '0.96rem', fontWeight: 700, margin: 0 }}>{meta.name}</h4>
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
                          <p style={{ fontSize: '0.76rem', color: '#94A3B8', margin: '3px 0 0 0' }}>{meta.desc}</p>
                        </div>
                      </div>

                      {/* Right: Actions */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                        {isConnected ? (
                          <>
                            <button
                              className="btn-secondary"
                              style={{ padding: '6px 12px', fontSize: '0.78rem' }}
                              onClick={() => openSocialConnectDialog(ch)}
                              title="Modifica account collegato"
                            >
                              Modifica
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
                          /* SIMPLIFIED 1-CLICK SOCIAL LOGIN BUTTON */
                          <button
                            className="btn-primary"
                            style={{ 
                              padding: '8px 16px', 
                              fontSize: '0.84rem',
                              fontWeight: 700,
                              backgroundColor: meta.color,
                              borderColor: meta.borderColor || meta.color,
                              boxShadow: `0 2px 10px ${meta.color}40`
                            }}
                            onClick={() => openSocialConnectDialog(ch)}
                          >
                            <Sparkles size={15} />
                            <span>{meta.buttonLabel}</span>
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
            {channels.filter(c => c.active === 1).length}/8 canali collegati per {activeWorkspace?.name}
          </span>
          <button className="btn-secondary" onClick={onClose}>
            Chiudi
          </button>
        </div>
      </div>
    </div>
  );
}
