import { asc, inArray } from "drizzle-orm";
import { requireUser, isResponse } from "@/lib/auth";
import { getDb } from "@/lib/db/client";
import { acts, anlaesse, ressorts } from "@/lib/db/schema";

// Saison-Übersicht: alle Anlässe mit Eckdaten (Datum, Art, Zeiten, Petzilink)
// und ihren Acts (Genre, Herkunft, Showtime) — alles automatisch aus den
// Anlässen zusammengezogen.
export async function GET() {
  const auth = await requireUser();
  if (isResponse(auth)) return auth;
  const db = getDb();

  const alleAnlaesse = await db.select().from(anlaesse).orderBy(asc(anlaesse.datum));
  const alleRessorts = alleAnlaesse.length
    ? await db
        .select({ id: ressorts.id, anlassId: ressorts.anlassId })
        .from(ressorts)
        .where(inArray(ressorts.anlassId, alleAnlaesse.map((a) => a.id)))
    : [];
  const ressortZuAnlass = new Map(alleRessorts.map((r) => [r.id, r.anlassId]));
  const alleActs = alleRessorts.length
    ? await db
        .select({
          ressortId: acts.ressortId,
          name: acts.name,
          typ: acts.typ,
          genre: acts.genre,
          herkunft: acts.herkunft,
          showtime: acts.showtime,
        })
        .from(acts)
        .where(inArray(acts.ressortId, alleRessorts.map((r) => r.id)))
        .orderBy(asc(acts.showtime), asc(acts.name))
    : [];

  const actsProAnlass = new Map<number, typeof alleActs>();
  for (const act of alleActs) {
    const anlassId = ressortZuAnlass.get(act.ressortId);
    if (anlassId == null) continue;
    const liste = actsProAnlass.get(anlassId) ?? [];
    liste.push(act);
    actsProAnlass.set(anlassId, liste);
  }

  return Response.json({
    anlaesse: alleAnlaesse.map((a) => ({
      id: a.id,
      name: a.name,
      datum: a.datum,
      art: a.art,
      tueroeffnung: a.tueroeffnung,
      essen: a.essen,
      ende: a.ende,
      petzilink: a.petzilink,
      acts: (actsProAnlass.get(a.id) ?? []).map((x) => ({
        name: x.name,
        typ: x.typ,
        genre: x.genre,
        herkunft: x.herkunft,
        showtime: x.showtime,
      })),
    })),
  });
}
