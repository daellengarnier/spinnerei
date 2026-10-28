import { and, asc, desc, eq, gt, inArray, isNotNull, lt, ne } from "drizzle-orm";
import { requireUser, isResponse } from "@/lib/auth";
import { getDb } from "@/lib/db/client";
import { sitzungAnwesende, sitzungen, todos, traktanden, users } from "@/lib/db/schema";
import { pendenzenMit } from "@/lib/sitzungHelpers";

// Eine Sitzung mit allem für die Sitzungsseite: Traktanden mit Notizen und
// ihren Pendenzen, Anwesende, offene Pendenzen früherer Sitzungen und was
// seit der letzten Sitzung erledigt wurde.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if (isResponse(auth)) return auth;
  const id = Number((await params).id);
  if (!id) return Response.json({ error: "Ungültige ID" }, { status: 400 });
  const db = getDb();

  const sitzung = (await db.select().from(sitzungen).where(eq(sitzungen.id, id)).limit(1))[0];
  if (!sitzung) return Response.json({ error: "Sitzung nicht gefunden" }, { status: 404 });

  const punkte = await db
    .select({ id: traktanden.id, text: traktanden.text, notizen: traktanden.notizen, erledigt: traktanden.erledigt, autorName: users.name })
    .from(traktanden)
    .leftJoin(users, eq(users.id, traktanden.erstelltVon))
    .where(eq(traktanden.sitzungId, id))
    .orderBy(asc(traktanden.reihenfolge), asc(traktanden.id));
  const eigene = await pendenzenMit(eq(todos.sitzungId, id));
  const anwesend = (await db.select({ userId: sitzungAnwesende.userId }).from(sitzungAnwesende).where(eq(sitzungAnwesende.sitzungId, id))).map(
    (a) => a.userId,
  );

  // Frühere und nächste Sitzung desselben Ressorts (Navigation, «seit der letzten Sitzung»).
  const gleiche = and(eq(sitzungen.ressortId, sitzung.ressortId), ne(sitzungen.id, id));
  const vorher = (
    await db.select({ id: sitzungen.id, datum: sitzungen.datum }).from(sitzungen).where(and(gleiche, lt(sitzungen.datum, sitzung.datum))).orderBy(desc(sitzungen.datum)).limit(1)
  )[0] ?? null;
  const nachher = (
    await db.select({ id: sitzungen.id, datum: sitzungen.datum }).from(sitzungen).where(and(gleiche, gt(sitzungen.datum, sitzung.datum))).orderBy(asc(sitzungen.datum)).limit(1)
  )[0] ?? null;
  const fruehereIds = (
    await db.select({ id: sitzungen.id }).from(sitzungen).where(and(gleiche, lt(sitzungen.datum, sitzung.datum)))
  ).map((s) => s.id);
  const frueher = fruehereIds.length ? await pendenzenMit(and(isNotNull(todos.sitzungId), inArray(todos.sitzungId, fruehereIds))) : [];
  const seit = vorher ? new Date(`${vorher.datum}T00:00:00`) : null;

  return Response.json({
    sitzung,
    anwesend,
    vorher,
    nachher,
    traktanden: punkte.map((t) => ({ ...t, pendenzen: eigene.filter((p) => p.traktandumId === t.id) })),
    pendenzenOhneTraktandum: eigene.filter((p) => !p.traktandumId || !punkte.some((t) => t.id === p.traktandumId)),
    offenAusFrueheren: frueher.filter((p) => p.status !== "erledigt"),
    erledigtSeitLetzter: frueher.filter((p) => p.status === "erledigt" && (!seit || (p.erledigtAm && p.erledigtAm > seit))),
  });
}

// Sitzung ändern (Datum, Zeit, Ort, Notizen, Leitung, Protokollführung, Anwesende).
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if (isResponse(auth)) return auth;
  const id = Number((await params).id);
  if (!id) return Response.json({ error: "Ungültige ID" }, { status: 400 });
  const body = await request.json().catch(() => ({}));

  const patch: Partial<{ datum: string; startzeit: string; ort: string; protokoll: string; sitzungsleitung: string; protokollfuehrung: string }> = {};
  if (body?.datum !== undefined) {
    const datum = String(body.datum).trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(datum)) return Response.json({ error: "Datum als YYYY-MM-DD" }, { status: 400 });
    patch.datum = datum;
  }
  if (body?.startzeit !== undefined) {
    const zeit = String(body.startzeit).trim();
    if (zeit && !/^\d{2}:\d{2}$/.test(zeit)) return Response.json({ error: "Zeit als HH:MM" }, { status: 400 });
    patch.startzeit = zeit;
  }
  if (body?.ort !== undefined) patch.ort = String(body.ort).trim();
  if (body?.protokoll !== undefined) patch.protokoll = String(body.protokoll);
  if (body?.sitzungsleitung !== undefined) patch.sitzungsleitung = String(body.sitzungsleitung).trim();
  if (body?.protokollfuehrung !== undefined) patch.protokollfuehrung = String(body.protokollfuehrung).trim();
  const anwesendIds = Array.isArray(body?.anwesendIds) ? body.anwesendIds.map(Number).filter(Boolean) : null;
  if (Object.keys(patch).length === 0 && !anwesendIds) return Response.json({ error: "Nichts zu ändern" }, { status: 400 });

  const db = getDb();
  if (Object.keys(patch).length > 0) await db.update(sitzungen).set(patch).where(eq(sitzungen.id, id));
  if (anwesendIds) {
    await db.delete(sitzungAnwesende).where(eq(sitzungAnwesende.sitzungId, id));
    if (anwesendIds.length) await db.insert(sitzungAnwesende).values(anwesendIds.map((userId: number) => ({ sitzungId: id, userId }))).onConflictDoNothing();
  }
  return Response.json({ ok: true });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if (isResponse(auth)) return auth;
  const id = Number((await params).id);
  if (!id) return Response.json({ error: "Ungültige ID" }, { status: 400 });
  await getDb().delete(sitzungen).where(eq(sitzungen.id, id));
  return Response.json({ ok: true });
}
