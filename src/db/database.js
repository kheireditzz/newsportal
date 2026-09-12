const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, '..', '..', 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new DatabaseSync(path.join(dataDir, 'news.db'));

function ensureColumn(table, column, ddl) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all();
  if (!cols.some(c => c.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${ddl}`);
  }
}

db.exec(`
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;
PRAGMA synchronous = FULL;
PRAGMA busy_timeout = 5000;
PRAGMA temp_store = MEMORY;

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'editor',
  avatar TEXT,
  created_at TEXT DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#2563eb',
  created_at TEXT DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS articles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  excerpt TEXT,
  content TEXT NOT NULL,
  image TEXT,
  category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  author_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  featured INTEGER NOT NULL DEFAULT 0,
  views INTEGER NOT NULL DEFAULT 0,
  published_at TEXT,
  created_at TEXT DEFAULT (datetime('now','localtime')),
  updated_at TEXT DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS videos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT,
  url TEXT,
  thumbnail TEXT,
  duration TEXT,
  category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'published',
  created_at TEXT DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS photos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  caption TEXT,
  image TEXT NOT NULL,
  album TEXT DEFAULT 'Umum',
  status TEXT NOT NULL DEFAULT 'published',
  created_at TEXT DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS slides (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  subtitle TEXT,
  image TEXT NOT NULL,
  link TEXT,
  badge TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT
);

CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  subject TEXT,
  body TEXT NOT NULL,
  is_read INTEGER NOT NULL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now','localtime'))
);

CREATE INDEX IF NOT EXISTS idx_articles_status ON articles(status);
CREATE INDEX IF NOT EXISTS idx_articles_category ON articles(category_id);
CREATE INDEX IF NOT EXISTS idx_articles_slug ON articles(slug);
`);

ensureColumn('articles', 'sort_order', 'sort_order INTEGER NOT NULL DEFAULT 0');
ensureColumn('categories', 'sort_order', 'sort_order INTEGER NOT NULL DEFAULT 0');
ensureColumn('videos', 'sort_order', 'sort_order INTEGER NOT NULL DEFAULT 0');
ensureColumn('photos', 'sort_order', 'sort_order INTEGER NOT NULL DEFAULT 0');
ensureColumn('slides', 'show_image', 'show_image INTEGER NOT NULL DEFAULT 1');

const SOCIAL_KEYS = ['facebook', 'instagram', 'twitter', 'youtube', 'whatsapp', 'telegram', 'tiktok'];
const insertSetting = db.prepare('INSERT OR IGNORE INTO settings (key,value) VALUES (?,?)');
SOCIAL_KEYS.forEach(k => insertSetting.run(`${k}_visible`, '1'));

function backfillSort(table, newestFirst = false) {
  const rows = db.prepare(`SELECT id FROM ${table} ORDER BY id`).all();
  const upd = db.prepare(`UPDATE ${table} SET sort_order = ? WHERE id = ?`);
  if (newestFirst) {
    rows.forEach((r, i) => upd.run(rows.length - i, r.id));
  } else {
    rows.forEach((r, i) => upd.run(i + 1, r.id));
  }
}
const counts = {
  articles: Number(db.prepare('SELECT COUNT(*) c FROM articles').get().c),
  categories: Number(db.prepare('SELECT COUNT(*) c FROM categories').get().c),
  videos: Number(db.prepare('SELECT COUNT(*) c FROM videos').get().c),
  photos: Number(db.prepare('SELECT COUNT(*) c FROM photos').get().c)
};
const backfilled = db.prepare(`SELECT value FROM settings WHERE key = 'sort_backfilled'`).get();
if (!backfilled) {
  if (counts.articles) backfillSort('articles', true);
  if (counts.categories) backfillSort('categories', false);
  if (counts.videos) backfillSort('videos', true);
  if (counts.photos) backfillSort('photos', true);
  db.prepare("INSERT OR REPLACE INTO settings (key,value) VALUES ('sort_backfilled','1')").run();
}

module.exports = db;
