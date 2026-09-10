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
 * Retrieve Meta App ID & Secret from settings or environment variables
 */
async function getMetaCredentials() {
  const appIdRow = await get('SELECT value FROM settings WHERE key = ?', ['oauth_meta_app_id']);
  const appSecretRow = await get('SELECT value FROM settings WHERE key = ?', ['oauth_meta_app_secret']);
  const configIdRow = await get('SELECT value FROM settings WHERE key = ?', ['oauth_meta_config_id']);
  const customRedirectRow = await get('SELECT value FROM settings WHERE key = ?', ['oauth_meta_redirect_uri']);

  return {
    appId: appIdRow?.value?.trim() || process.env.OAUTH_META_APP_ID?.trim() || '',
    appSecret: appSecretRow?.value?.trim() || process.env.OAUTH_META_APP_SECRET?.trim() || '',
    configId: configIdRow?.value?.trim() || process.env.OAUTH_META_CONFIG_ID?.trim() || '',
    customRedirectUri: customRedirectRow?.value?.trim() || process.env.OAUTH_META_REDIRECT_URI?.trim() || ''
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
  // Public domains (e.g. nonpostoio.onrender.com) strictly require HTTPS for Meta OAuth
  return `https://${host}/api/oauth/meta/callback`;
}

/**
 * Generate Meta OAuth Dialog URL with full Business Integration scopes or Configuration ID
 */
function buildMetaAuthorizationUrl({ appId, redirectUri, platform, state, configId }) {
  let scopes = [
    'pages_show_list',
    'pages_read_engagement',
    'pages_manage_posts',
    'pages_manage_engagement',
    'pages_read_user_content',
    'read_insights',
    'business_management',
    'public_profile'
  ];

  if (platform === 'instagram') {
    scopes.push(
      'instagram_basic',
      'instagram_content_publish',
      'instagram_manage_comments',
      'instagram_manage_insights'
    );
  } else if (platform === 'threads') {
    scopes = ['threads_basic', 'threads_content_publish'];
  }

  const scopeString = scopes.join(',');
  let url = `https://www.facebook.com/v20.0/dialog/oauth?client_id=${encodeURIComponent(appId)}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${encodeURIComponent(state)}&response_type=code&auth_type=rerequest`;

  if (configId) {
    url += `&config_id=${encodeURIComponent(configId)}`;
  } else {
    url += `&scope=${encodeURIComponent(scopeString)}`;
  }

  return url;
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
 * Fetch Pages and associated Instagram Business Accounts from Graph API (with limit: 100 and pagination)
 */
async function fetchMetaAccounts({ userToken, platform }) {
  let pages = [];
  let nextUrl = 'https://graph.facebook.com/v20.0/me/accounts';
  let params = {
    fields: 'id,name,access_token,category,picture{url},instagram_business_account{id,username,name,profile_picture_url}',
    access_token: userToken,
    limit: 100
  };

  try {
    while (nextUrl) {
      const accountsRes = await axios.get(nextUrl, { params });
      const batch = accountsRes.data.data || [];
      pages = pages.concat(batch);

      // Follow pagination if user has > 100 pages
      if (accountsRes.data.paging && accountsRes.data.paging.next) {
        nextUrl = accountsRes.data.paging.next;
        params = {};
      } else {
        nextUrl = null;
      }
    }
  } catch (err) {
    console.error('[Meta OAuth] Errore durante il recupero delle pagine:', err.response?.data || err.message);
  }

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
    try {
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
    } catch (e) {
      console.warn('[Threads] Fallback profilo non disponibile');
    }
  }

  return {
    rawPagesCount: pages.length,
    accounts: selectableAccounts
  };
}

/**
 * Render Interactive HTML UI for selecting which account to link (Identical to Publie.io UI)
 */
function renderAccountSelectionHtml({ platform, accounts, stateToken, rawPagesCount, workspaceName }) {
  const isFb = platform === 'facebook';
  const isIg = platform === 'instagram';
  const platformTitle = isFb ? 'Facebook' : isIg ? 'Instagram' : 'Threads';

  const accountsJson = JSON.stringify(accounts).replace(/</g, '\\u003c');

  return `
<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${platformTitle} - Collega Canali</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
    body {
      background: #FFFFFF;
      color: #0F172A;
      padding: 32px 36px 100px;
      min-height: 100vh;
      position: relative;
    }
    .wrapper {
      max-width: 860px;
      margin: 0 auto;
    }
    /* Main Platform Title */
    .page-title {
      font-size: 26px;
      font-weight: 700;
      color: #0A2540;
      margin-bottom: 24px;
    }
    /* Publie.io style Notice Card */
    .notice-card {
      background-color: #FEF9EE;
      border: 1px solid #FDE68A;
      border-radius: 12px;
      padding: 18px 22px;
      margin-bottom: 30px;
    }
    .notice-header {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #B45309;
      font-size: 15px;
      font-weight: 700;
      margin-bottom: 8px;
    }
    .notice-icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: #F59E0B;
      color: white;
      font-size: 13px;
      font-weight: bold;
    }
    .notice-desc {
      font-size: 13.5px;
      color: #92400E;
      line-height: 1.5;
      margin-bottom: 12px;
    }
    .notice-desc a {
      color: #B45309;
      font-weight: 600;
      text-decoration: underline;
    }
    .notice-links {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .notice-links a {
      font-size: 13px;
      color: #B45309;
      text-decoration: underline;
      display: inline-block;
      width: fit-content;
    }
    .notice-links a:hover {
      color: #78350F;
    }
    /* Toolbar: Count + Search */
    .toolbar-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 16px;
      padding-bottom: 12px;
    }
    .pages-counter {
      font-size: 18px;
      font-weight: 700;
      color: #0A2540;
    }
    .search-wrapper {
      position: relative;
      width: 260px;
    }
    .search-input {
      width: 100%;
      padding: 9px 36px 9px 14px;
      border: 1px solid #CBD5E1;
      border-radius: 8px;
      font-size: 13.5px;
      color: #1E293B;
      outline: none;
      transition: border-color 0.2s;
    }
    .search-input:focus {
      border-color: #2563EB;
      box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
    }
    .search-icon {
      position: absolute;
      right: 12px;
      top: 50%;
      transform: translateY(-50%);
      color: #64748B;
      pointer-events: none;
      font-size: 14px;
    }
    /* Pages List */
    .pages-table {
      border-top: 1px solid #E2E8F0;
      display: flex;
      flex-direction: column;
    }
    .page-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 8px;
      border-bottom: 1px solid #E2E8F0;
      transition: background-color 0.15s;
      cursor: pointer;
    }
    .page-row:hover {
      background-color: #F8FAFC;
    }
    .page-row.selected {
      background-color: #EFF6FF;
    }
    .page-left {
      display: flex;
      align-items: center;
      gap: 14px;
      min-width: 0;
      flex: 1;
    }
    .page-avatar {
      width: 38px;
      height: 38px;
      border-radius: 50%;
      object-fit: cover;
      background: #E2E8F0;
      flex-shrink: 0;
    }
    .avatar-fallback {
      width: 38px;
      height: 38px;
      border-radius: 50%;
      background: #0A2540;
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 15px;
      flex-shrink: 0;
    }
    .page-name {
      font-size: 14.5px;
      font-weight: 600;
      color: #1E293B;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .page-right {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-shrink: 0;
    }
    /* Badges */
    .badge-connected {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      color: #059669;
      font-size: 13.5px;
      font-weight: 600;
    }
    .badge-connected svg {
      color: #059669;
    }
    /* Checkbox */
    .checkbox-box {
      width: 20px;
      height: 20px;
      border: 2px solid #94A3B8;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.15s;
      background: white;
    }
    .page-row:hover .checkbox-box {
      border-color: #2563EB;
    }
    .checkbox-box.checked {
      background: #2563EB;
      border-color: #2563EB;
    }
    .checkbox-box svg {
      display: none;
    }
    .checkbox-box.checked svg {
      display: block;
    }
    /* Empty State */
    .empty-state {
      padding: 40px 20px;
      text-align: center;
      color: #64748B;
    }
    /* Floating Action Bar */
    .action-bar {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      background: white;
      border-top: 1px solid #E2E8F0;
      box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.08);
      padding: 16px 36px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      z-index: 100;
      transform: translateY(100%);
      transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .action-bar.visible {
      transform: translateY(0);
    }
    .action-bar-content {
      max-width: 860px;
      margin: 0 auto;
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .target-workspace {
      font-size: 14px;
      color: #475569;
    }
    .target-workspace strong {
      color: #0F172A;
    }
    .btn-connect-action {
      background: #2563EB;
      color: white;
      border: none;
      border-radius: 8px;
      padding: 11px 24px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
      transition: background 0.15s, transform 0.1s;
    }
    .btn-connect-action:hover {
      background: #1D4ED8;
    }
    .btn-connect-action:active {
      transform: scale(0.98);
    }
    /* Overlay for loading / success */
    .overlay {
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(255, 255, 255, 0.94);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      z-index: 200;
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
      border: 3px solid #E2E8F0;
      border-top: 3px solid #2563EB;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin-bottom: 16px;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .success-icon {
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background: #10B981;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 28px;
      color: white;
      margin-bottom: 16px;
    }
    .overlay-title {
      font-size: 18px;
      font-weight: 700;
      color: #0F172A;
      margin-bottom: 6px;
    }
    .overlay-sub {
      font-size: 13.5px;
      color: #64748B;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <!-- Platform Title -->
    <h1 class="page-title">${platformTitle}</h1>

    <!-- Publie Notice Card -->
    <div class="notice-card">
      <div class="notice-header">
        <span class="notice-icon">ℹ</span>
        <strong>${platformTitle}</strong>
      </div>
      <p class="notice-desc">
        Se non vedi tutte le tue pagine ${platformTitle} controlla i 
        <a href="https://www.facebook.com/settings?tab=business_tools" target="_blank">permessi concessi</a> 
        alla Integrazione Business su Facebook.
      </p>
      <div class="notice-links">
        <a href="https://www.facebook.com/settings?tab=business_tools" target="_blank">Vai alla sezione integrazioni business su Facebook</a>
        <a href="https://www.facebook.com/settings?tab=applications" target="_blank">Leggi la guida su come modificare i permessi su Facebook</a>
      </div>
    </div>

    <!-- Toolbar -->
    <div class="toolbar-row">
      <div class="pages-counter"><span id="visibleCount">${accounts.length}</span> Pagine</div>
      <div class="search-wrapper">
        <input 
          type="text" 
          id="searchInput" 
          class="search-input" 
          placeholder="Cerca Pagine" 
          oninput="filterPages(this.value)" 
        />
        <span class="search-icon">🔍</span>
      </div>
    </div>

    <!-- Pages List -->
    <div class="pages-table" id="pagesTable">
      ${accounts.length > 0 ? accounts.map((acc, idx) => `
        <div 
          class="page-row" 
          id="row-${idx}" 
          data-name="${escapeHtml(acc.name.toLowerCase())}" 
          onclick="toggleSelect(${idx}, ${acc.isAlreadyConnected ? 'true' : 'false'})"
        >
          <div class="page-left">
            ${acc.avatar_url ? `
              <img class="page-avatar" src="${escapeHtml(acc.avatar_url)}" alt="${escapeHtml(acc.name)}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" />
              <div class="avatar-fallback" style="display:none;">${escapeHtml(acc.name.charAt(0).toUpperCase())}</div>
            ` : `
              <div class="avatar-fallback">${escapeHtml(acc.name.charAt(0).toUpperCase())}</div>
            `}
            <div class="page-name">${escapeHtml(acc.name)}</div>
          </div>

          <div class="page-right">
            ${acc.isAlreadyConnected ? `
              <span class="badge-connected">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                Già connesso
              </span>
            ` : `
              <div class="checkbox-box" id="chk-${idx}">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
              </div>
            `}
          </div>
        </div>
      `).join('') : `
        <div class="empty-state">
          Nessuna Pagina trovata. Assicurati di aver autorizzato le Pagine nella finestra di accesso Facebook.
        </div>
      `}
    </div>
  </div>

  <!-- Floating Action Bar when a page is selected -->
  <div class="action-bar" id="actionBar">
    <div class="action-bar-content">
      <div class="target-workspace">
        Collega a: <strong>${escapeHtml(workspaceName || 'Clinica Vyda')}</strong> (<span id="selectedPageName"></span>)
      </div>
      <button class="btn-connect-action" id="btnConnect" onclick="finalizeConnection()">
        Collega Pagina Selezionata
      </button>
    </div>
  </div>

  <!-- Loading / Success Overlay -->
  <div id="overlay" class="overlay">
    <div id="spinner" class="spinner"></div>
    <div id="success-icon" class="success-icon" style="display:none;">✓</div>
    <div id="overlay-title" class="overlay-title">Collegamento in corso...</div>
    <div id="overlay-sub" class="overlay-sub">Stiamo configurando il token e i permessi del canale.</div>
  </div>

  <script>
    const accounts = ${accountsJson};
    const stateToken = ${JSON.stringify(stateToken)};
    const platform = ${JSON.stringify(platform)};
    let selectedIndex = null;

    function toggleSelect(index, isAlreadyConnected) {
      if (isAlreadyConnected) return;

      if (selectedIndex === index) {
        // Deselect
        selectedIndex = null;
        document.getElementById('row-' + index).classList.remove('selected');
        document.getElementById('chk-' + index).classList.remove('checked');
        document.getElementById('actionBar').classList.remove('visible');
      } else {
        // Uncheck previous
        if (selectedIndex !== null) {
          const prevRow = document.getElementById('row-' + selectedIndex);
          const prevChk = document.getElementById('chk-' + selectedIndex);
          if (prevRow) prevRow.classList.remove('selected');
          if (prevChk) prevChk.classList.remove('checked');
        }

        // Select new
        selectedIndex = index;
        document.getElementById('row-' + index).classList.add('selected');
        document.getElementById('chk-' + index).classList.add('checked');
        document.getElementById('selectedPageName').innerText = accounts[index].name;
        document.getElementById('actionBar').classList.add('visible');
      }
    }

    function filterPages(query) {
      const q = (query || '').toLowerCase().trim();
      let visible = 0;
      accounts.forEach((acc, idx) => {
        const row = document.getElementById('row-' + idx);
        if (!row) return;
        const matches = !q || acc.name.toLowerCase().includes(q);
        row.style.display = matches ? 'flex' : 'none';
        if (matches) visible++;
      });
      document.getElementById('visibleCount').innerText = visible;
    }

    async function finalizeConnection() {
      if (selectedIndex === null) return;
      const selected = accounts[selectedIndex];
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
          }, 1200);
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
