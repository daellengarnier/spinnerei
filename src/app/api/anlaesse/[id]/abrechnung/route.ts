import { eq } from "drizzle-orm";
import { requireUser, isResponse } from "@/lib/auth";
import { getDb } from "@/lib/db/client";
import { abrechnungen, anlaesse } from "@/lib/db/schema";
import { gagenAusActs, ladeDaten, sonstigeAusgaben } from "@/lib/abrechnungServer";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if (isResponse(auth)) return auth;
  const anlassId = Number((await params).id);
  if (!anlassId) return Response.json({ error: "Ungültige ID" }, { status: 400 });
  const anlass = await getDb().select().from(anlaesse).where(eq(anlaesse.id, anlassId)).limit(1);
  if (!anlass[0]) return Response.json({ error: "Anlass nicht gefunden" }, { status: 404 });

  return Response.json({
    daten: await ladeDaten(anlassId),
    gagenActs: await gagenAusActs(anlassId),
    sonstige: await sonstigeAusgaben(anlassId),
  });
}

const CENT_FELDER = [
  "barAnfangCents",
  "barEndCents",
  "akAnfangCents",
  "akEndCents",
  "akKartenCents",
  "kartenTotalCents",
  "twintCents",
] as const;

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if (isResponse(auth)) return auth;
  const anlassId = Number((await params).id);
  if (!anlassId) return Response.json({ error: "Ungültige ID" }, { status: 400 });
  const body = await request.json().catch(() => ({}));

  const cent = (v: unknown): number | null => {
    if (v === null || v === undefined || v === "") return null;
    const num = Number(v);
    return Number.isFinite(num) ? Math.round(num) : null;
  };

  const werte: Record<string, unknown> = {};
  for (const feld of CENT_FELDER) {
    if (body?.[feld] !== undefined) werte[feld] = cent(body[feld]);
  }
  const stufen = (v: unknown) =>
    JSON.stringify(
      (Array.isArray(v) ? v : []).map((e) => ({
        preisCents: Math.max(0, Math.round(Number((e as { preisCents?: unknown })?.preisCents) || 0)),
        anzahl: Math.max(0, Math.round(Number((e as { anzahl?: unknown })?.anzahl) || 0)),
      })),
    );
  if (body?.eintritteVvk !== undefined) werte.eintritteVvk = stufen(body.eintritteVvk);
  if (body?.eintritteAk !== undefined) werte.eintritteAk = stufen(body.eintritteAk);
  if (body?.miete !== undefined)
    werte.miete = JSON.stringify(
      (Array.isArray(body.miete) ? (body.miete as unknown[]) : []).map((m) => ({
        art: String((m as { art?: unknown })?.art ?? "").slice(0, 200),
        preisCents: Math.round(Number((m as { preisCents?: unknown })?.preisCents) || 0),
      })),
    );
  if (body?.gagenManuell !== undefined)
    werte.gagenManuell = JSON.stringify(
      (Array.isArray(body.gagenManuell) ? (body.gagenManuell as unknown[]) : []).map((g) => ({
        funktion: String((g as { funktion?: unknown })?.funktion ?? "").slice(0, 200),
        name: String((g as { name?: unknown })?.name ?? "").slice(0, 200),
        preisCents: Math.round(Number((g as { preisCents?: unknown })?.preisCents) || 0),
      })),
    );

  if (Object.keys(werte).length === 0) return Response.json({ error: "Nichts zu ändern" }, { status: 400 });
  werte.updatedAt = new Date();

  await getDb()
    .insert(abrechnungen)
    .values({ anlassId, ...werte })
    .onConflictDoUpdate({ target: abrechnungen.anlassId, set: werte });
  return Response.json({ ok: true });
}
