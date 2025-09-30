import { ChatbotFlow } from './flow.js';

window.addEventListener('load', () => {
  const messages = document.getElementById('messages');
  const userInput = document.getElementById('userInput');
  const sendBtn = document.getElementById('sendBtn');
  new ChatbotFlow(messages, userInput, sendBtn);
});
