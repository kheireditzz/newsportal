const jwt = require('jsonwebtoken');
const db = require('./db/database');
const config = require('./config');

function sign(user) {
  return jwt.sign(
    { id: user.id, name: user.name, email: user.email, role: user.role },
    config.jwtSecret,
    { expiresIn: '7d' }
  );
}

function readToken(req) {
  if (req.cookies && req.cookies.token) return req.cookies.token;
  const auth = req.headers.authorization;
  if (auth && auth.startsWith('Bearer ')) return auth.slice(7);
  return null;
}

function attachUser(req, res, next) {
  const token = readToken(req);
  req.user = null;
  if (token) {
    try {
      req.user = jwt.verify(token, config.jwtSecret);
    } catch (e) { /* token invalid */ }
  }
  res.locals.currentUser = req.user;
  res.locals.path = req.path;
  next();
}

function requireAuth(req, res, next) {
  if (req.user) return next();
  if (req.path.startsWith('/api/')) {
    return res.status(401).json({ error: 'Tidak terautentikasi. Silakan login.' });
  }
  return res.redirect('/admin/login');
}

function requireAdmin(req, res, next) {
  if (req.user && req.user.role === 'admin') return next();
  if (req.path.startsWith('/api/')) {
    return res.status(403).json({ error: 'Akses ditolak. Khusus administrator.' });
  }
  return res.status(403).render('admin/error', { title: 'Akses Ditolak', message: 'Halaman ini khusus administrator.' });
}

function loginUser(email, password) {
  const bcrypt = require('bcryptjs');
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user) return null;
  if (!bcrypt.compareSync(password, user.password)) return null;
  return user;
}

module.exports = { sign, attachUser, requireAuth, requireAdmin, loginUser };
