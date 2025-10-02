// Fallback simples para garantir funcionamento do menu do usuário
(function(){
  let tries = 0;
  const MAX_TRIES = 50; // ~5s se intervalo 100ms
  function ensureUserMini(){
    const userInfo = document.getElementById('userInfo');
    if(!userInfo){ if(++tries<MAX_TRIES) return setTimeout(ensureUserMini,100); return; }
    let mini = userInfo.querySelector('.user-mini');
    if(!mini){
      // Talvez ainda não carregou via /api/auth/me – tentar puxar direto
      fetch('/api/auth/me',{credentials:'include'}).then(r=>r.json()).then(d=>{
        if(d && d.user){
          const nome = d.user.nome || 'Usuário';
          const email = d.user.email || '';
          userInfo.innerHTML = `<div class="user-mini" data-fallback="1" style="display:flex;align-items:center;gap:.55rem;cursor:pointer;">
            <div class="user-avatar" style="width:36px;height:36px;border-radius:50%;background:#2563eb;display:flex;align-items:center;justify-content:center;font-weight:600;color:#fff;">${nome.charAt(0).toUpperCase()}</div>
            <div class="user-meta" style="display:flex;flex-direction:column;align-items:flex-start;">
              <strong style="font-size:.7rem;letter-spacing:.5px;">${nome}</strong>
              <span style="font-size:.6rem;opacity:.65;">${email}</span>
            </div>
          </div>`;
          mini = userInfo.querySelector('.user-mini');
          bind(mini);
        } else {
          if(++tries<MAX_TRIES) return setTimeout(ensureUserMini,120);
        }
      }).catch(()=>{ if(++tries<MAX_TRIES) setTimeout(ensureUserMini,120); });
    } else {
      bind(mini);
    }
  }
  function bind(mini){
    if(!mini || mini.__boundFallback) return; mini.__boundFallback=true;
    mini.addEventListener('click', (e)=>{ e.stopPropagation(); openMenu(mini); });
    mini.addEventListener('keydown',(e)=>{ if(e.key==='Enter' || e.key===' '){ e.preventDefault(); openMenu(mini);} });
  }
  let menu=null;
  function openMenu(trigger){
    if(menu){ closeMenu(); return; }
    menu = document.createElement('div');
    menu.className='user-menu';
      menu.innerHTML=`<ul>
        <li data-act="perfil"><i class="fa-solid fa-id-card"></i> Perfil</li>
        <li data-act="refresh"><i class="fa-solid fa-rotate"></i> Atualizar sessão</li>
        <li class="danger" data-act="logout"><i class="fa-solid fa-right-from-bracket"></i> Sair</li>
      </ul>`;
    document.body.appendChild(menu);
    position(trigger);
    menu.addEventListener('click', (e)=>{
      const act = e.target.closest('li')?.dataset?.act;
      if(act==='perfil') window.location.href='/perfil';
      else if(act==='refresh'){ tries=0; ensureUserMini(); }
      else if(act==='logout'){ confirmarLogout(); }
      closeMenu();
    });
    window.addEventListener('click', outside, { capture:true });
    window.addEventListener('keydown', esc);
    function outside(ev){ if(!menu) return; if(!menu.contains(ev.target) && !trigger.contains(ev.target)) closeMenu(); }
    function esc(ev){ if(ev.key==='Escape') closeMenu(); }
    function closeMenu(){ if(!menu) return; window.removeEventListener('click', outside, { capture:true }); window.removeEventListener('keydown', esc); menu.remove(); menu=null; }
    function confirmarLogout(){
      const wrap = document.createElement('div');
      wrap.className='confirm-dialog-backdrop';
      wrap.innerHTML=`<div class="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="lg-title">
        <h3 id="lg-title">Confirmar Logout</h3>
        <p>Deseja realmente encerrar a sessão?</p>
        <div class="confirm-actions">
          <button type="button" data-act="cancel" class="btn btn-ghost">Cancelar</button>
          <button type="button" data-act="ok" class="btn btn-danger">Sair</button>
        </div>
      </div>`;
      document.body.appendChild(wrap);
      const dialog = wrap.querySelector('.confirm-dialog');
      const done = (v)=>{
        dialog.style.animation='dialogOut .22s forwards ease';
        wrap.style.animation='fadeBackdrop .25s forwards ease';
        setTimeout(()=> wrap.remove(),210);
        if(v){ fetch('/api/auth/logout',{method:'POST',credentials:'include'}).finally(()=> window.location.href='/'); }
      };
      wrap.addEventListener('click',(e)=>{ if(e.target===wrap) done(false); });
      wrap.querySelector('[data-act="cancel"]').onclick=()=>done(false);
      wrap.querySelector('[data-act="ok"]').onclick=()=>done(true);
      window.addEventListener('keydown', function esc(ev){ if(ev.key==='Escape'){ done(false); window.removeEventListener('keydown', esc);} });
    }
  }
  function position(trigger){
    if(!menu) return;
    const r = trigger.getBoundingClientRect();
    menu.style.top = (r.top + r.height + 8) + 'px';
    menu.style.left = (r.left + Math.min(r.width,180)/2)+'px';
    menu.style.transform='translate(-50%,0)';
    menu.style.zIndex=2600;
  }
  ensureUserMini();
})();