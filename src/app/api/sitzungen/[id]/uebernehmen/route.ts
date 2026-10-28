import { and, asc, eq, gte, ne } from "drizzle-orm";
import { requireUser, isResponse } from "@/lib/auth";
import { getDb } from "@/lib/db/client";
import { sitzungen, traktanden } from "@/lib/db/schema";
import { heutePlusTage } from "@/lib/datum";

// Nicht behandelte Traktanden einer Sitzung in die nächste geplante Sitzung
// desselben Ressorts verschieben (das Protokoll bleibt bei der alten Sitzung).
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if (isResponse(auth)) return auth;
  const id = Number((await params).id);
  if (!id) return Response.json({ error: "Ungültige ID" }, { status: 400 });
  const db = getDb();

  const quelle = (await db.select().from(sitzungen).where(eq(sitzungen.id, id)).limit(1))[0];
  if (!quelle) return Response.json({ error: "Sitzung nicht gefunden" }, { status: 404 });

  const ziel = (
    await db
      .select({ id: sitzungen.id })
      .from(sitzungen)
      .where(and(eq(sitzungen.ressortId, quelle.ressortId), ne(sitzungen.id, id), gte(sitzungen.datum, heutePlusTage(0))))
      .orderBy(asc(sitzungen.datum), asc(sitzungen.startzeit))
      .limit(1)
  )[0];
  if (!ziel) return Response.json({ error: "Keine nächste Sitzung geplant" }, { status: 409 });

  const verschoben = await db
    .update(traktanden)
    .set({ sitzungId: ziel.id })
    .where(and(eq(traktanden.sitzungId, id), eq(traktanden.erledigt, false)))
    .returning({ id: traktanden.id });
  return Response.json({ ok: true, verschoben: verschoben.length, zielSitzungId: ziel.id });
}
