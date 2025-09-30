import { botMessage, userMessage, mostrarOpcoesMaquina, mostrarDigitando, removerDigitando, toast } from './dom.js';
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
    botMessage(this.messagesEl, questions[this.currentQuestion].text);
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

  _enviarParaServidor(cliente) {
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({ tipo: 'novoCliente', cliente }, '*');
    }
  }

  _enviarDados(payload) {
    // Mostra overlay loader
    const overlay = document.createElement('div');
    overlay.className = 'loader-overlay';
    overlay.innerHTML = `<div class="spinner"></div><div class="status-text">Enviando...</div>`;
    document.getElementById('chat-container').appendChild(overlay);

    // Simulação de possível falha (10% chance)
    const falha = Math.random() < 0.1;

    setTimeout(() => {
      if (falha) {
        overlay.querySelector('.status-text').textContent = 'Falha ao enviar. Tente novamente.';
        overlay.querySelector('.spinner').style.borderTopColor = '#c62828';
        toast('Erro ao enviar lead', 'error');
        setTimeout(() => overlay.remove(), 1400);
        botMessage(this.messagesEl, 'Ops! Não consegui registrar agora. Deseja tentar de novo?');
      } else {
        this._enviarParaServidor(payload);
        overlay.querySelector('.status-text').textContent = 'Enviado com sucesso!';
        overlay.querySelector('.spinner').style.borderTopColor = '#2e7d32';
        toast('Lead enviado com sucesso', 'success');
        setTimeout(() => overlay.remove(), 900);
        botMessage(this.messagesEl, 'Obrigado! Seus dados foram enviados. Se quiser, pode iniciar um novo atendimento.');
      }
    }, 1100 + Math.random()*700);
  }

  _reset() {
    this.messagesEl.innerHTML = '';
    this.currentQuestion = 0;
    this.leadData = { nome:'', email:'', telefone:'', cidade:'', maquina:'', horario:'' };
    botMessage(this.messagesEl, questions[this.currentQuestion].text);
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
