const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/userModel');
const { logger } = require('../utils/logger');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change';
const JWT_EXPIRES = process.env.JWT_EXPIRES || '2h';

function sanitizeUser(u) {
  return { id: u._id.toString(), nome: u.nome, email: u.email, roles: u.roles };
}

module.exports = {
  async registrar(req, res) {
    try {
      const { nome, email, senha } = req.body || {};
      if (!nome || !email || !senha) return res.status(400).json({ message: 'Campos obrigatórios: nome, email, senha.' });
      const exists = await User.findOne({ email });
      if (exists) return res.status(409).json({ message: 'E-mail já cadastrado.' });
      const senhaHash = await bcrypt.hash(senha, 10);
      const user = await User.create({ nome, email, senhaHash });
      logger.info({ userId: user._id }, 'Usuário registrado');
      return res.status(201).json({ message: 'Registrado com sucesso.' });
    } catch (err) {
      logger.error({ err }, 'Falha registrar');
      return res.status(500).json({ message: 'Erro interno ao registrar.' });
    }
  },
  async login(req, res) {
    try {
      const { email, senha } = req.body || {};
      if (!email || !senha) return res.status(400).json({ message: 'Informe email e senha.' });
      const user = await User.findOne({ email });
      if (!user) return res.status(401).json({ message: 'Credenciais inválidas.' });
      const ok = await bcrypt.compare(senha, user.senhaHash);
      if (!ok) return res.status(401).json({ message: 'Credenciais inválidas.' });
      const token = jwt.sign({ sub: user._id.toString(), roles: user.roles }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
      res.cookie('auth', token, { httpOnly: true, sameSite: 'lax', secure: false, maxAge: 1000*60*60*2 });
      return res.json({ user: sanitizeUser(user), token });
    } catch (err) {
      logger.error({ err }, 'Falha login');
      return res.status(500).json({ message: 'Erro interno de login.' });
    }
  },
  async me(req, res) {
    if (!req.user) return res.status(401).json({ message: 'Não autenticado.' });
    return res.json({ user: sanitizeUser(req.user) });
  },
  async logout(req, res) {
    res.clearCookie('auth');
    return res.json({ message: 'Logout efetuado.' });
  }
};
