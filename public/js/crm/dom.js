export function renderClientes(container, clientes, callbacks) {
  // Criamos uma UL semântica para lista de clientes
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
    li.innerHTML = `
      <div class="cliente-info">
        <strong class="field field-nome" data-field="nome">${cliente.nome}</strong>
        <span class="field field-status" data-field="status"><i class="fa-solid fa-flag"></i> <strong class="status-badge status-${(cliente.status||'novo').replace(/\s+/g,'-')}">${cliente.status || 'novo'}</strong></span>
        <span class="field pill" data-field="email"><i class="fa-solid fa-envelope"></i> ${cliente.email}</span>
        <span class="field pill" data-field="telefone"><i class="fa-solid fa-phone"></i> ${cliente.telefone}</span>
        <span class="field pill" data-field="cidade"><i class="fa-solid fa-location-dot"></i> ${cliente.cidade}</span>
        <span class="field pill" data-field="maquina"><i class="fa-solid fa-gears"></i> ${cliente.maquina}</span>
        <span class="field pill" data-field="horario"><i class="fa-solid fa-clock"></i> ${cliente.horario}</span>
        <span class="field pill" data-field="consultor"><i class="fa-solid fa-user-tie"></i> ${cliente.consultor || 'Sem consultor'}</span>
        <span class="field meta" data-field="dataCadastro"><i class="fa-solid fa-calendar"></i> ${formatarData(cliente.dataCadastro)}</span>
      </div>
      <div class="cliente-actions">
        <button class="edit" data-id="${cliente.id}"><i class="fa-solid fa-pen-to-square"></i> Editar</button>
        <button class="delete" data-id="${cliente.id}"><i class="fa-solid fa-trash"></i> Excluir</button>
      </div>`;
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
    li.addEventListener('click', e => {
      if (e.target.closest('.cliente-actions')) return;
      if (e.target.closest('button')) return;
      toggle();
    });
    li.addEventListener('keypress', e => { if (e.key==='Enter' || e.key===' ') { e.preventDefault(); toggle(); } });
    ul.appendChild(li);
  });
  container.appendChild(ul);
  // binding dos botões
  container.querySelectorAll('.edit').forEach(btn => { btn.onclick = () => callbacks.onEdit(Number(btn.dataset.id)); });
  container.querySelectorAll('.delete').forEach(btn => { btn.onclick = () => callbacks.onDelete(Number(btn.dataset.id)); });
}

export function preencherModal(cliente, fields) {
  fields.nome.value = cliente.nome;
  fields.email.value = cliente.email;
  fields.telefone.value = cliente.telefone;
  fields.cidade.value = cliente.cidade;
  fields.maquina.value = cliente.maquina;
  fields.horario.value = cliente.horario;
  if (fields.status) fields.status.value = cliente.status || 'novo';
}

function formatarData(iso) {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('pt-BR', { day:'2-digit', month:'2-digit', year:'numeric' });
  } catch { return '—'; }
}
