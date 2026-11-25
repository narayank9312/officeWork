# Architecture diagrams

This document covers three levels of the Fieldwork design:

1. **Infrastructure:** what runs locally now, and a proposed AWS deployment path.
2. **HLD:** the major application components and their boundaries.
3. **LLD:** internal classes/interfaces, caching, validation and critical request sequences.

The local diagrams describe the implemented system. **AWS infrastructure is proposed only; it has not been provisioned and is not required to run this project.** All diagrams use Mermaid and render directly in GitHub/GitLab Markdown viewers.

---

## 1. Infrastructure diagram

### 1.1 Current local/Docker infrastructure

```mermaid
flowchart LR
    User["Customer / reviewer browser"]
    Compose["docker compose"]
    Env["Root .env (optional)<br/>.env.example committed;<br/>real .env ignored"]

    subgraph DockerHost["Developer machine — Docker Compose"]
        subgraph Network["Private Compose network"]
            Web["web container<br/>Nginx 1.27<br/>React static assets + SPA fallback<br/>Port 8080 on host"]
            Api["api container<br/>Node 22 / Express API<br/>Non-root user<br/>Health: GET /api/health<br/>Port 3001 on host"]
            Mailpit["mailpit container<br/>Local SMTP server + inbox UI<br/>SMTP 1025 / UI 8025"]
            AppCache[("In-process product cache<br/>5-minute TTL<br/>No persistent volume")]
        end
    end

    FakeStore["Fake Store API<br/>HTTPS product catalogue"]
    Assets["External static assets<br/>Product images + optional Google Fonts"]

    Compose -. "builds and starts" .-> Web
    Compose -. "builds and starts" .-> Api
    Compose -. "starts" .-> Mailpit
    Env -. "runtime configuration" .-> Compose

    User -->|"Catalogue HTTP :8080"| Web
    User -->|"Inbox HTTP :8025"| Mailpit
    Web -->|"Reverse proxy /api/*<br/>to api:3000; adds X-Forwarded-For"| Api
    Web -. "dependency: healthy" .-> Api

    Api -->|"HTTPS GET /products<br/>timeout + payload validation"| FakeStore
    Api -->|"SMTP mailpit:1025"| Mailpit
    Api --- AppCache
    User -->|"Images/fonts only;<br/>never catalogue JSON"| Assets
```

**Current properties**

- There is one private Compose network and no application database or persistent volume.
- The browser calls catalogue JSON only through same-origin `/api/*`; it never requests the Fake Store product endpoint.
- The API container also exposes port 3001 for direct health/API inspection. Nginx is the normal application entry point.
- Nginx waits for the API health check. Mailpit provides local-only email capture and is not a production email service.
- Product cache and Mailpit contents are local development state, not a durable application data store.

### 1.2 Proposed AWS production infrastructure (not provisioned)

```mermaid
flowchart TB
    Users["Customers / sales staff"]
    DNS["Route 53<br/>DNS"]
    WAF["AWS WAF<br/>Managed rules + rate rules"]
    CloudFront["CloudFront<br/>CDN + TLS"]
    ACM["ACM<br/>Public TLS certificate"]

    subgraph VPC["AWS VPC"]
        subgraph PublicSubnets["Public subnets — 2+ availability zones"]
            ALB["Application Load Balancer<br/>Default route: web<br/>/api/* route: api"]
        end

        subgraph PrivateSubnets["Private subnets — 2+ availability zones"]
            ECSWeb["ECS Fargate web service<br/>Nginx container<br/>2+ tasks; rolling deployment"]
            ECSApi["ECS Fargate API service<br/>Node container<br/>2+ tasks; health checks"]
            NAT["NAT egress<br/>Outbound provider access"]
        end
    end

    FakeStore2["Current: Fake Store API<br/>Future: owned CMS/database<br/>behind ProductSource"]
    SES["Amazon SES<br/>Future EmailSender adapter<br/>or authenticated SES SMTP"]
    Secrets["Secrets Manager<br/>SMTP/API credentials<br/>In DB-backed variant only"]
    Logs["CloudWatch Logs<br/>Alarms + dashboards"]
    OptionalDB[("Optional future database<br/>PostgreSQL / DynamoDB<br/>Only if owned data is required")]

    Users --> DNS --> WAF --> CloudFront --> ALB
    ACM -. "TLS certificate" .-> CloudFront
    ALB -->|"Default traffic"| ECSWeb
    ALB -->|"/api/* traffic"| ECSApi
    ECSWeb -->|"Internal /api proxy<br/>or ALB service discovery"| ECSApi
    ECSApi --> NAT --> FakeStore2
    ECSApi -->|"HTTPS/SDK or SMTP/TLS"| SES
    Secrets -. "Injected at task startup;<br/>never baked into images" .-> ECSApi
    ECSWeb -. "Access logs" .-> Logs
    ECSApi -. "Structured JSON logs<br/>without enquiry bodies" .-> Logs
    ECSApi -. "Only when owned catalogue/<br/>enquiry persistence is introduced" .-> OptionalDB
```

**Deployment notes and trade-offs**

- This path preserves the existing two-container application. It does not introduce AWS dependencies into local development.
- Use separate target groups and health checks, deployment circuit breakers, autoscaling based on measured demand, TLS-only listeners, and a real `TRUST_PROXY` value matching the final hop topology.
- Run tasks in private subnets and restrict security groups to required paths. Restrict ALB ingress to CloudFront where practical.
- Replace Mailpit with SES only after sender/domain verification and production access requirements are satisfied. Keep Mailpit out of every public environment.
- NAT, ALB, ECS and CloudFront incur costs. Serverless/static hosting can simplify this later, but the diagram deliberately shows the smallest architectural migration from the current containers.
- Do not add the optional database or distributed cache until owned data, enquiry retention, multiple-instance consistency or measured scale requires them.

---

## 2. High-level design (HLD) diagram

```mermaid
flowchart LR
    Customer["Customer browser"]
    Sales["Sales reviewer"]

    subgraph Client["React + TypeScript SPA"]
        Pages["Route pages<br/>Home / Category / Search<br/>Product / Not found"]
        UI["Presentation components<br/>ProductGrid / ProductCard<br/>Layout / SearchBar / States"]
        EnquiryUI["EnquiryForm<br/>Open → submit → thank-you/error"]
        ApiClient["Typed API boundary<br/>client/src/lib/api.ts<br/>fetch + AbortSignal"]
        RemoteData["useRemoteData<br/>loading / success / error / retry"]
        Pages --> UI
        Pages --> EnquiryUI
        Pages --> RemoteData --> ApiClient
        EnquiryUI --> ApiClient
    end

    Nginx["Nginx<br/>Static assets + SPA fallback<br/>Same-origin /api reverse proxy"]

    subgraph Backend["Node.js + Express application"]
        Middleware["HTTP boundary<br/>Helmet / 10 KB JSON limit<br/>trust proxy / request logs<br/>enquiry IP rate limit"]
        CatalogRoutes["Catalogue routes<br/>featured / categories<br/>category / search / details"]
        EnquiryRoutes["Enquiry route<br/>POST /api/enquiries"]
        Schemas["Zod validation<br/>Query, params, body<br/>Provider response"]
        CatalogService["CatalogService<br/>Top 5 global ranking<br/>Top 3 + additional category<br/>Search + detail + categories"]
        EnquiryService["EnquiryService<br/>Verify product<br/>Compose escaped text/HTML email"]
        ProductPort["ProductSource port"]
        EmailPort["EmailSender port"]
        ErrorMapping["Central error mapper<br/>400 / 404 / 413 / 429<br/>502 / safe 500"]
    end

    FakeAdapter["FakeStoreProductSource<br/>5-minute TTL + request coalescing<br/>timeout + schema validation"]
    SmtpAdapter["SmtpEmailSender<br/>Nodemailer SMTP transport"]
    FakeStore["Fake Store API"]
    Mailpit["Development Mailpit<br/>Production: SES/other provider"]

    Customer --> Pages
    ApiClient -->|"/api JSON only"| Nginx
    Nginx --> Middleware
    Middleware --> CatalogRoutes
    Middleware --> EnquiryRoutes
    CatalogRoutes --> Schemas --> CatalogService
    EnquiryRoutes --> Schemas --> EnquiryService
    Middleware -. "errors" .-> ErrorMapping
    CatalogService --> ProductPort
    EnquiryService --> ProductPort
    EnquiryService --> EmailPort
    FakeAdapter -. "implements" .-> ProductPort
    SmtpAdapter -. "implements" .-> EmailPort
    FakeAdapter --> FakeStore
    SmtpAdapter -->|"Accepted email hand-off"| Mailpit
    Sales -->|"Views received email"| Mailpit
```

### HLD responsibilities

| Boundary | Responsibility | Explicitly does not own |
|---|---|---|
| React pages/components | Navigation, accessible presentation, async UI state | Provider endpoints, ranking policy, recipient selection |
| Typed API client | JSON request/response envelope and HTTP error handling | Business filtering or direct third-party calls |
| Express routes | Path/query/body extraction, validation and response status | Provider-specific transformations or email composition |
| Catalogue service | Featured selection, category grouping, search and detail rules | React rendering, SMTP, Fake Store transport details |
| Enquiry service | Re-fetch product, create truthful email hand-off workflow | Trusting client title/price/recipient |
| ProductSource port | Replaceable catalogue read boundary | HTTP response rendering |
| EmailSender port | Replaceable email delivery boundary | Form state or product selection |
| Adapters | External protocol, timeout, schema/cache/transport details | Customer-facing presentation decisions |

---

## 3. Low-level design (LLD) diagram

### 3.1 Backend ports, services and data contracts

```mermaid
classDiagram
    class CatalogService {
        -ProductSource source
        -number featuredCount = 5
        -number categoryTopRatedCount = 3
        +getFeaturedProducts()
        +getCategories()
        +getProductsByCategory(category)
        +searchProducts(term)
        +getProduct(id)
    }

    class ProductSource {
        <<interface>>
        +listProducts()
        +getProductById(id)
    }

    class FakeStoreProductSource {
        -Product[] cachedProducts
        -number cacheExpiresAt
        -Promise~Product[]~ pendingRequest
        +listProducts()
        +getProductById(id)
        -fetchProducts()
    }

    class EnquiryService {
        -ProductSource products
        -EmailSender emails
        -string salesInbox
        +submit(enquiry)
    }

    class EmailSender {
        <<interface>>
        +send(message)
    }

    class SmtpEmailSender {
        -Transporter transporter
        -string from
        +send(message)
    }

    class Product {
        +number id
        +string title
        +number price
        +string description
        +string category
        +string image
        +Rating rating
    }

    class Rating {
        +number rate
        +number count
    }

    class CategoryProducts {
        +string category
        +Product[] topRated
        +Product[] additional
    }

    class EnquiryInput {
        +number productId
        +string name
        +string email
        +string? phone
        +string? message
    }

    class EmailMessage {
        +string to
        +ReplyTo replyTo
        +string subject
        +string text
        +string html
    }

    CatalogService o--> ProductSource : depends on port
    FakeStoreProductSource ..|> ProductSource : implements
    EnquiryService o--> ProductSource : verifies real product
    EnquiryService o--> EmailSender : depends on port
    SmtpEmailSender ..|> EmailSender : implements
    CatalogService ..> Product : returns
    CatalogService ..> CategoryProducts : returns grouped list
    Product *--> Rating : contains
    EnquiryService ..> EnquiryInput : consumes validated input
    EnquiryService ..> EmailMessage : escapes and composes
    SmtpEmailSender ..> EmailMessage : delivers
```

### 3.2 Catalogue request and cache flow

```mermaid
sequenceDiagram
    autonumber
    actor Customer
    participant Page as React page
    participant Hook as useRemoteData
    participant Route as Express catalogue route
    participant Service as CatalogService
    participant Source as FakeStoreProductSource
    participant Upstream as Fake Store API

    Customer->>Page: Open home/category/search/product
    Page->>Hook: Register loader and AbortController
    Hook->>Route: GET corresponding /api endpoint
    Note over Hook,Route: Blank search and invalid IDs<br/>are rejected with 400 before service work.
    Route->>Service: Execute ranking/grouping/search/detail operation
    Service->>Source: listProducts() or getProductById(id)

    alt Unexpired cached list exists
        Source-->>Service: Return cached products
    else Another request is already fetching
        Source->>Source: Reuse pendingRequest
        Source-->>Service: Return shared validated result
    else No cache and no pending request
        Source->>Upstream: GET /products with timeout
        alt Valid HTTP response and valid Zod array payload
            Upstream-->>Source: Product[]
            Source->>Source: Store list and 5-minute expiry
            Source-->>Service: Product[]
        else Timeout, HTTP error, invalid JSON or invalid schema
            Upstream-->>Source: Failure / malformed data
            Source-->>Route: CatalogueUnavailableError
            Route-->>Page: 502 safe JSON error
            Page-->>Customer: Error state + Try again
        end
    end

    Service-->>Route: Product DTO(s), grouped category or 404 error
    Route-->>Page: 200 JSON or controlled 404 JSON
    Page-->>Customer: Product grid/detail or not-found error
    Note over Page,Hook: Navigating away aborts the browser read.<br/>Retry increments attempt and invokes the loader again.
```

### 3.3 Enquiry delivery flow

```mermaid
sequenceDiagram
    autonumber
    actor Customer
    participant Form as EnquiryForm
    participant Limiter as IP rate limiter
    participant Route as POST /api/enquiries
    participant Schema as enquirySchema (Zod)
    participant Service as EnquiryService
    participant Products as ProductSource
    participant Mail as EmailSender
    participant SMTP as SmtpEmailSender
    participant Inbox as Mailpit sales inbox

    Customer->>Form: Enquire → enter details → Send enquiry
    Form->>Limiter: JSON body: productId, name, email,<br/>optional phone/message
    Limiter->>Route: Forward when within configured limit
    Route->>Schema: Parse and trim/validate untrusted body
    Schema-->>Route: Typed EnquiryInput or validation failure
    Route->>Service: submit(validated enquiry)
    Service->>Products: getProductById(enquiry.productId)
    Products-->>Service: Real provider product or null

    alt Product does not exist
        Service-->>Route: NotFoundError
        Route-->>Form: 404 NOT_FOUND
        Form-->>Customer: Retryable error; no thank-you
    else Product exists
        Service->>Service: Escape HTML fields, strip subject CRLF,<br/>compose text + HTML; set trusted sales recipient
        Service->>Mail: send(EmailMessage)
        Mail->>SMTP: sendMail(from, sales inbox, reply-to customer)
        SMTP->>Inbox: SMTP message hand-off
        alt SMTP accepts message
            Inbox-->>SMTP: Acceptance response
            SMTP-->>Route: Resolved
            Route-->>Form: 201 + Thank-you message
            Form-->>Customer: Replace form with Thank you status
        else SMTP fails/times out
            SMTP-->>Route: EmailDeliveryError
            Route-->>Form: 502 EMAIL_UNAVAILABLE
            Form-->>Customer: Keep form values and allow retry;<br/>do not show thank-you
        end
    end
```

### 3.4 Frontend module flow

```mermaid
flowchart TB
    RouteChange["React Router path/search params"]
    Loader["useCallback loader<br/>captures category, query or product ID"]
    Hook["useRemoteData<T>"]
    Abort["AbortController<br/>cleanup on dependencies/unmount"]
    Loading["LoadingState"]
    Data["Route-specific typed data"]
    Error["ErrorState + retry()"]
    Attempt["Retry increments attempt<br/>effect invokes loader again"]
    Cards["ProductGrid / ProductCard<br/>IDs become /products/:id links"]
    Enquiry["EnquiryForm<br/>independently owns open/submitting/error/success"]

    RouteChange --> Loader --> Hook
    Hook --> Abort
    Hook --> Loading
    Hook --> Data
    Hook --> Error --> Attempt --> Hook
    Data --> Cards
    Data --> Enquiry
```

### Validation and error rules

| Input/failure | Rule/result |
|---|---|
| Search | Trimmed string, 1–100 characters; blank returns 400, not the full catalogue |
| Product ID/category | Positive integer ID; non-empty category up to 100 characters |
| Enquiry name | Trimmed, 2–100 characters |
| Enquiry email | Valid email, maximum 254 characters |
| Enquiry phone/message | Optional; phone restricted to basic telephone characters and 30 characters; message maximum 2,000 characters |
| Request body | JSON only, maximum 10 KB; malformed JSON maps to 400, oversized body to 413 |
| Product/category lookup | Missing records map to controlled 404 |
| Provider failure | Timeout/non-2xx/invalid payload maps to safe 502 `CATALOGUE_UNAVAILABLE` |
| Email failure | Missing SMTP hand-off maps to safe 502 `EMAIL_UNAVAILABLE` |
| Enquiry volume | Default 5 attempts per IP per 15 minutes; excess maps to 429 |
| Unexpected failure | Generic safe 500; logs error name, method/path/status, never enquiry body |

These rules are enforced at the backend trust boundary; browser validation is only a convenience and is not treated as a security control.
