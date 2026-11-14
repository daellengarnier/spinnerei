import { asc, max } from "drizzle-orm";
import { requireUser, isResponse } from "@/lib/auth";
import { getDb } from "@/lib/db/client";
import { vorlagePunkte } from "@/lib/db/schema";

// Checkliste Putzen & Vorbereitung: lesen und pflegen dürfen alle Mitglieder.
export async function GET() {
  const auth = await requireUser();
  if (isResponse(auth)) return auth;
  const punkte = await getDb()
    .select({ id: vorlagePunkte.id, titel: vorlagePunkte.titel, beschreibung: vorlagePunkte.beschreibung, reihenfolge: vorlagePunkte.reihenfolge })
    .from(vorlagePunkte)
    .orderBy(asc(vorlagePunkte.reihenfolge), asc(vorlagePunkte.id));
  return Response.json({ punkte });
}

export async function POST(request: Request) {
  const auth = await requireUser();
  if (isResponse(auth)) return auth;
  const body = await request.json().catch(() => ({}));
  const titel = String(body?.titel ?? "").trim();
  if (!titel) return Response.json({ error: "Titel erforderlich" }, { status: 400 });
  const db = getDb();
  const maxRow = await db.select({ m: max(vorlagePunkte.reihenfolge) }).from(vorlagePunkte);
  const inserted = await db
    .insert(vorlagePunkte)
    .values({ titel, beschreibung: String(body?.beschreibung ?? ""), reihenfolge: (maxRow[0].m ?? 0) + 1 })
    .returning({ id: vorlagePunkte.id });
  return Response.json({ id: inserted[0].id }, { status: 201 });
}
