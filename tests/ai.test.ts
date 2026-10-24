import { describe, it, expect, vi } from "vitest";
import { liveAdvice } from "../shared/ai";
import { makeIncident, MODEL } from "../shared/engine";
const incident = () =>
  makeIncident({
    title: "Network alert",
    site: "LAB-DEMO",
    asset: "rack",
    severity: "SEV 2",
    category: "Network",
  });
describe("real inference adapter with a mocked provider binding", () => {
  it("accepts the parsed JSON response object observed from live Workers AI", async () => {
    const result = await liveAdvice(incident(), {
      run: async () => ({
        response: {
          assessment:
            "Potential network issue with packet loss on adjacent links",
          questions: ["Can you confirm the duration of the packet loss?"],
          checkIds: ["impact", "changes", "network-counters", "network-scope"],
        },
        choices: [
          { message: { content: "Provider metadata is not used as advice." } },
        ],
      }),
    });
    expect(result.checkIds).toEqual([
      "impact",
      "changes",
      "network-counters",
      "network-scope",
    ]);
  });
  it.each([null, []])("rejects null or array response %j", async (response) => {
    await expect(
      liveAdvice(incident(), { run: async () => ({ response }) }),
    ).rejects.toThrow();
  });
  it("still rejects forbidden workflow fields in a parsed object", async () => {
    await expect(
      liveAdvice(incident(), {
        run: async () => ({
          response: {
            assessment: "Fine.",
            questions: [],
            checkIds: [],
            phase: "Closed",
          },
        }),
      }),
    ).rejects.toThrow();
  });
  it("still screens risky prose in a parsed object", async () => {
    const result = await liveAdvice(incident(), {
      run: async () => ({
        response: {
          assessment: "Reboot the server.",
          questions: [],
          checkIds: ["impact"],
        },
      }),
    });
    expect(result.assessment).toContain("could not pass");
    expect(result.checkIds).toEqual([]);
  });
  it("sends the documented model ID, structured response format, and memory", async () => {
    const i = incident();
    i.observations.push("Loss began at 14:20.");
    const run = vi.fn().mockResolvedValue({
      response:
        '{"assessment":"A hypothesis requires evidence.","questions":["What is the impact?"],"checkIds":["impact"]}',
    });
    const result = await liveAdvice(i, { run });
    expect(run.mock.calls[0][0]).toBe(MODEL);
    const input = run.mock.calls[0][1];
    expect(input.response_format).toEqual({ type: "json_object" });
    expect(input.messages[0].content).toContain("Loss began at 14:20.");
    expect(result.checkIds).toEqual(["impact"]);
  });
  it("propagates provider failure, never returning simulation", async () => {
    await expect(
      liveAdvice(incident(), {
        run: async () => {
          throw new Error("Provider unavailable");
        },
      }),
    ).rejects.toThrow("Provider unavailable");
  });
  it.each([null, {}, { response: 42 }, { response: "not json" }])(
    "rejects malformed provider response %j",
    async (response) => {
      await expect(
        liveAdvice(incident(), { run: async () => response }),
      ).rejects.toThrow();
    },
  );
  it("discards risky generated instructions", async () => {
    const result = await liveAdvice(incident(), {
      run: async () => ({
        response:
          '{"assessment":"Reboot the server.","questions":[],"checkIds":["impact"]}',
      }),
    });
    expect(result.assessment).toContain("could not pass");
    expect(result.checkIds).toEqual([]);
  });
  it("rejects provider-controlled workflow fields", async () => {
    await expect(
      liveAdvice(incident(), {
        run: async () => ({
          response:
            '{"assessment":"Fine.","questions":[],"checkIds":[],"phase":"Closed"}',
        }),
      }),
    ).rejects.toThrow();
  });
});
