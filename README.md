# Fieldwork catalogue

A responsive product catalogue MVP with a React + TypeScript frontend, a Node.js + TypeScript API, backend-owned product data, and real local email delivery through Mailpit.

## Run the whole solution (recommended)

**Prerequisites:** Docker with Docker Compose and an internet connection for container images, product data, product images and optional Google Fonts. No account, API key or paid service is required.

```bash
docker compose up --build
```

Then open:

| What | URL |
| --- | --- |
| Catalogue | **http://localhost:8080** |
| Local sales inbox (Mailpit) | **http://localhost:8025** |
| API health check | http://localhost:3001/api/health |

The first run builds the images; subsequent runs are faster. Stop with `Ctrl+C`, or run `docker compose down` to remove the containers. Containers run in the foreground so startup errors remain visible.

### Verify the acceptance path

1. Home shows the five highest-rated products, ordered by rating, then review count.
2. Choose a category to see three highest-rated products followed by the remaining products.
3. Type a term in the header and click **Search**. Results match title, description or category text only.
4. Click any product tile to see its details.
5. Click **Enquire about this product**, complete the required name/email fields, and send.
6. A **Thank you** confirmation appears only after SMTP accepts the message. Open Mailpit to see the actual email in `sales@fieldwork.test`.

Fake Store controls the live titles, categories and imagery, so exact content may change upstream.

## Configuration

No configuration is required for Docker. To override defaults, copy `.env.example` to `.env`; Docker Compose reads it automatically. `.env` is git-ignored.

| Variable | Local/Docker default | Purpose |
| --- | --- | --- |
| `FAKE_STORE_API_URL` | `https://fakestoreapi.com` | Root provider URL; the client never receives this setting |
| `PRODUCT_CACHE_TTL_MS` | `300000` | In-memory catalogue cache lifetime (5 minutes) |
| `UPSTREAM_TIMEOUT_MS` | `8000` | Product-provider request timeout |
| `SMTP_URL` | `smtp://mailpit:1025` in Compose | SMTP connection URL; use `smtp://localhost:1025` outside Docker |
| `SALES_INBOX` | `sales@fieldwork.test` | Enquiry recipient |
| `MAIL_FROM` | `enquiries@fieldwork.test` | Sender address |
| `TRUST_PROXY` | `1` | Number of trusted reverse-proxy hops; change to match deployment topology |
| `ENQUIRY_RATE_LIMIT_MAX` | `5` | Maximum enquiry submissions per IP per window |
| `ENQUIRY_RATE_LIMIT_WINDOW_MS` | `900000` | Rate-limit window (15 minutes) |

SMTP credentials, when introduced, belong inside `SMTP_URL` in the untracked `.env` file or a deployment secret store. Mailpit is for local development only; do not expose it publicly.

## Alternative: run with Node.js

Requires **Node.js 22.12+** and npm. This mode uses Vite on port 5173 and the API on port 3001.

```bash
docker compose up -d mailpit
npm ci
npm run dev
```

Open **http://localhost:5173** and Mailpit at **http://localhost:8025**. Vite proxies `/api` to the backend. Defaults outside Compose already point SMTP to `localhost:1025`, so no environment file is needed.

Run the complete static/test/build check with:

```bash
npm run check
```

Or use `npm run typecheck`, `npm test`, and `npm run build` separately.

## Stack choice and why

- **React web + TypeScript:** responsive on desktop/mobile without requiring two native apps; reusable route and presentational components make the forthcoming visual identity easy to change. Vite keeps feedback and builds fast. TypeScript is the challenge's preferred client language.
- **Node.js + TypeScript (Express):** shares the language and product contract concepts with the client, has a small operational footprint, and keeps provider integrations behind an explicit HTTP/API boundary. Express is deliberately used as thin HTTP plumbing rather than embedding business rules in middleware.
- **Nginx + Docker Compose:** one reproducible command, same-origin browser/API calls, SPA route fallback, and a real local SMTP inbox. Containers can later run on ECS/Fargate or App Runner; no infrastructure is required for this PoC.
- **Plain CSS with design tokens:** avoids coupling an unsettled look and feel to a component-library theme. All typography, colour, spacing and layout live in one stylesheet.

## Architecture

**Diagrams:** [Infrastructure (local + proposed AWS), HLD and LLD](./docs/architecture.md).

```text
Browser (React routes + typed API client)
            | same-origin /api JSON only
            v
Express routes -> catalogue/enquiry services -> ports
                                                |
                         +----------------------+-------------------+
                         v                                          v
             ProductSource interface                       EmailSender interface
                         |                                          |
              FakeStoreProductSource                       SmtpEmailSender
              (validation + timeout                          (Nodemailer -> Mailpit
               + 5-minute cache)                              locally, other SMTP later)
```

Key directories:

```text
client/src/
  components/       Product cards, search, enquiry form, layout and states
  lib/              Browser API client, data hook and formatting
  pages/            Home, category, search, details and 404 screens
server/src/
  catalog/          Product port, Fake Store adapter, ranking/search service, routes
  enquiries/        Enquiry schema, email composition service, routes
  email/            Email port and SMTP adapter
  app.ts            Express composition, security middleware and error mapping
  index.ts          Runtime dependency wiring
```

The product source, email sender and presentation can each change independently. Product ranking and filtering are server-owned so a future database/CMS does not change browser behaviour. The in-memory cache also coalesces concurrent upstream requests and provides a consistent list for featured, category and detail reads. It is intentionally process-local; a distributed cache is unnecessary at this scale.

## API summary

| Method | Path | Result |
| --- | --- | --- |
| GET | `/api/products/featured` | Exactly five top-ranked products when at least five exist |
| GET | `/api/categories` | Sorted category names |
| GET | `/api/categories/:category/products` | `topRated` (3) and non-overlapping `additional` products |
| GET | `/api/products?search=term` | Matching products; blank terms are a 400 |
| GET | `/api/products/:id` | One product or a controlled 404 |
| POST | `/api/enquiries` | Validates and sends a product enquiry; returns 201 after SMTP hand-off |
| GET | `/api/health` | Liveness response |

Example enquiry body:

```json
{
  "productId": 1,
  "name": "Alice Example",
  "email": "alice@example.test",
  "phone": "+44 20 1234 5678",
  "message": "Is this available in blue?"
}
```

`phone` and `message` are optional. The server looks up the product itself and ignores any client-supplied title, price or recipient. Successful delivery is recorded in email, not a database.

## Quality and security basics

- Unit and HTTP integration tests cover ranking, grouping, filtering, details, validations, email hand-off/failure and upstream validation/cache. React integration tests cover featured-to-detail navigation, category sections, search, and enquiry success/failure.
- Strict type checking, runtime Zod validation at provider/public-input boundaries, bounded request bodies, field length limits and enquiry throttling.
- Helmet API headers, Nginx browser headers, no `X-Powered-By`, no public CORS relaxation, escaped React/email content, and no enquiry bodies in logs.
- Abortable frontend reads, loading/empty/error/retry states, responsive semantic UI, keyboard focus, form labels and reduced-motion support.
- No secrets in the repository. Root `npm run check` verifies both workspaces.

## Assumptions, trade-offs and next steps

See **[DECISIONS.md](./DECISIONS.md)** for assumptions, deliberate cuts, AWS evolution and priorities for another day. See **[AI_USAGE.md](./AI_USAGE.md)** for tooling, prompts, corrections and time spent. The review-ready PR narrative is in **[PR_DESCRIPTION.md](./PR_DESCRIPTION.md)**.
