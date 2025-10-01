/** @jest-environment jsdom */
const { renderClientes } = require('../public/js/crm/dom.cjs');

function mockCliente(overrides = {}) {
  return {
    id: 1,
    nome: 'Cliente Teste',
    email: 'cliente@teste.com',
    telefone: '(11) 99999-9999',
    cidade: 'São Paulo',
    maquina: 'Máquina A',
    horario: 'Manhã',
    status: 'novo',
    consultor: 'Consultor X',
    dataCadastro: new Date('2024-01-01').toISOString(),
    ...overrides
  };
}

describe('renderClientes (estrutura semântica)', () => {
  test('gera <ul><li> com atributos ARIA esperados', () => {
    const container = document.createElement('div');
    const clientes = [mockCliente({ id: 1 }), mockCliente({ id: 2, nome: 'Outro Cliente' })];
    const callbacks = { onEdit: jest.fn(), onDelete: jest.fn() };
    renderClientes(container, clientes, callbacks);
    const ul = container.querySelector('ul.cliente-list-ul');
    expect(ul).not.toBeNull();
    const itens = ul.querySelectorAll('li.cliente-card');
    expect(itens.length).toBe(2);
    expect(itens[0].getAttribute('role')).toBe('button');
    expect(itens[0].getAttribute('aria-expanded')).toBe('false');
    expect(itens[0].getAttribute('aria-pressed')).toBe('false');
    expect(container.innerHTML).toMatchSnapshot();
  });
});
