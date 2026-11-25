# Product catalogue MVP: browse, search and enquire

## Summary

Builds the complete critical path as an evolvable React/Node foundation:

- Five deterministic top-rated products on home, ranked by rating then review count.
- Category pages with three ranked products and a separate non-overlapping remainder.
- Backend case-insensitive search over title, description and category.
- Product detail navigation from every product tile.
- Validated product enquiries with real SMTP email, local Mailpit inbox, and honest thank-you/error states.

The client never calls Fake Store. All product metadata flows through the backend's validated, cached `ProductSource` adapter. Email delivery is likewise behind an `EmailSender` port.

## Why this approach

React + TypeScript provides one responsive client without separate native codebases. Node + TypeScript/Express owns provider integration and catalogue policy while staying thin at the HTTP layer. Ports/adapters isolate the two integrations explicitly expected to change. Plain components and CSS tokens keep future creative work decoupled from catalogue rules. Docker Compose supplies Nginx, the API and Mailpit with one command and no accounts/secrets.

This deliberately avoids speculative database, checkout, auth, admin, queue and cloud-infrastructure work. [DECISIONS.md](./DECISIONS.md) records those cuts and a concrete AWS/next-day path.

## Reviewer quick start

```bash
docker compose up --build
```

- App: http://localhost:8080
- Mailpit sales inbox: http://localhost:8025
- Health: http://localhost:3001/api/health

Submit an enquiry from a product page and inspect the resulting `sales@fieldwork.test` email in Mailpit. Thank-you appears only after SMTP hand-off.

## Verification

```bash
npm run check
```

This runs strict type checks, backend unit/HTTP tests, React integration/component tests, and production builds for both workspaces. Result during implementation: **26 tests passed** (21 backend, 5 frontend) and both production bundles compiled. `npm audit --audit-level=moderate` completed with **0 vulnerabilities**.

A live, non-container API smoke test against Fake Store also verified five featured products, four categories, electronics split into three top-rated plus three additional, four `cotton` matches, and product details. Docker Compose configuration validation passed for `mailpit`, `api`, and `web`; container runtime evidence is recorded below.

## Review focus

1. `server/src/catalog/product.ts` and `catalog-service.ts`: replaceable product boundary and ranking/search policy.
2. `server/src/enquiries/enquiry-service.ts` and `server/src/email`: server-side product lookup, escaped content and replaceable delivery.
3. `server/src/app.ts`: security middleware and controlled error mapping.
4. `client/src/pages` and `components/EnquiryForm.tsx`: acceptance flows and honest asynchronous states.
5. `DECISIONS.md` / `AI_USAGE.md`: assumptions, explicit simplifications, next-day priorities and AI corrections.

## PR checks

- [x] Docker startup and five acceptance flows verified through Nginx, including nested SPA routes
- [x] Real enquiry submitted and its recipient, subject and content inspected through Mailpit's API
- [x] `npm run check` — 26 tests plus type checks and both builds passed
- [x] Dependency audit reviewed — zero vulnerabilities after upgrades; both Docker builds also audited clean
- [x] No secrets or paid-service requirements; client source contains no Fake Store provider calls

## Follow-up

Prioritise browser E2E/accessibility automation, production SES/deployment work, and OpenAPI-generated contracts before scaling catalogue features. See the ordered list in `DECISIONS.md`.
