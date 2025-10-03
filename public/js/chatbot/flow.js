import { botMessage, userMessage, mostrarOpcoesMaquina, mostrarDigitando, removerDigitando, toast } from './dom.js';
import { fetchWithRetry } from '../../js/shared/net.js';
import { t, loadI18n } from '../../js/shared/i18n.js';
import { validarCampo, mensagemErro } from './validation.js';

const questions = [
  { field: 'nome', text: 'Qual seu nome completo?' },
  { field: 'email', text: 'Qual seu e-mail?' },
  { field: 'telefone', text: 'Qual seu telefone? (apenas números, com DDD)' },
  { field: 'cidade', text: 'Qual sua cidade?' },
  { field: 'maquina', text: 'Escolha a máquina de interesse:' },
  { field: 'horario', text: 'Qual o melhor horário para contato?' }
];

export class ChatbotFlow {
  constructor(messagesEl, inputEl, sendBtn) {
    this.messagesEl = messagesEl;
    this.inputEl = inputEl;
    this.sendBtn = sendBtn;
    this.currentQuestion = 0;
    this.leadData = { nome:'', email:'', telefone:'', cidade:'', maquina:'', horario:'' };
    this._bind();
    loadI18n(localStorage.getItem('crm-lang')).then(() => this._startConversation());
  }

  _bind() {
    this.sendBtn.addEventListener('click', () => this._handleSend());
    this.inputEl.addEventListener('keypress', e => { if (e.key === 'Enter') this._handleSend(); });
  }

  _handleSend() {
    const text = this.inputEl.value.trim();
    if (!text) return;
    this._clearInputState();
    userMessage(this.messagesEl, text);
    this.inputEl.value = '';
    this.processAnswer(text);
  }

  _startConversation() {
    botMessage(this.messagesEl, 'Olá, sou o Assistente BOT, estou aqui para te ajudar no seu cadastro, vamos começar? 😊');
    const typing = mostrarDigitando(this.messagesEl);
    setTimeout(() => {
      removerDigitando(typing);
      botMessage(this.messagesEl, questions[this.currentQuestion].text);
    }, 850);
  }

  processAnswer(answer) {
    const field = questions[this.currentQuestion].field;

    if (field === 'maquina') {
      if (!validarCampo(field, answer)) {
        botMessage(this.messagesEl, mensagemErro(field));
        mostrarOpcoesMaquina(this.messagesEl, v => this.processAnswer(v));
        return;
      }
      this.leadData[field] = answer;
      this.currentQuestion++;
      botMessage(this.messagesEl, questions[this.currentQuestion].text);
      return;
    }

    if (!validarCampo(field, answer)) {
      this._setInputError();
      botMessage(this.messagesEl, mensagemErro(field));
      return;
    }

    this.leadData[field] = answer.trim();
    this.currentQuestion++;

    if (this.currentQuestion < questions.length) {
      const prox = questions[this.currentQuestion];
      const typing = mostrarDigitando(this.messagesEl);
      setTimeout(() => {
        removerDigitando(typing);
        if (prox.field === 'maquina') {
          mostrarOpcoesMaquina(this.messagesEl, v => this.processAnswer(v));
        } else {
          botMessage(this.messagesEl, prox.text);
        }
      }, 500 + Math.random()*500);
    } else {
      this._finalizar();
    }
  }

  _finalizar() {
    const typing = mostrarDigitando(this.messagesEl);
    setTimeout(() => {
      removerDigitando(typing);
      this._enviarDados(this.leadData);
    }, 600);
    setTimeout(() => this._reset(), 1500);
  }

  _enviarParaServidorFallback(cliente) {
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({ tipo: 'novoCliente', cliente }, '*');
    }
  }

  async _enviarDados(payload) {
    const overlay = document.createElement('div');
    overlay.className = 'loader-overlay';
    overlay.innerHTML = `<div class="spinner"></div><div class="status-text">Enviando...</div>`;
    document.getElementById('chat-container').appendChild(overlay);
    const statusText = overlay.querySelector('.status-text');
    try {
      const criado = await fetchWithRetry('/api/clientes', {
        method: 'POST',
        headers: { 'Content-Type':'application/json', 'Accept':'application/json' },
        body: JSON.stringify(payload)
      });
      const clienteCriado = Array.isArray(criado?.data) ? criado.data[0] : (criado?.data || criado);
      if (window.parent && window.parent !== window && clienteCriado) {
        try {
          window.parent.postMessage({ tipo: 'novoCliente', cliente: clienteCriado }, '*');
        } catch (postErr) {
          console.warn('[Chatbot] Falha ao notificar CRM sobre novo cliente', postErr);
        }
      }
      const id = clienteCriado?.id ?? criado?.id;
      statusText.textContent = 'Enviado com sucesso!';
      overlay.querySelector('.spinner').style.borderTopColor = '#2e7d32';
  toast(t('toast.leadPersistido') || 'Lead enviado (persistido)', 'success');
      setTimeout(()=> overlay.remove(), 900);
      if (id) {
        botMessage(this.messagesEl, `Obrigado! Seu registro foi criado. Protocolo: ${id}. Podemos iniciar outro atendimento.`);
      } else {
        botMessage(this.messagesEl, 'Obrigado! Seus dados foram enviados e armazenados. Podemos iniciar outro atendimento.');
      }
    } catch (err) {
      statusText.textContent = 'Falha de rede. Tentando fallback...';
      overlay.querySelector('.spinner').style.borderTopColor = '#c68928';
      try {
        this._enviarParaServidorFallback(payload);
        statusText.textContent = 'Enviado (fallback)!';
        overlay.querySelector('.spinner').style.borderTopColor = '#2e7d32';
  toast(t('toast.leadFallback') || 'Lead enviado via fallback', 'info');
        setTimeout(()=> overlay.remove(), 1200);
        botMessage(this.messagesEl, 'Rede instável, mas recebemos seus dados. Iniciar novo atendimento?');
      } catch {
        statusText.textContent = 'Falha ao enviar. Tente novamente.';
        overlay.querySelector('.spinner').style.borderTopColor = '#c62828';
  toast(t('toast.leadErro') || 'Erro ao enviar lead', 'error');
        setTimeout(()=> overlay.remove(), 1500);
        botMessage(this.messagesEl, 'Ops! Não consegui registrar agora. Deseja tentar de novo?');
      }
    }
  }

  _reset() {
    this.messagesEl.innerHTML = '';
    this.currentQuestion = 0;
    this.leadData = { nome:'', email:'', telefone:'', cidade:'', maquina:'', horario:'' };
    this._startConversation();
  }

  _setInputError() {
    this.inputEl.classList.remove('input-valid');
    this.inputEl.classList.add('input-error');
  }
  _clearInputState() {
    this.inputEl.classList.remove('input-error');
    this.inputEl.classList.add('input-valid');
    setTimeout(()=> this.inputEl.classList.remove('input-valid'), 700);
  }
}
