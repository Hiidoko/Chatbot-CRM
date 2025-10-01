// Validador genérico baseado no schema declarativo.
const { trimString, normalizeNomeCidade, normalizeEmail, normalizeTelefone, normalizeMaquina, normalizeHorario } = require('../utils/normalizer');

const NORMALIZERS = {
  trimString,
  normalizeNomeCidade,
  normalizeEmail,
  normalizeTelefone,
  normalizeMaquina,
  normalizeHorario
};

function applyNormalizer(name, value) {
  const fn = NORMALIZERS[name];
  if (!fn) return typeof value === 'string' ? value.trim() : value;
  return fn(value);
}

function validateWithSchema(schema, input, { partial = false } = {}) {
  const data = input || {};
  const errors = [];
  const cleaned = {};
  const requiredList = schema.required || [];
  const props = schema.properties || {};

  // Passo 1: normalização
  Object.keys(props).forEach(key => {
    const def = props[key];
    const raw = data[key];
    cleaned[key] = applyNormalizer(def.normalizer, raw);
  });

  // Passo 2: campos obrigatórios (em modo full)
  if (!partial) {
    requiredList.forEach(field => {
      const def = props[field];
      const val = cleaned[field];
      if (val == null || String(val).trim() === '') {
        errors.push({ field, message: (def.messages && def.messages.required) || `Campo '${field}' é obrigatório.` });
      }
    });
  }

  // Passo 3: regras específicas
  Object.keys(props).forEach(field => {
    const def = props[field];
    let val = cleaned[field];
    if (val == null || val === '') return; // vazio já foi tratado em required
    if (def.type === 'string') {
      if (typeof val !== 'string') val = String(val || '');
      if (def.minLength && val.length < def.minLength) {
        errors.push({ field, message: (def.messages && def.messages.invalid) || `Valor inválido para '${field}'.` });
      }
      if (def.maxLength && val.length > def.maxLength) {
        cleaned[field] = val.slice(0, def.maxLength);
      }
      if (def.pattern) {
        const re = new RegExp(def.pattern);
        if (!re.test(val)) {
          errors.push({ field, message: (def.messages && (def.messages.pattern || def.messages.invalid)) || `Valor inválido para '${field}'.` });
        }
      }
      if (def.digits) {
        const digits = val.replace(/\D/g,'');
        if (def.lengths && !def.lengths.includes(digits.length)) {
            errors.push({ field, message: (def.messages && def.messages.invalid) || `Telefone inválido.` });
        }
        cleaned[field] = digits;
      }
      if (def.enum) {
        const low = val.toLowerCase();
        const match = def.enum.find(e => e.toLowerCase() === low);
        if (!match) {
          errors.push({ field, message: (def.messages && def.messages.enum) || `Valor inválido para '${field}'.` });
        } else {
          cleaned[field] = match.toLowerCase();
        }
      }
    }
  });

  return { valid: errors.length === 0, errors, value: cleaned };
}

module.exports = { validateWithSchema };
