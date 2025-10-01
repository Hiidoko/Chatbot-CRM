const { validateCliente, validateClienteParcial } = require('../validators/clienteValidator');

function baseCliente() {
  return {
    nome: 'João da Silva',
    email: 'joao@example.com',
    telefone: '11999999999',
    cidade: 'São Paulo',
    maquina: 'Máquina A',
    horario: 'Manhã',
    status: 'novo'
  };
}

describe('ClienteValidator (schema unificado)', () => {
  test('valida cliente completo OK', () => {
    const r = validateCliente(baseCliente());
    expect(r.valid).toBe(true);
    expect(r.errors).toHaveLength(0);
  });

  test('detecta email inválido', () => {
    const c = baseCliente();
    c.email = 'invalido@';
    const r = validateCliente(c);
    expect(r.valid).toBe(false);
    expect(r.errors.map(e=>e.field)).toContain('email');
    // Snapshot somente dos erros para reduzir fragilidade
    expect({ errors: r.errors }).toMatchSnapshot();
  });

  test('partial não exige campos ausentes', () => {
    const r = validateClienteParcial({ email: 'novo@mail.com' });
    expect(r.valid).toBe(true);
  });
});
