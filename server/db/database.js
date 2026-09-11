const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = process.env.DATABASE_PATH || path.join(__dirname, 'nonposto.sqlite');

// Ensure directory exists
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('[DB] Error opening SQLite database:', err.message);
  } else {
    console.log('[DB] Connected to SQLite database at', dbPath);
  }
});

// Helper for promise-based queries
function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ id: this.lastID, changes: this.changes });
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
}

const ADMIN_EMAIL = 'christian.valese@dnacreativeagency.it';

async function initDb() {
  await run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      company TEXT,
      is_admin INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Migrate is_admin column if table already exists
  try {
    await run(`ALTER TABLE users ADD COLUMN is_admin INTEGER DEFAULT 0`);
  } catch (e) {
    // Column already exists, ignore
  }

  await run(`
    CREATE TABLE IF NOT EXISTS workspaces (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      name TEXT NOT NULL,
      slug TEXT NOT NULL,
      logo_url TEXT,
      color TEXT DEFAULT '#7C3AED',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    )
  `);

  // Migrate user_id column if table already exists
  try {
    await run(`ALTER TABLE workspaces ADD COLUMN user_id INTEGER`);
  } catch (e) {
    // Column already exists, ignore
  }

  await run(`
    CREATE TABLE IF NOT EXISTS channels (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      workspace_id INTEGER NOT NULL,
      platform TEXT NOT NULL,
      account_name TEXT NOT NULL,
      handle TEXT NOT NULL,
      avatar_url TEXT,
      active INTEGER DEFAULT 1,
      config_json TEXT DEFAULT '{}',
      token_expires_at DATETIME,
      is_preselected INTEGER DEFAULT 1,
      social_id TEXT,
      channel_type TEXT,
      status TEXT DEFAULT 'active',
      token_updated_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (workspace_id) REFERENCES workspaces (id) ON DELETE CASCADE
    )
  `);

  // Migrate channels columns if table already exists
  try { await run(`ALTER TABLE channels ADD COLUMN token_expires_at DATETIME`); } catch (e) {}
  try { await run(`ALTER TABLE channels ADD COLUMN is_preselected INTEGER DEFAULT 1`); } catch (e) {}
  try { await run(`ALTER TABLE channels ADD COLUMN social_id TEXT`); } catch (e) {}
  try { await run(`ALTER TABLE channels ADD COLUMN channel_type TEXT`); } catch (e) {}
  try { await run(`ALTER TABLE channels ADD COLUMN status TEXT DEFAULT 'active'`); } catch (e) {}
  try { await run(`ALTER TABLE channels ADD COLUMN token_updated_at DATETIME`); } catch (e) {}

  await run(`
    CREATE TABLE IF NOT EXISTS posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      workspace_id INTEGER NOT NULL,
      title TEXT,
      base_content TEXT NOT NULL,
      status TEXT DEFAULT 'draft',
      scheduled_at DATETIME,
      published_at DATETIME,
      recycle_interval_days INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (workspace_id) REFERENCES workspaces (id) ON DELETE CASCADE
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS post_customizations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      post_id INTEGER NOT NULL,
      platform TEXT NOT NULL,
      custom_content TEXT,
      hashtags TEXT,
      first_comment TEXT,
      media_urls_json TEXT DEFAULT '[]',
      extra_options_json TEXT DEFAULT '{}',
      published_url TEXT,
      FOREIGN KEY (post_id) REFERENCES posts (id) ON DELETE CASCADE
    )
  `);

  // Migrate published_url column if table already exists
  try {
    await run(`ALTER TABLE post_customizations ADD COLUMN published_url TEXT`);
  } catch (e) {
    // Column already exists, ignore
  }

  try {
    await run(`ALTER TABLE post_customizations ADD COLUMN publish_status TEXT DEFAULT 'pending'`);
  } catch (e) {}

  try {
    await run(`ALTER TABLE post_customizations ADD COLUMN publish_error TEXT`);
  } catch (e) {}

  try {
    await run(`ALTER TABLE post_customizations ADD COLUMN social_post_id TEXT`);
  } catch (e) {}

  await run(`
    CREATE TABLE IF NOT EXISTS media_assets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      workspace_id INTEGER NOT NULL,
      filename TEXT NOT NULL,
      file_size INTEGER,
      mime_type TEXT,
      pcloud_fileid TEXT,
      pcloud_url TEXT,
      local_path TEXT,
      tags TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (workspace_id) REFERENCES workspaces (id) ON DELETE CASCADE
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS system_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      level TEXT NOT NULL,
      category TEXT NOT NULL,
      message TEXT NOT NULL,
      details_json TEXT DEFAULT '{}',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  try {
    await run(`CREATE INDEX IF NOT EXISTS idx_system_logs_created ON system_logs(created_at DESC)`);
  } catch (e) {
    // Index exists
  }

  await seedInitialData();
}

async function seedInitialData() {
  // Only seed default settings - clean state without demo data
  await run(`INSERT OR IGNORE INTO settings (key, value) VALUES ('pcloud_token', '')`);
  await run(`INSERT OR IGNORE INTO settings (key, value) VALUES ('pcloud_region', 'eu')`);
  await run(`INSERT OR IGNORE INTO settings (key, value) VALUES ('ai_provider', 'builtin')`);

  // Seed admin account (never deleted)
  const authService = require('../services/authService');
  let adminId = null;
  const existingAdmin = await get('SELECT id FROM users WHERE email = ?', [ADMIN_EMAIL]);
  if (!existingAdmin) {
    const passwordHash = authService.hashPassword('christian12');
    const res = await run(
      'INSERT INTO users (name, email, password_hash, company, is_admin) VALUES (?, ?, ?, ?, 1)',
      ['Admin', ADMIN_EMAIL, passwordHash, 'DNA Creative Agency']
    );
    adminId = res.id;
    console.log('[DB] Admin account created:', ADMIN_EMAIL);
  } else {
    adminId = existingAdmin.id;
    await run('UPDATE users SET is_admin = 1 WHERE email = ?', [ADMIN_EMAIL]);
  }

  // Ensure initial default workspace exists (Clinica Vyda) so the app is immediately ready
  const existingWs = await get('SELECT id FROM workspaces WHERE user_id = ?', [adminId]);
  if (!existingWs) {
    const defaultWsName = process.env.DEFAULT_WORKSPACE_NAME || 'Clinica Vyda';
    const slug = defaultWsName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const wsResult = await run(
      'INSERT INTO workspaces (user_id, name, slug, color) VALUES (?, ?, ?, ?)',
      [adminId, defaultWsName, slug, '#7C3AED']
    );
    const platformKeys = [
      'facebook', 'instagram', 'tiktok', 'google_business',
      'linkedin', 'threads', 'x', 'youtube'
    ];
    for (const plat of platformKeys) {
      await run(
        'INSERT INTO channels (workspace_id, platform, account_name, handle, avatar_url, active, config_json) VALUES (?, ?, ?, ?, ?, 0, ?)',
        [wsResult.id, plat, '', '', '', '{}']
      );
    }
    console.log(`[DB] Workspace predefinito inizializzato: ${defaultWsName}`);
  }

  // Seed settings from environment variables if set in Render Dashboard
  if (process.env.OAUTH_META_APP_ID) {
    await run("INSERT OR REPLACE INTO settings (key, value) VALUES ('oauth_meta_app_id', ?)", [process.env.OAUTH_META_APP_ID.trim()]);
  }
  if (process.env.OAUTH_META_APP_SECRET) {
    await run("INSERT OR REPLACE INTO settings (key, value) VALUES ('oauth_meta_app_secret', ?)", [process.env.OAUTH_META_APP_SECRET.trim()]);
  }
  if (process.env.OAUTH_META_CONFIG_ID) {
    await run("INSERT OR REPLACE INTO settings (key, value) VALUES ('oauth_meta_config_id', ?)", [process.env.OAUTH_META_CONFIG_ID.trim()]);
  }
  if (process.env.OAUTH_THREADS_APP_ID) {
    await run("INSERT OR REPLACE INTO settings (key, value) VALUES ('oauth_threads_app_id', ?)", [process.env.OAUTH_THREADS_APP_ID.trim()]);
  }
  if (process.env.OAUTH_THREADS_APP_SECRET) {
    await run("INSERT OR REPLACE INTO settings (key, value) VALUES ('oauth_threads_app_secret', ?)", [process.env.OAUTH_THREADS_APP_SECRET.trim()]);
  }
  if (process.env.PCLOUD_ACCESS_TOKEN) {
    await run("INSERT OR REPLACE INTO settings (key, value) VALUES ('pcloud_token', ?)", [process.env.PCLOUD_ACCESS_TOKEN.trim()]);
  }
}

module.exports = {
  db,
  run,
  get,
  all,
  initDb,
  ADMIN_EMAIL
};
