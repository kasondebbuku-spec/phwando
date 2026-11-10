import { describe, expect, it } from "vitest";
import { clock, fullTitle, kwacha, longDate } from "@/lib/format";

describe("kwacha", () => {
  it.each([
    [0, "Free"],
    [150, "K1.50"],
    [15000, "K150"],
    [150050, "K1,500.50"],
    [1234567, "K12,345.67"],
  ])("%i ngwee is %s", (ngwee, expected) => {
    expect(kwacha(ngwee)).toBe(expected);
  });
});

describe("dates use Lusaka time (UTC+2)", () => {
  // 22:30 UTC on 31 December is already New Year's Day in Lusaka.
  const d = new Date("2026-12-31T22:30:00Z");

  it("longDate", () => {
    // Newer Node versions add a comma after the weekday.
    expect(longDate(d)).toMatch(/^Friday,? 1 January 2027$/);
  });

  it("clock", () => {
    expect(clock(d)).toBe("00:30");
  });
});

describe("fullTitle", () => {
  it("joins the lead and title", () => {
    expect(fullTitle({ titleLead: "Happy 40th Birthday,", title: "Pastor Mwape" })).toBe("Happy 40th Birthday, Pastor Mwape");
  });

  it("uses the title alone when there is no lead", () => {
    expect(fullTitle({ titleLead: "", title: "Annual Gala" })).toBe("Annual Gala");
  });
});
