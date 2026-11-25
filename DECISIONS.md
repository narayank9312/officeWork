# Decisions and assumptions

The goal was a small, defensible critical path rather than maximum feature count.

## Product and UX assumptions

1. **“Chosen five top rated” is a deterministic curation policy for this PoC.** The API ranks all products by rating descending, review count descending, then ID ascending, and selects five. This avoids arbitrary hard-coded IDs that could disappear upstream. There is no admin CMS yet; replacing this policy with editorial product IDs is contained in `CatalogService`.
2. **Category pages show three top-rated products.** The acceptance criteria do not specify a count. Three gives the ranked group meaning while leaving additional products visible. `topRated` and `additional` are mutually exclusive; additional products retain rating order.
3. **Search means case-insensitive substring matching over title, description and category.** Input is trimmed and blank searches are rejected. The API, not the browser, performs filtering, so changing the product source cannot bypass the search rule. Exact substring search is predictable but not typo-tolerant.
4. **The enquiry needs a name and email; phone and message are optional.** This supplies a usable reply channel without adding unnecessary required fields. The form remains on the product page, avoiding modal/focus complexity for the PoC.
5. **A thank-you state means hand-off to the configured SMTP server succeeded.** It does not claim guaranteed delivery beyond that boundary. Network/delivery errors preserve the form and display a retryable error.
6. **Prices are USD.** Fake Store does not provide business currency/locale rules; the UI consistently formats USD with `Intl.NumberFormat`.
7. **No separate all-products route is required by the criteria.** Home, categories, search and product details provide the requested browsing path. Product description and rating are sufficient metadata on details.
8. **The catalogue is public and enquiries are unauthenticated.** There are no customer accounts. A per-IP enquiry rate limit limits accidental/basic automated abuse; this is not a replacement for anti-bot controls at production scale.

## Simplifications and deliberate cuts

- **No admin interface, database or persistent enquiry store.** Product metadata is explicitly unimportant at this stage, and the email is the enquiry record. Editorial ranking can later be persisted without touching components or routes.
- **No production email account or infrastructure.** Docker Compose runs Mailpit as a real SMTP inbox, satisfying local end-to-end delivery without accounts or paid services. Production would use SES/SMTP or a new `EmailSender` adapter, verified sender identities, DNS configuration and secrets management.
- **No fuzzy search, pagination, sorting controls or filters.** Fake Store's catalogue has about 20 products; those features would add untested product assumptions. The service/API are the places to add them when real catalogue volume is known.
- **No cart, checkout, payments, stock, wishlist or auth.** They are outside the enquiry-led MVP.
- **No native mobile app, global state library, server-side rendering or design system.** One responsive web client best fits the time-box. Remote state is local and explicit; routing and otherwise stateless screens do not justify Redux.
- **No distributed cache, queue or retry worker.** A five-minute process-local cache reduces upstream load and coalesces concurrent reads. SMTP hand-off is synchronous so the customer receives truthful feedback. Scale/reliability requirements should determine queues later.
- **Browser integration tests use in-memory adapters rather than starting all containers in test.** A manual container/SMTP smoke test complements them; no heavyweight browser automation dependency was added.
- **Frontend and backend have small mirrored TypeScript contracts.** Introducing a shared package/code generator now would add more tooling than value for these few responses. OpenAPI-generated contracts are a sensible next step before the API grows.

## How this grows beyond the PoC

### Change product source

Implement `ProductSource` (`listProducts`, `getProductById`) against a database, CMS or commerce API. `CatalogService` owns ranking/search policy, routes own HTTP, and the React client only uses `/api`. Provider response validation prevents an upstream shape change from leaking malformed data into the UI.

For scale, add source-level filtering/pagination behind the same application boundary and evolve response contracts deliberately. Move the process-local cache to Redis only when multiple instances/performance data justify it.

### Change email provider

`EnquiryService` composes a provider-neutral `EmailMessage`; `EmailSender` delivers it. The current adapter is SMTP/Nodemailer. An Amazon SES implementation can replace it in the composition root, with no enquiry form or REST contract change. Mailpit proves the local path with actual email rather than a console stub.

### Change look and feel

Routes and data hooks are separate from product cards, form components, layout and state components. Plain CSS variables and a single responsive stylesheet allow brand tokens/layout to evolve without rewriting data access. No Fake Store URL is hard-coded into a component; images/titles arrive through the backend contract.

### Deploy on AWS

The two application containers are AWS-compatible without included infrastructure. A likely evolution is an ALB routing the web and API paths to ECS Fargate services (or App Runner), CloudWatch logs, Secrets Manager for SMTP credentials, and SES for email. Alternatively, serve the static client via S3/CloudFront and retain the API behind the same domain. Set `TRUST_PROXY` to the actual proxy count rather than blindly preserving the local value. Add health checks, autoscaling, TLS and environment-specific configuration during that work.

### Reliability and security evolution

Add persistent enqueue/retry only once enquiry volume and delivery SLAs warrant it; make its semantics explicit to users. Add provider circuit breaking/stale fallback when owned data exists, production bot protection, CSP tuned to final asset hosts, central audit-safe structured logs and dependency/image scanning. Keep enquiry payloads out of logs and apply data-retention rules if persistence is introduced.

## With another day, in priority order

1. Add a Playwright acceptance run against Docker Compose and a Mailpit assertion in CI, plus accessibility checks (axe) and keyboard/mobile review.
2. Add production SES configuration and a tested adapter factory, secret handling, deployment health checks and a minimal ECS/Fargate deployment definition.
3. Introduce an OpenAPI contract and generated client types before adding endpoints; add pagination/filter contract design against the expected real catalogue volume.
4. Add editorial featured-product selection and persist enquiries with retry status if business testing confirms a need for a back-office workflow.
5. Add provider observability (latency/error metrics), resilience tests and a defined cache/fallback policy based on measured upstream behaviour.
