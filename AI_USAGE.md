# AI usage notes

## Tools and models

- **OpenCode interactive coding agent**, running **Kimi K3.1 Pro** (`opencode-go/kimi-k3.1-pro`), for planning, implementation, tests, documentation and review.
- Standard local tools directed by the agent: file read/write/edit/search, shell, npm/TypeScript/Vitest, and Docker Compose. No paid AI, data or email service was used.
- Human direction was the original challenge text plus the request to build the assessment and summarise what was produced.

## Agent instructions and plan

- [AGENTS.md](./AGENTS.md) records project boundaries, commands and non-negotiable behaviour for subsequent agent/human changes.
- [PLAN.md](./PLAN.md) is the initial plan: stack and provider decisions, the five acceptance flows, boundaries and verification strategy.
- [DECISIONS.md](./DECISIONS.md) is the maintained decision record rather than an unreviewed AI narrative.

## Five prompts/moments that shaped the solution

1. **Challenge constraint extraction:** convert “no direct client Fake Store calls,” “not throwaway,” and “no paid accounts” into one React/Node design with backend provider ownership and a Dockerised real SMTP inbox (Mailpit), rather than a frontend-only demo or mocked enquiry.
2. **Make unclear acceptance rules explicit:** define featured products as five results of rating/review-count/ID ranking; category pages as three ranked plus non-overlapping remainder; search as trimmed case-insensitive title/description/category substring matching. Recording these enabled progress without blocking on questions.
3. **Build vertical trust boundaries:** direct the agent to validate provider responses and enquiry bodies, look products up server-side, escape HTML email values, keep payloads out of logs, and only show thank-you after SMTP hand-off.
4. **Verify rather than trust generated output:** run strict TypeScript, HTTP/component tests, builds and dependency audit; use failures as review signals. Explicitly preserve correct implementation where a generated test expectation was wrong.
5. **Reviewer-first finish:** add a one-command quick start, a manual Mailpit verification path, PR narrative, simplifications and next-day priorities, then smoke-test the actual containers rather than relying only on unit tests.

## Where AI got something wrong, and how it was caught

- **Incorrect ranking test expectation:** the first generated test expected product 5 before product 6 even though both had rating 4.4 and product 6 had more reviews. The unit test exposed the mismatch against the agreed comparator. Review confirmed the code implemented the stated policy and corrected the expected order to `[2, 1, 3, 6, 5]`; the production comparator was not weakened to satisfy the test.
- **Unsafe TypeScript narrowing around malformed JSON:** TypeScript rejected `.type` after narrowing an error to the built-in `SyntaxError` shape. `npm run typecheck` caught this before runtime; the check was changed to include an explicit property guard.
- **Stale/vulnerable initial dependency ranges:** the first install resolved versions with advisories in Nodemailer, Zod, React Router and Vitest. `npm audit --json` was reviewed instead of using an unreviewed `audit fix --force`. Patched major versions were selected deliberately and compatibility was rechecked through the full test/type/build suite.
- **Search field state on browser navigation:** review found that initialising search state only from the first URL would desynchronise the visible term on back/forward navigation. The component now synchronises when the route query changes.
- **Incorrect frontend test isolation assumption:** the upgraded Vitest setup did not automatically unmount Testing Library trees between tests. Duplicate routes and form labels made later tests fail even though navigation had worked in the first test. Explicit `cleanup()` is now registered centrally; an incorrect `getByText(...).not` query was also changed to `queryByText` for an expected absence.
- **Email correctness beyond string interpolation:** adversarial review added an HTTP test containing HTML in an enquiry message. It asserts escaped email markup and a controlled error response when the email port fails, rather than merely checking that a function was called.
- **A slow-test diagnosis was not accepted without evidence:** an initial suspicion about a 15-minute rate-limit timer was rejected after inspecting its `unref()` implementation and rerunning isolated suites in under a second. No forced process exit or unnecessary store injection was added. Subsequent full checks passed, including clean client/server builds.

All generated source, tests and documentation were treated as owned deliverables. Test success was not used as a substitute for inspecting architecture, security boundaries, dependency findings or real local behaviour.

## Time spent

Approximately **3 hours 30 minutes of active work**, plus time waiting on external network/image pulls. The split includes generated-code review and failed verification, not just code-generation time.

| Activity | Approximate time |
| --- | ---: |
| Planning, requirements and trade-offs | 25 min |
| Building backend and frontend | 85 min |
| Automated/manual testing and fixes | 65 min |
| Review, security checks and documentation | 35 min |
| **Total active time** | **3 hours 30 minutes** |
