const express = require("express");
const path = require("path");
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
require('dotenv').config();
const { requestLogger } = require('./middleware/requestLogger');
const { errorHandler } = require('./middleware/errorHandler');
const { authOptional, requireAuth } = require('./middleware/auth');
const { logger } = require('./utils/logger');

const app = express();
// Conexão Mongo Atlas / Local
const MONGO_URL = process.env.MONGO_URL; // Opcional agora (modo somente leads se ausente)
const MONGO_DB = process.env.MONGO_DB || 'chatbotcrm';
const IS_TEST = process.env.NODE_ENV === 'test';
const NO_DB_MODE = !MONGO_URL || IS_TEST;
if (NO_DB_MODE) {
  logger.warn('MONGO_URL ausente: iniciando em modo LEADS-ONLY (sem autenticação persistente).');
} else {
  mongoose.connect(MONGO_URL, { dbName: MONGO_DB }).then(async ()=>{
    try {
      if (!process.env.DISABLE_DEFAULT_USER) {
        const User = require('./models/userModel');
        const existente = await User.findOne({ email: 'user@email.com' }).lean();
        if (!existente) {
          const bcrypt = require('bcryptjs');
          const senhaHash = await bcrypt.hash('user', 10);
          await User.create({ nome: 'Usuário Demo', email: 'user@email.com', senhaHash, roles: ['user'] });
        }
      }
    } catch (seedErr) {
      logger.error({ err: seedErr }, 'Falha ao criar usuário padrão');
    }
    try { await mongoose.connection.db.admin().ping(); } catch(e){ logger.debug({ err:e }, 'Ping Mongo falhou (ignorado)'); }
  }).catch(err => {
    logger.error({ err }, 'Falha ao conectar MongoDB (verifique string e IP allowlist). Continuando em modo LEADS-ONLY.');
  });
}

function maskMongo(url) {
  try {
    const u = new URL(url.replace('mongodb+srv://','https://').replace('mongodb://','http://'));
    const auth = u.username ? (u.username + (u.password ? ':***' : '')) : '';
    return `${u.protocol.startsWith('https') ? 'mongodb+srv:' : 'mongodb:'}//${auth ? auth + '@' : ''}${u.host}${u.pathname}`;
  } catch { return '***'; }
}

// (Conexão Mongo movida acima, condicionada a NO_DB_MODE)
const pkg = require('./package.json');

app.use(requestLogger);
app.use(cookieParser());
// Servir estáticos SEM index automático para não sobrescrever a rota de login '/'
app.use(express.static(path.join(__dirname, 'public'), { index: false }));

app.use(express.json({ limit: "1mb" }));
app.use(authOptional);

const authRoutes = require('./routes/authRoutes');
app.use('/api/auth', authRoutes);
const clienteRoutes = require("./routes/clienteRoutes");
// Rota pública apenas para criação de lead via chatbot (POST)
const clienteController = require('./controllers/clienteController');
app.post('/api/clientes', async (req, res) => {
  logger.info({
    bodyKeys: Object.keys(req.body||{}),
    anon: !req.user,
    hasArray: Array.isArray(req.body),
    length: Array.isArray(req.body) ? req.body.length : 1,
    sample: Array.isArray(req.body) ? req.body[0] : req.body
  }, 'POST público /api/clientes recebido');
  return clienteController.adicionar(req, res);
});

// Endpoint de debug (pode ser protegido depois) para inspecionar últimos leads rapidamente
app.get('/api/clientes/_debug/ultimos', async (req, res) => {
  return clienteController.ultimos(req, res);
});

function maybeRequireAuth(req, res, next) {
  if (NO_DB_MODE) return next();
  return requireAuth(req, res, next);
}

// Demais operações protegidas (ou liberadas em modo sem DB)
app.use("/api/clientes", maybeRequireAuth, clienteRoutes);

app.get('/api/meta/version', (req, res) => {
  res.json({ version: pkg.version });
});

// Raiz SEMPRE mostra login agora; app real vai para /app
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'html', 'login.html'));
});

// App principal protegido (direto, sem tela intermediária)
app.get('/app', (req, res) => {
  if (!req.user) return res.redirect('/');
  res.sendFile(path.join(__dirname, 'public', 'html', 'index.html'));
});

app.get('/chatbot', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'html', 'chatbot.html'));
});

app.get('/clientes', (req, res) => {
  if (!req.user) return res.redirect('/');
  res.sendFile(path.join(__dirname, 'public', 'html', 'clientes.html'));
});

app.get('/consultores', (req, res) => {
  if (!req.user) return res.redirect('/');
  res.sendFile(path.join(__dirname, 'public', 'html', 'consultores.html'));
});

app.get('/perfil', (req, res) => {
  if (!req.user) return res.redirect('/');
  res.sendFile(path.join(__dirname, 'public', 'html', 'perfil.html'));
});

app.get('/sobre', (req, res) => {
  if (!req.user) return res.redirect('/');
  res.sendFile(path.join(__dirname, 'public', 'html', 'sobre.html'));
});

app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ message: "Rota não encontrada" });
  res.status(404).send('Página não encontrada');
});

app.use(errorHandler);

module.exports = app;

