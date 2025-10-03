const {
  trimString,
  normalizeNomeCidade,
  normalizeEmail,
  normalizeTelefone,
  normalizeMaquina,
  normalizeHorario,
  normalizeNotas
} = require('../utils/normalizer');

describe('Normalizers', () => {
  test('trimString remove múltiplos espaços', () => {
    expect(trimString('  Ola   Mundo  ')).toBe('Ola Mundo');
  });
  test('normalizeNomeCidade preserva acentos e remove caracteres inválidos', () => {
    const result = normalizeNomeCidade('São@@ Paulo!!');
    expect(result).toBe('São Paulo');
  });
  test('normalizeEmail lowercase & trim', () => {
    expect(normalizeEmail('  USER@Mail.Com ')).toBe('user@mail.com');
  });
  test('normalizeTelefone extrai dígitos', () => {
    expect(normalizeTelefone('(11) 98888-7777')).toBe('11988887777');
  });
  test('normalizeMaquina limita caracteres', () => {
    expect(normalizeMaquina('Máquina *X* 123')).toMatch(/Maquina X 123|Máquina X 123/);
  });
  test('normalizeHorario corta tamanho', () => {
    const long = 'a'.repeat(120);
    expect(normalizeHorario(long).length).toBeLessThanOrEqual(60);
  });
  test('normalizeNotas mantém quebras de linha e limita tamanho', () => {
    const long = ('Linha 1\nLinha 2\n').repeat(100);
    const result = normalizeNotas(long);
  expect(result.startsWith('Linha 1')).toBe(true);
    expect(result.includes('\n')).toBe(true);
    expect(result.length).toBeLessThanOrEqual(1000);
  });
});
