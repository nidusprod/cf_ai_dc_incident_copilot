import { z } from "zod";

export const phases = [
  "Intake",
  "Triage",
  "Escalated",
  "Handoff",
  "Closed",
] as const;
export const categories = [
  "Network",
  "Server",
  "Facilities",
  "Unknown",
] as const;
export const createSchema = z.object({
  title: z.string().trim().min(4).max(100),
  site: z.string().trim().min(2).max(40),
  asset: z.string().trim().max(60).default("Not specified"),
  severity: z.enum(["SEV 1", "SEV 2", "SEV 3"]).default("SEV 3"),
  category: z.enum(categories).default("Unknown"),
});
export const chatSchema = z.object({
  text: z.string().trim().min(1).max(2000),
  requestId: z.string().uuid(),
});
export const advanceSchema = z.object({
  phase: z.enum(phases),
  note: z.string().trim().min(5).max(500),
});
export const checkSchema = z.object({
  id: z.string().min(1).max(40),
  done: z.boolean(),
});
export type NewIncident = z.infer<typeof createSchema>;
export type Phase = (typeof phases)[number];
export type Category = (typeof categories)[number];
export interface Message {
  id: string;
  role: "user" | "assistant";
  text: string;
  at: string;
  source?: "simulation" | "workers-ai" | "safety";
  checkIds?: string[];
}
export interface Event {
  at: string;
  text: string;
  kind: "operator" | "system";
}
export interface Incident extends NewIncident {
  id: string;
  phase: Phase;
  createdAt: string;
  messages: Message[];
  observations: string[];
  checked: string[];
  events: Event[];
  processedRequests: string[];
}
export interface Workspace {
  incidents: Incident[];
}
export interface AppData extends Workspace {
  mode: "simulation" | "workers-ai";
  model: string;
  safety: string;
}
export const modelOutputSchema = z
  .object({
    assessment: z.string().min(1).max(1800),
    questions: z.array(z.string().max(240)).max(3),
    checkIds: z.array(z.string()).max(4),
  })
  .strict();
