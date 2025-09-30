// Fonte única de dados de consultores no front-end
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

// Novo: cards colapsáveis - inicialmente mostram apenas nome & cidade; clique expande detalhes
export function renderConsultores(container, opts = {}) {
  const termo = (opts.termo || '').toLowerCase();
  const campo = opts.campo || 'nome';
  const selecionado = (opts.consultorAtivo || '').toLowerCase();
  const filtrados = CONSULTOR_LIST.filter(c => {
    if (!termo) return true;
    const alvo = (c[campo] || '').toLowerCase();
    return alvo.includes(termo);
  });
  container.innerHTML = '';
  filtrados.forEach(c => {
    const card = document.createElement('div');
    const isSelecionado = selecionado && (c.nome || '').toLowerCase() === selecionado;
    card.className = 'consultor-card collapsed';
    card.setAttribute('tabindex','0');
    card.setAttribute('role','button');
    card.setAttribute('aria-expanded','false');
    if (isSelecionado) {
      card.classList.add('selected');
    }

    card.innerHTML = `
      <div class="consultor-head">
        <strong class="consultor-nome">${c.nome}</strong>
        <span class="consultor-cidade"><i class="fa-solid fa-location-dot"></i> ${c.cidade}</span>
        <span class="consultor-especialidade badge-especialidade" title="Especialidade">${c.especialidade || '—'}</span>
        <span class="consultor-toggle-indicator" aria-hidden="true">+</span>
      </div>
      <div class="consultor-details" style="display:none;">
        <span><i class="fa-solid fa-envelope"></i> ${c.email}</span>
        <span><i class="fa-solid fa-phone"></i> ${c.telefone}</span>
        <span><i class="fa-solid fa-map-marker-alt"></i> ${c.cidade}</span>
        <span><i class="fa-solid fa-gears"></i> Especialidade: <strong>${c.especialidade || '—'}</strong></span>
      </div>`;

    const details = card.querySelector('.consultor-details');
    const indicator = card.querySelector('.consultor-toggle-indicator');

    function aplicarEstado(expanded) {
      card.classList.toggle('expanded', expanded);
      card.classList.toggle('collapsed', !expanded);
      details.style.display = expanded ? 'flex' : 'none';
      card.setAttribute('aria-expanded', expanded ? 'true' : 'false');
      indicator.textContent = expanded ? '−' : '+';
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

    if (isSelecionado) {
      aplicarEstado(true);
    }

    container.appendChild(card);
  });
  if (filtrados.length === 0) {
    const vazio = document.createElement('div');
    vazio.className = 'consultores-empty';
    vazio.textContent = 'Nenhum consultor encontrado.';
    container.appendChild(vazio);
  }
}

// Inicializa barra de busca (chamada após partial carregada)
export function initConsultoresSearch(container, renderLista) {
  const toggleBtn = document.getElementById('consultores-search-toggle');
  const panel = document.getElementById('consultores-search-panel');
  const input = document.getElementById('consultores-search-input');
  const fieldSelect = document.getElementById('consultores-search-field');
  const clearBtn = document.getElementById('consultores-search-clear');
  if (!toggleBtn || !panel || !input || !fieldSelect) return;

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
