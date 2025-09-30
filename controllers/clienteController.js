const { listar, adicionarLote, atualizar, remover } = require('../models/clienteModel');
const { validateCliente, validateClienteParcial, pickAllowed } = require('../validators/clienteValidator');

function parseId(param) {
  const id = parseInt(param, 10);
  return Number.isNaN(id) ? null : id;
}

function validarLote(clientes = []) {
  const erros = [];
  const validos = [];
  clientes.forEach((c, idx) => {
    const { valid, errors, value } = validateCliente(c || {});
    if (!valid) erros.push({ index: idx, errors }); else validos.push(value);
  });
  return { erros, validos };
}

module.exports = {
  listar(req, res) {
    return res.json(listar());
  },
  adicionar(req, res) {
    if (!Array.isArray(req.body)) {
      return res.status(400).json({ message: 'Formato inválido: esperado array de clientes.' });
    }
    const { erros, validos } = validarLote(req.body);
    if (erros.length) {
      return res.status(422).json({ message: 'Erros de validação em um ou mais clientes.', detalhes: erros });
    }
    adicionarLote(validos);
    return res.status(201).json({ message: 'Clientes adicionados com sucesso', total: validos.length });
  },
  atualizar(req, res) {
    const id = parseId(req.params.id);
    if (id == null) return res.status(400).json({ message: 'ID inválido' });
    const payload = pickAllowed(req.body || {});
    const { valid, errors, value } = validateClienteParcial(payload);
    if (!valid) return res.status(422).json({ message: 'Erros de validação', errors });
    const ok = atualizar(id, value);
    if (!ok) return res.status(404).json({ message: 'Cliente não encontrado' });
    return res.json({ message: 'Cliente atualizado com sucesso' });
  },
  remover(req, res) {
    const id = parseId(req.params.id);
    if (id == null) return res.status(400).json({ message: 'ID inválido' });
    const ok = remover(id);
    if (!ok) return res.status(404).json({ message: 'Cliente não encontrado' });
    return res.json({ message: 'Cliente excluído com sucesso' });
  }
};