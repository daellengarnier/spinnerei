import { and, asc, eq, isNull } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { todos, vorlagePunkte } from "@/lib/db/schema";

// Übernimmt die Checkliste Putzen & Vorbereitung als Todos ins Ressort.
// Punkte, die dort schon als Todo (gleicher Titel, ohne Sub-Ressort) stehen, werden übersprungen.
export async function vorlageInRessort(ressortId: number, userId: number | null): Promise<number> {
  const db = getDb();
  const punkte = await db.select().from(vorlagePunkte).orderBy(asc(vorlagePunkte.reihenfolge), asc(vorlagePunkte.id));
  if (punkte.length === 0) return 0;
  const vorhanden = await db
    .select({ titel: todos.titel })
    .from(todos)
    .where(and(eq(todos.ressortId, ressortId), isNull(todos.subRessortId)));
  const titel = new Set(vorhanden.map((t) => t.titel.trim().toLowerCase()));
  const neu = punkte.filter((p) => !titel.has(p.titel.trim().toLowerCase()));
  if (neu.length === 0) return 0;
  await db.insert(todos).values(
    neu.map((p) => ({ ressortId, titel: p.titel, beschreibung: p.beschreibung, erstelltVon: userId })),
  );
  return neu.length;
}
