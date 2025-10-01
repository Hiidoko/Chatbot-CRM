const { listar, adicionarLote, atualizar, remover, obter, buscar } = require('../models/clienteModel');
const { validateCliente, validateClienteParcial, pickAllowed } = require('../validators/clienteValidator');

function parseId(param) {
  const id = parseInt(param, 10);
  return Number.isNaN(id) ? null : id;
}

function validarLote(clientes = []) {
  const erros = [];
  const validos = [];
  clientes.forEach((c, idx) => {
    const base = { ...(c||{}) };
    if (!base.status) base.status = 'novo';
    const { valid, errors, value } = validateCliente(base);
    if (!valid) erros.push({ index: idx, errors }); else validos.push(value);
  });
  return { erros, validos };
}

module.exports = {
  async listar(req, res) {
    // Query: pagina, pageSize, sort, status, cidade, maquina, consultor, texto
    const { pagina, pageSize, sort, status, cidade, maquina, consultor, texto } = req.query;
    const data = await buscar({
      page: pagina,
      pageSize,
      sort,
      filters: { status, cidade, maquina, consultor, texto }
    });
    return res.json({
      data: data.items,
      page: data.page,
      pageSize: data.pageSize,
      total: data.total,
      totalPages: data.totalPages,
      sort: data.sort,
      filters: data.filters
    });
  },
  async obter(req, res) {
    const id = parseId(req.params.id);
    if (id == null) return res.status(400).json({ message: 'ID inválido' });
    const cli = await obter(id);
    if (!cli) return res.status(404).json({ message: 'Cliente não encontrado' });
    return res.json(cli);
  },
  async adicionar(req, res) {
    const body = req.body;
    let payloadArray = [];
    if (Array.isArray(body)) {
      payloadArray = body;
    } else if (body && typeof body === 'object') {
      payloadArray = [body];
    } else {
      return res.status(400).json({ message: 'Formato inválido: esperado objeto ou array.' });
    }
    const { erros, validos } = validarLote(payloadArray);
    if (erros.length) return res.status(422).json({ message: 'Erros de validação em um ou mais clientes.', detalhes: erros });
    await adicionarLote(validos);
    return res.status(201).json({ message: 'Clientes adicionados com sucesso', total: validos.length });
  },
  async atualizar(req, res) {
    const id = parseId(req.params.id);
    if (id == null) return res.status(400).json({ message: 'ID inválido' });
    const payload = pickAllowed(req.body || {});
    const { valid, errors, value } = validateClienteParcial(payload);
    if (!valid) return res.status(422).json({ message: 'Erros de validação', errors });
    const ok = await atualizar(id, value);
    if (!ok) return res.status(404).json({ message: 'Cliente não encontrado' });
    return res.json({ message: 'Cliente atualizado com sucesso' });
  },
  async remover(req, res) {
    const id = parseId(req.params.id);
    if (id == null) return res.status(400).json({ message: 'ID inválido' });
    const ok = await remover(id);
    if (!ok) return res.status(404).json({ message: 'Cliente não encontrado' });
    return res.json({ message: 'Cliente excluído com sucesso' });
  },
  async patch(req, res) {
    const id = parseId(req.params.id);
    if (id == null) return res.status(400).json({ message: 'ID inválido' });
    const payload = pickAllowed(req.body || {});
    if (!Object.keys(payload).length) return res.status(400).json({ message: 'Payload vazio.' });
    const { valid, errors, value } = validateClienteParcial(payload);
    if (!valid) return res.status(422).json({ message: 'Erros de validação', errors });
    const ok = await atualizar(id, value);
    if (!ok) return res.status(404).json({ message: 'Cliente não encontrado' });
    return res.json({ message: 'Cliente atualizado (parcial) com sucesso' });
  },
  async head(req, res) {
    const all = await listar();
    res.set('X-Total-Count', String(all.length));
    return res.status(200).end();
  },
  async options(req, res) {
    res.set('Allow', 'GET,POST,PUT,PATCH,DELETE,HEAD,OPTIONS');
    return res.status(204).end();
  }
};
