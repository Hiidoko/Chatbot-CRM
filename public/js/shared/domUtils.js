// Utilidades DOM e helpers reutilizáveis
// debounce: retorna função debounced com cancel e flush
export function debounce(fn, wait=150) {
  let t, lastArgs, lastThis;
  function run() {
    const args = lastArgs; const ctx = lastThis; t = null; lastArgs = lastThis = undefined; fn.apply(ctx, args);
  }
  function debounced(...args) {
    lastArgs = args; lastThis = this;
    if (t) clearTimeout(t);
    t = setTimeout(run, wait);
  }
  debounced.cancel = () => { if (t) { clearTimeout(t); t=null; } };
  debounced.flush = () => { if (t) { clearTimeout(t); run(); } };
  return debounced;
}

// createToggleSection: abstrai toggle de um container com botão
// options: { expandedClass, collapsedClass, onOpen, onClose, persistKey, ariaTarget }
export function createToggleSection(button, section, options={}) {
  if (!button || !section) return () => {};
  const {
    expandedClass = 'expanded',
    collapsedClass = 'collapsed',
    onOpen, onClose,
    persistKey,
    ariaTarget = section
  } = options;
  const initialCollapsed = persistKey ? localStorage.getItem(persistKey) === 'true' : false;
  if (initialCollapsed) {
    section.classList.add(collapsedClass);
    button.setAttribute('aria-expanded','false');
    button.setAttribute('aria-pressed','false');
    ariaTarget.setAttribute('aria-hidden','true');
  } else {
    button.setAttribute('aria-expanded','true');
    button.setAttribute('aria-pressed','true');
  }
  function setState(collapsed) {
    if (collapsed) {
      section.classList.add(collapsedClass);
      section.classList.remove(expandedClass);
      button.setAttribute('aria-expanded','false');
      button.setAttribute('aria-pressed','false');
      ariaTarget.setAttribute('aria-hidden','true');
      onClose && onClose();
      if (persistKey) localStorage.setItem(persistKey,'true');
    } else {
      section.classList.remove(collapsedClass);
      section.classList.add(expandedClass);
      button.setAttribute('aria-expanded','true');
      button.setAttribute('aria-pressed','true');
      ariaTarget.setAttribute('aria-hidden','false');
      onOpen && onOpen();
      if (persistKey) localStorage.setItem(persistKey,'false');
    }
  }
  function toggle(force) {
    const collapsed = force !== undefined ? force : ! (button.getAttribute('aria-expanded') === 'true');
    setState(!collapsed); // collapsed flag invertido
  }
  button.addEventListener('click', () => toggle());
  button.addEventListener('keydown', e => { if (e.key==='Enter'|| e.key===' ') { e.preventDefault(); toggle(); } });
  return toggle;
}

// mountToastManager: garante container e retorna função show
export function mountToastManager({ containerId='crm-toast-container', position='top-right' }={}) {
  let container = document.getElementById(containerId);
  if (!container) {
    container = document.createElement('div');
    container.id = containerId;
    container.className = `toast-container ${position}`;
    document.body.appendChild(container);
  }
  function show(message, type='info', duration=3500) {
    if (!container) return;
    const t = document.createElement('div');
    t.className = `toast ${type==='erro'?'error':type==='sucesso'?'success':type}`;
    t.setAttribute('role','status');
    t.setAttribute('aria-live','polite');
    t.textContent = message;
    container.appendChild(t);
    requestAnimationFrame(()=> t.classList.add('show'));
    setTimeout(()=> {
      t.classList.add('hide');
      setTimeout(()=> t.remove(), 320);
    }, duration);
  }
  return show;
}

// fetchJSON simplificado com tratamento básico de erro
export async function fetchJSON(url, opts={}) {
  const res = await fetch(url, { headers: { 'Content-Type':'application/json', ...(opts.headers||{}) }, ...opts });
  if (!res.ok) {
    let bodyText = await res.text();
    try {
      const data = JSON.parse(bodyText);
      bodyText = data.message || bodyText;
    } catch (err) {
      console.debug('[fetchJSON] Resposta não JSON', err?.message);
    }
    const err = new Error(`HTTP ${res.status}: ${bodyText}`);
    err.status = res.status;
    throw err;
  }
  const ct = res.headers.get('content-type')||'';
  if (ct.includes('application/json')) return res.json();
  return res.text();
}

// populateSelect: preenche select preservando valor atual
export function populateSelect(selectEl, values) {
  if (!selectEl) return;
  const prev = selectEl.value;
  const base = Array.from(new Set(values.filter(v => v))).sort((a,b)=> a.localeCompare(b, 'pt-BR'));
  // remove opções exceto a primeira
  selectEl.querySelectorAll('option:not(:first-child)').forEach(o=> o.remove());
  base.forEach(v => {
    const opt = document.createElement('option');
    opt.value = v; opt.textContent = v; selectEl.appendChild(opt);
  });
  if (base.includes(prev)) selectEl.value = prev; else selectEl.value = '';
}
