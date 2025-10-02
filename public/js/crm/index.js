import { CRM } from './logic.js';
import { renderClientes, preencherModal } from './dom.js';
import { renderConsultores, adicionarConsultor, MAQUINAS, initConsultoresSearch, CONSULTOR_LIST } from './consultores.js';
import { validarCliente, exibirErrosModal, limparErros } from './validation.js';
import { swapView } from '../viewLoader.js';
import { debounce, mountToastManager, populateSelect } from '../shared/domUtils.js';
import { loadI18n, applyI18nDom, t, getCurrentLang } from '../shared/i18n.js';

const validarClienteUnit = validarCliente;

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
const logoutBtn = document.getElementById('logoutBtn');
const userInfoBox = document.getElementById('userInfo');
const editModal = document.getElementById('editModal');
const modalTitle = document.getElementById('modalTitle');
const saveEditBtn = document.getElementById('saveEdit');
const cancelEditBtn = document.getElementById('cancelEdit');
let listaConsultorEl = null;
let listaStatusFiltradoEl = null;
let maquinasChartCanvas = null;
let maquinasChartLegendEl = null;
let maquinasChartInstance = null;
let chartJsLoaderPromise = null;
// Inicializa gerenciador de toasts (se container não existir será criado)
const toast = mountToastManager({});
const chatbotWidget = document.getElementById('chatbot-widget');
const headerTop = document.querySelector('.crm-header-top');
const sidebar = document.getElementById('crmSidebar');
const sidebarToggleBtn = document.getElementById('sidebarToggle');
const sidebarOverlay = document.getElementById('sidebarOverlay');
const SIDEBAR_COLLAPSED_CLASS = 'sidebar-collapsed';
const SIDEBAR_EXPANDED_CLASS = 'sidebar-expanded';
const SIDEBAR_MEDIA_QUERY = '(max-width: 768px)';
const sidebarMediaQuery = window.matchMedia(SIDEBAR_MEDIA_QUERY);
let navMenuItems = [];
const SIDEBAR_STATE_KEY='crm:sidebar-state';
// Restaura estado colapsado/expandido (somente mobile)
const savedSidebarState = localStorage.getItem(SIDEBAR_STATE_KEY);
if(savedSidebarState==='expanded') document.body.classList.add(SIDEBAR_EXPANDED_CLASS);
if(savedSidebarState==='collapsed') document.body.classList.add(SIDEBAR_COLLAPSED_CLASS);
let sidebarOverlayHideTimeout = null;

function safeLocalStorageSetItem(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch (err) {
    console.debug('[CRM] Persistência localStorage indisponível', err?.message);
  }
}

function isMobileSidebarMode() {
  return sidebarMediaQuery.matches;
}

function updateSidebarAccessibility(forceDesktop = false) {
  if (!navMenuItems || navMenuItems.length === 0) return;
  const collapsed = !forceDesktop && document.body.classList.contains(SIDEBAR_COLLAPSED_CLASS) && !document.body.classList.contains(SIDEBAR_EXPANDED_CLASS) && isMobileSidebarMode();
  navMenuItems.forEach(item => {
    if (!item) return;
    const text = item.querySelector('span')?.textContent?.trim() || item.textContent.trim();
    if (!text) return;
    item.setAttribute('aria-label', text);
    if (collapsed) item.setAttribute('title', text); else item.removeAttribute('title');
  });
}

function setSidebarState(state) {
  if (!sidebar || !isMobileSidebarMode()) return;
  clearTimeout(sidebarOverlayHideTimeout);
  if (state === 'expanded') {
    document.body.classList.add(SIDEBAR_EXPANDED_CLASS);
    document.body.classList.remove(SIDEBAR_COLLAPSED_CLASS);
    sidebarToggleBtn?.setAttribute('aria-expanded', 'true');
    sidebarToggleBtn?.setAttribute('aria-label', 'Fechar menu');
    if (sidebarOverlay) {
      sidebarOverlay.removeAttribute('hidden');
    }
    const activeMenu = navMenuItems?.find(item => item?.classList.contains('active')) || navMenuItems?.[0];
    if (activeMenu) {
      requestAnimationFrame(() => activeMenu.focus());
    }
  } else {
    document.body.classList.add(SIDEBAR_COLLAPSED_CLASS);
    document.body.classList.remove(SIDEBAR_EXPANDED_CLASS);
    sidebarToggleBtn?.setAttribute('aria-expanded', 'false');
    sidebarToggleBtn?.setAttribute('aria-label', 'Abrir menu');
    if (sidebarOverlay) {
      sidebarOverlayHideTimeout = setTimeout(() => {
        if (!document.body.classList.contains(SIDEBAR_EXPANDED_CLASS)) {
          sidebarOverlay.setAttribute('hidden', '');
        }
      }, 220);
    }
  }
  // Persiste
  safeLocalStorageSetItem(SIDEBAR_STATE_KEY, state);
  updateSidebarAccessibility();
}

function syncSidebarForViewport() {
  if (!sidebar) return;
  clearTimeout(sidebarOverlayHideTimeout);
  if (isMobileSidebarMode()) {
    if (!document.body.classList.contains(SIDEBAR_COLLAPSED_CLASS) && !document.body.classList.contains(SIDEBAR_EXPANDED_CLASS)) {
      document.body.classList.add(SIDEBAR_COLLAPSED_CLASS);
    }
    if (document.body.classList.contains(SIDEBAR_EXPANDED_CLASS)) {
      sidebarOverlay?.removeAttribute('hidden');
    } else {
      sidebarOverlay?.setAttribute('hidden', '');
    }
    sidebarToggleBtn?.setAttribute('aria-expanded', document.body.classList.contains(SIDEBAR_EXPANDED_CLASS) ? 'true' : 'false');
    sidebarToggleBtn?.setAttribute('aria-label', document.body.classList.contains(SIDEBAR_EXPANDED_CLASS) ? 'Fechar menu' : 'Abrir menu');
    updateSidebarAccessibility();
  } else {
    document.body.classList.remove(SIDEBAR_COLLAPSED_CLASS, SIDEBAR_EXPANDED_CLASS);
    sidebarOverlay?.setAttribute('hidden', '');
    sidebarToggleBtn?.setAttribute('aria-expanded', 'false');
    sidebarToggleBtn?.setAttribute('aria-label', 'Abrir menu');
    updateSidebarAccessibility(true);
  }
}

syncSidebarForViewport();

if (sidebarMediaQuery.addEventListener) {
  sidebarMediaQuery.addEventListener('change', syncSidebarForViewport);
} else if (sidebarMediaQuery.addListener) {
  sidebarMediaQuery.addListener(syncSidebarForViewport);
}

sidebarToggleBtn?.addEventListener('click', () => {
  if (!isMobileSidebarMode()) return;
  const expanded = document.body.classList.contains(SIDEBAR_EXPANDED_CLASS);
  setSidebarState(expanded ? 'collapsed' : 'expanded');
});

sidebarOverlay?.addEventListener('click', () => {
  setSidebarState('collapsed');
  sidebarToggleBtn?.focus();
});

// Logout + enhancements (confirm dialog animado, tooltip persistente, avatar & polling user)
if (logoutBtn) {
  logoutBtn.addEventListener('click', async () => {
    const confirmed = await (async ()=> new Promise(res => {
      const wrap = document.createElement('div');
      wrap.className='confirm-dialog-backdrop';
      wrap.innerHTML = `<div class="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="lg-title">
        <h3 id="lg-title">Confirmar Logout</h3>
        <p>Deseja realmente encerrar a sessão?</p>
        <div class="confirm-actions">
          <button type="button" data-act="cancel" class="btn btn-ghost">Cancelar</button>
          <button type="button" data-act="ok" class="btn btn-danger">Sair</button>
        </div>
      </div>`;
      document.body.appendChild(wrap);
      const dialog = wrap.querySelector('.confirm-dialog');
      dialog.style.animation='dialogIn .22s ease';
      const done = (v)=>{
        if (dialog) {
          dialog.style.animation='dialogOut .22s forwards ease';
          wrap.style.animation='fadeBackdrop .25s forwards ease';
          setTimeout(()=> wrap.remove(), 210);
        } else wrap.remove();
        res(v);
      };
      wrap.addEventListener('click', e=>{ if(e.target===wrap) done(false); });
      wrap.querySelector('[data-act="cancel"]').onclick=()=>done(false);
      wrap.querySelector('[data-act="ok"]').onclick=()=>done(true);
      const escHandler = (e)=>{ if(e.key==='Escape'){ done(false); window.removeEventListener('keydown', escHandler);} };
      window.addEventListener('keydown', escHandler);
    }))();
    if (!confirmed) return;
    try {
      await fetch('/api/auth/logout', { method:'POST', credentials:'include' });
    } catch (err) {
      console.warn('[CRM] Falha ao encerrar sessão', err?.message);
    }
    window.location.href = '/';
  });
}

// (Botão de logout removido) – código de tooltip legado eliminado

let lastUserHash='';
async function carregarUsuarioAtual(){
  if(!userInfoBox) return;
  try {
    const r = await fetch('/api/auth/me', { credentials:'include' });
    if(!r.ok) return;
    const { user } = await r.json(); if(!user) return;
    const nome = user.nome || 'Usuário'; const email = user.email || '';
    const avatar = nome.trim().charAt(0).toUpperCase();
    const html = `<div class="user-mini" style="display:flex;align-items:center;gap:.55rem;cursor:pointer;" data-user-menu="1">
      <div class="user-avatar" aria-hidden="true">${avatar}</div>
      <div class="user-meta" style="display:flex;flex-direction:column;align-items:flex-start;">
        <strong>${nome}</strong>
        <span>${email}</span>
      </div>
    </div>`;
    const hash = nome+'|'+email;
    if (hash !== lastUserHash) { userInfoBox.innerHTML = html; lastUserHash = hash; }
    inicializarUserInteractions(nome,email);
    userInfoBox.dataset.loaded='1';
  } catch(err) { console.error('[CRM] Falha ao carregar usuário atual', err); }
}
carregarUsuarioAtual();
setInterval(carregarUsuarioAtual, 30000).unref?.();

let userTooltipEl=null; let userMenuEl=null; let userTooltipTimer=null;
const USER_TOOLTIP_HIDE_KEY='crm:hideUserTooltip';
function showUserTooltip(target,nome,email){
  // Exibir tooltip quando sidebar colapsada (mobile) ou se futuramente houver modo colapsado desktop
  const sidebarCollapsed = document.body.classList.contains(SIDEBAR_COLLAPSED_CLASS) || (isMobileSidebarMode() && !document.body.classList.contains(SIDEBAR_EXPANDED_CLASS));
  if(!sidebarCollapsed) return;
  if(localStorage.getItem(USER_TOOLTIP_HIDE_KEY)==='1') return;
  hideUserTooltip();
  userTooltipEl=document.createElement('div');
  userTooltipEl.className='user-tooltip';
    userTooltipEl.innerHTML=`<strong style="display:block;font-size:.65rem;letter-spacing:.5px;margin-bottom:2px;">${nome}</strong>
      <span style="font-size:.6rem;opacity:.75;word-break:break-all;">${email}</span>
      <button type="button" data-act="never" style="margin-top:6px;background:#374151;border:1px solid rgba(255,255,255,.1);color:#fff;font-size:.55rem;padding:4px 6px;border-radius:6px;cursor:pointer;display:inline-flex;gap:4px;align-items:center;">Não mostrar de novo</button>`;
  document.body.appendChild(userTooltipEl);
  const r=target.getBoundingClientRect();
  userTooltipEl.style.top=(r.top-8)+'px';
  userTooltipEl.style.left=(r.left + r.width/2)+'px';
  userTooltipEl.style.transform='translate(-50%, -100%)';
  userTooltipTimer=setTimeout(()=> hideUserTooltip(), 6000);
  userTooltipEl.querySelector('[data-act="never"]').addEventListener('click', (e)=>{
    e.stopPropagation();
    safeLocalStorageSetItem(USER_TOOLTIP_HIDE_KEY,'1');
    hideUserTooltip();
  });
}
function hideUserTooltip(){ if(userTooltipEl){ userTooltipEl.remove(); userTooltipEl=null; } if(userTooltipTimer){ clearTimeout(userTooltipTimer); userTooltipTimer=null; } }

function toggleUserMenu(target){
  console.debug('[CRM] toggleUserMenu invoked', { hasMenu: !!userMenuEl });
  if(userMenuEl){ hideUserMenu(); return; }
  userMenuEl=document.createElement('div');
    userMenuEl.className='user-menu';
    userMenuEl.innerHTML=`<ul>
      <li data-act="perfil"><i class="fa-solid fa-id-card"></i> Perfil</li>
      <li data-act="refresh"><i class="fa-solid fa-rotate"></i> Atualizar sessão</li>
      <li class="danger" data-act="logout"><i class="fa-solid fa-right-from-bracket"></i> Sair</li>
    </ul>`;
  document.body.appendChild(userMenuEl);
  positionUserMenu(target);
  const onClick=(e)=>{
    const act=e.target.closest('li')?.dataset?.act;
    if(act==='logout'){ confirmarLogoutMenu(); }
    else if(act==='refresh'){ carregarUsuarioAtual(); }
    else if(act==='perfil'){ window.location.href='/perfil'; }
    hideUserMenu();
  };
  userMenuEl.addEventListener('click', onClick, { once:false });
  window.addEventListener('click', outsideHandler, { capture:true, once:false });
  window.addEventListener('keydown', escHandler);
  function outsideHandler(ev){ if(!userMenuEl) return; if(!userMenuEl.contains(ev.target) && !target.contains(ev.target)){ hideUserMenu(); } }
  function escHandler(ev){ if(ev.key==='Escape'){ hideUserMenu(); } }
  function hideUserMenu(){
    if(!userMenuEl) return;
    userMenuEl.remove(); userMenuEl=null;
    window.removeEventListener('click', outsideHandler, { capture:true });
    window.removeEventListener('keydown', escHandler);
  }
}
function positionUserMenu(target){
  if(!userMenuEl) return;
  const r=target.getBoundingClientRect();
  userMenuEl.style.top=(r.top + r.height + 8)+'px';
  userMenuEl.style.left=(r.left + Math.min(r.width,180)/2)+'px';
  userMenuEl.style.transform='translate(-50%,0)';
}
window.addEventListener('resize', ()=> { if(userMenuEl){ positionUserMenu(userInfoBox); } });
// Fallback de delegação para garantir abertura do menu em casos de falha de binding direto
userInfoBox?.addEventListener('click', (e)=>{
  const mini = userInfoBox.querySelector('.user-mini');
  if(!mini) return;
  if(e.target.closest('.user-mini')){
    toggleUserMenu(mini);
  }
});
if(!window.__crmUserGlobalDelegation){
  window.__crmUserGlobalDelegation=true;
  document.addEventListener('click',(e)=>{
    const trigger = e.target.closest('.user-mini');
    if(!trigger) return;
    if(!trigger.parentElement || trigger.parentElement.id!=='userInfo') return;
    toggleUserMenu(trigger);
  });
}

function inicializarUserInteractions(nome,email){
  const mini = userInfoBox.querySelector('.user-mini'); if(!mini) return;
  console.debug('[CRM] inicializarUserInteractions found mini, binding events');
  mini.onmouseenter=()=> showUserTooltip(mini,nome,email);
  mini.onmouseleave=()=> hideUserTooltip();
  mini.onclick=(e)=> { e.stopPropagation(); toggleUserMenu(mini); };
  mini.onkeydown=(e)=> { if(e.key==='Enter' || e.key===' '){ e.preventDefault(); toggleUserMenu(mini);} };
  mini.setAttribute('tabindex','0');
  mini.setAttribute('role','button');
  mini.setAttribute('aria-label','Abrir menu do usuário');
}

async function confirmarLogoutMenu(){
  // Reuso do padrão de confirmação animada já existente (mesmo approach do botão logout removido)
  const confirmed = await (async ()=> new Promise(res => {
    const wrap = document.createElement('div');
    wrap.className='confirm-dialog-backdrop';
    wrap.innerHTML = `<div class="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="lg-title">
      <h3 id="lg-title">Confirmar Logout</h3>
      <p>Deseja realmente encerrar a sessão?</p>
      <div class="confirm-actions">
        <button type="button" data-act="cancel" class="btn btn-ghost">Cancelar</button>
        <button type="button" data-act="ok" class="btn btn-danger">Sair</button>
      </div>
    </div>`;
    document.body.appendChild(wrap);
    const dialog = wrap.querySelector('.confirm-dialog');
    dialog.style.animation='dialogIn .22s ease';
    const done = (v)=>{
      if (dialog) {
        dialog.style.animation='dialogOut .22s forwards ease';
        wrap.style.animation='fadeBackdrop .25s forwards ease';
        setTimeout(()=> wrap.remove(), 210);
      } else wrap.remove();
      res(v);
    };
    wrap.addEventListener('click', e=>{ if(e.target===wrap) done(false); });
    wrap.querySelector('[data-act="cancel"]').onclick=()=>done(false);
    wrap.querySelector('[data-act="ok"]').onclick=()=>done(true);
    const escHandler = (e)=>{ if(e.key==='Escape'){ done(false); window.removeEventListener('keydown', escHandler);} };
    window.addEventListener('keydown', escHandler);
  }))();
  if(!confirmed) return;
  try {
    await fetch('/api/auth/logout',{method:'POST',credentials:'include'});
  } catch (err) {
    console.warn('[CRM] Logout via menu falhou', err?.message);
  }
  window.location.href='/';
}

window.addEventListener('keydown', e => {
  if (e.key === 'Escape' && isMobileSidebarMode() && document.body.classList.contains(SIDEBAR_EXPANDED_CLASS)) {
    setSidebarState('collapsed');
    sidebarToggleBtn?.focus();
  }
});

let analyticsPanelsEl = null;
let emptyStateEl = null;
let emptyMsgEl = null;
let clearFiltersBtn = null;
let consultoresSearchToggleOriginalParent = null;
const CLIENTES_EVENT = 'crm:clientes-atualizados';

function notificarClientesAtualizados() {
  document.dispatchEvent(new CustomEvent(CLIENTES_EVENT));
}

let sincronizandoClientes = false;
async function sincronizarClientesRemotos({ silent = false, force = false } = {}) {
  if (sincronizandoClientes) return;
  sincronizandoClientes = true;
  if (totalClientes) totalClientes.dataset.loading = '1';
  try {
    await crm.carregarRemoto({ force });
    atualizarFiltrosDinamicos?.();
    atualizarLista();
    notificarClientesAtualizados();
    if (!silent) toast('Clientes sincronizados com o servidor','info');
  } catch (err) {
    console.error('[CRM] Falha ao sincronizar clientes com o servidor', err);
    if (!silent) toast('Não foi possível sincronizar clientes agora','erro');
  } finally {
    sincronizandoClientes = false;
    if (totalClientes) totalClientes.dataset.loading = '0';
  }
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

// toast() agora fornecido via mountToastManager

const fields = {
  nome: document.getElementById('editNome'),
  email: document.getElementById('editEmail'),
  telefone: document.getElementById('editTelefone'),
  cidade: document.getElementById('editCidade'),
  maquina: document.getElementById('editMaquina'), 
  horario: document.getElementById('editHorario'),
  consultor: document.getElementById('editConsultor'),
  notas: document.getElementById('editNotas')
};
fields.status = document.getElementById('editStatus');
let campoEspecialidadeWrapper = null; 
let campoEspecialidadeInput = null;  
let campoEspecialidadeList = null;  
let campoEspecialidadeHidden = null;  
let especialidadeActiveIndex = -1;  

function popularSelectMaquinas(valorAtual = '') {
  if (!fields.maquina) return;
  const atual = valorAtual || fields.maquina.value || '';
  const select = fields.maquina;
  const existente = new Set();
  select.innerHTML = '';

  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = 'Selecione uma máquina';
  select.appendChild(placeholder);

  MAQUINAS.forEach(item => {
    if (existente.has(item)) return;
    existente.add(item);
    const opt = document.createElement('option');
    opt.value = item;
    opt.textContent = item;
    select.appendChild(opt);
  });

  if (atual) {
    if (!existente.has(atual)) {
      const optCustom = document.createElement('option');
      optCustom.value = atual;
      optCustom.textContent = `${atual} (não cadastrada)`;
      select.appendChild(optCustom);
    }
    select.value = atual;
  } else {
    select.value = '';
  }
}

function atualizarSelectConsultores(maquinaSelecionada = '', consultorSelecionado = '') {
  if (!fields.consultor) return;
  const select = fields.consultor;
  const maquina = (maquinaSelecionada || '').trim();
  const atual = (consultorSelecionado || '').trim();
  select.innerHTML = '';

  if (!maquina) {
    select.disabled = true;
    const opt = document.createElement('option');
    opt.value = '';
    opt.textContent = 'Selecione uma máquina primeiro';
    select.appendChild(opt);
    select.value = '';
    return;
  }

  const lista = CONSULTOR_LIST.filter(c => (c.especialidade || '').toLowerCase() === maquina.toLowerCase())
    .sort((a,b) => (a.nome||'').localeCompare(b.nome||'', 'pt-BR'));

  if (lista.length === 0) {
    select.disabled = true;
    const opt = document.createElement('option');
    opt.value = '';
    opt.textContent = 'Nenhum consultor disponível';
    select.appendChild(opt);
    select.value = '';
    return;
  }

  select.disabled = false;
  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = 'Selecione um consultor';
  select.appendChild(placeholder);

  lista.forEach(item => {
    const opt = document.createElement('option');
    opt.value = item.nome;
    opt.textContent = item.nome;
    select.appendChild(opt);
  });

  if (atual) {
    const existe = lista.some(item => item.nome === atual);
    if (!existe) {
      const optExtra = document.createElement('option');
      optExtra.value = atual;
      optExtra.textContent = `${atual} (especialidade diferente)`;
      select.appendChild(optExtra);
    }
    select.value = atual;
  } else {
    select.value = '';
  }
}

function resetConsultorField() {
  if (!fields.consultor) return;
  fields.consultor.disabled = true;
  fields.consultor.innerHTML = '<option value="">Selecione uma máquina primeiro</option>';
  fields.consultor.value = '';
}

popularSelectMaquinas(fields.maquina?.value || '');
if (fields.maquina && fields.maquina.value) {
  atualizarSelectConsultores(fields.maquina.value, fields.consultor?.value || '');
} else {
  resetConsultorField();
}

if (fields.maquina) {
    fields.maquina.addEventListener('change', () => {
      atualizarSelectConsultores(fields.maquina.value, '');
      if (fields.consultor) {
        fields.consultor.classList.remove('input-error');
        const next = fields.consultor.nextElementSibling;
        if (next && next.classList.contains('field-error')) next.remove();
      }
    });
}

if (fields.consultor) {
  fields.consultor.addEventListener('change', () => {
    fields.consultor.classList.remove('input-error');
    const next = fields.consultor.nextElementSibling;
    if (next && next.classList.contains('field-error')) next.remove();
  });
}

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

function selecionarConsultorPorMaquina(maquina) {
  if (!maquina) return null;
  const alvoNorm = maquina.toLowerCase();
  const candidatos = CONSULTOR_LIST.filter(c => (c.especialidade||'').toLowerCase() === alvoNorm);
  if (candidatos.length === 0) return null;
  const escolhido = candidatos[Math.floor(Math.random()*candidatos.length)];
  return escolhido?.nome || null;
}

async function reatribuirConsultoresClientesExistentes() {
  let alterados = 0;
  for (const cli of crm.listar()) {
    if (!cli.maquina) continue;
    const atual = cli.consultor;
    const objAtual = atual && CONSULTOR_LIST.find(c => c.nome === atual);
    const precisaReatribuir = !atual || !objAtual || (objAtual.especialidade || '').toLowerCase() !== (cli.maquina || '').toLowerCase();
    if (precisaReatribuir) {
      const novo = selecionarConsultorPorMaquina(cli.maquina);
      if (novo && novo !== atual) {
        try {
          await crm.atualizar(cli.id, { consultor: novo });
          alterados++;
        } catch (err) {
          console.error('[CRM] Falha ao reatribuir consultor automaticamente', err);
        }
      }
    }
  }
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
  if (!clientesContainer) return;
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
  atualizarClearFiltersVisibility();
}

function bindSearch() {
  if (!searchInput) return;
  const run = debounce(() => atualizarLista(), 120);
  searchInput.addEventListener('input', run);
}

function contarFiltrosAtivos() {
  let count = 0;
  if (filtroCidade && filtroCidade.value) count++;
  if (filtroMaquina && filtroMaquina.value) count++;
  if (filtroConsultor && filtroConsultor.value) count++;
  if (filtroStatus && filtroStatus.value) count++;
  if (activeFiltersBadge) {
    if (count > 0) {
      activeFiltersBadge.style.display = 'inline-block';
      activeFiltersBadge.textContent = String(count);
    } else {
      activeFiltersBadge.style.display = 'none';
    }
  }
  atualizarClearFiltersVisibility();
}

function hasFiltrosAplicados() {
  const buscaAtiva = !!(searchInput && searchInput.value && searchInput.value.trim());
  return Boolean(
    buscaAtiva ||
    (filtroCidade && filtroCidade.value) ||
    (filtroMaquina && filtroMaquina.value) ||
    (filtroConsultor && filtroConsultor.value) ||
    (filtroStatus && filtroStatus.value)
  );
}

function atualizarClearFiltersVisibility() {
  if (!clearFiltersBtn) return;
  const deveMostrar = hasFiltrosAplicados();
  clearFiltersBtn.style.display = deveMostrar ? 'inline-flex' : 'none';
  clearFiltersBtn.setAttribute('aria-hidden', deveMostrar ? 'false' : 'true');
  clearFiltersBtn.tabIndex = deveMostrar ? 0 : -1;
}

function limparFiltros({ incluirBusca = true } = {}) {
  if (incluirBusca && searchInput) {
    searchInput.value = '';
  }
  [filtroCidade, filtroMaquina, filtroConsultor, filtroStatus].forEach(select => {
    if (select) select.value = '';
  });
}

function handleClearFiltersClick(event) {
  event.preventDefault();
  if (!hasFiltrosAplicados()) {
    atualizarClearFiltersVisibility();
    return;
  }
  limparFiltros();
  currentPage = 1;
  contarFiltrosAtivos();
  atualizarLista();
  fecharPainelFiltros();
}

function bindAdvancedFilters() {
  applyAdvancedFiltersBtn && applyAdvancedFiltersBtn.addEventListener('click', () => {
    currentPage = 1;
    atualizarLista();
    contarFiltrosAtivos();
    fecharPainelFiltros();
  });
  clearAdvancedFiltersBtn && clearAdvancedFiltersBtn.addEventListener('click', () => {
    limparFiltros({ incluirBusca: false });
    currentPage = 1;
    atualizarLista();
    contarFiltrosAtivos();
  });
}

function abrirPainelFiltros() {
  if (!advancedFiltersPanel || !toggleAdvancedFiltersBtn) return;
  advancedFiltersPanel.style.display = 'flex';
  toggleAdvancedFiltersBtn.setAttribute('aria-expanded','true');
  toggleAdvancedFiltersBtn.setAttribute('aria-pressed','true');
}
function fecharPainelFiltros() {
  if (!advancedFiltersPanel || !toggleAdvancedFiltersBtn) return;
  advancedFiltersPanel.style.display = 'none';
  toggleAdvancedFiltersBtn.setAttribute('aria-expanded','false');
  toggleAdvancedFiltersBtn.setAttribute('aria-pressed','false');
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

// preencherSelect substituído por populateSelect helper

const MAQUINAS_CHART_PALETTE = ['#6366F1','#8B5CF6','#A855F7','#EC4899','#F472B6','#38BDF8','#22D3EE','#34D399','#FCD34D','#F97316'];

function ensureChartJs() {
  if (window.Chart) return Promise.resolve(window.Chart);
  if (!chartJsLoaderPromise) {
    chartJsLoaderPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.4/dist/chart.umd.min.js';
      script.async = true;
      script.onload = () => resolve(window.Chart);
      script.onerror = () => reject(new Error('Falha ao carregar Chart.js'));
      document.head.appendChild(script);
    });
  }
  return chartJsLoaderPromise;
}

function hexToRgba(hex, alpha = 1) {
  const normalized = hex.replace('#','');
  const bigint = parseInt(normalized, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function getMaquinaColor(index, alpha = 0.85) {
  const hex = MAQUINAS_CHART_PALETTE[index % MAQUINAS_CHART_PALETTE.length];
  return hexToRgba(hex, alpha);
}

function updateMaquinasLegend(labels, values, total) {
  if (!maquinasChartLegendEl) return;
  if (!total) {
    maquinasChartLegendEl.innerHTML = '<p class="chart-empty">Nenhum cliente filtrado.</p>';
    return;
  }
  const html = labels.map((label, idx) => {
    const count = values[idx];
    const percent = total ? Math.round((count / total) * 1000) / 10 : 0;
    const labelText = label || '—';
    return `<div class="chart-legend-item">
      <strong><span class="chart-color-dot" style="background:${getMaquinaColor(idx, 1)}"></span>${labelText}</strong>
      <span class="chart-legend-value">${count} <span class="chart-legend-percent">(${percent.toLocaleString('pt-BR', { minimumFractionDigits: percent % 1 === 0 ? 0 : 1, maximumFractionDigits: 1 })}%)</span></span>
    </div>`;
  }).join('');
  maquinasChartLegendEl.innerHTML = html;
}

function renderMaquinasChart(porMaquina) {
  if (!maquinasChartCanvas || !maquinasChartLegendEl) return;
  const labels = Object.keys(porMaquina).sort((a,b)=>a.localeCompare(b,'pt-BR'));
  const values = labels.map(label => porMaquina[label]);
  const total = values.reduce((acc, n) => acc + n, 0);

  const ctx = maquinasChartCanvas.getContext('2d');
  if (maquinasChartInstance) {
    maquinasChartInstance.destroy();
    maquinasChartInstance = null;
  }

  if (!total) {
    updateMaquinasLegend([], [], 0);
    if (ctx) ctx.clearRect(0, 0, maquinasChartCanvas.width || 300, maquinasChartCanvas.height || 300);
    return;
  }

  updateMaquinasLegend(labels, values, total);

  const createChart = () => {
    if (!ctx) return;
    const Chart = window.Chart;
    if (!Chart) return;
    maquinasChartInstance = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data: values,
          backgroundColor: labels.map((_, idx) => getMaquinaColor(idx, 0.82)),
          hoverBackgroundColor: labels.map((_, idx) => getMaquinaColor(idx, 0.95)),
          borderWidth: 0,
          hoverOffset: 10,
          spacing: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '50%',
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            backgroundColor: 'rgba(15,23,42,0.92)',
            borderColor: 'rgba(255,255,255,0.08)',
            borderWidth: 1,
            padding: 12,
            titleColor: '#F8FAFC',
            bodyColor: '#E2E8F0',
            displayColors: false,
            callbacks: {
              label(context) {
                const value = context.parsed;
                const pct = Math.round((value / total) * 1000) / 10;
                const pctLabel = pct.toLocaleString('pt-BR', { minimumFractionDigits: pct % 1 === 0 ? 0 : 1, maximumFractionDigits: 1 });
                return `${value} cliente${value!==1?'s':''} (${pctLabel}%)`;
              }
            }
          }
        },
        animation: {
          animateScale: true,
          animateRotate: true
        }
      }
    });
  };

  if (window.Chart) {
    createChart();
  } else {
    ensureChartJs().then(createChart).catch(err => console.error('[CRM] Falha ao inicializar gráfico de máquinas', err));
  }
}

function atualizarFiltrosDinamicos() {
  if (!filtroCidade) return; 
  const todos = crm.listar();
  populateSelect(filtroCidade, todos.map(c => c.cidade));
  populateSelect(filtroMaquina, todos.map(c => c.maquina));
  populateSelect(filtroConsultor, todos.map(c => c.consultor));
  populateSelect(filtroStatus, todos.map(c => c.status));
}

function atualizarAnaliticosFiltrados(lista) {
  if (!listaConsultorEl || !listaStatusFiltradoEl) return;
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
  renderMaquinasChart(porMaquina);
}

function abrirModalEdicao(id) {
  isNew = false;
  editId = id;
  modalTitle.textContent = 'Editar Cliente';
  const cliente = crm.obter(id);
  preencherModal(cliente, fields);
  restaurarCamposCliente();
  mostrarCampoComLabel(fields.notas);
  atualizarSelectConsultores(cliente?.maquina || '', cliente?.consultor || '');
  mostrarModal();
}

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
      }, { once: true });
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
  const { valid, errors, value } = validarClienteUnit(data);
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

async function salvarEdicaoInline(card, id) {
  const data = coletarEdicaoInline(card);
  const { valid, errors, value } = validarInline(data);
  if (!valid) { exibirErrosInline(card, errors); return; }
  const original = crm.obter(id);
  let payload = { ...value };
  if (value.maquina) {
    const precisa = !original.consultor || (original.maquina && original.maquina !== value.maquina);
    if (precisa) {
      const novoCons = selecionarConsultorPorMaquina(value.maquina);
      if (novoCons) payload.consultor = novoCons; else if (!original.consultor) payload.consultor = null;
    }
  }
  try {
    await crm.atualizar(id, payload);
    notificarClientesAtualizados();
    toast('Alterações salvas','sucesso');
    inlineEditingId = null;
    atualizarLista();
  } catch (err) {
    console.error('[CRM] Falha ao salvar edição inline', err);
    toast('Não foi possível salvar as alterações','erro');
  }
}

function cancelarEdicaoInline() {
  inlineEditingId = null;
  atualizarLista();
}

async function excluirCliente(id) {
  const ok = await confirmar('Tem certeza que deseja excluir este cliente?');
  if (!ok) return;
  try {
    await crm.remover(id);
    notificarClientesAtualizados();
    atualizarLista();
    toast('Cliente excluído','sucesso');
  } catch (err) {
    console.error('[CRM] Falha ao excluir cliente', err);
    const offline = crm.obter(id);
    if (offline?.__offline) {
      const removed = crm.removerOffline(id);
      if (removed) {
        notificarClientesAtualizados();
        atualizarLista();
        toast('Cliente offline removido localmente','info');
        return;
      }
    }
    toast('Não foi possível excluir o cliente agora','erro');
  }
}

addClientBtn.onclick = () => {
  modoConsultor = false;
  isNew = true;
  editId = null;
  modalTitle.textContent = 'Novo Cliente';
  Object.values(fields).forEach(i => i && (i.value = ''));
  if (fields.status) fields.status.value = 'novo';
  popularSelectMaquinas('');
  resetConsultorField();
  atualizarSelectConsultores('', '');
  mostrarCampoComLabel(fields.consultor);
  fields.consultor?.classList.remove('input-error');
  limparErros(fields);
  restaurarCamposCliente();
  ocultarCampoComLabel(fields.notas);
  if (fields.notas) fields.notas.value = '';
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
  ocultarCampoComLabel(fields.consultor);
  ocultarCampoComLabel(fields.notas);
  resetConsultorField();
  prepararCampoEspecialidade();
  limparErros(fields);
  mostrarModal();
}

saveEditBtn.onclick = async () => {
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
  const consultorSelecionado = fields.consultor ? fields.consultor.value : '';
  const dados = {
    nome: fields.nome.value,
    email: fields.email.value,
    telefone: fields.telefone.value,
    cidade: fields.cidade.value,
    maquina: fields.maquina.value,
    horario: fields.horario.value,
    status: fields.status.value,
    consultor: consultorSelecionado
  };
  if (!isNew && fields.notas) {
    dados.notas = fields.notas.value;
  }
  if (fields.consultor && !fields.consultor.disabled && !consultorSelecionado) {
    exibirErrosModal([{ field: 'consultor', message: 'Selecione um consultor' }], fields);
    return;
  }
  const { valid, errors, value } = validarCliente(dados);
  if (!valid) {
    exibirErrosModal(errors, fields);
    return;
  }
  value.consultor = consultorSelecionado;
  const statusEntrada = dados.status ?? 'novo';
  if (typeof statusEntrada === 'string') {
    const trimmed = statusEntrada.trim();
    value.status = trimmed || 'novo';
  } else {
    value.status = statusEntrada || 'novo';
  }
  limparErros(fields);
  let novoId = null;
  let fallbackOffline = false;
  if (isNew) {
    if (!value.consultor && value.maquina) {
      const cons = selecionarConsultorPorMaquina(value.maquina);
      if (cons) value.consultor = cons;
    }
    value.status = value.status || 'novo';
    value.origem = value.origem || 'manual';
    try {
      const criado = await crm.adicionar(value);
      novoId = criado?.id ?? null;
      toast('Cliente adicionado com sucesso','sucesso');
    } catch (err) {
      console.error('[CRM] Falha ao adicionar cliente via API, usando fallback local', err);
      const offline = crm.adicionarOffline(value);
      novoId = offline?.id ?? null;
      fallbackOffline = true;
      toast('Cliente salvo localmente (sem conexão). Sincronize quando possível.','info');
    }
    notificarClientesAtualizados();
  } else {
    const original = crm.obter(editId);
    if (value.maquina) {
      const objAtual = original?.consultor && CONSULTOR_LIST.find(c => c.nome === original.consultor);
      const incompat = objAtual && objAtual.especialidade && objAtual.especialidade !== value.maquina;
      const precisaReatribuir = !consultorSelecionado && (!original?.consultor || original.maquina !== value.maquina || incompat);
      if (precisaReatribuir) {
        const novoCons = selecionarConsultorPorMaquina(value.maquina);
        if (novoCons) value.consultor = novoCons;
      }
    }
    try {
      await crm.atualizar(editId, value);
      toast('Cliente atualizado','sucesso');
    } catch (err) {
      console.error('[CRM] Falha ao atualizar cliente', err);
      const offline = crm.obter(editId);
      if (offline?.__offline) {
        const ok = crm.atualizarOffline(editId, value);
        if (ok) {
          fallbackOffline = true;
          toast('Cliente offline atualizado localmente','info');
        } else {
          toast('Não foi possível atualizar o cliente agora','erro');
          return;
        }
      } else {
        toast('Não foi possível atualizar o cliente agora','erro');
        return;
      }
    }
    notificarClientesAtualizados();
    novoId = editId;
  }
  fecharModal();
  atualizarFiltrosDinamicos();
  atualizarLista();
  if (!fallbackOffline) {
    sincronizarClientesRemotos({ silent: true }).catch(err => console.debug('[CRM] Sync pós-salvamento ignorada', err));
  }
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

const menuClientes = document.getElementById('menu-clientes');
const menuConsultores = document.getElementById('menu-consultores');
const menuSobre = document.getElementById('menu-sobre');
const menuItems = [menuClientes, menuConsultores, menuSobre];
navMenuItems = menuItems;
updateSidebarAccessibility(!isMobileSidebarMode());

async function showSection(section, opts = {}) {
  const valid = ['clientes','consultores','sobre'];
  if (!valid.includes(section)) section = 'clientes';
  await swapView(section);
  // Garantir que o botão de busca de consultores não 'vaze' para outras seções
  if (section !== 'consultores') {
    const straySearchToggle = document.getElementById('consultores-search-toggle');
    if (straySearchToggle) {
      // Se ele estiver dentro das ações do header global, removemos do DOM;
      // ao voltar para consultores o HTML original (consultores.html) recria o botão.
      if (straySearchToggle.parentElement && straySearchToggle.parentElement.classList.contains('crm-header-actions')) {
        straySearchToggle.remove();
      }
    }
    // Remove classe de layout especial caso tenha sido aplicada
    const headerActions = document.querySelector('.crm-header-actions.consultores-actions-inline');
    if (headerActions) headerActions.classList.remove('consultores-actions-inline');
  }
  const targetMenu = menuItems.find(m=>m.id==='menu-'+section);
  if (targetMenu) setActiveMenu(targetMenu);
  if (isMobileSidebarMode()) setSidebarState('collapsed');
  const isSobre = section === 'sobre';
  if (headerTop) headerTop.style.display = isSobre ? 'none' : '';
  if (chatbotWidget) {
    if (section === 'clientes') chatbotWidget.style.display = 'flex';
    else chatbotWidget.style.display = 'none';
  }
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
        popularSelectMaquinas('');
        resetConsultorField();
        atualizarSelectConsultores('', '');
        mostrarCampoComLabel(fields.consultor);
        fields.consultor?.classList.remove('input-error');
        limparErros(fields);
        restaurarCamposCliente();
        ocultarCampoComLabel(fields.notas);
        if (fields.notas) fields.notas.value = '';
        mostrarModal();
      };
    } else if (section === 'consultores') {
      addClientBtn.innerHTML = '<i class="fa-solid fa-user-plus"></i> Adicionar Consultor';
      addClientBtn.onclick = () => abrirModalNovoConsultor && abrirModalNovoConsultor();
      // Reposicionar botão de busca (lupa) ao lado do botão principal em mobile
      try {
        const searchToggle = document.getElementById('consultores-search-toggle');
        if (searchToggle) {
          const isMobile = window.matchMedia('(max-width: 768px)').matches;
          if (isMobile) {
            if (!consultoresSearchToggleOriginalParent) {
              consultoresSearchToggleOriginalParent = searchToggle.parentElement;
            }
            // Envolver em um container flex se necessário
            const headerActions = addClientBtn.parentElement;
            if (headerActions && !headerActions.classList.contains('consultores-actions-inline')) {
              headerActions.classList.add('consultores-actions-inline');
            }
            if (headerActions && headerActions !== searchToggle.parentElement) {
              headerActions.insertBefore(searchToggle, addClientBtn.nextSibling);
              searchToggle.style.display = ''; // garantir visível em mobile consultores
            }
          } else if (consultoresSearchToggleOriginalParent && searchToggle.parentElement !== consultoresSearchToggleOriginalParent) {
            consultoresSearchToggleOriginalParent.appendChild(searchToggle);
            searchToggle.style.display = ''; // desktop dentro da própria toolbar
          }
        }
      } catch(e) { /* silencioso */ }
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

async function inicializarSecao() {
  let alvo = (location.hash || '').replace('#','').trim();
  if (!alvo) alvo = localStorage.getItem('crm-active-section') || 'clientes';
  await showSection(alvo, { updateHash: false });
}
inicializarSecao();

window.addEventListener('hashchange', () => {
  const alvo = (location.hash || '').replace('#','').trim();
  if (alvo) showSection(alvo, { updateHash: false });
});

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

window.addEventListener('message', async event => {
  if (event.data && event.data.tipo === 'novoCliente' && event.data.cliente) {
    const bruto = { ...event.data.cliente };
    const veioDoServidor = !!bruto.id;
    if (!bruto.status) bruto.status = 'novo';
    if (!bruto.origem) bruto.origem = 'chatbot';

    if (veioDoServidor) {
      if (!bruto.dataCadastro) bruto.dataCadastro = new Date().toISOString();
      crm.registrarRemoto(bruto);
      toast(t('toast.leadRecebido') || 'Novo cliente recebido do chatbot','info');
      notificarClientesAtualizados();
      atualizarFiltrosDinamicos();
      atualizarLista();
      requestAnimationFrame(() => {
        const card = document.querySelector(`.cliente-card button.edit[data-id="${bruto.id}"]`)?.closest('.cliente-card');
        if (card) {
          card.classList.add('flash-new');
          card.scrollIntoView({ behavior:'smooth', block:'center' });
          setTimeout(()=> card.classList.remove('flash-new'), 1800);
        }
      });
      return;
    }

    const { valid, value } = validarCliente(bruto);
    if (!valid) {
      toast(t('toast.leadInvalido') || 'Cliente recebido do chatbot com dados inválidos','erro');
      return;
    }
    const cliente = { ...value };
    if (bruto.status) cliente.status = bruto.status;
    if (bruto.consultor) cliente.consultor = bruto.consultor;
    aplicarDefaultsCliente(cliente);
    let novoId = null;
    let fallback = false;
    try {
      const criado = await crm.adicionar(cliente);
      novoId = criado?.id ?? null;
      toast(t('toast.leadRecebido') || 'Novo cliente recebido do chatbot','info');
    } catch (err) {
      console.error('[CRM] Falha ao persistir lead recebido do chatbot, salvando offline', err);
      const offline = crm.adicionarOffline(cliente);
      novoId = offline?.id ?? null;
      fallback = true;
      toast(t('toast.leadFallback') || 'Lead recebido em modo offline. Sincronize depois.','info');
    }
    notificarClientesAtualizados();
    atualizarFiltrosDinamicos();
    atualizarLista();
    if (!fallback) sincronizarClientesRemotos({ silent: true }).catch(err => console.debug('[CRM] Sync pós-chatbot ignorada', err));
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

async function aplicarI18n(lang) {
  await loadI18n(lang);
  applyI18nDom(document);
  const btnPt = document.getElementById('langPt');
  const btnEn = document.getElementById('langEn');
  if (btnPt && btnEn) {
    btnPt.setAttribute('aria-pressed', getCurrentLang() === 'pt');
    btnEn.setAttribute('aria-pressed', getCurrentLang() === 'en');
  }
}
function inicializarI18n() {
  const langSalva = localStorage.getItem('crm-lang');
  aplicarI18n(langSalva);
  document.getElementById('langPt')?.addEventListener('click', () => aplicarI18n('pt'));
  document.getElementById('langEn')?.addEventListener('click', () => aplicarI18n('en'));
}


let lastFocusedBeforeModal = null;
function mostrarModal() {
  lastFocusedBeforeModal = document.activeElement;
  editModal.setAttribute('role','dialog');
  editModal.setAttribute('aria-modal','true');
  editModal.setAttribute('aria-label','Edição de Cliente');
  editModal.classList.remove('closing');
  editModal.style.display = 'flex';
  requestAnimationFrame(()=> editModal.classList.add('show'));
  // foco inicial seguro
  setTimeout(()=> { if (fields.nome) fields.nome.focus(); }, 40);
}
function fecharModal() {
  editModal.classList.add('closing');
  editModal.classList.remove('show');
  setTimeout(()=> { if(editModal.classList.contains('closing')) { editModal.style.display='none'; editModal.classList.remove('closing'); } }, 320);
  if (lastFocusedBeforeModal && typeof lastFocusedBeforeModal.focus === 'function') {
    lastFocusedBeforeModal.focus();
  }
}
// Trap de foco
document.addEventListener('keydown', e => {
  if (e.key !== 'Tab') return;
  if (editModal.style.display !== 'flex') return;
  const focusables = editModal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
  if (focusables.length === 0) return;
  const first = focusables[0];
  const last = focusables[focusables.length -1];
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
});
window.addEventListener('keydown', e => { if (e.key === 'Escape' && editModal.style.display === 'flex') fecharModal(); });

function bindClientesRefs() {
  clientesContainer = document.getElementById('clientes-list');
  totalClientes = document.getElementById('totalClients');
  searchInput = document.getElementById('searchInput');
  if (!searchInput) {
    console.warn('[CRM] Input de busca (searchInput) não encontrado na view de clientes. Verifique se o HTML está correto ou se a view foi carregada.');
  }
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
  maquinasChartCanvas = document.getElementById('maquinasChart');
  maquinasChartLegendEl = document.getElementById('maquinasChartLegend');
  if (maquinasChartInstance) {
    maquinasChartInstance.destroy();
    maquinasChartInstance = null;
  }
  if (maquinasChartLegendEl) {
    maquinasChartLegendEl.innerHTML = '<p class="chart-empty">Carregando dados...</p>';
  }
  analyticsPanelsEl = document.getElementById('analytics-panels');
  emptyStateEl = document.getElementById('empty-clients');
  emptyMsgEl = document.getElementById('empty-clients-msg');
  clearFiltersBtn = document.getElementById('clearFilters');
  if (clearFiltersBtn) {
    clearFiltersBtn.addEventListener('click', handleClearFiltersClick);
  }
}

function inicializarCollapseClientesHeader() {
  const wrapper = document.querySelector('.clientes-header-wrapper');
  const toggleBtn = document.getElementById('toggleClientesHeader');
  if (!wrapper || !toggleBtn) return;
  const region = document.getElementById('clientes-header-partial');
  const saved = localStorage.getItem('crm-clientes-header-collapsed');
  function toggle(force) {
    const currentlyCollapsed = wrapper.dataset.collapsed === 'true';
    const targetCollapsed = force !== undefined ? force : !currentlyCollapsed;
    wrapper.dataset.collapsed = targetCollapsed ? 'true' : 'false';
    toggleBtn.setAttribute('aria-expanded', targetCollapsed ? 'false' : 'true');
    toggleBtn.setAttribute('aria-pressed', targetCollapsed ? 'false' : 'true');
    localStorage.setItem('crm-clientes-header-collapsed', targetCollapsed ? 'true' : 'false');
    if (region) region.setAttribute('aria-hidden', targetCollapsed ? 'true' : 'false');
    if (analyticsPanelsEl) {
      analyticsPanelsEl.dataset.collapsed = targetCollapsed ? 'true' : 'false';
      analyticsPanelsEl.setAttribute('aria-hidden', targetCollapsed ? 'true' : 'false');
    }
    if (targetCollapsed) fecharPainelFiltros?.();
  }
  toggle(saved === 'true');
  toggleBtn.addEventListener('click', () => toggle());
  toggleBtn.addEventListener('keydown', e => { if (e.key==='Enter' || e.key===' ') { e.preventDefault(); toggle(); }});
  // Atalho: Ctrl+Shift+F recolhe/expande
  document.addEventListener('keydown', e => {
    if (e.ctrlKey && e.shiftKey && e.key.toLowerCase()==='f') {
      e.preventDefault();
      toggle();
    }
  });
  if (region) {
    const observer = new MutationObserver(()=>{
      const collapsed = wrapper.dataset.collapsed === 'true';
      region.setAttribute('aria-hidden', collapsed ? 'true':'false');
      if (analyticsPanelsEl) {
        analyticsPanelsEl.dataset.collapsed = collapsed ? 'true' : 'false';
        analyticsPanelsEl.setAttribute('aria-hidden', collapsed ? 'true':'false');
      }
    });
    observer.observe(wrapper, { attributes:true, attributeFilter:['data-collapsed'] });
    region.setAttribute('aria-hidden', wrapper.dataset.collapsed === 'true' ? 'true':'false');
    if (analyticsPanelsEl) {
      analyticsPanelsEl.dataset.collapsed = wrapper.dataset.collapsed === 'true' ? 'true' : 'false';
      analyticsPanelsEl.setAttribute('aria-hidden', wrapper.dataset.collapsed === 'true' ? 'true':'false');
    }
  }
}

window.initClientes = function initClientes() {
  bindClientesRefs();
  atualizarFiltrosDinamicos();
  // Re-bind dos eventos de busca e filtros sempre que a view é carregada
  setTimeout(() => {
    bindSearch();
    bindAdvancedFilters();
    bindToggleFilters();
    contarFiltrosAtivos();
    atualizarLista();
    inicializarCollapseClientesHeader();
  }, 0);
  sincronizarClientesRemotos({ silent: true, force: true }).then(async () => {
    if (!window.__consultoresReatribuicaoFeita) {
      const qtd = await reatribuirConsultoresClientesExistentes();
      if (qtd > 0) {
        atualizarLista();
        toast(`${qtd} cliente(s) tiveram consultor atribuído automaticamente`,`info`);
      }
      window.__consultoresReatribuicaoFeita = true;
    }
  }).catch(err => console.debug('[CRM] Sync inicial falhou', err));
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
    campoEspecialidadeWrapper = document.createElement('div');
    campoEspecialidadeWrapper.className = 'field-especialidade-wrapper';
    campoEspecialidadeWrapper.innerHTML = `
      <label class="especialidade-label">Especialidade:</label>
      <div class="especialidade-select" role="combobox" aria-haspopup="listbox" aria-owns="lista-especialidade" aria-expanded="false">
        <input type="text" class="especialidade-input" placeholder="Pesquisar..." aria-autocomplete="list" aria-controls="lista-especialidade" />
        <input type="hidden" class="especialidade-hidden" />
        <ul class="especialidade-opcoes" id="lista-especialidade" role="listbox"></ul>
      </div>`;
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
  mostrarCampoComLabel(fields.maquina);
  mostrarCampoComLabel(fields.horario);
  mostrarCampoComLabel(fields.status);
  mostrarCampoComLabel(fields.consultor);
  mostrarCampoComLabel(fields.notas);
  if (campoEspecialidadeWrapper) campoEspecialidadeWrapper.style.display = 'none';
  popularSelectMaquinas(fields.maquina?.value || '');
  if (fields.maquina && fields.maquina.value) {
    atualizarSelectConsultores(fields.maquina.value, fields.consultor?.value || '');
  } else {
    resetConsultorField();
  }
}

function ocultarCampoComLabel(el) {
  if (!el) return;
  const label = encontrarLabelPorControl(el);
  if (label) label.classList.add('hidden-field');
  el.classList.add('hidden-field');
  const wrapper = el.closest('.modal-field');
  if (wrapper) wrapper.classList.add('hidden-field');
}
function mostrarCampoComLabel(el) {
  if (!el) return;
  const label = encontrarLabelPorControl(el);
  if (label) label.classList.remove('hidden-field');
  el.classList.remove('hidden-field');
  const wrapper = el.closest('.modal-field');
  if (wrapper) wrapper.classList.remove('hidden-field');
}

window.initSobre = function initSobre() {
  carregarVersaoProjeto();
  inicializarI18n();
};
