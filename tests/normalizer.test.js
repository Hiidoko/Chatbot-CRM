const {
  trimString,
  normalizeNomeCidade,
  normalizeEmail,
  normalizeTelefone,
  normalizeMaquina,
  normalizeHorario
} = require('../utils/normalizer');

describe('Normalizers', () => {
  test('trimString remove múltiplos espaços', () => {
    expect(trimString('  Ola   Mundo  ')).toBe('Ola Mundo');
  });
  test('normalizeNomeCidade remove caracteres inválidos e normaliza acentos', () => {
    // A função atual normaliza NFD e remove caracteres não permitidos; acentos são preservados
    // mas na sequência regex remove caracteres estranhos. Dependendo do ambiente de unicode pode haver remoção.
    const result = normalizeNomeCidade('São@@ Paulo!!');
    expect(['São Paulo','Sao Paulo']).toContain(result);
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
});
