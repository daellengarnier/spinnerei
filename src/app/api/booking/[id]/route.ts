import { eq } from "drizzle-orm";
import { requireUser, isResponse } from "@/lib/auth";
import { getDb } from "@/lib/db/client";
import { bookingAnfragen } from "@/lib/db/schema";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if (isResponse(auth)) return auth;
  const id = Number((await params).id);
  if (!id) return Response.json({ error: "Ungültige ID" }, { status: 400 });
  await getDb().delete(bookingAnfragen).where(eq(bookingAnfragen.id, id));
  return Response.json({ ok: true });
}
