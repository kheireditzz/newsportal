const multer = require('multer');
const path = require('path');
const fs = require('fs');
const config = require('./config');

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

ensureDir(path.join(config.uploads, 'images'));
ensureDir(path.join(config.uploads, 'videos'));

const storage = multer.diskStorage({
  destination(req, file, cb) {
    const isVideo = file.mimetype.startsWith('video/');
    const dir = path.join(config.uploads, isVideo ? 'videos' : 'images');
    ensureDir(dir);
    cb(null, dir);
  },
  filename(req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    const base = path.basename(file.originalname, ext)
      .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50);
    cb(null, `${Date.now()}-${base || 'file'}${ext}`);
  }
});

const allowed = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'image/avif',
  'video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'
];

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter(req, file, cb) {
    if (allowed.includes(file.mimetype)) return cb(null, true);
    cb(new Error('Tipe file tidak diizinkan.'));
  }
});

function filePath(file) {
  if (!file) return null;
  const isVideo = file.mimetype.startsWith('video/');
  return `${isVideo ? 'videos' : 'images'}/${file.filename}`;
}

const dbUpload = multer({
  storage: multer.diskStorage({
    destination(req, file, cb) {
      const dir = path.join(config.data, 'backups');
      ensureDir(dir);
      cb(null, dir);
    },
    filename(req, file, cb) {
      cb(null, `${Date.now()}-import${path.extname(file.originalname).toLowerCase() || '.db'}`);
    }
  }),
  limits: { fileSize: 200 * 1024 * 1024 }
});

module.exports = { upload, filePath, dbUpload };
