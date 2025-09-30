const fs = require('fs');
const { selecionarConsultor } = require('./consultorModel');
const { normalizeCliente } = require('../utils/normalizer');

const DATA_FILE = 'clientes.json';
let clientes = [];

function carregar() {
  try {
    if (!fs.existsSync(DATA_FILE)) return;
    clientes = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')) || [];
  } catch (e) {
    console.warn('Falha ao carregar clientes (seguindo com memória volátil):', e.message);
    clientes = [];
  }
}

function salvar() {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(clientes, null, 2));
  } catch (e) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('Não foi possível persistir clientes no arquivo:', e.message);
    }
  }
}

function gerarId() { return Date.now() + Math.floor(Math.random() * 10000); }

function prepararNovo(c) {
  const norm = normalizeCliente(c);
  norm.consultor = selecionarConsultor(norm.cidade);
  norm.status = norm.status || 'novo';
  norm.dataCadastro = new Date().toISOString();
  norm.id = gerarId();
  return norm;
}

carregar();

function listar() { return clientes; }

function adicionarLote(novos = []) {
  for (const raw of novos) clientes.push(prepararNovo(raw));
  salvar();
  return true;
}

function atualizar(id, dados) {
  const idx = clientes.findIndex(c => c.id === id);
  if (idx === -1) return false;
  const norm = normalizeCliente({ ...clientes[idx], ...dados });
  norm.status = norm.status || clientes[idx].status || 'novo';
  clientes[idx] = { ...clientes[idx], ...norm, id, dataCadastro: clientes[idx].dataCadastro };
  salvar();
  return true;
}

function remover(id) {
  const idx = clientes.findIndex(c => c.id === id);
  if (idx === -1) return false;
  clientes.splice(idx, 1);
  salvar();
  return true;
}

module.exports = { listar, adicionarLote, atualizar, remover };
