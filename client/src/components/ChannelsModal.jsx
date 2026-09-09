import React, { useState, useEffect, useRef } from 'react';
import { 
  X, Share2, Check, AlertCircle, RefreshCw, Power, 
  ExternalLink, Link2, CheckCircle2, LogOut, Loader2,
  Wifi, WifiOff
} from 'lucide-react';

const CHANNELS = [
  {
    key: 'facebook',
    name: 'Facebook',
    desc: 'Pagine e Gruppi',
    color: '#1877F2',
    icon: 'f',
    iconFont: 'fab fa-facebook-f',
    oauthUrl: 'https://www.facebook.com/v18.0/dialog/oauth'
  },
  {
    key: 'instagram',
    name: 'Instagram',
    desc: 'Feed, Reels e Storie',
    color: '#E1306C',
    icon: '',
    iconFont: 'fab fa-instagram',
    oauthUrl: 'https://www.facebook.com/v18.0/dialog/oauth'
  },
  {
    key: 'threads',
    name: 'Threads',
    desc: 'Post e conversazioni',
    color: '#000000',
    borderColor: '#555',
    icon: '',
    iconFont: 'fa-brands fa-threads',
    oauthUrl: 'https://www.threads.net/oauth/authorize'
  },
  {
    key: 'tiktok',
    name: 'TikTok',
    desc: 'Video e clip virali',
    color: '#000000',
    borderColor: '#25F4EE',
    icon: '',
    iconFont: 'fab fa-tiktok',
    oauthUrl: 'https://www.tiktok.com/v2/auth/authorize/'
  },
  {
    key: 'youtube',
    name: 'YouTube',
    desc: 'Video, Short e Community',
    color: '#FF0000',
    icon: '',
    iconFont: 'fab fa-youtube',
    oauthUrl: 'https://accounts.google.com/o/oauth2/v2/auth'
  },
  {
    key: 'x',
    name: 'X (Twitter)',
    desc: 'Post e Thread',
    color: '#000000',
    borderColor: '#71717A',
    icon: '𝕏',
    iconFont: null,
    oauthUrl: 'https://twitter.com/i/oauth2/authorize'
  },
  {
    key: 'linkedin',
    name: 'LinkedIn',
    desc: 'Profili e Pagine Aziendali',
    color: '#0A66C2',
    icon: '',
    iconFont: 'fab fa-linkedin-in',
    oauthUrl: 'https://www.linkedin.com/oauth/v2/authorization'
  },
  {
    key: 'google_business',
    name: 'Google Business',
    desc: 'Scheda Google Maps',
    color: '#4285F4',
    icon: 'G',
    iconFont: null,
    oauthUrl: 'https://accounts.google.com/o/oauth2/v2/auth'
  }
];

export default function ChannelsModal({ 
  isOpen, 
  onClose, 
  activeWorkspace, 
  channels = [], 
  onRefreshChannels 
}) {
  const [connectingPlatform, setConnectingPlatform] = useState(null);
  const [oauthPopupOpen, setOauthPopupOpen] = useState(false);
  const [connectSuccess, setConnectSuccess] = useState(null);
  const [disconnecting, setDisconnecting] = useState(null);
  const popupRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  if (!isOpen) return null;

  const getChannelData = (platformKey) => {
    return channels.find(c => c.platform === platformKey);
  };

  // Simulate OAuth popup flow (like pubblie.io)
  const handleConnect = async (platformKey) => {
    const channelData = getChannelData(platformKey);
    if (!channelData) return;

    const channelMeta = CHANNELS.find(c => c.key === platformKey);

    setConnectingPlatform(platformKey);
    setOauthPopupOpen(true);

    // Open a small popup window simulating OAuth authorization
    const width = 520;
    const height = 620;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;

    const popup = window.open(
      'about:blank',
      `oauth_${platformKey}`,
      `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no,status=no,scrollbars=yes`
    );

    if (popup) {
      popupRef.current = popup;

      // Write the OAuth simulation page into the popup
      const brandName = channelMeta?.name || platformKey;
      const brandColor = channelMeta?.color || '#8B5CF6';
      const workspaceName = activeWorkspace?.name || 'il tuo Brand';

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
              width: 64px;
              height: 64px;
              border-radius: 16px;
              background: ${brandColor};
              display: flex;
              align-items: center;
              justify-content: center;
              margin: 0 auto 20px;
              color: white;
              font-size: 28px;
              font-weight: bold;
            }
            h2 {
              font-size: 20px;
              font-weight: 700;
              margin-bottom: 8px;
              color: #111;
            }
            p {
              font-size: 14px;
              color: #666;
              line-height: 1.5;
              margin-bottom: 24px;
            }
            .permissions {
              background: #f0f4ff;
              border-radius: 12px;
              padding: 16px;
              margin-bottom: 24px;
              text-align: left;
            }
            .permissions h4 {
              font-size: 13px;
              font-weight: 600;
              color: #333;
              margin-bottom: 8px;
            }
            .perm-item {
              display: flex;
              align-items: center;
              gap: 8px;
              padding: 4px 0;
              font-size: 13px;
              color: #555;
            }
            .perm-item::before {
              content: '✓';
              color: ${brandColor};
              font-weight: bold;
            }
            .spinner {
              width: 40px;
              height: 40px;
              border: 3px solid #e0e0e0;
              border-top: 3px solid ${brandColor};
              border-radius: 50%;
              animation: spin 0.8s linear infinite;
              margin: 0 auto 16px;
            }
            @keyframes spin { to { transform: rotate(360deg); } }
            .success-icon {
              width: 56px;
              height: 56px;
              border-radius: 50%;
              background: #22c55e;
              display: flex;
              align-items: center;
              justify-content: center;
              margin: 0 auto 16px;
              color: white;
              font-size: 28px;
            }
            .btn-authorize {
              width: 100%;
              padding: 14px 24px;
              background: ${brandColor};
              color: white;
              border: none;
              border-radius: 12px;
              font-size: 15px;
              font-weight: 600;
              cursor: pointer;
              transition: all 0.2s;
            }
            .btn-authorize:hover {
              filter: brightness(1.1);
              transform: translateY(-1px);
            }
            .btn-authorize:disabled {
              opacity: 0.6;
              cursor: not-allowed;
              transform: none;
            }
            .footer-text {
              font-size: 11px;
              color: #999;
              margin-top: 16px;
            }
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
              <div class="footer-text">
                Accedendo, accetti i termini di servizio di NonPosto.io
              </div>
            </div>

            <div id="phase-connecting" class="phase-connecting">
              <div class="spinner"></div>
              <h2>Collegamento in corso...</h2>
              <p>Stiamo collegando il tuo account ${brandName} a NonPosto.io. Attendi qualche secondo.</p>
            </div>

            <div id="phase-success" class="phase-success">
              <div class="success-icon">✓</div>
              <h2>Account Collegato!</h2>
              <p>Il tuo account ${brandName} è stato collegato con successo a <strong>${workspaceName}</strong>. Questa finestra si chiuderà automaticamente.</p>
            </div>
          </div>

          <script>
            function authorize() {
              document.getElementById('btn-auth').disabled = true;
              document.getElementById('phase-auth').classList.remove('active');
              document.getElementById('phase-connecting').classList.add('active');
              
              // Signal parent window
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

    // Listen for messages from the popup
    const handleMessage = async (event) => {
      if (event.data?.type === 'oauth_success' && event.data?.platform === platformKey) {
        window.removeEventListener('message', handleMessage);

        // Call the backend to finalize the connection
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
            timerRef.current = setTimeout(() => {
              setConnectSuccess(null);
            }, 3000);
          }
        } catch (err) {
          console.error('Connection error:', err);
        }

        setConnectingPlatform(null);
        setOauthPopupOpen(false);
      }
    };

    window.addEventListener('message', handleMessage);

    // Poll for popup closed without completing
    const pollClosed = setInterval(() => {
      if (popup && popup.closed) {
        clearInterval(pollClosed);
        // If still connecting, it means user closed popup without authorizing
        setConnectingPlatform(null);
        setOauthPopupOpen(false);
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
      if (data.success && onRefreshChannels) {
        await onRefreshChannels();
      }
    } catch (err) {
      alert('Errore durante la disconnessione.');
    } finally {
      setDisconnecting(null);
    }
  };

  const connectedCount = channels.filter(c => c.active === 1 && c.account_name).length;

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="standard-modal channels-modal-redesign" style={{ maxWidth: 720, maxHeight: '88vh' }}>
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title">
            <Share2 size={22} color="#8B5CF6" />
            <span>Canali Social</span>
            <span style={{ 
              fontSize: '0.72rem', 
              background: connectedCount > 0 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(148, 163, 184, 0.12)', 
              color: connectedCount > 0 ? '#34D399' : '#94A3B8', 
              padding: '3px 10px', 
              borderRadius: 999, 
              fontWeight: 600,
              marginLeft: 4
            }}>
              {connectedCount}/{CHANNELS.length} collegati
            </span>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="modal-content-scroll" style={{ padding: '20px 24px' }}>
          {/* Intro Text */}
          <p style={{ 
            fontSize: '0.84rem', 
            color: '#94A3B8', 
            marginBottom: 20, 
            lineHeight: 1.5 
          }}>
            Collega i tuoi profili social per pubblicare contenuti direttamente da <strong style={{ color: '#CBD5E1' }}>NonPosto.io</strong>. 
            Clicca su <strong style={{ color: '#CBD5E1' }}>Collega</strong> per autorizzare l'accesso.
          </p>

          {/* Channels Grid */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {CHANNELS.map((ch) => {
              const channelData = getChannelData(ch.key);
              const isConnected = channelData?.active === 1 && channelData?.account_name;
              const isConnecting = connectingPlatform === ch.key;
              const justConnected = connectSuccess === ch.key;
              const isDisconnecting = disconnecting === ch.key;

              return (
                <div 
                  key={ch.key}
                  className="channel-row-card"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                    padding: '12px 16px',
                    background: isConnected 
                      ? 'rgba(16, 185, 129, 0.04)' 
                      : 'var(--bg-card)',
                    border: `1px solid ${isConnected ? 'rgba(16, 185, 129, 0.25)' : justConnected ? 'rgba(16, 185, 129, 0.5)' : 'var(--border-subtle)'}`,
                    borderRadius: 12,
                    transition: 'all 0.25s ease',
                  }}
                >
                  {/* Platform Icon */}
                  <div 
                    style={{ 
                      width: 42, 
                      height: 42, 
                      borderRadius: 10, 
                      backgroundColor: ch.color, 
                      border: ch.borderColor ? `1px solid ${ch.borderColor}` : 'none',
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      color: 'white', 
                      fontSize: ch.iconFont ? '1.1rem' : '1.2rem',
                      fontWeight: 'bold',
                      flexShrink: 0,
                      boxShadow: `0 2px 10px ${ch.color}30`
                    }}
                  >
                    {ch.iconFont ? (
                      <i className={ch.iconFont}></i>
                    ) : (
                      <span>{ch.icon}</span>
                    )}
                  </div>

                  {/* Platform Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ 
                        fontSize: '0.92rem', 
                        fontWeight: 600, 
                        color: '#F1F5F9' 
                      }}>
                        {ch.name}
                      </span>
                    </div>
                    <span style={{ 
                      fontSize: '0.75rem', 
                      color: isConnected ? '#6EE7B7' : '#64748B' 
                    }}>
                      {isConnected 
                        ? `${channelData.account_name}${channelData.handle ? ` · ${channelData.handle}` : ''}` 
                        : ch.desc
                      }
                    </span>
                  </div>

                  {/* Status & Action */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    {isConnected ? (
                      <>
                        {/* Connected badge */}
                        <span style={{ 
                          display: 'flex',
                          alignItems: 'center',
                          gap: 5,
                          fontSize: '0.75rem', 
                          color: '#34D399',
                          fontWeight: 600,
                          padding: '4px 10px',
                          background: 'rgba(16, 185, 129, 0.1)',
                          borderRadius: 8
                        }}>
                          <Wifi size={13} />
                          Collegato
                        </span>

                        {/* Disconnect button */}
                        <button
                          onClick={() => handleDisconnect(channelData.id, ch.key)}
                          disabled={isDisconnecting}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 5,
                            padding: '6px 12px',
                            background: 'rgba(239, 68, 68, 0.08)',
                            border: '1px solid rgba(239, 68, 68, 0.2)',
                            borderRadius: 8,
                            color: '#F87171',
                            fontSize: '0.75rem',
                            fontWeight: 500,
                            cursor: isDisconnecting ? 'wait' : 'pointer',
                            transition: 'all 0.2s'
                          }}
                          onMouseOver={(e) => {
                            e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)';
                          }}
                          onMouseOut={(e) => {
                            e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)';
                          }}
                        >
                          {isDisconnecting ? (
                            <RefreshCw size={13} className="spinning" />
                          ) : (
                            <LogOut size={13} />
                          )}
                          {isDisconnecting ? 'Scollegamento...' : 'Scollega'}
                        </button>
                      </>
                    ) : justConnected ? (
                      <span style={{ 
                        display: 'flex',
                        alignItems: 'center',
                        gap: 5,
                        fontSize: '0.8rem', 
                        color: '#22C55E',
                        fontWeight: 600,
                        padding: '6px 14px',
                        background: 'rgba(34, 197, 94, 0.12)',
                        border: '1px solid rgba(34, 197, 94, 0.3)',
                        borderRadius: 10,
                        animation: 'fadeIn 0.3s ease'
                      }}>
                        <CheckCircle2 size={16} />
                        Collegato!
                      </span>
                    ) : (
                      <button
                        onClick={() => handleConnect(ch.key)}
                        disabled={isConnecting || oauthPopupOpen}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          padding: '8px 18px',
                          background: ch.color,
                          border: 'none',
                          borderRadius: 10,
                          color: 'white',
                          fontSize: '0.82rem',
                          fontWeight: 600,
                          cursor: (isConnecting || oauthPopupOpen) ? 'wait' : 'pointer',
                          opacity: (isConnecting || oauthPopupOpen) ? 0.6 : 1,
                          transition: 'all 0.2s',
                          boxShadow: `0 2px 8px ${ch.color}40`,
                          whiteSpace: 'nowrap'
                        }}
                        onMouseOver={(e) => {
                          if (!isConnecting && !oauthPopupOpen) {
                            e.currentTarget.style.filter = 'brightness(1.15)';
                            e.currentTarget.style.transform = 'translateY(-1px)';
                          }
                        }}
                        onMouseOut={(e) => {
                          e.currentTarget.style.filter = 'none';
                          e.currentTarget.style.transform = 'none';
                        }}
                      >
                        {isConnecting ? (
                          <>
                            <RefreshCw size={14} className="spinning" />
                            <span>Collegamento...</span>
                          </>
                        ) : (
                          <>
                            <Link2 size={14} />
                            <span>Collega</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
          <span style={{ fontSize: '0.75rem', color: '#64748B' }}>
            {connectedCount > 0 
              ? `${connectedCount} canal${connectedCount === 1 ? 'e' : 'i'} collegat${connectedCount === 1 ? 'o' : 'i'} per ${activeWorkspace?.name}`
              : `Nessun canale collegato per ${activeWorkspace?.name}`
            }
          </span>
          <button className="btn-secondary" onClick={onClose} style={{ padding: '6px 16px', fontSize: '0.82rem' }}>
            Chiudi
          </button>
        </div>
      </div>
    </div>
  );
}
