import { createHash, createHmac, timingSafeEqual } from "crypto";
import type { Operator } from "./phone";

// Lenco API v2 — https://lenco-api.readme.io/v2.0/reference
// Mobile-money collections: POST /collections/mobile-money, then wait for the
// collection.successful / collection.failed webhook, or poll GET /collections/status/:reference.
//
// With LENCO_MOCK=true (or no API key) nothing is sent to Lenco: payments are faked
// so the whole flow can be tested locally. Numbers ending in 2222222 fail; others succeed.

export type CollectionStatus = "pending" | "successful" | "failed" | "pay-offline" | "3ds-auth-required";

export type Collection = {
  id: string;
  reference: string;
  lencoReference: string;
  amount: string;
  status: CollectionStatus;
  reasonForFailure: string | null;
};

type LencoResponse<T> = { status: boolean; message: string; data: T | null };

const BASE_URL = process.env.LENCO_BASE_URL || "https://api.lenco.co/access/v2";
const API_KEY = process.env.LENCO_API_KEY || "";
export const LENCO_MOCK = process.env.LENCO_MOCK === "true" || !API_KEY;

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(BASE_URL + path, {
    ...init,
    headers: { Authorization: `Bearer ${API_KEY}`, "Content-Type": "application/json", Accept: "application/json" },
    cache: "no-store",
  });
  const body = (await res.json().catch(() => null)) as LencoResponse<T> | null;
  if (!res.ok || !body?.status || !body.data) {
    throw new LencoError(body?.message || `Lenco request failed (${res.status})`, res.status);
  }
  return body.data;
}

export class LencoError extends Error {
  constructor(message: string, public httpStatus: number) {
    super(message);
  }
}

// In mock mode, remember when each fake collection started so it "completes" after a few seconds.
// Kept on globalThis because Next.js may load this module separately for each route.
const g = globalThis as unknown as { __lencoMock?: Map<string, { at: number; phone: string; amount: string }> };
const mockStarted = (g.__lencoMock ??= new Map());
const MOCK_DELAY_MS = 6000;

export async function collectMobileMoney(input: {
  reference: string;
  amountKwacha: number;
  phone: string;
  operator: Operator;
}): Promise<Collection> {
  if (LENCO_MOCK) {
    mockStarted.set(input.reference, { at: Date.now(), phone: input.phone, amount: input.amountKwacha.toFixed(2) });
    return mockCollection(input.reference);
  }
  return call<Collection>("/collections/mobile-money", {
    method: "POST",
    body: JSON.stringify({
      amount: input.amountKwacha,
      reference: input.reference,
      phone: input.phone,
      operator: input.operator,
      country: "zm",
      bearer: "merchant",
    }),
  });
}

export async function getCollection(reference: string): Promise<Collection> {
  if (LENCO_MOCK) return mockCollection(reference);
  return call<Collection>(`/collections/status/${encodeURIComponent(reference)}`);
}

function mockCollection(reference: string): Collection {
  const m = mockStarted.get(reference);
  const done = m && Date.now() - m.at > MOCK_DELAY_MS;
  const fails = m?.phone.endsWith("2222222");
  return {
    id: "mock-" + reference,
    reference,
    lencoReference: "MOCK" + reference.slice(-6),
    amount: m?.amount ?? "0.00",
    status: !m ? "failed" : !done ? "pay-offline" : fails ? "failed" : "successful",
    reasonForFailure: m && done && fails ? "Incorrect PIN (test number)" : m ? null : "Unknown reference",
  };
}

// Webhook signature: HMAC-SHA512 of the raw body, keyed with the SHA-256 hex digest of the API key,
// sent in the X-Lenco-Signature header.
export function verifyWebhookSignature(rawBody: string, signature: string | null): boolean {
  if (!signature || !API_KEY) return false;
  const key = createHash("sha256").update(API_KEY).digest("hex");
  const expected = createHmac("sha512", key).update(rawBody).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && timingSafeEqual(a, b);
}
