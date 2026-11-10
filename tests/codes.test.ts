import { describe, expect, it } from "vitest";
import { hashCode, orderReference, otp, shortSuffix, slugify, ticketCode } from "@/lib/codes";

// Codes avoid 0, O, 1 and I so they can be read aloud without confusion.
const SAFE = "[A-HJ-NP-Z2-9]";

describe("codes", () => {
  it("ticket codes carry the event prefix and 6 safe characters", () => {
    expect(ticketCode("BM40")).toMatch(new RegExp(`^BM40-${SAFE}{6}$`));
  });

  it("order references are PHW- plus 12 safe characters", () => {
    expect(orderReference()).toMatch(new RegExp(`^PHW-${SAFE}{12}$`));
  });

  it("order references do not repeat", () => {
    const refs = new Set(Array.from({ length: 1000 }, orderReference));
    expect(refs.size).toBe(1000);
  });

  it("one-time codes are 6 digits", () => {
    for (let i = 0; i < 100; i++) expect(otp()).toMatch(/^\d{6}$/);
  });

  it("hashCode is stable and tied to the phone number", () => {
    expect(hashCode("0971234567", "123456")).toBe(hashCode("0971234567", "123456"));
    expect(hashCode("0971234567", "123456")).not.toBe(hashCode("0961234567", "123456"));
    expect(hashCode("0971234567", "123456")).toMatch(/^[0-9a-f]{64}$/);
  });

  it("shortSuffix is 4 lowercase characters", () => {
    expect(shortSuffix()).toMatch(/^[a-hj-np-z2-9]{4}$/);
  });
});

describe("slugify", () => {
  it.each([
    ["Pastor Benjamin's 40th!", "pastor-benjamin-s-40th"],
    ["  Café Night  ", "cafe-night"],
    ["Mwape & Chanda Wedding 2026", "mwape-chanda-wedding-2026"],
  ])("%s -> %s", (input, expected) => {
    expect(slugify(input)).toBe(expected);
  });

  it("caps the length at 48 characters", () => {
    expect(slugify("a".repeat(100)).length).toBe(48);
  });
});
