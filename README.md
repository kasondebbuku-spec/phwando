# Phwando

[![CI](https://github.com/kasondebbuku-spec/phwando/actions/workflows/ci.yml/badge.svg)](https://github.com/kasondebbuku-spec/phwando/actions/workflows/ci.yml)

**Event invitations, mobile-money ticketing and door check-in for Zambian venues, churches and families.**

Hosting an event in Zambia usually means WhatsApp invitations, cash at the door and a printed guest list. Phwando gives every event a themed page where guests buy tickets with **Airtel Money, MTN MoMo or Zamtel Kwacha**, receive a QR ticket the moment the payment clears, and get scanned in at the door with the organiser's phone.

Built with **Next.js 15 (App Router), TypeScript, Prisma and PostgreSQL**, with payments through the **Lenco** API.

## Features

**For guests**
- Themed event page (`/e/<slug>`) for birthdays, weddings, galas, conferences and church events
- Ticket tiers, including table tickets that admit a whole table with one QR code
- Mobile-money checkout: enter your number, approve the PIN prompt on your phone, the ticket appears
- QR tickets at a private link (`/t/<reference>`), recoverable by SMS code at `/tickets`
- Message wall and wishes for the person being celebrated

**For organisers** (`/dashboard`)
- Multiple events per venue, sales totals and guest list with CSV export
- Door check-in by scanning QR codes with the phone camera; a code can only be used once
- Message moderation and a printable keepsake message book
- Owner and staff roles, each organisation sees only its own events

## Architecture

```mermaid
flowchart LR
    Guest([Guest phone]) -->|event page, checkout| App
    Organiser([Organiser]) -->|dashboard, door scanner| App
    subgraph App[Next.js app]
      Pages[Server-rendered pages] --> Lib[lib: orders, lenco, auth]
      API[API routes + webhook] --> Lib
    end
    Lib -->|Prisma| DB[(PostgreSQL)]
    Lib -->|collect mobile money| Lenco[Lenco API]
    Lenco -->|signed webhook| API
    Lenco -->|PIN prompt| Guest
```

### How a payment becomes a ticket

1. The guest picks a tier and enters their number. The server creates a `PENDING` order and asks Lenco to collect the amount.
2. The guest approves the PIN prompt on their phone.
3. Lenco calls `/api/webhooks/lenco`. The server checks the **HMAC-SHA512 signature** before trusting it.
4. Meanwhile the guest's page polls the order. If the webhook is slow, the server asks Lenco for the status directly.
5. Whichever arrives first, the webhook or the poll, marks the order `PAID` and issues the tickets.

Steps 3 and 4 can happen at the same moment, so `markOrderPaid` claims the order with a conditional update inside a transaction. Only the call that changes the order from unpaid to `PAID` issues tickets. A test fires five confirmations at once and checks that tickets are issued exactly once.

## Data model

```mermaid
erDiagram
    Organization ||--o{ User : has
    Organization ||--o{ Event : owns
    Event ||--o{ TicketTier : offers
    Event ||--o{ Order : receives
    Event ||--o{ Message : collects
    TicketTier ||--o{ Order : "sold as"
    Order ||--o{ Ticket : issues
```

Full schema: [`prisma/schema.prisma`](prisma/schema.prisma).

## Engineering decisions

| Decision | Why |
|---|---|
| Money stored as whole **ngwee** (`Int`) | No floating-point rounding errors in totals |
| Order reference doubles as the ticket link | 12 random characters from a 32-letter alphabet, so links can't be guessed |
| Codes avoid `0 O 1 I` | Easy to read aloud at the door or over the phone |
| Webhook signature compared with `timingSafeEqual` | Prevents timing attacks on the signature check |
| Status polling as well as webhooks | Guests still get tickets when a webhook is delayed or lost |
| Organiser sessions are signed JWTs in `httpOnly` cookies | Page scripts can't read them; checked on every dashboard request |
| Every dashboard query is scoped by `organizationId` | One venue can never see another's events |
| `LENCO_MOCK` mode | The whole payment flow runs locally with no API keys |
| Dates shown in `Africa/Lusaka` | Correct event times wherever the server runs |

## Testing

```bash
npm test
```

55 tests with [Vitest](https://vitest.dev):

- **Unit tests**: phone number parsing and network detection, ticket codes, Kwacha formatting, Lusaka time zone, webhook signature checks, the mock payment flow
- **Database tests** against a real PostgreSQL: tickets issued per seat, exactly-once issuing under concurrent confirmations, table tickets, a late failure can't undo a paid order

The database tests run when `TEST_DATABASE_URL` is set and are skipped otherwise.

GitHub Actions runs type checking, linting, all tests (with a PostgreSQL service) and a production build on every push and pull request: [`.github/workflows/ci.yml`](.github/workflows/ci.yml).

## Run it locally

**Requirements:** Node 20+ and PostgreSQL (or Docker).

```bash
git clone https://github.com/kasondebbuku-spec/phwando.git
cd phwando
docker compose up -d          # PostgreSQL with phwando and phwando_test databases
cp .env.example .env          # then fill in SESSION_SECRET and SEED_OWNER_PASSWORD
npm install
npm run db:migrate            # create the tables
npm run db:seed               # sample venue, owner login and event
npm run dev                   # http://localhost:3000
```

With Docker, use `postgresql://phwando:phwando@localhost:5432/phwando?schema=public` as `DATABASE_URL`, and the same with `phwando_test` as `TEST_DATABASE_URL`.

Sign in at `/login` with `SEED_OWNER_EMAIL` and `SEED_OWNER_PASSWORD`.

### Payments

With `LENCO_MOCK="true"` (the default), payments are simulated: any number succeeds after about 6 seconds, and numbers ending in `2222222` fail.

To take real payments:

1. Get API keys from Lenco, set `LENCO_API_KEY` and `LENCO_MOCK="false"`
2. In the Lenco dashboard, set the webhook URL to `https://<your-domain>/api/webhooks/lenco`
3. Set `APP_URL` to your public address so SMS links work

## Project layout

```
prisma/schema.prisma        data model
prisma/seed.ts              first venue, owner login and event
src/lib/lenco.ts            Lenco API client, mock mode, webhook signature check
src/lib/orders.ts           marking orders paid and issuing tickets (exactly once)
src/lib/auth.ts             organiser sessions and per-organisation access
src/app/e/[slug]            public event page
src/app/t/[reference]       guest ticket page
src/app/tickets             find my ticket
src/app/dashboard           organiser screens and server actions
src/app/api                 orders, messages, ticket lookup, uploads, Lenco webhook
tests/                      unit and database tests
```

## Roadmap

- **SMS**: messages are printed to the server log; connect a provider in `src/lib/sms.ts`
- **Card payments**: Lenco card collections need payload encryption
- **Photo storage**: photos go to local disk (`UPLOAD_DIR`); move to S3, R2 or Supabase Storage for hosted deployments
- **Staff invitations**: the `STAFF` role exists but there is no screen to invite staff yet

## Author

**Kasonde Bbuku**, BSc Computer Science (Software Engineering), University of Zambia
GitHub: [@kasondebbuku-spec](https://github.com/kasondebbuku-spec)
