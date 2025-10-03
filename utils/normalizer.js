const MAX_MAQUINA = 80;
const MAX_HORARIO = 60;
const MAX_NOTAS = 1000;

function trimString(v) {
  return typeof v === 'string' ? v.replace(/\s+/g, ' ').trim() : '';
}

function normalizeNomeCidade(v) {
  const base = trimString(v);
  if (!base) return '';
  return base
    .replace(/[^\p{L}\p{M}'\-\s]/gu, '')
    .replace(/\s{2,}/g, ' ');
}

function normalizeEmail(v) {
  return trimString(v).toLowerCase();
}

function normalizeTelefone(v) {
  return String(v || '').replace(/\D/g, '');
}

function normalizeMaquina(v) {
  return trimString(v).replace(/[^A-Za-z0-9À-ÿ\- _]/g, '').slice(0, MAX_MAQUINA);
}

function normalizeHorario(v) {
  return trimString(v).slice(0, MAX_HORARIO);
}

function normalizeNotas(v) {
  if (typeof v !== 'string') return '';
  const normalized = v.replace(/\r\n/g, '\n').trim().slice(0, MAX_NOTAS);
  return normalized;
}

function normalizeCliente(obj = {}) {
  return {
    nome: normalizeNomeCidade(obj.nome),
    email: normalizeEmail(obj.email),
    telefone: normalizeTelefone(obj.telefone),
    cidade: normalizeNomeCidade(obj.cidade),
    maquina: normalizeMaquina(obj.maquina),
    horario: normalizeHorario(obj.horario),
    status: trimString((obj.status || '').toLowerCase()),
    origem: trimString((obj.origem || '').toLowerCase()),
    consultor: trimString(obj.consultor || ''),
    notas: normalizeNotas(obj.notas),
    dataCadastro: obj.dataCadastro
  };
}

module.exports = {
  trimString,
  normalizeNomeCidade,
  normalizeEmail,
  normalizeTelefone,
  normalizeMaquina,
  normalizeHorario,
  normalizeNotas,
  normalizeCliente
};
