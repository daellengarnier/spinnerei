import { asc } from "drizzle-orm";
import { requireUser, requireAdmin, isResponse } from "@/lib/auth";
import { getDb } from "@/lib/db/client";
import { checklisteVorlage } from "@/lib/db/schema";
import { istPhase, naechsteReihenfolge } from "@/lib/checkliste";

// Vorlage der Standard-Checkliste. Lesen alle, ändern nur Admins.
export async function GET() {
  const auth = await requireUser();
  if (isResponse(auth)) return auth;
  const punkte = await getDb()
    .select()
    .from(checklisteVorlage)
    .orderBy(asc(checklisteVorlage.reihenfolge), asc(checklisteVorlage.id));
  return Response.json({ punkte });
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (isResponse(auth)) return auth;
  const body = await request.json().catch(() => ({}));
  const titel = String(body?.titel ?? "").trim();
  const gruppe = String(body?.gruppe ?? "").trim();
  if (!titel || !gruppe || !istPhase(body?.phase)) {
    return Response.json({ error: "Titel, Gruppe und Phase erforderlich" }, { status: 400 });
  }
  const reihenfolge = await naechsteReihenfolge(checklisteVorlage, body.phase, gruppe);
  const rows = await getDb()
    .insert(checklisteVorlage)
    .values({ phase: body.phase, gruppe, titel, beschreibung: String(body?.beschreibung ?? ""), reihenfolge })
    .returning();
  return Response.json({ punkt: rows[0] }, { status: 201 });
}
