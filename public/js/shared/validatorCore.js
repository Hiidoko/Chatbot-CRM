// Núcleo de validação frontend usando schema gerado (import estático do build).
import { clienteSchema as clienteSchemaRaw } from './cliente-schema.js';

// Normalizadores replicados (mantidos simples e alinhados ao backend)
function trimString(v){ return typeof v === 'string' ? v.replace(/\s+/g,' ').trim() : ''; }
function normalizeNomeCidade(v){ return trimString(v).normalize('NFD').replace(/[^A-Za-zÀ-ÿ'\-\s]/g,'').replace(/\s{2,}/g,' '); }
function normalizeEmail(v){ return trimString(v).toLowerCase(); }
function normalizeTelefone(v){ return String(v||'').replace(/\D/g,''); }
function normalizeMaquina(v){ return trimString(v).replace(/[^A-Za-z0-9À-ÿ\- _]/g,'').slice(0,80); }
function normalizeHorario(v){ return trimString(v).slice(0,60); }

const NORMALIZERS = { trimString, normalizeNomeCidade, normalizeEmail, normalizeTelefone, normalizeMaquina, normalizeHorario };

export function validateCliente(data, { partial = false } = {}) {
  return validateWithSchema(clienteSchemaRaw, data, { partial });
}

export function validateWithSchema(schema, input, { partial = false } = {}) {
  const props = schema.properties || {};
  const required = schema.required || [];
  const cleaned = {};
  const errors = [];
  const src = input || {};

  Object.keys(props).forEach(k => {
    const def = props[k];
    const norm = NORMALIZERS[def.normalizer] || (v => (typeof v === 'string'? v.trim(): v));
    cleaned[k] = norm(src[k]);
  });

  if (!partial) {
    required.forEach(f => {
      if (!cleaned[f]) {
        const msg = props[f]?.messages?.required || `Campo '${f}' é obrigatório.`;
        errors.push({ field: f, message: msg });
      }
    });
  }

  Object.keys(props).forEach(f => {
    const def = props[f];
    let val = cleaned[f];
    if (!val) return; // vazio já tratado
    if (def.type === 'string') {
      if (def.minLength && val.length < def.minLength) {
        errors.push({ field: f, message: def.messages?.invalid || `Valor inválido para '${f}'.` });
      }
      if (def.pattern) {
        const re = new RegExp(def.pattern);
        if (!re.test(val)) {
          errors.push({ field: f, message: def.messages?.pattern || def.messages?.invalid || `Valor inválido para '${f}'.` });
        }
      }
      if (def.digits) {
        const digits = val.replace(/\D/g,'');
        if (def.lengths && !def.lengths.includes(digits.length)) {
          errors.push({ field: f, message: def.messages?.invalid || 'Telefone inválido.' });
        }
        cleaned[f] = digits;
      }
      if (def.enum) {
        const low = val.toLowerCase();
        const match = def.enum.find(e => e.toLowerCase() === low);
        if (!match) {
          errors.push({ field: f, message: def.messages?.enum || `Valor inválido para '${f}'.` });
        } else {
          cleaned[f] = match.toLowerCase();
        }
      }
    }
  });

  return { valid: errors.length === 0, errors, value: cleaned };
}

// Helpers para compat com antigas funções de chatbot
export function validarCampo(field, value){
  const o = { [field]: value };
  const { errors } = validateCliente(o, { partial: true });
  return !errors.some(e => e.field === field);
}

export function mensagemErro(field){
  const def = clienteSchemaRaw.properties?.[field];
  if (!def) return 'Valor inválido.';
  return def.messages?.invalid || def.messages?.required || 'Valor inválido.';
}
