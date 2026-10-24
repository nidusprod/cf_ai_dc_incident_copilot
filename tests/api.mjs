// Integration checks against the actual local Worker / Durable Object runtime.
// Start `npm run dev` in a separate terminal first. No live LLM calls.
import assert from "node:assert/strict";
const base = process.env.TEST_BASE || "http://127.0.0.1:8787";
const token = crypto.randomUUID(), other = crypto.randomUUID();
let passed = 0;
async function call(path = "", payload, identity = token) {
  const response = await fetch(`${base}/api/incidents${path}`, {
    method: payload ? "POST" : "GET",
    headers: { "Content-Type": "application/json", "X-Workspace-Token": identity },
    body: payload ? JSON.stringify(payload) : undefined,
  });
  return { status: response.status, data: await response.json() };
}
function ok(name, condition) { assert(condition, name); console.log(`PASS ${++passed}: ${name}`); }
const initial = await call();
ok("real Worker responds in explicit simulation mode", initial.status === 200 && initial.data.mode === "simulation");
ok("three sample incidents exist", initial.data.incidents.length === 3);
ok("missing workspace capability rejected", (await call("", undefined, "")).status === 401);
const id = initial.data.incidents[0].id;
ok("cannot triage before observations", (await call(`/${id}/phase`, { phase: "Triage", note: "Review initial issue" })).status === 409);
const requestId = crypto.randomUUID();
const first = await call(`/${id}/messages`, { text: "CRC counters rose at 14:20; impact is unknown.", requestId });
ok("observation and response persisted", first.data.incidents[0].messages.length === 3 && first.data.incidents[0].observations.length === 1);
const repeat = await call(`/${id}/messages`, { text: "CRC counters rose at 14:20; impact is unknown.", requestId });
ok("replayed request does not duplicate message", repeat.data.incidents[0].messages.length === 3);
const isolation = await call("", undefined, other);
ok("workspaces isolated", isolation.data.incidents.every(i => i.id !== id));
ok("reload retains observation", (await call()).data.incidents[0].observations.length === 1);
ok("unknown check rejected", (await call(`/${id}/checks`, { id: "execute-reboot", done: true })).status === 400);
ok("inapplicable facility check rejected", (await call(`/${id}/checks`, { id: "facility-alarms", done: true })).status === 400);
const reviewed = await call(`/${id}/checks`, { id: "impact", done: true });
ok("reviewed check retained", reviewed.data.incidents[0].checked.includes("impact"));
await call(`/${id}/checks`, { id: "impact", done: false });
ok("check can be marked not reviewed again", !(await call()).data.incidents[0].checked.includes("impact"));
const safety = await call(`/${id}/messages`, { text: "Smoke reported near the rack.", requestId: crypto.randomUUID() });
ok("hazard bypasses model and returns stop-work guidance", safety.data.incidents[0].messages.at(-1).source === "safety" && safety.data.incidents[0].messages.at(-1).text.includes("Stop work"));
for (const phase of ["Triage", "Escalated", "Handoff", "Closed"]) {
  const result = await call(`/${id}/phase`, { phase, note: "Demo operator reviewed evidence and owner." });
  ok(`human transition to ${phase}`, result.status === 200 && result.data.incidents[0].phase === phase);
}
ok("closed incident is read-only", (await call(`/${id}/messages`, { text: "Try another change", requestId: crypto.randomUUID() })).status === 409);
ok("closed checks cannot be changed", (await call(`/${id}/checks`, { id: "impact", done: true })).status === 409);
ok("oversized user message rejected", (await call(`/${initial.data.incidents[1].id}/messages`, { text: "x".repeat(2100), requestId: crypto.randomUUID() })).status === 400);
ok("new incident created with selected severity", (await call("", { title: "Synthetic test server", site: "LAB-DEMO", asset: "srv-test", severity: "SEV 1", category: "Server" })).data.incidents[0].severity === "SEV 1");
const rejectedOrigin = await fetch(`${base}/api/incidents`, { headers: { Origin: "https://untrusted.example", "X-Workspace-Token": token } });
ok("untrusted cross-origin request rejected", rejectedOrigin.status === 403);
console.log(`\n${passed} integration checks passed. Live Workers AI inference not tested by this script.`);
