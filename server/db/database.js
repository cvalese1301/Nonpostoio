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
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (workspace_id) REFERENCES workspaces (id) ON DELETE CASCADE
    )
  `);

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

  await seedInitialData();
}

async function seedInitialData() {
  // Only seed default settings - clean state without demo data
  await run(`INSERT OR IGNORE INTO settings (key, value) VALUES ('pcloud_token', '')`);
  await run(`INSERT OR IGNORE INTO settings (key, value) VALUES ('pcloud_region', 'eu')`);
  await run(`INSERT OR IGNORE INTO settings (key, value) VALUES ('ai_provider', 'builtin')`);

  // Seed admin account (never deleted)
  const authService = require('../services/authService');
  const existingAdmin = await get('SELECT id FROM users WHERE email = ?', [ADMIN_EMAIL]);
  if (!existingAdmin) {
    const passwordHash = authService.hashPassword('christian12');
    await run(
      'INSERT INTO users (name, email, password_hash, company, is_admin) VALUES (?, ?, ?, ?, 1)',
      ['Admin', ADMIN_EMAIL, passwordHash, 'DNA Creative Agency']
    );
    console.log('[DB] Admin account created:', ADMIN_EMAIL);
  } else {
    // Ensure admin flag is set
    await run('UPDATE users SET is_admin = 1 WHERE email = ?', [ADMIN_EMAIL]);
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
