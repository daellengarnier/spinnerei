import { eq } from "drizzle-orm";
import { requireAdmin, isResponse } from "@/lib/auth";
import { getDb } from "@/lib/db/client";
import { checklisteVorlage } from "@/lib/db/schema";

// Vorlage ändern wirkt nur auf Anlässe, die die Checkliste danach übernehmen.
export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (isResponse(auth)) return auth;
  const id = Number((await ctx.params).id);
  const body = await request.json().catch(() => ({}));
  const patch: Partial<typeof checklisteVorlage.$inferInsert> = {};
  if (body?.titel !== undefined) {
    const titel = String(body.titel).trim();
    if (!titel) return Response.json({ error: "Titel erforderlich" }, { status: 400 });
    patch.titel = titel;
  }
  if (body?.beschreibung !== undefined) patch.beschreibung = String(body.beschreibung);
  if (!Object.keys(patch).length) return Response.json({ error: "Nichts zu ändern" }, { status: 400 });
  patch.updatedAt = new Date();
  const rows = await getDb().update(checklisteVorlage).set(patch).where(eq(checklisteVorlage.id, id)).returning({ id: checklisteVorlage.id });
  if (!rows[0]) return Response.json({ error: "Punkt nicht gefunden" }, { status: 404 });
  return Response.json({ ok: true });
}

export async function DELETE(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (isResponse(auth)) return auth;
  const id = Number((await ctx.params).id);
  await getDb().delete(checklisteVorlage).where(eq(checklisteVorlage.id, id));
  return Response.json({ ok: true });
}
