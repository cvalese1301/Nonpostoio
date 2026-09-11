import React, { useState, useEffect, useRef } from 'react';
import { 
  X, Share2, Check, RefreshCw, Link2, CheckCircle2, LogOut, 
  Wifi, AlertTriangle, Settings, Eye, EyeOff, Activity, Plus, ArrowLeft, Sliders
} from 'lucide-react';
import LogsModal from './LogsModal';

const PROVIDERS = [
  {
    key: 'facebook',
    name: 'Facebook',
    desc: 'pagina o gruppo',
    color: '#1877F2',
    iconText: 'f'
  },
  {
    key: 'instagram',
    name: 'Instagram',
    desc: 'account business o creator',
    color: 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)',
    iconText: '📷',
    isInstagram: true
  },
  {
    key: 'threads',
    name: 'Threads',
    desc: 'profilo',
    color: '#000000',
    iconText: '@'
  },
  {
    key: 'tiktok',
    name: 'TikTok',
    desc: 'profilo',
    color: '#000000',
    iconText: '♪'
  },
  {
    key: 'youtube',
    name: 'Youtube',
    desc: 'profilo',
    color: '#FF0000',
    iconText: '▶'
  },
  {
    key: 'x',
    name: 'X-Twitter',
    desc: 'profilo',
    color: '#000000',
    iconText: '𝕏'
  },
  {
    key: 'linkedin',
    name: 'LinkedIn',
    desc: 'organizzazione o profilo',
    color: '#0A66C2',
    iconText: 'in'
  },
  {
    key: 'pinterest',
    name: 'Pinterest',
    desc: 'profilo',
    color: '#E60023',
    iconText: 'P'
  },
  {
    key: 'google_business',
    name: 'Google My Business',
    desc: 'profilo',
    color: '#4285F4',
    iconText: 'G'
  },
  {
    key: 'telegram',
    name: 'Telegram',
    desc: 'canale o gruppo',
    color: '#229ED9',
    iconText: '✈'
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
  const [view, setView] = useState('list'); // 'list' | 'add' | 'detail' | 'instagram_choice' | 'admin'
  const [selectedChannel, setSelectedChannel] = useState(null);
  const [showDirectDisclaimer, setShowDirectDisclaimer] = useState(false);

  const [connectingPlatform, setConnectingPlatform] = useState(null);
  const [connectSuccess, setConnectSuccess] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [oauthStatus, setOauthStatus] = useState({});
  const [loadingOauth, setLoadingOauth] = useState(true);
  const timerRef = useRef(null);

  // Admin Master OAuth State
  const isAdmin = true;
  const [showLogsModal, setShowLogsModal] = useState(false);
  const [masterSettings, setMasterSettings] = useState({
    oauth_meta_app_id: '',
    oauth_meta_app_secret: '',
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

  useEffect(() => {
    if (isOpen) {
      setView('list');
      setSelectedChannel(null);
      setShowDirectDisclaimer(false);
      fetchOAuthStatus();
      fetchMasterSettings();
    }
  }, [isOpen]);

  // Listen for popup messages
  useEffect(() => {
    const handleMessage = (e) => {
      if (e.data?.type === 'oauth_success') {
        setConnectingPlatform(null);
        setConnectSuccess(e.data.platform);
        if (onRefreshChannels) onRefreshChannels();
        setView('list');
        setTimeout(() => setConnectSuccess(null), 3500);
      } else if (e.data?.type === 'oauth_error') {
        setConnectingPlatform(null);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onRefreshChannels]);

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
      alert('Errore di connessione: ' + err.message);
    } finally {
      setIsSavingMaster(false);
    }
  };

  const getChannelData = (platformKey) => {
    const realKey = platformKey === 'instagram_direct' ? 'instagram' : platformKey;
    return channels.find(c => c.platform === realKey);
  };

  const handleConnect = async (platformKey) => {
    const realPlatform = platformKey === 'instagram_direct' ? 'instagram' : platformKey;
    const channelData = getChannelData(realPlatform);
    if (!channelData) return;

    setConnectingPlatform(platformKey);

    const width = 600;
    const height = 750;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;

    const token = localStorage.getItem('nonposto_auth_token') || '';
    const isMetaFamily = ['facebook', 'instagram', 'threads', 'instagram_direct'].includes(platformKey);

    if (isMetaFamily) {
      const startUrl = `/api/oauth/meta/start?channel_id=${channelData.id}&platform=${platformKey}&token=${encodeURIComponent(token)}`;
      window.open(
        startUrl,
        `oauth_${platformKey}`,
        `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no,status=no,scrollbars=yes`
      );
    } else {
      // Fallback for non-Meta platforms
      const startUrl = `/api/oauth/${platformKey}/start?channel_id=${channelData.id}&token=${encodeURIComponent(token)}`;
      window.open(
        startUrl,
        `oauth_${platformKey}`,
        `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no,status=no,scrollbars=yes`
      );
    }
  };

  const handleTogglePreselected = async (channelId, currentVal, e) => {
    e.stopPropagation();
    try {
      const newVal = currentVal ? 0 : 1;
      await fetch(`/api/channels/${channelId}/preselected`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_preselected: newVal })
      });
      if (onRefreshChannels) onRefreshChannels();
    } catch (err) {
      console.error('Toggle preselected error:', err);
    }
  };

  const handleChannelAction = async (channelId, action) => {
    if (action === 'unlink' && !confirm('Sei sicuro di voler scollegare questo canale?')) {
      return;
    }
    setActionLoading(true);
    try {
      const res = await fetch(`/api/channels/${channelId}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });
      const data = await res.json();
      if (data.success) {
        if (onRefreshChannels) onRefreshChannels();
        if (action === 'unlink') {
          setView('list');
          setSelectedChannel(null);
        } else {
          setSelectedChannel(data.channel);
        }
      } else {
        alert(data.error || 'Errore durante l\'azione sul canale.');
      }
    } catch (err) {
      alert('Errore: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const getPlatformBadgeColor = (platform) => {
    switch (platform) {
      case 'facebook': return '#1877F2';
      case 'instagram': return '#E1306C';
      case 'threads': return '#000000';
      case 'tiktok': return '#000000';
      case 'youtube': return '#FF0000';
      case 'x': return '#000000';
      case 'linkedin': return '#0A66C2';
      case 'google_business': return '#4285F4';
      default: return '#64748B';
    }
  };

  const getPlatformBadgeIcon = (platform) => {
    switch (platform) {
      case 'facebook': return 'f';
      case 'instagram': return '📷';
      case 'threads': return '@';
      case 'tiktok': return '♪';
      case 'youtube': return '▶';
      case 'x': return '𝕏';
      case 'linkedin': return 'in';
      case 'google_business': return 'G';
      default: return '•';
    }
  };

  const calculateDaysRemaining = (expiresAt) => {
    if (!expiresAt) return 60;
    try {
      const exp = new Date(expiresAt).getTime();
      const diff = exp - Date.now();
      const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
      return days > 0 ? days : 0;
    } catch (e) {
      return 60;
    }
  };

  const formatItalianDate = (dateStr) => {
    if (!dateStr) return 'tra 60 giorni';
    try {
      const d = new Date(dateStr);
      const options = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
      return d.toLocaleDateString('it-IT', options);
    } catch (e) {
      return dateStr;
    }
  };

  if (!isOpen) return null;

  const connectedChannels = channels.filter(c => c.active === 1 && c.account_name);

  // =========================================================================
  // VIEW 1: I TUOI CANALI (Pubblie Channel List)
  // =========================================================================
  const renderChannelList = () => (
    <div className="pubblie-channels-container">
      <div className="pubblie-header-row">
        <div>
          <h2 className="pubblie-title">Canali</h2>
          <div className="pubblie-counter-sub">
            Hai associato {connectedChannels.length} canali
          </div>
        </div>
        <button 
          className="pubblie-btn-new-channel"
          onClick={() => setView('add')}
        >
          <Plus size={16} />
          <span>Associa un nuovo canale</span>
        </button>
      </div>

      <div className="pubblie-section-title">I tuoi canali</div>

      {connectedChannels.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '48px 24px',
          background: '#111827',
          border: '1px dashed #1F2937',
          borderRadius: 14,
          color: '#94A3B8'
        }}>
          <Share2 size={40} color="#3B82F6" style={{ margin: '0 auto 14px', opacity: 0.8 }} />
          <h3 style={{ color: '#F8FAFC', fontSize: '1.1rem', marginBottom: 6 }}>Nessun canale ancora collegato</h3>
          <p style={{ fontSize: '0.86rem', maxWidth: 420, margin: '0 auto 20px', lineHeight: 1.5 }}>
            Collega almeno un canale social al tuo progetto per iniziare a programmare e pubblicare contenuti.
          </p>
          <button 
            className="pubblie-btn-new-channel" 
            onClick={() => setView('add')}
            style={{ background: '#2563EB', color: 'white', borderColor: '#2563EB' }}
          >
            <Plus size={16} />
            <span>Collega il tuo primo canale</span>
          </button>
        </div>
      ) : (
        <div>
          {connectedChannels.map(ch => {
            const daysLeft = calculateDaysRemaining(ch.token_expires_at);
            const isPreselected = ch.is_preselected !== 0;

            return (
              <div key={ch.id} className="pubblie-channel-row">
                {/* Left: Avatar with small platform overlay badge */}
                <div className="pubblie-channel-left">
                  <div className="pubblie-avatar-wrap">
                    {ch.avatar_url ? (
                      <img 
                        src={ch.avatar_url} 
                        alt={ch.account_name} 
                        className="pubblie-avatar-img"
                        onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextSibling.style.display = 'flex'; }}
                      />
                    ) : null}
                    <div className="pubblie-avatar-fallback" style={{ display: ch.avatar_url ? 'none' : 'flex' }}>
                      {ch.account_name.charAt(0).toUpperCase()}
                    </div>
                    <div 
                      className="pubblie-badge-overlay"
                      style={{ background: getPlatformBadgeColor(ch.platform) }}
                    >
                      {getPlatformBadgeIcon(ch.platform)}
                    </div>
                  </div>

                  <div className="pubblie-channel-info">
                    <div className="pubblie-channel-name">{ch.account_name}</div>
                    <div className="pubblie-channel-type">
                      {ch.channel_type || (ch.platform === 'facebook' ? 'Facebook • pagina' : ch.platform === 'instagram' ? 'Instagram via Facebook • business' : `${ch.platform} • profilo`)}
                    </div>
                  </div>
                </div>

                {/* Center: Token expiration text identical to Pubblie */}
                <div className="pubblie-channel-center">
                  <div className="pubblie-expiry-text">
                    L'associazione al canale scadrà tra {daysLeft} giorni
                  </div>
                  <div className="pubblie-reconnect-date">
                    Riconnetti entro {formatItalianDate(ch.token_expires_at)}
                  </div>
                </div>

                {/* Right: Switch Preselezionato + Settings button */}
                <div className="pubblie-channel-right">
                  <label className="pubblie-preselect-label">
                    <div className="pubblie-switch">
                      <input 
                        type="checkbox" 
                        checked={isPreselected}
                        onChange={(e) => handleTogglePreselected(ch.id, isPreselected, e)}
                      />
                      <span className="pubblie-slider"></span>
                    </div>
                    <span>Preselezionato su nuovo post</span>
                  </label>

                  <button 
                    className="pubblie-btn-gear"
                    title="Dettaglio e configurazione canale"
                    onClick={() => {
                      setSelectedChannel(ch);
                      setView('detail');
                    }}
                  >
                    <Sliders size={15} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  // =========================================================================
  // VIEW 2: ASSOCIA UN CANALE AL TUO PROGETTO (Pubblie Provider Grid)
  // =========================================================================
  const renderAddChannelView = () => (
    <div>
      <div className="pubblie-add-header">
        <h2 className="pubblie-add-title">Associa un canale al tuo progetto</h2>
        <p className="pubblie-add-subtitle">
          Collega almeno un canale al tuo progetto per iniziare a pubblicare.
        </p>
      </div>

      <div className="pubblie-provider-grid">
        {PROVIDERS.map(prov => {
          const isConnecting = connectingPlatform === prov.key || (prov.isInstagram && connectingPlatform?.startsWith('instagram'));

          return (
            <button 
              key={prov.key}
              className="pubblie-provider-item"
              disabled={isConnecting}
              onClick={() => {
                if (prov.isInstagram) {
                  setView('instagram_choice');
                } else {
                  handleConnect(prov.key);
                }
              }}
            >
              <div 
                className="pubblie-provider-circle"
                style={{ background: prov.color }}
              >
                {isConnecting ? (
                  <RefreshCw size={24} className="spinning" />
                ) : (
                  <span>{prov.iconText}</span>
                )}
              </div>
              <div className="pubblie-provider-name">{prov.name}</div>
              <div className="pubblie-provider-desc">{prov.desc}</div>
            </button>
          );
        })}
      </div>

      <button className="pubblie-btn-back" onClick={() => setView('list')}>
        Torna indietro
      </button>
    </div>
  );

  // =========================================================================
  // VIEW 3: INSTAGRAM DUAL CHOICE MODAL (Via Facebook vs Collegamento Diretto)
  // =========================================================================
  const renderInstagramChoiceModal = () => (
    <div className="pubblie-dialog-box">
      {!showDirectDisclaimer ? (
        <>
          <h3 className="pubblie-dialog-title">Instagram</h3>
          <p className="pubblie-dialog-desc">Come vuoi collegare il tuo account Instagram?</p>

          <div className="pubblie-dialog-options">
            {/* Option 1: Via Facebook */}
            <button 
              className="pubblie-dialog-option"
              onClick={() => handleConnect('instagram')}
            >
              <div className="pubblie-dialog-circle" style={{ background: 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)' }}>
                <span style={{ fontSize: 28 }}>📷</span>
                <div style={{
                  position: 'absolute', bottom: -2, right: -2, width: 22, height: 22,
                  borderRadius: '50%', background: '#1877F2', border: '2px solid #111827',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white',
                  fontSize: 12, fontWeight: 'bold'
                }}>f</div>
              </div>
              <div className="pubblie-dialog-opt-title">Instagram</div>
              <div className="pubblie-dialog-opt-sub">Collega tramite Facebook</div>
            </button>

            {/* Option 2: Collegamento Diretto */}
            <button 
              className="pubblie-dialog-option"
              onClick={() => setShowDirectDisclaimer(true)}
            >
              <div className="pubblie-dialog-circle" style={{ background: 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)' }}>
                <span style={{ fontSize: 28 }}>📷</span>
              </div>
              <div className="pubblie-dialog-opt-title">Instagram</div>
              <div className="pubblie-dialog-opt-sub">Collegamento diretto</div>
            </button>
          </div>

          <button className="pubblie-btn-back" onClick={() => setView('add')}>
            Annulla
          </button>
        </>
      ) : (
        /* Requirements Disclaimer identical to Pubblie screenshot */
        <div style={{ textAlign: 'left' }}>
          <h3 className="pubblie-dialog-title" style={{ textAlign: 'left', marginBottom: 16 }}>Instagram</h3>
          <ul style={{ fontSize: '0.84rem', color: '#CBD5E1', paddingLeft: 18, lineHeight: 1.6, marginBottom: 24 }}>
            <li style={{ marginBottom: 8 }}>L'account Instagram deve essere Business o Creator e collegato ad una pagina Facebook di cui sei amministratore</li>
            <li style={{ marginBottom: 8 }}>Ti verrà richiesto di accedere a Facebook/Instagram per associare l'account Instagram</li>
            <li>Le storie possono essere pubblicate in automatico solamente da un account Business</li>
          </ul>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button 
              className="btn-secondary" 
              onClick={() => setShowDirectDisclaimer(false)}
              style={{ padding: '8px 16px', fontSize: '0.82rem' }}
            >
              Annulla
            </button>
            <button 
              className="btn-primary" 
              onClick={() => handleConnect('instagram_direct')}
              style={{ padding: '8px 20px', fontSize: '0.82rem', background: '#2563EB' }}
            >
              Conferma
            </button>
          </div>
        </div>
      )}
    </div>
  );

  // =========================================================================
  // VIEW 4: CHANNEL DETAIL VIEW (Pubblie Channel Configuration)
  // =========================================================================
  const renderChannelDetailView = () => {
    if (!selectedChannel) return null;
    const isAct = selectedChannel.active === 1 && selectedChannel.status !== 'disabled';

    return (
      <div className="pubblie-detail-container">
        <div className="pubblie-detail-top">
          <button className="pubblie-btn-back-arrow" onClick={() => setView('list')}>
            <ArrowLeft size={16} />
            <span>TORNA INDIETRO</span>
          </button>
          <div style={{ fontSize: '0.82rem', color: '#64748B' }}>
            ID Canale: <strong>#{selectedChannel.id}</strong>
          </div>
        </div>

        {/* Channel Header Card */}
        <div className="pubblie-detail-header-card">
          <div className="pubblie-avatar-wrap" style={{ width: 50, height: 50 }}>
            {selectedChannel.avatar_url ? (
              <img src={selectedChannel.avatar_url} alt="" className="pubblie-avatar-img" style={{ width: 50, height: 50 }} />
            ) : (
              <div className="pubblie-avatar-fallback" style={{ width: 50, height: 50 }}>
                {selectedChannel.account_name.charAt(0).toUpperCase()}
              </div>
            )}
            <div 
              className="pubblie-badge-overlay" 
              style={{ background: getPlatformBadgeColor(selectedChannel.platform), width: 20, height: 20 }}
            >
              {getPlatformBadgeIcon(selectedChannel.platform)}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#F8FAFC' }}>
              {selectedChannel.account_name}
            </div>
            <div style={{ fontSize: '0.8rem', color: '#94A3B8', marginTop: 2 }}>
              {selectedChannel.channel_type || `${selectedChannel.platform} • profilo`}
            </div>
          </div>
        </div>

        {/* Layout: Form on Left, Action Buttons on Right */}
        <div className="pubblie-detail-layout">
          <div className="pubblie-detail-form">
            <div className="pubblie-field-group">
              <label className="pubblie-field-label">Social ID</label>
              <input type="text" readOnly className="pubblie-field-input" value={selectedChannel.social_id || selectedChannel.id} />
            </div>

            <div className="pubblie-field-group">
              <label className="pubblie-field-label">Social Username</label>
              <input type="text" readOnly className="pubblie-field-input" value={selectedChannel.handle || '@' + selectedChannel.account_name} />
            </div>

            <div className="pubblie-field-group">
              <label className="pubblie-field-label">Social Name</label>
              <input type="text" readOnly className="pubblie-field-input" value={selectedChannel.account_name} />
            </div>

            <div className="pubblie-field-group">
              <label className="pubblie-field-label">Data Scadenza</label>
              <input type="text" readOnly className="pubblie-field-input" value={selectedChannel.token_expires_at ? new Date(selectedChannel.token_expires_at).toLocaleString('it-IT') : '60 giorni dalla connessione'} />
            </div>

            <div className="pubblie-field-group">
              <label className="pubblie-field-label">Data Aggiornamento Token</label>
              <input type="text" readOnly className="pubblie-field-input" value={selectedChannel.token_updated_at ? new Date(selectedChannel.token_updated_at).toLocaleString('it-IT') : new Date().toLocaleString('it-IT')} />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
              <span style={{ fontSize: '0.8rem', color: '#94A3B8' }}>Stato canale:</span>
              <span style={{
                fontSize: '0.75rem', fontWeight: 600, padding: '3px 10px', borderRadius: 6,
                background: isAct ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                color: isAct ? '#34D399' : '#F87171'
              }}>
                {isAct ? '✓ attivo' : 'non abilitato'}
              </span>
            </div>
          </div>

          <div className="pubblie-detail-actions">
            <button 
              className="pubblie-btn-reconnect"
              onClick={() => handleConnect(selectedChannel.platform)}
              disabled={actionLoading}
            >
              Riconnetti canale
            </button>

            <button 
              className="pubblie-btn-disable"
              onClick={() => handleChannelAction(selectedChannel.id, isAct ? 'disable' : 'enable')}
              disabled={actionLoading}
            >
              {isAct ? 'Disabilita canale' : 'Abilita canale'}
            </button>

            <button 
              className="pubblie-btn-unlink"
              onClick={() => handleChannelAction(selectedChannel.id, 'unlink')}
              disabled={actionLoading}
            >
              Scollega canale
            </button>
          </div>
        </div>
      </div>
    );
  };

  // =========================================================================
  // VIEW 5: MASTER OAUTH SETTINGS (Admin Panel)
  // =========================================================================
  const renderAdminPanel = () => (
    <form onSubmit={handleSaveMasterSettings} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 10, borderBottom: '1px solid #1E293B' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#F1F5F9', display: 'flex', alignItems: 'center', gap: 8 }}>
            Impostazioni Master OAuth
          </h3>
          <p style={{ margin: '4px 0 0', fontSize: '0.78rem', color: '#94A3B8' }}>
            Inserisci le credenziali Master per abilitare la connessione 1-clic su Meta, Threads, Google, LinkedIn.
          </p>
        </div>
        <button type="button" className="btn-secondary" onClick={() => setView('list')} style={{ fontSize: '0.78rem', padding: '6px 14px' }}>
          ← Torna ai Canali
        </button>
      </div>

      {masterSaveSuccess && (
        <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid #10B981', color: '#34D399', padding: '8px 14px', borderRadius: 8, fontSize: '0.8rem' }}>
          ✓ Credenziali salvate con successo!
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14 }}>
        {/* Meta (Facebook & Instagram) */}
        <div style={{ background: '#0F172A', border: '1px solid #1E293B', borderRadius: 10, padding: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#1877F2' }} />
            <strong style={{ fontSize: '0.82rem', color: '#E2E8F0' }}>Meta (Facebook & Instagram)</strong>
          </div>
          <div className="form-group" style={{ marginBottom: 8 }}>
            <label style={{ fontSize: '0.7rem', color: '#94A3B8' }}>Meta App ID:</label>
            <input 
              type="text" 
              className="input-field" 
              value={masterSettings.oauth_meta_app_id} 
              onChange={e => setMasterSettings({ ...masterSettings, oauth_meta_app_id: e.target.value })} 
              placeholder="es. 4357198247645591" 
            />
          </div>
          <div className="form-group">
            <label style={{ fontSize: '0.7rem', color: '#94A3B8' }}>Meta App Secret:</label>
            <input 
              type="password" 
              className="input-field" 
              value={masterSettings.oauth_meta_app_secret} 
              onChange={e => setMasterSettings({ ...masterSettings, oauth_meta_app_secret: e.target.value })} 
              placeholder="••••••••" 
            />
          </div>
        </div>

        {/* Threads Dedicated */}
        <div style={{ background: '#0F172A', border: '1px solid #1E293B', borderRadius: 10, padding: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#FFFFFF' }} />
            <strong style={{ fontSize: '0.82rem', color: '#E2E8F0' }}>Threads (Dedicated App)</strong>
          </div>
          <div className="form-group" style={{ marginBottom: 8 }}>
            <label style={{ fontSize: '0.7rem', color: '#94A3B8' }}>Threads App ID:</label>
            <input 
              type="text" 
              className="input-field" 
              value={masterSettings.oauth_threads_app_id} 
              onChange={e => setMasterSettings({ ...masterSettings, oauth_threads_app_id: e.target.value })} 
              placeholder="es. 1157237705496938" 
            />
          </div>
          <div className="form-group">
            <label style={{ fontSize: '0.7rem', color: '#94A3B8' }}>Threads App Secret:</label>
            <input 
              type="password" 
              className="input-field" 
              value={masterSettings.oauth_threads_app_secret} 
              onChange={e => setMasterSettings({ ...masterSettings, oauth_threads_app_secret: e.target.value })} 
              placeholder="••••••••" 
            />
          </div>
        </div>

        {/* Google Cloud */}
        <div style={{ background: '#0F172A', border: '1px solid #1E293B', borderRadius: 10, padding: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#EA4335' }} />
            <strong style={{ fontSize: '0.82rem', color: '#E2E8F0' }}>Google (YouTube & My Business)</strong>
          </div>
          <div className="form-group" style={{ marginBottom: 8 }}>
            <label style={{ fontSize: '0.7rem', color: '#94A3B8' }}>Client ID:</label>
            <input 
              type="text" 
              className="input-field" 
              value={masterSettings.oauth_google_client_id} 
              onChange={e => setMasterSettings({ ...masterSettings, oauth_google_client_id: e.target.value })} 
            />
          </div>
          <div className="form-group">
            <label style={{ fontSize: '0.7rem', color: '#94A3B8' }}>Client Secret:</label>
            <input 
              type="password" 
              className="input-field" 
              value={masterSettings.oauth_google_client_secret} 
              onChange={e => setMasterSettings({ ...masterSettings, oauth_google_client_secret: e.target.value })} 
            />
          </div>
        </div>

        {/* LinkedIn */}
        <div style={{ background: '#0F172A', border: '1px solid #1E293B', borderRadius: 10, padding: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#0A66C2' }} />
            <strong style={{ fontSize: '0.82rem', color: '#E2E8F0' }}>LinkedIn Portal</strong>
          </div>
          <div className="form-group" style={{ marginBottom: 8 }}>
            <label style={{ fontSize: '0.7rem', color: '#94A3B8' }}>Client ID:</label>
            <input 
              type="text" 
              className="input-field" 
              value={masterSettings.oauth_linkedin_client_id} 
              onChange={e => setMasterSettings({ ...masterSettings, oauth_linkedin_client_id: e.target.value })} 
            />
          </div>
          <div className="form-group">
            <label style={{ fontSize: '0.7rem', color: '#94A3B8' }}>Client Secret:</label>
            <input 
              type="password" 
              className="input-field" 
              value={masterSettings.oauth_linkedin_client_secret} 
              onChange={e => setMasterSettings({ ...masterSettings, oauth_linkedin_client_secret: e.target.value })} 
            />
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
        <button type="button" className="btn-secondary" onClick={() => setView('list')} style={{ padding: '8px 16px', fontSize: '0.84rem' }}>
          Annulla
        </button>
        <button type="submit" className="btn-primary" disabled={isSavingMaster} style={{ padding: '8px 20px', fontSize: '0.84rem' }}>
          <Check size={15} />
          <span>{isSavingMaster ? 'Salvataggio...' : 'Salva Impostazioni'}</span>
        </button>
      </div>
    </form>
  );

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="standard-modal" style={{ maxWidth: view === 'admin' ? 820 : 800, maxHeight: '90vh' }}>
        {/* Header Bar */}
        <div className="modal-header">
          <div className="modal-title">
            <Share2 size={22} color="#3B82F6" />
            <span>
              {view === 'admin' ? 'Configurazione Master OAuth' : (view === 'add' ? 'Aggiungi Canale' : (view === 'detail' ? 'Dettaglio Canale' : 'Canali'))}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button 
              className="btn-secondary" 
              onClick={() => setShowLogsModal(true)}
              style={{ fontSize: '0.75rem', padding: '5px 10px', display: 'flex', alignItems: 'center', gap: 5, color: '#A78BFA' }}
              title="Visualizza registro diagnostica e log di sistema"
            >
              <Activity size={13} /> Log & Diagnostica
            </button>

            {isAdmin && view !== 'admin' && (
              <button 
                className="btn-secondary" 
                onClick={() => setView('admin')}
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

        {/* Content Body */}
        <div className="modal-content-scroll" style={{ padding: '24px 28px' }}>
          {view === 'admin' ? renderAdminPanel() : 
           view === 'add' ? renderAddChannelView() :
           view === 'instagram_choice' ? renderInstagramChoiceModal() :
           view === 'detail' ? renderChannelDetailView() :
           renderChannelList()}
        </div>

        {/* Footer */}
        {view === 'list' && (
          <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.78rem', color: '#64748B' }}>
              Progetto attivo: <strong style={{ color: '#CBD5E1' }}>{activeWorkspace?.name || 'Workspace'}</strong>
            </span>
            <button className="btn-secondary" onClick={onClose} style={{ padding: '6px 16px', fontSize: '0.82rem' }}>
              Chiudi
            </button>
          </div>
        )}
      </div>

      {/* System Diagnostics Modal */}
      <LogsModal
        isOpen={showLogsModal}
        onClose={() => setShowLogsModal(false)}
      />
    </div>
  );
}
