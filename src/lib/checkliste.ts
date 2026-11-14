// Standard-Checkliste der Anlässe (Vorbereitung und Nachbereitung im Haus).
import "server-only";
import { and, asc, eq, max } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { getDb } from "@/lib/db/client";
import { checklistePunkte, checklisteVorlage, users } from "@/lib/db/schema";
import type { ChecklistePhase } from "@/lib/db/schema";

export const PHASEN: ChecklistePhase[] = ["vorbereitung", "nachbereitung"];

export function istPhase(x: unknown): x is ChecklistePhase {
  return typeof x === "string" && (PHASEN as string[]).includes(x);
}

// Kopiert die aktuelle Vorlage in einen Anlass. Gibt die Anzahl Punkte zurück.
export async function checklisteAusVorlage(anlassId: number, erstelltVon: number | null = null): Promise<number> {
  const db = getDb();
  const vorlage = await db.select().from(checklisteVorlage).orderBy(asc(checklisteVorlage.reihenfolge), asc(checklisteVorlage.id));
  if (!vorlage.length) return 0;
  await db.insert(checklistePunkte).values(
    vorlage.map((v) => ({
      anlassId,
      phase: v.phase,
      gruppe: v.gruppe,
      titel: v.titel,
      beschreibung: v.beschreibung,
      reihenfolge: v.reihenfolge,
      erstelltVon,
    })),
  );
  return vorlage.length;
}

export async function checklisteVonAnlass(anlassId: number) {
  const uebernehmer = alias(users, "uebernehmer");
  return getDb()
    .select({
      id: checklistePunkte.id,
      phase: checklistePunkte.phase,
      gruppe: checklistePunkte.gruppe,
      titel: checklistePunkte.titel,
      beschreibung: checklistePunkte.beschreibung,
      reihenfolge: checklistePunkte.reihenfolge,
      erledigtVon: checklistePunkte.erledigtVon,
      erledigtVonName: users.name,
      erledigtAm: checklistePunkte.erledigtAm,
      uebernommenVon: checklistePunkte.uebernommenVon,
      uebernommenVonName: uebernehmer.name,
    })
    .from(checklistePunkte)
    .leftJoin(users, eq(users.id, checklistePunkte.erledigtVon))
    .leftJoin(uebernehmer, eq(uebernehmer.id, checklistePunkte.uebernommenVon))
    .where(eq(checklistePunkte.anlassId, anlassId))
    .orderBy(asc(checklistePunkte.reihenfolge), asc(checklistePunkte.id));
}

// Reihenfolge für einen neuen Punkt: ans Ende der Gruppe, oder bei einer neuen
// Gruppe ans Ende der Phase.
export async function naechsteReihenfolge(
  tabelle: typeof checklistePunkte | typeof checklisteVorlage,
  phase: ChecklistePhase,
  gruppe: string,
  anlassId?: number,
): Promise<number> {
  const db = getDb();
  const basis = anlassId !== undefined && "anlassId" in tabelle ? eq(tabelle.anlassId, anlassId) : undefined;
  const inGruppe = await db
    .select({ m: max(tabelle.reihenfolge) })
    .from(tabelle)
    .where(and(basis, eq(tabelle.phase, phase), eq(tabelle.gruppe, gruppe)));
  if (inGruppe[0]?.m !== null && inGruppe[0]?.m !== undefined) return inGruppe[0].m + 1;
  const gesamt = await db.select({ m: max(tabelle.reihenfolge) }).from(tabelle).where(and(basis, eq(tabelle.phase, phase)));
  return (gesamt[0]?.m ?? 0) + 10;
}
