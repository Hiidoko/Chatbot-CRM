const KEY = 'clientes';

export function salvar(clientes) {
  localStorage.setItem(KEY, JSON.stringify(clientes));
}

export function carregar() {
  const data = localStorage.getItem(KEY);
  return data ? JSON.parse(data) : [];
}
