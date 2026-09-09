import React, { useState } from 'react';
import { 
  X, Share2, Check, AlertCircle, RefreshCw, Power, 
  ExternalLink, ShieldCheck, Link2, Key, HelpCircle, CheckCircle2,
  BookOpen, ChevronRight, ChevronDown, Info
} from 'lucide-react';

const CHANNELS_INFO = {
  facebook: {
    name: 'Facebook',
    desc: 'Pagine aziendali e Gruppi Meta tramite Graph API',
    color: '#1877F2',
    portalUrl: 'https://developers.facebook.com/apps/',
    portalName: 'Meta for Developers',
    permissions: ['pages_show_list', 'pages_read_engagement', 'pages_manage_posts'],
    steps: [
      'Accedi a Meta for Developers (developers.facebook.com) con il tuo account Facebook.',
      'Clicca su "Crea applicazione", seleziona il tipo "Business" o "Altro" e assegna un nome (es. "NonPosto Social").',
      'Nella Dashboard dell\'app, aggiungi il prodotto "Facebook Login for Business" o usa il "Graph API Explorer".',
      'Nel selettore "Utente o Pagina", seleziona la tua Pagina Facebook e aggiungi i permessi: pages_show_list, pages_read_engagement, pages_manage_posts.',
      'Clicca su "Genera Access Token". Per ottenere un token permanente (senza scadenza), scambia il token utente a lunga scadenza tramite l\'endpoint oauth/access_token.',
      'Copia il tuo Meta Page ID (visibile nelle impostazioni della tua Pagina Facebook o tramite Graph API Explorer) e incollalo qui insieme al Token.'
    ],
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
    portalName: 'Instagram Platform (Meta)',
    permissions: ['instagram_basic', 'instagram_content_publish', 'pages_show_list'],
    steps: [
      'Assicurati che il tuo account Instagram sia convertito in account "Professionale" (Aziendale o Creator) e sia collegato alla tua Pagina Facebook.',
      'Nella tua app su Meta for Developers, aggiungi il prodotto "Instagram Graph API".',
      'Nel Graph API Explorer, seleziona la pagina Facebook collegata e richiedi i permessi: instagram_basic, instagram_content_publish.',
      'Esegui una chiamata GET a `me/accounts?fields=instagram_business_account` per ottenere il tuo "Instagram Business Account ID" (un codice numerico di 17 cifre).',
      'Incolla l\'Instagram Business Account ID e l\'Access Token generato nel modulo sottostante.'
    ],
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
    portalName: 'TikTok for Developers',
    permissions: ['video.upload', 'video.publish', 'user.info.basic'],
    steps: [
      'Accedi a developers.tiktok.com e registrati come sviluppatore TikTok.',
      'Clicca su "Manage apps" e seleziona "Create an app".',
      'Nel menu "Add products", attiva la "Content Posting API" e richiedi l\'ambito di autorizzazione video.upload e video.publish.',
      'Copia la "Client Key" e il "Client Secret" dalla sezione Basic Settings dell\'app.',
      'Genera o inserisci il tuo Access Token utente (ottenibile tramite il flusso OAuth di TikTok o il tool Sandbox).'
    ],
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
    portalName: 'Google Cloud Console',
    permissions: ['https://www.googleapis.com/auth/business.manage'],
    steps: [
      'Accedi a Google Cloud Console (console.cloud.google.com) e crea o seleziona un Progetto.',
      'Vai su "API e Servizi" > "Libreria" e abilita "Google Business Profile API" e "My Business Business Information API".',
      'Crea una chiave API (API Key) oppure configura la schermata di consenso OAuth con credenziali OAuth 2.0 Client ID.',
      'Recupera il Location ID della tua scheda aziendale Google Maps (visibile in Google Business Profile > Impostazioni avanzate del profilo > ID profilo dell\'attività, es. locations/123456...).',
      'Incolla il Location ID e la tua chiave o Token API.'
    ],
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
    portalName: 'LinkedIn Developer Portal',
    permissions: ['w_member_social', 'w_organization_social'],
    steps: [
      'Accedi a developer.linkedin.com e clicca su "Create App".',
      'Inserisci il nome dell\'app e associa l\'URL della tua Pagina Aziendale LinkedIn per ottenere la verifica.',
      'Nella scheda "Products", richiedi l\'accesso a "Share on LinkedIn" e "Sign In with LinkedIn using OpenID Connect" (oppure "Community Management API").',
      'Nella scheda "Auth", genera un OAuth 2.0 Access Token con lo scope w_member_social (per post su profilo personale) o w_organization_social (per post su Pagina Aziendale).',
      'Copia l\'URN della tua organizzazione (formato: `urn:li:organization:12345678`, visibile dall\'ID numerico nella barra degli indirizzi della tua pagina LinkedIn Admin).'
    ],
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
    portalName: 'Meta Threads API Portal',
    permissions: ['threads_basic', 'threads_content_publish'],
    steps: [
      'Accedi a Meta for Developers (developers.facebook.com) e crea una nuova app selezionando il caso d\'uso "Threads".',
      'Configura le autorizzazioni aggiungendo: threads_basic e threads_content_publish.',
      'Aggiungi il tuo account Threads come "Tester" nella sezione Ruoli dell\'app ed effettua l\'accesso per autorizzare.',
      'Genera l\'Access Token utente a lunga scadenza tramite il tool di autorizzazione Threads OAuth.',
      'Inserisci il tuo Threads User ID numerico e l\'Access Token.'
    ],
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
    portalName: 'X Developer Portal',
    permissions: ['Read and Write', 'Direct Messages (opzionale)'],
    steps: [
      'Accedi a developer.x.com e sottoscrivi un account sviluppatore (il piano Free permette di pubblicare post).',
      'Crea un Progetto e un\'App all\'interno del Developer Portal.',
      'In "User authentication settings", attiva OAuth 1.0a e seleziona i permessi: "Read and Write".',
      'Nella scheda "Keys and Tokens", rigenera e copia: API Key, API Key Secret, Access Token e Access Token Secret (con permessi Write).',
      'Incolla i 4 valori nel modulo sottostante.'
    ],
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
    portalName: 'Google Cloud Console',
    permissions: ['https://www.googleapis.com/auth/youtube.upload'],
    steps: [
      'Accedi a Google Cloud Console (console.cloud.google.com) e seleziona o crea un progetto.',
      'Nella libreria API, cerca e abilita la "YouTube Data API v3".',
      'Configura la schermata di consenso OAuth e crea credenziali "ID client OAuth 2.0" di tipo "Applicazione Web".',
      'Recupera il tuo Channel ID da YouTube Studio (Impostazioni > Canale > Impostazioni avanzate > ID canale, inizia con "UC...").',
      'Genera il Refresh / Access Token con ambito youtube.upload e incollalo nel modulo.'
    ],
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

  // Active view: 'list' | 'guide'
  const [activeTab, setActiveTab] = useState('list');
  const [selectedGuidePlatform, setSelectedGuidePlatform] = useState('facebook');

  // Selected channel for API connection wizard
  const [connectingChannel, setConnectingChannel] = useState(null);
  const [accountName, setAccountName] = useState('');
  const [handle, setHandle] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [credentials, setCredentials] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [showWizardInstructions, setShowWizardInstructions] = useState(true);

  const openConnectWizard = (ch) => {
    setConnectingChannel(ch);
    setAccountName(ch.account_name || activeWorkspace?.name || '');
    setHandle(ch.handle || '');
    setAvatarUrl(ch.avatar_url || '');
    setCredentials({});
    setSuccessMsg('');
    setShowWizardInstructions(true);
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
      <div className="standard-modal" style={{ maxWidth: 940, maxHeight: '90vh' }}>
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
          <div style={{ display: 'flex', gap: 10, padding: '10px 24px', background: 'var(--bg-card)', borderBottom: '1px solid var(--border-subtle)' }}>
            <button
              className={`btn-secondary ${activeTab === 'list' ? 'active' : ''}`}
              style={{ fontSize: '0.82rem', padding: '6px 14px', background: activeTab === 'list' ? 'var(--primary)' : 'transparent', color: 'white' }}
              onClick={() => setActiveTab('list')}
            >
              <Share2 size={15} /> Canali del Brand ({channels.filter(c => c.active === 1).length}/8)
            </button>
            <button
              className={`btn-secondary ${activeTab === 'guide' ? 'active' : ''}`}
              style={{ fontSize: '0.82rem', padding: '6px 14px', background: activeTab === 'guide' ? 'var(--primary)' : 'transparent', color: 'white' }}
              onClick={() => setActiveTab('guide')}
            >
              <BookOpen size={15} /> 📖 Guida & Istruzioni API (8 Canali)
            </button>
          </div>
        )}

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
                        <span>{info.portalName}</span>
                        <ExternalLink size={13} />
                      </a>
                    </div>

                    {/* Collapsible step-by-step instructions box */}
                    <div style={{ background: 'rgba(139, 92, 246, 0.08)', border: '1px solid rgba(139, 92, 246, 0.25)', borderRadius: 10, overflow: 'hidden' }}>
                      <button
                        type="button"
                        onClick={() => setShowWizardInstructions(!showWizardInstructions)}
                        style={{ width: '100%', padding: '10px 14px', background: 'transparent', border: 'none', color: '#C4B5FD', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', fontWeight: 600, fontSize: '0.82rem' }}
                      >
                        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <BookOpen size={15} /> Come ottenere queste credenziali per {info.name}? (Istruzioni)
                        </span>
                        {showWizardInstructions ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      </button>

                      {showWizardInstructions && (
                        <div style={{ padding: '0 14px 12px', fontSize: '0.78rem', color: '#DDD6FE', lineHeight: 1.5 }}>
                          <ol style={{ paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {info.steps?.map((st, sIdx) => (
                              <li key={sIdx}>{st}</li>
                            ))}
                          </ol>
                          {info.permissions && (
                            <div style={{ marginTop: 8, fontSize: '0.72rem', color: '#A78BFA' }}>
                              <strong>Permessi / Scopes richiesti:</strong> {info.permissions.join(', ')}
                            </div>
                          )}
                        </div>
                      )}
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
          ) : activeTab === 'guide' ? (
            /* SCHERMATA GUIDA COMPLETA ISTRUZIONI PER TUTTI GLI 8 CANALI */
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div style={{ padding: '12px 16px', background: 'rgba(56, 189, 248, 0.08)', border: '1px solid rgba(56, 189, 248, 0.2)', borderRadius: 10, fontSize: '0.82rem', color: '#BAE6FD', display: 'flex', alignItems: 'center', gap: 10 }}>
                <Info size={18} color="#38BDF8" flexShrink={0} />
                <span>
                  Questa sezione contiene tutte le istruzioni dettagliate passo-passo per ottenere le credenziali e i token API ufficiali per ciascuno degli 8 canali social supportati.
                </span>
              </div>

              {/* Platform Selector pills for Guide */}
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

              {/* Selected Platform Guide Details */}
              {(() => {
                const gInfo = CHANNELS_INFO[selectedGuidePlatform];
                const matchingChannel = channels.find(c => c.platform === selectedGuidePlatform);

                return (
                  <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 14, padding: 22, display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 44, height: 44, borderRadius: 10, backgroundColor: gInfo.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold' }}>
                          {selectedGuidePlatform.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Guida Ufficiale: {gInfo.name} API</h3>
                          <p style={{ fontSize: '0.8rem', color: '#94A3B8' }}>{gInfo.desc}</p>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: 8 }}>
                        <a
                          href={gInfo.portalUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="btn-secondary"
                          style={{ fontSize: '0.8rem', padding: '7px 14px' }}
                        >
                          <span>Accedi a {gInfo.portalName}</span>
                          <ExternalLink size={14} />
                        </a>

                        {matchingChannel && (
                          <button
                            type="button"
                            className="btn-primary"
                            style={{ fontSize: '0.8rem', padding: '7px 14px' }}
                            onClick={() => openConnectWizard(matchingChannel)}
                          >
                            <Link2 size={14} />
                            <span>Collega Ora</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Steps list */}
                    <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-subtle)', borderRadius: 12, padding: 18 }}>
                      <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: '#F8FAFC', marginBottom: 12 }}>
                        Procedura Passo-Passo:
                      </h4>
                      <ol style={{ paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 10, fontSize: '0.85rem', color: '#CBD5E1', lineHeight: 1.5 }}>
                        {gInfo.steps.map((step, idx) => (
                          <li key={idx} style={{ paddingLeft: 4 }}>
                            {step}
                          </li>
                        ))}
                      </ol>
                    </div>

                    {/* Permissions & Fields */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                      <div style={{ background: 'rgba(139, 92, 246, 0.06)', border: '1px solid rgba(139, 92, 246, 0.2)', borderRadius: 10, padding: 14 }}>
                        <h5 style={{ fontSize: '0.82rem', fontWeight: 600, color: '#A78BFA', marginBottom: 6 }}>
                          🔑 Permessi / Scopes Richiesti:
                        </h5>
                        <ul style={{ paddingLeft: 18, fontSize: '0.78rem', color: '#DDD6FE' }}>
                          {gInfo.permissions.map((p, pIdx) => (
                            <li key={pIdx}><code>{p}</code></li>
                          ))}
                        </ul>
                      </div>

                      <div style={{ background: 'rgba(16, 185, 129, 0.06)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: 10, padding: 14 }}>
                        <h5 style={{ fontSize: '0.82rem', fontWeight: 600, color: '#34D399', marginBottom: 6 }}>
                          📋 Dati da inserire nel modulo:
                        </h5>
                        <ul style={{ paddingLeft: 18, fontSize: '0.78rem', color: '#A7F3D0' }}>
                          {gInfo.fields.map((f, fIdx) => (
                            <li key={fIdx}><strong>{f.label}</strong></li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          ) : (
            /* TAB 1: LISTA DI TUTTI GLI 8 CANALI SOCIAL */
            <>
              <div style={{ padding: '12px 16px', background: 'rgba(139, 92, 246, 0.08)', border: '1px solid rgba(139, 92, 246, 0.2)', borderRadius: 10, fontSize: '0.82rem', color: '#DDD6FE', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>
                  Collega ciascun canale inserendo le credenziali e i token API del rispettivo social. Solo i canali con stato <strong>"Collegato"</strong> saranno abilitati alla pubblicazione.
                </span>
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ fontSize: '0.75rem', padding: '4px 10px', flexShrink: 0, marginLeft: 12 }}
                  onClick={() => setActiveTab('guide')}
                >
                  <BookOpen size={13} /> Leggi Istruzioni API
                </button>
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
                          <>
                            <button
                              className="btn-secondary"
                              style={{ padding: '7px 10px', fontSize: '0.78rem' }}
                              onClick={() => {
                                setSelectedGuidePlatform(ch.platform);
                                setActiveTab('guide');
                              }}
                              title="Leggi come ottenere le credenziali"
                            >
                              <HelpCircle size={14} />
                              <span>Istruzioni</span>
                            </button>

                            <button
                              className="btn-primary"
                              style={{ padding: '7px 14px', fontSize: '0.82rem' }}
                              onClick={() => openConnectWizard(ch)}
                            >
                              <Link2 size={15} />
                              <span>Collega tramite API</span>
                            </button>
                          </>
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
