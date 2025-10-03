# CRM + Chatbot

> 🌐 Available languages: [Português (Brasil)](README_PT.md) · **English**

Full-stack JavaScript application that showcases a modern mini CRM connected to a chatbot. The focus is on polished UX, accessibility from day one, and solid engineering practices (unified validation, automated tests, modular architecture).

> Educational/portfolio project: all data is fictional and **must not be used in production** without hardening security, persistence, and monitoring.

## 🔗 Demo & Preview
- **Live demo:** [chatbot-crm-peuq.onrender.com](https://chatbot-crm-peuq.onrender.com)
- **Screenshot:**

  ![CRM + Chatbot Interface](./public/img/print.png)

## 🚀 Tech Stack
- **Frontend:** Vanilla ES Modules + Tailwind CSS
- **Backend:** Node.js 18 + Express 5
- **Testing:** Jest, Supertest, and snapshots
- **Logging & observability:** Pino + pino-http
- **CI/CD:** GitHub Actions (lint, tests, schema/CSS builds)

## 🌐 Overview

The CRM captures, organizes, and tracks leads through a lightweight SPA (no heavyweight frameworks) styled with Tailwind. The embedded chatbot collects lead info, sends it to the main shell via `postMessage`, and the CRM handles normalization, validation, and automatic consultant assignment.

## ✨ Key Features

- Client management with modal dialogs and inline editing that preserves context
- Advanced filters by City, Machine, Consultant, and Status with persisted state
- Adjustable pagination (25/50/100/All) and multi-column sorting
- Unified search across name/email plus dynamic metrics by status, consultant, and machine
- Consultants tab with an asynchronous board of clients by specialist
- Responsive chatbot that forwards leads directly into the CRM
- Status timeline plus CSV export of clients
- Accessibility baked into the markup: keyboard navigation, consistent ARIA, restrained visual feedback
- Mobile-first responsive layout with glassmorphism and collapsible sidebar
- Reusable layers for validation, normalization, and logging

## 🧩 Architecture

| Layer | How it works |
| ----- | ------------ |
| Backend (Express 5) | REST API under `/api/*`, static assets served from `public/`, centralized logging/error middleware. |
| Models / Logic | Domain orchestration in `models/` and `public/js/crm/logic.js`, isolating persistence from presentation. |
| Validation | Single schema (`validators/schema/clienteSchema.js`) shared between backend and frontend. |
| Styling | Custom Tailwind setup in `src/tailwind.css`, design tokens compiled to `public/styles/app.css`. |

### 🎨 UI & Tailwind

- Custom design system with CSS variables, gradients, and shadows wrapped in Tailwind layers.
- Mobile-first breakpoints: compact sidebar, full-screen chatbot, and tuned pages like "About".
- `npm run build:css` generates the minified bundle; `npm start` runs `prestart` (schema + CSS builds) before spinning the server.
- Selects, modals, and cards tuned for contrast and accessibility.

### 🔐 Unified Validation (Backend + Frontend)
- Declarative schema defines fields, types, patterns, and messages.
- `npm run build:schemas` exports JSON and ES Module variants consumed by the frontend.
- `validatorCore` applies the same normalizers (name, phone, email) as the backend to avoid drift.
- Adding new fields only requires updating the schema, triggering the build, and using the field on both sides.

### 💾 Abstracted Persistence (ClienteRepository)
- `FileClienteRepository` keeps data in JSON with async operations, atomic writes, and a write queue to avoid race conditions.
- Switching storage just means implementing another repository (Mongo, PostgreSQL, SQLite, etc.) with the same contract and swapping the instance in `clienteModel`.

### 📊 Observability & Logs
- Structured logging via `pino` + `pino-http`, levelled through `LOG_LEVEL`.
- Central `errorHandler` standardizes payloads; stack traces appear only in dev/test.
- Optional `pino-pretty` for friendlier output outside production.

Validation lives in a single schema (`clienteSchema`). While the backend calls `validateWithSchema`, the frontend consumes the generated version to guarantee consistent messages and normalization. Adding fields boils down to editing the schema, rebuilding, and consuming the new data in both layers.

| Frontend SPA | ES Modules loading partial views through `viewLoader.js`, keeping the shell stable. |
| Chatbot | Runs inside an iframe (`public/html/chatbot.html`), guided flow, integration via `postMessage`. |

## 🗂 Folder Structure (summary)

```
public/
  html/         # clientes, consultores, about, chatbot views
  js/
    crm/        # CRM core logic, rendering, filters
    chatbot/    # question flow, DOM, validation for the widget
  styles/       # compiled CSS (app.css) and themes
models/         # domain models and repository layer
controllers/    # Express controllers
routes/         # HTTP routes
validators/     # schema and reusable validators
utils/          # normalizers, logger, helpers
```

> Current storage is **in-memory (JSON file)**. Restarting the server clears the data. Upgrading to a real database just means creating a new repository and plugging it into the model.

## 🚀 Getting Started Locally

Prerequisite: [Node.js 18+](https://nodejs.org/)

```bash
npm install
npm start
```

The app runs at `http://localhost:3000`. `npm start` executes `npm run build:schemas && npm run build:css` before launching the server, ensuring Tailwind and the schema are fresh. To rebuild CSS manually, run `npm run build:css` whenever `src/tailwind.css` changes.

## 🔗 Core Endpoints

| Method | Route | Description |
| ------ | ----- | ----------- |
| GET | `/api/clientes?pagina=1&pageSize=25&sort=nome:asc&status=novo` | Paginated list with filters and sorting |
| HEAD | `/api/clientes` | Returns `X-Total-Count` for pagination |
| OPTIONS | `/api/clientes` | Reports allowed methods |
| GET | `/api/clientes/:id` | Fetches a client by ID |
| POST | `/api/clientes` | Creates one or many clients |
| PUT | `/api/clientes/:id` | Full update |
| PATCH | `/api/clientes/:id` | Partial update |
| DELETE | `/api/clientes/:id` | Removes a client |
| GET | `/api/meta/version` | Returns the app version |

Sample payload for creation/update:

```json
{
  "nome": "Exemplo",
  "email": "exemplo@dominio.com",
  "telefone": "(11) 99999-9999",
  "cidade": "São Paulo",
  "maquina": "Máquina A",
  "horario": "Manhã",
  "status": "novo",
  "consultor": "(optional)"
}
```

Typical paginated response:

```json
{
  "data": [{ "id": 123, "nome": "..." }],
  "page": 1,
  "pageSize": 25,
  "total": 120,
  "totalPages": 5,
  "sort": "dataCadastro:desc",
  "filters": {
    "status": "novo",
    "cidade": null,
    "maquina": null,
    "consultor": null,
    "texto": null
  }
}
```

## 🤖 Chatbot Integration
- Guided flow collects name, email, phone, city, preferred machine, and best contact time.
- Each answer is validated through the shared schema; the machine step displays selectable cards.
- At the end, data is sent via API; when embedded, a `postMessage` immediately syncs the new lead with the shell.
- Network issues trigger a `postMessage` fallback plus toast feedback.

## 🧠 Automatic Consultant Assignment
1. The lead picks a machine of interest.
2. Consultant repository is filtered by matching specialty.
3. A consultant is randomly selected from eligible candidates.
4. If none are compatible, the lead remains unassigned for manual handling.

## ♿ Accessibility & UX

First iteration focused on predictable behavior for screen-reader and keyboard users.

### Key Decisions
- Client list rendered as `<ul role="list">` + `<li>` expandable items with `role="button"`.
- Filter panel and header expose `aria-expanded` / `aria-pressed`.
- Dynamic counters use `role="status"` + `aria-live="polite"` for unobtrusive updates.
- Edit modal implements `role="dialog"`, `aria-modal`, focus trap, and Esc to close.
- Hidden analytical panels receive `aria-hidden` to reduce noise.

### Keyboard Interactions
| Component | Keys | Result |
| --------- | ---- | ------ |
| Client card | Enter / Space | Toggles expansion while updating ARIA state |
| Modal | Esc | Closes modal and restores focus to trigger |
| Advanced Filters toggle | Enter / Click | Shows/hides the panel while narrating state |
| Filter header | Enter / Space / Ctrl+Shift+F | Toggles header collapse and analytics panels |

### ARIA / Semantics Used
| Feature | Purpose |
| ------- | ------- |
| `role="list"` | Semantic structure for the main listing |
| `role="button"` on `<li>` | Signals that the item is interactive/expandable |
| `aria-expanded` | Expansion state for cards and panels |
| `aria-pressed` | Toggle state for buttons |
| `role="status"` + `aria-live="polite"` | Subtle counter updates |
| `role="dialog"` + `aria-modal` | Accessible modal with controlled focus |
| `aria-hidden` | Prevents hidden content from being read |

### Focus Management
- Modal opens with delayed focus on the "Name" field after animation.
- Focus trap blocks escape via Tab/Shift+Tab.
- Closing the modal returns focus to whoever opened it.

### Accessibility Backlog
- Run NVDA/VoiceOver sessions and refine contextual descriptions.
- Offer a high-contrast mode and animation preferences.
- Add an accessible guided tour highlighting filters and panels.
- Automate axe-core/pa11y audits in the CI pipeline.

> Goal: keep the interface scalable without heavy frameworks while remaining accessible to keyboard and screen-reader users.

## 🔄 Future Enhancements
- Integrations with external providers (marketing, help desk) via webhooks.
- Scheduled reports with PDF export and secure sharing.
- Push/web notifications for hot leads.
- IFTTT-style automation engine with execution history.
- Official packaging (Docker Compose) plus cloud deployment guide.

## 🧪 Testing & Quality

- Jest covers unit and integration tests (`tests/*.test.js`).
- Supertest validates HTTP routes.
- ESLint + Prettier enforce consistency.
- GitHub Actions runs lint, tests, and builds on Node 18/20.

Useful scripts:

```
npm test        # run the full suite
npm run lint    # static analysis
npm run format  # formatting check
npm run format:fix # auto-fix formatting
```

Current coverage: normalizers, unified validator, consultant selection, and `/api/clientes` CRUD + pagination.

### Technical Backlog
- Expand end-to-end coverage with Playwright (chatbot → CRM flow).
- Add performance testing (Lighthouse/WebPageTest) to CI.
- Instrument opt-in product analytics (Matomo/PostHog) without tracking sensitive data.

## ⚠️ Disclaimer
Educational project. Do not store sensitive data. Add authentication, rate limiting, audit logs, and hardened infrastructure before any real-world use.

## 📄 License
Released under the **MIT** License. See `LICENSE` for details.

## 🙌 Credits
Created by **Caio Marques (Hiidoko)**  \
[LinkedIn](https://linkedin.com/in/hiidoko)

If this project helped you, drop a ⭐