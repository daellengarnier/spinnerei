import { count, eq } from "drizzle-orm";
import { requireUser, isResponse } from "@/lib/auth";
import { getDb } from "@/lib/db/client";
import { anlaesse, checklistePunkte } from "@/lib/db/schema";
import { checklisteAusVorlage, checklisteVonAnlass, istPhase, naechsteReihenfolge } from "@/lib/checkliste";

// Checkliste eines Anlasses (Vorbereitung und Nachbereitung).
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if (isResponse(auth)) return auth;
  const anlassId = Number((await params).id);
  if (!anlassId) return Response.json({ error: "Ungültige ID" }, { status: 400 });
  return Response.json({ punkte: await checklisteVonAnlass(anlassId) });
}

// { ausVorlage: true } übernimmt die Standard-Checkliste (nur wenn noch leer),
// sonst { phase, gruppe, titel, beschreibung? } ergänzt einen eigenen Punkt.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if (isResponse(auth)) return auth;
  const anlassId = Number((await params).id);
  const db = getDb();
  const anlass = await db.select({ id: anlaesse.id }).from(anlaesse).where(eq(anlaesse.id, anlassId)).limit(1);
  if (!anlass[0]) return Response.json({ error: "Anlass nicht gefunden" }, { status: 404 });
  const body = await request.json().catch(() => ({}));

  if (body?.ausVorlage) {
    const vorhanden = await db.select({ c: count() }).from(checklistePunkte).where(eq(checklistePunkte.anlassId, anlassId));
    if (vorhanden[0].c > 0) return Response.json({ error: "Dieser Anlass hat schon eine Checkliste" }, { status: 409 });
    await checklisteAusVorlage(anlassId);
    return Response.json({ punkte: await checklisteVonAnlass(anlassId) }, { status: 201 });
  }

  const titel = String(body?.titel ?? "").trim();
  const gruppe = String(body?.gruppe ?? "").trim();
  if (!titel || !gruppe || !istPhase(body?.phase)) {
    return Response.json({ error: "Titel, Gruppe und Phase erforderlich" }, { status: 400 });
  }
  const reihenfolge = await naechsteReihenfolge(checklistePunkte, body.phase, gruppe, anlassId);
  await db.insert(checklistePunkte).values({
    anlassId,
    phase: body.phase,
    gruppe,
    titel,
    beschreibung: String(body?.beschreibung ?? ""),
    reihenfolge,
    erstelltVon: auth.id,
  });
  return Response.json({ punkte: await checklisteVonAnlass(anlassId) }, { status: 201 });
}
