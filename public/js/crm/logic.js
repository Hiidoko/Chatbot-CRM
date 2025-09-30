import { salvar, carregar } from './storage.js';

export class CRM {
  constructor() {
    this.clientes = carregar();
  }

  listar() { return this.clientes; }

  // Filtro simples em memória. Caso futuro: substituir por chamada à API.
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

  adicionar(cliente) {
    cliente.id = Date.now() + Math.floor(Math.random() * 10000);
    cliente.dataCadastro = new Date().toISOString();
    this.clientes.push(cliente);
    salvar(this.clientes);
    return cliente.id;
  }

  atualizar(id, dados) {
    const idx = this.clientes.findIndex(c => c.id === id);
    if (idx === -1) return false;
    this.clientes[idx] = { ...this.clientes[idx], ...dados, id, dataCadastro: this.clientes[idx].dataCadastro };
    salvar(this.clientes);
    return true;
  }

  remover(id) {
    this.clientes = this.clientes.filter(c => c.id !== id);
    salvar(this.clientes);
  }

  obter(id) { return this.clientes.find(c => c.id === id); }
}

// ----- Suporte a busca -----
const CAMPOS_BUSCA = ['nome', 'email', 'telefone', 'cidade', 'maquina', 'consultor'];
function removerAcentos(str) {
  return str.normalize('NFD').replace(/\p{Diacritic}/gu, '');
}
