# AI-assisted development prompt history

## Disclosure and scope

This project was developed with Perplexity Computer, an AI coding assistant, in a career-preparation conversation. AI assistance was used to plan the architecture, write the implementation and tests, inspect documentation, and debug the result. It should not be presented as unaided human-written code.

The user messages below are copied from the actual conversation, not retroactively invented engineering prompts. Prior unrelated career discussion, personal contact details, system/developer instructions, and private internal reasoning are intentionally excluded. This is the project-relevant user prompt history plus visible assistant planning responses, not a claim to reproduce every message in the entire career conversation.

## Assignment supplied by the applicant

Actual user message:

> on cloudflare app. Optional Assignment: Please share GitHub repo URL for the project here
> We plan to fast track candidates who complete an assignment to build a type of [AI-powered application](https://agents.cloudflare.com/) on Cloudflare. An AI-powered application should include the following components:
>
> LLM (recommend using Llama 3.3 on Workers AI), or an external LLM of your choice
> Workflow / coordination (recommend using Workflows, Workers or Durable Objects)
> User input via chat or voice (recommend using Pages or Realtime)
> Memory or state
> Find additional documentation [here](https://developers.cloudflare.com/agents/).
> Note: AI-assisted coding is encouraged, but you have to submit prompt history.

## Build instruction

Actual user message:

> Build the Data Center Incident Copilot and submission package

## Visible assistant planning responses

Actual assistant response at the beginning of implementation:

> I’ll build this as a Cloudflare-native incident copilot with chat, persistent incident state, a structured triage workflow, and safety boundaries. I’ll also prepare the repository, tests, README, and actual prompt history, then verify what runs locally before asking you to approve any public publishing or deployment to your Cloudflare account.

Actual assistant implementation update:

> The app will separate operator-reported facts from AI suggestions, keep each incident’s history, and require explicit operator action to move it through triage and handoff. I’m also including a clearly labeled simulation mode for local review; the production configuration will use Workers AI, and I won’t present scripted responses as live inference.

## Research prompts used by the coding assistant

These were actual documentation-extraction instructions sent to the URL-reading tool, not additional applicant messages:

> Extract exact model ID, AI.run messages request syntax, structured JSON response output support, and types of response. Include rate limits or deprecation if stated.

> Extract TypeScript DurableObject class import syntax, SQLite storage bindings and wrangler config migrations/new_sqlite_classes, methods namespace getByName. Examples for persistent storage state.

> Extract wrangler static assets config, run_worker_first pattern for /api routes, assets binding and SPA configuration examples.

> Extract wrangler migrations new_sqlite_classes exact example and whether legacy schema supported.

## Runtime prompt, distinct from development prompts

The complete runtime system-policy template is maintained in `shared/engine.ts`, function `buildSystemPrompt()`. It is intentionally version-controlled with the code rather than paraphrased here.

The inference request adds the persisted operator observations, reviewed check IDs, incident metadata, and recent conversation messages. These are dynamic runtime context, not hidden development instructions. The application does not ask the model to execute actions or control workflow transitions.

## Further iteration

### Public-repository authorization

Actual user message:

> Create the public repository nidusprod/cf_ai_dc_incident_copilot

The assistant checked the selected publishable files for sensitive values, excluded local runtime state and unrelated career files, and published the app source, tests, prompt history, screenshots, and validation documentation. No source license or public Cloudflare deployment was added automatically.

### Live-validation follow-up

Actual user message:

> Connect GitHub and Cloudflare for live-AI validation

The user then completed secure authorization and supplied the requested Cloudflare Account ID. Credential-entry notifications, the secret credential, and the account identifier are deliberately excluded from this public submission history.

The assistant ran three capped real inference calls, diagnosed a JSON-object-versus-text response mismatch, updated the adapter, added five regression tests, and verified the corrected adapter against a real response. A separate harness-only assertion was corrected and checked offline without further inference calls. See `docs/LIVE_VALIDATION.md` for the exact verification scope.

The assistant also performed implementation-only iterations driven by the test results: correcting TypeScript JSON typing, updating audited dependencies, isolating and testing the inference adapter with a mocked provider, improving responsive controls and secondary-text contrast, bypassing native form submission for restricted previews, and verifying retry idempotency after a deliberately lost response. These are a summary of actual assistant work, not additional human-issued prompts.

If you use another AI assistant or issue additional prompts while modifying this repository, append those real prompts and resulting decisions here before submission. Do not manufacture a longer prompt history to make the project look more elaborate.
