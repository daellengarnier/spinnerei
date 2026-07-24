import { requireUser, isResponse } from "@/lib/auth";
import { getDb } from "@/lib/db/client";
import { bookingVotes } from "@/lib/db/schema";
import type { Verfuegbarkeit } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

const WERTE: Verfuegbarkeit[] = ["ja", "vielleicht", "nein"];

// Eigene Stimme abgeben/ändern; gleicher Wert nochmals = Stimme zurückziehen.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if (isResponse(auth)) return auth;
  const anfrageId = Number((await params).id);
  if (!anfrageId) return Response.json({ error: "Ungültige ID" }, { status: 400 });
  const body = await request.json().catch(() => ({}));
  const wert = body?.wert as Verfuegbarkeit;
  if (!WERTE.includes(wert)) return Response.json({ error: "wert: ja, vielleicht oder nein" }, { status: 400 });

  const db = getDb();
  const bestehend = await db
    .select({ id: bookingVotes.id, wert: bookingVotes.wert })
    .from(bookingVotes)
    .where(and(eq(bookingVotes.anfrageId, anfrageId), eq(bookingVotes.userId, auth.id)))
    .limit(1);

  if (bestehend[0]?.wert === wert) {
    await db.delete(bookingVotes).where(eq(bookingVotes.id, bestehend[0].id));
  } else {
    await db
      .insert(bookingVotes)
      .values({ anfrageId, userId: auth.id, wert })
      .onConflictDoUpdate({ target: [bookingVotes.anfrageId, bookingVotes.userId], set: { wert } });
  }
  return Response.json({ ok: true });
}
