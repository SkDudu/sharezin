# Sharezin

Aplicação web para dividir recibos em grupo — restaurantes, bares e eventos. Cada pessoa paga o que consumiu; taxa de serviço e couvert entram no cálculo automaticamente.

## Funcionalidades

- **Autenticação** — cadastro, login e alteração de senha (email/senha via Convex Auth)
- **Recibos** — criar com título, taxa de serviço (%) e cover por pessoa; status aberto ou fechado
- **Participantes** — entrar por código de convite; criador aprova/rejeita; marcar como pago
- **Itens** — cada participante adiciona o que consumiu; exclusão via solicitação (aprovada pelo criador)
- **Grupos** — criar, convidar por código/email, gerenciar membros
- **Dashboard** — gasto por mês e atalhos para recibos ativos
- **Calculadora** — apoio rápido à divisão
- **Tema** — claro/escuro

### Cálculo por participante

```
itens consumidos
+ taxa de serviço (proporcional ao consumo)
+ cover (dividido igualmente)
```

## Stack

| Camada | Tecnologia |
|--------|------------|
| Frontend | Next.js 16, React 19, Tailwind CSS 4, shadcn/ui |
| Backend | Convex (schema, queries, mutations, auth) |
| Auth | `@convex-dev/auth` (credentials / password) |
| Testes | Vitest + `convex-test` |

## Estrutura

```
sharezin/
├── convex/          # Backend: schema, auth, recibos, itens, grupos
├── web/             # App Next.js (App Router)
├── package.json     # Scripts e deps do Convex / testes
└── README.md
```

## Setup

### Pré-requisitos

- Node.js 20+
- Conta [Convex](https://www.convex.dev)

### 1. Instalar dependências

```bash
npm install
cd web && npm install && cd ..
```

### 2. Backend (Convex)

Na raiz do repositório:

```bash
npx convex dev
```

Isso cria/atualiza `.env.local` com `CONVEX_URL`, `CONVEX_SITE_URL` e o deployment.

### 3. Frontend

Em `web/.env.local`:

```env
NEXT_PUBLIC_CONVEX_URL=<mesmo valor de CONVEX_URL>
```

Depois:

```bash
cd web
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000).

## Produção

Frontend no **Cloudflare Workers** (OpenNext). Backend Convex self-hosted no **Railway** (Postgres).

| Serviço | Onde |
|---------|------|
| App (Next) | Cloudflare Workers |
| Convex API | Railway (self-host) |

URLs de produção ficam em variáveis de ambiente — não commitar no repositório. O dashboard Convex é interno; não documentar URL pública.

### Variáveis (não commitar)

Na raiz (`.env.local`):

```env
CONVEX_SELF_HOSTED_URL=<url do convex-backend>
CONVEX_SELF_HOSTED_ADMIN_KEY=<admin key>
```

Em `web/.env.local`:

```env
NEXT_PUBLIC_CONVEX_URL=<mesma URL do Convex API>
```

### Deploy frontend (Cloudflare)

Workers & Pages → Connect repo → **root directory** `web`.

| Setting | Valor |
|---------|-------|
| Build command | `npm ci && opennextjs-cloudflare build` |
| Env | `NEXT_PUBLIC_CONVEX_URL` = URL do Convex API |
| Compatibility flags | `nodejs_compat` (via `wrangler.jsonc`) |

CLI local:

```bash
cd web
npm run pages:build    # smoke test
npm run deploy         # deploy via wrangler
```

### Deploy backend (Convex)

```bash
npx convex deploy
```

### Após deploy do frontend

Auth JWT domain = URL pública do frontend:

```bash
npx convex env set SITE_URL https://<url-do-frontend>
npx convex deploy
```

(`CONVEX_SITE_URL` é built-in no self-host — não pode override via CLI.)

## Scripts

| Comando | Onde | Descrição |
|---------|------|-----------|
| `npx convex dev` | raiz | Backend Convex em modo dev |
| `npx convex deploy` | raiz | Push das functions (self-host ou cloud) |
| `npm run test` / `npm run test:once` | raiz | Testes do backend |
| `npm run dev` | `web/` | Next.js em desenvolvimento |
| `npm run build` | `web/` | Build Next.js |
| `npm run pages:build` | `web/` | Build OpenNext para Cloudflare |
| `npm run deploy` | `web/` | Deploy no Cloudflare Workers |
| `npm run lint` | `web/` | ESLint |

## Conceitos

| Papel | Pode |
|-------|------|
| **Criador** | Fechar recibo, aprovar/rejeitar joins e exclusões, remover participantes, fechar participação de outros |
| **Participante** | Adicionar itens, solicitar exclusão dos próprios, fechar a própria participação, ver totais |

Recibo **aberto** aceita mudanças; **fechado** fica somente leitura.

## Licença

Uso privado / projeto pessoal.
