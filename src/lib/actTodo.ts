// Übernachtung bei einem Act angeklickt → automatisch ein Todo
// „Gästezimmer organisieren" im selben Ressort (einmalig pro Act).
import { and, eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { todos } from "@/lib/db/schema";

export async function gaestezimmerTodo(ressortId: number, actName: string, userId: number) {
  const titel = `Gästezimmer für ${actName || "Act"} organisieren`;
  const db = getDb();
  const vorhanden = await db
    .select({ id: todos.id })
    .from(todos)
    .where(and(eq(todos.ressortId, ressortId), eq(todos.titel, titel)))
    .limit(1);
  if (vorhanden[0]) return;
  await db.insert(todos).values({
    ressortId,
    titel,
    beschreibung: "Automatisch erstellt: Der Act benötigt eine Übernachtung.",
    erstelltVon: userId,
  });
}
