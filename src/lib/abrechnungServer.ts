// Server-Helfer der Abrechnung: Daten laden, Gagen aus Acts,
// sonstige Ausgaben aus der Ausgaben-Erfassung (Finanzen).
import { asc, eq, inArray, isNull, and } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { abrechnungen, acts, expenses, ressorts, users } from "@/lib/db/schema";
import { leereAbrechnung, type AbrechnungDaten } from "@/lib/abrechnung";

async function anlassRessortIds(anlassId: number) {
  const rows = await getDb().select({ id: ressorts.id }).from(ressorts).where(eq(ressorts.anlassId, anlassId));
  return rows.map((r) => r.id);
}

// Gagen aus dem Acts-Ressort (Acts mit erfasster Gage).
export async function gagenAusActs(anlassId: number) {
  const ids = await anlassRessortIds(anlassId);
  if (ids.length === 0) return [];
  const rows = await getDb()
    .select({ id: acts.id, name: acts.name, typ: acts.typ, kostenCents: acts.kostenCents })
    .from(acts)
    .where(inArray(acts.ressortId, ids))
    .orderBy(asc(acts.name));
  const funktion = (typ: string) => (typ === "dj" ? "DJ" : typ === "band" ? "Band" : "Act");
  return rows
    .filter((a) => a.kostenCents != null && a.kostenCents > 0)
    .map((a) => ({ funktion: funktion(a.typ), name: a.name, preisCents: a.kostenCents ?? 0 }));
}

// Sonstige Ausgaben = manuell erfasste Ausgaben (ohne die Act-Gagen-Automatik).
export async function sonstigeAusgaben(anlassId: number) {
  const ids = await anlassRessortIds(anlassId);
  if (ids.length === 0) return [];
  const rows = await getDb()
    .select({
      id: expenses.id,
      kategorie: expenses.kategorie,
      beschreibung: expenses.beschreibung,
      betragCents: expenses.betragCents,
      belegId: expenses.belegId,
      eigentuemer: users.name,
    })
    .from(expenses)
    .leftJoin(users, eq(users.id, expenses.userId))
    .where(and(inArray(expenses.ressortId, ids), isNull(expenses.actId)))
    .orderBy(asc(expenses.createdAt));
  return rows.map((r) => ({
    art: r.beschreibung || r.kategorie,
    eigentuemer: r.eigentuemer ?? "",
    preisCents: r.betragCents,
    belegId: r.belegId,
  }));
}

function parseListe<T>(json: string, fallback: T[]): T[] {
  try {
    const v = JSON.parse(json);
    return Array.isArray(v) ? v : fallback;
  } catch {
    return fallback;
  }
}

export async function ladeDaten(anlassId: number): Promise<AbrechnungDaten> {
  const leer = leereAbrechnung();
  const rows = await getDb().select().from(abrechnungen).where(eq(abrechnungen.anlassId, anlassId)).limit(1);
  const a = rows[0];
  if (!a) return leer;
  return {
    barAnfangCents: a.barAnfangCents,
    barEndCents: a.barEndCents,
    akAnfangCents: a.akAnfangCents,
    akEndCents: a.akEndCents,
    akKartenCents: a.akKartenCents,
    kartenTotalCents: a.kartenTotalCents,
    twintCents: a.twintCents,
    eintritteVvk: parseListe(a.eintritteVvk, leer.eintritteVvk),
    eintritteAk: parseListe(a.eintritteAk, leer.eintritteAk),
    miete: parseListe(a.miete, []),
    gagenManuell: parseListe(a.gagenManuell, []),
  };
}
