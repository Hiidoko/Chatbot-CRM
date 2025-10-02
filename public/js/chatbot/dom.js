export function botMessage(container, text) {
  const msg = document.createElement("div");
  msg.classList.add("message", "bot");
  msg.innerHTML = `<div class="avatar" style="background-image:url('/img/user.png')"></div>
                   <div class="text">${text}</div>`;
  container.appendChild(msg);
  container.scrollTop = container.scrollHeight;
}

export function userMessage(container, text) {
  const msg = document.createElement("div");
  msg.classList.add("message", "user");
  msg.innerHTML = `<div class="text">${text}</div>
                   <div class="avatar" style="background-image:url('/img/user.png')"></div>`;
  container.appendChild(msg);
  container.scrollTop = container.scrollHeight;
}

export function mostrarOpcoesMaquina(container, callback) {
  const msg = document.createElement('div');
  msg.classList.add('message','bot');
  msg.innerHTML = `
  <div class="avatar" style="background-image:url('/img/user.png')"></div>
    <div class="text">
      Selecione a máquina de interesse:
      <div class="maquina-select-wrapper">
        <select class="maquina-select" aria-label="Máquina de interesse">
          <option value="" selected disabled>Escolher...</option>
          <option value="Máquina A">Máquina A</option>
          <option value="Máquina B">Máquina B</option>
          <option value="Máquina C">Máquina C</option>
        </select>
        <div class="maquina-hint">Pressione Enter para confirmar.</div>
      </div>
    </div>`;
  container.appendChild(msg);
  container.scrollTop = container.scrollHeight;
  const select = msg.querySelector('.maquina-select');
  select.focus();
  select.addEventListener('change', () => {
    if (!select.value) return;
    callback(select.value);
    // Feedback visual rápido
    select.disabled = true;
    const hint = msg.querySelector('.maquina-hint');
    if (hint) hint.textContent = 'Selecionado: ' + select.value;
  });
  select.addEventListener('keydown', e => {
    if (e.key === 'Enter' && select.value) {
      callback(select.value);
      select.disabled = true;
      const hint = msg.querySelector('.maquina-hint');
      if (hint) hint.textContent = 'Selecionado: ' + select.value;
    }
  });
}

export function mostrarDigitando(container) {
  const wrap = document.createElement('div');
  wrap.className = 'message bot typing-indicator';
  wrap.innerHTML = `
  <div class="avatar" style="background-image:url('/img/user.png')"></div>
    <div class="text"><div class="typing"><span class="dot"></span><span class="dot"></span><span class="dot"></span></div></div>`;
  container.appendChild(wrap);
  container.scrollTop = container.scrollHeight;
  return wrap;
}

export function removerDigitando(node) { if (node && node.parentNode) node.parentNode.removeChild(node); }

export function toast(msg, tipo='default') {
  let cont = document.querySelector('.toast-container');
  if (!cont) {
    cont = document.createElement('div');
    cont.className = 'toast-container';
    document.body.appendChild(cont);
  }
  const t = document.createElement('div');
  t.className = 'toast' + (tipo !== 'default' ? ' ' + tipo : '');
  t.textContent = msg;
  cont.appendChild(t);
  setTimeout(() => { t.style.opacity='0'; t.style.transition='opacity .3s'; setTimeout(()=> t.remove(), 320); }, 3200);
}
