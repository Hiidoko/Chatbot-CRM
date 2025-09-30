import { CRM } from './logic.js';
import { renderClientes, preencherModal } from './dom.js';
import { renderConsultores, adicionarConsultor, MAQUINAS, initConsultoresSearch, CONSULTOR_LIST } from './consultores.js';
import { validarCliente, exibirErrosModal, limparErros } from './validation.js';
import { validarCliente as validarClienteUnit } from './validation.js';
import { swapView } from '../viewLoader.js';

const crm = new CRM();

// Elements (shell estáticos + placeholders para views dinâmicas)
let clientesContainer = null;
let totalClientes = null;
let searchInput = null;
let filtroCidade = null;
let filtroMaquina = null;
let filtroConsultor = null;
let filtroStatus = null;
let toggleAdvancedFiltersBtn = null;
let advancedFiltersPanel = null;
let closeAdvancedFiltersBtn = null;
let applyAdvancedFiltersBtn = null;
let clearAdvancedFiltersBtn = null;
let activeFiltersBadge = null;
let sortBySelect = null;
let pageSizeSelect = null;
let paginationBar = null;
const addClientBtn = document.getElementById('addClientBtn');
const editModal = document.getElementById('editModal');
const modalTitle = document.getElementById('modalTitle');
const saveEditBtn = document.getElementById('saveEdit');
const cancelEditBtn = document.getElementById('cancelEdit');
let listaConsultorEl = null;
let listaStatusFiltradoEl = null;
let listaMaquinaEl = null;
const toastContainer = document.getElementById('crm-toast-container');
const chatbotWidget = document.getElementById('chatbot-widget');
const headerTop = document.querySelector('.crm-header-top');
const headerTitle = headerTop ? headerTop.querySelector('h1') : null;
let headerFilters = null;
let advancedFiltersWrapper = null;
let analyticsPanelsEl = null;
let emptyStateEl = null;
let emptyMsgEl = null;
const CLIENTES_EVENT = 'crm:clientes-atualizados';

function notificarClientesAtualizados() {
  document.dispatchEvent(new CustomEvent(CLIENTES_EVENT));
}

// Lazy criação de modal de confirmação reutilizável
let confirmDialogEl = null;
function criarConfirmDialog() {
  if (confirmDialogEl) return confirmDialogEl;
  confirmDialogEl = document.createElement('div');
  confirmDialogEl.className = 'confirm-dialog-backdrop';
  confirmDialogEl.innerHTML = `
    <div class="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
      <h3 id="confirm-title">Confirmação</h3>
      <p id="confirm-message"></p>
      <div class="confirm-actions">
        <button type="button" class="btn btn-ghost" data-action="cancelar">Cancelar</button>
        <button type="button" class="btn btn-danger" data-action="confirmar">Confirmar</button>
      </div>
    </div>`;
  document.body.appendChild(confirmDialogEl);
  return confirmDialogEl;
}
function confirmar(mensagem) {
  return new Promise(resolve => {
    const el = criarConfirmDialog();
    el.querySelector('#confirm-message').textContent = mensagem;
    el.classList.add('show');
    const btns = el.querySelectorAll('button');
    function done(val){
      el.classList.remove('show');
      setTimeout(()=> el.remove(), 260);
      confirmDialogEl = null;
      resolve(val);
    }
    btns.forEach(b=> b.onclick = () => done(b.dataset.action === 'confirmar'));
    // ESC cancela
    const escHandler = (e)=> { if (e.key==='Escape') { done(false); window.removeEventListener('keydown', escHandler);} };
    window.addEventListener('keydown', escHandler);
  });
}

function toast(msg, tipo='info', tempo=3500) {
  if (!toastContainer) return;
  const t = document.createElement('div');
  t.className = `toast ${tipo==='erro'?'error':tipo==='sucesso'?'success':''}`;
  t.textContent = msg;
  toastContainer.appendChild(t);
  setTimeout(()=> { t.classList.add('hide'); setTimeout(()=> t.remove(), 380); }, tempo);
}

const fields = {
  nome: document.getElementById('editNome'),
  email: document.getElementById('editEmail'),
  telefone: document.getElementById('editTelefone'),
  cidade: document.getElementById('editCidade'),
  maquina: document.getElementById('editMaquina'), // será oculto em modo consultor (usaremos campo especialidade custom)
  horario: document.getElementById('editHorario')
};
fields.status = document.getElementById('editStatus');
let campoEspecialidadeWrapper = null; // container custom
let campoEspecialidadeInput = null;   // input de busca
let campoEspecialidadeList = null;    // lista de opções
let campoEspecialidadeHidden = null;  // valor escolhido
let especialidadeActiveIndex = -1;    // índice ativo para navegação por teclado

let editId = null;
let isNew = false;
let currentPage = 1;
let modoConsultor = false;

const STATUS_ORDER = ['novo','em andamento','contatado','convertido','perdido'];

function atribuirConsultorAutomatico(cliente) {
  if (!cliente) return;
  if (cliente.consultor) return;
  const alvo = (cliente.maquina || '').trim();
  if (!alvo) return;
  const consultor = selecionarConsultorPorMaquina(alvo);
  if (consultor) cliente.consultor = consultor;
}

function aplicarDefaultsCliente(cliente) {
  if (!cliente) return cliente;
  if (!cliente.status) cliente.status = 'novo';
  atribuirConsultorAutomatico(cliente);
  return cliente;
}

// ================= Atribuição Automática de Consultor ==================
function selecionarConsultorPorMaquina(maquina) {
  if (!maquina) return null;
  const alvoNorm = maquina.toLowerCase();
  const candidatos = CONSULTOR_LIST.filter(c => (c.especialidade||'').toLowerCase() === alvoNorm);
  if (candidatos.length === 0) return null;
  const escolhido = candidatos[Math.floor(Math.random()*candidatos.length)];
  return escolhido?.nome || null;
}

function reatribuirConsultoresClientesExistentes() {
  let alterados = 0;
  crm.listar().forEach(cli => {
    if (!cli.maquina) return;
    const atual = cli.consultor;
    const objAtual = atual && CONSULTOR_LIST.find(c => c.nome === atual);
    const precisaReatribuir = !atual || !objAtual || (objAtual.especialidade||'').toLowerCase() !== cli.maquina.toLowerCase();
    if (precisaReatribuir) {
      const novo = selecionarConsultorPorMaquina(cli.maquina);
      if (novo && novo !== atual) {
        crm.atualizar(cli.id, { consultor: novo });
        alterados++;
      }
    }
  });
  return alterados;
}

function sortLista(lista) {
  const mode = sortBySelect?.value || 'dataDesc';
  return [...lista].sort((a,b) => {
    switch(mode) {
      case 'dataAsc': return new Date(a.dataCadastro||0) - new Date(b.dataCadastro||0);
      case 'dataDesc': return new Date(b.dataCadastro||0) - new Date(a.dataCadastro||0);
      case 'nomeAsc': return (a.nome||'').localeCompare(b.nome||'', 'pt-BR');
      case 'nomeDesc': return (b.nome||'').localeCompare(a.nome||'', 'pt-BR');
      case 'statusAsc': {
        const ia = STATUS_ORDER.indexOf((a.status||'').toLowerCase());
        const ib = STATUS_ORDER.indexOf((b.status||'').toLowerCase());
        return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
      }
      case 'statusDesc': {
        const ia = STATUS_ORDER.indexOf((a.status||'').toLowerCase());
        const ib = STATUS_ORDER.indexOf((b.status||'').toLowerCase());
        return (ib === -1 ? 999 : ib) - (ia === -1 ? 999 : ia);
      }
      case 'consultorAsc': return (a.consultor||'').localeCompare(b.consultor||'', 'pt-BR');
      case 'consultorDesc': return (b.consultor||'').localeCompare(a.consultor||'', 'pt-BR');
      default: return 0;
    }
  });
}

function paginar(lista) {
  const pageSizeVal = pageSizeSelect?.value || '25';
  if (pageSizeVal === 'all') return { pagina:1, totalPaginas:1, slice:lista, total:lista.length };
  const size = parseInt(pageSizeVal, 10) || 25;
  const totalPaginas = Math.max(1, Math.ceil(lista.length / size));
  if (currentPage > totalPaginas) currentPage = totalPaginas;
  const start = (currentPage - 1) * size;
  const slice = lista.slice(start, start + size);
  return { pagina: currentPage, totalPaginas, slice, total: lista.length, size };
}

function renderPagination(totalPaginas) {
  if (!paginationBar) return;
  if (totalPaginas <= 1) { paginationBar.innerHTML=''; return; }
  const btns = [];
  function addBtn(label, page, active=false, disabled=false) {
    const b = document.createElement('button');
    b.textContent = label;
    if (active) b.classList.add('active');
    if (disabled) b.disabled = true;
    b.addEventListener('click', () => { currentPage = page; atualizarLista(); window.scrollTo({top:0,behavior:'smooth'}); });
    btns.push(b);
  }
  const max = totalPaginas;
  const atual = currentPage;
  addBtn('«', 1, false, atual===1);
  addBtn('‹', Math.max(1, atual-1), false, atual===1);
  const windowRange = 2;
  let start = Math.max(1, atual - windowRange);
  let end = Math.min(max, atual + windowRange);
  if (atual <= windowRange) end = Math.min(max, 1 + windowRange*2);
  if (atual > max - windowRange) start = Math.max(1, max - windowRange*2);
  if (start > 1) {
    addBtn('1', 1, atual===1);
    if (start > 2) { const gap = document.createElement('span'); gap.className='gap'; gap.textContent='…'; btns.push(gap); }
  }
  for (let p=start; p<=end; p++) addBtn(String(p), p, p===atual);
  if (end < max) {
    if (end < max-1) { const gap = document.createElement('span'); gap.className='gap'; gap.textContent='…'; btns.push(gap); }
    addBtn(String(max), max, atual===max);
  }
  addBtn('›', Math.min(max, atual+1), false, atual===max);
  addBtn('»', max, false, atual===max);
  paginationBar.innerHTML='';
  btns.forEach(b => paginationBar.appendChild(b));
}

function obterFonteAtual() {
  if (!searchInput) return [];
  return crm.filterAdvanced({
    texto: searchInput.value,
    cidade: filtroCidade.value,
    maquina: filtroMaquina.value,
    consultor: filtroConsultor.value,
    status: filtroStatus.value
  });
}

function atualizarLista() {
  if (!clientesContainer) return; // view ainda não carregada
  let lista = obterFonteAtual();
  lista = sortLista(lista);
  const pageData = paginar(lista);
  renderClientes(clientesContainer, pageData.slice, {
    onEdit: abrirModalEdicao,
    onDelete: excluirCliente
  });
  prepararEdicaoInline();
  clientesContainer.querySelectorAll('.cliente-card').forEach(c => { if (getComputedStyle(c).opacity === '0') c.style.opacity = '1'; });
  if (totalClientes) totalClientes.textContent = `Total: ${pageData.total} | Página ${pageData.pagina}/${pageData.totalPaginas}`;
  renderPagination(pageData.totalPaginas);
  atualizarAnaliticosFiltrados(lista);
  if (emptyStateEl) {
    if (pageData.total === 0) {
      emptyStateEl.style.display = 'block';
      emptyMsgEl.textContent = (searchInput.value || filtroCidade.value || filtroMaquina.value || filtroConsultor.value || filtroStatus.value) ? 'Nenhum cliente corresponde aos filtros.' : 'Nenhum cliente cadastrado ainda.';
    } else if (pageData.slice.length === 0) {
      emptyStateEl.style.display = 'block';
      emptyMsgEl.textContent = 'Página vazia. Ajuste a paginação.';
    } else {
      emptyStateEl.style.display = 'none';
    }
  }
}

// Debounce simples para não re-renderizar a cada tecla muito rápido
let debounceTimer;
function bindSearch() {
  if (!searchInput) return;
  searchInput.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => atualizarLista(), 120);
  });
}

// Atualiza lista quando selects mudam
function contarFiltrosAtivos() {
  let count = 0;
  if (filtroCidade.value) count++;
  if (filtroMaquina.value) count++;
  if (filtroConsultor.value) count++;
  if (filtroStatus.value) count++;
  if (count > 0) {
    activeFiltersBadge.style.display = 'inline-block';
    activeFiltersBadge.textContent = String(count);
  } else {
    activeFiltersBadge.style.display = 'none';
  }
}

function bindAdvancedFilters() {
  applyAdvancedFiltersBtn && applyAdvancedFiltersBtn.addEventListener('click', () => {
    currentPage = 1;
    atualizarLista();
    contarFiltrosAtivos();
    fecharPainelFiltros();
  });
  clearAdvancedFiltersBtn && clearAdvancedFiltersBtn.addEventListener('click', () => {
    [filtroCidade,filtroMaquina,filtroConsultor,filtroStatus].forEach(s => s.value='');
    currentPage = 1;
    atualizarLista();
    contarFiltrosAtivos();
  });
}

function abrirPainelFiltros() {
  advancedFiltersPanel.style.display = 'flex';
  toggleAdvancedFiltersBtn.setAttribute('aria-expanded','true');
}
function fecharPainelFiltros() {
  advancedFiltersPanel.style.display = 'none';
  toggleAdvancedFiltersBtn.setAttribute('aria-expanded','false');
}
function bindToggleFilters() {
  toggleAdvancedFiltersBtn && toggleAdvancedFiltersBtn.addEventListener('click', () => {
    if (advancedFiltersPanel.style.display === 'none' || advancedFiltersPanel.style.display === '') abrirPainelFiltros(); else fecharPainelFiltros();
  });
  closeAdvancedFiltersBtn && closeAdvancedFiltersBtn.addEventListener('click', fecharPainelFiltros);
  document.addEventListener('keydown', escFiltersHandler);
  document.addEventListener('click', outsideFiltersHandler);
  sortBySelect && sortBySelect.addEventListener('change', () => { currentPage = 1; atualizarLista(); });
  pageSizeSelect && pageSizeSelect.addEventListener('change', () => { currentPage = 1; atualizarLista(); });
}
function escFiltersHandler(e){ if (e.key==='Escape' && advancedFiltersPanel && advancedFiltersPanel.style.display==='flex') fecharPainelFiltros(); }
function outsideFiltersHandler(e){ if (advancedFiltersPanel && !advancedFiltersPanel.contains(e.target) && e.target !== toggleAdvancedFiltersBtn && !toggleAdvancedFiltersBtn.contains(e.target)) { if (advancedFiltersPanel.style.display==='flex') fecharPainelFiltros(); } }

function preencherSelect(selectEl, valores) {
  const atual = selectEl.value;
  const base = Array.from(new Set(valores.filter(v => v))).sort((a,b) => a.localeCompare(b, 'pt-BR'));
  // Mantém primeiro option (todas)
  selectEl.querySelectorAll('option:not(:first-child)').forEach(o => o.remove());
  base.forEach(v => {
    const opt = document.createElement('option');
    opt.value = v;
    opt.textContent = v;
    selectEl.appendChild(opt);
  });
  if (base.includes(atual)) selectEl.value = atual; else selectEl.value = '';
}

function atualizarFiltrosDinamicos() {
  if (!filtroCidade) return; // não está na view
  const todos = crm.listar();
  preencherSelect(filtroCidade, todos.map(c => c.cidade));
  preencherSelect(filtroMaquina, todos.map(c => c.maquina));
  preencherSelect(filtroConsultor, todos.map(c => c.consultor));
  preencherSelect(filtroStatus, todos.map(c => c.status));
}

function atualizarAnaliticosFiltrados(lista) {
  if (!listaConsultorEl || !listaStatusFiltradoEl || !listaMaquinaEl) return;
  const porConsultor = lista.reduce((acc, c) => {
    const k = c.consultor || '—';
    acc[k] = (acc[k] || 0) + 1; return acc;
  }, {});
  listaConsultorEl.innerHTML = '';
  Object.keys(porConsultor).sort((a,b)=>a.localeCompare(b,'pt-BR')).forEach(nome => {
    const li = document.createElement('li');
    li.textContent = `${nome}: ${porConsultor[nome]}`;
    listaConsultorEl.appendChild(li);
  });
  const porStatus = lista.reduce((acc,c)=>{ const s=(c.status||'novo').toLowerCase(); acc[s]=(acc[s]||0)+1; return acc; },{});
  const ordem = ['novo','em andamento','contatado','convertido','perdido'];
  listaStatusFiltradoEl.innerHTML = '';
  ordem.forEach(st => {
    const li = document.createElement('li');
    li.innerHTML = `<span class="status-badge status-${st.replace(/\s+/g,'-')}">${st}</span> ${porStatus[st]||0}`;
    listaStatusFiltradoEl.appendChild(li);
  });
  const porMaquina = lista.reduce((acc,c)=>{ const m=c.maquina||'—'; acc[m]=(acc[m]||0)+1; return acc; },{});
  listaMaquinaEl.innerHTML='';
  Object.keys(porMaquina).sort((a,b)=>a.localeCompare(b,'pt-BR')).forEach(m => {
    const li=document.createElement('li');
    li.textContent = `${m}: ${porMaquina[m]}`;
    listaMaquinaEl.appendChild(li);
  });
}

function abrirModalEdicao(id) {
  isNew = false;
  editId = id;
  modalTitle.textContent = 'Editar Cliente';
  const cliente = crm.obter(id);
  preencherModal(cliente, fields);
  mostrarModal();
}

// ----- Edição Inline -----
let inlineEditingId = null;
const EDITABLE_FIELDS = ['nome','email','telefone','cidade','maquina','horario','status'];

function prepararEdicaoInline() {
  clientesContainer.querySelectorAll('.cliente-card').forEach(card => {
    const id = Number(card.querySelector('button.edit')?.dataset.id);
    if (!id) return;
    const btn = card.querySelector('button.edit');
    if (btn) {
      btn.addEventListener('click', e => {
        e.preventDefault();
        iniciarEdicaoInline(card, id);
      }, { once: true }); // evita múltiplos binds
    }
  });
}

function iniciarEdicaoInline(card, id) {
  if (inlineEditingId && inlineEditingId !== id) {
    cancelarEdicaoInline();
  }
  inlineEditingId = id;
  card.classList.add('editing');
  const cliente = crm.obter(id);
  const info = card.querySelector('.cliente-info');
  // Converter campos
  info.querySelectorAll('.field').forEach(el => {
    const field = el.getAttribute('data-field');
    if (!EDITABLE_FIELDS.includes(field)) return;
    const original = cliente[field] || '';
    if (field === 'status') {
      const select = document.createElement('select');
      select.innerHTML = `
        <option value="novo">Novo</option>
        <option value="em andamento">Em andamento</option>
        <option value="contatado">Contatado</option>
        <option value="convertido">Convertido</option>
        <option value="perdido">Perdido</option>`;
      select.value = (cliente.status||'novo');
      el.replaceChildren(select);
      el.dataset.original = original;
      el.classList.add('inline-editor');
    } else {
      const input = document.createElement('input');
      input.type = 'text';
      input.value = original;
      el.replaceChildren(input);
      el.dataset.original = original;
      el.classList.add('inline-editor');
    }
  });
  // Adicionar ações inline
  const actions = card.querySelector('.cliente-actions');
  const inlineBar = document.createElement('div');
  inlineBar.className = 'inline-actions';
  inlineBar.innerHTML = `
    <button class="save">Salvar</button>
    <button class="cancel">Cancelar</button>`;
  actions.insertAdjacentElement('afterend', inlineBar);
  inlineBar.querySelector('.save').onclick = () => salvarEdicaoInline(card, id);
  inlineBar.querySelector('.cancel').onclick = () => cancelarEdicaoInline();
}

function coletarEdicaoInline(card) {
  const data = {};
  card.querySelectorAll('.cliente-info .field.inline-editor').forEach(el => {
    const f = el.getAttribute('data-field');
    const input = el.querySelector('input,select');
    if (input) data[f] = input.value;
  });
  return data;
}

function validarInline(data) {
  // Reaproveita validador completo mas restringe ao conjunto usado
  const { valid, errors, value } = validarClienteUnit(data);
  // Filtra somente campos presentes
  const filteredErrors = errors.filter(e => Object.keys(data).includes(e.field));
  const sanitized = { ...value };
  if (data.status !== undefined) sanitized.status = typeof data.status === 'string' ? data.status.trim() : data.status;
  return { valid: filteredErrors.length === 0 && valid, errors: filteredErrors, value: sanitized };
}

function exibirErrosInline(card, errors) {
  limparErrosInline(card);
  errors.forEach(err => {
    const el = card.querySelector(`.field[data-field="${err.field}"]`);
    if (!el) return;
    let msg = el.querySelector('.inline-error');
    if (!msg) {
      msg = document.createElement('div');
      msg.className = 'inline-error';
      el.appendChild(msg);
    }
    msg.textContent = err.message;
  });
}

function limparErrosInline(card) {
  card.querySelectorAll('.inline-error').forEach(e => e.remove());
}

function salvarEdicaoInline(card, id) {
  const data = coletarEdicaoInline(card);
  const { valid, errors, value } = validarInline(data);
  if (!valid) { exibirErrosInline(card, errors); return; }
  // Se mudou máquina ou cliente sem consultor válido, reatribuir
  const original = crm.obter(id);
  let payload = { ...value };
  if (value.maquina) {
    const precisa = !original.consultor || (original.maquina && original.maquina !== value.maquina);
    if (precisa) {
      const novoCons = selecionarConsultorPorMaquina(value.maquina);
      if (novoCons) payload.consultor = novoCons; else if (!original.consultor) payload.consultor = null;
    }
  }
  crm.atualizar(id, payload);
  notificarClientesAtualizados();
  toast('Alterações salvas','sucesso');
  inlineEditingId = null;
  atualizarLista();
}

function cancelarEdicaoInline() {
  inlineEditingId = null;
  atualizarLista();
}

function excluirCliente(id) {
  confirmar('Tem certeza que deseja excluir este cliente?').then(ok => {
    if (!ok) return;
    crm.remover(id);
    notificarClientesAtualizados();
    atualizarLista();
    toast('Cliente excluído','sucesso');
  });
}

addClientBtn.onclick = () => {
  modoConsultor = false;
  isNew = true;
  editId = null;
  modalTitle.textContent = 'Novo Cliente';
  Object.values(fields).forEach(i => i && (i.value = ''));
  if (fields.status) fields.status.value = 'novo';
  limparErros(fields);
  mostrarModal();
};

function abrirModalNovoConsultor() {
  modoConsultor = true;
  isNew = false;
  editId = null;
  modalTitle.textContent = 'Novo Consultor';
  if (fields.nome) fields.nome.value = '';
  if (fields.email) fields.email.value = '';
  if (fields.telefone) fields.telefone.value = '';
  if (fields.cidade) fields.cidade.value = '';
  if (campoEspecialidadeHidden) campoEspecialidadeHidden.value = '';
  if (campoEspecialidadeInput) campoEspecialidadeInput.value = '';
  ocultarCampoComLabel(fields.maquina);
  ocultarCampoComLabel(fields.horario);
  ocultarCampoComLabel(fields.status);
  prepararCampoEspecialidade();
  limparErros(fields);
  mostrarModal();
}

saveEditBtn.onclick = () => {
  if (modoConsultor) {
    const nome = fields.nome.value.trim();
    if (!nome) { exibirErrosModal([{ field:'nome', message:'Nome é obrigatório'}], fields); return; }
    const especialidadeSelecionada = campoEspecialidadeHidden?.value?.trim();
    if (!especialidadeSelecionada) {
      exibirErrosModal([{ field:'maquina', message:'Selecione uma especialidade'}], fields);
      return;
    }
    adicionarConsultor({
      nome,
      email: fields.email.value.trim(),
      telefone: fields.telefone.value.trim(),
      cidade: fields.cidade.value.trim(),
      especialidade: especialidadeSelecionada
    });
    fecharModal();
    const consultoresList = document.getElementById('consultores-list');
    if (typeof window.__renderConsultoresList === 'function') {
      window.__renderConsultoresList({});
    } else if (consultoresList) {
      renderConsultores(consultoresList);
    }
    toast('Consultor adicionado','sucesso');
    modoConsultor = false;
    restaurarCamposCliente();
    return;
  }
  const dados = {
    nome: fields.nome.value,
    email: fields.email.value,
    telefone: fields.telefone.value,
    cidade: fields.cidade.value,
    maquina: fields.maquina.value,
    horario: fields.horario.value,
    status: fields.status.value
  };
  const { valid, errors, value } = validarCliente(dados);
  if (!valid) {
    exibirErrosModal(errors, fields);
    return;
  }
  const statusEntrada = dados.status ?? 'novo';
  if (typeof statusEntrada === 'string') {
    const trimmed = statusEntrada.trim();
    value.status = trimmed || 'novo';
  } else {
    value.status = statusEntrada || 'novo';
  }
  limparErros(fields);
  let novoId = null;
  if (isNew) {
    // Atribuição automática para novo cliente
    if (!value.consultor && value.maquina) {
      const cons = selecionarConsultorPorMaquina(value.maquina);
      if (cons) value.consultor = cons;
    }
    value.status = value.status || 'novo';
    novoId = crm.adicionar(value);
    notificarClientesAtualizados();
    toast('Cliente adicionado com sucesso','sucesso');
  } else {
    // Em edição: se máquina alterada ou consultor ausente/incompatível -> reatribuir
    const original = crm.obter(editId);
    if (value.maquina) {
      const objAtual = original.consultor && CONSULTOR_LIST.find(c => c.nome === original.consultor);
      const incompat = objAtual && objAtual.especialidade && objAtual.especialidade !== value.maquina;
      if (!original.consultor || original.maquina !== value.maquina || incompat) {
        const novoCons = selecionarConsultorPorMaquina(value.maquina);
        if (novoCons) value.consultor = novoCons;
      }
    }
    crm.atualizar(editId, value);
    notificarClientesAtualizados();
    novoId = editId;
    toast('Cliente atualizado','sucesso');
  }
  fecharModal();
  atualizarFiltrosDinamicos();
  atualizarLista();
  requestAnimationFrame(()=>{
    const card = document.querySelector(`.cliente-card button.edit[data-id="${novoId}"]`)?.closest('.cliente-card');
    if (card) {
      card.classList.add('flash-new');
      card.scrollIntoView({ behavior:'smooth', block:'center' });
      setTimeout(()=> card.classList.remove('flash-new'), 1800);
    }
  });
};

cancelEditBtn.onclick = () => { limparErros(fields); fecharModal(); };
window.onclick = e => { if (e.target === editModal) { limparErros(fields); fecharModal(); } };

// Renderização de consultores (módulo separado)
function mostrarConsultores() {
  const consultoresList = document.getElementById('consultores-list');
  renderConsultores(consultoresList);
}

const menuClientes = document.getElementById('menu-clientes');
const menuConsultores = document.getElementById('menu-consultores');
const menuSobre = document.getElementById('menu-sobre');
const menuItems = [menuClientes, menuConsultores, menuSobre];

async function showSection(section, opts = {}) {
  const valid = ['clientes','consultores','sobre'];
  if (!valid.includes(section)) section = 'clientes';
  await swapView(section);
  const targetMenu = menuItems.find(m=>m.id==='menu-'+section);
  if (targetMenu) setActiveMenu(targetMenu);
  const isSobre = section === 'sobre';
  if (headerTop) headerTop.style.display = isSobre ? 'none' : '';
  if (chatbotWidget) {
    if (section === 'clientes') chatbotWidget.style.display = 'flex';
    else chatbotWidget.style.display = 'none';
  }
  // Restaura comportamento do botão principal conforme seção
  if (addClientBtn) {
    if (section === 'clientes') {
      addClientBtn.innerHTML = '<i class="fa-solid fa-plus"></i> Novo Cliente';
      addClientBtn.onclick = () => {
        modoConsultor = false;
        isNew = true;
        editId = null;
        modalTitle.textContent = 'Novo Cliente';
        Object.values(fields).forEach(i => i && (i.value = ''));
        if (fields.status) fields.status.value = 'novo';
        limparErros(fields);
        restaurarCamposCliente();
        mostrarModal();
      };
    } else if (section === 'consultores') {
      addClientBtn.innerHTML = '<i class="fa-solid fa-user-plus"></i> Adicionar Consultor';
      addClientBtn.onclick = () => abrirModalNovoConsultor && abrirModalNovoConsultor();
    }
  }
  localStorage.setItem('crm-active-section', section);
  if (opts.updateHash !== false) {
    const newHash = '#' + section;
    if (location.hash !== newHash) history.replaceState(null, '', newHash);
  }
}
window.showSection = showSection;

function setActiveMenu(target) {
  menuItems.forEach(item => {
    const active = item === target;
    item.classList.toggle('active', active);
    if (active) item.setAttribute('aria-current','page'); else item.removeAttribute('aria-current');
    item.tabIndex = 0;
  });
}

menuClientes.onclick = () => showSection('clientes');
menuConsultores.onclick = () => showSection('consultores');
menuSobre.onclick = () => showSection('sobre');

// Navegação por teclado (setas cima/baixo) e Enter
menuItems.forEach((el, idx) => {
  el.setAttribute('role','menuitem');
  el.addEventListener('keydown', e => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      menuItems[(idx+1) % menuItems.length].focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      menuItems[(idx-1+menuItems.length) % menuItems.length].focus();
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      el.click();
    }
  });
});

// Restaurar seção ativa (hash > localStorage > default)
async function inicializarSecao() {
  let alvo = (location.hash || '').replace('#','').trim();
  if (!alvo) alvo = localStorage.getItem('crm-active-section') || 'clientes';
  await showSection(alvo, { updateHash: false });
}
inicializarSecao();

// Sincronizar com mudança manual de hash
window.addEventListener('hashchange', () => {
  const alvo = (location.hash || '').replace('#','').trim();
  if (alvo) showSection(alvo, { updateHash: false });
});

// Chatbot widget
const openChatbotBtn = document.getElementById('open-chatbot');
const chatbotPopup = document.getElementById('chatbot-popup');
function toggleChatbot(force) {
  const open = force !== undefined ? force : chatbotPopup.style.display !== 'flex';
  chatbotPopup.style.display = open ? 'flex' : 'none';
  openChatbotBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
  const widget = document.getElementById('chatbot-widget');
  if (widget) widget.classList.toggle('open', open);
}
openChatbotBtn.onclick = () => toggleChatbot();
window.addEventListener('click', e => {
  if (chatbotPopup.style.display === 'flex' && !document.getElementById('chatbot-widget').contains(e.target) && e.target !== openChatbotBtn) {
    toggleChatbot(false);
  }
});

// Recebe novo cliente do iframe
window.addEventListener('message', event => {
  if (event.data && event.data.tipo === 'novoCliente' && event.data.cliente) {
    const bruto = { ...event.data.cliente };
    const { valid, value } = validarCliente(bruto);
    if (!valid) {
      toast('Cliente recebido do chatbot com dados inválidos','erro');
      return;
    }
    const cliente = { ...value };
    if (bruto.status) cliente.status = bruto.status;
    if (bruto.consultor) cliente.consultor = bruto.consultor;
    aplicarDefaultsCliente(cliente);
    const novoId = crm.adicionar(cliente);
    notificarClientesAtualizados();
    atualizarFiltrosDinamicos();
    atualizarLista();
    toast('Novo cliente recebido do chatbot','info');
    requestAnimationFrame(() => {
      const card = document.querySelector(`.cliente-card button.edit[data-id="${novoId}"]`)?.closest('.cliente-card');
      if (card) {
        card.classList.add('flash-new');
        card.scrollIntoView({ behavior:'smooth', block:'center' });
        setTimeout(()=> card.classList.remove('flash-new'), 1800);
      }
    });
  }
});

// Inicialização de views agora ocorre via window.init* após swapView

// ================== Sobre: versão & i18n ==================
async function carregarVersaoProjeto() {
  try {
    const resp = await fetch('/api/meta/version');
    if (!resp.ok) return;
    const dataJson = await resp.json();
    if (!dataJson?.version) return;
    const meta = document.getElementById('sobre-meta-version');
    if (meta) {
      const data = new Date();
      const format = data.toLocaleDateString('pt-BR', { year:'numeric', month:'2-digit', day:'2-digit' });
      meta.innerHTML = `<span>v${dataJson.version}</span><span data-i18n="sobre.atualizado">Atualizado em</span> <time>${format}</time>`;
    }
  } catch(e) { /* silencioso */ }
}

const I18N = {
  pt: {
    'sobre.titulo': 'Sobre o Projeto',
  'sobre.intro': 'Este aplicativo CRM + Chatbot foi criado como <strong>material de estudo e portfólio</strong>, reunindo práticas atuais de <strong>Full Stack JavaScript</strong> (Node.js no backend e ES Modules no frontend) em um cenário realista. Os dados são fictícios e <strong>não devem ser usados em produção</strong> sem auditoria de segurança, revisão de infraestrutura, cobertura de testes automatizados e pipeline de deploy apropriado.',
  'sobre.resumo': 'Resumo da Aplicação',
  'sobre.resumoTexto': 'Um protótipo de CRM integrado a um chatbot para captar e nutrir leads: contempla cadastro/edição de clientes (modal e inline), atribuição automática de consultores por especialidade, filtros avançados com busca unificada, ordenação e paginação flexíveis, além de painéis analíticos que refletem métricas em tempo real. A interface entrega feedback moderno (toasts, confirmações customizadas, animações acessíveis) enquanto a arquitetura reforça organização modular entre Express, validações compartilhadas e manipulação direta de DOM sem recorrer a frameworks pesados.',
  'sobre.tecnologias': 'Tecnologias & Métodos',
  'sobre.tecnologiasTexto': 'Base tecnológica integra serviços enxutos em <strong>Node.js + Express</strong> com uma SPA modular sem frameworks pesados. Organização em camadas, validações compartilhadas e pipelines consistentes deixam o caminho aberto para evoluções rápidas e seguras.',
  'sobre.tecnologiasBackend': 'Backend orientado a serviços',
  'sobre.tecnologiasBackendDesc': 'API Express enxuta com camadas de modelo e validação compartilhadas com o frontend, pronta para crescer em integrações REST ou GraphQL.',
  'sobre.tecnologiasFrontend': 'Frontend modular em ES Modules',
  'sobre.tecnologiasFrontendDesc': 'SPA leve com ES Modules, eventos customizados e widgets plugáveis sem bibliotecas pesadas, preservando controle total do DOM.',
  'sobre.tecnologiasQualidade': 'Qualidade e experiência',
  'sobre.tecnologiasQualidadeDesc': 'Validações reutilizadas, estados acessíveis e microinterações com feedback imediato (toasts, confirmações, animações) para uma UX consistente em qualquer dispositivo.',
  'sobre.techPillNode': '<i class="fa-brands fa-node-js" aria-hidden="true"></i> Node.js 18+',
  'sobre.techPillExpress': '<i class="fa-solid fa-network-wired" aria-hidden="true"></i> Express 5',
  'sobre.techPillModules': '<i class="fa-solid fa-puzzle-piece" aria-hidden="true"></i> ES Modules',
  'sobre.techPillA11y': '<i class="fa-solid fa-universal-access" aria-hidden="true"></i> Acessibilidade',
  'sobre.techPillUX': '<i class="fa-solid fa-wand-magic-sparkles" aria-hidden="true"></i> UX Responsiva',
    'sobre.conheca': 'Conheça-nos',
    'sobre.conhecaTexto': 'Links para contato e acompanhamento de outros projetos:',
    'sobre.disclaimer': 'Este repositório existe para fins educacionais e demonstração de competências. Qualquer semelhança com dados reais é coincidência.',
    'sobre.atualizado': 'Atualizado em'
  },
  en: {
    'sobre.titulo': 'About the Project',
  'sobre.intro': 'This CRM + Chatbot application was built as <strong>study and portfolio material</strong>, combining current <strong>Full Stack JavaScript</strong> practices (Node.js backend and ES Modules frontend) in a realistic scenario. All data is fictitious and it <strong>must not reach production</strong> without security audits, infrastructure review, automated test coverage, and a proper deployment pipeline.',
  'sobre.resumo': 'Application Summary',
  'sobre.resumoTexto': 'A CRM prototype integrated with a chatbot to capture and nurture leads: it covers client creation/editing (modal and inline), automatic consultant assignment by specialty, unified advanced filters with flexible sorting and pagination, plus live analytics panels mirroring key metrics. The interface provides modern feedback (toasts, custom confirmations, accessibility-aware animations) while the architecture showcases modular organization across Express, shared validation layers, and hands-on DOM work without heavyweight frontend frameworks.',
  'sobre.tecnologias': 'Technologies & Methods',
  'sobre.tecnologiasTexto': 'The foundation blends lean <strong>Node.js + Express</strong> services with a modular SPA that avoids heavyweight frameworks. Layered organization, shared validations, and consistent pipelines keep the project ready for fast, safe iterations.',
  'sobre.tecnologiasBackend': 'Service-oriented backend',
  'sobre.tecnologiasBackendDesc': 'Slim Express API with shared model/validation layers, ready to expand into REST or GraphQL integrations.',
  'sobre.tecnologiasFrontend': 'ES Modules modular frontend',
  'sobre.tecnologiasFrontendDesc': 'Lightweight SPA powered by ES Modules, custom events, and progressively pluggable widgets—no bulky frameworks required.',
  'sobre.tecnologiasQualidade': 'Quality & experience',
  'sobre.tecnologiasQualidadeDesc': 'Reused validations, accessibility-first states, microinteractions, and instant feedback (toasts, confirmations, animations) for a consistent UX everywhere.',
  'sobre.techPillNode': '<i class="fa-brands fa-node-js" aria-hidden="true"></i> Node.js 18+',
  'sobre.techPillExpress': '<i class="fa-solid fa-network-wired" aria-hidden="true"></i> Express 5',
  'sobre.techPillModules': '<i class="fa-solid fa-puzzle-piece" aria-hidden="true"></i> ES Modules',
  'sobre.techPillA11y': '<i class="fa-solid fa-universal-access" aria-hidden="true"></i> Accessibility',
  'sobre.techPillUX': '<i class="fa-solid fa-wand-magic-sparkles" aria-hidden="true"></i> Responsive UX',
    'sobre.conheca': 'Get to Know Us',
    'sobre.conhecaTexto': 'Links for contact and to follow other projects:',
    'sobre.disclaimer': 'This repository exists for educational purposes and skill demonstration. Any resemblance to real data is coincidental.',
    'sobre.atualizado': 'Updated on'
  }
};

function aplicarI18n(lang) {
  const dict = I18N[lang] || I18N.pt;
  const targets = document.querySelectorAll('[data-i18n]');
  targets.forEach(node => {
    const key = node.getAttribute('data-i18n');
    if (!dict[key]) return;
    node.classList.remove('i18n-fade-enter');
    // Força reflow para reiniciar animação
    void node.offsetWidth; // reflow
    node.innerHTML = dict[key];
    node.classList.add('i18n-fade-enter');
  });
  // Ajusta estado dos botões
  const btnPt = document.getElementById('langPt');
  const btnEn = document.getElementById('langEn');
  if (btnPt && btnEn) {
    btnPt.setAttribute('aria-pressed', lang === 'pt');
    btnEn.setAttribute('aria-pressed', lang === 'en');
  }
  localStorage.setItem('crm-lang', lang);
}

function inicializarI18n() {
  const langSalva = localStorage.getItem('crm-lang') || 'pt';
  aplicarI18n(langSalva);
  document.getElementById('langPt')?.addEventListener('click', () => aplicarI18n('pt'));
  document.getElementById('langEn')?.addEventListener('click', () => aplicarI18n('en'));
}

// i18n/versão serão inicializados apenas quando view Sobre carregar (initSobre)

function mostrarModal() {
  editModal.classList.remove('closing');
  editModal.style.display = 'flex';
  requestAnimationFrame(()=> editModal.classList.add('show'));
  // foco inicial
  setTimeout(()=> fields.nome.focus(), 40);
}
function fecharModal() {
  editModal.classList.add('closing');
  editModal.classList.remove('show');
  setTimeout(()=> { if(editModal.classList.contains('closing')) { editModal.style.display='none'; editModal.classList.remove('closing'); } }, 320);
}
// fechar com ESC
window.addEventListener('keydown', e => { if (e.key === 'Escape' && editModal.style.display === 'flex') fecharModal(); });

// ================= Views Dinâmicas ==================
function bindClientesRefs() {
  clientesContainer = document.getElementById('clientes-list');
  totalClientes = document.getElementById('totalClients');
  searchInput = document.getElementById('searchInput');
  filtroCidade = document.getElementById('filtroCidade');
  filtroMaquina = document.getElementById('filtroMaquina');
  filtroConsultor = document.getElementById('filtroConsultor');
  filtroStatus = document.getElementById('filtroStatus');
  toggleAdvancedFiltersBtn = document.getElementById('toggleAdvancedFilters');
  advancedFiltersPanel = document.getElementById('advancedFiltersPanel');
  closeAdvancedFiltersBtn = document.getElementById('closeAdvancedFilters');
  applyAdvancedFiltersBtn = document.getElementById('applyAdvancedFilters');
  clearAdvancedFiltersBtn = document.getElementById('clearAdvancedFilters');
  activeFiltersBadge = document.getElementById('activeFiltersBadge');
  sortBySelect = document.getElementById('sortBy');
  pageSizeSelect = document.getElementById('pageSize');
  paginationBar = document.getElementById('pagination');
  listaConsultorEl = document.getElementById('lista-consultor');
  listaStatusFiltradoEl = document.getElementById('lista-status-filtrado');
  listaMaquinaEl = document.getElementById('lista-maquina');
  headerFilters = document.querySelector('.crm-header');
  advancedFiltersWrapper = document.getElementById('advancedFiltersWrapper');
  analyticsPanelsEl = document.getElementById('analytics-panels');
  emptyStateEl = document.getElementById('empty-clients');
  emptyMsgEl = document.getElementById('empty-clients-msg');
}

function inicializarCollapseClientesHeader() {
  const wrapper = document.querySelector('.clientes-header-wrapper');
  const toggleBtn = document.getElementById('toggleClientesHeader');
  if (!wrapper || !toggleBtn) return;
  const saved = localStorage.getItem('crm-clientes-header-collapsed');
  if (saved === 'true') {
    wrapper.dataset.collapsed = 'true';
    toggleBtn.setAttribute('aria-expanded','false');
  }
  const region = document.getElementById('clientes-header-partial');
  function toggle(force) {
    const collapsed = force !== undefined ? force : wrapper.dataset.collapsed === 'false';
    wrapper.dataset.collapsed = collapsed ? 'true' : 'false';
    toggleBtn.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
    localStorage.setItem('crm-clientes-header-collapsed', collapsed ? 'true' : 'false');
    if (analyticsPanelsEl) analyticsPanelsEl.setAttribute('aria-hidden', collapsed ? 'true':'false');
  }
  toggleBtn.addEventListener('click', () => toggle());
  toggleBtn.addEventListener('keydown', e => { if (e.key==='Enter' || e.key===' ') { e.preventDefault(); toggle(); }});
  // Atalho: Ctrl+Shift+F recolhe/expande
  document.addEventListener('keydown', e => {
    if (e.ctrlKey && e.shiftKey && e.key.toLowerCase()==='f') {
      e.preventDefault();
      toggle();
    }
  });
  // Acessibilidade: aria-hidden na região quando colapsada (dinâmico via MutationObserver)
  if (region) {
    const observer = new MutationObserver(()=>{
      const collapsed = wrapper.dataset.collapsed === 'true';
      region.setAttribute('aria-hidden', collapsed ? 'true':'false');
    });
    observer.observe(wrapper, { attributes:true, attributeFilter:['data-collapsed'] });
    // Set inicial
    region.setAttribute('aria-hidden', wrapper.dataset.collapsed === 'true' ? 'true':'false');
    if (analyticsPanelsEl) analyticsPanelsEl.setAttribute('aria-hidden', wrapper.dataset.collapsed === 'true' ? 'true':'false');
  }
}

window.initClientes = function initClientes() {
  bindClientesRefs();
  atualizarFiltrosDinamicos();
  bindSearch();
  bindAdvancedFilters();
  bindToggleFilters();
  contarFiltrosAtivos();
  atualizarLista();
  inicializarCollapseClientesHeader();
  // Reatribuição automática para clientes existentes (uma vez por sessão)
  if (!window.__consultoresReatribuicaoFeita) {
    const qtd = reatribuirConsultoresClientesExistentes();
    if (qtd > 0) {
      atualizarLista();
      toast(`${qtd} cliente(s) tiveram consultor atribuído automaticamente`,`info`);
    }
    window.__consultoresReatribuicaoFeita = true;
  }
};

window.initConsultores = function initConsultores() {
  const list = document.getElementById('consultores-list');
  const clientesList = document.getElementById('consultores-clientes-list');
  const clientesEmpty = document.getElementById('consultores-clientes-empty');
  const clientesTitle = document.getElementById('consultores-clientes-title');
  const clientesCount = document.getElementById('consultores-clientes-count');
  const clientesPanel = document.getElementById('consultores-clientes-panel');
  const clientesClose = document.getElementById('consultores-clientes-close');

  if (addClientBtn) {
    addClientBtn.innerHTML = '<i class="fa-solid fa-user-plus"></i> Adicionar Consultor';
    addClientBtn.onclick = () => abrirModalNovoConsultor && abrirModalNovoConsultor();
  }
  if (chatbotWidget) chatbotWidget.style.display = 'none';

  let consultorSelecionado = null;
  let filtroAtual = { termo:'', campo:'nome' };

  const formatTelefone = valor => {
    const digits = (valor || '').replace(/\D/g, '');
    if (digits.length === 11) return `(${digits.slice(0,2)}) ${digits.slice(2,7)}-${digits.slice(7)}`;
    if (digits.length === 10) return `(${digits.slice(0,2)}) ${digits.slice(2,6)}-${digits.slice(6)}`;
    return valor || '—';
  };

  function renderListaConsultores(extra = {}) {
    filtroAtual = { ...filtroAtual, ...extra };
    if (list) {
      renderConsultores(list, {
        ...filtroAtual,
        onListClientes: atualizarPainelClientes,
        consultorAtivo: consultorSelecionado
      });
    }
  }

  function atualizarPainelClientes(consultor, opts = {}) {
    if (!clientesList || !clientesEmpty || !clientesTitle) return;
    if (!consultor) {
      consultorSelecionado = null;
      clientesTitle.textContent = 'Clientes do consultor selecionado';
      if (clientesCount) clientesCount.textContent = '';
      clientesList.innerHTML = '';
      clientesEmpty.style.display = 'block';
      clientesEmpty.textContent = 'Selecione um consultor para listar os clientes vinculados.';
      if (clientesClose) {
        clientesClose.disabled = true;
        clientesClose.setAttribute('aria-disabled', 'true');
      }
      if (clientesPanel) {
        clientesPanel.classList.add('is-hidden');
        clientesPanel.setAttribute('aria-hidden', 'true');
      }
      if (!opts.skipRender) renderListaConsultores();
      return;
    }

    consultorSelecionado = consultor.nome;
    const relacionados = crm.listar().filter(c => (c.consultor || '').toLowerCase() === consultor.nome.toLowerCase());
    clientesTitle.textContent = `Clientes de ${consultor.nome}`;
    clientesList.innerHTML = '';
    if (relacionados.length === 0) {
      if (clientesCount) clientesCount.textContent = '';
      clientesEmpty.style.display = 'block';
      clientesEmpty.textContent = 'Nenhum cliente vinculado.';
    } else {
      if (clientesCount) clientesCount.textContent = `${relacionados.length} cliente${relacionados.length > 1 ? 's' : ''}`;
      clientesEmpty.style.display = 'none';
      relacionados
        .slice()
        .sort((a,b)=> (a.nome||'').localeCompare(b.nome||'', 'pt-BR'))
        .forEach(cli => {
          const li = document.createElement('li');
          li.className = 'consultores-clientes-item';
          li.innerHTML = `
            <strong>${cli.nome}</strong>
            <div class="consultores-clientes-meta">
              <span><i class="fa-solid fa-envelope"></i> ${cli.email || '—'}</span>
              <span><i class="fa-solid fa-phone"></i> ${formatTelefone(cli.telefone)}</span>
              <span><i class="fa-solid fa-location-dot"></i> ${cli.cidade || '—'}</span>
              <span><i class="fa-solid fa-gears"></i> ${cli.maquina || '—'}</span>
              <span><i class="fa-solid fa-flag"></i> ${(cli.status || 'novo')}</span>
            </div>`;
          clientesList.appendChild(li);
        });
    }
    if (clientesClose) {
      clientesClose.disabled = false;
      clientesClose.setAttribute('aria-disabled', 'false');
    }
    if (clientesPanel) {
      clientesPanel.classList.remove('is-hidden');
      clientesPanel.setAttribute('aria-hidden', 'false');
    }
    if (clientesPanel && !clientesPanel.classList.contains('is-hidden')) {
      clientesPanel.scrollIntoView({ behavior:'smooth', block:'start' });
    }
    if (!opts.skipRender) renderListaConsultores();
  }

  if (list) {
    renderListaConsultores();
    initConsultoresSearch(list, params => renderListaConsultores(params));
  }
  atualizarPainelClientes(null, { skipRender: true });

  if (clientesClose) {
    clientesClose.disabled = true;
    clientesClose.setAttribute('aria-disabled', 'true');
    clientesClose.addEventListener('click', () => {
      if (!consultorSelecionado) return;
      atualizarPainelClientes(null);
      clientesClose.blur();
      if (clientesPanel && !clientesPanel.classList.contains('is-hidden')) {
        clientesPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  }

  if (window.__consultoresClientesListener) {
    document.removeEventListener(CLIENTES_EVENT, window.__consultoresClientesListener);
  }
  window.__consultoresClientesListener = () => {
    if (consultorSelecionado) {
      const consultor = CONSULTOR_LIST.find(c => c.nome === consultorSelecionado);
      if (consultor) atualizarPainelClientes(consultor, { skipRender: true });
      else atualizarPainelClientes(null, { skipRender: true });
    }
    renderListaConsultores();
  };
  document.addEventListener(CLIENTES_EVENT, window.__consultoresClientesListener);
  window.__renderConsultoresList = renderListaConsultores;
};

function prepararCampoEspecialidade() {
  if (!editModal) return;
  if (!campoEspecialidadeWrapper) {
    // Inserir antes do campo máquina original (que ficará oculto)
    const maquinaInput = fields.maquina;
    campoEspecialidadeWrapper = document.createElement('div');
    campoEspecialidadeWrapper.className = 'field-especialidade-wrapper';
    campoEspecialidadeWrapper.innerHTML = `
      <label class="especialidade-label">Especialidade:</label>
      <div class="especialidade-select" role="combobox" aria-haspopup="listbox" aria-owns="lista-especialidade" aria-expanded="false">
        <input type="text" class="especialidade-input" placeholder="Pesquisar..." aria-autocomplete="list" aria-controls="lista-especialidade" />
        <input type="hidden" class="especialidade-hidden" />
        <ul class="especialidade-opcoes" id="lista-especialidade" role="listbox"></ul>
      </div>`;
    // Inserir antes do botão salvar (último .modal-buttons)
    const modalButtons = editModal.querySelector('.modal-buttons');
    editModal.querySelector('.modal-content').insertBefore(campoEspecialidadeWrapper, modalButtons);
    campoEspecialidadeInput = campoEspecialidadeWrapper.querySelector('.especialidade-input');
    campoEspecialidadeList = campoEspecialidadeWrapper.querySelector('.especialidade-opcoes');
    campoEspecialidadeHidden = campoEspecialidadeWrapper.querySelector('.especialidade-hidden');
    campoEspecialidadeInput.addEventListener('input', filtrarOpcoesEspecialidade);
    campoEspecialidadeInput.addEventListener('focus', () => atualizarListaEspecialidade());
    campoEspecialidadeInput.addEventListener('keydown', navegarEspecialidade);
    document.addEventListener('click', e => {
      if (!campoEspecialidadeWrapper.contains(e.target)) fecharListaEspecialidade();
    });
  }
  atualizarListaEspecialidade();
  campoEspecialidadeWrapper.style.display = '';
}

function encontrarLabelPorControl(inputEl) {
  if (!inputEl) return null;
  // Estrutura atual: <label>Texto:</label> <input ...>
  // Procuramos o label imediatamente anterior
  let prev = inputEl.previousElementSibling;
  if (prev && prev.tagName === 'LABEL') return prev;
  return null;
}

function atualizarListaEspecialidade(filtro='') {
  if (!campoEspecialidadeList) return;
  campoEspecialidadeList.innerHTML='';
  const termos = filtro.toLowerCase();
  const resultados = MAQUINAS.filter(m => m.toLowerCase().includes(termos));
  if (resultados.length === 0) {
    const li = document.createElement('li');
    li.textContent = 'Nenhum resultado';
    li.className = 'no-results';
    li.setAttribute('aria-disabled','true');
    campoEspecialidadeList.appendChild(li);
    especialidadeActiveIndex = -1;
  } else {
    resultados.forEach((m,idx) => {
      const li = document.createElement('li');
      li.textContent = m;
      li.setAttribute('role','option');
      li.tabIndex = -1;
      li.addEventListener('click', () => selecionarEspecialidade(m));
      li.addEventListener('mousemove', () => { setActiveEspecialidade(idx); });
      campoEspecialidadeList.appendChild(li);
    });
    especialidadeActiveIndex = 0;
  }
  atualizarEstadoAtivoEspecialidade();
  abrirListaEspecialidade();
}

function filtrarOpcoesEspecialidade(e) {
  atualizarListaEspecialidade(e.target.value);
}

function selecionarEspecialidade(valor) {
  if (campoEspecialidadeInput) campoEspecialidadeInput.value = valor;
  if (campoEspecialidadeHidden) campoEspecialidadeHidden.value = valor;
  fecharListaEspecialidade();
}

function navegarEspecialidade(e) {
  if (!campoEspecialidadeList || campoEspecialidadeList.style.display === 'none') {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      atualizarListaEspecialidade(campoEspecialidadeInput.value);
      e.preventDefault();
    }
    return;
  }
  const itens = [...campoEspecialidadeList.querySelectorAll('li:not(.no-results)')];
  if (['ArrowDown','ArrowUp','Enter','Escape'].includes(e.key)) e.preventDefault();
  if (e.key === 'ArrowDown') {
    if (itens.length === 0) return;
    especialidadeActiveIndex = (especialidadeActiveIndex + 1) % itens.length;
    atualizarEstadoAtivoEspecialidade();
  } else if (e.key === 'ArrowUp') {
    if (itens.length === 0) return;
    especialidadeActiveIndex = (especialidadeActiveIndex - 1 + itens.length) % itens.length;
    atualizarEstadoAtivoEspecialidade();
  } else if (e.key === 'Enter') {
    if (itens.length && especialidadeActiveIndex >=0) {
      selecionarEspecialidade(itens[especialidadeActiveIndex].textContent);
    }
  } else if (e.key === 'Escape') {
    fecharListaEspecialidade();
  }
}

function setActiveEspecialidade(idx) {
  especialidadeActiveIndex = idx;
  atualizarEstadoAtivoEspecialidade();
}

function atualizarEstadoAtivoEspecialidade() {
  if (!campoEspecialidadeList) return;
  const itens = [...campoEspecialidadeList.querySelectorAll('li')];
  itens.forEach((li,i) => {
    if (li.classList.contains('no-results')) return;
    li.classList.toggle('active', i === especialidadeActiveIndex);
    if (i === especialidadeActiveIndex) {
      li.scrollIntoView({ block:'nearest' });
    }
  });
}

function abrirListaEspecialidade() {
  const combo = campoEspecialidadeWrapper?.querySelector('.especialidade-select');
  if (combo) combo.setAttribute('aria-expanded','true');
  if (campoEspecialidadeList) campoEspecialidadeList.style.display = 'block';
}

function fecharListaEspecialidade() {
  const combo = campoEspecialidadeWrapper?.querySelector('.especialidade-select');
  if (combo) combo.setAttribute('aria-expanded','false');
  if (campoEspecialidadeList) campoEspecialidadeList.style.display = 'none';
}

function restaurarCamposCliente() {
  // Mostrar novamente campos ocultos quando voltar a modo cliente
  mostrarCampoComLabel(fields.maquina);
  mostrarCampoComLabel(fields.horario);
  mostrarCampoComLabel(fields.status);
  if (campoEspecialidadeWrapper) campoEspecialidadeWrapper.style.display = 'none';
}

function ocultarCampoComLabel(el) {
  if (!el) return;
  const label = encontrarLabelPorControl(el);
  if (label) label.classList.add('hidden-field');
  el.classList.add('hidden-field');
}
function mostrarCampoComLabel(el) {
  if (!el) return;
  const label = encontrarLabelPorControl(el);
  if (label) label.classList.remove('hidden-field');
  el.classList.remove('hidden-field');
}

window.initSobre = function initSobre() {
  carregarVersaoProjeto();
  inicializarI18n();
};
