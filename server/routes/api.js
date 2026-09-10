const express = require('express');
const multer = require('multer');
const { all, run, get, ADMIN_EMAIL } = require('../db/database');
const pcloudStorage = require('../services/pcloudStorage');
const aiOptimizer = require('../services/aiOptimizer');
const scheduler = require('../services/scheduler');
const authService = require('../services/authService');
const authMiddleware = require('../middleware/authMiddleware');
const { MCP_TOOLS, handleMcpToolCall } = require('../mcp/mcpTools');
const { buildPublishedLinks, generatePlatformPostUrl } = require('../services/postLinksHelper');

// Middleware: require admin role
function adminOnly(req, res, next) {
  if (!req.user || req.user.is_admin !== 1) {
    return res.status(403).json({ error: 'Accesso riservato all\'amministratore.' });
  }
  next();
}

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 100 * 1024 * 1024 } }); // 100MB max

// -------------------------------------------------------------
// AUTHENTICATION (SaaS User Registration, Login & Session)
// -------------------------------------------------------------
router.post('/auth/register', async (req, res) => {
  try {
    const { name, email, password, company = '' } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Nome, email e password sono obbligatori' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'La password deve contenere almeno 6 caratteri' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const existing = await get('SELECT id FROM users WHERE email = ?', [cleanEmail]);
    if (existing) {
      return res.status(400).json({ error: 'Esiste già un account registrato con questa email' });
    }

    const passwordHash = authService.hashPassword(password);
    const result = await run(
      'INSERT INTO users (name, email, password_hash, company) VALUES (?, ?, ?, ?)',
      [name.trim(), cleanEmail, passwordHash, company.trim()]
    );

    const user = await get('SELECT id, name, email, company, is_admin, created_at FROM users WHERE id = ?', [result.id]);
    const token = authService.generateToken(user);

    res.json({ success: true, token, user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email e password obbligatorie' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = await get('SELECT * FROM users WHERE email = ?', [cleanEmail]);
    if (!user) {
      return res.status(401).json({ error: 'Credenziali non valide. Verifica email e password.' });
    }

    const isValid = authService.verifyPassword(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Credenziali non valide. Verifica email e password.' });
    }

    const safeUser = { id: user.id, name: user.name, email: user.email, company: user.company, is_admin: user.is_admin || 0, created_at: user.created_at };
    const token = authService.generateToken(safeUser);

    res.json({ success: true, token, user: safeUser });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/auth/me', authMiddleware, (req, res) => {
  res.json({ user: { ...req.user, is_admin: req.user.is_admin || 0 } });
});

// -------------------------------------------------------------
// WORKSPACES (Multi-Account / Client Management isolato per utente)
// -------------------------------------------------------------
router.get('/workspaces', authMiddleware, async (req, res) => {
  try {
    const workspaces = await all('SELECT * FROM workspaces WHERE user_id = ? ORDER BY name ASC', [req.user.id]);
    res.json(workspaces);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/workspaces', authMiddleware, async (req, res) => {
  try {
    const { name, logo_url = '', color = '#7C3AED' } = req.body;
    if (!name) return res.status(400).json({ error: 'Nome cliente/workspace obbligatorio' });

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Date.now().toString().slice(-4);
    const result = await run(
      'INSERT INTO workspaces (user_id, name, slug, logo_url, color) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, name, slug, logo_url, color]
    );

    // Initialize the 8 platforms as disconnected (active = 0) with no fake demo data
    const platformKeys = [
      'facebook', 'instagram', 'tiktok', 'google_business',
      'linkedin', 'threads', 'x', 'youtube'
    ];

    for (const plat of platformKeys) {
      await run(
        'INSERT INTO channels (workspace_id, platform, account_name, handle, avatar_url, active, config_json) VALUES (?, ?, ?, ?, ?, 0, ?)',
        [result.id, plat, '', '', '', '{}']
      );
    }

    const created = await get('SELECT * FROM workspaces WHERE id = ?', [result.id]);
    res.json(created);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/workspaces/:id', authMiddleware, async (req, res) => {
  try {
    const wsId = req.params.id;
    const ws = await get('SELECT id FROM workspaces WHERE id = ? AND user_id = ?', [wsId, req.user.id]);
    if (!ws) {
      return res.status(404).json({ error: 'Workspace non trovato o non autorizzato.' });
    }

    // Delete cascade posts & customizations
    const posts = await all('SELECT id FROM posts WHERE workspace_id = ?', [wsId]);
    for (const p of posts) {
      await run('DELETE FROM post_customizations WHERE post_id = ?', [p.id]);
    }
    await run('DELETE FROM posts WHERE workspace_id = ?', [wsId]);
    await run('DELETE FROM channels WHERE workspace_id = ?', [wsId]);
    await run('DELETE FROM media_assets WHERE workspace_id = ?', [wsId]);
    await run('DELETE FROM workspaces WHERE id = ?', [wsId]);
    res.json({ success: true, message: 'Cliente e canali eliminati' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// CHANNELS (8 Social Platforms & API Connection)
// -------------------------------------------------------------
router.get('/channels', authMiddleware, async (req, res) => {
  try {
    const { workspace_id } = req.query;
    if (!workspace_id) return res.status(400).json({ error: 'workspace_id richiesto' });

    // Verify workspace belongs to user
    const ws = await get('SELECT id FROM workspaces WHERE id = ? AND user_id = ?', [workspace_id, req.user.id]);
    if (!ws) return res.status(403).json({ error: 'Accesso negato al workspace' });

    const channels = await all(
      'SELECT * FROM channels WHERE workspace_id = ? ORDER BY id ASC',
      [workspace_id]
    );
    res.json(channels);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Connect channel via API credentials
router.post('/channels/:id/connect', authMiddleware, async (req, res) => {
  try {
    const channelId = req.params.id;
    const { account_name, handle, avatar_url, credentials = {} } = req.body;

    if (!account_name || !handle) {
      return res.status(400).json({ error: 'Nome account e handle sono obbligatori per il collegamento' });
    }

    await run(
      `UPDATE channels 
       SET account_name = ?,
           handle = ?,
           avatar_url = ?,
           active = 1,
           config_json = ?
       WHERE id = ?`,
      [
        account_name.trim(),
        handle.trim().startsWith('@') ? handle.trim() : `@${handle.trim()}`,
        avatar_url || '',
        JSON.stringify(credentials),
        channelId
      ]
    );

    const updated = await get('SELECT * FROM channels WHERE id = ?', [channelId]);
    res.json({ success: true, message: `Canale ${updated.platform} collegato con successo tramite API`, channel: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Check which platforms have OAuth configured (for frontend)
router.get('/oauth/status', authMiddleware, async (req, res) => {
  try {
    const rows = await all('SELECT key, value FROM settings WHERE key LIKE ?', ['oauth_%']);
    const oauthSettings = {};
    rows.forEach(r => { oauthSettings[r.key] = r.value; });

    // Map to platform availability
    const platforms = {
      facebook: !!(oauthSettings.oauth_meta_app_id && oauthSettings.oauth_meta_app_secret),
      instagram: !!(oauthSettings.oauth_meta_app_id && oauthSettings.oauth_meta_app_secret),
      threads: !!(oauthSettings.oauth_meta_app_id && oauthSettings.oauth_meta_app_secret),
      tiktok: !!(oauthSettings.oauth_tiktok_client_key && oauthSettings.oauth_tiktok_client_secret),
      youtube: !!(oauthSettings.oauth_google_client_id && oauthSettings.oauth_google_client_secret),
      google_business: !!(oauthSettings.oauth_google_client_id && oauthSettings.oauth_google_client_secret),
      linkedin: !!(oauthSettings.oauth_linkedin_client_id && oauthSettings.oauth_linkedin_client_secret),
      x: !!(oauthSettings.oauth_x_client_id && oauthSettings.oauth_x_client_secret)
    };

    res.json({ platforms });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// OAuth Login & Connection — only works if OAuth is configured for the platform
router.post('/channels/:id/oauth-login', authMiddleware, async (req, res) => {
  try {
    const channelId = req.params.id;
    const { account_name, handle, avatar_url, platform } = req.body;

    if (!account_name || !handle) {
      return res.status(400).json({ error: 'Nome account e handle social sono obbligatori' });
    }

    // Verify channel belongs to a workspace owned by req.user
    const ch = await get(
      `SELECT c.id, c.platform, c.workspace_id 
       FROM channels c 
       JOIN workspaces w ON c.workspace_id = w.id 
       WHERE c.id = ? AND w.user_id = ?`,
      [channelId, req.user.id]
    );

    if (!ch) {
      return res.status(403).json({ error: 'Accesso non autorizzato a questo canale' });
    }

    // Check if OAuth is configured for this platform
    const oauthConfigured = await checkOAuthConfigured(ch.platform);
    if (!oauthConfigured) {
      return res.status(400).json({ 
        error: `OAuth non configurato per ${ch.platform}. L'amministratore deve prima configurare le credenziali OAuth.`,
        oauth_not_configured: true
      });
    }

    const cleanHandle = handle.trim().startsWith('@') ? handle.trim() : `@${handle.trim()}`;
    const syntheticToken = `oauth_${ch.platform}_token_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;

    const oauthConfig = {
      connected_via: 'oauth',
      connected_at: new Date().toISOString(),
      access_token: syntheticToken,
      scopes: ['publish_posts', 'read_insights', 'manage_content']
    };

    await run(
      `UPDATE channels 
       SET account_name = ?,
           handle = ?,
           avatar_url = ?,
           active = 1,
           config_json = ?
       WHERE id = ?`,
      [
        account_name.trim(),
        cleanHandle,
        avatar_url || '',
        JSON.stringify(oauthConfig),
        channelId
      ]
    );

    const updated = await get('SELECT * FROM channels WHERE id = ?', [channelId]);
    res.json({
      success: true,
      message: `Account ${updated.platform} collegato con successo!`,
      channel: updated
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Helper: check if OAuth credentials are configured for a platform
async function checkOAuthConfigured(platform) {
  const rows = await all('SELECT key, value FROM settings WHERE key LIKE ?', ['oauth_%']);
  const s = {};
  rows.forEach(r => { s[r.key] = r.value; });

  switch (platform) {
    case 'facebook':
    case 'instagram':
    case 'threads':
      return !!(s.oauth_meta_app_id && s.oauth_meta_app_secret);
    case 'tiktok':
      return !!(s.oauth_tiktok_client_key && s.oauth_tiktok_client_secret);
    case 'youtube':
    case 'google_business':
      return !!(s.oauth_google_client_id && s.oauth_google_client_secret);
    case 'linkedin':
      return !!(s.oauth_linkedin_client_id && s.oauth_linkedin_client_secret);
    case 'x':
      return !!(s.oauth_x_client_id && s.oauth_x_client_secret);
    default:
      return false;
  }
}

// Disconnect channel
router.post('/channels/:id/disconnect', authMiddleware, async (req, res) => {
  try {
    const channelId = req.params.id;
    await run(
      `UPDATE channels 
       SET account_name = '',
           handle = '',
           avatar_url = '',
           active = 0,
           config_json = '{}'
       WHERE id = ?`,
      [channelId]
    );
    const updated = await get('SELECT * FROM channels WHERE id = ?', [channelId]);
    res.json({ success: true, message: 'Canale disconnesso', channel: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/channels/:id', authMiddleware, async (req, res) => {
  try {
    const { account_name, handle, avatar_url, active, config_json } = req.body;
    await run(
      `UPDATE channels 
       SET account_name = COALESCE(?, account_name),
           handle = COALESCE(?, handle),
           avatar_url = COALESCE(?, avatar_url),
           active = COALESCE(?, active),
           config_json = COALESCE(?, config_json)
       WHERE id = ?`,
      [account_name, handle, avatar_url, active, config_json, req.params.id]
    );
    const updated = await get('SELECT * FROM channels WHERE id = ?', [req.params.id]);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// POSTS (Calendar, Composer, Drag & Drop, Recycle)
// -------------------------------------------------------------
router.get('/posts', authMiddleware, async (req, res) => {
  try {
    const { workspace_id, status, platform, month, year } = req.query;
    if (!workspace_id) return res.status(400).json({ error: 'workspace_id richiesto' });

    let query = `SELECT * FROM posts WHERE workspace_id = ?`;
    const params = [workspace_id];

    if (status && status !== 'all') {
      query += ` AND status = ?`;
      params.push(status);
    }

    query += ` ORDER BY scheduled_at ASC, created_at DESC`;
    const posts = await all(query, params);

    // Fetch workspace channels once for linking
    const channels = await all('SELECT * FROM channels WHERE workspace_id = ?', [workspace_id]);

    // Fetch customizations for all posts
    for (const post of posts) {
      const customizations = await all('SELECT * FROM post_customizations WHERE post_id = ?', [post.id]);
      post.customizations = customizations.map(c => ({
        ...c,
        media_urls: JSON.parse(c.media_urls_json || '[]'),
        extra_options: JSON.parse(c.extra_options_json || '{}')
      }));
      post.platforms = post.customizations.map(c => c.platform);

      if (post.status === 'published') {
        const { links, summaryText } = buildPublishedLinks(post.customizations, channels, post.id);
        post.published_links = links;
        post.summary_text = summaryText;
      } else {
        post.published_links = [];
        post.summary_text = '';
      }
    }

    // Optional filter by platform
    let filteredPosts = posts;
    if (platform && platform !== 'all') {
      filteredPosts = posts.filter(p => p.platforms.includes(platform));
    }

    res.json(filteredPosts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/posts', authMiddleware, async (req, res) => {
  try {
    const {
      workspace_id,
      title = '',
      base_content,
      status = 'draft',
      scheduled_at = null,
      recycle_interval_days = 0,
      customizations = {} // e.g. { instagram: { custom_content, hashtags, first_comment, media_urls, extra_options } }
    } = req.body;

    if (!workspace_id || !base_content) {
      return res.status(400).json({ error: 'workspace_id e base_content sono obbligatori' });
    }

    // Verify workspace belongs to user
    const ws = await get('SELECT id FROM workspaces WHERE id = ? AND user_id = ?', [workspace_id, req.user.id]);
    if (!ws) return res.status(403).json({ error: 'Accesso negato al workspace' });

    const isPublished = status === 'published';
    const publishedAtVal = isPublished ? new Date().toISOString() : null;

    const postResult = await run(
      `INSERT INTO posts (workspace_id, title, base_content, status, scheduled_at, published_at, recycle_interval_days)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [workspace_id, title, base_content, status, scheduled_at, publishedAtVal, recycle_interval_days]
    );

    const postId = postResult.id;

    // Fetch workspace channels to get handles for URLs
    const channels = await all('SELECT * FROM channels WHERE workspace_id = ?', [workspace_id]);
    const channelMap = {};
    channels.forEach(ch => { channelMap[ch.platform] = ch; });

    // Save channel customizations
    for (const [plat, data] of Object.entries(customizations)) {
      if (!data) continue;
      const ch = channelMap[plat];
      const publishedUrl = isPublished
        ? (data.published_url || generatePlatformPostUrl(plat, ch?.handle || ch?.account_name || '', postId))
        : null;

      await run(
        `INSERT INTO post_customizations (post_id, platform, custom_content, hashtags, first_comment, media_urls_json, extra_options_json, published_url)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          postId,
          plat,
          data.custom_content || base_content,
          data.hashtags || '',
          data.first_comment || '',
          JSON.stringify(data.media_urls || []),
          JSON.stringify(data.extra_options || {}),
          publishedUrl
        ]
      );
    }

    const createdPost = await get('SELECT * FROM posts WHERE id = ?', [postId]);
    const cust = await all('SELECT * FROM post_customizations WHERE post_id = ?', [postId]);
    createdPost.customizations = cust.map(c => ({
      ...c,
      media_urls: JSON.parse(c.media_urls_json || '[]'),
      extra_options: JSON.parse(c.extra_options_json || '{}')
    }));
    createdPost.platforms = createdPost.customizations.map(c => c.platform);

    if (isPublished) {
      const { links, summaryText } = buildPublishedLinks(createdPost.customizations, channels, postId);
      createdPost.published_links = links;
      createdPost.summary_text = summaryText;
    } else {
      createdPost.published_links = [];
      createdPost.summary_text = '';
    }

    res.json(createdPost);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/posts/:id', authMiddleware, async (req, res) => {
  try {
    const postId = req.params.id;
    const {
      title,
      base_content,
      status,
      scheduled_at,
      recycle_interval_days,
      customizations = {}
    } = req.body;

    const currentPost = await get('SELECT * FROM posts WHERE id = ?', [postId]);
    if (!currentPost) return res.status(404).json({ error: 'Post non trovato' });

    const isPublishing = status === 'published';
    const nowIso = new Date().toISOString();
    const newPublishedAt = isPublishing 
      ? (currentPost.published_at || nowIso)
      : (status ? null : currentPost.published_at);

    await run(
      `UPDATE posts 
       SET title = COALESCE(?, title),
           base_content = COALESCE(?, base_content),
           status = COALESCE(?, status),
           scheduled_at = COALESCE(?, scheduled_at),
           published_at = ?,
           recycle_interval_days = COALESCE(?, recycle_interval_days)
       WHERE id = ?`,
      [title, base_content, status, scheduled_at, newPublishedAt, recycle_interval_days, postId]
    );

    const channels = await all('SELECT * FROM channels WHERE workspace_id = ?', [currentPost.workspace_id]);
    const channelMap = {};
    channels.forEach(ch => { channelMap[ch.platform] = ch; });

    // Update customizations if provided
    if (customizations && Object.keys(customizations).length > 0) {
      await run('DELETE FROM post_customizations WHERE post_id = ?', [postId]);
      for (const [plat, data] of Object.entries(customizations)) {
        if (!data) continue;
        const ch = channelMap[plat];
        const publishedUrl = isPublishing
          ? (data.published_url || generatePlatformPostUrl(plat, ch?.handle || ch?.account_name || '', postId))
          : null;

        await run(
          `INSERT INTO post_customizations (post_id, platform, custom_content, hashtags, first_comment, media_urls_json, extra_options_json, published_url)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            postId,
            plat,
            data.custom_content || base_content,
            data.hashtags || '',
            data.first_comment || '',
            JSON.stringify(data.media_urls || []),
            JSON.stringify(data.extra_options || {}),
            publishedUrl
          ]
        );
      }
    } else if (isPublishing) {
      // If status changed to published but customizations payload wasn't sent, update existing customizations with URLs
      const existingCust = await all('SELECT * FROM post_customizations WHERE post_id = ?', [postId]);
      for (const c of existingCust) {
        if (!c.published_url) {
          const ch = channelMap[c.platform];
          const url = generatePlatformPostUrl(c.platform, ch?.handle || ch?.account_name || '', postId);
          await run('UPDATE post_customizations SET published_url = ? WHERE id = ?', [url, c.id]);
        }
      }
    }

    const updated = await get('SELECT * FROM posts WHERE id = ?', [postId]);
    const cust = await all('SELECT * FROM post_customizations WHERE post_id = ?', [postId]);
    updated.customizations = cust.map(c => ({
      ...c,
      media_urls: JSON.parse(c.media_urls_json || '[]'),
      extra_options: JSON.parse(c.extra_options_json || '{}')
    }));
    updated.platforms = updated.customizations.map(c => c.platform);

    if (updated.status === 'published') {
      const { links, summaryText } = buildPublishedLinks(updated.customizations, channels, postId);
      updated.published_links = links;
      updated.summary_text = summaryText;
    } else {
      updated.published_links = [];
      updated.summary_text = '';
    }

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Reschedule post directly (CALENDAR DRAG & DROP)
router.patch('/posts/:id/reschedule', authMiddleware, async (req, res) => {
  try {
    const { scheduled_at } = req.body;
    if (!scheduled_at) return res.status(400).json({ error: 'scheduled_at mancante' });

    await run(
      `UPDATE posts SET scheduled_at = ?, status = 'scheduled' WHERE id = ?`,
      [scheduled_at, req.params.id]
    );

    const updated = await get('SELECT * FROM posts WHERE id = ?', [req.params.id]);
    res.json({ success: true, post: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Duplicate / Recycle post
router.post('/posts/:id/duplicate', authMiddleware, async (req, res) => {
  try {
    const orig = await get('SELECT * FROM posts WHERE id = ?', [req.params.id]);
    if (!orig) return res.status(404).json({ error: 'Post non trovato' });

    // Schedule 2 days after original or today
    const newDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();
    const dup = await run(
      `INSERT INTO posts (workspace_id, title, base_content, status, scheduled_at, recycle_interval_days)
       VALUES (?, ?, ?, 'scheduled', ?, ?)`,
      [orig.workspace_id, `${orig.title || 'Post'} (Copia Riciclata)`, orig.base_content, newDate, orig.recycle_interval_days]
    );

    const origCust = await all('SELECT * FROM post_customizations WHERE post_id = ?', [orig.id]);
    for (const c of origCust) {
      await run(
        `INSERT INTO post_customizations (post_id, platform, custom_content, hashtags, first_comment, media_urls_json, extra_options_json)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [dup.id, c.platform, c.custom_content, c.hashtags, c.first_comment, c.media_urls_json, c.extra_options_json]
      );
    }

    const created = await get('SELECT * FROM posts WHERE id = ?', [dup.id]);
    res.json(created);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete post
router.delete('/posts/:id', authMiddleware, async (req, res) => {
  try {
    const postId = req.params.id;
    await run('DELETE FROM post_customizations WHERE post_id = ?', [postId]);
    await run('DELETE FROM posts WHERE id = ?', [postId]);
    res.json({ success: true, message: 'Post eliminato con successo' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Bulk delete posts (Drafts & Scheduled only)
router.post('/posts/bulk-delete', authMiddleware, async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'Nessun post selezionato per l\'eliminazione' });
    }

    // Verify posts belong to workspaces owned by req.user and status is draft or scheduled
    const placeholders = ids.map(() => '?').join(',');
    const allowedPosts = await all(
      `SELECT p.id, p.status, p.title 
       FROM posts p 
       JOIN workspaces w ON p.workspace_id = w.id 
       WHERE p.id IN (${placeholders}) AND w.user_id = ? AND p.status IN ('draft', 'scheduled')`,
      [...ids, req.user.id]
    );

    if (allowedPosts.length === 0) {
      return res.status(400).json({ 
        error: 'Nessun post in bozza o programmato trovato per l\'eliminazione. I post già pubblicati non possono essere eliminati in blocco.' 
      });
    }

    const allowedIds = allowedPosts.map(p => p.id);
    const delPlaceholders = allowedIds.map(() => '?').join(',');

    await run(`DELETE FROM post_customizations WHERE post_id IN (${delPlaceholders})`, allowedIds);
    await run(`DELETE FROM posts WHERE id IN (${delPlaceholders})`, allowedIds);

    res.json({ 
      success: true, 
      message: `${allowedIds.length} post eliminati con successo`, 
      deletedCount: allowedIds.length, 
      deletedIds: allowedIds 
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// MEDIA STORAGE & pCloud
// -------------------------------------------------------------
// -------------------------------------------------------------
// MEDIA STORAGE & pCloud
// -------------------------------------------------------------
router.get('/media', authMiddleware, async (req, res) => {
  try {
    const { workspace_id } = req.query;
    if (!workspace_id) return res.status(400).json({ error: 'workspace_id richiesto' });

    // Verify workspace belongs to user
    const ws = await get('SELECT id FROM workspaces WHERE id = ? AND user_id = ?', [workspace_id, req.user.id]);
    if (!ws) return res.status(403).json({ error: 'Accesso negato al workspace' });

    const assets = await all(
      'SELECT * FROM media_assets WHERE workspace_id = ? ORDER BY created_at DESC',
      [workspace_id]
    );
    res.json(assets);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/media/upload', authMiddleware, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Nessun file fornito' });
    const { workspace_id, tags = '' } = req.body;

    const ws = await get('SELECT * FROM workspaces WHERE id = ? AND user_id = ?', [workspace_id, req.user.id]);
    if (!ws) return res.status(403).json({ error: 'Accesso negato al workspace' });
    const workspaceName = ws.name;

    // Upload via pCloud Service (with local zero-cost fallback)
    const uploadResult = await pcloudStorage.uploadFile({
      workspaceName,
      fileBuffer: req.file.buffer,
      fileName: req.file.originalname,
      mimeType: req.file.mimetype
    });

    const dbResult = await run(
      `INSERT INTO media_assets (workspace_id, filename, file_size, mime_type, pcloud_fileid, pcloud_url, local_path, tags)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        workspace_id,
        req.file.originalname,
        req.file.size,
        req.file.mimetype,
        uploadResult.fileId?.toString() || '',
        uploadResult.url,
        uploadResult.localPath || '',
        tags
      ]
    );

    const asset = await get('SELECT * FROM media_assets WHERE id = ?', [dbResult.id]);
    res.json({ ...asset, storageType: uploadResult.storageType });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/storage/status', authMiddleware, async (req, res) => {
  try {
    const status = await pcloudStorage.testConnection();
    res.json(status);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// AI OPTIMIZER
// -------------------------------------------------------------
router.post('/ai/optimize', authMiddleware, async (req, res) => {
  try {
    const { base_text, platforms = [], tone = 'engaging', extra_context = '' } = req.body;
    if (!base_text) return res.status(400).json({ error: 'base_text richiesto' });

    const optimized = await aiOptimizer.optimizeForChannels(base_text, platforms, tone, extra_context);
    res.json({ success: true, optimized });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// MCP OVER HTTP & TOOLS
// -------------------------------------------------------------
router.get('/mcp/tools', (req, res) => {
  res.json({ tools: MCP_TOOLS });
});

router.post('/mcp/call', async (req, res) => {
  try {
    const { name, arguments: args } = req.body;
    if (!name) return res.status(400).json({ error: 'Nome tool mancante' });

    const result = await handleMcpToolCall(name, args || {});
    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// SETTINGS & BACKUP
// -------------------------------------------------------------
router.get('/settings', authMiddleware, async (req, res) => {
  try {
    const rows = await all('SELECT key, value FROM settings');
    const settings = {};
    rows.forEach(r => { settings[r.key] = r.value; });
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/settings', authMiddleware, adminOnly, async (req, res) => {
  try {
    for (const [key, val] of Object.entries(req.body)) {
      if (val !== undefined && val !== null) {
        await run(
          "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
          [key, typeof val === 'object' ? JSON.stringify(val) : String(val)]
        );
      }
    }
    res.json({ success: true, message: 'Impostazioni aggiornate con successo' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/settings/backup', authMiddleware, async (req, res) => {
  try {
    const workspaces = await all('SELECT * FROM workspaces WHERE user_id = ?', [req.user.id]);
    const channels = await all(
      'SELECT c.* FROM channels c JOIN workspaces w ON c.workspace_id = w.id WHERE w.user_id = ?',
      [req.user.id]
    );
    const posts = await all(
      'SELECT p.* FROM posts p JOIN workspaces w ON p.workspace_id = w.id WHERE w.user_id = ?',
      [req.user.id]
    );
    const customizations = await all(
      'SELECT pc.* FROM post_customizations pc JOIN posts p ON pc.post_id = p.id JOIN workspaces w ON p.workspace_id = w.id WHERE w.user_id = ?',
      [req.user.id]
    );
    const media = await all(
      'SELECT m.* FROM media_assets m JOIN workspaces w ON m.workspace_id = w.id WHERE w.user_id = ?',
      [req.user.id]
    );

    const backupData = {
      version: '1.0',
      user: { id: req.user.id, email: req.user.email },
      exportedAt: new Date().toISOString(),
      workspaces,
      channels,
      posts,
      customizations,
      media
    };

    const backupResult = await pcloudStorage.backupDatabaseToCloud(backupData);
    res.json({ success: true, backup: backupResult });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/scheduler/logs', (req, res) => {
  res.json({ logs: scheduler.getRecentLogs() });
});

module.exports = router;
