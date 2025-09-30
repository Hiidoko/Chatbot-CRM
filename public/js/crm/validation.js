const EMAIL_REGEX = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i;
const NOME_CIDADE_REGEX = /^[A-Za-zÀ-ÿ\s]{2,}$/;

export function validarCliente(dados) {
  const errors = [];
  function req(campo, cond, msg) { if (!cond) errors.push({ field: campo, message: msg }); }

  const nome = (dados.nome || '').replace(/\s+/g,' ').trim();
  const email = (dados.email || '').trim().toLowerCase();
  const telefone = (dados.telefone || '').replace(/\D/g, '');
  const cidade = (dados.cidade || '').replace(/\s+/g,' ').trim();
  const maquina = (dados.maquina || '').replace(/\s+/g,' ').trim();
  const horario = (dados.horario || '').replace(/\s+/g,' ').trim();

  req('nome', nome.length >= 2 && NOME_CIDADE_REGEX.test(nome), 'Nome inválido (mín. 2 letras, apenas caracteres alfabéticos).');
  req('email', EMAIL_REGEX.test(email), 'E-mail inválido.');
  req('telefone', telefone.length === 10 || telefone.length === 11, 'Telefone deve ter 10 ou 11 dígitos (somente números).');
  req('cidade', cidade.length >= 2 && NOME_CIDADE_REGEX.test(cidade), 'Cidade inválida.');
  req('maquina', maquina.length >= 2, 'Máquina inválida.');
  req('horario', horario.length >= 2, 'Horário inválido.');

  const cleaned = { nome, email, telefone, cidade, maquina, horario };
  return { valid: errors.length === 0, errors, value: cleaned };
}

export function exibirErrosModal(errors, fieldsContainer) {
  limparErros(fieldsContainer);
  const map = {}; errors.forEach(e => { if (!map[e.field]) map[e.field] = e.message; });
  const summaryEl = document.getElementById('validation-summary');
  if (summaryEl) {
    if (errors.length) {
      summaryEl.style.display = 'block';
      summaryEl.innerHTML = `<strong>Foram encontrados ${errors.length} erro(s):</strong>` +
        '<ul>' + errors.map(e => `<li><button type="button" class="link-erro" data-field="${e.field}" style="background:none;border:none;padding:0;margin:0;color:#b71c1c;cursor:pointer;text-decoration:underline;font:inherit;">${e.message}</button></li>`).join('') + '</ul>';
      summaryEl.querySelectorAll('button.link-erro').forEach(btn => {
        btn.addEventListener('click', () => {
          const f = fieldsContainer[btn.dataset.field];
          if (f) { f.focus(); f.scrollIntoView({block:'center', behavior:'smooth'}); }
        });
      });
    } else {
      summaryEl.style.display = 'none';
      summaryEl.innerHTML = '';
    }
  }
  Object.keys(map).forEach(field => {
    const input = fieldsContainer[field];
    if (!input) return;
    input.classList.add('input-error');
    let span = input.nextElementSibling;
    if (!span || !span.classList.contains('field-error')) {
      span = document.createElement('div');
      span.className = 'field-error';
      input.insertAdjacentElement('afterend', span);
    }
    span.textContent = map[field];
  });
}

export function limparErros(fieldsContainer) {
  Object.values(fieldsContainer).forEach(input => {
    input.classList.remove('input-error');
    const next = input.nextElementSibling;
    if (next && next.classList.contains('field-error')) next.remove();
  });
  const summaryEl = document.getElementById('validation-summary');
  if (summaryEl) { summaryEl.style.display='none'; summaryEl.innerHTML=''; }
}
