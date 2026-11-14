import { eq } from "drizzle-orm";
import { requireUser, isResponse } from "@/lib/auth";
import { getDb } from "@/lib/db/client";
import { checklistePunkte } from "@/lib/db/schema";

// Punkt abhaken ({ erledigt }) oder Titel/Beschreibung ändern.
// Abhaken speichert, wer es war und wann.
export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if (isResponse(auth)) return auth;
  const id = Number((await ctx.params).id);
  const body = await request.json().catch(() => ({}));
  const patch: Partial<typeof checklistePunkte.$inferInsert> = {};
  if (typeof body?.erledigt === "boolean") {
    patch.erledigtVon = body.erledigt ? auth.id : null;
    patch.erledigtAm = body.erledigt ? new Date() : null;
  }
  if (body?.titel !== undefined) {
    const titel = String(body.titel).trim();
    if (!titel) return Response.json({ error: "Titel erforderlich" }, { status: 400 });
    patch.titel = titel;
  }
  if (body?.beschreibung !== undefined) patch.beschreibung = String(body.beschreibung);
  if (!Object.keys(patch).length) return Response.json({ error: "Nichts zu ändern" }, { status: 400 });
  const rows = await getDb().update(checklistePunkte).set(patch).where(eq(checklistePunkte.id, id)).returning({ id: checklistePunkte.id });
  if (!rows[0]) return Response.json({ error: "Punkt nicht gefunden" }, { status: 404 });
  return Response.json({ ok: true });
}

export async function DELETE(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if (isResponse(auth)) return auth;
  const id = Number((await ctx.params).id);
  await getDb().delete(checklistePunkte).where(eq(checklistePunkte.id, id));
  return Response.json({ ok: true });
}
