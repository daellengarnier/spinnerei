import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { requireUser, isResponse } from "@/lib/auth";
import { getDb } from "@/lib/db/client";
import { anlaesse } from "@/lib/db/schema";

// Teilbaren Ablauf/Rider-Link für externe Ton-/Technik-Leute erzeugen.
// Der Token bleibt stabil (gleicher Link bei erneutem Teilen).
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if (isResponse(auth)) return auth;
  const id = Number((await params).id);
  if (!id) return Response.json({ error: "Ungültige ID" }, { status: 400 });

  const db = getDb();
  const rows = await db.select({ shareToken: anlaesse.shareToken }).from(anlaesse).where(eq(anlaesse.id, id)).limit(1);
  if (!rows[0]) return Response.json({ error: "Anlass nicht gefunden" }, { status: 404 });

  let token = rows[0].shareToken;
  if (!token) {
    token = randomBytes(18).toString("base64url");
    await db.update(anlaesse).set({ shareToken: token }).where(eq(anlaesse.id, id));
  }

  // Öffentliche URL hinter dem Reverse-Proxy korrekt zusammensetzen.
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "spinnerei.al-daellen.ch";
  const proto = request.headers.get("x-forwarded-proto") ?? "https";
  return Response.json({ url: `${proto}://${host}/share/${token}` });
}
