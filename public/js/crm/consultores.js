export const CONSULTOR_LIST = [
  { nome: 'João', email: 'joao@empresa.com', telefone: '(11) 99999-1111', cidade: 'São Paulo', especialidade: 'Máquina A' },
  { nome: 'Maria', email: 'maria@empresa.com', telefone: '(21) 98888-2222', cidade: 'Rio de Janeiro', especialidade: 'Máquina B' },
  { nome: 'Pedro', email: 'pedro@empresa.com', telefone: '(31) 97777-3333', cidade: 'Belo Horizonte', especialidade: 'Máquina C' },
  { nome: 'Ana', email: 'ana@empresa.com', telefone: '(41) 96666-4444', cidade: 'Curitiba', especialidade: 'Máquina A' }
];

export const MAQUINAS = ['Máquina A','Máquina B','Máquina C'];

export function adicionarConsultor(data){
  const espec = data.especialidade && MAQUINAS.includes(data.especialidade) ? data.especialidade : MAQUINAS[Math.floor(Math.random()*MAQUINAS.length)];
  CONSULTOR_LIST.push({
    nome: data.nome?.trim() || 'Sem Nome',
    email: data.email?.trim() || '',
    telefone: data.telefone?.trim() || '',
    cidade: data.cidade?.trim() || '',
    especialidade: espec
  });
}

export function renderConsultores(container, opts = {}) {
  const termo = (opts.termo || '').toLowerCase();
  const campo = opts.campo || 'nome';
  const selecionado = (opts.consultorAtivo || '').toLowerCase();
  const filtrados = CONSULTOR_LIST.filter(c => {
    if (!termo) return true;
    const alvo = (c[campo] || '').toLowerCase();
    return alvo.includes(termo);
  });
  const listEl = document.createElement('ul');
  listEl.className = 'consultores-list-inner';
  listEl.setAttribute('role', 'list');
  container.innerHTML = '';

  filtrados.forEach(c => {
    const card = document.createElement('li');
    const isSelecionado = selecionado && (c.nome || '').toLowerCase() === selecionado;
    card.className = 'consultor-card collapsed';
  card.setAttribute('tabindex','0');
  card.setAttribute('role','button');
  card.setAttribute('aria-expanded','false');
    if (isSelecionado) {
      card.classList.add('selected');
    }

    card.innerHTML = `
      <div class="consultor-content">
        <div class="consultor-head">
          <strong class="consultor-nome">${c.nome}</strong>
          <span class="consultor-cidade"><i class="fa-solid fa-location-dot"></i> ${c.cidade}</span>
          <span class="consultor-especialidade badge-especialidade" title="Especialidade">${c.especialidade || '—'}</span>
          <span class="consultor-toggle-indicator" aria-hidden="true">+</span>
        </div>
        <div class="consultor-extra" role="region" aria-label="Detalhes do consultor" aria-hidden="true">
          <span class="consultor-detail"><i class="fa-solid fa-envelope"></i> ${c.email || '—'}</span>
          <span class="consultor-detail"><i class="fa-solid fa-phone"></i> ${c.telefone || '—'}</span>
          <span class="consultor-detail"><i class="fa-solid fa-map-marker-alt"></i> ${c.cidade || '—'}</span>
          <span class="consultor-detail"><i class="fa-solid fa-gears"></i> ${c.especialidade || '—'}</span>
        </div>
      </div>`;

    const extra = card.querySelector('.consultor-extra');
    const indicator = card.querySelector('.consultor-toggle-indicator');

    function aplicarEstado(expanded) {
      card.classList.toggle('expanded', expanded);
      card.classList.toggle('collapsed', !expanded);
      card.setAttribute('aria-expanded', expanded ? 'true' : 'false');
      indicator.textContent = expanded ? '−' : '+';
      if (extra) {
        extra.setAttribute('aria-hidden', expanded ? 'false' : 'true');
      }
    }
    function toggle(force) {
      const expanded = force !== undefined ? !!force : !card.classList.contains('expanded');
      aplicarEstado(expanded);
    }

    card.addEventListener('click', e => {
      if (e.target.closest('button, a')) return;
      toggle();
    });
    card.addEventListener('keypress', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } });

    const actions = document.createElement('div');
    actions.className = 'consultor-actions';
    actions.innerHTML = `<button type="button" class="btn btn-primary consultor-list-btn"><i class="fa-solid fa-list"></i> Listar Clientes</button>`;
    card.appendChild(actions);
    const listBtn = actions.querySelector('.consultor-list-btn');
    listBtn.addEventListener('click', e => {
      e.stopPropagation();
      toggle(true);
      if (typeof opts.onListClientes === 'function') {
        opts.onListClientes(c);
      }
    });

    if (extra) extra.setAttribute('aria-hidden', 'true');
    if (isSelecionado) aplicarEstado(true);

    listEl.appendChild(card);
  });
  if (filtrados.length === 0) {
    const vazio = document.createElement('div');
    vazio.className = 'consultores-empty';
    vazio.textContent = 'Nenhum consultor encontrado.';
    container.appendChild(vazio);
  } else {
    container.appendChild(listEl);
  }
}

export function initConsultoresSearch(container, renderLista) {
  const toggleBtn = document.getElementById('consultores-search-toggle');
  const panel = document.getElementById('consultores-search-panel');
  const input = document.getElementById('consultores-search-input');
  const fieldSelect = document.getElementById('consultores-search-field');
  const clearBtn = document.getElementById('consultores-search-clear');
  if (!toggleBtn || !panel || !input || !fieldSelect) return;

  // Forçar estado inicial oculto (independente de histórico de navegação)
  panel.hidden = true;
  panel.style.display = 'none';
  toggleBtn.setAttribute('aria-expanded','false');

  function aplicar() {
    if (typeof renderLista === 'function') {
      renderLista({ termo: input.value.trim(), campo: fieldSelect.value });
    } else {
      renderConsultores(container, { termo: input.value.trim(), campo: fieldSelect.value });
    }
  }
  function openPanel() {
    panel.hidden = false;
    panel.style.display = '';
    toggleBtn.setAttribute('aria-expanded','true');
    requestAnimationFrame(()=> input.focus());
  }
  function closePanel(focusToggle=false) {
    panel.hidden = true;
    panel.style.display = 'none';
    toggleBtn.setAttribute('aria-expanded','false');
    if (focusToggle) toggleBtn.focus();
  }
  toggleBtn.onclick = () => {
    const expanded = toggleBtn.getAttribute('aria-expanded') === 'true';
    if (expanded) closePanel(true); else openPanel();
  };
  input.addEventListener('input', () => aplicar());
  fieldSelect.addEventListener('change', () => aplicar());
  clearBtn.addEventListener('click', () => {
    input.value='';
    if (typeof renderLista === 'function') {
      renderLista({ termo:'', campo: fieldSelect.value });
    } else {
      aplicar();
    }
    closePanel(true);
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      if (toggleBtn.getAttribute('aria-expanded') === 'true') closePanel(true);
    }
  });
  document.addEventListener('click', e => {
    if (panel.hidden) return;
    if (panel.contains(e.target)) return;
    if (e.target === toggleBtn || toggleBtn.contains(e.target)) return;
    closePanel();
  });
}
