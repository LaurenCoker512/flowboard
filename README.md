# Flowboard

Flexible task management and calendar app for neurodivergent users. Philosophy: no forced time-boxing, projects are first-class, the board is intentional.

## Tech Stack

- **Next.js 16** — App Router, TypeScript strict mode
- **Tailwind CSS v4** — utility styling
- **PostgreSQL** + Drizzle ORM — data layer
- **Auth.js v5** — credentials-based auth (single user)
- **Resend** — password reset emails
- **Upstash Redis** — rate limiting

## Local Setup

### Prerequisites

- Node.js 20+
- PostgreSQL running locally

### Install

```bash
npm install
npx playwright install chromium
```

### Environment

Copy `.env.example` to `.env.local` and fill in each value:

```bash
cp .env.example .env.local
```

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `NEXTAUTH_SECRET` | Random string ≥ 32 chars (`openssl rand -hex 32`) |
| `NEXTAUTH_URL` | App base URL (e.g. `http://localhost:3000`) |
| `RESEND_API_KEY` | Resend API key (starts with `re_`) |
| `UPSTASH_REDIS_REST_URL` | Upstash Redis REST URL |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis REST token |
| `SEED_USERNAME` | Username for the single account |
| `SEED_PASSWORD` | Password (min 12 chars) |
| `SEED_EMAIL` | Email for password recovery |

### Database

```bash
# Run migrations
npx drizzle-kit migrate

# Seed the single user account
npx tsx scripts/seed.ts
```

### Development

```bash
npm run dev
```

## Testing

```bash
# Unit + integration tests
npm test

# Watch mode
npm run test:watch

# E2E tests (requires dev server running or uses webServer config)
npm run test:e2e
```

## Other Commands

```bash
npm run typecheck    # TypeScript check
npm run lint         # ESLint
npm run format       # Prettier
```
