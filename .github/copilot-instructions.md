<!-- .github/copilot-instructions.md -->

# Copilot / AI Agent Instructions — Nest

Purpose: short, actionable guidance to help an AI coding agent be productive in this codebase.

**Quick Start (commands the agent can run)**

- **Dev server:** `npm run dev` (uses `next dev --turbopack -p 9002`). Note `turbopack` is enabled in `package.json`.
- **Build:** `npm run build` (Next.js 15 App Router).
- **Start (prod):** `npm run start`.
- **Lint / Types:** `npm run lint`, `npm run typecheck`.
- **Health checks:** `npm run validate-env`, `npm run test-db`, `npm run test-email` (see `src/lib/*` helpers referenced in scripts).

**Big-picture architecture**

- Frontend: Next.js 15 App Router under `src/app` (server + client components). UI components in `src/components`.
- Domain logic: `src/hooks` and `src/services` wrap data flows and side effects.
- Infrastructure & data: Supabase (Postgres + Realtime + Storage). DB migrations and functions live in `supabase/migrations` and `supabase/functions`.
- Server helpers: `src/lib` contains Supabase clients, `env-validation`, `email`, `apiClient` and other cross-cutting utilities.
- API surface: serverless API routes in `src/app/api/*` (use these for orchestration and webhook endpoints).

**Key files and examples (explicit references)**

- Use browser client for client-side operations: `src/lib/supabase/client.ts`.
- Use server-side client with service-role key for server code: `src/lib/supabase/server.ts`.
- API client helpers: `src/lib/apiClient.ts` (calls use `credentials: 'include'` and raise on non-OK responses).
- Environment validation entrypoint: `src/lib/env-validation.ts` (referenced by `npm run validate-env`).
- Scripts and utilities: `scripts/` (DB helpers, realtime toggles, icon generation) — inspect before changing infra.

**Conventions & patterns specific to this repo**

- App Router (Next 15): prefer colocated `page.tsx`/`layout.tsx` components under `src/app`.
- Use Zod for request/response validation (look for `.parse()` usages in API routes).
- RLS-first approach: security enforced at DB layer. When editing server endpoints, ensure RLS expectations match migration/policy files in `supabase/migrations`.
- Non-blocking external calls: many server routes call external services (webhooks/email) and handle failures gracefully — copy pattern rather than reverting to throwing.
- Shared UI: `src/components` contains small, reusable components. Keep new components small and prop-driven.

**Editing guidance for agents**

- Changing DB schema: update `supabase/migrations/*` and any server-side code that expects columns/defaults. Confirm RLS policy names and commands.
- Changing Supabase access: server code must use `src/lib/supabase/server.ts` and `SUPABASE_SERVICE_ROLE_KEY` from env; client code must use `src/lib/supabase/client.ts` and only public anon keys.
- When adding API routes, follow existing structure in `src/app/api/*` and reuse `src/lib/apiClient.ts` patterns for error handling and credentials.

**Build/test/debug notes**

- Unit/test runner: `npm run test` (Jest). Playwright is available (`@playwright/test`) for E2E where present.
- Hot-reload: dev runs with `--turbopack`; if you experience unusual HMR behavior try running `next dev` without turbopack locally.
- Troubleshooting: `npm run realtime:check` and `npm run realtime:setup` for Supabase realtime checks; `npm run troubleshoot:realtime` for diagnostic scripts.

**Environment & secrets**

- Required env vars are documented in `README.md`. Do NOT hardcode secrets — use `.env.local` for local dev and platform secrets in CI/CD.
- The repo includes `npm run validate-env` to assert expected env variables via `src/lib/env-validation`.

**When to ask a human**

- Any change that requires rotating or exposing `SUPABASE_SERVICE_ROLE_KEY` or modifying RLS policies — request confirmation.
- Adding new long‑lived background jobs, new buckets, or external webhooks that need platform secrets.

**Where to read more**

- High-level docs: `Project-docs/` and `README.md` (top-level). For DB policies and schema, see `supabase/migrations`.

**Writing style & LLM output rules**

- Tone: write like a human speaks — direct, confident, and active voice. Use contractions for a warmer tone (e.g. "I'll", "can't").
- Be specific: back claims with examples or file references (e.g. point to `src/lib/email.ts` when discussing email flows).
- Avoid the banned words/phrases listed in `rules/writting.md` (e.g. remove vague marketing words like "innovative", "synergy"). Prefer concrete descriptions.
- LLM output: avoid intros like "As an AI..." or clichés like "In conclusion." Replace em-dashes with semicolons or sentence breaks and clean smart quotes.

**PR / Review Checklists (quick reference)**
`Code review` (readability & clarity)

- Favor clear, straightforward logic over clever one-liners; prefer explicitness in domain logic (hooks/services).
- Names should be self-explanatory and consistent with existing modules.
- Use inline comments to explain _why_ (not what) for complex logic.

`Feature checklist` (requirements & UX)

- Verify feature implements the user story and handles edge cases (look for loading/error UI states in `src/components`).
- Confirm feature flags are implemented correctly if present.
- Ensure performance (no unindexed queries) and logging/tracking for important events.
- Accessibility: alt text, labels, keyboard navigability.

`Structure checklist` (architecture & placement)

- Place new code in the appropriate layer: UI in `src/components`/`src/app`, data logic in `src/hooks`/`src/services`, API logic in `src/app/api`.
- Keep modules loosely coupled and single-responsibility.
- Avoid adding unnecessary dependencies; reuse utilities in `src/lib` when possible.

If anything here is unclear or you want more detail for a particular area (tests, infra, or a specific API route), tell me which part and I'll expand the instructions or add examples.
