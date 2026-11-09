import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";

// These tests run against a real PostgreSQL database. They are skipped unless
// TEST_DATABASE_URL points at a migrated, throwaway database (never your dev data).
const TEST_DB = process.env.TEST_DATABASE_URL;

describe.skipIf(!TEST_DB)("orders (database)", () => {
  let db: PrismaClient;
  let orders: typeof import("@/lib/orders");
  let orgId: string;
  let eventId: string;
  let seatTierId: string;
  let tableTierId: string;

  beforeAll(async () => {
    process.env.DATABASE_URL = TEST_DB;
    vi.spyOn(console, "log").mockImplementation(() => {}); // quiet the SMS log
    ({ db } = await import("@/lib/db"));
    orders = await import("@/lib/orders");

    const org = await db.organization.create({ data: { name: "Test Venue", slug: `test-${Date.now()}` } });
    orgId = org.id;
    const event = await db.event.create({
      data: {
        organizationId: org.id,
        slug: `test-event-${Date.now()}`,
        code: "TST",
        template: "party",
        theme: "default",
        title: "Test Party",
        host: "Test Host",
        venue: "Test Hall",
        startsAt: new Date("2026-12-31T16:00:00Z"),
        timeText: "6 pm till late",
        tiers: {
          create: [
            { name: "Seat", priceNgwee: 15000, capacity: 100 },
            { name: "Table of 10", priceNgwee: 120000, seatsPer: 10, capacity: 10 },
          ],
        },
      },
      include: { tiers: true },
    });
    eventId = event.id;
    seatTierId = event.tiers.find((t) => t.seatsPer === 1)!.id;
    tableTierId = event.tiers.find((t) => t.seatsPer === 10)!.id;
  });

  afterAll(async () => {
    if (!db) return;
    await db.ticket.deleteMany({ where: { order: { eventId } } });
    await db.order.deleteMany({ where: { eventId } });
    await db.organization.delete({ where: { id: orgId } });
    await db.$disconnect();
  });

  let n = 0;
  async function pendingOrder(tierId: string, quantity: number) {
    return db.order.create({
      data: {
        reference: `PHW-TEST-${Date.now()}-${n++}`,
        eventId,
        tierId,
        quantity,
        amountNgwee: 15000 * quantity,
        guestName: "Test Guest",
        guestPhone: "0971234567",
        method: "airtel",
      },
    });
  }

  it("issues one ticket per seat when an order is paid", async () => {
    const order = await pendingOrder(seatTierId, 3);
    await orders.markOrderPaid(order.id, "LENCO-1");

    const paid = await db.order.findUniqueOrThrow({ where: { id: order.id }, include: { tickets: true } });
    expect(paid.status).toBe("PAID");
    expect(paid.lencoReference).toBe("LENCO-1");
    expect(paid.paidAt).not.toBeNull();
    expect(paid.tickets).toHaveLength(3);
    expect(new Set(paid.tickets.map((t) => t.code)).size).toBe(3);
    for (const t of paid.tickets) expect(t.code).toMatch(/^TST-/);
  });

  it("issues tickets exactly once when the webhook and the status poll arrive together", async () => {
    const order = await pendingOrder(seatTierId, 2);
    await Promise.all(Array.from({ length: 5 }, () => orders.markOrderPaid(order.id, "LENCO-RACE")));

    const tickets = await db.ticket.count({ where: { orderId: order.id } });
    expect(tickets).toBe(2);
  });

  it("gives a table ticket one QR code that admits the whole table", async () => {
    const order = await pendingOrder(tableTierId, 1);
    await orders.markOrderPaid(order.id);

    const tickets = await db.ticket.findMany({ where: { orderId: order.id } });
    expect(tickets).toHaveLength(1);
    expect(tickets[0].admits).toBe(10);
  });

  it("does not let a late failure undo a paid order", async () => {
    const order = await pendingOrder(seatTierId, 1);
    await orders.markOrderPaid(order.id);
    await orders.markOrderFailed(order.id, "Timed out");

    const after = await db.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(after.status).toBe("PAID");
    expect(after.failureReason).toBeNull();
  });

  it("records the reason when a payment fails", async () => {
    const order = await pendingOrder(seatTierId, 1);
    await orders.applyCollection(order.id, { status: "failed", lencoReference: "", reasonForFailure: "Insufficient funds" });

    const after = await db.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(after.status).toBe("FAILED");
    expect(after.failureReason).toBe("Insufficient funds");
    expect(await db.ticket.count({ where: { orderId: order.id } })).toBe(0);
  });

  it("leaves a still-pending payment alone", async () => {
    const order = await pendingOrder(seatTierId, 1);
    await orders.applyCollection(order.id, { status: "pay-offline", lencoReference: "", reasonForFailure: null });

    const after = await db.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(after.status).toBe("PENDING");
  });
});

describe("seatsSold", () => {
  it("counts only paid orders, times the seats each ticket admits", async () => {
    const { seatsSold } = await import("@/lib/orders");
    expect(
      seatsSold([
        { status: "PAID", quantity: 2, tier: { seatsPer: 1 } },
        { status: "PAID", quantity: 1, tier: { seatsPer: 10 } },
        { status: "PENDING", quantity: 5, tier: { seatsPer: 1 } },
        { status: "FAILED", quantity: 3, tier: { seatsPer: 1 } },
      ]),
    ).toBe(12);
  });
});
