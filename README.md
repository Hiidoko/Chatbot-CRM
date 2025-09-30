# CRM + Chatbot (Projeto Demo / Portfólio)

Aplicação full stack JavaScript que combina um mini CRM de leads com um widget de Chatbot integrado. Construída para fins educacionais e de portfólio – não utiliza dados reais e **não deve ser usada em produção** sem revisão de segurança, persistência adequada e testes automatizados adicionais.

## 🌐 Visão Geral

O sistema permite captar, listar, filtrar, editar e analisar leads com uma interface leve (SPA sem frameworks pesados) e um fluxo de entrada via chatbot (iframe). Consultores são atribuídos automaticamente conforme a especialidade (máquina) informada pelo lead.

## ✨ Principais Recursos

- Cadastro e edição de clientes (modal ou edição inline)
- Atribuição automática de consultor por especialidade da máquina
- Filtros rápidos + Painel de **Filtros Avançados** com seleção por Cidade, Máquina, Consultor e Status
- Paginação configurável (25 / 50 / 100 / Todos) e ordenação por múltiplos critérios
- Busca unificada por nome/e-mail + ordenações (data, nome, status, consultor)
- Painéis analíticos dinâmicos (status, consultor, máquina) refletindo os filtros ativos
- Painel de clientes por consultor na aba Consultores (carregado sob demanda)
- Chatbot integrado que envia novos leads para o CRM via `postMessage`
- Acessibilidade: navegação por teclado, ARIA relevante, feedback visual moderado
- Feedback de UI: toasts, diálogos de confirmação customizados, animações respeitando preferência do usuário
- Estrutura modular (camadas de validação, normalização e lógica reutilizáveis)

## 🧩 Arquitetura

| Camada | Descrição |
| ------ | --------- |
| Backend (Express 5) | Servidor HTTP simples que expõe a API `/api/clientes` e serve assets estáticos em `public/`. |
| Modelos / Lógica | Implementados em `models/` e classe CRM no frontend (`public/js/crm/logic.js`). |
| Validação | Regras centralizadas em `validators/clienteValidator.js`, reutilizadas no front. |
| Frontend SPA | ES Modules (sem React/Vue/Angular) com carregamento de "partials" via `viewLoader.js`. |
| Chatbot | Iframe separado (`public/html/chatbot.html`) enviando dados para o shell principal. |

## 🗂 Estrutura de Pastas (resumida)

```
public/
  html/ (vistas parciais: clientes, consultores, sobre, chatbot)
  js/
    crm/ (lógica principal CRM, renderizações, validações, consultores)
    chatbot/ (fluxo do chatbot, DOM e validação de entrada)
  styles/ (CSS modular: base, sobre, shell do chatbot)
models/ (modelos e acesso a dados em memória)
controllers/ (controladores Express)
routes/ (rotas Express)
validators/ (validações de entrada)
utils/ (normalizadores ou helpers)
```

> Persistência atual é **em memória** (volátil). Reiniciar o servidor perde os dados. Para evoluir: integrar banco (PostgreSQL, MongoDB ou SQLite) e camada de repositório.

## 🚀 Como Executar Localmente

Pré-requisitos: [Node.js 18+](https://nodejs.org/) instalado.

```bash
npm install
npm start
```
Acesse: http://localhost:3000

## 🔗 Endpoints Principais

| Método | Rota | Descrição |
| ------ | ---- | --------- |
| GET | `/api/clientes` | Lista de clientes em memória |
| POST | `/api/clientes` | Cria cliente (JSON) |
| PUT | `/api/clientes/:id` | Atualiza cliente |
| DELETE | `/api/clientes/:id` | Remove cliente |
| GET | `/api/meta/version` | Retorna versão do pacote |

Payload básico (POST / PUT):
```json
{
  "nome": "Exemplo",
  "email": "exemplo@dominio.com",
  "telefone": "(11) 99999-9999",
  "cidade": "São Paulo",
  "maquina": "Máquina A",
  "horario": "Manhã",
  "status": "novo" | "em andamento" | "contatado" | "convertido" | "perdido",
  "consultor": "(opcional – atribuído se houver especialidade correspondente)"
}
```

## 🤖 Integração do Chatbot
- O chatbot envia mensagens ao CRM usando `window.parent.postMessage({ tipo: 'novoCliente', cliente })`.
- O CRM valida, normaliza e aplica: status padrão + atribuição automática de consultor.
- O card recém-criado é destacado com animação.

## 🧠 Atribuição Automática de Consultor
1. Lead chega com campo `maquina` (ex: "Máquina A").
2. Filtra consultores com especialidade equivalente.
3. Escolhe um aleatoriamente entre os disponíveis.
4. Salva consultor no cliente (ou deixa sem se não houver match).

## ♿ Acessibilidade e UX
- Suporte a teclado (menus, modais, expansão de cards, filtros avançados)
- Animações com fallback quando `prefers-reduced-motion` está ativo
- Estados ARIA: `aria-expanded`, `aria-live`, `aria-hidden`, entre outros

## 🔄 Evoluções Futuras (Sugestões)
- Persistência real (DB + camada de repositório)
- Autenticação e autorização por perfil
- Exportação (CSV / Excel) e importação
- Testes automatizados (Jest + Supertest para API, Playwright para fluxo end-to-end)
- Internacionalização total (strings restantes, datas, formatos)
- Dark mode + theming dinâmico
- WebSocket / SSE para multiusuário em tempo real

## ⚠️ Aviso
Projeto educativo. Não armazene dados sensíveis. Adapte segurança, rate limiting, logs estruturados e auditoria antes de qualquer uso externo.

## 📄 Licença
Distribuído sob a licença **MIT**. Consulte o arquivo `LICENSE` para detalhes.

## 🙌 Créditos
Criado por: **Caio Marques (Hiidoko)**  
LinkedIn: https://linkedin.com/in/hiidoko  

Se este projeto for útil para estudo, marque a estrela no repositório! ⭐
