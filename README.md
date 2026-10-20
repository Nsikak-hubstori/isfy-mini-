# ISFY-mini — Built with Claude Code for ISFY Interview

A working miniature of what ISFY (iSellForYou) is building: a **sales marketplace for independent reps** plus an **in-house CRM** that recovers abandoned carts for US ecommerce brands.
Built AI-first with Claude / Claude Code, to show how I ship backend work end to end.

![CI](https://github.com/Nsikak-hubstori/isfy-mini-/actions/workflows/ci.yml/badge.svg)

## About ISFY

ISFY is a Miami sales company. Its phone team calls shoppers who abandoned a cart and recovers the sale for US ecommerce brands. It is now building a US sales marketplace where independent reps pick up recovery work, and its own CRM. Claude and Claude Code are the main coding tools.

## Architecture

```
 Shopify store ──(checkout webhook, HMAC-signed)──┐
                                                  ▼
 Rep / Admin UI ──REST──►  Express API (backend/)  ──► Supabase PostgreSQL
 (future)                  ├─ routes/   thin HTTP layer + validation
                           ├─ services/ crm · stripe · twilio · sendgrid
                           └─ middleware/ logger · errors · auth
                                  │
        structured JSON logs ─────┴──► Vercel / Railway log drain (monitoring)

 GitHub (main) ─► GitHub Actions CI (lint · test · build)
              ├─► Vercel deploy (API)
              └─► Supabase GitHub integration (applies supabase/migrations/*)
```

Cart lifecycle: `new → contacted → recovered | lost`. A call logged with outcome `recovered` closes the loop: cart status, rep total, commission row and payout stub, all from one request.

## Tech stack → job requirements

| ISFY asks for | Where it is in this repo |
|---|---|
| Node.js backend | Express API, `backend/src` |
| SQL / PostgreSQL | Supabase schema, FKs, CHECK constraints, indexes, RLS, seed data: `supabase/migrations/001_isfy_schema.sql` |
| Git + code review | PR-based flow, conventional commits, `CLAUDE.md` conventions |
| CI/CD | `.github/workflows/ci.yml` (lint, test, build on Node 20 and 22); `vercel.json`; migrations auto-applied from `main` |
| Cloud deploys | Vercel (API); Railway-compatible (`npm start`, `/health`) |
| REST APIs | 12 endpoints, see below |
| Payments | `services/stripe.js`: commission + payout record (Connect transfer is the next step) |
| Telephony | `services/twilio.js`: call logs, SMS log |
| Email | `services/sendgrid.js`: recovery email log |
| CRM tools | `services/crm.js`: lifecycle logic + external CRM sync hook |
| Logging / monitoring | JSON-line logger, request IDs, central error handler, `/health`, process-level crash hooks |
| Ship weekly | Roadmap below |

Third-party integrations are **stubs by design**: they log, persist to the DB, and fail safely. Real API calls are the clearly marked next step.

## How I used Claude / Claude Code

**Workflow**
1. Wrote a spec up front (schema, routes, integrations, CI) and gave it to Claude as one prompt.
2. Claude drafted schema and code; I reviewed every file, then tightened it (see "Review notes").
3. Migration was applied to Supabase and verified by querying row counts.
4. `CLAUDE.md` records the conventions so later Claude Code sessions stay consistent.

**Prompts used** *(edit this list to match your real session history before sending the repo)*
1. "Build ISFY-mini: Sales Marketplace + CRM for abandoned cart recovery" with the full spec (schema A, backend B, CI/CD C).
2. *(add)* "Review `crm.js` for race conditions" 
3. *(add)* "Write tests for webhook HMAC validation"
4. *(add)* "Add Stripe Connect transfer behind `STRIPE_SECRET_KEY`"

**Review notes — where I corrected or hardened AI output**
- RLS is on for all tables, so the anon key alone is denied by design. The backend prefers `SUPABASE_SERVICE_ROLE_KEY`.
- UUID validator is a shape check (not RFC-versioned) so seed IDs work.
- Shopify webhook verifies HMAC over the **raw body** with a timing-safe compare.
- Known gap I'm flagging, not hiding: `creditRep` is read-modify-write; it should be a SQL function (see next week).

**Suggested commit history**
```
feat(db): add 001 schema, indexes, RLS and seed data
feat(api): express skeleton, structured logging, error handling
feat(api): carts, reps marketplace, assignments
feat(api): call logging with cart lifecycle + commission
feat(integrations): stripe/twilio/sendgrid stubs
feat(api): stats and leaderboard endpoints
ci: github actions + vercel config
docs: README, CLAUDE.md
```

## API documentation

Base URL: `http://localhost:3000`. If `API_KEY` is set, send `x-api-key` on `/api/*` (webhook excepted). Errors: `{ "error": "...", "request_id": "..." }`.

| Method & path | Purpose |
|---|---|
| `GET /health` | Liveness probe |
| `GET /api/carts?status=new&store_id=&limit=` | List carts (joined with store) |
| `POST /api/carts/:id/assign` `{rep_id}` | Assign cart to an active rep (409 if already assigned/closed) |
| `POST /api/webhooks/shopify/abandoned-cart` | Ingest a cart; requires `X-Shopify-Shop-Domain` + `X-Shopify-Hmac-Sha256` |
| `GET /api/reps?min_rating=` | Marketplace: active reps by rating |
| `GET /api/reps/:id/stats` | Assignments, calls, talk time, commissions |
| `POST /api/calls/log` `{cart_id, rep_id, outcome, duration_seconds?, notes?, recording_url?}` | Log call; outcome one of `no_answer, voicemail, callback, not_interested, recovered` |
| `GET /api/calls?rep_id=&cart_id=` | Call history |
| `POST /api/recovery/email` `{cart_id, template_name?, subject?}` | Send (stub) recovery email |
| `POST /api/recovery/sms` `{cart_id, message?}` | Send (stub) recovery SMS |
| `GET /api/stats/recovered` | Total recovered $, conversion rate, counts by status |
| `GET /api/stats/reps-leaderboard?limit=` | Reps ranked by recovered $ |

```bash
curl localhost:3000/api/carts?status=new
curl -X POST localhost:3000/api/carts/c3000000-0000-0000-0000-000000000001/assign \
  -H 'content-type: application/json' -d '{"rep_id":"b2000000-0000-0000-0000-000000000001"}'
curl -X POST localhost:3000/api/calls/log -H 'content-type: application/json' \
  -d '{"cart_id":"c3000000-0000-0000-0000-000000000001","rep_id":"b2000000-0000-0000-0000-000000000001","outcome":"recovered","duration_seconds":240}'
```

## How to run locally

```bash
git clone https://github.com/Nsikak-hubstori/isfy-mini-.git && cd isfy-mini-/backend
cp .env.example .env      # fill in SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
npm install
npm run dev               # http://localhost:3000/health
npm test && npm run lint
```
Database: link the repo to your Supabase project (GitHub integration) or paste `supabase/migrations/001_isfy_schema.sql` into the SQL editor.

## Environment variables

See `backend/.env.example`. Required: `SUPABASE_URL` plus `SUPABASE_SERVICE_ROLE_KEY` (or `SUPABASE_ANON_KEY`, which RLS will restrict). Optional: `API_KEY`, `STRIPE_SECRET_KEY`, `TWILIO_SID`, `SENDGRID_API_KEY`, `COMMISSION_RATE`, `LOG_LEVEL`.
**Never commit `.env` or the service-role key.**

## Demo screenshots plan

1. Supabase table editor showing the 7 tables and seeded rows
2. `curl` of `GET /api/carts?status=new` and the marketplace
3. Assign cart → log `recovered` call → show commission row + leaderboard change
4. GitHub Actions run (green) and Vercel deployment
5. JSON logs with a request id traced through a failing request

## What I would ship next week

- **Week 2:** atomic `credit_rep()` SQL function; webhook idempotency (store Shopify checkout id, unique index); real SendGrid send
- **Week 3:** Twilio click-to-call + recording webhook; Stripe Connect onboarding and real transfers
- **Week 4:** rep auth (Supabase Auth) with per-rep RLS policies; rep marketplace UI
- **Ongoing:** Sentry alerts on 5xx, integration tests against a Supabase branch, OpenAPI spec
