const db = require('./db/database');
const fs = require('fs');
const path = require('path');

const ICONS_DIR = path.join(__dirname, '..', 'public', 'icons');
const iconCache = {};

const BRAND_COLORS = {
  facebook: '#1877F2',
  instagram: '#E4405F',
  x: '#111111',
  youtube: '#FF0000',
  whatsapp: '#25D366',
  telegram: '#26A5E4',
  tiktok: '#000000',
  linkedin: '#0A66C2',
  rss: '#FFA500',
  google: '#4285F4',
  gmail: '#EA4335',
  googlenews: '#4285F4',
  googlemaps: '#4285F4'
};

function readIcon(name) {
  if (!iconCache[name]) {
    try {
      iconCache[name] = fs.readFileSync(path.join(ICONS_DIR, `${name}.svg`), 'utf8');
    } catch (e) {
      iconCache[name] = '';
    }
  }
  return iconCache[name];
}

function icon(name, size = 18, opts = {}) {
  const raw = readIcon(name);
  if (!raw) return '';
  const color = opts.brand ? (BRAND_COLORS[name] || 'currentColor') : 'currentColor';
  const body = raw
    .replace(/<title>.*?<\/title>/i, '')
    .replace(/<svg\b[^>]*>/, '')
    .replace(/<\/svg>\s*$/i, '')
    .replace(/<path\b(?![^>]*\bfill=)/g, `<path fill="${color}"`);
  const cls = opts.class ? ` class="${opts.class}"` : '';
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true" focusable="false"${cls}>${body}</svg>`;
}

function iconList() {
  try {
    return fs.readdirSync(ICONS_DIR).filter(f => f.endsWith('.svg')).map(f => f.replace('.svg', ''));
  } catch (e) {
    return [];
  }
}

function slugify(text) {
  return String(text)
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function uniqueSlug(table, base, excludeId = null) {
  let slug = slugify(base) || 'item';
  let candidate = slug;
  let i = 1;
  while (true) {
    const row = excludeId
      ? db.prepare(`SELECT id FROM ${table} WHERE slug = ? AND id != ?`).get(candidate, excludeId)
      : db.prepare(`SELECT id FROM ${table} WHERE slug = ?`).get(candidate);
    if (!row) return candidate;
    candidate = `${slug}-${++i}`;
  }
}

function getSettings() {
  const rows = db.prepare('SELECT key, value FROM settings').all();
  const out = {};
  rows.forEach(r => { out[r.key] = r.value; });
  return out;
}

function formatDate(value, opts = {}) {
  if (!value) return '';
  const d = new Date(String(value).replace(' ', 'T'));
  if (isNaN(d)) return value;
  return d.toLocaleDateString('id-ID', {
    day: 'numeric', month: 'long', year: 'numeric',
    ...(opts.time ? { hour: '2-digit', minute: '2-digit' } : {})
  });
}

function timeAgo(value) {
  if (!value) return '';
  const d = new Date(String(value).replace(' ', 'T'));
  if (isNaN(d)) return value;
  const diff = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diff < 60) return 'baru saja';
  if (diff < 3600) return `${Math.floor(diff / 60)} menit lalu`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} jam lalu`;
  if (diff < 604800) return `${Math.floor(diff / 86400)} hari lalu`;
  return formatDate(value);
}

function truncate(text, len = 140) {
  if (!text) return '';
  const clean = String(text).replace(/<[^>]*>/g, '');
  return clean.length > len ? clean.slice(0, len).trim() + '…' : clean;
}

function readingTime(text) {
  if (!text) return '1 menit baca';
  const clean = String(text).replace(/<[^>]*>/g, ' ');
  const words = clean.trim().split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.ceil(words / 180));
  return `${minutes} menit baca`;
}

function imgUrl(val, fallback = 'images/art-1.svg') {
  if (!val) return '/uploads/' + fallback;
  if (/^https?:\/\//i.test(val)) return val;
  if (val.startsWith('/')) return val;
  return '/uploads/' + val;
}

function injectInContentAd(content) {
  if (!content) return '';
  const adHtml = `
<div class="in-article-ad-box" style="margin:26px 0;padding:14px;background:rgba(0,0,0,0.02);border:1px dashed var(--line, #e2e8f0);border-radius:12px;text-align:center;">
  <span style="display:block;font-size:10.5px;letter-spacing:0.8px;font-weight:700;color:var(--muted, #64748b);text-transform:uppercase;margin-bottom:10px;">Iklan Disponsori</span>
  <div style="min-height:90px;display:flex;align-items:center;justify-content:center;overflow:hidden;">
    <script>
      atOptions = {
        'key' : 'a4c3b4dd04f8b05384ab2c8031d1e854',
        'format' : 'iframe',
        'height' : 90,
        'width' : 728,
        'params' : {}
      };
    </script>
    <script src="https://www.highrevenueformat.com/a4c3b4dd04f8b05384ab2c8031d1e854/invoke.js"></script>
  </div>
  <a href="https://www.profitableratecpmnetwork.com/bamxsvqgb?key=a616970d4eafc758c2c959f9c5d0f267" target="_blank" rel="noopener nofollow" style="display:inline-block;margin-top:8px;font-size:11.5px;color:var(--primary, #0284c7);text-decoration:none;font-weight:600;">
    Rekomendasi Pilihan Terkini &raquo;
  </a>
</div>`;

  // Sisipkan setelah penutup tag </p> kedua atau ketiga
  let pCount = 0;
  let injected = false;
  const replaced = content.replace(/<\/p>/gi, (match) => {
    pCount++;
    if (pCount === 2 && !injected) {
      injected = true;
      return match + adHtml;
    }
    return match;
  });

  return injected ? replaced : content + adHtml;
}

module.exports = { slugify, uniqueSlug, getSettings, formatDate, timeAgo, truncate, icon, iconList, readingTime, imgUrl, injectInContentAd };
