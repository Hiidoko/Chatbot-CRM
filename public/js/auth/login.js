async function api(path, opts={}) {
  const res = await fetch(path, { headers:{ 'Content-Type':'application/json', ...(opts.headers||{}) }, credentials:'include', ...opts });
  const ct = res.headers.get('content-type')||'';
  let body = ct.includes('application/json') ? await res.json() : await res.text();
  if (!res.ok) throw new Error(body?.message || body || 'Erro');
  return body;
}

const form = document.getElementById('authForm');
const feedback = document.getElementById('auth-feedback');
const switchBtn = document.getElementById('switchMode');
const fieldNome = form.querySelector('[data-field="nome"]');
const title = document.getElementById('auth-title');
const submitBtn = document.getElementById('submitBtn');
const submitLabel = document.getElementById('submitLabel');
const loadingSpinner = document.getElementById('loadingSpinner');
let modo = 'login';

function setMode(m) {
  modo = m;
  if (modo === 'login') {
    fieldNome.style.display='none';
    title.textContent='Login';
    submitBtn.textContent='Entrar';
    switchBtn.textContent='Registrar';
  } else {
    fieldNome.style.display='block';
    title.textContent='Registrar';
    submitBtn.textContent='Criar conta';
    switchBtn.textContent='Já tenho conta';
  }
  feedback.textContent='';
}

switchBtn.addEventListener('click', () => setMode(modo === 'login' ? 'register' : 'login'));

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  feedback.classList.remove('success');
  feedback.textContent='';
  const fd = new FormData(form);
  const payload = Object.fromEntries(fd.entries());
  let manterSpinnerAposLogin = false;
  try {
    submitBtn.disabled = true;
    submitLabel.classList.add('hidden');
    loadingSpinner.classList.remove('hidden');
    loadingSpinner.classList.add('flex');
    if (modo === 'register') {
      await api('/api/auth/register', { method:'POST', body: JSON.stringify({ nome: payload.nome, email: payload.email, senha: payload.senha }) });
      feedback.textContent='Registro criado. Você já pode entrar.';
      feedback.classList.add('success');
      setMode('login');
      return;
    } else {
      await api('/api/auth/login', { method:'POST', body: JSON.stringify({ email: payload.email, senha: payload.senha }) });
      feedback.textContent='Login efetuado...';
      feedback.classList.add('success');
      // Redireciona direto para o app (tela de boas-vindas removida)
      manterSpinnerAposLogin = true;
      setTimeout(()=> { window.location.href = '/app'; }, 250);
    }
  } catch (err) {
    feedback.textContent=err.message || 'Erro ao processar.';
  } finally {
    if (!manterSpinnerAposLogin) {
      submitBtn.disabled = false;
      submitLabel.classList.remove('hidden');
      loadingSpinner.classList.add('hidden');
      loadingSpinner.classList.remove('flex');
    }
  }
});

// Autoredirect removido: sempre mostrar tela de login mesmo se já houver cookie.
