import { and, asc, desc, eq, gte, inArray, isNull, lt, ne, sql } from "drizzle-orm";
import { requireUser, isResponse } from "@/lib/auth";
import { getDb } from "@/lib/db/client";
import { bookingAnfragen, bookingVotes, ressorts, sitzungen, todoAssignees, todos, traktanden, users } from "@/lib/db/schema";
import { heutePlusTage } from "@/lib/datum";

// HQ-Cockpit: das, was im Verein gerade ansteht, in einem Abruf.
// Nächste und letzte Sitzung, Booking-Stimmungsbild und offene Vereins-Todos.
export async function GET() {
  const auth = await requireUser();
  if (isResponse(auth)) return auth;
  const db = getDb();
  const heute = heutePlusTage(0);

  const hqRessorts = await db
    .select({ id: ressorts.id, name: ressorts.name, farbe: ressorts.farbe, hatSitzungen: ressorts.hatSitzungen, hatBooking: ressorts.hatBooking })
    .from(ressorts)
    .where(isNull(ressorts.anlassId))
    .orderBy(ressorts.reihenfolge, ressorts.id);
  const sitzungsRessort = hqRessorts.find((r) => r.hatSitzungen) ?? null;
  const bookingRessort = hqRessorts.find((r) => r.hatBooking) ?? null;

  // Sitzungen: die nächste mit Traktanden, die letzte mit Protokoll-Stand.
  let naechsteSitzung = null;
  let letzteSitzung = null;
  if (sitzungsRessort) {
    const naechste = (
      await db
        .select({ id: sitzungen.id, datum: sitzungen.datum, startzeit: sitzungen.startzeit, ort: sitzungen.ort })
        .from(sitzungen)
        .where(and(eq(sitzungen.ressortId, sitzungsRessort.id), gte(sitzungen.datum, heute)))
        .orderBy(asc(sitzungen.datum), asc(sitzungen.startzeit))
        .limit(1)
    )[0];
    if (naechste) {
      const punkte = await db
        .select({ id: traktanden.id, text: traktanden.text, erledigt: traktanden.erledigt, autorName: users.name })
        .from(traktanden)
        .leftJoin(users, eq(users.id, traktanden.erstelltVon))
        .where(eq(traktanden.sitzungId, naechste.id))
        .orderBy(asc(traktanden.id));
      naechsteSitzung = { ...naechste, traktanden: punkte };
    }

    const letzte = (
      await db
        .select({ id: sitzungen.id, datum: sitzungen.datum, protokoll: sitzungen.protokoll })
        .from(sitzungen)
        .where(and(eq(sitzungen.ressortId, sitzungsRessort.id), lt(sitzungen.datum, heute)))
        .orderBy(desc(sitzungen.datum), desc(sitzungen.startzeit))
        .limit(1)
    )[0];
    if (letzte) {
      const offen = await db
        .select({ c: sql<number>`count(*)::int` })
        .from(traktanden)
        .where(and(eq(traktanden.sitzungId, letzte.id), eq(traktanden.erledigt, false)));
      letzteSitzung = {
        id: letzte.id,
        datum: letzte.datum,
        hatProtokoll: letzte.protokoll.trim() !== "",
        offeneTraktanden: offen[0].c,
      };
    }
  }

  // Booking: Anfragen, zu denen ich noch keine Stimme abgegeben habe.
  let booking = null;
  if (bookingRessort) {
    const anfragen = await db
      .select({ id: bookingAnfragen.id, titel: bookingAnfragen.titel, link: bookingAnfragen.link, autorName: users.name })
      .from(bookingAnfragen)
      .leftJoin(users, eq(users.id, bookingAnfragen.erstelltVon))
      .where(eq(bookingAnfragen.ressortId, bookingRessort.id))
      .orderBy(desc(bookingAnfragen.createdAt));
    const votes = anfragen.length
      ? await db
          .select({ anfrageId: bookingVotes.anfrageId, userId: bookingVotes.userId, wert: bookingVotes.wert })
          .from(bookingVotes)
          .where(inArray(bookingVotes.anfrageId, anfragen.map((a) => a.id)))
      : [];
    const ohneMeineStimme = anfragen.filter((a) => !votes.some((v) => v.anfrageId === a.id && v.userId === auth.id));
    booking = {
      ressortId: bookingRessort.id,
      total: anfragen.length,
      offenFuerMich: ohneMeineStimme.slice(0, 5).map((a) => ({
        ...a,
        ja: votes.filter((v) => v.anfrageId === a.id && v.wert === "ja").length,
        vielleicht: votes.filter((v) => v.anfrageId === a.id && v.wert === "vielleicht").length,
        nein: votes.filter((v) => v.anfrageId === a.id && v.wert === "nein").length,
      })),
      offenFuerMichCount: ohneMeineStimme.length,
    };
  }

  // Offene Vereins-Todos (alle HQ-Ressorts): meine zuerst, dann nach Frist.
  const offeneTodos = hqRessorts.length
    ? await db
        .select({
          id: todos.id,
          titel: todos.titel,
          status: todos.status,
          fristDatum: todos.fristDatum,
          ressortId: todos.ressortId,
          ressortName: ressorts.name,
          mir: sql<boolean>`exists (select 1 from ${todoAssignees} ta where ta."todoId" = ${todos.id} and ta."userId" = ${auth.id})`,
        })
        .from(todos)
        .innerJoin(ressorts, eq(ressorts.id, todos.ressortId))
        .where(and(isNull(ressorts.anlassId), ne(todos.status, "erledigt")))
        .orderBy(sql`${todos.fristDatum} NULLS LAST`, asc(todos.id))
    : [];
  offeneTodos.sort((a, b) => Number(b.mir) - Number(a.mir));

  return Response.json({
    sitzungsRessortId: sitzungsRessort?.id ?? null,
    naechsteSitzung,
    letzteSitzung,
    booking,
    todos: { total: offeneTodos.length, mir: offeneTodos.filter((t) => t.mir).length, liste: offeneTodos.slice(0, 6) },
  });
}
