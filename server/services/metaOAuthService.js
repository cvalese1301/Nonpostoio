const axios = require('axios');
const { get, all, run } = require('../db/database');

/**
 * Helper to escape HTML characters
 */
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Retrieve Meta App ID & Secret from settings
 */
async function getMetaCredentials() {
  const appIdRow = await get('SELECT value FROM settings WHERE key = ?', ['oauth_meta_app_id']);
  const appSecretRow = await get('SELECT value FROM settings WHERE key = ?', ['oauth_meta_app_secret']);
  const customRedirectRow = await get('SELECT value FROM settings WHERE key = ?', ['oauth_meta_redirect_uri']);

  return {
    appId: appIdRow?.value?.trim() || '',
    appSecret: appSecretRow?.value?.trim() || '',
    customRedirectUri: customRedirectRow?.value?.trim() || ''
  };
}

/**
 * Determine the canonical redirect URI
 */
function resolveRedirectUri(req, customRedirectUri = '') {
  if (customRedirectUri) {
    return customRedirectUri;
  }
  const host = req.get('host') || 'localhost:3000';
  if (host.includes('localhost') || host.includes('127.0.0.1')) {
    return 'http://localhost:3000/api/oauth/meta/callback';
  }
  // Public domains (like nonpostoio.onrender.com) strictly require HTTPS for Meta OAuth
  return `https://${host}/api/oauth/meta/callback`;
}

/**
 * Generate Meta OAuth Dialog URL
 */
function buildMetaAuthorizationUrl({ appId, redirectUri, platform, state }) {
  let scopes = [
    'pages_show_list',
    'pages_read_engagement',
    'pages_manage_posts',
    'public_profile'
  ];

  if (platform === 'instagram') {
    scopes.push('instagram_basic', 'instagram_content_publish');
  } else if (platform === 'threads') {
    scopes = ['threads_basic', 'threads_content_publish'];
  }

  const scopeString = scopes.join(',');
  return `https://www.facebook.com/v20.0/dialog/oauth?client_id=${encodeURIComponent(appId)}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scopeString)}&state=${encodeURIComponent(state)}&response_type=code&auth_type=rerequest`;
}

/**
 * Exchange authorization code for user access token and extend to 60 days
 */
async function exchangeCodeForTokens({ code, appId, appSecret, redirectUri }) {
  // Step 1: Exchange code for short-lived token
  const tokenRes = await axios.get('https://graph.facebook.com/v20.0/oauth/access_token', {
    params: {
      client_id: appId,
      client_secret: appSecret,
      redirect_uri: redirectUri,
      code
    }
  });

  const shortLivedToken = tokenRes.data.access_token;
  let finalToken = shortLivedToken;

  // Step 2: Exchange for long-lived 60-day token
  try {
    const extendRes = await axios.get('https://graph.facebook.com/v20.0/oauth/access_token', {
      params: {
        grant_type: 'fb_exchange_token',
        client_id: appId,
        client_secret: appSecret,
        fb_exchange_token: shortLivedToken
      }
    });
    if (extendRes.data.access_token) {
      finalToken = extendRes.data.access_token;
    }
  } catch (err) {
    console.warn('[Meta OAuth] Long-lived token exchange failed, falling back to short-lived token:', err.message);
  }

  return finalToken;
}

/**
 * Fetch Pages and associated Instagram Business Accounts from Graph API
 */
async function fetchMetaAccounts({ userToken, platform }) {
  const accountsRes = await axios.get('https://graph.facebook.com/v20.0/me/accounts', {
    params: {
      fields: 'id,name,access_token,category,picture{url},instagram_business_account{id,username,name,profile_picture_url}',
      access_token: userToken
    }
  });

  const pages = accountsRes.data.data || [];
  const selectableAccounts = [];

  if (platform === 'facebook') {
    pages.forEach(p => {
      selectableAccounts.push({
        id: p.id,
        name: p.name,
        handle: `@${p.name.toLowerCase().replace(/[^a-z0-9]+/g, '')}`,
        avatar_url: p.picture?.data?.url || '',
        category: p.category || 'Pagina Facebook',
        access_token: p.access_token,
        type: 'facebook'
      });
    });
  } else if (platform === 'instagram') {
    pages.forEach(p => {
      if (p.instagram_business_account) {
        const ig = p.instagram_business_account;
        selectableAccounts.push({
          id: ig.id,
          name: ig.name || ig.username,
          handle: `@${ig.username}`,
          avatar_url: ig.profile_picture_url || p.picture?.data?.url || '',
          category: `Collegato alla Pagina "${p.name}"`,
          access_token: p.access_token,
          type: 'instagram'
        });
      }
    });
  } else if (platform === 'threads') {
    const meRes = await axios.get('https://graph.facebook.com/v20.0/me', {
      params: {
        fields: 'id,name,picture{url}',
        access_token: userToken
      }
    });
    selectableAccounts.push({
      id: meRes.data.id,
      name: meRes.data.name,
      handle: `@${meRes.data.name.toLowerCase().replace(/[^a-z0-9]+/g, '')}`,
      avatar_url: meRes.data.picture?.data?.url || '',
      category: 'Profilo Threads',
      access_token: userToken,
      type: 'threads'
    });
  }

  return {
    rawPagesCount: pages.length,
    accounts: selectableAccounts
  };
}

/**
 * Render Interactive HTML UI for selecting which account to link
 */
function renderAccountSelectionHtml({ platform, accounts, stateToken, rawPagesCount, workspaceName }) {
  const isFb = platform === 'facebook';
  const isIg = platform === 'instagram';
  const platformTitle = isFb ? 'Pagina Facebook' : isIg ? 'Account Instagram Business' : 'Account Threads';
  const platformColor = isFb ? '#1877F2' : isIg ? '#E1306C' : '#000000';
  const brandIcon = isFb ? 'f' : isIg ? '📸' : '🧵';

  const accountsJson = JSON.stringify(accounts).replace(/</g, '\\u003c');

  return `
<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Collega ${platformTitle} - NonPosto.io</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
    body {
      background: #0B0F19;
      color: #F1F5F9;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 24px;
    }
    .container {
      background: #151D30;
      border: 1px solid #23304E;
      border-radius: 20px;
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.6);
      width: 100%;
      max-width: 520px;
      padding: 32px 28px;
      position: relative;
      overflow: hidden;
    }
    .top-header {
      display: flex;
      align-items: center;
      gap: 14px;
      margin-bottom: 20px;
    }
    .icon-badge {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      background: ${platformColor};
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
      font-weight: bold;
      color: white;
      box-shadow: 0 4px 14px rgba(0,0,0,0.3);
      flex-shrink: 0;
    }
    .header-text h2 {
      font-size: 19px;
      font-weight: 700;
      color: #FFFFFF;
      line-height: 1.3;
    }
    .header-text p {
      font-size: 13px;
      color: #94A3B8;
      margin-top: 2px;
    }
    .workspace-banner {
      background: rgba(124, 58, 237, 0.12);
      border: 1px solid rgba(124, 58, 237, 0.3);
      padding: 8px 14px;
      border-radius: 10px;
      font-size: 12px;
      color: #C4B5FD;
      margin-bottom: 20px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .list-title {
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #64748B;
      margin-bottom: 12px;
    }
    .accounts-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
      max-height: 340px;
      overflow-y: auto;
      padding-right: 4px;
    }
    .accounts-list::-webkit-scrollbar {
      width: 6px;
    }
    .accounts-list::-webkit-scrollbar-thumb {
      background: #23304E;
      border-radius: 4px;
    }
    .account-card {
      background: #1B253D;
      border: 1px solid #283756;
      border-radius: 14px;
      padding: 14px 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      transition: all 0.2s ease;
    }
    .account-card:hover {
      border-color: #3B82F6;
      background: #202D49;
      transform: translateY(-1px);
    }
    .account-info {
      display: flex;
      align-items: center;
      gap: 12px;
      min-width: 0;
      flex: 1;
    }
    .account-avatar {
      width: 44px;
      height: 44px;
      border-radius: 50%;
      object-fit: cover;
      background: #23304E;
      border: 2px solid rgba(255,255,255,0.1);
      flex-shrink: 0;
    }
    .avatar-fallback {
      width: 44px;
      height: 44px;
      border-radius: 50%;
      background: #334155;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      color: #E2E8F0;
      flex-shrink: 0;
    }
    .account-details {
      min-width: 0;
    }
    .account-name {
      font-size: 14px;
      font-weight: 600;
      color: #F8FAFC;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .account-handle {
      font-size: 12px;
      color: #38BDF8;
      margin-top: 1px;
    }
    .account-category {
      font-size: 11px;
      color: #94A3B8;
      margin-top: 2px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .btn-connect {
      background: linear-gradient(135deg, #3B82F6, #2563EB);
      color: white;
      border: none;
      border-radius: 10px;
      padding: 9px 16px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      white-space: nowrap;
      transition: all 0.2s;
      flex-shrink: 0;
    }
    .btn-connect:hover {
      filter: brightness(1.15);
      transform: scale(1.02);
    }
    .btn-connect:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      transform: none;
    }
    /* Empty State */
    .empty-state {
      background: rgba(30, 41, 59, 0.5);
      border: 1px dashed #334155;
      border-radius: 14px;
      padding: 24px;
      text-align: center;
    }
    .empty-icon {
      font-size: 36px;
      margin-bottom: 12px;
    }
    .empty-title {
      font-size: 15px;
      font-weight: 600;
      color: #F8FAFC;
      margin-bottom: 8px;
    }
    .empty-desc {
      font-size: 13px;
      color: #94A3B8;
      line-height: 1.5;
      margin-bottom: 16px;
    }
    .empty-tips {
      text-align: left;
      background: #0F172A;
      border-radius: 10px;
      padding: 12px 16px;
      font-size: 12px;
      color: #CBD5E1;
      margin-bottom: 20px;
      line-height: 1.6;
    }
    .empty-tips li {
      margin-left: 16px;
    }
    .btn-secondary {
      background: #334155;
      color: #F1F5F9;
      border: none;
      border-radius: 10px;
      padding: 10px 20px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
    }
    .btn-secondary:hover {
      background: #475569;
    }
    /* Overlay for loading / success */
    .overlay {
      position: absolute;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(11, 15, 25, 0.94);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      z-index: 50;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.25s ease;
      text-align: center;
      padding: 24px;
    }
    .overlay.active {
      opacity: 1;
      pointer-events: auto;
    }
    .spinner {
      width: 44px;
      height: 44px;
      border: 3px solid #1E293B;
      border-top: 3px solid #3B82F6;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin-bottom: 16px;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .success-icon {
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: #10B981;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 32px;
      color: white;
      margin-bottom: 16px;
      animation: pop 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    }
    @keyframes pop {
      0% { transform: scale(0.5); opacity: 0; }
      100% { transform: scale(1); opacity: 1; }
    }
    .overlay-title {
      font-size: 18px;
      font-weight: 700;
      color: #F8FAFC;
      margin-bottom: 6px;
    }
    .overlay-sub {
      font-size: 13px;
      color: #94A3B8;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="top-header">
      <div class="icon-badge">${brandIcon}</div>
      <div class="header-text">
        <h2>Collega ${platformTitle}</h2>
        <p>Seleziona l'account che desideri sincronizzare</p>
      </div>
    </div>

    ${workspaceName ? `
    <div class="workspace-banner">
      <span>🏢</span> Spazio di lavoro: <strong>${escapeHtml(workspaceName)}</strong>
    </div>` : ''}

    ${accounts.length > 0 ? `
      <div class="list-title">Account disponibili (${accounts.length})</div>
      <div class="accounts-list">
        ${accounts.map((acc, idx) => `
          <div class="account-card">
            <div class="account-info">
              ${acc.avatar_url ? `
                <img class="account-avatar" src="${escapeHtml(acc.avatar_url)}" alt="${escapeHtml(acc.name)}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" />
                <div class="avatar-fallback" style="display:none;">${escapeHtml(acc.name.charAt(0).toUpperCase())}</div>
              ` : `
                <div class="avatar-fallback">${escapeHtml(acc.name.charAt(0).toUpperCase())}</div>
              `}
              <div class="account-details">
                <div class="account-name" title="${escapeHtml(acc.name)}">${escapeHtml(acc.name)}</div>
                <div class="account-handle">${escapeHtml(acc.handle)}</div>
                ${acc.category ? `<div class="account-category">${escapeHtml(acc.category)}</div>` : ''}
              </div>
            </div>
            <button class="btn-connect" onclick="selectAccount(${idx})">
              Collega
            </button>
          </div>
        `).join('')}
      </div>
    ` : `
      <div class="empty-state">
        <div class="empty-icon">⚠️</div>
        <div class="empty-title">Nessun account trovato</div>
        <div class="empty-desc">
          ${isFb 
            ? 'Non abbiamo trovato nessuna Pagina Facebook amministrata da questo profilo.' 
            : isIg 
            ? `Abbiamo trovato ${rawPagesCount} Pagine Facebook, ma nessuna ha un Account Instagram Professionale collegato.` 
            : 'Nessun account trovato per questa piattaforma.'}
        </div>
        
        <div class="empty-tips">
          <strong>Come risolvere:</strong>
          <ul>
            ${isFb ? `
              <li>Assicurati di aver creato una Pagina Facebook con il profilo con cui hai effettuato il login.</li>
              <li>Verifica di avere il ruolo di Amministratore o Editor sulla Pagina.</li>
            ` : isIg ? `
              <li>Apri l'app di <strong>Instagram</strong> sul telefono.</li>
              <li>Vai sul Profilo &gt; <em>Modifica Profilo</em> e assicurati che sia configurato come <strong>Account Professionale (Aziendale o Creator)</strong>.</li>
              <li>Sotto <em>Informazioni pubbliche sull'azienda</em> &gt; <em>Pagina</em>, collega la Pagina Facebook.</li>
            ` : `
              <li>Verifica che il tuo account sia abilitato per la pubblicazione via API.</li>
            `}
          </ul>
        </div>

        <button class="btn-secondary" onclick="window.close()">Chiudi Finestra</button>
      </div>
    `}

    <!-- Loading / Success Overlay -->
    <div id="overlay" class="overlay">
      <div id="spinner" class="spinner"></div>
      <div id="success-icon" class="success-icon" style="display:none;">✓</div>
      <div id="overlay-title" class="overlay-title">Collegamento in corso...</div>
      <div id="overlay-sub" class="overlay-sub">Stiamo configurando il token e i permessi del canale.</div>
    </div>
  </div>

  <script>
    const accounts = ${accountsJson};
    const stateToken = ${JSON.stringify(stateToken)};
    const platform = ${JSON.stringify(platform)};

    async function selectAccount(index) {
      const selected = accounts[index];
      if (!selected) return;

      const overlay = document.getElementById('overlay');
      const spinner = document.getElementById('spinner');
      const successIcon = document.getElementById('success-icon');
      const title = document.getElementById('overlay-title');
      const sub = document.getElementById('overlay-sub');

      overlay.classList.add('active');
      spinner.style.display = 'block';
      successIcon.style.display = 'none';
      title.innerText = 'Collegamento in corso...';
      sub.innerText = 'Stiamo salvando i dati di ' + selected.name;

      try {
        const res = await fetch('/api/oauth/meta/finalize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            stateToken: stateToken,
            account: selected
          })
        });

        const data = await res.json();
        if (data.success) {
          spinner.style.display = 'none';
          successIcon.style.display = 'flex';
          title.innerText = 'Collegato con Successo!';
          sub.innerText = selected.name + ' è ora sincronizzato con NonPosto.io.';

          if (window.opener) {
            window.opener.postMessage({
              type: 'oauth_success',
              platform: platform,
              account: selected
            }, '*');
          }

          setTimeout(function() {
            window.close();
          }, 1400);
        } else {
          alert('Errore durante il salvataggio: ' + (data.error || 'Riprova più tardi'));
          overlay.classList.remove('active');
        }
      } catch (err) {
        alert('Errore di connessione: ' + err.message);
        overlay.classList.remove('active');
      }
    }
  </script>
</body>
</html>
  `;
}

module.exports = {
  escapeHtml,
  getMetaCredentials,
  resolveRedirectUri,
  buildMetaAuthorizationUrl,
  exchangeCodeForTokens,
  fetchMetaAccounts,
  renderAccountSelectionHtml
};
