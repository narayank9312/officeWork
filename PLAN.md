# Build plan

## Product choices
- Client: React + TypeScript + Vite + React Router, served by Nginx in Docker.
- Backend: Node.js + TypeScript + Express, exposing a JSON API under `/api`.
- Product source: Fake Store API behind a backend port/adapter, with a short-lived cache.
- Email: SMTP through Nodemailer; local Mailpit container supplies a real sales inbox.

## Acceptance path
1. `/` displays the five globally highest-rated Fake Store products and category links.
2. `/category/:category` displays up to three highest-rated products, then all other products in that category.
3. Search submits to `/search?q=...`; the API matches case-insensitively against title, description and category.
4. Product tiles link to `/products/:id` for product details.
5. Product enquiry posts name, email, optional phone/message and product ID; the backend validates input and product existence, then sends email to the configured sales inbox. The UI shows a thank-you message only after the API confirms delivery.

## Technical boundaries
- Express routes -> application services -> product/email ports -> adapters.
- Provider responses and public enquiry input are validated at trust boundaries.
- The frontend uses typed API responses and replaceable presentational components.
- Integration tests use in-memory adapters and a fake product provider; component tests cover key UI behaviour.

## Verification
- Backend unit/integration tests and type checking.
- Frontend component tests, type checking and production build.
- Docker configuration review and, where available, container smoke test.
