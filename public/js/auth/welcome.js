async function fetchUser(){
  try {
    const res = await fetch('/api/auth/me', { credentials:'include' });
    if(!res.ok) return null;
    return await res.json();
  } catch { return null; }
}

const statusEl = document.getElementById('welcomeStatus');
const progressEl = document.getElementById('welcomeProgress');
const userEl = document.getElementById('welcomeUser');
const skipBtn = document.getElementById('skipBtn');
let aborted = false;

skipBtn.addEventListener('click', () => {
  aborted = true;
  window.location.href='/app';
});

function setProgress(p, label){
  progressEl.style.width = p + '%';
  if(label) statusEl.textContent = label;
}

(async function run(){
  setProgress(5,'Validando sessão...');
  const user = await fetchUser();
  if(!user){
    window.location.href='/';
    return;
  }
  userEl.textContent = 'Olá, ' + (user.nome || user.email) + '!';
  setProgress(28,'Carregando preferências...');
  await new Promise(r=> setTimeout(r, 350));
  if(aborted) return;
  setProgress(55,'Sincronizando dados de clientes...');
  await new Promise(r=> setTimeout(r, 500));
  if(aborted) return;
  setProgress(72,'Otimizando cache local...');
  await new Promise(r=> setTimeout(r, 400));
  if(aborted) return;
  setProgress(88,'Quase lá...');
  await new Promise(r=> setTimeout(r, 300));
  if(aborted) return;
  setProgress(100,'Concluído');
  await new Promise(r=> setTimeout(r, 250));
  if(aborted) return;
  window.location.href='/app';
})();
