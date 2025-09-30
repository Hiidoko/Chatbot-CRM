const VIEW_CACHE = new Map();
const VIEW_MAP = {
  clientes: 'html/clientes.html',
  consultores: 'html/consultores.html',
  sobre: 'html/sobre.html'
};

export async function loadView(name) {
  const path = VIEW_MAP[name];
  if (!path) throw new Error('View não mapeada: ' + name);
  if (VIEW_CACHE.has(name)) return VIEW_CACHE.get(name);
  const resp = await fetch(path);
  if (!resp.ok) throw new Error('Falha ao carregar view: ' + name);
  const html = await resp.text();
  VIEW_CACHE.set(name, html);
  return html;
}

export async function swapView(name) {
  const root = document.getElementById('view-root');
  if (!root) return;
  root.classList.add('view-loading');
  try {
    const html = await loadView(name);
    root.innerHTML = html;
    root.classList.remove('view-loading');
    if (name === 'clientes' && window.initClientes) window.initClientes();
    if (name === 'consultores' && window.initConsultores) window.initConsultores();
    if (name === 'sobre' && window.initSobre) window.initSobre();
  } catch (e) {
    root.innerHTML = `<div style="padding:32px;color:#c62828;font-weight:600;">Erro ao carregar seção: ${name}</div>`;
    root.classList.remove('view-loading');
    console.error(e);
  }
}
