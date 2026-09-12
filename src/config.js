const path = require('path');

const ROOT = path.join(__dirname, '..');

const uploadsDir = process.env.VERCEL 
  ? '/tmp/uploads' 
  : path.join(ROOT, 'public', 'uploads');

const config = {
  port: process.env.PORT || 3000,
  jwtSecret: process.env.JWT_SECRET || 'nusantara-news-secret-key-change-me',
  root: ROOT,
  data: path.join(ROOT, 'data'),
  uploads: uploadsDir,
  views: path.join(ROOT, 'views')
};

module.exports = config;
