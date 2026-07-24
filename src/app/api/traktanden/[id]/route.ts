import { eq } from "drizzle-orm";
import { requireUser, isResponse } from "@/lib/auth";
import { getDb } from "@/lib/db/client";
import { traktanden } from "@/lib/db/schema";

// Traktandum abhaken / Text ändern.
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if (isResponse(auth)) return auth;
  const id = Number((await params).id);
  if (!id) return Response.json({ error: "Ungültige ID" }, { status: 400 });
  const body = await request.json().catch(() => ({}));

  const patch: Partial<{ erledigt: boolean; text: string }> = {};
  if (body?.erledigt !== undefined) patch.erledigt = !!body.erledigt;
  if (body?.text !== undefined) {
    const text = String(body.text).trim();
    if (!text) return Response.json({ error: "Text darf nicht leer sein" }, { status: 400 });
    patch.text = text;
  }
  if (Object.keys(patch).length === 0) return Response.json({ error: "Nichts zu ändern" }, { status: 400 });

  await getDb().update(traktanden).set(patch).where(eq(traktanden.id, id));
  return Response.json({ ok: true });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if (isResponse(auth)) return auth;
  const id = Number((await params).id);
  if (!id) return Response.json({ error: "Ungültige ID" }, { status: 400 });
  await getDb().delete(traktanden).where(eq(traktanden.id, id));
  return Response.json({ ok: true });
}
