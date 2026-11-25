# AGENTS.md

## Project
Fieldwork is a product catalogue MVP: React + TypeScript client, Express + TypeScript API, Fake Store product adapter, and SMTP enquiries. Preserve this as an evolvable foundation, not a throwaway demo.

## Commands
- `docker compose up --build` — full app at http://localhost:8080 and Mailpit at http://localhost:8025.
- `npm ci` then `npm run dev` — local development (Mailpit must be running separately).
- `npm run check` — typecheck, all tests, and production builds for both workspaces.

## Structure and boundaries
- `client/src/pages` contains route-level screens; `client/src/components` contains reusable UI.
- `client/src/lib/api.ts` is the only frontend HTTP boundary. Never call Fake Store or another product provider directly from the client.
- `server/src/catalog` owns product-source integration, ranking, category grouping and search.
- `server/src/enquiries` owns validation and enquiry composition.
- `server/src/email` contains the delivery port and SMTP adapter.
- `server/src/index.ts` is the dependency composition root; keep Express routes free of provider-specific code.

## Conventions
- Keep TypeScript strict and prefer small, explicit functions over abstraction for its own sake.
- Validate untrusted upstream payloads and public request inputs with Zod.
- Never show an enquiry thank-you state unless email hand-off succeeds.
- Preserve deterministic ranking: rating descending, review count descending, then product ID ascending. Home returns five; category top-rated returns three, with the remainder additional.
- Search is case-insensitive substring matching over title, description and category; blank searches are invalid.
- Use semantic HTML, visible focus states and accessible form labels.
- Do not commit `.env` files, credentials or email contents. Tests must not require real external services.
- Add or update tests for behaviour changes and run `npm run check` before finishing.
- Update this file if project structure, commands or these conventions change.
