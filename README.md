# CRM + Chatbot

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
### 🔐 Validação Unificada (Backend + Frontend)
### 💾 Persistência Abstrata (ClienteRepository)

Agora a camada de dados de clientes utiliza um repositório (`FileClienteRepository`) que implementa uma interface simples (getAll, addMany, update, delete). O armazenamento continua em arquivo JSON, porém:

- Operações assíncronas (`fs/promises`)
- Escrita atômica (arquivo temporário + rename) para reduzir risco de corrupção
- Lock serializado (fila de Promises) para evitar race conditions em múltiplos writes
- Fácil migração futura: criar outro repositório (ex: `SqliteClienteRepository`) mantendo a mesma assinatura e substituir no `clienteModel`.

Para migrar para outro backend de dados basta:
1. Criar nova classe com mesmos métodos.
2. Ajustar a instância no `models/clienteModel.js`.
3. (Opcional) Adicionar pooling/conexão e tratar erros específicos.

### 📊 Observabilidade & Logs

Logging estruturado com `pino` + middleware de requisição (`pino-http`):

- Middleware registra método, URL e status code.
- `errorHandler` central aplica formato consistente `{ message, code, trace? }` (stack só em dev/test).
- Nível configurável via `LOG_LEVEL` (default: debug em dev, info em produção).
- Pretty print automático se `NODE_ENV !== production` e `pino-pretty` estiver instalado.
- Logs de domínio (ex: operações de cliente) usam `logger.debug/info/warn/error`.

Exemplo de erro em desenvolvimento:
```json
{
  "message": "Campo 'email' é obrigatório.
  ","code": "error",
  "trace": "Error: Campo 'email' é obrigatório.\n    at ..."
}
```

Em produção a propriedade `trace` é omitida.


As regras de validação de cliente agora são definidas **uma única vez** em um schema declarativo (`validators/schema/clienteSchema.js`).

Pipeline:
1. O backend utiliza `validateWithSchema` para validar e normalizar.
2. Um script de build (`npm run build:schemas`) gera:
  - `public/validation/cliente-schema.json` (JSON consumível ou inspeção)
  - `public/js/shared/cliente-schema.js` (ES Module com o schema embutido)
3. O frontend importa `public/js/shared/validatorCore.js`, que replica normalização essencial e aplica as mesmas regras, evitando divergência.

Benefícios:
- Zero drift entre mensagens / regex / campos obrigatórios.
- Facilita evolução (adicionar campo = editar schema e rebuild).
- Reduz duplicação e risco de bypass na API.

Para adicionar um novo campo:
1. Edite `validators/schema/clienteSchema.js` (definindo `type`, `minLength`, `pattern`, etc.).
2. (Opcional) Adicione normalizador reutilizando helpers em `utils/normalizer.js`.
3. Rode `npm run build:schemas` (ou apenas `npm start` que executa `prestart`).
4. Use o campo normalmente no frontend e backend.

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
| GET | `/api/clientes?pagina=1&pageSize=25&sort=nome:asc&status=novo` | Lista paginada + filtros + ordenação |
| HEAD | `/api/clientes` | Retorna cabeçalho `X-Total-Count` |
| OPTIONS | `/api/clientes` | Métodos permitidos |
| GET | `/api/clientes/:id` | Obtém cliente por ID |
| POST | `/api/clientes` | Cria cliente(s) (objeto único ou array) |
| PUT | `/api/clientes/:id` | Atualização completa (compat) |
| PATCH | `/api/clientes/:id` | Atualização parcial |
| DELETE | `/api/clientes/:id` | Remove cliente |
| GET | `/api/meta/version` | Retorna versão do pacote |

Payload básico (POST / PUT):
Resposta paginada (GET /api/clientes):
```json
{
  "data": [ { "id": 123, "nome": "..." } ],
  "page": 1,
  "pageSize": 25,
  "total": 120,
  "totalPages": 5,
  "sort": "dataCadastro:desc",
  "filters": { "status": "novo", "cidade": null, "maquina": null, "consultor": null, "texto": null }
}
```

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
Implementado um primeiro pass de melhorias visando navegação assistiva, foco previsível e semântica limpa.

### Principais Decisões
- Lista de clientes convertida de múltiplos `<div>` para estrutura semântica `<ul role="list">` + `<li>`.
- Cada item de cliente atua como disclosure simplificado (expansível) com `role="button"`, `aria-expanded` e `aria-pressed` sincronizados.
- Contador dinâmico de clientes (`#totalClients`) marcado como `role="status"` + `aria-live="polite` (anuncia mudanças sem interromper leitura em leitores de tela).
- Painel de Filtros Avançados e cabeçalho recolhível expõem estado com `aria-expanded` + `aria-pressed` (reforçando affordance para botões toggle).
- Modal de edição recebe `role="dialog"`, `aria-modal="true"`, rótulo acessível e trap de foco (Tab/Shift+Tab ciclando dentro; restauração de foco ao fechar). Escape fecha modal.
- Atributos de ocultação (`aria-hidden`) aplicados dinamicamente a painéis analíticos quando header/filtros são colapsados.

### Interações de Teclado
| Componente | Teclas | Resultado |
| ---------- | ------ | --------- |
| Card de cliente | Enter / Espaço | Expande/colapsa (atualiza `aria-expanded` e `aria-pressed`) |
| Modal | Esc | Fecha e restaura foco anterior |
| Toggle Filtros Avançados | Enter / Clique | Mostra/oculta painel, atualiza estado ARIA |
| Header de filtros | Enter / Espaço / Ctrl+Shift+F | Colapsa/expande cabeçalho e oculta painéis analíticos |

### ARIA / Semântica Utilizada
| Recurso | Uso |
| ------- | --- |
| `role="list"` | Declara a lista de clientes para leitores em vez de apenas `div`s |
| `role="button"` em `<li>` | Clarifica interatividade dos itens expandíveis |
| `aria-expanded` | Estado de expansão do item de cliente e toggles de UI |
| `aria-pressed` | Estado de botões toggle (header, filtros avançados, item expandido) |
| `role="status"` + `aria-live="polite"` | Atualizações não intrusivas de total/paginação |
| `role="dialog"` + `aria-modal` | Modal de edição com foco gerenciado |
| `aria-hidden` dinâmico | Reduz ruído em painéis quando colapsados |

### Foco & Gestão de Ciclo
- Ao abrir modal, foco inicial no campo "nome" com atraso leve pós-animação.
- Trap de foco implementado interceptando Tab/Shift+Tab.
- Fechamento devolve foco ao elemento que disparou a ação (persistido em variável). 

### Possíveis Evoluções Futuras
- Inserir `aria-describedby` no modal para associar texto auxiliar contextual.
- Implementar anúncios de toast via região `aria-live="assertive"` isolada.
- Oferecer atalho global para busca (ex: `/` ou Ctrl+K) anunciando mudança de foco.
- Avaliar uso de `details/summary` nativo para simplificar cards (se mantiver design).
- Testes automatizados de acessibilidade (axe-core / @testing-library/jest-dom) no pipeline.

> Objetivo: manter a interface escalável sem depender de frameworks, garantindo baseline robusto para leitores de tela e navegação somente por teclado.

## 🔄 Evoluções Futuras (Sugestões)
- Persistência real (DB + camada de repositório)
- Autenticação e autorização por perfil
- Exportação (CSV / Excel) e importação
- Testes automatizados (Jest + Supertest para API, Playwright para fluxo end-to-end)
## 🧪 Testes & Qualidade

Infra adicionada:

- Jest para testes unitários e de integração
- Supertest para rotas HTTP
- ESLint (regras recomendadas + import + integração com Prettier)
- Prettier padronizando formatação
- GitHub Actions executando lint + testes em Node 18 e 20

Scripts:
```
npm test        # roda testes
npm run lint    # analisa qualidade de código
npm run format  # checa formatação
npm run format:fix # aplica formatação
```

Áreas cobertas:
- Normalizers (utils/normalizer)
- Validador unificado de cliente (schema) com snapshot de erro
- Seleção de consultor
- Integração /api/clientes (CRUD básico + paginação)

Para adicionar um novo teste, crie um arquivo em `tests/*.test.js`.

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
