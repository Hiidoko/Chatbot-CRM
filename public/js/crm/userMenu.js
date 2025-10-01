(function(){
  // Script isolado para garantir menu do usuário funcional
  const API_ME = '/api/auth/me';
  const SEL_CONTAINER = '#userInfo';
  const MENU_ID='__userMenu';
  let userCache=null; let loading=false;

  function $(q,ctx=document){ return ctx.querySelector(q); }
  function createEl(tag,cls){ const el=document.createElement(tag); if(cls) el.className=cls; return el; }

  async function fetchUser(){
    if(userCache) return userCache; if(loading) return null; loading=true;
    try {
      const r = await fetch(API_ME,{credentials:'include'}); if(!r.ok) return null;
      const { user } = await r.json(); userCache=user; return user;
    } catch { return null; } finally { loading=false; }
  }

  function ensureUserSkeleton(){
    const box = $(SEL_CONTAINER); if(!box) return null;
    let mini = box.querySelector('.user-mini');
    if(!mini){
      mini = createEl('div','user-mini');
      mini.setAttribute('data-user-trigger','1');
      mini.style.cssText='display:flex;align-items:center;gap:.55rem;cursor:pointer;';
  mini.innerHTML='<div class="user-avatar" aria-hidden="true" style="width:36px;height:36px;border-radius:50%;background:#2563eb;display:flex;align-items:center;justify-content:center;font-weight:600;color:#fff;">?</div><div class="user-meta"><strong class="user-name-text">Usuário</strong><span class="user-email-text">...</span></div>';
      box.innerHTML=''; box.appendChild(mini);
    }
    return mini;
  }

  function positionMenu(trigger,menu){
    const r = trigger.getBoundingClientRect();
    const vw = window.innerWidth;
    const margin = 8;
    const gap = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--user-menu-gap')) || 10;
    const menuHeight = menu.offsetHeight || 0;
    const menuWidth = menu.offsetWidth || 0;
    let desiredLeft = r.left + (r.width/2) - (menuWidth/2);
    if(desiredLeft < margin) desiredLeft = margin;
    if(desiredLeft + menuWidth + margin > vw) desiredLeft = vw - menuWidth - margin;
    let top = r.top - menuHeight - gap;
    let dropUp = true;
    if(top < margin){
      top = r.bottom + gap;
      dropUp = false;
    }
    menu.style.position='fixed';
    menu.style.top = top + 'px';
    menu.style.left = desiredLeft + 'px';
    menu.style.transform='none';
    menu.style.zIndex='2600';
    menu.classList.toggle('drop-up', dropUp);
    const anchorOffset = (r.left + r.width/2) - desiredLeft;
    menu.style.setProperty('--anchor-x', anchorOffset + 'px');
  }

  function closeMenu(){
    const existing = document.getElementById(MENU_ID);
    if(existing){ existing.remove(); }
    window.removeEventListener('click', outsideHandler, { capture:true });
    window.removeEventListener('keydown', escHandler);
    window.removeEventListener('scroll', closeMenu, { passive:true });
  }
  function outsideHandler(e){ const menu = document.getElementById(MENU_ID); if(!menu) return; if(!menu.contains(e.target) && !e.target.closest('[data-user-trigger]')) closeMenu(); }
  function escHandler(e){ if(e.key==='Escape') closeMenu(); }

  function openMenu(trigger,user){
    closeMenu();
    const menu = createEl('div','user-menu');
    menu.id=MENU_ID;
    menu.innerHTML = `<ul>
      <li data-act="perfil"><i class=\"fa-solid fa-id-card\"></i> Perfil</li>
      <li data-act="refresh"><i class=\"fa-solid fa-rotate\"></i> Atualizar sessão</li>
      <li class="danger" data-act="logout"><i class=\"fa-solid fa-right-from-bracket\"></i> Sair</li>
    </ul>`;
    document.body.appendChild(menu);
    positionMenu(trigger,menu);
    // Animação: seta aparece após reflow
    requestAnimationFrame(()=> menu.classList.add('is-shown'));
    // Clique interno
    menu.addEventListener('click', (e)=>{
      const act = e.target.closest('li')?.dataset?.act; if(!act) return;
      if(act==='perfil'){ window.location.href='/perfil'; }
      else if(act==='refresh'){ userCache=null; hydrate(); }
      else if(act==='logout'){ confirmarLogout(); }
      if(act!=='refresh') closeMenu();
    });
    // Acessibilidade: foco primeiro item
    const first = menu.querySelector('li');
    if(first){ first.setAttribute('tabindex','-1'); setTimeout(()=> first.focus({preventScroll:true}), 25); }
    // Listeners globais
    window.addEventListener('click', outsideHandler, { capture:true });
    window.addEventListener('keydown', escHandler);
    window.addEventListener('scroll', closeMenu, { passive:true });
  }

  function confirmarLogout(){
    const wrap = createEl('div','confirm-dialog-backdrop');
    wrap.innerHTML=`<div class="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="lg-ul">
      <h3 id="lg-ul">Confirmar Logout</h3>
      <p>Deseja realmente encerrar a sessão?</p>
      <div class="confirm-actions">
        <button type="button" data-act="cancel" class="btn btn-ghost">Cancelar</button>
        <button type="button" data-act="ok" class="btn btn-danger">Sair</button>
      </div>
    </div>`;
    document.body.appendChild(wrap);
    const dialog=wrap.querySelector('.confirm-dialog');
    const done=(v)=>{ dialog.style.animation='dialogOut .22s forwards ease'; wrap.style.animation='fadeBackdrop .25s forwards ease'; setTimeout(()=>wrap.remove(),210); if(v){ fetch('/api/auth/logout',{method:'POST',credentials:'include'}).finally(()=> window.location.href='/'); } };
    wrap.addEventListener('click',e=>{ if(e.target===wrap) done(false); });
    wrap.querySelector('[data-act="cancel"]').onclick=()=>done(false);
    wrap.querySelector('[data-act="ok"]').onclick=()=>done(true);
    window.addEventListener('keydown', function esc(ev){ if(ev.key==='Escape'){ done(false); window.removeEventListener('keydown', esc);} });
  }

  async function hydrate(){
    const mini = ensureUserSkeleton(); if(!mini) return;
    const user = await fetchUser(); if(!user) return;
    mini.querySelector('.user-avatar').textContent = (user.nome||user.email||'?').charAt(0).toUpperCase();
    mini.querySelector('strong').textContent = user.nome || 'Usuário';
    mini.querySelector('span').textContent = user.email || '';
  }

  function bindInteractions(){
    const mini = ensureUserSkeleton(); if(!mini) return;
    if(mini.__userBound) return; mini.__userBound=true;
    mini.setAttribute('tabindex','0'); mini.setAttribute('role','button'); mini.setAttribute('aria-label','Menu do usuário');
    mini.addEventListener('click', async (e)=> { e.stopPropagation(); const user = userCache || await fetchUser(); openMenu(mini,user||{}); });
    mini.addEventListener('keydown', async (e)=> { if(e.key==='Enter' || e.key===' '){ e.preventDefault(); const user = userCache || await fetchUser(); openMenu(mini,user||{});} });
    window.addEventListener('resize', ()=> { const menu = document.getElementById(MENU_ID); if(menu && mini){ positionMenu(mini,menu); } });
  }

  function init(){ bindInteractions(); hydrate(); }
  document.addEventListener('DOMContentLoaded', init);
  // fallback caso DOMContentLoaded já tenha passado
  if(document.readyState==='interactive' || document.readyState==='complete') init();
  // Botão de logout direto (temporário)
  document.addEventListener('click', (e)=>{
    const btn = e.target.closest('#logoutBtn');
    if(!btn) return;
    e.preventDefault();
    const wrap = document.createElement('div');
    wrap.className='confirm-dialog-backdrop';
    wrap.innerHTML=`<div class="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="lg-logout">
      <h3 id="lg-logout">Confirmar Logout</h3>
      <p>Deseja encerrar a sessão?</p>
      <div class="confirm-actions">
        <button type="button" data-act="cancel" class="btn btn-ghost">Cancelar</button>
        <button type="button" data-act="ok" class="btn btn-danger">Sair</button>
      </div>
    </div>`;
    document.body.appendChild(wrap);
    const dialog=wrap.querySelector('.confirm-dialog');
    const done=(v)=>{ dialog.style.animation='dialogOut .22s forwards ease'; wrap.style.animation='fadeBackdrop .25s forwards ease'; setTimeout(()=>wrap.remove(),210); if(v){ fetch('/api/auth/logout',{method:'POST',credentials:'include'}).finally(()=> window.location.href='/'); } };
    wrap.addEventListener('click',e=>{ if(e.target===wrap) done(false); });
    wrap.querySelector('[data-act="cancel"]').onclick=()=>done(false);
    wrap.querySelector('[data-act="ok"]').onclick=()=>done(true);
    window.addEventListener('keydown', function esc(ev){ if(ev.key==='Escape'){ done(false); window.removeEventListener('keydown', esc);} });
  });
})();