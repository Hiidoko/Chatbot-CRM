import { salvar, carregar, limpar } from './storage.js';
import { fetchWithRetry } from '../shared/net.js';

const API_BASE = '/api/clientes';
const API_PAGE_SIZE = 200;

export class CRM {
  constructor() {
    this.clientes = carregar();
    this._lastSync = null;
  }

  listar() { return this.clientes; }

  obter(id) { return this.clientes.find(c => c.id === id); }

  setClientes(clientes = [], { persist = true } = {}) {
    this.clientes = Array.isArray(clientes) ? clientes.map(c => ({ ...c })) : [];
    if (persist) salvar(this.clientes);
  }

  _mergeCliente(cliente) {
    if (!cliente || typeof cliente !== 'object') return;
    const payload = { ...cliente };
    const clearOffline = payload.__offline === false;
    if (clearOffline) delete payload.__offline;
    const idx = this.clientes.findIndex(c => c.id === payload.id);
    if (idx === -1) {
      const novo = { ...payload };
      if (clearOffline) delete novo.__offline;
      this.clientes.push(novo);
    } else {
      const atualizado = { ...this.clientes[idx], ...payload, id: this.clientes[idx].id };
      if (clearOffline) delete atualizado.__offline;
      this.clientes[idx] = atualizado;
    }
    salvar(this.clientes);
  }

  async carregarRemoto({ force = false } = {}) {
    if (!force && this._lastSync && Date.now() - this._lastSync < 5000) {
      return this.clientes;
    }
    const offlinePendentes = this.clientes.filter(c => c?.__offline);
    const acumulado = [];
    let pagina = 1;
    let totalPaginas = 1;
    try {
      do {
        const params = new URLSearchParams({
          pagina: String(pagina),
          pageSize: String(API_PAGE_SIZE),
          sort: 'dataCadastro:desc'
        });
        const resposta = await fetchWithRetry(`${API_BASE}?${params.toString()}`, {
          credentials: 'include'
        });
        const itens = Array.isArray(resposta?.data) ? resposta.data : [];
        acumulado.push(...itens);
        totalPaginas = resposta?.totalPages ? Number(resposta.totalPages) : 1;
        pagina++;
      } while (pagina <= totalPaginas);
      let merged = acumulado;
      if (offlinePendentes.length) {
        const idsRemotos = new Set(merged.map(c => c.id));
        merged = [...merged];
        offlinePendentes.forEach(cli => {
          if (!idsRemotos.has(cli.id)) merged.push({ ...cli });
        });
      }
      this.setClientes(merged);
      this._lastSync = Date.now();
      return this.clientes;
    } catch (err) {
      if (err?.status === 401) {
        // Sessão expirada: limpa cache para evitar dados desatualizados
        limpar();
      }
      throw err;
    }
  }

  async adicionar(cliente) {
    const payload = { ...cliente };
    const resposta = await fetchWithRetry(API_BASE, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify(payload)
    });
    const criados = Array.isArray(resposta?.data) ? resposta.data : (resposta?.data ? [resposta.data] : []);
    if (!criados.length) throw new Error('Resposta inesperada ao criar cliente.');
    criados.forEach(cli => this._mergeCliente(cli));
    this._lastSync = Date.now();
    return criados[0];
  }

  adicionarOffline(cliente) {
    const base = { ...cliente };
    if (!base.id) base.id = Date.now() + Math.floor(Math.random() * 10000);
    if (!base.dataCadastro) base.dataCadastro = new Date().toISOString();
    base.__offline = true;
    base.origem = base.origem || 'offline';
    this._mergeCliente(base);
    return { ...base };
  }

  registrarRemoto(cliente) {
    if (!cliente || typeof cliente !== 'object') return;
    this._mergeCliente({ ...cliente, __offline: false });
    this._lastSync = Date.now();
  }

  async atualizar(id, dados) {
    await fetchWithRetry(`${API_BASE}/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify(dados)
    });
    const idx = this.clientes.findIndex(c => c.id === id);
    if (idx !== -1) {
      this.clientes[idx] = { ...this.clientes[idx], ...dados, id };
      salvar(this.clientes);
    } else {
      await this.carregarRemoto({ force: true });
    }
    this._lastSync = Date.now();
    return true;
  }

  atualizarOffline(id, dados) {
    const idx = this.clientes.findIndex(c => c.id === id);
    if (idx === -1) return false;
    this.clientes[idx] = { ...this.clientes[idx], ...dados, id };
    this.clientes[idx].__offline = true;
    salvar(this.clientes);
    return true;
  }

  async remover(id) {
    await fetchWithRetry(`${API_BASE}/${id}`, {
      method: 'DELETE',
      credentials: 'include'
    });
    const antes = this.clientes.length;
    this.clientes = this.clientes.filter(c => c.id !== id);
    if (this.clientes.length !== antes) salvar(this.clientes);
    this._lastSync = Date.now();
    return true;
  }

  removerOffline(id) {
    const antes = this.clientes.length;
    this.clientes = this.clientes.filter(c => c.id !== id);
    if (this.clientes.length !== antes) salvar(this.clientes);
    return antes !== this.clientes.length;
  }

  filtrar(query) {
    if (!query) return this.clientes;
    const q = removerAcentos(String(query).toLowerCase().trim());
    return this.clientes.filter(c => {
      return CAMPOS_BUSCA.some(campo => {
        const valor = c[campo];
        if (!valor) return false;
        return removerAcentos(String(valor).toLowerCase()).includes(q);
      });
    });
  }

  filterAdvanced({ texto, cidade, maquina, consultor, status }) {
    let base = this.filtrar(texto || '');
    if (cidade) {
      const cNorm = removerAcentos(cidade.toLowerCase());
      base = base.filter(item => item.cidade && removerAcentos(item.cidade.toLowerCase()) === cNorm);
    }
    if (maquina) {
      const mNorm = removerAcentos(maquina.toLowerCase());
      base = base.filter(item => item.maquina && removerAcentos(item.maquina.toLowerCase()) === mNorm);
    }
    if (consultor) {
      const consNorm = removerAcentos(consultor.toLowerCase());
      base = base.filter(item => item.consultor && removerAcentos(item.consultor.toLowerCase()) === consNorm);
    }
    if (status) {
      const st = removerAcentos(status.toLowerCase());
      base = base.filter(item => item.status && removerAcentos(item.status.toLowerCase()) === st);
    }
    return base;
  }

}

// ----- Suporte a busca -----
const CAMPOS_BUSCA = ['nome', 'email', 'telefone', 'cidade', 'maquina', 'consultor'];
function removerAcentos(str) {
  return str.normalize('NFD').replace(/\p{Diacritic}/gu, '');
}
