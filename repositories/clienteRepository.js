/**
 * Interface conceitual de repositório de Clientes.
 * Métodos esperados:
 *  - getAll(): Promise<Array<Cliente>>
 *  - addMany(arrayDeClientesNormalizados): Promise<boolean>
 *  - update(id, patchNormalizado): Promise<boolean>
 *  - delete(id): Promise<boolean>
 * A implementação padrão usa arquivo JSON e cache em memória.
 * Futuras implementações (SQLite/Postgres) devem manter assinatura.
 */

const fs = require('fs');
const fsp = require('fs/promises');

function ensureStatusHistory(cliente) {
  if (!cliente || typeof cliente !== 'object') return cliente;
  const dataCadastro = cliente.dataCadastro || new Date().toISOString();
  const statusAtual = cliente.status || 'novo';
  const origemAtual = cliente.origem || 'manual';
  let historico = Array.isArray(cliente.statusHistorico) ? cliente.statusHistorico.filter(Boolean) : [];
  if (!historico.length) {
    historico = [{
      status: statusAtual,
      alteradoEm: dataCadastro,
      origem: origemAtual,
      alteradoPor: cliente.statusHistorico?.[0]?.alteradoPor || null,
      observacao: (cliente.statusHistorico?.[0] && cliente.statusHistorico[0].observacao) || 'Cadastro inicial'
    }];
  } else {
    historico = historico.map(entry => ({
      status: entry?.status || statusAtual,
      alteradoEm: entry?.alteradoEm || dataCadastro,
      origem: entry?.origem || origemAtual,
      alteradoPor: entry?.alteradoPor || null,
      observacao: entry?.observacao || null
    })).sort((a, b) => new Date(a.alteradoEm || 0) - new Date(b.alteradoEm || 0));
  }
  return { ...cliente, statusHistorico: historico };
}

class FileLockQueue {
  constructor(){ this._chain = Promise.resolve(); }
  run(task){
    this._chain = this._chain.then(() => task()).catch(err => {
      // Loga e não quebra cadeia
      console.error('[ClienteRepository] Erro em operação:', err);
    });
    return this._chain;
  }
}

class FileClienteRepository {
  constructor(filePath){
    this.filePath = filePath || 'clientes.json';
    this.tmpPath = this.filePath + '.tmp';
    this._clientes = [];
    this._loaded = false;
    this._lock = new FileLockQueue();
  }

  async _ensureLoaded(){
    if (this._loaded) return;
    try {
      if (!fs.existsSync(this.filePath)) { this._clientes = []; this._loaded = true; return; }
      const raw = await fsp.readFile(this.filePath, 'utf8');
      const parsed = JSON.parse(raw || '[]');
      this._clientes = Array.isArray(parsed) ? parsed.map(ensureStatusHistory) : [];
    } catch (e) {
      console.warn('[ClienteRepository] Falha ao carregar arquivo, iniciando vazio:', e.message);
      this._clientes = [];
    } finally {
      this._loaded = true;
    }
  }

  async _persist(){
    const data = JSON.stringify(this._clientes, null, 2);
    // Escrita atômica simples: write tmp -> rename
    await fsp.writeFile(this.tmpPath, data, 'utf8');
    await fsp.rename(this.tmpPath, this.filePath);
  }

  async getAll(){
    await this._ensureLoaded();
    return this._clientes.map(ensureStatusHistory);
  }

  async addMany(list){
    if (!Array.isArray(list) || list.length === 0) return true; // nada a fazer
    await this._ensureLoaded();
    list.forEach(c => this._clientes.push(ensureStatusHistory(c)));
    await this._lock.run(() => this._persist());
    return true;
  }

  async update(id, patch){
    await this._ensureLoaded();
    const idx = this._clientes.findIndex(c => c.id === id);
    if (idx === -1) return false;
    this._clientes[idx] = ensureStatusHistory({ ...this._clientes[idx], ...patch, id: this._clientes[idx].id });
    await this._lock.run(() => this._persist());
    return true;
  }

  async delete(id){
    await this._ensureLoaded();
    const idx = this._clientes.findIndex(c => c.id === id);
    if (idx === -1) return false;
    this._clientes.splice(idx, 1);
    await this._lock.run(() => this._persist());
    return true;
  }
}

module.exports = { FileClienteRepository };
