const request = require('supertest');

// Definir arquivo de dados isolado antes de carregar app/model
process.env.CLIENTES_DATA_FILE = 'clientes.test.json';

const app = require('../server');
const fs = require('fs');

function cleanup() {
  if (fs.existsSync('clientes.test.json')) fs.unlinkSync('clientes.test.json');
}

describe('API /api/clientes integração', () => {
  afterAll(() => cleanup());
  afterEach(() => cleanup());

  test('fluxo completo adicionar -> listar -> atualizar -> remover', async () => {
    // Adicionar
    const novo = [{
      nome: 'Teste User',
      email: 'teste@exemplo.com',
      telefone: '11988887777',
      cidade: 'Campinas',
      maquina: 'Máquina A',
      horario: 'Manhã',
      status: 'novo'
    }];
    const postRes = await request(app).post('/api/clientes').send(novo).expect(201);
    expect(postRes.body.total).toBe(1);

    // Listar paginado
    const listRes = await request(app).get('/api/clientes?pageSize=10').expect(200);
    expect(listRes.body.data.length).toBe(1);
    const id = listRes.body.data[0].id;
    expect(id).toBeDefined();

    // Atualizar parcial (PATCH)
    await request(app).patch(`/api/clientes/${id}`).send({ status: 'contatado' }).expect(200);
    const getRes = await request(app).get(`/api/clientes/${id}`).expect(200);
    expect(getRes.body.status).toBe('contatado');

    // Remover
    await request(app).delete(`/api/clientes/${id}`).expect(200);
    await request(app).get(`/api/clientes/${id}`).expect(404);
  });

  test('adicionar cliente sem status e sem origem define defaults (status=novo, origem=manual)', async () => {
    const semStatus = [{
      nome: 'Lead Sem Status',
      email: 'lead@exemplo.com',
      telefone: '11977776666',
      cidade: 'Sorocaba',
      maquina: 'Máquina B',
      horario: 'Tarde'
    }];
    const postRes = await request(app).post('/api/clientes').send(semStatus).expect(201);
    expect(postRes.body.total).toBe(1);
    const listRes = await request(app).get('/api/clientes?pageSize=10').expect(200);
    const c = listRes.body.data.find(x => x.nome === 'Lead Sem Status');
    expect(c).toBeDefined();
    expect(c.status).toBe('novo');
    expect(c.origem).toBe('manual');
  });
});
