import { desc, eq, inArray } from "drizzle-orm";
import { requireUser, isResponse } from "@/lib/auth";
import { getDb } from "@/lib/db/client";
import { bookingAnfragen, bookingVotes, users } from "@/lib/db/schema";
import { allUsers, notifyMany } from "@/lib/notify";

// Booking-Anfragen/Ideen eines Ressorts (HQ) inkl. Stimmungsbild.
export async function GET(request: Request) {
  const auth = await requireUser();
  if (isResponse(auth)) return auth;
  const ressortId = Number(new URL(request.url).searchParams.get("ressort"));
  if (!ressortId) return Response.json({ error: "ressort erforderlich" }, { status: 400 });
  const db = getDb();

  const liste = await db
    .select({
      id: bookingAnfragen.id,
      titel: bookingAnfragen.titel,
      notiz: bookingAnfragen.notiz,
      link: bookingAnfragen.link,
      createdAt: bookingAnfragen.createdAt,
      autorName: users.name,
      autorColor: users.avatarColor,
    })
    .from(bookingAnfragen)
    .leftJoin(users, eq(users.id, bookingAnfragen.erstelltVon))
    .where(eq(bookingAnfragen.ressortId, ressortId))
    .orderBy(desc(bookingAnfragen.createdAt));

  const votes = liste.length
    ? await db
        .select({
          anfrageId: bookingVotes.anfrageId,
          userId: bookingVotes.userId,
          wert: bookingVotes.wert,
          name: users.name,
          avatarColor: users.avatarColor,
        })
        .from(bookingVotes)
        .innerJoin(users, eq(users.id, bookingVotes.userId))
        .where(inArray(bookingVotes.anfrageId, liste.map((a) => a.id)))
    : [];

  return Response.json({
    anfragen: liste.map((a) => ({
      ...a,
      votes: votes.filter((v) => v.anfrageId === a.id),
    })),
  });
}

// Neue Anfrage/Idee — alle bekommen eine Benachrichtigung fürs Stimmungsbild.
export async function POST(request: Request) {
  const auth = await requireUser();
  if (isResponse(auth)) return auth;
  const body = await request.json().catch(() => ({}));
  const ressortId = Number(body?.ressortId);
  const titel = String(body?.titel ?? "").trim();
  if (!ressortId) return Response.json({ error: "ressortId erforderlich" }, { status: 400 });
  if (!titel) return Response.json({ error: "Titel erforderlich" }, { status: 400 });
  const link = String(body?.link ?? "").trim();
  if (link && !/^https?:\/\//.test(link)) return Response.json({ error: "Link muss mit http(s):// beginnen" }, { status: 400 });

  const inserted = await getDb()
    .insert(bookingAnfragen)
    .values({ ressortId, titel, notiz: String(body?.notiz ?? "").trim(), link, erstelltVon: auth.id })
    .returning({ id: bookingAnfragen.id });

  const alle = await allUsers();
  await notifyMany(
    alle.map((u) => ({
      userId: u.id,
      actorUserId: auth.id,
      typ: "booking" as const,
      text: `Booking: «${titel}» — passt das für dich?`,
      refTyp: "booking",
      refId: ressortId,
    })),
  );
  return Response.json({ id: inserted[0].id }, { status: 201 });
}
