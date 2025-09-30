const { normalizeCliente } = require('../utils/normalizer');

const EMAIL_REGEX = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i;
const NOME_CIDADE_REGEX = /^[A-Za-zÀ-ÿ'\-\s]{2,}$/;
const ALLOWED_FIELDS = Object.freeze([ 'nome','email','telefone','cidade','maquina','horario','status' ]);
const STATUS_VALUES = new Set(['novo','em andamento','contatado','convertido','perdido']);

const sanitize = v => (typeof v === 'string' ? v.trim() : '');
const onlyDigits = v => v.replace(/\D/g,'');

function validateSingle(input, { partial = false } = {}) {
  const data = normalizeCliente(input || {});
  const errors = [];
  const cleaned = {};

  if (!partial) {
    for (const f of ALLOWED_FIELDS) {
      const raw = data[f];
      if (raw == null || sanitize(String(raw)) === '') errors.push({ field: f, message: `Campo '${f}' é obrigatório.` });
    }
  }

  for (const key of Object.keys(data)) {
    if (!ALLOWED_FIELDS.includes(key)) continue;
    let value = sanitize(String(data[key]));
    switch (key) {
      case 'nome':
      case 'cidade':
        if (value && !NOME_CIDADE_REGEX.test(value)) errors.push({ field: key, message: `Valor inválido para '${key}'.` });
        break;
      case 'email':
        if (value && !EMAIL_REGEX.test(value)) errors.push({ field: key, message: 'E-mail inválido.' });
        break;
      case 'telefone':
        if (value) {
          const tel = onlyDigits(value);
          if (!(tel.length === 10 || tel.length === 11)) errors.push({ field: key, message: 'Telefone deve ter 10 ou 11 dígitos.' });
          value = tel;
        }
        break;
      case 'maquina':
      case 'horario':
        if (value.length < 2) errors.push({ field: key, message: `${key === 'maquina' ? 'Máquina' : 'Horário'} inválido.` });
        break;
      case 'status':
        if (value) {
          value = value.toLowerCase();
          if (!STATUS_VALUES.has(value)) errors.push({ field: key, message: 'Status inválido.' });
        }
        break;
    }
    cleaned[key] = value;
  }
  return { valid: errors.length === 0, errors, value: cleaned };
}

function validateCliente(data) { return validateSingle(data, { partial: false }); }
function validateClienteParcial(data) { return validateSingle(data, { partial: true }); }
function pickAllowed(data) { const out = {}; for (const f of ALLOWED_FIELDS) if (data && data[f] !== undefined) out[f] = data[f]; return out; }

module.exports = { validateCliente, validateClienteParcial, pickAllowed };
