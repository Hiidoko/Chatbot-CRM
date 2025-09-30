const express = require("express");
const path = require("path");

const app = express();
const pkg = require('./package.json');

// Servir arquivos estáticos da pasta 'public'
app.use(express.static(path.join(__dirname, 'public')));

// Parser nativo do Express 5 (substitui body-parser)
app.use(express.json({ limit: "1mb" }));

const clienteRoutes = require("./routes/clienteRoutes");
app.use("/api/clientes", clienteRoutes);

app.get('/api/meta/version', (req, res) => {
  res.json({ version: pkg.version });
});

// Rotas para servir as páginas HTML
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'html', 'index.html'));
});

app.get('/chatbot', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'html', 'chatbot.html'));
});

app.get('/clientes', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'html', 'clientes.html'));
});

app.get('/consultores', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'html', 'consultores.html'));
});

app.get('/sobre', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'html', 'sobre.html'));
});

// 404 JSON apenas para rotas de API; para outras GETs podemos devolver um 404 simples
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ message: "Rota não encontrada" });
  }
  // Para outras rotas, envia o 404 do HTML ou apenas o status
  res.status(404).send('Página não encontrada');
});

// Fallback SPA opcional: se desejar que qualquer rota desconhecida (GET) carregue o index.html, descomente abaixo.
// app.get('*', (req, res) => {
//   res.sendFile(path.join(__dirname, 'public', 'html', 'index.html'));
// });

module.exports = app;

