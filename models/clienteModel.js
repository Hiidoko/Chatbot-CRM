const { selecionarConsultor } = require('./consultorModel');
const { normalizeCliente } = require('../utils/normalizer');
const { FileClienteRepository } = require('../repositories/clienteRepository');
const { logger } = require('../utils/logger');
let MongoClienteRepository;
try {
  ({ MongoClienteRepository } = require('../repositories/clienteRepositoryMongo'));
} catch (err) {
  logger.debug({ err: err?.message }, 'MongoClienteRepository indisponível, usando storage file');
}

const STORAGE = (process.env.CLIENTES_STORAGE || 'file').toLowerCase();
const dataFile = process.env.CLIENTES_DATA_FILE || 'clientes.json';
let repo;
if (STORAGE === 'mongo' && MongoClienteRepository) {
  repo = new MongoClienteRepository();
  logger.info({ storage: 'mongo' }, 'Usando MongoClienteRepository para clientes');
} else {
  repo = new FileClienteRepository(dataFile);
  logger.info({ storage: 'file', file: dataFile }, 'Usando FileClienteRepository para clientes');
}

function gerarId() { return Date.now() + Math.floor(Math.random() * 10000); }

function prepararNovo(c) {
  const norm = normalizeCliente(c);
  norm.consultor = norm.consultor || selecionarConsultor(norm.cidade);
  norm.status = norm.status || 'novo';
  norm.origem = norm.origem || 'manual';
  norm.dataCadastro = new Date().toISOString();
  norm.id = gerarId();
  return norm;
}

async function listar() {
  return await repo.getAll();
}

async function adicionarLote(novos = []) {
  const preparados = novos.map(prepararNovo);
  await repo.addMany(preparados);
  logger.debug({ count: preparados.length }, 'adicionarLote concluído');
  return preparados; // retorna lista criada para que controller envie IDs ao frontend
}

async function atualizar(id, dados) {
  const todos = await repo.getAll();
  const atual = todos.find(c => c.id === id);
  if (!atual) return false;
  const norm = normalizeCliente({ ...atual, ...dados });
  norm.status = norm.status || atual.status || 'novo';
  norm.dataCadastro = atual.dataCadastro;
  norm.id = id;
  const ok = await repo.update(id, norm);
  if (!ok) logger.warn({ id }, 'atualizar falhou - não encontrado');
  return ok;
}

async function remover(id) {
  const ok = await repo.delete(id);
  if (!ok) logger.warn({ id }, 'remover falhou - não encontrado');
  return ok;
}

async function obter(id) {
  const todos = await repo.getAll();
  return todos.find(c => c.id === id) || null;
}

/**
 * Busca paginada/filtrada em memória.
 * @param {Object} params
 * @param {number} params.page
 * @param {number} params.pageSize
 * @param {string} params.sort ex: "nome:asc" | "dataCadastro:desc"
 * @param {Object} params.filters { status, cidade, maquina, consultor, texto }
 */
async function buscar(params = {}) {
  const { page=1, pageSize=25, sort='dataCadastro:desc', filters={} } = params;
  const { status, cidade, maquina, consultor, texto } = filters;
  let lista = await repo.getAll();

  function norm(v){ return (v||'').toString().toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu,''); }

  if (texto) {
    const q = norm(texto);
  const campos = ['nome','email','telefone','cidade','maquina','consultor','notas'];
    lista = lista.filter(item => campos.some(c => item[c] && norm(item[c]).includes(q)));
  }
  if (status) { const cmp = norm(status); lista = lista.filter(i => i.status && norm(i.status) === cmp); }
  if (cidade) { const cmp = norm(cidade); lista = lista.filter(i => i.cidade && norm(i.cidade) === cmp); }
  if (maquina) { const cmp = norm(maquina); lista = lista.filter(i => i.maquina && norm(i.maquina) === cmp); }
  if (consultor) { const cmp = norm(consultor); lista = lista.filter(i => i.consultor && norm(i.consultor) === cmp); }

  // Ordenação
  const [fieldRaw, dirRaw] = String(sort||'').split(':');
  const field = fieldRaw || 'dataCadastro';
  const dir = (dirRaw || 'desc').toLowerCase() === 'asc' ? 1 : -1;
  const allowedSort = new Set(['dataCadastro','nome','status','consultor','cidade','maquina']);
  if (allowedSort.has(field)) {
    lista = [...lista].sort((a,b) => {
      const va = a[field] || '';
      const vb = b[field] || '';
      if (field === 'dataCadastro') return (new Date(va) - new Date(vb)) * dir;
      return String(va).localeCompare(String(vb), 'pt-BR') * dir;
    });
  }

  const total = lista.length;
  const size = Math.max(1, Math.min(200, parseInt(pageSize,10) || 25));
  const totalPages = Math.max(1, Math.ceil(total / size));
  const current = Math.min(Math.max(1, parseInt(page,10) || 1), totalPages);
  const start = (current - 1) * size;
  const slice = lista.slice(start, start + size);

  return {
    items: slice,
    total,
    page: current,
    pageSize: size,
    totalPages,
    sort: `${field}:${dir===1?'asc':'desc'}`,
    filters: { status, cidade, maquina, consultor, texto }
  };
}

module.exports = { listar, adicionarLote, atualizar, remover, obter, buscar };

