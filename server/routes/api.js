const express = require('express');
const multer = require('multer');
const { all, run, get } = require('../db/database');
const pcloudStorage = require('../services/pcloudStorage');
const aiOptimizer = require('../services/aiOptimizer');
const scheduler = require('../services/scheduler');
const { MCP_TOOLS, handleMcpToolCall } = require('../mcp/mcpTools');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 100 * 1024 * 1024 } }); // 100MB max

// -------------------------------------------------------------
// WORKSPACES (Multi-Account / Client Management)
// -------------------------------------------------------------
router.get('/workspaces', async (req, res) => {
  try {
    const workspaces = await all('SELECT * FROM workspaces ORDER BY name ASC');
    res.json(workspaces);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/workspaces', async (req, res) => {
  try {
    const { name, logo_url = '', color = '#7C3AED' } = req.body;
    if (!name) return res.status(400).json({ error: 'Nome cliente/workspace obbligatorio' });

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Date.now().toString().slice(-4);
    const result = await run(
      'INSERT INTO workspaces (name, slug, logo_url, color) VALUES (?, ?, ?, ?)',
      [name, slug, logo_url, color]
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

router.delete('/workspaces/:id', async (req, res) => {
  try {
    const count = await get('SELECT COUNT(*) as count FROM workspaces');
    if (count.count <= 1) {
      return res.status(400).json({ error: 'Non è possibile eliminare l\'unico workspace rimasto.' });
    }
    const wsId = req.params.id;
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
router.get('/channels', async (req, res) => {
  try {
    const { workspace_id } = req.query;
    if (!workspace_id) return res.status(400).json({ error: 'workspace_id richiesto' });

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
router.post('/channels/:id/connect', async (req, res) => {
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

// Disconnect channel
router.post('/channels/:id/disconnect', async (req, res) => {
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

router.put('/channels/:id', async (req, res) => {
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
router.get('/posts', async (req, res) => {
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

    // Fetch customizations for all posts
    for (const post of posts) {
      const customizations = await all('SELECT * FROM post_customizations WHERE post_id = ?', [post.id]);
      post.customizations = customizations.map(c => ({
        ...c,
        media_urls: JSON.parse(c.media_urls_json || '[]'),
        extra_options: JSON.parse(c.extra_options_json || '{}')
      }));
      post.platforms = post.customizations.map(c => c.platform);
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

router.post('/posts', async (req, res) => {
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

    const postResult = await run(
      `INSERT INTO posts (workspace_id, title, base_content, status, scheduled_at, recycle_interval_days)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [workspace_id, title, base_content, status, scheduled_at, recycle_interval_days]
    );

    const postId = postResult.id;

    // Save channel customizations
    for (const [plat, data] of Object.entries(customizations)) {
      if (!data) continue;
      await run(
        `INSERT INTO post_customizations (post_id, platform, custom_content, hashtags, first_comment, media_urls_json, extra_options_json)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          postId,
          plat,
          data.custom_content || base_content,
          data.hashtags || '',
          data.first_comment || '',
          JSON.stringify(data.media_urls || []),
          JSON.stringify(data.extra_options || {})
        ]
      );
    }

    const createdPost = await get('SELECT * FROM posts WHERE id = ?', [postId]);
    const cust = await all('SELECT * FROM post_customizations WHERE post_id = ?', [postId]);
    createdPost.customizations = cust;

    res.json(createdPost);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/posts/:id', async (req, res) => {
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

    await run(
      `UPDATE posts 
       SET title = COALESCE(?, title),
           base_content = COALESCE(?, base_content),
           status = COALESCE(?, status),
           scheduled_at = COALESCE(?, scheduled_at),
           recycle_interval_days = COALESCE(?, recycle_interval_days)
       WHERE id = ?`,
      [title, base_content, status, scheduled_at, recycle_interval_days, postId]
    );

    // Update customizations if provided
    if (customizations && Object.keys(customizations).length > 0) {
      await run('DELETE FROM post_customizations WHERE post_id = ?', [postId]);
      for (const [plat, data] of Object.entries(customizations)) {
        if (!data) continue;
        await run(
          `INSERT INTO post_customizations (post_id, platform, custom_content, hashtags, first_comment, media_urls_json, extra_options_json)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            postId,
            plat,
            data.custom_content || base_content,
            data.hashtags || '',
            data.first_comment || '',
            JSON.stringify(data.media_urls || []),
            JSON.stringify(data.extra_options || {})
          ]
        );
      }
    }

    const updated = await get('SELECT * FROM posts WHERE id = ?', [postId]);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Reschedule post directly (CALENDAR DRAG & DROP)
router.patch('/posts/:id/reschedule', async (req, res) => {
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
router.post('/posts/:id/duplicate', async (req, res) => {
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
router.delete('/posts/:id', async (req, res) => {
  try {
    const postId = req.params.id;
    await run('DELETE FROM post_customizations WHERE post_id = ?', [postId]);
    await run('DELETE FROM posts WHERE id = ?', [postId]);
    res.json({ success: true, message: 'Post eliminato con successo' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// MEDIA STORAGE & pCloud
// -------------------------------------------------------------
router.get('/media', async (req, res) => {
  try {
    const { workspace_id } = req.query;
    if (!workspace_id) return res.status(400).json({ error: 'workspace_id richiesto' });

    const assets = await all(
      'SELECT * FROM media_assets WHERE workspace_id = ? ORDER BY created_at DESC',
      [workspace_id]
    );
    res.json(assets);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/media/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Nessun file fornito' });
    const { workspace_id, tags = '' } = req.body;

    const ws = await get('SELECT * FROM workspaces WHERE id = ?', [workspace_id]);
    const workspaceName = ws ? ws.name : 'Workspace';

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

router.get('/storage/status', async (req, res) => {
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
router.post('/ai/optimize', async (req, res) => {
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
router.get('/settings', async (req, res) => {
  try {
    const rows = await all('SELECT key, value FROM settings');
    const settings = {};
    rows.forEach(r => { settings[r.key] = r.value; });
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/settings', async (req, res) => {
  try {
    const { pcloud_token, pcloud_region, ai_api_key, ai_provider } = req.body;

    if (pcloud_token !== undefined) {
      await run("INSERT INTO settings (key, value) VALUES ('pcloud_token', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value", [pcloud_token]);
    }
    if (pcloud_region !== undefined) {
      await run("INSERT INTO settings (key, value) VALUES ('pcloud_region', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value", [pcloud_region]);
    }
    if (ai_api_key !== undefined) {
      await run("INSERT INTO settings (key, value) VALUES ('ai_api_key', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value", [ai_api_key]);
    }
    if (ai_provider !== undefined) {
      await run("INSERT INTO settings (key, value) VALUES ('ai_provider', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value", [ai_provider]);
    }

    res.json({ success: true, message: 'Impostazioni aggiornate' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/settings/backup', async (req, res) => {
  try {
    const workspaces = await all('SELECT * FROM workspaces');
    const channels = await all('SELECT * FROM channels');
    const posts = await all('SELECT * FROM posts');
    const customizations = await all('SELECT * FROM post_customizations');
    const media = await all('SELECT * FROM media_assets');

    const backupData = {
      version: '1.0',
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
