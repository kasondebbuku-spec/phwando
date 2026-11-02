import { db } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import { OPERATOR_LABEL } from "@/lib/phone";

// Guest list as CSV, for Excel or printing a door list.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await currentUser();
  if (!user) return new Response("Sign in first", { status: 401 });
  const event = await db.event.findFirst({ where: { id, organizationId: user.organizationId } });
  if (!event) return new Response("Not found", { status: 404 });

  const orders = await db.order.findMany({
    where: { eventId: id, status: "PAID" },
    include: { tier: true, tickets: true },
    orderBy: { guestName: "asc" },
  });

  // Prefix cells that Excel would treat as formulas.
  const cell = (v: string | number | null | undefined) => {
    let s = String(v ?? "");
    if (/^[=+\-@]/.test(s)) s = "'" + s;
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const header = ["Guest", "Phone", "Email", "Ticket type", "Quantity", "Amount (K)", "Paid with", "Paid at", "Ticket code", "Admits", "Checked in at", "Checked in by"];
  const lines = [header.join(",")];
  for (const o of orders) {
    for (const t of o.tickets) {
      lines.push(
        [o.guestName, o.guestPhone, o.guestEmail, o.tier.name, o.quantity, (o.amountNgwee / 100).toFixed(2), OPERATOR_LABEL[o.method] ?? o.method, o.paidAt?.toISOString(), t.code, t.admits, t.checkedInAt?.toISOString(), t.checkedInBy]
          .map(cell)
          .join(","),
      );
    }
  }

  return new Response("﻿" + lines.join("\r\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${event.slug}-guests.csv"`,
    },
  });
}
