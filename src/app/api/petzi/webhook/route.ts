import { createHmac, timingSafeEqual } from "node:crypto";
import { getDb } from "@/lib/db/client";
import { petziTickets } from "@/lib/db/schema";

// Petzi-Webhook: Petzi meldet jedes generierte Ticket an diese URL.
// Authentifizierung über die Petzi-Signature (HMAC-SHA256 mit gemeinsamem
// Secret über "timestamp.body"), kein Login — der Endpoint ist öffentlich.

interface PetziPayload {
  event?: string;
  details?: {
    ticket?: {
      number?: string;
      title?: string;
      event?: string;
      eventId?: number | string;
      category?: string;
      cancellationReason?: string;
      price?: { amount?: string; currency?: string };
    };
  };
}

function signaturGueltig(header: string | null, body: string, secret: string): boolean {
  if (!header) return false;
  const teile = Object.fromEntries(header.split(",").map((p) => p.split("=") as [string, string]));
  const t = teile.t;
  const v1 = teile.v1;
  if (!t || !v1) return false;
  // Replay-Schutz: Meldung darf nicht älter als 10 Minuten sein.
  const alter = Math.abs(Date.now() / 1000 - Number(t));
  if (!Number.isFinite(alter) || alter > 600) return false;
  const erwartet = createHmac("sha256", secret).update(`${t}.${body}`).digest("hex");
  const a = Buffer.from(erwartet, "utf8");
  const b = Buffer.from(v1, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  const secret = process.env.PETZI_WEBHOOK_SECRET ?? "";
  if (!secret) return Response.json({ error: "Webhook nicht konfiguriert" }, { status: 503 });

  const body = await request.text();
  if (!signaturGueltig(request.headers.get("Petzi-Signature"), body, secret)) {
    return Response.json({ error: "Ungültige Signatur" }, { status: 401 });
  }

  let payload: PetziPayload;
  try {
    payload = JSON.parse(body) as PetziPayload;
  } catch {
    return Response.json({ error: "Ungültiges JSON" }, { status: 400 });
  }

  const ticket = payload.details?.ticket;
  const nummer = String(ticket?.number ?? "").trim();
  if (!nummer) return Response.json({ ok: true, ignoriert: "kein Ticket" });

  const eventId = Number(ticket?.eventId) || null;
  const kategorie = String(ticket?.category ?? "").trim();
  const eventTitel = String(ticket?.event ?? ticket?.title ?? "").trim();
  const betrag = Number.parseFloat(String(ticket?.price?.amount ?? ""));
  const betragCents = Number.isFinite(betrag) ? Math.round(betrag * 100) : null;
  const storniert = !!String(ticket?.cancellationReason ?? "").trim();

  // Ein Eintrag pro Ticketnummer — Petzi-Retries und Stornos aktualisieren ihn.
  await getDb()
    .insert(petziTickets)
    .values({ ticketNumber: nummer, eventId, eventTitel, kategorie, betragCents, storniert })
    .onConflictDoUpdate({
      target: petziTickets.ticketNumber,
      set: { eventId, eventTitel, kategorie, betragCents, storniert },
    });

  return Response.json({ ok: true });
}
