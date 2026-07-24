import { eq } from "drizzle-orm";
import { requireUser, requireAdmin, isResponse } from "@/lib/auth";
import { getDb } from "@/lib/db/client";
import { anlaesse } from "@/lib/db/schema";

// Einzelner Anlass (für Header/Kontext im Frontend).
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if (isResponse(auth)) return auth;
  const id = Number((await params).id);
  if (!id) return Response.json({ error: "Ungültige ID" }, { status: 400 });
  const rows = await getDb().select().from(anlaesse).where(eq(anlaesse.id, id)).limit(1);
  if (!rows[0]) return Response.json({ error: "Anlass nicht gefunden" }, { status: 404 });
  return Response.json({ anlass: rows[0] });
}

// Admin: Anlass umbenennen / Datum ändern.
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (isResponse(auth)) return auth;
  const id = Number((await params).id);
  if (!id) return Response.json({ error: "Ungültige ID" }, { status: 400 });
  const body = await request.json().catch(() => ({}));
  const patch: Partial<{ name: string; datum: string }> = {};
  if (body?.name !== undefined) {
    const name = String(body.name).trim();
    if (!name) return Response.json({ error: "Name darf nicht leer sein" }, { status: 400 });
    patch.name = name;
  }
  if (body?.datum !== undefined) {
    const datum = String(body.datum).trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(datum)) return Response.json({ error: "Datum als YYYY-MM-DD" }, { status: 400 });
    patch.datum = datum;
  }
  if (Object.keys(patch).length === 0) return Response.json({ error: "Nichts zu ändern" }, { status: 400 });
  await getDb().update(anlaesse).set(patch).where(eq(anlaesse.id, id));
  return Response.json({ ok: true });
}

// Admin: Anlass samt Inhalt löschen.
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (isResponse(auth)) return auth;
  const id = Number((await params).id);
  if (!id) return Response.json({ error: "Ungültige ID" }, { status: 400 });
  await getDb().delete(anlaesse).where(eq(anlaesse.id, id));
  return Response.json({ ok: true });
}
