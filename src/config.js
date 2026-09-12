const path = require('path');

const ROOT = path.join(__dirname, '..');

const config = {
  port: process.env.PORT || 3000,
  jwtSecret: process.env.JWT_SECRET || 'nusantara-news-secret-key-change-me',
  root: ROOT,
  data: path.join(ROOT, 'data'),
  uploads: path.join(ROOT, 'public', 'uploads'),
  views: path.join(ROOT, 'views')
};

module.exports = config;
