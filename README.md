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

## Scripts

| Comando | Onde | Descrição |
|---------|------|-----------|
| `npx convex dev` | raiz | Backend Convex em modo dev |
| `npm run test` / `npm run test:once` | raiz | Testes do backend |
| `npm run dev` | `web/` | Next.js em desenvolvimento |
| `npm run build` | `web/` | Build de produção |
| `npm run lint` | `web/` | ESLint |

## Conceitos

| Papel | Pode |
|-------|------|
| **Criador** | Fechar recibo, aprovar/rejeitar joins e exclusões, remover participantes, fechar participação de outros |
| **Participante** | Adicionar itens, solicitar exclusão dos próprios, fechar a própria participação, ver totais |

Recibo **aberto** aceita mudanças; **fechado** fica somente leitura.

## Licença

Uso privado / projeto pessoal.
