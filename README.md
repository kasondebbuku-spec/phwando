# Phwando

Event invitations, mobile-money ticketing and door check-in for hotels, venues, churches and families.

- **Guest page** (`/e/<slug>`): themed event page, ticket types, Airtel Money / MTN MoMo / Zamtel Kwacha checkout through Lenco, message wall
- **Tickets** (`/t/<reference>`): QR tickets issued as soon as the payment clears; `/tickets` recovers them with an SMS code
- **Organiser dashboard** (`/dashboard`): events per venue, sales, guest list, CSV export, message approval, keepsake message book, door check-in with the phone camera

Built with Next.js 15 (App Router), Prisma and PostgreSQL.

## Run it locally

1. Install Node 20+ and PostgreSQL, then create a database: `createdb phwando`
2. `cp .env.example .env` and fill in `DATABASE_URL`, `SESSION_SECRET` and `SEED_OWNER_PASSWORD`
3. `npm install`
4. `npm run db:migrate` (creates the tables)
5. `npm run db:seed` (creates Falls Way Events, the owner login and Pastor Benjamin Mwape's 40th)
6. `npm run dev` and open http://localhost:3000

Sign in at `/login` with `SEED_OWNER_EMAIL` and `SEED_OWNER_PASSWORD`.

## Payments (Lenco)

With `LENCO_MOCK="true"` (the default) payments are simulated: any number succeeds after about 6 seconds, and numbers ending in `2222222` fail.

To take real payments:

1. Get API keys from Lenco and set `LENCO_API_KEY`, and `LENCO_MOCK="false"`
2. In the Lenco dashboard, set the webhook URL to `https://<your-domain>/api/webhooks/lenco`
3. Set `APP_URL` to your public address so SMS links work

The ticket page also checks the payment status with Lenco while the guest waits, so tickets are issued even if a webhook is delayed.

## Not done yet

- **SMS**: messages are printed to the server log. Connect a provider in `src/lib/sms.ts`.
- **Card payments**: Lenco card collections need payload encryption; not built yet.
- **Photo storage**: photos are saved to `UPLOAD_DIR` on local disk. Use object storage (S3, R2, Supabase) on hosts without a persistent disk.
- **Staff accounts**: the `STAFF` role exists but there is no screen to invite staff yet.

## Project layout

```
prisma/schema.prisma        data model
prisma/seed.ts              first venue, owner login and event
src/lib/lenco.ts            Lenco API client, mock mode, webhook signature check
src/lib/orders.ts           marking orders paid and issuing tickets (exactly once)
src/app/e/[slug]            public event page
src/app/t/[reference]       guest ticket page
src/app/tickets             find my ticket
src/app/dashboard           organiser screens and server actions
src/app/api                 orders, messages, ticket lookup, uploads, Lenco webhook
```
