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

module.exports = { slugify, uniqueSlug, getSettings, formatDate, timeAgo, truncate, icon, iconList, readingTime };
