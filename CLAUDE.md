# CLAUDE.md — project memory for Claude Code

ISFY-mini: Express + Supabase (PostgreSQL) API for a sales marketplace + CRM that recovers abandoned carts.

## Commands
- `cd backend && npm install`
- `npm run dev` / `npm start` / `npm test` / `npm run lint` / `npm run build`

## Conventions
- CommonJS, Node >= 18. Routes are thin; business logic lives in `src/services/`.
- Every handler is wrapped in `asyncHandler`; throw `HttpError(status, msg)` — never `res.status(500)` by hand.
- All DB calls go through `unwrap(await query, 'context')` so errors are logged with context.
- Log with `logger.info/warn/error(event, fields)` (JSON lines). No bare `console.log` except in integration stubs.
- Validate input at the route edge (`requireUuid`, enum checks) before touching the DB.
- Schema changes = a new numbered file in `supabase/migrations/`. Never edit an applied migration.
- Tables have RLS enabled; the backend must use `SUPABASE_SERVICE_ROLE_KEY`.
