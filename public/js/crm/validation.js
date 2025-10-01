import { validateCliente as validateClienteSchema } from '../shared/validatorCore.js';

export function validarCliente(dados) {
  return validateClienteSchema(dados, { partial: false });
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
