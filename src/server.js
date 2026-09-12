const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcryptjs');
const expressLayouts = require('express-ejs-layouts');

const config = require('./config');
const db = require('./db/database');
const helpers = require('./helpers');
const auth = require('./auth');
const { upload, filePath, dbUpload } = require('./upload');

const app = express();

app.set('view engine', 'ejs');
app.set('views', config.views);
app.use(expressLayouts);
app.set('layout', 'layout');

app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.json({ limit: '50mb' }));
app.use(cookieParser());
app.use(express.static(path.join(config.root, 'public')));

app.use((req, res, next) => {
  res.locals.h = helpers;
  res.locals.settings = helpers.getSettings();
  res.locals.categories = db.prepare('SELECT * FROM categories ORDER BY sort_order, name').all();
  res.locals.query = req.query;
  next();
});

app.use(auth.attachUser);

function render(res, view, data = {}) {
  const status = view === '404' ? 404 : (view === 'error' ? 500 : 200);
  res.render(view, data, (err, html) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Terjadi kesalahan render: ' + err.message);
    }
    res.status(status).send(html);
  });
}

/* ============================ PUBLIC ROUTES ============================ */

app.get('/', (req, res) => {
  const slides = db.prepare('SELECT * FROM slides WHERE active = 1 ORDER BY sort_order, id').all();
  const featured = db.prepare(`
    SELECT a.*, c.name AS category_name, c.slug AS category_slug, c.color AS category_color
    FROM articles a LEFT JOIN categories c ON c.id = a.category_id
    WHERE a.status = 'published' AND a.featured = 1
    ORDER BY a.published_at DESC LIMIT 6`).all();
  const latest = db.prepare(`
    SELECT a.*, c.name AS category_name, c.slug AS category_slug, c.color AS category_color
    FROM articles a LEFT JOIN categories c ON c.id = a.category_id
    WHERE a.status = 'published'
    ORDER BY a.published_at DESC LIMIT 9`).all();
  const popular = db.prepare(`
    SELECT a.*, c.name AS category_name, c.slug AS category_slug
    FROM articles a LEFT JOIN categories c ON c.id = a.category_id
    WHERE a.status = 'published' ORDER BY a.views DESC LIMIT 5`).all();
  const videos = db.prepare('SELECT * FROM videos WHERE status = \'published\' ORDER BY created_at DESC LIMIT 4').all();
  const photos = db.prepare('SELECT * FROM photos WHERE status = \'published\' ORDER BY created_at DESC LIMIT 6').all();
  const byCategory = db.prepare('SELECT * FROM categories ORDER BY sort_order, name').all().slice(0, 4).map(cat => ({
    category: cat,
    articles: db.prepare(`
      SELECT a.*, c.name AS category_name, c.slug AS category_slug, c.color AS category_color
      FROM articles a LEFT JOIN categories c ON c.id = a.category_id
      WHERE a.status = 'published' AND a.category_id = ?
      ORDER BY a.published_at DESC LIMIT 3`).all(cat.id)
  })).filter(x => x.articles.length);

  render(res, 'index', { title: settingsTitle(res), active: 'home', slides, featured, latest, popular, videos, photos, byCategory });
});

function settingsTitle(res) {
  const s = res.locals.settings || {};
  return s.site_name || 'Nusantara News';
}

const REORDERABLE = { articles: ['id'], categories: ['id'], videos: ['id'], photos: ['id'], slides: ['id'] };

function reorder(req, res, table) {
  const items = req.body.items;
  if (!Array.isArray(items) || !items.length) return res.status(400).json({ success: false, error: 'items wajib berupa array.' });
  const upd = db.prepare(`UPDATE ${table} SET sort_order = ? WHERE id = ?`);
  items.forEach((id, i) => upd.run(i + 1, Number(id)));
  res.json({ success: true });
}

app.post('/api/admin/reorder/:table', auth.requireAuth, (req, res) => {
  const table = req.params.table;
  if (!REORDERABLE[table]) return res.status(400).json({ success: false, error: 'Tabel tidak didukung.' });
  reorder(req, res, table);
});

/* ============================ MEDIA HELPERS ============================ */

function ensureUploadDir(sub) {
  const dir = path.join(config.uploads, sub || 'images');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function saveBase64Image(dataUrl, sub = 'images') {
  const m = /^data:image\/([a-zA-Z0-9.+-]+);base64,(.+)$/.exec(dataUrl || '');
  if (!m) return null;
  const mime = m[1].toLowerCase();
  let ext = 'png';
  if (mime.includes('jpeg') || mime.includes('jpg')) ext = 'jpg';
  else if (mime.includes('webp')) ext = 'webp';
  const raw = m[2];
  const buf = Buffer.from(raw, 'base64');
  if (!buf.length) return null;
  const dir = ensureUploadDir(sub);
  const name = `${Date.now()}-crop-${crypto.randomBytes(5).toString('hex')}.${ext}`;
  fs.writeFileSync(path.join(dir, name), buf);
  return `${sub}/${name}`;
}

function youtubeIdOf(url) {
  const m = String(url || '').match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{6,20})/);
  return m ? m[1] : null;
}

function tiktokIdOf(url) {
  const m = String(url || '').match(/(?:tiktok\.com\/@[\w.-]+\/video\/|vm\.tiktok\.com\/)([\w]+)/);
  return m ? m[1] : null;
}

function extractYouTubeThumb(id, quality = 'hqdefault') {
  const dir = ensureUploadDir('images');
  const name = `yt-${id}-${quality}.jpg`;
  const file = path.join(dir, name);
  if (!fs.existsSync(file)) {
    try {
      // try 720p/oarfirst, fallback to hqdefault
      const urls = [
        `https://img.youtube.com/vi/${id}/maxresdefault.jpg`,
        `https://img.youtube.com/vi/${id}/${quality}.jpg`
      ];
      const buf = fs.readFileSync(urls[0]);
      fs.writeFileSync(file, buf);
    } catch (e) {
      try {
        const buf = fs.readFileSync(`https://img.youtube.com/vi/${id}/${quality}.jpg`);
        fs.writeFileSync(file, buf);
      } catch (e2) {
        return null;
      }
    }
  }
  return `images/${name}`;
}

async function fetchImageToFile(url, sub = 'images') {
  if (!url) return null;
  const dir = ensureUploadDir(sub);
  const ext = (path.extname(new URL(url).pathname) || '.jpg').slice(0, 6);
  const name = `${Date.now()}-f-${crypto.randomBytes(4).toString('hex')}${ext}`;
  try {
    const resp = await fetch(url, { signal: AbortSignal.timeout(9000) });
    if (!resp.ok) return null;
    const buf = Buffer.from(await resp.arrayBuffer());
    if (!buf.length) return null;
    fs.writeFileSync(path.join(dir, name), buf);
    return `${sub}/${name}`;
  } catch (e) {
    return null;
  }
}

function getVideoMeta(url) {
  const yt = youtubeIdOf(url);
  const tt = tiktokIdOf(url);
  if (yt) return { type: 'youtube', id: yt };
  if (tt) return { type: 'tiktok', id: tt };
  return { type: 'other', id: null };
}

/* ============================ MEDIA API ============================ */

/* Crop / edited image upload (base64) — used by article / video / slide editors */
app.post('/api/media/crop', auth.requireAuth, (req, res) => {
  try {
    const { dataUrl } = req.body || {};
    if (!dataUrl) {
      return res.status(400).json({ success: false, error: 'Data gambar tidak ditemukan.' });
    }
    const saved = saveBase64Image(dataUrl);
    if (!saved) return res.status(400).json({ success: false, error: 'Gagal memproses format gambar.' });
    res.json({ success: true, path: saved });
  } catch (err) {
    console.error('Error in /api/media/crop:', err);
    res.status(500).json({ success: false, error: 'Terjadi kesalahan server saat menyimpan crop.' });
  }
});

async function ytTitle(id) {
  try {
    const resp = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${id}&format=json`);
    const data = await resp.json();
    return { title: data.title, author: data.author_name };
  } catch (e) { return { title: '' }; }
}

async function tiktokVideoInfo(id) {
  try {
    const resp = await fetch(`https://www.tiktok.com/oembed?url=https://www.tiktok.com/@user/video/${id}`);
    if (!resp.ok) return null;
    const data = await resp.json();
    return { title: data.title, cover: data.thumbnail_url, html: data.html };
  } catch (e) { return null; }
}

async function tiktokSeedLocal(id) {
  const dir = ensureUploadDir('images');
  const name = `tt-${id}.jpg`;
  const file = path.join(dir, name);
  if (fs.existsSync(file)) return `images/${name}`;
  try {
    const info = await tiktokVideoInfo(id);
    const cover = info && info.cover;
    if (!cover) return null;
    const buf = Buffer.from(await (await fetch(cover, { signal: AbortSignal.timeout(9000) })).arrayBuffer());
    if (!buf.length) return null;
    fs.writeFileSync(file, buf);
    return `images/${name}`;
  } catch (e) { return null; }
}

app.get('/api/video/meta', auth.requireAuth, async (req, res) => {
  const { url } = req.query;
  const meta = getVideoMeta(url);
  if (!meta.id) return res.json({ success: false, error: 'Link video tidak dikenali.' });
  if (meta.type === 'youtube') {
    const info = await ytTitle(meta.id);
    return res.json({ success: true, type: 'youtube', id: meta.id, title: info.title || '', thumbPath: extractYouTubeThumb(meta.id) });
  }
  if (meta.type === 'tiktok') {
    const info = await tiktokVideoInfo(meta.id);
    return res.json({ success: true, type: 'tiktok', id: meta.id, title: info ? info.title : '', cover: info ? info.cover : '' });
  }
  res.json({ success: false });
});

app.post('/api/video/thumb', auth.requireAuth, async (req, res) => {
  const { url } = req.body || {};
  const meta = getVideoMeta(url);
  if (!meta.id) return res.json({ success: false, error: 'Link video tidak dikenali.', meta });

  let thumb = null;
  if (meta.type === 'youtube') {
    thumb = extractYouTubeThumb(meta.id);
  }
  if (meta.type === 'tiktok') {
    thumb = await tiktokSeedLocal(meta.id);
  }
  if (!thumb) return res.json({ success: false, error: 'Thumbnail tidak tersedia untuk video ini.', meta });
  res.json({ success: true, thumb, meta, url });
});

app.get('/berita', (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const perPage = 9;
  const q = (req.query.q || '').trim();
  const catSlug = req.query.kategori || '';

  let where = "WHERE a.status = 'published'";
  const params = [];
  if (q) { where += ' AND (a.title LIKE ? OR a.excerpt LIKE ?)'; params.push(`%${q}%`, `%${q}%`); }
  if (catSlug) { where += ' AND c.slug = ?'; params.push(catSlug); }

  const base = `
    FROM articles a LEFT JOIN categories c ON c.id = a.category_id
    ${where}`;

  const total = db.prepare(`SELECT COUNT(*) c ${base}`).get(...params).c;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const articles = db.prepare(`
    SELECT a.*, c.name AS category_name, c.slug AS category_slug, c.color AS category_color
    ${base} ORDER BY a.published_at DESC LIMIT ? OFFSET ?`)
    .all(...params, perPage, (page - 1) * perPage);

  render(res, 'berita', {
    title: 'Berita', active: 'berita', articles, page, totalPages, total, q, catSlug
  });
});

app.get('/berita/:slug', (req, res) => {
  const article = db.prepare(`
    SELECT a.*, c.name AS category_name, c.slug AS category_slug, c.color AS category_color,
           u.name AS author_name
    FROM articles a
    LEFT JOIN categories c ON c.id = a.category_id
    LEFT JOIN users u ON u.id = a.author_id
    WHERE a.slug = ? AND a.status = 'published'`).get(req.params.slug);

  if (!article) return render(res, '404', { title: 'Berita tidak ditemukan' });

  db.prepare('UPDATE articles SET views = views + 1 WHERE id = ?').run(article.id);
  article.views += 1;

  const related = db.prepare(`
    SELECT a.*, c.name AS category_name, c.slug AS category_slug, c.color AS category_color
    FROM articles a LEFT JOIN categories c ON c.id = a.category_id
    WHERE a.status = 'published' AND a.category_id = ? AND a.id != ?
    ORDER BY a.published_at DESC LIMIT 3`).all(article.category_id, article.id);

  const popular = db.prepare(`
    SELECT a.*, c.name AS category_name FROM articles a LEFT JOIN categories c ON c.id = a.category_id
    WHERE a.status = 'published' ORDER BY a.views DESC LIMIT 5`).all();

  render(res, 'detail', { title: article.title, active: 'berita', article, related, popular });
});

app.get('/kategori/:slug', (req, res) => {
  const category = db.prepare('SELECT * FROM categories WHERE slug = ?').get(req.params.slug);
  if (!category) return render(res, '404', { title: 'Kategori tidak ditemukan' });
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const perPage = 9;
  const total = db.prepare("SELECT COUNT(*) c FROM articles WHERE status='published' AND category_id = ?").get(category.id).c;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const articles = db.prepare(`
    SELECT a.*, c.name AS category_name, c.slug AS category_slug, c.color AS category_color
    FROM articles a LEFT JOIN categories c ON c.id = a.category_id
    WHERE a.status='published' AND a.category_id = ?
    ORDER BY a.published_at DESC LIMIT ? OFFSET ?`).all(category.id, perPage, (page - 1) * perPage);

  render(res, 'kategori', { title: category.name, active: 'berita', category, articles, page, totalPages, total });
});

app.get('/video', (req, res) => {
  const videos = db.prepare(`
    SELECT v.*, c.name AS category_name, c.slug AS category_slug
    FROM videos v LEFT JOIN categories c ON c.id = v.category_id
    WHERE v.status = 'published' ORDER BY v.created_at DESC`).all();
  render(res, 'video', { title: 'Video', active: 'video', videos });
});

app.get('/galeri', (req, res) => {
  const photos = db.prepare("SELECT * FROM photos WHERE status = 'published' ORDER BY created_at DESC").all();
  const albums = [...new Set(photos.map(p => p.album))];
  render(res, 'galeri', { title: 'Galeri', active: 'galeri', photos, albums });
});

app.get('/tentang', (req, res) => render(res, 'tentang', { title: 'Tentang Kami', active: 'tentang' }));

app.get('/rss', (req, res) => {
  const site = helpers.getSettings();
  const base = `${req.protocol}://${req.get('host')}`;
  const rows = db.prepare(`
    SELECT a.title, a.slug, a.excerpt, a.published_at, c.name AS category
    FROM articles a LEFT JOIN categories c ON c.id = a.category_id
    WHERE a.status = 'published' ORDER BY a.published_at DESC LIMIT 30`).all();
  const items = rows.map(a => `
    <item>
      <title><![CDATA[${a.title}]]></title>
      <link>${base}/berita/${a.slug}</link>
      <guid isPermaLink="true">${base}/berita/${a.slug}</guid>
      ${a.category ? `<category><![CDATA[${a.category}]]></category>` : ''}
      <description><![CDATA[${a.excerpt || ''}]]></description>
      <pubDate>${new Date(String(a.published_at || '').replace(' ', 'T')).toUTCString()}</pubDate>
    </item>`).join('');
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel>
  <title><![CDATA[${site.site_name || 'Nusantara News'}]]></title>
  <link>${base}</link>
  <description><![CDATA[${site.description || ''}]]></description>
  <language>id-ID</language>
  <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
  ${items}
</channel></rss>`;
  res.type('application/rss+xml').send(xml);
});

app.get('/kontak', (req, res) => render(res, 'kontak', { title: 'Kontak', active: 'kontak', sent: req.query.sent === '1' }));

app.post('/kontak', (req, res) => {
  const { name, email, subject, body } = req.body;
  if (!name || !email || !body) return res.redirect('/kontak');
  db.prepare('INSERT INTO messages (name,email,subject,body) VALUES (?,?,?,?)').run(name, email, subject || '-', body);
  res.redirect('/kontak?sent=1');
});

/* ============================ PUBLIC API ============================ */

app.get('/api/articles', (req, res) => {
  const limit = Math.min(50, parseInt(req.query.limit) || 10);
  const rows = db.prepare(`
    SELECT a.id,a.title,a.slug,a.excerpt,a.image,a.views,a.published_at,
           c.name AS category, c.slug AS category_slug
    FROM articles a LEFT JOIN categories c ON c.id = a.category_id
    WHERE a.status='published' ORDER BY a.published_at DESC LIMIT ?`).all(limit);
  res.json({ success: true, data: rows });
});

app.get('/api/articles/:slug', (req, res) => {
  const row = db.prepare(`
    SELECT a.*, c.name AS category, c.slug AS category_slug, u.name AS author
    FROM articles a LEFT JOIN categories c ON c.id=a.category_id LEFT JOIN users u ON u.id=a.author_id
    WHERE a.slug=? AND a.status='published'`).get(req.params.slug);
  if (!row) return res.status(404).json({ success: false, error: 'Not found' });
  res.json({ success: true, data: row });
});

app.get('/api/categories', (req, res) => {
  res.json({ success: true, data: db.prepare('SELECT * FROM categories ORDER BY name').all() });
});

app.get('/api/videos', (req, res) => {
  res.json({ success: true, data: db.prepare("SELECT * FROM videos WHERE status='published' ORDER BY created_at DESC").all() });
});

app.get('/api/photos', (req, res) => {
  res.json({ success: true, data: db.prepare("SELECT * FROM photos WHERE status='published' ORDER BY created_at DESC").all() });
});

app.get('/api/slides', (req, res) => {
  res.json({ success: true, data: db.prepare('SELECT * FROM slides WHERE active=1 ORDER BY sort_order').all() });
});

app.get('/api/settings', (req, res) => res.json({ success: true, data: helpers.getSettings() }));

app.get('/api/search', (req, res) => {
  const q = `%${(req.query.q || '').trim()}%`;
  const rows = db.prepare(`
    SELECT a.id,a.title,a.slug,a.image,a.published_at, c.name AS category
    FROM articles a LEFT JOIN categories c ON c.id=a.category_id
    WHERE a.status='published' AND a.title LIKE ? ORDER BY a.published_at DESC LIMIT 10`).all(q);
  res.json({ success: true, data: rows });
});

/* ============================ ADMIN AUTH ============================ */

app.get('/admin/login', (req, res) => {
  if (req.user) return res.redirect('/admin');
  render(res, 'admin/login', { title: 'Login Admin', error: null, layout: 'admin/layout-auth' });
});

app.post('/admin/login', (req, res) => {
  const { email, password } = req.body;
  const user = auth.loginUser(email || '', password || '');
  if (!user) return render(res, 'admin/login', { title: 'Login Admin', error: 'Email atau password salah.', layout: 'admin/layout-auth' });
  res.cookie('token', auth.sign(user), { httpOnly: true, sameSite: 'lax', maxAge: 7 * 24 * 3600 * 1000 });
  res.redirect('/admin');
});

app.get('/admin/logout', (req, res) => {
  res.clearCookie('token');
  res.redirect('/admin/login');
});

/* ============================ ADMIN PANEL ============================ */

const admin = express.Router();
admin.use((req, res, next) => { res.locals.layout = 'admin/layout'; next(); });
admin.use(auth.requireAuth);

admin.get('/', (req, res) => {
  const stats = {
    articles: db.prepare("SELECT COUNT(*) c FROM articles").get().c,
    published: db.prepare("SELECT COUNT(*) c FROM articles WHERE status='published'").get().c,
    drafts: db.prepare("SELECT COUNT(*) c FROM articles WHERE status='draft'").get().c,
    videos: db.prepare("SELECT COUNT(*) c FROM videos").get().c,
    photos: db.prepare("SELECT COUNT(*) c FROM photos").get().c,
    categories: db.prepare("SELECT COUNT(*) c FROM categories").get().c,
    slides: db.prepare("SELECT COUNT(*) c FROM slides").get().c,
    messages: db.prepare("SELECT COUNT(*) c FROM messages").get().c,
    unread: db.prepare("SELECT COUNT(*) c FROM messages WHERE is_read=0").get().c,
    views: db.prepare("SELECT COALESCE(SUM(views),0) c FROM articles").get().c
  };
  const recent = db.prepare(`
    SELECT a.*, c.name AS category_name FROM articles a LEFT JOIN categories c ON c.id=a.category_id
    ORDER BY a.created_at DESC LIMIT 6`).all();
  const popular = db.prepare('SELECT id,title,views,slug FROM articles ORDER BY views DESC LIMIT 5').all();
  const messages = db.prepare('SELECT * FROM messages ORDER BY created_at DESC LIMIT 5').all();
  render(res, 'admin/dashboard', { title: 'Dashboard', active: 'dashboard', stats, recent, popular, messages });
});

/* ---------- Articles ---------- */
admin.get('/artikel', (req, res) => {
  const q = (req.query.q || '').trim();
  const status = req.query.status || '';
  let where = 'WHERE 1=1';
  const params = [];
  if (q) { where += ' AND a.title LIKE ?'; params.push(`%${q}%`); }
  if (status) { where += ' AND a.status = ?'; params.push(status); }
  const articles = db.prepare(`
    SELECT a.*, c.name AS category_name, u.name AS author_name
    FROM articles a LEFT JOIN categories c ON c.id=a.category_id LEFT JOIN users u ON u.id=a.author_id
    ${where} ORDER BY a.sort_order = 0, a.sort_order, a.created_at DESC LIMIT 300`).all(...params);
  render(res, 'admin/articles', { title: 'Kelola Artikel', active: 'artikel', articles, q, status });
});

admin.get('/artikel/baru', (req, res) => {
  render(res, 'admin/article-form', {
    title: 'Tulis Artikel', active: 'artikel', article: null,
    categories: db.prepare('SELECT * FROM categories ORDER BY name').all()
  });
});

admin.post('/artikel', upload.single('image'), (req, res) => {
  const { title, excerpt, content, category_id, status, featured } = req.body;
  if (!title || !content) return res.redirect('/admin/artikel/baru');
  const slug = helpers.uniqueSlug('articles', title);
  const image = req.body.crop_image || (req.file ? filePath(req.file) : (req.body.image_url || null));
  const isPublished = status === 'published';
  db.prepare(`INSERT INTO articles
    (title,slug,excerpt,content,image,category_id,author_id,status,featured,published_at)
    VALUES (?,?,?,?,?,?,?,?,?,?)`).run(
    title, slug, excerpt || helpers.truncate(content, 160), content, image,
    category_id || null, req.user.id, isPublished ? 'published' : 'draft',
    featured ? 1 : 0, isPublished ? new Date().toISOString().slice(0, 19).replace('T', ' ') : null
  );
  res.redirect('/admin/artikel');
});

admin.get('/artikel/:id/edit', (req, res) => {
  const article = db.prepare('SELECT * FROM articles WHERE id=?').get(req.params.id);
  if (!article) return res.redirect('/admin/artikel');
  render(res, 'admin/article-form', {
    title: 'Edit Artikel', active: 'artikel', article,
    categories: db.prepare('SELECT * FROM categories ORDER BY name').all()
  });
});

admin.post('/artikel/:id', upload.single('image'), (req, res) => {
  const article = db.prepare('SELECT * FROM articles WHERE id=?').get(req.params.id);
  if (!article) return res.redirect('/admin/artikel');
  const { title, excerpt, content, category_id, status, featured } = req.body;
  const slug = req.body.slug ? helpers.uniqueSlug('articles', req.body.slug, article.id) : article.slug;
  const image = req.body.crop_image || (req.file ? filePath(req.file) : (req.body.image_url || article.image));
  const isPublished = status === 'published';
  db.prepare(`UPDATE articles SET title=?,slug=?,excerpt=?,content=?,image=?,category_id=?,
    status=?,featured=?,published_at=?,updated_at=datetime('now','localtime') WHERE id=?`).run(
    title, slug, excerpt || helpers.truncate(content, 160), content, image,
    category_id || null, isPublished ? 'published' : 'draft', featured ? 1 : 0,
    article.published_at || (isPublished ? new Date().toISOString().slice(0, 19).replace('T', ' ') : null),
    article.id
  );
  res.redirect('/admin/artikel');
});

admin.post('/artikel/:id/delete', (req, res) => {
  db.prepare('DELETE FROM articles WHERE id=?').run(req.params.id);
  res.redirect('/admin/artikel');
});

/* ---------- Categories ---------- */
admin.get('/kategori', (req, res) => {
  const categories = db.prepare(`
    SELECT c.*, (SELECT COUNT(*) FROM articles a WHERE a.category_id=c.id) AS article_count
    FROM categories c ORDER BY c.sort_order = 0, c.sort_order, c.name`).all();
  render(res, 'admin/categories', { title: 'Kelola Kategori', active: 'kategori', categories, editing: null });
});

admin.get('/kategori/:id/edit', (req, res) => {
  const editing = db.prepare('SELECT * FROM categories WHERE id=?').get(req.params.id);
  const categories = db.prepare(`
    SELECT c.*, (SELECT COUNT(*) FROM articles a WHERE a.category_id=c.id) AS article_count
    FROM categories c ORDER BY c.sort_order = 0, c.sort_order, c.name`).all();
  render(res, 'admin/categories', { title: 'Kelola Kategori', active: 'kategori', categories, editing });
});

admin.post('/kategori', (req, res) => {
  const { name, description, color } = req.body;
  if (name) db.prepare('INSERT INTO categories (name,slug,description,color) VALUES (?,?,?,?)')
    .run(name, helpers.uniqueSlug('categories', name), description || '', color || '#2563eb');
  res.redirect('/admin/kategori');
});

admin.post('/kategori/:id', (req, res) => {
  const { name, description, color } = req.body;
  db.prepare('UPDATE categories SET name=?, slug=?, description=?, color=? WHERE id=?')
    .run(name, helpers.uniqueSlug('categories', name, req.params.id), description || '', color || '#2563eb', req.params.id);
  res.redirect('/admin/kategori');
});

admin.post('/kategori/:id/delete', (req, res) => {
  db.prepare('DELETE FROM categories WHERE id=?').run(req.params.id);
  res.redirect('/admin/kategori');
});

/* ---------- Videos ---------- */
admin.get('/video', (req, res) => {
  const videos = db.prepare(`
    SELECT v.*, c.name AS category_name FROM videos v LEFT JOIN categories c ON c.id=v.category_id
    ORDER BY v.sort_order = 0, v.sort_order, v.created_at DESC`).all();
  render(res, 'admin/videos', {
    title: 'Kelola Video', active: 'video', videos, editing: null,
    categories: db.prepare('SELECT * FROM categories ORDER BY name').all()
  });
});

admin.get('/video/:id/edit', (req, res) => {
  const editing = db.prepare('SELECT * FROM videos WHERE id=?').get(req.params.id);
  const videos = db.prepare(`
    SELECT v.*, c.name AS category_name FROM videos v LEFT JOIN categories c ON c.id=v.category_id
    ORDER BY v.sort_order = 0, v.sort_order, v.created_at DESC`).all();
  render(res, 'admin/videos', {
    title: 'Kelola Video', active: 'video', videos, editing,
    categories: db.prepare('SELECT * FROM categories ORDER BY name').all()
  });
});

admin.post('/video', upload.single('thumbnail'), async (req, res) => {
  const { title, description, url, duration, category_id, status } = req.body;
  if (title) {
    let thumb = req.body.crop_image || (req.file ? filePath(req.file) : (req.body.thumbnail_url || null));
    if (!thumb && req.body.thumb_path) thumb = req.body.thumb_path;
    if (!thumb && url) {
      // auto-fetch from YouTube/TikTok
      const meta = getVideoMeta(url);
      if (meta.type === 'youtube') thumb = extractYouTubeThumb(meta.id);
      if (meta.type === 'tiktok') thumb = await tiktokSeedLocal(meta.id);
      // auto-duration fallback
      if (!duration && meta.type === 'youtube' && !req.body.duration) {
        try {
          const b = await (await fetch(`https://noembed.com/embed?url=${encodeURIComponent(url)}`, { signal: AbortSignal.timeout(6000) })).json();
          req.b = b;
        } catch (e) { /* ignore */ }
      }
    }
    db.prepare('INSERT INTO videos (title,description,url,thumbnail,duration,category_id,status) VALUES (?,?,?,?,?,?,?)')
      .run(title, description || '', url || '', thumb, duration || '', category_id || null, status || 'published');
  }
  res.redirect('/admin/video');
});

admin.post('/video/:id', upload.single('thumbnail'), async (req, res) => {
  const v = db.prepare('SELECT * FROM videos WHERE id=?').get(req.params.id);
  if (!v) return res.redirect('/admin/video');
  const { title, description, url, duration, category_id, status } = req.body;
  let thumb = req.body.crop_image || (req.file ? filePath(req.file) : (req.body.thumbnail_url || v.thumbnail));
  if (req.body.thumb_path) thumb = req.body.thumb_path;
  if (!thumb && url) {
    const meta = getVideoMeta(url);
    if (meta.type === 'youtube') thumb = extractYouTubeThumb(meta.id);
    if (meta.type === 'tiktok') thumb = await tiktokSeedLocal(meta.id);
  }
  db.prepare('UPDATE videos SET title=?,description=?,url=?,thumbnail=?,duration=?,category_id=?,status=? WHERE id=?')
    .run(title, description || '', url || '', thumb, duration || '', category_id || null, status || 'published', v.id);
  res.redirect('/admin/video');
});

admin.post('/video/:id/delete', (req, res) => {
  db.prepare('DELETE FROM videos WHERE id=?').run(req.params.id);
  res.redirect('/admin/video');
});

/* ---------- Photos ---------- */
admin.get('/galeri', (req, res) => {
  const photos = db.prepare('SELECT * FROM photos ORDER BY sort_order = 0, sort_order, created_at DESC').all();
  render(res, 'admin/photos', { title: 'Kelola Galeri', active: 'galeri', photos, editing: null });
});

admin.post('/galeri', upload.single('image'), (req, res) => {
  const { title, caption, album, status } = req.body;
  const image = req.body.crop_image || (req.file ? filePath(req.file) : (req.body.image_url || null));
  if (title && image) {
    db.prepare('INSERT INTO photos (title,caption,image,album,status) VALUES (?,?,?,?,?)')
      .run(title, caption || '', image, album || 'Umum', status || 'published');
  }
  res.redirect('/admin/galeri');
});

admin.post('/galeri/:id/delete', (req, res) => {
  db.prepare('DELETE FROM photos WHERE id=?').run(req.params.id);
  res.redirect('/admin/galeri');
});

/* ---------- Slides ---------- */
admin.get('/slide', (req, res) => {
  const slides = db.prepare('SELECT * FROM slides ORDER BY sort_order, id').all();
  render(res, 'admin/slides', { title: 'Kelola Slider', active: 'slide', slides, editing: null });
});

admin.get('/slide/:id/edit', (req, res) => {
  const editing = db.prepare('SELECT * FROM slides WHERE id=?').get(req.params.id);
  const slides = db.prepare('SELECT * FROM slides ORDER BY sort_order, id').all();
  render(res, 'admin/slides', { title: 'Kelola Slider', active: 'slide', slides, editing });
});

admin.post('/slide', upload.single('image'), (req, res) => {
  const { title, subtitle, link, badge, sort_order, active, show_image } = req.body;
  const image = req.body.crop_image || (req.file ? filePath(req.file) : (req.body.image_url || null));
  if (title && image) {
    db.prepare('INSERT INTO slides (title,subtitle,image,link,badge,sort_order,active,show_image) VALUES (?,?,?,?,?,?,?,?)')
      .run(title, subtitle || '', image, link || '', badge || '', parseInt(sort_order) || 0, active ? 1 : 0, show_image ? 1 : 0);
  }
  res.redirect('/admin/slide');
});

admin.post('/slide/:id', upload.single('image'), (req, res) => {
  const s = db.prepare('SELECT * FROM slides WHERE id=?').get(req.params.id);
  if (!s) return res.redirect('/admin/slide');
  const { title, subtitle, link, badge, sort_order, active, show_image } = req.body;
  const image = req.body.crop_image || (req.file ? filePath(req.file) : (req.body.image_url || s.image));
  db.prepare('UPDATE slides SET title=?,subtitle=?,image=?,link=?,badge=?,sort_order=?,active=?,show_image=? WHERE id=?')
    .run(title, subtitle || '', image, link || '', badge || '', parseInt(sort_order) || 0, active ? 1 : 0, show_image ? 1 : 0, s.id);
  res.redirect('/admin/slide');
});

admin.post('/slide/:id/delete', (req, res) => {
  db.prepare('DELETE FROM slides WHERE id=?').run(req.params.id);
  res.redirect('/admin/slide');
});

/* ---------- Messages ---------- */
admin.get('/pesan', (req, res) => {
  const messages = db.prepare('SELECT * FROM messages ORDER BY created_at DESC').all();
  render(res, 'admin/messages', { title: 'Pesan Masuk', active: 'pesan', messages });
});

admin.get('/pesan/:id', (req, res) => {
  const message = db.prepare('SELECT * FROM messages WHERE id=?').get(req.params.id);
  if (!message) return res.redirect('/admin/pesan');
  db.prepare('UPDATE messages SET is_read=1 WHERE id=?').run(req.params.id);
  render(res, 'admin/message-detail', { title: 'Detail Pesan', active: 'pesan', message });
});

admin.post('/pesan/:id/delete', (req, res) => {
  db.prepare('DELETE FROM messages WHERE id=?').run(req.params.id);
  res.redirect('/admin/pesan');
});

/* ---------- Users (admin only) ---------- */
admin.get('/pengguna', auth.requireAdmin, (req, res) => {
  const users = db.prepare('SELECT id,name,email,role,created_at FROM users ORDER BY created_at').all();
  render(res, 'admin/users', { title: 'Kelola Pengguna', active: 'pengguna', users, editing: null });
});

admin.post('/pengguna', auth.requireAdmin, (req, res) => {
  const { name, email, password, role } = req.body;
  if (name && email && password) {
    try {
      db.prepare('INSERT INTO users (name,email,password,role) VALUES (?,?,?,?)')
        .run(name, email, bcrypt.hashSync(password, 10), role || 'editor');
    } catch (e) { /* email duplikat */ }
  }
  res.redirect('/admin/pengguna');
});

admin.post('/pengguna/:id/delete', auth.requireAdmin, (req, res) => {
  if (String(req.params.id) !== String(req.user.id)) {
    db.prepare('DELETE FROM users WHERE id=?').run(req.params.id);
  }
  res.redirect('/admin/pengguna');
});

admin.post('/pengguna/:id/password', auth.requireAdmin, (req, res) => {
  const { password } = req.body;
  if (password) db.prepare('UPDATE users SET password=? WHERE id=?').run(bcrypt.hashSync(password, 10), req.params.id);
  res.redirect('/admin/pengguna');
});

/* ---------- Settings ---------- */
admin.get('/pengaturan', auth.requireAdmin, (req, res) => {
  render(res, 'admin/settings', { title: 'Pengaturan', active: 'pengaturan', values: helpers.getSettings() });
});

admin.post('/pengaturan', auth.requireAdmin, (req, res) => {
  const allowed = ['site_name', 'tagline', 'description', 'email', 'phone', 'address',
    'facebook', 'instagram', 'twitter', 'youtube', 'whatsapp', 'telegram'];
  const upsert = db.prepare('INSERT INTO settings (key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value');
  allowed.forEach(k => { if (k in req.body) upsert.run(k, req.body[k]); });
  ['facebook', 'instagram', 'twitter', 'youtube', 'whatsapp', 'telegram', 'tiktok']
    .forEach(k => upsert.run(`${k}_visible`, req.body[`${k}_visible`] ? '1' : '0'));
  res.redirect('/admin/pengaturan');
});

/* ---------- DB Safety (admin only) ---------- */
const DB_FILE = path.join(config.data, 'news.db');

admin.get('/pencadangan', auth.requireAdmin, (req, res) => {
  let backups = [];
  try {
    const dir = path.join(config.data, 'backups');
    if (fs.existsSync(dir)) {
      backups = fs.readdirSync(dir)
        .filter(f => f.endsWith('.db'))
        .map(f => ({ name: f, size: fs.statSync(path.join(dir, f)).size, mtime: fs.statSync(path.join(dir, f)).mtime }))
        .sort((a, b) => b.mtime - a.mtime);
    }
  } catch (e) { /* ignore */ }
  render(res, 'admin/backups', { title: 'Cadangan Data', active: 'cadangan', backups, msg: req.query.msg || '' });
});

admin.get('/pencadangan/backup', auth.requireAdmin, (req, res) => {
  res.type('application/octet-stream');
  res.setHeader('Content-Disposition', `attachment; filename="news-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.db"`);
  if (fs.existsSync(DB_FILE)) {
    res.sendFile(DB_FILE);
  } else {
    res.status(404).send('Database tidak ditemukan.');
  }
});

admin.post('/pencadangan/backup', auth.requireAdmin, (req, res) => {
  const dir = path.join(config.data, 'backups');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const name = `backup-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.db`;
  let done = false;
  try {
    db.exec('PRAGMA wal_checkpoint(TRUNCATE)');
    fs.copyFileSync(DB_FILE, path.join(dir, name));
    done = true;
  } catch (e) { /* ignore */ }
  if (done) {
    let backups = [];
    try {
      backups = fs.readdirSync(dir).filter(f => f.endsWith('.db'))
        .sort((a, b) => fs.statSync(path.join(dir, b)).mtime - fs.statSync(path.join(dir, a)).mtime);
      backups.slice(12).forEach(f => { try { fs.unlinkSync(path.join(dir, f)); } catch (e2) { /* ignore */ } });
    } catch (e2) { /* ignore */ }
  }
  res.redirect('/admin/pencadangan?msg=' + (done ? 'backup-ok' : 'backup-fail'));
});

const IMPORT_TABLES = ['users', 'categories', 'articles', 'videos', 'photos', 'slides', 'settings', 'messages'];

function importFromSQLiteSync(srcPath) {
  const { DatabaseSync } = require('node:sqlite');
  const src = new DatabaseSync(srcPath, { readOnly: true });
  try {
    db.exec('PRAGMA foreign_keys = OFF');
    db.exec('BEGIN');
    try {
      for (const table of IMPORT_TABLES) {
        const exists = src.prepare(
          "SELECT COUNT(*) c FROM sqlite_master WHERE type='table' AND name=?").get(table).c;
        if (!exists) continue;
        const cols = db.prepare(`PRAGMA table_info(${table})`).all().map(c => c.name);
        if (!cols.length) continue;
        const rows = src.prepare(`SELECT * FROM ${table}`).all();
        db.prepare(`DELETE FROM ${table}`).run();
        if (!rows.length) continue;
        const colList = cols.join(',');
        const ph = cols.map(() => '?').join(',');
        const ins = db.prepare(`INSERT INTO ${table} (${colList}) VALUES (${ph})`);
        for (const r of rows) {
          try { ins.run(...cols.map(c => r[c])); } catch (e2) { /* skip row */ }
        }
      }
      db.exec('COMMIT');
      return true;
    } catch (e) {
      db.exec('ROLLBACK');
      console.error('Import rollback:', e);
      return false;
    } finally {
      db.exec('PRAGMA foreign_keys = ON');
    }
  } finally {
    try { src.close(); } catch (e2) { /* ignore */ }
  }
}

admin.post('/pencadangan/import', auth.requireAdmin, dbUpload.single('file'), (req, res) => {
  if (!req.file) return res.redirect('/admin/pencadangan?msg=import-no-file');
  const backupDir = path.join(config.data, 'backups');
  if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
  const safe = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
  const preName = `before-import-${safe}.db`;
  let ok = false;
  try {
    db.exec('PRAGMA wal_checkpoint(TRUNCATE)');
    fs.copyFileSync(DB_FILE, path.join(backupDir, preName));
    ok = importFromSQLiteSync(req.file.path);
  } catch (e) {
    console.error('Import gagal:', e);
    ok = false;
  }
  try { if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path); } catch (e2) { /* ignore */ }
  res.redirect('/admin/pencadangan?msg=' + (ok ? 'import-ok' : 'import-fail'));
});

admin.post('/pencadangan/delete/:name', auth.requireAdmin, (req, res) => {
  const name = String(req.params.name || '').replace(/\.\./g, '').replace(/[\/\\]/g, '');
  if (name) {
    const file = path.join(config.data, 'backups', name);
    if (fs.existsSync(file) && file.includes('backups')) {
      try { fs.unlinkSync(file); } catch (e) { /* ignore */ }
    }
  }
  res.redirect('/admin/pencadangan');
});

app.use('/admin', admin);

/* ============================ ERRORS ============================ */

app.use((req, res) => render(res, '404', { title: 'Halaman tidak ditemukan', active: '' }));

app.use((err, req, res, next) => {
  console.error(err);
  if (req.path.startsWith('/api/')) return res.status(500).json({ success: false, error: err.message });
  render(res, 'error', { title: 'Kesalahan', active: '', message: err.message });
});

if (require.main === module) {
  app.listen(config.port, () => {
    console.log(`\n  ⚡ Nusantara News berjalan di http://localhost:${config.port}`);
    console.log(`  🔐 Admin: http://localhost:${config.port}/admin (admin@news.id / admin123)\n`);
  });
}

module.exports = app;
