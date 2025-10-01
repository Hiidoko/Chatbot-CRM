const cache = {};
let currentLang = 'pt';
let dict = {};

function detectBrowserLang() {
  const nav = navigator.language || navigator.userLanguage || 'pt';
  if (!nav) return 'pt';
  const base = nav.split('-')[0].toLowerCase();
  return ['pt','en'].includes(base) ? base : 'pt';
}

export async function loadI18n(lang) {
  const target = lang || localStorage.getItem('crm-lang') || detectBrowserLang();
  if (cache[target]) {
    dict = cache[target];
    currentLang = target;
    localStorage.setItem('crm-lang', target);
    return dict;
  }
  try {
    const resp = await fetch(`/i18n/${target}.json`);
    if (!resp.ok) throw new Error('not found');
    const data = await resp.json();
    cache[target] = data;
    dict = data;
    currentLang = target;
    localStorage.setItem('crm-lang', target);
    return data;
  } catch(e) {
    if (target !== 'pt') return loadI18n('pt');
    dict = {}; currentLang = 'pt'; return dict;
  }
}

export function t(key, vars) {
  let value = dict[key];
  if (value == null) return key;
  if (vars && typeof vars === 'object') {
    Object.keys(vars).forEach(k => {
      value = value.replace(new RegExp(`{{${k}}}`,'g'), vars[k]);
    });
  }
  return value;
}

export function getCurrentLang() { return currentLang; }

export function applyI18nDom(root=document) {
  root.querySelectorAll('[data-i18n]').forEach(node => {
    const key = node.getAttribute('data-i18n');
    const val = t(key);
    if (val && val !== key) node.innerHTML = val;
  });
}
