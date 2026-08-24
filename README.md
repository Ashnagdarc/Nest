# Nest

Asset and equipment management system built for Eden Oasis Realty.

Nest replaces ad-hoc equipment tracking with a shared workspace for inventory, availability, requests, approvals, assignments, returns, and reporting.

## What it does

- Tracks equipment inventory, quantities, conditions, and availability
- Supports request, approval, assignment, check-in, and return workflows
- Provides separate user and administrative dashboards
- Includes role-aware access, notifications, CSV import/export, reporting, and analytics
- Uses Supabase for authentication, data, storage, and real-time updates

## Stack

Next.js 16.2.7 · TypeScript · Supabase (Auth, PostgreSQL, Storage, and Realtime) · Tailwind CSS · React Query · Zod

## Repository structure

- `src/app` — application routes and API handlers
- `src/components` — reusable interface and dashboard components
- `src/hooks` and `src/services` — client-side data and domain logic
- `supabase` — migrations, policies, and functions
- `src/app/api/__tests__` — API-focused Jest coverage
- `tests` — Playwright end-to-end coverage
- `Project-docs` — fuller product, technical, and operational documentation

## Run locally

Requirements: Node.js 20+ and a Supabase project.

```bash
npm install
cp .env.example .env.local
npm run dev
```

The development server runs on `http://localhost:9002`.

## Environment

Set the required Supabase values in `.env.local`. Optional email, web-push, webhook, and scheduled-job settings are documented in [`.env.example`](.env.example). Never commit real credentials.

## Checks

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

Browser tests require a running, configured application and test accounts:

```bash
npm run test:e2e
```

## Further documentation

The detailed project material is kept in [`Project-docs`](Project-docs/README.md), including the product requirements, technical design, API reference, user manual, deployment notes, and release history.

## Notes

This repository intentionally contains no dashboard screenshots because the application uses company data. Public logo assets are included, but product screens should only be added after sensitive information is removed.
