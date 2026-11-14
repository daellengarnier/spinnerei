import { eq } from "drizzle-orm";
import { requireUser, isResponse } from "@/lib/auth";
import { getDb } from "@/lib/db/client";
import { vorlagePunkte } from "@/lib/db/schema";

export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if (isResponse(auth)) return auth;
  const { id } = await ctx.params;
  const body = await request.json().catch(() => ({}));
  const patch: Partial<typeof vorlagePunkte.$inferInsert> = {};
  if (body?.titel !== undefined) {
    const titel = String(body.titel).trim();
    if (!titel) return Response.json({ error: "Titel erforderlich" }, { status: 400 });
    patch.titel = titel;
  }
  if (body?.beschreibung !== undefined) patch.beschreibung = String(body.beschreibung);
  if (body?.reihenfolge !== undefined) patch.reihenfolge = Number(body.reihenfolge) || 0;
  if (Object.keys(patch).length > 0) {
    await getDb().update(vorlagePunkte).set(patch).where(eq(vorlagePunkte.id, Number(id)));
  }
  return Response.json({ ok: true });
}

export async function DELETE(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if (isResponse(auth)) return auth;
  const { id } = await ctx.params;
  await getDb().delete(vorlagePunkte).where(eq(vorlagePunkte.id, Number(id)));
  return Response.json({ ok: true });
}
