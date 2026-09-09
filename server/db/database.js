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

async function initDb() {
  await run(`
    CREATE TABLE IF NOT EXISTS workspaces (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      logo_url TEXT,
      color TEXT DEFAULT '#7C3AED',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

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
      FOREIGN KEY (post_id) REFERENCES posts (id) ON DELETE CASCADE
    )
  `);

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
  const count = await get('SELECT COUNT(*) as count FROM workspaces');
  if (count && count.count > 0) return;

  console.log('[DB] Seeding demo workspaces, 8 channels, and initial posts...');

  // Workspace 1: Caffè & Pasticceria Duomo
  const ws1 = await run(
    `INSERT INTO workspaces (name, slug, logo_url, color) VALUES (?, ?, ?, ?)`,
    ['Caffè & Pasticceria Duomo', 'caffe-duomo', 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=150', '#8B5CF6']
  );
  const ws1Id = ws1.id;

  // Workspace 2: Studio Digitale Nexus
  const ws2 = await run(
    `INSERT INTO workspaces (name, slug, logo_url, color) VALUES (?, ?, ?, ?)`,
    ['Studio Digitale Nexus', 'nexus-agency', 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150', '#06B6D4']
  );
  const ws2Id = ws2.id;

  // Pre-populate all 8 channels for Workspace 1
  const channelsWs1 = [
    { platform: 'facebook', name: 'Caffè Duomo Milano', handle: '@caffeduomomi', avatar: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=100' },
    { platform: 'instagram', name: 'caffeduomo_official', handle: '@caffeduomo_official', avatar: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=100' },
    { platform: 'tiktok', name: 'CaffeDuomoBites', handle: '@caffeduomobites', avatar: 'https://images.unsplash.com/photo-1509785307050-d4066910ec1e?w=100' },
    { platform: 'google_business', name: 'Caffè Pasticceria Duomo - Milano Centro', handle: 'GMB Verified', avatar: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=100' },
    { platform: 'linkedin', name: 'Caffè & Pasticceria Duomo Srl', handle: 'caffe-pasticceria-duomo', avatar: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=100' },
    { platform: 'threads', name: 'caffeduomo_official', handle: '@caffeduomo_official', avatar: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=100' },
    { platform: 'x', name: 'Caffè Duomo', handle: '@CaffeDuomoMilano', avatar: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=100' },
    { platform: 'youtube', name: 'Caffè Duomo Stories', handle: '@caffeduomo', avatar: 'https://images.unsplash.com/photo-1511920170033-f8396924c348?w=100' }
  ];

  for (const ch of channelsWs1) {
    await run(
      `INSERT INTO channels (workspace_id, platform, account_name, handle, avatar_url, active) VALUES (?, ?, ?, ?, ?, 1)`,
      [ws1Id, ch.platform, ch.name, ch.handle, ch.avatar]
    );
  }

  // Pre-populate 8 channels for Workspace 2
  const channelsWs2 = [
    { platform: 'facebook', name: 'Nexus Digital Agency', handle: '@nexusagency', avatar: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100' },
    { platform: 'instagram', name: 'nexus_agency', handle: '@nexus_agency', avatar: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=100' },
    { platform: 'tiktok', name: 'NexusTechTips', handle: '@nexusteck', avatar: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100' },
    { platform: 'google_business', name: 'Nexus Digital Agency Roma', handle: 'GMB Verified', avatar: 'https://images.unsplash.com/photo-1497215728101-856f4ea42174?w=100' },
    { platform: 'linkedin', name: 'Nexus Digital Agency', handle: 'nexus-digital', avatar: 'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=100' },
    { platform: 'threads', name: 'nexus_agency', handle: '@nexus_agency', avatar: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=100' },
    { platform: 'x', name: 'Nexus Agency', handle: '@NexusAgencyHQ', avatar: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100' },
    { platform: 'youtube', name: 'Nexus Academy & Tech', handle: '@nexusagency', avatar: 'https://images.unsplash.com/photo-1534972195531-a756b1126f24?w=100' }
  ];

  for (const ch of channelsWs2) {
    await run(
      `INSERT INTO channels (workspace_id, platform, account_name, handle, avatar_url, active) VALUES (?, ?, ?, ?, ?, 1)`,
      [ws2Id, ch.platform, ch.name, ch.handle, ch.avatar]
    );
  }

  // Create realistic demo scheduled posts for this week and month
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const day = now.getDate();

  const post1Date = new Date(year, month, day, 10, 30).toISOString();
  const post2Date = new Date(year, month, day + 1, 14, 0).toISOString();
  const post3Date = new Date(year, month, day + 3, 18, 45).toISOString();
  const post4Date = new Date(year, month, day - 2, 9, 15).toISOString();

  // Post 1 (Scheduled today)
  const p1 = await run(
    `INSERT INTO posts (workspace_id, title, base_content, status, scheduled_at, recycle_interval_days) VALUES (?, ?, ?, ?, ?, ?)`,
    [
      ws1Id,
      'Nuova Brioche al Pistacchio di Bronte',
      'Oggi sforniamo la nostra nuovissima creazione: brioche artigianale a lenta lievitazione con crema al Pistacchio puro di Bronte DOP! 🥐✨ Vieni a provarla con il tuo espresso preferito.',
      'scheduled',
      post1Date,
      7
    ]
  );

  // Customizations for Post 1
  await run(
    `INSERT INTO post_customizations (post_id, platform, custom_content, hashtags, first_comment, media_urls_json, extra_options_json) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      p1.id,
      'instagram',
      'Lenta lievitazione, cuore cremoso e pura magia di Bronte. Chi resiste alla nuova Brioche al Pistacchio? 🥐💚 Tagga la persona con cui condividere la colazione perfetta!',
      '#PistacchioDiBronte #ColazioneMilanese #PasticceriaArtigianale #MilanoFood #BriocheLover',
      'Disponibile tutti i giorni dalle 7:00! Ti aspettiamo in Galleria ✨',
      JSON.stringify(['https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=800']),
      JSON.stringify({ is_reel: false })
    ]
  );

  await run(
    `INSERT INTO post_customizations (post_id, platform, custom_content, hashtags, first_comment, media_urls_json, extra_options_json) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      p1.id,
      'facebook',
      'La colazione a Milano ha un nuovo profumo! ☕🥐 È arrivata la nuova Brioche al Pistacchio di Bronte DOP. Sfoglia fragrante e farcitura abbondante.',
      '#CaffeDuomo #MilanoBreakfast',
      '',
      JSON.stringify(['https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=800']),
      JSON.stringify({})
    ]
  );

  await run(
    `INSERT INTO post_customizations (post_id, platform, custom_content, hashtags, first_comment, media_urls_json, extra_options_json) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      p1.id,
      'x',
      'Appena sfornate: Brioche sfogliata al Pistacchio di Bronte DOP. Il modo migliore per iniziare la giornata a Milano. 🥐☕ #Milano #Pistacchio',
      '#Milano #Breakfast',
      '',
      JSON.stringify(['https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=800']),
      JSON.stringify({})
    ]
  );

  await run(
    `INSERT INTO post_customizations (post_id, platform, custom_content, hashtags, first_comment, media_urls_json, extra_options_json) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      p1.id,
      'google_business',
      'Novità del giorno al Caffè Duomo: Brioche artigianale con crema al Pistacchio di Bronte. Passa a trovarci a pochi passi dal Duomo!',
      '',
      '',
      JSON.stringify(['https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=800']),
      JSON.stringify({ cta_action: 'LEARN_MORE', cta_url: 'https://caffeduomo.it/menu' })
    ]
  );

  // Post 2 (Scheduled tomorrow - TikTok & YouTube shorts)
  const p2 = await run(
    `INSERT INTO posts (workspace_id, title, base_content, status, scheduled_at) VALUES (?, ?, ?, ?, ?)`,
    [
      ws1Id,
      'Dietro le quinte del nostro espresso perfetto',
      'Come estraiamo il perfetto espresso italiano: macinatura, pressatura e i 25 secondi di pura crema color nocciola. ☕🔥',
      'scheduled',
      post2Date
    ]
  );

  await run(
    `INSERT INTO post_customizations (post_id, platform, custom_content, hashtags, media_urls_json, extra_options_json) VALUES (?, ?, ?, ?, ?, ?)`,
    [
      p2.id,
      'tiktok',
      '25 secondi per l\'estrazione perfetta: segreto del nostro barista! ☕🤫 Lo bevi amaro o con zucchero? #coffeetiktok #baristalife #espresso #italiantaste',
      '#coffeetiktok #barista #espresso #italy',
      JSON.stringify(['https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=800']),
      JSON.stringify({ sound: 'Viral Barista Sounds' })
    ]
  );

  await run(
    `INSERT INTO post_customizations (post_id, platform, custom_content, hashtags, media_urls_json, extra_options_json) VALUES (?, ?, ?, ?, ?, ?)`,
    [
      p2.id,
      'youtube',
      'L\'arte dell\'espresso perfetto in 30 secondi! #Shorts',
      '#Shorts #CoffeeArt #Espresso',
      JSON.stringify(['https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=800']),
      JSON.stringify({ privacy: 'public', is_short: true })
    ]
  );

  // Post 3 (Draft for later)
  await run(
    `INSERT INTO posts (workspace_id, title, base_content, status, scheduled_at) VALUES (?, ?, ?, ?, ?)`,
    [
      ws1Id,
      'Aperitivo Milanese Special Edition',
      'Dal giovedì al sabato l\'aperitivo del Duomo si arricchisce con finger food gourmet preparati dal nostro chef. Cocktail d\'autore & live jazz! 🍸🎷',
      'draft',
      post3Date
    ]
  );

  // Post 4 (Already published 2 days ago)
  await run(
    `INSERT INTO posts (workspace_id, title, base_content, status, scheduled_at, published_at) VALUES (?, ?, ?, ?, ?, ?)`,
    [
      ws1Id,
      'La nostra selezione di monorigini etiopi',
      'Note agrumate e profumo di gelsomino: la nuova monorigine Yirgacheffe è arrivata nei nostri macinini. Per i veri amanti dello specialty coffee.',
      'published',
      post4Date,
      post4Date
    ]
  );

  // Sample media assets
  await run(
    `INSERT INTO media_assets (workspace_id, filename, file_size, mime_type, pcloud_url, tags) VALUES (?, ?, ?, ?, ?, ?)`,
    [
      ws1Id,
      'brioche-pistacchio.jpg',
      345600,
      'image/jpeg',
      'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=800',
      'colazione, pistacchio, cibo'
    ]
  );

  await run(
    `INSERT INTO media_assets (workspace_id, filename, file_size, mime_type, pcloud_url, tags) VALUES (?, ?, ?, ?, ?, ?)`,
    [
      ws1Id,
      'espresso-crema.jpg',
      452100,
      'image/jpeg',
      'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=800',
      'caffe, espresso, barista'
    ]
  );

  // Seed default settings
  await run(`INSERT OR IGNORE INTO settings (key, value) VALUES ('pcloud_token', '')`);
  await run(`INSERT OR IGNORE INTO settings (key, value) VALUES ('pcloud_region', 'eu')`);
  await run(`INSERT OR IGNORE INTO settings (key, value) VALUES ('ai_provider', 'builtin')`);
}

module.exports = {
  db,
  run,
  get,
  all,
  initDb
};
