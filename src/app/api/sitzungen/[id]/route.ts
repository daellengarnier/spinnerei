import { eq } from "drizzle-orm";
import { requireUser, isResponse } from "@/lib/auth";
import { getDb } from "@/lib/db/client";
import { sitzungen } from "@/lib/db/schema";

// Sitzung ändern (Datum, Zeit, Ort).
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if (isResponse(auth)) return auth;
  const id = Number((await params).id);
  if (!id) return Response.json({ error: "Ungültige ID" }, { status: 400 });
  const body = await request.json().catch(() => ({}));

  const patch: Partial<{ datum: string; startzeit: string; ort: string }> = {};
  if (body?.datum !== undefined) {
    const datum = String(body.datum).trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(datum)) return Response.json({ error: "Datum als YYYY-MM-DD" }, { status: 400 });
    patch.datum = datum;
  }
  if (body?.startzeit !== undefined) {
    const zeit = String(body.startzeit).trim();
    if (zeit && !/^\d{2}:\d{2}$/.test(zeit)) return Response.json({ error: "Zeit als HH:MM" }, { status: 400 });
    patch.startzeit = zeit;
  }
  if (body?.ort !== undefined) patch.ort = String(body.ort).trim();
  if (Object.keys(patch).length === 0) return Response.json({ error: "Nichts zu ändern" }, { status: 400 });

  await getDb().update(sitzungen).set(patch).where(eq(sitzungen.id, id));
  return Response.json({ ok: true });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if (isResponse(auth)) return auth;
  const id = Number((await params).id);
  if (!id) return Response.json({ error: "Ungültige ID" }, { status: 400 });
  await getDb().delete(sitzungen).where(eq(sitzungen.id, id));
  return Response.json({ ok: true });
}
