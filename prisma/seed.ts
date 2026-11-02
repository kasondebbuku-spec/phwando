// Creates the first venue, its owner login and Pastor Benjamin Mwape's 40th birthday event.
// Run with: npm run db:seed   (safe to run again; existing records are left alone)
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

async function main() {
  const email = (process.env.SEED_OWNER_EMAIL || "owner@phwando.test").toLowerCase();
  const password = process.env.SEED_OWNER_PASSWORD;
  if (!password) throw new Error("Set SEED_OWNER_PASSWORD in .env before seeding.");

  const org = await db.organization.upsert({
    where: { slug: "falls-way-events" },
    update: {},
    create: { name: "Falls Way Events", slug: "falls-way-events" },
  });

  await db.user.upsert({
    where: { email },
    update: {},
    create: { email, name: "Event owner", passwordHash: await bcrypt.hash(password, 12), role: "OWNER", organizationId: org.id },
  });

  const existing = await db.event.findUnique({ where: { slug: "pastor-benjamin-40" } });
  if (!existing) {
    await db.event.create({
      data: {
        organizationId: org.id,
        slug: "pastor-benjamin-40",
        code: "BM40",
        template: "birthday",
        theme: "ruby",
        titleLead: "Happy 40th Birthday,",
        title: "Pastor Benjamin Mwape",
        honoree: "Pastor Benjamin Mwape",
        subtitle: "Celebrating forty years of God's faithfulness",
        about:
          "Join us as we thank God for the life, leadership and ministry of Pastor Benjamin Mwape. The evening includes a celebration service and a fellowship meal.",
        verseText: "The Lord bless you and keep you; the Lord make His face shine upon you.",
        verseRef: "Numbers 6:24–25",
        host: "BM Celebration",
        venue: "Falls Way Events",
        startsAt: new Date("2026-11-24T18:00:00+02:00"),
        timeText: "6 pm till late",
        tiers: {
          create: [{ name: "Celebration Ticket", description: "Entry, celebration service & fellowship meal", priceNgwee: 50000, capacity: 300, sortOrder: 0 }],
        },
      },
    });
  }

  console.log(`Seeded. Organiser sign-in: ${email} (password from SEED_OWNER_PASSWORD). Event: /e/pastor-benjamin-40`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
