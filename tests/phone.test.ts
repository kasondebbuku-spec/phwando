import { describe, expect, it } from "vitest";
import { detectOperator, normalisePhone, prettyPhone } from "@/lib/phone";

describe("normalisePhone", () => {
  it.each([
    ["0971234567", "0971234567"],
    ["097 123 4567", "0971234567"],
    ["+260 97 123 4567", "0971234567"],
    ["260961234567", "0961234567"],
    ["961234567", "0961234567"],
    ["0771234567", "0771234567"],
  ])("accepts %s", (input, expected) => {
    expect(normalisePhone(input)).toBe(expected);
  });

  it.each(["", "12345", "0981234567", "0211234567", "09712345678", "+44 7911 123456"])("rejects %s", (input) => {
    expect(normalisePhone(input)).toBeNull();
  });
});

describe("detectOperator", () => {
  it.each([
    ["0971234567", "airtel"],
    ["0771234567", "airtel"],
    ["0961234567", "mtn"],
    ["0761234567", "mtn"],
    ["0951234567", "zamtel"],
    ["0751234567", "zamtel"],
  ])("%s is %s", (phone, operator) => {
    expect(detectOperator(phone)).toBe(operator);
  });

  it("returns null for an unknown prefix", () => {
    expect(detectOperator("0981234567")).toBeNull();
  });
});

describe("prettyPhone", () => {
  it("groups a 10-digit number", () => {
    expect(prettyPhone("0971234567")).toBe("0971 234 567");
  });
});
