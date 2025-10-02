function formatarData(iso) {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('pt-BR', { day:'2-digit', month:'2-digit', year:'numeric', timeZone:'UTC' });
  } catch { return '—'; }
}

function renderClientes(container, clientes, callbacks) {
  const ul = document.createElement('ul');
  ul.className = 'cliente-list-ul';
  ul.setAttribute('role','list');
  container.innerHTML = '';
  clientes.forEach(cliente => {
    const li = document.createElement('li');
    li.className = 'cliente-card collapsed';
    li.setAttribute('tabindex','0');
    li.setAttribute('role','button');
    li.setAttribute('aria-expanded','false');
    li.setAttribute('aria-pressed','false');
    li.dataset.status = (cliente.status || 'novo').toLowerCase();
    li.innerHTML = `\n      <div class="cliente-info">\n        <strong class="field field-nome" data-field="nome">${cliente.nome}</strong>\n        <span class="field field-status" data-field="status"><i class="fa-solid fa-flag"></i> <strong class="status-badge status-${(cliente.status||'novo').replace(/\s+/g,'-')}">${cliente.status || 'novo'}</strong></span>\n        <span class="field pill" data-field="email"><i class="fa-solid fa-envelope"></i> ${cliente.email}</span>\n        <span class="field pill" data-field="telefone"><i class="fa-solid fa-phone"></i> ${cliente.telefone}</span>\n        <span class="field pill" data-field="cidade"><i class="fa-solid fa-location-dot"></i> ${cliente.cidade}</span>\n        <span class="field pill" data-field="maquina"><i class="fa-solid fa-gears"></i> ${cliente.maquina}</span>\n        <span class="field pill" data-field="horario"><i class="fa-solid fa-clock"></i> ${cliente.horario}</span>\n        <span class="field pill" data-field="consultor"><i class="fa-solid fa-user-tie"></i> ${cliente.consultor || 'Sem consultor'}</span>\n        <span class="field meta" data-field="dataCadastro"><i class="fa-solid fa-calendar"></i> ${formatarData(cliente.dataCadastro)}</span>\n      </div>\n      <div class="cliente-actions">\n        <button class="edit" data-id="${cliente.id}"><i class="fa-solid fa-pen-to-square"></i> Editar</button>\n        <button class="delete" data-id="${cliente.id}"><i class="fa-solid fa-trash"></i> Excluir</button>\n      </div>`;
    const indicator = document.createElement('span');
    indicator.className = 'cliente-toggle-indicator';
    indicator.textContent = '+';
    li.appendChild(indicator);
    function toggle() {
      const expanded = li.classList.toggle('expanded');
      li.classList.toggle('collapsed', !expanded);
      li.setAttribute('aria-expanded', expanded ? 'true' : 'false');
      li.setAttribute('aria-pressed', expanded ? 'true' : 'false');
      indicator.textContent = expanded ? '−' : '+';
    }
    li.addEventListener('click', e => { if (!e.target.closest('.cliente-actions') && !e.target.closest('button')) toggle(); });
    li.addEventListener('keypress', e => { if (e.key==='Enter' || e.key===' ') { e.preventDefault(); toggle(); } });
    ul.appendChild(li);
  });
  container.appendChild(ul);
  container.querySelectorAll('.edit').forEach(btn => { btn.onclick = () => callbacks.onEdit(Number(btn.dataset.id)); });
  container.querySelectorAll('.delete').forEach(btn => { btn.onclick = () => callbacks.onDelete(Number(btn.dataset.id)); });
}

module.exports = { renderClientes };
