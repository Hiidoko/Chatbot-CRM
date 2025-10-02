const KEY = 'crm:clientes';

export function salvar(clientes) {
  try {
    localStorage.setItem(KEY, JSON.stringify(clientes));
  } catch (err) {
    console.warn('[CRM][storage] Falha ao salvar cache local de clientes:', err);
  }
}

export function carregar() {
  try {
    const data = localStorage.getItem(KEY);
    return data ? JSON.parse(data) : [];
  } catch (err) {
    console.warn('[CRM][storage] Falha ao carregar cache local de clientes:', err);
    return [];
  }
}

export function limpar() {
  try {
    localStorage.removeItem(KEY);
  } catch (err) {
    console.warn('[CRM][storage] Falha ao limpar cache local de clientes:', err);
  }
}
