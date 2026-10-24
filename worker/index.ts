import { DurableObject } from "cloudflare:workers";
import { ZodError } from "zod";
import {
  createSchema,
  chatSchema,
  advanceSchema,
  checkSchema,
  type Workspace,
  type Incident,
} from "../shared/schema";
import {
  initialWorkspace,
  makeIncident,
  now,
  advance,
  MODEL,
  simulationReply,
  safetyReply,
} from "../shared/engine";
import { liveAdvice } from "../shared/ai";
import { checks, SAFETY, checkIdsFor } from "../shared/runbooks";

interface Env {
  WORKSPACES: DurableObjectNamespace<IncidentWorkspace>;
  AI?: { run(model: string, input: unknown): Promise<unknown> };
  ASSETS: Fetcher;
  MODE: string;
  MAX_AI_DAILY: string;
  MAX_AI_MINUTE: string;
}
const json = (value: unknown, status = 200) =>
  Response.json(value, { status, headers: { "Cache-Control": "no-store" } });
const error = (message: string, status = 400) =>
  json({ error: message }, status);
const uid =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
async function body(request: Request) {
  if (Number(request.headers.get("Content-Length") || 0) > 8192)
    throw new Error("Request is too large.");
  const text = await request.text();
  if (text.length > 8192) throw new Error("Request is too large.");
  return JSON.parse(text);
}
export class IncidentWorkspace extends DurableObject<Env> {
  private pending: Promise<unknown> = Promise.resolve();
  async claimAI(): Promise<boolean> {
    return this.ctx.storage.transaction(async (tx) => {
      const stamp = new Date().toISOString();
      const day = stamp.slice(0, 10),
        minute = stamp.slice(0, 16);
      const quota = (await tx.get<{
        day: string;
        minute: string;
        daily: number;
        recent: number;
      }>("quota")) || { day, minute, daily: 0, recent: 0 };
      if (quota.day !== day) {
        quota.day = day;
        quota.daily = 0;
      }
      if (quota.minute !== minute) {
        quota.minute = minute;
        quota.recent = 0;
      }
      if (
        quota.daily >= Number(this.env.MAX_AI_DAILY || 100) ||
        quota.recent >= Number(this.env.MAX_AI_MINUTE || 10)
      )
        return false;
      quota.daily++;
      quota.recent++;
      await tx.put("quota", quota);
      return true;
    });
  }
  async fetch(request: Request): Promise<Response> {
    const operation = this.pending.then(() => this.handle(request));
    this.pending = operation.catch(() => {});
    return operation;
  }
  private async handle(request: Request): Promise<Response> {
    try {
      const data =
        (await this.ctx.storage.get<Workspace>("workspace")) ||
        initialWorkspace();
      const path = new URL(request.url).pathname.split("/").filter(Boolean);
      if (path.length === 1 && request.method === "POST") {
        if (data.incidents.length >= 20)
          return error("This demo workspace is limited to 20 incidents.", 409);
        const input = createSchema.parse(await body(request));
        data.incidents.unshift(makeIncident(input));
      } else if (path.length > 1) {
        const incident = data.incidents.find((i) => i.id === path[1]);
        if (!incident) return error("Incident not found.", 404);
        if (request.method !== "POST") return error("Method not allowed.", 405);
        if (incident.phase === "Closed")
          return error("Closed incidents are read-only.", 409);
        if (path[2] === "messages") {
          const input = chatSchema.parse(await body(request));
          if (incident.processedRequests.includes(input.requestId))
            return this.view(data);
          if (incident.messages.length >= 80)
            return error(
              "This incident reached the 80-message limit. Export a handoff and start a new incident.",
              409,
            );
          const at = now();
          const draft = structuredClone(incident);
          draft.observations.push(input.text);
          draft.messages.push({
            id: crypto.randomUUID(),
            role: "user",
            text: input.text,
            at,
          });
          const safety = safetyReply(input.text);
          let reply: Incident["messages"][number];
          if (safety) {
            reply = {
              id: crypto.randomUUID(),
              role: "assistant",
              at: now(),
              source: "safety",
              text: safety,
              checkIds: [],
            };
          } else {
            let output;
            if (this.env.MODE === "simulation") {
              output = simulationReply(draft, input.text);
            } else {
              if (!this.env.AI)
                return error(
                  "Workers AI binding is unavailable. No simulated fallback was used.",
                  503,
                );
              const quota = this.env.WORKSPACES.getByName("global-ai-quota");
              if (!(await quota.claimAI()))
                return error(
                  "The shared AI demo budget is reached. Try again later or contact the app owner.",
                  429,
                );
              output = await liveAdvice(draft, this.env.AI);
            }
            reply = {
              id: crypto.randomUUID(),
              role: "assistant",
              at: now(),
              source:
                this.env.MODE === "simulation" ? "simulation" : "workers-ai",
              text:
                output.assessment +
                (output.questions.length
                  ? "\n\nTo clarify:\n" +
                    output.questions.map((q) => `• ${q}`).join("\n")
                  : ""),
              checkIds: output.checkIds,
            };
          }
          draft.messages.push(reply);
          draft.processedRequests.push(input.requestId);
          draft.events.push({
            at: now(),
            kind: "operator",
            text: "Operator added an observation; advisory response recorded.",
          });
          Object.assign(incident, draft);
        } else if (path[2] === "phase") {
          const input = advanceSchema.parse(await body(request));
          advance(incident, input.phase, input.note);
        } else if (path[2] === "checks") {
          const input = checkSchema.parse(await body(request));
          if (!checkIdsFor(incident.category).includes(input.id))
            return error("Check does not apply to this incident.");
          const current = new Set(incident.checked);
          input.done ? current.add(input.id) : current.delete(input.id);
          incident.checked = [...current];
          const title = checks.find((c) => c.id === input.id)!.title;
          incident.events.push({
            at: now(),
            kind: "operator",
            text: `${title}: operator marked ${input.done ? "reviewed" : "not reviewed"}.`,
          });
        } else return error("Route not found.", 404);
      } else if (request.method !== "GET")
        return error("Method not allowed.", 405);
      await this.ctx.storage.put("workspace", data);
      return this.view(data);
    } catch (e) {
      if (e instanceof ZodError)
        return error(
          e.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
        );
      if (e instanceof SyntaxError)
        return error(
          "Invalid JSON or model output. Your message was not saved; retry after reviewing the service.",
        );
      const message = e instanceof Error ? e.message : "";
      if (
        message.startsWith("Invalid phase") ||
        message.includes("before triage") ||
        message.includes("before closure") ||
        message === "Request is too large."
      )
        return error(message, 409);
      return error(
        "The request could not complete. No new observation was saved. Please retry; live AI never falls back to simulation.",
        502,
      );
    }
  }
  private view(data: Workspace) {
    return json({
      ...data,
      mode: this.env.MODE,
      model:
        this.env.MODE === "simulation"
          ? "Scripted simulation · no LLM calls"
          : MODEL,
      safety: SAFETY,
    });
  }
}
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (!url.pathname.startsWith("/api/")) return env.ASSETS.fetch(request);
    const origin = request.headers.get("Origin");
    const permitted =
      !origin ||
      origin === url.origin ||
      (env.MODE === "simulation" &&
        (origin === "null" ||
          /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)));
    if (!permitted) return error("Origin is not permitted.", 403);
    const headers = {
      "Access-Control-Allow-Origin": origin || url.origin,
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, X-Workspace-Token",
      Vary: "Origin",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
    };
    if (request.method === "OPTIONS")
      return new Response(null, { status: 204, headers });
    const token = request.headers.get("X-Workspace-Token") || "";
    if (!uid.test(token))
      return withHeaders(
        error("A valid workspace capability is required.", 401),
        headers,
      );
    if (
      url.pathname !== "/api/incidents" &&
      !/^\/api\/incidents\/[0-9a-f-]+\/(messages|phase|checks)$/.test(
        url.pathname,
      )
    )
      return withHeaders(error("Route not found.", 404), headers);
    const stub = env.WORKSPACES.getByName(`workspace:${token}`);
    const result = await stub.fetch(
      new Request(
        "https://internal" + url.pathname.replace("/api", ""),
        request,
      ),
    );
    return withHeaders(result, headers);
  },
} satisfies ExportedHandler<Env>;
function withHeaders(response: Response, headers: Record<string, string>) {
  const copy = new Response(response.body, response);
  for (const [key, value] of Object.entries(headers))
    copy.headers.set(key, value);
  return copy;
}
