export function renderClientes(container, clientes, callbacks) {
  container.innerHTML = '';
  clientes.forEach(cliente => {
  const card = document.createElement('div');
  card.className = 'cliente-card collapsed';
  card.setAttribute('tabindex','0');
  card.setAttribute('role','button');
  card.setAttribute('aria-expanded','false');
    card.dataset.status = (cliente.status || 'novo').toLowerCase();
    card.innerHTML = `
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
    // Indicador de toggle
    const indicator = document.createElement('span');
    indicator.className = 'cliente-toggle-indicator';
    indicator.textContent = '+';
    card.appendChild(indicator);

    function toggle() {
      const expanded = card.classList.toggle('expanded');
      card.classList.toggle('collapsed', !expanded);
      card.setAttribute('aria-expanded', expanded ? 'true' : 'false');
      indicator.textContent = expanded ? '−' : '+';
    }
    card.addEventListener('click', e => {
      if (e.target.closest('.cliente-actions')) return;
      if (e.target.closest('button')) return;
      toggle();
    });
    card.addEventListener('keypress', e => { if (e.key==='Enter' || e.key===' ') { e.preventDefault(); toggle(); } });

    container.appendChild(card);
  });

  container.querySelectorAll('.edit').forEach(btn => {
    btn.onclick = () => callbacks.onEdit(Number(btn.dataset.id));
  });
  container.querySelectorAll('.delete').forEach(btn => {
    btn.onclick = () => callbacks.onDelete(Number(btn.dataset.id));
  });
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
