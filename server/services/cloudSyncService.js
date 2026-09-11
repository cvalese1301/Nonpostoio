const cloudinary = require('cloudinary').v2;
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { get, run, all } = require('../db/database');

const LOCAL_CACHE_PATH = path.join(__dirname, '../db/vault_cache.json');
const VAULT_PUBLIC_ID = 'nonposto_vault_sync';
const VAULT_FOLDER = 'NonPosto/vault';

class CloudSyncService {
  /**
   * Retrieve Cloudinary credentials from DB or process.env
   */
  async getCloudinaryConfig() {
    const nameRow = await get("SELECT value FROM settings WHERE key = 'cloudinary_cloud_name'");
    const keyRow = await get("SELECT value FROM settings WHERE key = 'cloudinary_api_key'");
    const secretRow = await get("SELECT value FROM settings WHERE key = 'cloudinary_api_secret'");

    const cloud_name = process.env.CLOUDINARY_CLOUD_NAME?.trim() || nameRow?.value?.trim() || '';
    const api_key = process.env.CLOUDINARY_API_KEY?.trim() || keyRow?.value?.trim() || '';
    const api_secret = process.env.CLOUDINARY_API_SECRET?.trim() || secretRow?.value?.trim() || '';

    const isEnv = Boolean(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);
    const isConfigured = Boolean(cloud_name && api_key && api_secret);

    if (isConfigured) {
      cloudinary.config({
        cloud_name,
        api_key,
        api_secret,
        secure: true
      });
    }

    return {
      isConfigured,
      isEnv,
      cloud_name,
      api_key,
      api_secret
    };
  }

  /**
   * Generates a full export payload of the database
   */
  async exportBackupPayload(userId = null) {
    const settings = await all('SELECT key, value FROM settings');
    const workspaces = userId 
      ? await all('SELECT * FROM workspaces WHERE user_id = ?', [userId])
      : await all('SELECT * FROM workspaces');

    const wsIds = workspaces.map(w => w.id);
    let channels = [];
    let posts = [];
    let customizations = [];
    let media = [];

    if (wsIds.length > 0) {
      const placeholders = wsIds.map(() => '?').join(',');
      channels = await all(`SELECT * FROM channels WHERE workspace_id IN (${placeholders})`, wsIds);
      posts = await all(`SELECT * FROM posts WHERE workspace_id IN (${placeholders})`, wsIds);
      
      const postIds = posts.map(p => p.id);
      if (postIds.length > 0) {
        const postPlaceholders = postIds.map(() => '?').join(',');
        customizations = await all(`SELECT * FROM post_customizations WHERE post_id IN (${postPlaceholders})`, postIds);
      }
      media = await all(`SELECT * FROM media_assets WHERE workspace_id IN (${placeholders})`, wsIds);
    }

    return {
      appName: 'NonPosto.io',
      version: '2.0',
      exportedAt: new Date().toISOString(),
      metadata: {
        totalWorkspaces: workspaces.length,
        totalChannels: channels.length,
        activeChannels: channels.filter(c => c.active === 1).length,
        totalPosts: posts.length,
        totalSettings: settings.length
      },
      settings,
      workspaces,
      channels,
      posts,
      customizations,
      media
    };
  }

  /**
   * Uploads the backup payload to Cloudinary raw storage
   */
  async backupToCloud(reason = 'manual') {
    try {
      const cfg = await this.getCloudinaryConfig();
      const payload = await this.exportBackupPayload();
      const jsonString = JSON.stringify(payload, null, 2);
      const buffer = Buffer.from(jsonString, 'utf8');

      // Always save local cache file as immediate fallback
      try {
        const dir = path.dirname(LOCAL_CACHE_PATH);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(LOCAL_CACHE_PATH, jsonString, 'utf8');
      } catch (localErr) {
        console.warn('[CloudSync] Local cache write failed:', localErr.message);
      }

      if (!cfg.isConfigured) {
        console.log(`[CloudSync] Cloudinary non configurato. Backup salvato solo in cache locale (${reason}).`);
        return {
          success: false,
          reason: 'cloudinary_not_configured',
          message: 'Cloudinary non configurato. Backup salvato in cache locale.',
          timestamp: new Date().toISOString()
        };
      }

      // Upload to Cloudinary as raw JSON file
      const uploadResult = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder: VAULT_FOLDER,
            public_id: VAULT_PUBLIC_ID,
            resource_type: 'raw',
            overwrite: true,
            invalidate: true
          },
          (err, result) => {
            if (err) return reject(err);
            resolve(result);
          }
        );
        stream.end(buffer);
      });

      const now = new Date().toISOString();
      await run("INSERT OR REPLACE INTO settings (key, value) VALUES ('last_cloud_sync_at', ?)", [now]);
      await run("INSERT OR REPLACE INTO settings (key, value) VALUES ('last_cloud_sync_status', 'ok')");
      await run("INSERT OR REPLACE INTO settings (key, value) VALUES ('last_cloud_sync_reason', ?)", [reason]);

      console.log(`[CloudSync] Backup Cloudinary riuscito (${reason})! Canali attivi: ${payload.metadata.activeChannels}, Post: ${payload.metadata.totalPosts}`);

      return {
        success: true,
        timestamp: now,
        url: uploadResult.secure_url,
        activeChannels: payload.metadata.activeChannels,
        totalSettings: payload.metadata.totalSettings,
        totalPosts: payload.metadata.totalPosts
      };
    } catch (err) {
      console.error('[CloudSync] Errore salvataggio backup Cloudinary:', err.message);
      try {
        await run("INSERT OR REPLACE INTO settings (key, value) VALUES ('last_cloud_sync_status', ?)", [`error: ${err.message}`]);
      } catch (e) {}
      return {
        success: false,
        error: err.message
      };
    }
  }

  /**
   * Fetches the latest backup from Cloudinary (or local cache) and restores it
   */
  async restoreFromCloud() {
    try {
      const cfg = await this.getCloudinaryConfig();
      let payload = null;

      if (cfg.isConfigured) {
        try {
          const resource = await cloudinary.api.resource(`${VAULT_FOLDER}/${VAULT_PUBLIC_ID}`, {
            resource_type: 'raw'
          });

          if (resource && resource.secure_url) {
            // Append cache buster to guarantee freshest copy
            const url = `${resource.secure_url}?t=${Date.now()}`;
            const res = await axios.get(url, { responseType: 'json', timeout: 10000 });
            payload = res.data;
          }
        } catch (cloudErr) {
          console.warn('[CloudSync] Impossibile recuperare da Cloudinary API:', cloudErr.message);
        }
      }

      // Fallback to local cache if Cloudinary was empty or failed
      if (!payload && fs.existsSync(LOCAL_CACHE_PATH)) {
        try {
          const raw = fs.readFileSync(LOCAL_CACHE_PATH, 'utf8');
          payload = JSON.parse(raw);
          console.log('[CloudSync] Utilizzo backup da cache locale.');
        } catch (e) {
          console.warn('[CloudSync] Errore lettura cache locale:', e.message);
        }
      }

      if (!payload) {
        return {
          success: false,
          message: 'Nessun backup trovato su Cloudinary o in cache locale.'
        };
      }

      return await this.applyBackupData(payload);
    } catch (err) {
      console.error('[CloudSync] Errore ripristino da cloud:', err.message);
      return {
        success: false,
        error: err.message
      };
    }
  }

  /**
   * Applies the backup JSON into the database safely
   */
  async applyBackupData(payload) {
    if (!payload || (!payload.channels && !payload.settings)) {
      throw new Error('Formato backup non valido');
    }

    let restoredSettings = 0;
    let restoredChannels = 0;
    let restoredPosts = 0;

    // 1. Restore settings (do not overwrite process.env values with empty strings)
    if (Array.isArray(payload.settings)) {
      for (const s of payload.settings) {
        if (s.key && s.value !== undefined && s.value !== null) {
          // Never overwrite last_cloud_sync with old timestamp if newer exists
          if (s.key.startsWith('last_cloud_sync')) continue;
          await run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [s.key, s.value]);
          restoredSettings++;
        }
      }
    }

    // 2. Restore workspaces
    const existingWorkspaces = await all('SELECT * FROM workspaces');
    let targetWsId = existingWorkspaces[0]?.id || 1;

    if (Array.isArray(payload.workspaces) && payload.workspaces.length > 0) {
      for (const ws of payload.workspaces) {
        const found = existingWorkspaces.find(e => e.id === ws.id || e.slug === ws.slug);
        if (!found) {
          const res = await run(
            'INSERT INTO workspaces (id, user_id, name, slug, logo_url, color) VALUES (?, ?, ?, ?, ?, ?)',
            [ws.id, ws.user_id || 1, ws.name, ws.slug, ws.logo_url || '', ws.color || '#7C3AED']
          );
          targetWsId = ws.id || res.id;
        } else {
          targetWsId = found.id;
          await run(
            'UPDATE workspaces SET name = ?, logo_url = ?, color = ? WHERE id = ?',
            [ws.name, ws.logo_url || '', ws.color || '#7C3AED', targetWsId]
          );
        }
      }
    }

    // 3. Restore channels (CRITICAL: preserve OAuth tokens and connected platforms!)
    if (Array.isArray(payload.channels)) {
      for (const ch of payload.channels) {
        // We only restore channels that have data or are active
        const hasData = ch.active === 1 || (ch.config_json && ch.config_json !== '{}') || ch.account_name;
        if (!hasData) continue;

        // Try to find existing channel for this platform in the workspace
        let existingCh = await get(
          'SELECT id FROM channels WHERE workspace_id = ? AND platform = ?',
          [ch.workspace_id || targetWsId, ch.platform]
        );

        if (!existingCh) {
          existingCh = await get(
            'SELECT id FROM channels WHERE platform = ? ORDER BY id ASC LIMIT 1',
            [ch.platform]
          );
        }

        if (existingCh) {
          await run(
            `UPDATE channels 
             SET account_name = ?,
                 handle = ?,
                 avatar_url = ?,
                 active = ?,
                 config_json = ?,
                 token_expires_at = ?,
                 is_preselected = ?,
                 social_id = ?,
                 channel_type = ?,
                 status = ?,
                 token_updated_at = ?
             WHERE id = ?`,
            [
              ch.account_name || '',
              ch.handle || '',
              ch.avatar_url || '',
              ch.active || 0,
              ch.config_json || '{}',
              ch.token_expires_at || null,
              ch.is_preselected ?? 1,
              ch.social_id || null,
              ch.channel_type || null,
              ch.status || (ch.active ? 'active' : 'unlinked'),
              ch.token_updated_at || null,
              existingCh.id
            ]
          );
          restoredChannels++;
        } else {
          // Insert new channel row
          await run(
            `INSERT INTO channels (
               workspace_id, platform, account_name, handle, avatar_url, 
               active, config_json, token_expires_at, is_preselected, 
               social_id, channel_type, status, token_updated_at
             ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              ch.workspace_id || targetWsId,
              ch.platform,
              ch.account_name || '',
              ch.handle || '',
              ch.avatar_url || '',
              ch.active || 0,
              ch.config_json || '{}',
              ch.token_expires_at || null,
              ch.is_preselected ?? 1,
              ch.social_id || null,
              ch.channel_type || null,
              ch.status || (ch.active ? 'active' : 'unlinked'),
              ch.token_updated_at || null
            ]
          );
          restoredChannels++;
        }
      }
    }

    // 4. Restore posts & customizations if available
    if (Array.isArray(payload.posts)) {
      for (const p of payload.posts) {
        const existingPost = await get('SELECT id FROM posts WHERE id = ?', [p.id]);
        if (!existingPost) {
          await run(
            `INSERT INTO posts (id, workspace_id, title, base_content, status, scheduled_at, published_at, recycle_interval_days, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              p.id,
              p.workspace_id || targetWsId,
              p.title || '',
              p.base_content || '',
              p.status || 'draft',
              p.scheduled_at || null,
              p.published_at || null,
              p.recycle_interval_days || 0,
              p.created_at || new Date().toISOString()
            ]
          );
          restoredPosts++;
        }
      }
    }

    if (Array.isArray(payload.customizations)) {
      for (const c of payload.customizations) {
        const existingCust = await get('SELECT id FROM post_customizations WHERE id = ?', [c.id]);
        if (!existingCust) {
          await run(
            `INSERT INTO post_customizations (
               id, post_id, platform, custom_content, hashtags, 
               first_comment, media_urls_json, extra_options_json, 
               published_url, publish_status, publish_error, social_post_id
             ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              c.id,
              c.post_id,
              c.platform,
              c.custom_content || '',
              c.hashtags || '',
              c.first_comment || '',
              c.media_urls_json || '[]',
              c.extra_options_json || '{}',
              c.published_url || null,
              c.publish_status || 'pending',
              c.publish_error || null,
              c.social_post_id || null
            ]
          );
        }
      }
    }

    console.log(`[CloudSync] Ripristino completato con successo: ${restoredChannels} canali, ${restoredSettings} impostazioni, ${restoredPosts} post.`);

    return {
      success: true,
      message: `Ripristino completato: ${restoredChannels} canali ripristinati, ${restoredSettings} impostazioni, ${restoredPosts} post.`,
      restoredChannels,
      restoredSettings,
      restoredPosts,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Automatically restores from cloud on server startup if the local DB has 0 active channels
   */
  async autoRestoreIfFresh() {
    try {
      // Check if we currently have any active connected channels
      const activeRow = await get('SELECT COUNT(*) as count FROM channels WHERE active = 1');
      const activeCount = activeRow?.count || 0;

      if (activeCount > 0) {
        console.log(`[CloudSync] Database locale già attivo (${activeCount} canali collegati). Nessun auto-ripristino necessario.`);
        return;
      }

      console.log('[CloudSync] Container appena avviato o 0 canali attivi rilevati. Avvio verifica Cloud Vault...');
      const result = await this.restoreFromCloud();

      if (result.success && result.restoredChannels > 0) {
        console.log(`[CloudSync] 🚀 AUTO-RIPRISTINO COMPLETATO! ${result.restoredChannels} canali e token OAuth salvaguardati con successo!`);
      } else {
        console.log('[CloudSync] Nessun canale precedente ripristinato dal Cloud Vault:', result.message || result.error || 'pronto per nuova configurazione');
      }
    } catch (err) {
      console.warn('[CloudSync] Auto-ripristino all\'avvio non riuscito:', err.message);
    }
  }

  /**
   * Returns current synchronization status for UI indicators
   */
  async getSyncStatus() {
    const cfg = await this.getCloudinaryConfig();
    const lastSyncAtRow = await get("SELECT value FROM settings WHERE key = 'last_cloud_sync_at'");
    const lastSyncStatusRow = await get("SELECT value FROM settings WHERE key = 'last_cloud_sync_status'");
    const activeChannelsRow = await get("SELECT COUNT(*) as count FROM channels WHERE active = 1");

    return {
      configured: cfg.isConfigured,
      isEnv: cfg.isEnv,
      cloud_name: cfg.cloud_name,
      lastSyncAt: lastSyncAtRow?.value || null,
      lastSyncStatus: lastSyncStatusRow?.value || null,
      activeChannels: activeChannelsRow?.count || 0,
      persistentDisk: Boolean(process.env.DATABASE_PATH)
    };
  }
}

module.exports = new CloudSyncService();
