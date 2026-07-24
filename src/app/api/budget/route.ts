import { asc, eq } from "drizzle-orm";
import { requireUser, requireAdmin, isResponse } from "@/lib/auth";
import { getDb } from "@/lib/db/client";
import { categoryBudgets, appSettings } from "@/lib/db/schema";
import { normalizeCategory } from "@/lib/finance";

// Defizitgarantie wird pro Anlass gespeichert (Key-Suffix = Anlass-ID).
const defizitKey = (anlassId: number) => `defizitgarantie_cents:${anlassId}`;

// Budget (Plan) je Kostenstelle + Defizitgarantie (separat, nicht im Budget).
// Lesen: alle; Setzen: Admin.
export async function GET(request: Request) {
  const auth = await requireUser();
  if (isResponse(auth)) return auth;
  const anlassId = Number(new URL(request.url).searchParams.get("anlass"));
  if (!anlassId) return Response.json({ error: "anlass erforderlich" }, { status: 400 });
  const db = getDb();
  const rows = await db
    .select()
    .from(categoryBudgets)
    .where(eq(categoryBudgets.anlassId, anlassId))
    .orderBy(asc(categoryBudgets.kategorie));
  const s = await db.select().from(appSettings).where(eq(appSettings.key, defizitKey(anlassId))).limit(1);
  const defizit = s[0] ? Number(s[0].value) : 0;
  return Response.json({
    budgets: rows.map((r) => ({ kategorie: r.kategorie, betragCents: r.betragCents })),
    defizitgarantieCents: Number.isFinite(defizit) ? defizit : 0,
  });
}

export async function PUT(request: Request) {
  const auth = await requireAdmin();
  if (isResponse(auth)) return auth;
  const body = await request.json().catch(() => ({}));
  const anlassId = Number(body?.anlassId);
  if (!anlassId) return Response.json({ error: "anlassId erforderlich" }, { status: 400 });
  const db = getDb();

  // Defizitgarantie setzen.
  if (body?.defizitgarantieCents !== undefined) {
    const cents = Math.round(Number(body.defizitgarantieCents));
    if (!Number.isFinite(cents) || cents < 0) return Response.json({ error: "Ungültiger Betrag" }, { status: 400 });
    await db
      .insert(appSettings)
      .values({ key: defizitKey(anlassId), value: String(cents) })
      .onConflictDoUpdate({ target: appSettings.key, set: { value: String(cents), updatedAt: new Date() } });
    return Response.json({ ok: true });
  }

  // Budget einer Kostenstelle setzen.
  const kategorie = normalizeCategory(body?.kategorie);
  const cents = Math.round(Number(body?.betragCents));
  if (!Number.isFinite(cents) || cents < 0) return Response.json({ error: "Ungültiger Betrag" }, { status: 400 });
  await db
    .insert(categoryBudgets)
    .values({ anlassId, kategorie, betragCents: cents })
    .onConflictDoUpdate({
      target: [categoryBudgets.anlassId, categoryBudgets.kategorie],
      set: { betragCents: cents },
    });
  return Response.json({ ok: true });
}
