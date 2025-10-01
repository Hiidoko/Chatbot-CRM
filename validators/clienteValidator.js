// Wrapper mantendo API anterior utilizando schema unificado.
const { clienteSchema } = require('./schema/clienteSchema');
const { validateWithSchema } = require('./schemaValidator');

const ALLOWED_FIELDS = Object.freeze(Object.keys(clienteSchema.properties));

function validateCliente(data) { return validateWithSchema(clienteSchema, data, { partial: false }); }
function validateClienteParcial(data) { return validateWithSchema(clienteSchema, data, { partial: true }); }
function pickAllowed(data) { const out = {}; for (const f of ALLOWED_FIELDS) if (data && data[f] !== undefined) out[f] = data[f]; return out; }

module.exports = { validateCliente, validateClienteParcial, pickAllowed, clienteSchema };

