import type { Incident } from "./schema";
import {
  MODEL,
  buildSystemPrompt,
  parseModelOutput,
  safetyReply,
} from "./engine";
export interface AiBinding {
  run(model: string, input: unknown): Promise<unknown>;
}
export async function liveAdvice(incident: Incident, ai: AiBinding) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const response = await Promise.race([
      ai.run(MODEL, {
        messages: [
          { role: "system", content: buildSystemPrompt(incident) },
          ...incident.messages
            .slice(-12)
            .map((m) => ({ role: m.role, content: m.text })),
        ],
        max_tokens: 650,
        temperature: 0.2,
        response_format: { type: "json_object" },
      }),
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error("AI request timed out.")),
          25000,
        );
      }),
    ]);
    const raw = (response as { response?: unknown })?.response;
    // JSON mode can return an already-parsed response object rather than text.
    // Normalize both through the same strict schema; do not strip extra fields.
    if (
      typeof raw !== "string" &&
      (raw === null || typeof raw !== "object" || Array.isArray(raw))
    )
      throw new Error("Invalid model response.");
    const output = parseModelOutput(
      typeof raw === "string" ? raw : JSON.stringify(raw),
      incident.category,
    );
    // Discard rather than act on model prose that trips the conservative guard.
    if (safetyReply(output.assessment + " " + output.questions.join(" "))) {
      return {
        assessment:
          "The generated response could not pass the advisory safety check. Use approved procedures and the qualified owner; no equipment action is authorized.",
        questions: [],
        checkIds: [],
      };
    }
    return output;
  } finally {
    if (timer) clearTimeout(timer);
  }
}
