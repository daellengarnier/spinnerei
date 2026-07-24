import { asc, eq, inArray } from "drizzle-orm";
import { requireUser, isResponse } from "@/lib/auth";
import { getDb } from "@/lib/db/client";
import { sitzungen, traktanden, users } from "@/lib/db/schema";
import { allUsers, notifyMany } from "@/lib/notify";
import { formatDatumKurz } from "@/lib/datum";

// Sitzungen eines Ressorts (HQ) inkl. Traktanden.
export async function GET(request: Request) {
  const auth = await requireUser();
  if (isResponse(auth)) return auth;
  const ressortId = Number(new URL(request.url).searchParams.get("ressort"));
  if (!ressortId) return Response.json({ error: "ressort erforderlich" }, { status: 400 });
  const db = getDb();

  const liste = await db
    .select()
    .from(sitzungen)
    .where(eq(sitzungen.ressortId, ressortId))
    .orderBy(asc(sitzungen.datum), asc(sitzungen.startzeit));

  const punkte = liste.length
    ? await db
        .select({
          id: traktanden.id,
          sitzungId: traktanden.sitzungId,
          text: traktanden.text,
          erledigt: traktanden.erledigt,
          autorName: users.name,
        })
        .from(traktanden)
        .leftJoin(users, eq(users.id, traktanden.erstelltVon))
        .where(inArray(traktanden.sitzungId, liste.map((s) => s.id)))
        .orderBy(asc(traktanden.id))
    : [];

  return Response.json({
    sitzungen: liste.map((s) => ({
      ...s,
      traktanden: punkte.filter((p) => p.sitzungId === s.id),
    })),
  });
}

// Neue Sitzung anlegen — alle bekommen eine Benachrichtigung.
export async function POST(request: Request) {
  const auth = await requireUser();
  if (isResponse(auth)) return auth;
  const body = await request.json().catch(() => ({}));
  const ressortId = Number(body?.ressortId);
  const datum = String(body?.datum ?? "").trim();
  if (!ressortId) return Response.json({ error: "ressortId erforderlich" }, { status: 400 });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(datum)) return Response.json({ error: "Datum als YYYY-MM-DD" }, { status: 400 });
  const startzeit = String(body?.startzeit ?? "").trim();
  if (startzeit && !/^\d{2}:\d{2}$/.test(startzeit)) return Response.json({ error: "Zeit als HH:MM" }, { status: 400 });

  const inserted = await getDb()
    .insert(sitzungen)
    .values({ ressortId, datum, startzeit, ort: String(body?.ort ?? "").trim() })
    .returning({ id: sitzungen.id });

  const alle = await allUsers();
  await notifyMany(
    alle.map((u) => ({
      userId: u.id,
      actorUserId: auth.id,
      typ: "sitzung" as const,
      text: `Neue Sitzung: ${formatDatumKurz(datum)}${startzeit ? `, ${startzeit} Uhr` : ""}`,
      refTyp: "sitzung",
      refId: ressortId,
    })),
  );
  return Response.json({ id: inserted[0].id }, { status: 201 });
}
