const jwt = require('jsonwebtoken');
const User = require('../models/userModel');
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change';

async function authOptional(req, res, next) {
  const token = (req.cookies && req.cookies.auth) || (req.headers.authorization && req.headers.authorization.startsWith('Bearer ') && req.headers.authorization.slice(7));
  if (!token) return next();
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(payload.sub);
    if (user) req.user = user;
  } catch (err) {
    if (process.env.NODE_ENV !== 'test') {
      console.debug('[authOptional] Token inválido ou expirado', err.message);
    }
  }
  next();
}

function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ message: 'Não autenticado.' });
  next();
}

module.exports = { authOptional, requireAuth };
