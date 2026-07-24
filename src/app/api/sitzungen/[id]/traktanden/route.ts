import { requireUser, isResponse } from "@/lib/auth";
import { getDb } from "@/lib/db/client";
import { traktanden } from "@/lib/db/schema";

// Traktandum zu einer Sitzung hinzufügen.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if (isResponse(auth)) return auth;
  const sitzungId = Number((await params).id);
  if (!sitzungId) return Response.json({ error: "Ungültige ID" }, { status: 400 });
  const body = await request.json().catch(() => ({}));
  const text = String(body?.text ?? "").trim();
  if (!text) return Response.json({ error: "Text erforderlich" }, { status: 400 });

  const inserted = await getDb()
    .insert(traktanden)
    .values({ sitzungId, text, erstelltVon: auth.id })
    .returning({ id: traktanden.id });
  return Response.json({ id: inserted[0].id }, { status: 201 });
}
