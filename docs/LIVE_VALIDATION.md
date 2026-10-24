# Workers AI Live Validation

The actual application inference adapter has now accepted a real Cloudflare Workers AI response through authenticated REST transport. This is narrower than a deployed-app test: the remote Worker, its native AI binding, and remote Durable Object persistence have not been deployed or validated.

## Scope and result

- **Requested model:** `@cf/meta/llama-3.3-70b-instruct-fp8-fast`.
- **Application code exercised:** `shared/ai.ts`, `liveAdvice()`, with the unchanged application prompt, schema validation, category check allowlist, and prose safety guard.
- **Transport:** An authorized host-scoped credential proxy and Cloudflare's REST endpoint, following the [Workers AI REST API interface](https://developers.cloudflare.com/workers-ai/get-started/rest-api/). No raw secret was placed in source, logs, or command arguments.
- **Data:** A fictional network incident at LAB-DEMO, with operator-reported packet loss and unconfirmed service impact.
- **Total live inference calls:** Three. Two exposed/diagnosed the same response-format incompatibility; the third was accepted by the corrected adapter.
- **State boundary:** The successful call left the incident unchanged, including its Intake phase.
- **Validation date:** 2026-10-24 UTC.

## What the live test found

In JSON mode, the returned `response` was an already-parsed object, not the string the initial adapter expected. The request reached the provider successfully, but the application rejected that object.

The adapter now normalizes both string and object responses through the same strict schema. Nulls, arrays, invalid JSON, forbidden workflow fields, and unsafe generated prose remain rejected or guarded; normalization does not grant the model any additional control.

The fix added five regression tests. The final suite has 37 unit tests, including 13 inference-adapter tests.

## Real accepted output

The third live call produced this accepted result:

```json
{
  "assessment": "Potential network issue with packet loss on adjacent links",
  "questions": [
    "Can you confirm the duration of the packet loss?",
    "Are there any error messages or logs available?",
    "Have there been any recent software updates or configuration changes?"
  ],
  "checkIds": [
    "impact",
    "changes",
    "network-counters",
    "network-scope"
  ]
}
```

All four check IDs were valid for the network category. The text treated the issue as potential rather than an established root cause, and no state change or infrastructure action was performed.

## Harness notes and limits

The accepted live call was followed by an unrelated assertion error in the standalone test harness: it addressed the deterministic safety helper as an object even though that helper returns a string. That assertion was corrected and verified using the captured real response with zero additional model calls. The accepted live adapter result was recorded before the harness-only error; this report does not label the original full harness run a clean end-to-end deployment success.

The test plan originally included follow-up memory and facilities model calls. Those additional live scenarios were not run because the three-call limit was used diagnosing and confirming the parser fix. Memory, facilities, safety, workflow, and isolation behavior remain covered by local unit/API/browser checks, not by a claim of expanded live-model evaluation.

The shared preview remains explicitly in simulation mode. Native `env.AI.run()` behavior inside a deployed Worker, production billing/plan setup, remote persistence, identity/access controls, and GitHub publication still need separate completion.
