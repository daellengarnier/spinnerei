import { and, eq, max } from "drizzle-orm";
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

  const db = getDb();
  const letzte = await db.select({ m: max(traktanden.reihenfolge) }).from(traktanden).where(eq(traktanden.sitzungId, sitzungId));
  const inserted = await db
    .insert(traktanden)
    .values({ sitzungId, text, notizen: String(body?.notizen ?? ""), reihenfolge: (letzte[0].m ?? 0) + 1, erstelltVon: auth.id })
    .returning({ id: traktanden.id });
  return Response.json({ id: inserted[0].id }, { status: 201 });
}

// Reihenfolge der Traktanden setzen: { ids: [...] } in der neuen Reihenfolge.
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if (isResponse(auth)) return auth;
  const sitzungId = Number((await params).id);
  const body = await request.json().catch(() => ({}));
  const ids: number[] = Array.isArray(body?.ids) ? body.ids.map(Number).filter(Boolean) : [];
  if (!sitzungId || ids.length === 0) return Response.json({ error: "ids erforderlich" }, { status: 400 });
  const db = getDb();
  for (const [i, tid] of ids.entries()) {
    await db.update(traktanden).set({ reihenfolge: i + 1 }).where(and(eq(traktanden.id, tid), eq(traktanden.sitzungId, sitzungId)));
  }
  return Response.json({ ok: true });
}
