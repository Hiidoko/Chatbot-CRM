const CONSULTORES = Object.freeze([
  { nome: 'João', email: 'joao@empresa.com', telefone: '(11) 99999-1111', cidadeBase: 'São Paulo' },
  { nome: 'Maria', email: 'maria@empresa.com', telefone: '(21) 98888-2222', cidadeBase: 'Rio de Janeiro' },
  { nome: 'Pedro', email: 'pedro@empresa.com', telefone: '(31) 97777-3333', cidadeBase: 'Belo Horizonte' },
  { nome: 'Ana', email: 'ana@empresa.com', telefone: '(41) 96666-4444', cidadeBase: 'Curitiba' }
]);

function selecionarConsultor(cidade) {
  if (!cidade) return CONSULTORES[0].nome;
  const i = cidade.trim().length % CONSULTORES.length;
  return CONSULTORES[i].nome;
}

module.exports = { CONSULTORES, selecionarConsultor };
