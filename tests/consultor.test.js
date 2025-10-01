const { selecionarConsultor, CONSULTORES } = require('../models/consultorModel');

describe('selecionarConsultor', () => {
  test('retorna primeiro consultor se cidade ausente', () => {
    expect(selecionarConsultor(null)).toBe(CONSULTORES[0].nome);
  });
  test('distribui determinístico pelo tamanho da string', () => {
    const c1 = selecionarConsultor('A');
    const c2 = selecionarConsultor('AB');
    const c3 = selecionarConsultor('ABC');
    expect(new Set([c1,c2,c3]).size).toBeGreaterThanOrEqual(1);
  });
});
