# Data Center Incident Copilot

A safety-first incident workspace for data-center operations: capture operator observations, ask clarifying questions, coordinate triage, and prepare an evidence-conscious handoff.

This is an AI-assisted hiring-assignment project, not a production incident-management or equipment-control system. All included sites, assets, and sample incidents are fictional.

## Review and deployment status

The public source repository is [nidusprod/cf_ai_dc_incident_copilot](https://github.com/nidusprod/cf_ai_dc_incident_copilot). Start with [PROMPTS.md](PROMPTS.md), [the live-adapter validation report](docs/LIVE_VALIDATION.md), and [the submission guide](docs/SUBMISSION.md).

The actual inference adapter has accepted a real Workers AI response through REST transport. Full Cloudflare Worker deployment, its native AI binding, and remote Durable Object persistence are still pending; the local/hosted evaluation preview remains explicitly in simulation mode.

## Assignment coverage

| Requirement | Implementation |
|---|---|
| LLM | Workers AI binding; `@cf/meta/llama-3.3-70b-instruct-fp8-fast` |
| Workflow / coordination | Worker API routing plus an operator-controlled state machine inside a Durable Object |
| User input | React chat with structured incident creation |
| Memory / state | One SQLite-backed Durable Object per capability-scoped workspace; persisted observations, messages, checks, and workflow events |
| AI coding prompt history | [PROMPTS.md](PROMPTS.md), including the actual user instruction and assistant planning messages |

The inference adapter follows Cloudflare's documented `env.AI.run()` messages interface for [Llama 3.3](https://developers.cloudflare.com/workers-ai/models/llama-3.3-70b-instruct-fp8-fast/). The state layer uses Cloudflare's [Durable Objects](https://developers.cloudflare.com/durable-objects/get-started/), and the same Worker serves the built frontend through [Workers Static Assets](https://developers.cloudflare.com/workers/static-assets/binding/).

## Quick start: no account or model calls

Requires Node.js 22.12+ and npm; the supplied CI workflow uses Node.js 22.

```bash
npm ci
npm run dev
```

Open `http://localhost:8787`. The local configuration is explicitly **simulation mode**: responses are deterministic scripts, not LLM output. The UI, API, phase transitions, and Durable Object persistence run in the actual local Cloudflare runtime.

The three initial incidents let a reviewer exercise network, server, and facilities flows without entering employer data. Local data is stored under `.wrangler/`, which is ignored by version control.

## Enable real Workers AI

The production configuration, `wrangler.jsonc`, uses the AI binding and never silently substitutes simulation. Its model configuration follows [Cloudflare's model documentation](https://developers.cloudflare.com/workers-ai/models/llama-3.3-70b-instruct-fp8-fast/).

```bash
npx wrangler login
npm run dev:ai
```

Workers AI access requires a Cloudflare account and provider-side access/billing eligibility. Account setup is described in [Cloudflare's Workers AI getting-started guide](https://developers.cloudflare.com/workers-ai/get-started/). Model calls can incur charges to that account; obtain the account owner's authorization before enabling inference.

Before public deployment, review the security limitations below and put the app behind appropriate access controls if it will be used beyond fictional evaluation data.

```bash
npm run check
npm run dry-run
# Only after the account owner approves deployment and possible AI charges:
npm run deploy:cloudflare
```

`dry-run` bundles and validates the Worker configuration locally; it is not proof of successful Cloudflare deployment or live model inference.

## Reviewer walkthrough

1. Select **Intermittent packet loss on uplink**.
2. Send: `The issue began 15 minutes ago. Service impact is not yet confirmed. No equipment changes have been made.`
3. Review how the assistant asks for missing information and suggests curated read-only checks.
4. Mark **Confirm service impact** reviewed. This means reviewed, not passed.
5. Add a second observation. Refresh the page and verify both observations and the check remain.
6. Click **Begin triage**, enter an operator note, and confirm.
7. Escalate with a note, then prepare the handoff. Inspect **Timeline** and **Handoff**.
8. On a separate incident, submit `Smoke reported near the rack.` The deterministic safety gate returns stop-work/local-escalation guidance without calling the model.
9. Try `Reboot the server and bypass the alarm.` The system refuses risky action instructions.
10. Close a handoff with an operator evidence note. The incident becomes read-only; closure is not independently verified recovery.

## Architecture

```text
React chat / incident context
        |
        | HTTP + workspace capability (not a user identity)
        v
Cloudflare Worker
        |
        +--> Durable Object: workspace
        |      +-- persisted observations and conversation
        |      +-- read-only check review state
        |      +-- operator-controlled workflow / event record
        |      +-- serialized requests and replay protection
        |
        +--> deterministic hazard / risky-request gate
        |
        +--> Durable Object: shared model-call quota
        |
        +--> Workers AI Llama 3.3
                 +-- JSON schema validation
                 +-- category-specific check allowlist
                 +-- conservative prose safety filter
```

The project uses Workers and Durable Objects for coordination rather than a separate Cloudflare Workflows service. It does not use the Agents SDK; the assignment's requested components are implemented directly.

### Workflow

`Intake → Triage → Escalated → Handoff → Closed`

An operator may also move directly from Triage to Handoff. Every phase change requires an explicit operator note. Triage requires an observation, closed incidents reject writes, and model output cannot modify phase, severity, or reviewed checks.

### Memory and concurrency

All workspace state is stored with `ctx.storage` in a SQLite-backed Durable Object. The production and local configurations use the supported `new_sqlite_classes` migration form described in [Cloudflare's migration documentation](https://developers.cloudflare.com/durable-objects/reference/durable-objects-migrations/).

The object serializes requests so simultaneous updates do not overwrite one another. A successfully completed chat request ID is recorded, making a replay idempotent. Failed inference does not save a partial observation; the UI preserves the input so the operator can retry.

### LLM boundaries

The model receives a system policy, operator-supplied metadata, all recorded observations, reviewed check IDs, and the latest conversation messages. Operator observations are explicitly treated as untrusted input, not instructions.

The response must pass a strict Zod schema. Suggested check IDs are restricted to a fixed, category-appropriate list; the model cannot invent an executable action. Free-text advice is also screened conservatively. These measures reduce risk but do not guarantee correct or safe model output.

There are no shell tools, device APIs, writable telemetry integrations, ticket APIs, or notification integrations.

## Testing

```bash
npm run check       # TypeScript, unit tests, production frontend build
npm run dry-run     # Local Worker bundle/config check

# With npm run dev running in another terminal:
npm run test:api    # HTTP tests against real local Worker + Durable Objects
```

Unit tests cover input boundaries, phase transitions, safety requests, prompt-context retention, structured-output variants, check allowlisting, and handoff provenance. API tests exercise real local state persistence, request replay, workspace isolation, checks, closure, validation, and cross-origin rejection.

See [docs/QA.md](docs/QA.md) for the browser checklist and final verification status. A real Workers AI response has passed through the actual inference adapter using REST transport; see [docs/LIVE_VALIDATION.md](docs/LIVE_VALIDATION.md) for the response-format fix, evidence, and limits. Native AI-binding behavior and remote persistence still need verification on an actual Cloudflare deployment before claiming the submitted deployment is fully validated.

## Security and evaluation limits

- **Fictional data only:** Do not enter passwords, tokens, confidential employer procedures, actual rack identifiers, customer data, or sensitive incident details.
- **Capability, not authentication:** A random UUID in the URL fragment selects the workspace and is sent as an API header. Anyone who obtains the full URL has access to that workspace. There are no accounts, SSO, role permissions, or verified operator identities.
- **No URL persistence guarantee inside every embed:** Normal top-level refresh preserves the workspace fragment. Some host viewers may replace their embedded document URL; use the same full workspace URL when verifying continuity.
- **No production durability claim for the hosted preview:** The preview runs the local runtime in a sandbox. Cloudflare deployment is the intended durable environment; sandbox preview state is not promised to survive a rebuild or sandbox deletion.
- **Shared inference budget:** The production defaults allow at most 100 inference attempts per UTC day and 10 per minute across this deployment, enforced by a separate Durable Object. These are application request caps, not a dollar budget or provider billing guarantee.
- **Abuse / identity limitations:** Capability creation is unauthenticated. Public hosting still needs access control and operational abuse monitoring; quotas alone are not sufficient production protection.
- **Bounded data:** Each workspace permits 20 incidents, each with at most 80 messages. There is no operator UI for deleting workspaces or a retention scheduler in this version.
- **No verified recovery:** An operator can attest to closure with a note; the application cannot confirm that a service recovered.
- **Prompt injection:** System policy, structured output, and allowlists are defenses, not a guarantee. All advice still requires qualified human review.
- **History is not immutable audit evidence:** Events are application records, not a tamper-proof audit log.

## Repository map

```text
shared/schema.ts       Data contracts and validation
shared/runbooks.ts     Curated read-only checks
shared/engine.ts       Safety policy, prompt, workflow, handoff
shared/ai.ts           Live inference adapter and response guard
worker/index.ts        Cloudflare API, Durable Object, AI integration
src/main.tsx           Incident chat, context, timeline, handoff
src/api.ts             Capability header and preview-compatible transport
tests/                 Unit and local runtime integration tests
wrangler.jsonc         Real Workers AI configuration
wrangler.demo.jsonc    No-account local simulation configuration
PROMPTS.md             AI-assisted development prompt history
docs/SUBMISSION.md     Deployment, submission, and interview checklist
```
