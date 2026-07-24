// Erinnerungen an die Abendverantwortung: 30 und 14 Tage vor dem Anlass
// eine Nachfrage per Inbox + Push, ob alles läuft. Dedupe über die
// Inbox-Einträge (pro Anlass, Person und Vorlauf genau einmal).
import "server-only";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { activityItems, anlaesse } from "@/lib/db/schema";
import { notifyMany } from "@/lib/notify";
import { formatDatumKurz, heutePlusTage } from "@/lib/datum";

const VORLAEUFE = [
  { tage: 30, label: "einem Monat" },
  { tage: 14, label: "zwei Wochen" },
];

export async function avReminderCheck(): Promise<void> {
  const db = getDb();
  for (const vorlauf of VORLAEUFE) {
    const zielDatum = heutePlusTage(vorlauf.tage);
    const faellige = await db.select().from(anlaesse).where(eq(anlaesse.datum, zielDatum));
    for (const anlass of faellige) {
      const avId = anlass.abendverantwortungUserId;
      if (!avId) continue;
      const text = `Du bist AV: In ${vorlauf.label} (${formatDatumKurz(anlass.datum)}) ist «${anlass.name}» — läuft alles?`;
      // Schon erinnert? (gleicher Text an dieselbe Person zum selben Anlass)
      const schon = await db
        .select({ id: activityItems.id })
        .from(activityItems)
        .where(
          and(
            eq(activityItems.userId, avId),
            eq(activityItems.typ, "av_check"),
            eq(activityItems.refTyp, "anlass"),
            eq(activityItems.refId, anlass.id),
            eq(activityItems.text, text),
          ),
        )
        .limit(1);
      if (schon[0]) continue;
      await notifyMany([
        {
          userId: avId,
          actorUserId: null,
          typ: "av_check",
          text,
          refTyp: "anlass",
          refId: anlass.id,
        },
      ]);
      console.log(`[av-reminder] Erinnerung (${vorlauf.tage} Tage) für «${anlass.name}» an User ${avId} gesendet.`);
    }
  }
}
