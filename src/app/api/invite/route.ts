import { eq } from "drizzle-orm";
import { requireUser, isResponse } from "@/lib/auth";
import { getDb } from "@/lib/db/client";
import { appSettings } from "@/lib/db/schema";

const KEY = "invite_text";

export const DEFAULT_INVITE = `Komm in die Orga-App der Spinnerei! 🎉

Hier organisieren wir alle Anlässe der Spinnerei Felsenau – Todos, Sitzungen, Einkauf und mehr.

Registrieren: https://spinnerei.al-daellen.ch/register`;

// Einladungstext (SMS/WhatsApp). Lesen & Bearbeiten für alle Mitglieder.
export async function GET() {
  const auth = await requireUser();
  if (isResponse(auth)) return auth;
  const rows = await getDb().select().from(appSettings).where(eq(appSettings.key, KEY)).limit(1);
  return Response.json({ text: rows[0]?.value || DEFAULT_INVITE });
}

export async function PUT(request: Request) {
  const auth = await requireUser();
  if (isResponse(auth)) return auth;
  const body = await request.json().catch(() => ({}));
  const text = String(body?.text ?? "").trim();
  if (!text) return Response.json({ error: "Text erforderlich" }, { status: 400 });
  await getDb()
    .insert(appSettings)
    .values({ key: KEY, value: text })
    .onConflictDoUpdate({ target: appSettings.key, set: { value: text, updatedAt: new Date() } });
  return Response.json({ ok: true });
}
