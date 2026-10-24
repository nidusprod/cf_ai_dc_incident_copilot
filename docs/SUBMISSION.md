# Data Center Incident Copilot Submission Guide

## Repository URL for the application

Use [https://github.com/nidusprod/cf_ai_dc_incident_copilot](https://github.com/nidusprod/cf_ai_dc_incident_copilot) in the GitHub repository field. This is the source repository, not a claim that the full application has been deployed on Cloudflare.

## What this project demonstrates

A data-center incident assistant should help operators preserve context and hand work off cleanly, not perform unapproved infrastructure changes. This project connects that operational judgment to a small Cloudflare-native application.

The strongest demonstration is not an elaborate UI. It is the boundary between operator observations, model advice, curated read-only checks, and decisions that only a human can make.

## Before submitting

- [ ] Review the code and run the walkthrough yourself; understand every feature you plan to discuss.
- [ ] Read `PROMPTS.md` and preserve the AI-assistance disclosure.
- [ ] Run `npm ci`, `npm run check`, and `npm run dry-run`.
- [ ] Run `npm run test:api` against the local demo server.
- [ ] Authorize Cloudflare deployment and possible ongoing inference charges before enabling a public live app. The completed authorization covered the capped validation, not public deployment.
- [x] Validate a real Workers AI response through the actual adapter using REST transport; see `LIVE_VALIDATION.md`. This does not complete the deployed-Worker checks below.
- [ ] Deploy the real configuration, not `wrangler.demo.jsonc`.
- [ ] Send a real model request; check that the response is labeled Workers AI and malformed/failing inference does not become simulation.
- [ ] Check memory after refresh on the deployed Cloudflare URL.
- [ ] Verify a second workspace cannot access the first workspace's incidents.
- [ ] Keep all data fictional; ensure no credentials, `.wrangler` data, or personal career documents enter the repository.
- [x] Approve the repository name and public visibility.
- [ ] Choose a source license if desired; none has been added automatically.
- [x] Create the public GitHub repository.
- [ ] Add the real Cloudflare deployment URL to the README if sharing a hosted demo.
- [ ] Put the actual GitHub repository URL in the application field.

Repository name: `cf_ai_dc_incident_copilot`.

## Application description draft

Use only after you have deployed and personally verified the real AI configuration:

> Data Center Incident Copilot is a safety-first incident workspace built with Cloudflare Workers, Workers AI using Llama 3.3, and Durable Objects for persistent state. Operators can record observations, receive advisory triage questions, review curated read-only checks, and prepare an incident handoff. Workflow transitions remain operator-controlled. I used AI-assisted development and included the actual prompt history, architecture, tests, and limitations in the repository.

Until live deployment is verified, use this accurate alternative:

> I prepared a Cloudflare-native incident copilot with a working local simulation, persistent incident workflow, tests, and a Workers AI integration. The actual inference adapter has been validated against a real Workers AI response via REST, including a response-format fix and regression tests. Full Cloudflare deployment and native AI-binding verification are still pending. AI-assisted development is disclosed in the repository.

Neither statement should be submitted with a fabricated repository or deployment URL.

## Two-minute demonstration

- **Purpose:** Explain the operational problem: incident context gets scattered across messages, tickets, shifts, and teams.
- **Memory:** Add two observations, switch incidents, return, and refresh. Explain what is persisted and what is not independently verified.
- **Judgment:** Show the distinction between a hypothesis and an operator observation.
- **Coordination:** Move into triage with an explicit note; show that the model cannot close the incident.
- **Safety:** Report smoke or request an unapproved reboot. Show the deterministic refusal/escalation gate.
- **Handoff:** Display the summary, outstanding owner/root-cause fields, and timeline.
- **Honesty:** Point out simulation versus Workers AI labels and describe what was tested.

## Questions you should be ready to answer

### Why Durable Objects?

Each workspace has related incident state and a serialized update path. A SQLite-backed Durable Object gives a simple persistence boundary without introducing a second database service. The current prototype serializes requests itself to avoid lost updates during asynchronous model calls.

### Why not let the AI set severity or remediate?

The model lacks authenticated service telemetry, local procedures, and authority. Severity is operator-selected; phase changes need an operator note; the application has no infrastructure-changing tools. This reduces the consequences of incorrect model output.

### How does memory work?

Observations, messages, reviewed checks, and events are stored in the workspace object. The prompt includes the observations and recent messages. Data is bounded, not an unlimited knowledge base or retrieval system.

### What happens if the model fails?

The request fails explicitly. The application does not silently use scripted output in live mode, does not commit a partial chat turn, and preserves the operator's input for retry.

### How did AI help build this?

Be direct: the implementation and tests were AI-assisted, and the project-relevant prompt history is included. Explain the architecture, limits, testing, and any changes you personally made; do not imply independent software engineering work that you did not perform.

### What would you change before production?

Add real identity and authorization, access controls, explicit retention/deletion, stronger abuse protection, telemetry provenance, evaluation against realistic incidents, provider-level tests, and reviewed operational runbooks. Production incident records would need stronger audit guarantees than this prototype provides.
