import { createHash, createHmac } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";

// lenco.ts reads its settings when it is first imported, so each test sets the
// environment and then imports a fresh copy of the module.
async function loadLenco(env: Record<string, string>) {
  vi.resetModules();
  for (const [k, v] of Object.entries(env)) vi.stubEnv(k, v);
  return import("@/lib/lenco");
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

function sign(apiKey: string, body: string) {
  const key = createHash("sha256").update(apiKey).digest("hex");
  return createHmac("sha512", key).update(body).digest("hex");
}

describe("verifyWebhookSignature", () => {
  const body = JSON.stringify({ event: "collection.successful", data: { reference: "PHW-ABC" } });

  it("accepts a correctly signed body", async () => {
    const lenco = await loadLenco({ LENCO_API_KEY: "test-key", LENCO_MOCK: "false" });
    expect(lenco.verifyWebhookSignature(body, sign("test-key", body))).toBe(true);
  });

  it("rejects a body that was changed after signing", async () => {
    const lenco = await loadLenco({ LENCO_API_KEY: "test-key", LENCO_MOCK: "false" });
    const tampered = body.replace("successful", "failed");
    expect(lenco.verifyWebhookSignature(tampered, sign("test-key", body))).toBe(false);
  });

  it("rejects a signature made with another key", async () => {
    const lenco = await loadLenco({ LENCO_API_KEY: "test-key", LENCO_MOCK: "false" });
    expect(lenco.verifyWebhookSignature(body, sign("other-key", body))).toBe(false);
  });

  it("rejects a missing or malformed signature", async () => {
    const lenco = await loadLenco({ LENCO_API_KEY: "test-key", LENCO_MOCK: "false" });
    expect(lenco.verifyWebhookSignature(body, null)).toBe(false);
    expect(lenco.verifyWebhookSignature(body, "abc")).toBe(false);
  });

  it("rejects everything when no API key is configured", async () => {
    const lenco = await loadLenco({ LENCO_API_KEY: "" });
    expect(lenco.verifyWebhookSignature(body, sign("", body))).toBe(false);
  });
});

describe("mock payments", () => {
  it("is on when there is no API key", async () => {
    const lenco = await loadLenco({ LENCO_API_KEY: "", LENCO_MOCK: "false" });
    expect(lenco.LENCO_MOCK).toBe(true);
  });

  it("stays pending, then succeeds after a few seconds", async () => {
    vi.useFakeTimers();
    const lenco = await loadLenco({ LENCO_API_KEY: "", LENCO_MOCK: "true" });
    const reference = `PHW-OK-${Date.now()}`;

    const started = await lenco.collectMobileMoney({ reference, amountKwacha: 150, phone: "0971234567", operator: "airtel" });
    expect(started.status).toBe("pay-offline");
    expect(started.amount).toBe("150.00");

    vi.advanceTimersByTime(6001);
    const done = await lenco.getCollection(reference);
    expect(done.status).toBe("successful");
    expect(done.reasonForFailure).toBeNull();
  });

  it("fails for test numbers ending in 2222222", async () => {
    vi.useFakeTimers();
    const lenco = await loadLenco({ LENCO_API_KEY: "", LENCO_MOCK: "true" });
    const reference = `PHW-FAIL-${Date.now()}`;

    await lenco.collectMobileMoney({ reference, amountKwacha: 150, phone: "0972222222", operator: "airtel" });
    vi.advanceTimersByTime(6001);
    const done = await lenco.getCollection(reference);
    expect(done.status).toBe("failed");
    expect(done.reasonForFailure).toMatch(/PIN/);
  });

  it("reports an unknown reference as failed", async () => {
    const lenco = await loadLenco({ LENCO_API_KEY: "", LENCO_MOCK: "true" });
    const c = await lenco.getCollection("PHW-NEVER-STARTED");
    expect(c.status).toBe("failed");
    expect(c.reasonForFailure).toBe("Unknown reference");
  });
});
