import { asc, eq, inArray } from "drizzle-orm";
import { requireUser, isResponse } from "@/lib/auth";
import { getDb } from "@/lib/db/client";
import { acts, anlaesse, ressorts } from "@/lib/db/schema";
import { chfPreis, istFolgetag } from "@/lib/uiUtil";

// Anlass als Event auf kulturspinnerei.ch publizieren (The Events Calendar,
// REST-API mit Anwendungspasswort). Nur öffentliche Anlässe; es wird ein
// ENTWURF erstellt bzw. das bestehende Event aktualisiert — veröffentlicht
// wird von Hand in WordPress (dort kommt auch das Plakat dazu).

const htmlEscape = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function datumPlusTage(datum: string, tage: number): string {
  const d = new Date(`${datum}T00:00:00`);
  d.setDate(d.getDate() + tage);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if (isResponse(auth)) return auth;
  const id = Number((await params).id);
  if (!id) return Response.json({ error: "Ungültige ID" }, { status: 400 });

  const wpUrl = (process.env.WP_URL ?? "").replace(/\/$/, "");
  const wpUser = process.env.WP_USER ?? "";
  const wpPass = process.env.WP_APP_PASSWORD ?? "";
  if (!wpUrl || !wpUser || !wpPass) {
    return Response.json({ error: "WordPress-Zugang ist auf dem Server nicht konfiguriert." }, { status: 500 });
  }

  const db = getDb();
  const rows = await db.select().from(anlaesse).where(eq(anlaesse.id, id)).limit(1);
  const anlass = rows[0];
  if (!anlass) return Response.json({ error: "Anlass nicht gefunden" }, { status: 404 });
  if (anlass.zugang !== "oeffentlich") {
    return Response.json({ error: "Nur öffentliche Anlässe werden auf die Website publiziert." }, { status: 400 });
  }

  // Acts (mit Promotext) für die Event-Beschreibung einsammeln.
  const anlassRessorts = await db.select({ id: ressorts.id }).from(ressorts).where(eq(ressorts.anlassId, id));
  const anlassActs = anlassRessorts.length
    ? await db
        .select({
          name: acts.name,
          genre: acts.genre,
          herkunft: acts.herkunft,
          showtime: acts.showtime,
          promotext: acts.promotext,
        })
        .from(acts)
        .where(inArray(acts.ressortId, anlassRessorts.map((r) => r.id)))
        .orderBy(asc(acts.showtime), asc(acts.name))
    : [];

  const beschreibung = anlassActs
    .filter((a) => a.name)
    .map((a) => {
      const meta = [a.genre, a.herkunft].filter(Boolean).join(", ");
      const absaetze = a.promotext
        .split(/\n\s*\n/)
        .map((p) => p.trim())
        .filter(Boolean)
        .map((p) => `<p>${htmlEscape(p).replace(/\n/g, "<br>")}</p>`)
        .join("\n");
      return `<h3>${htmlEscape(a.name)}${meta ? ` <small>(${htmlEscape(meta)})</small>` : ""}</h3>\n${absaetze}`;
    })
    .join("\n");

  const start = `${anlass.datum} ${anlass.tueroeffnung || "20:00"}:00`;
  const endDatum = anlass.ende && istFolgetag(anlass.tueroeffnung, anlass.ende) ? datumPlusTage(anlass.datum, 1) : anlass.datum;
  const ende = `${endDatum} ${anlass.ende || "23:59"}:00`;
  const kosten = [
    anlass.normaltarifCents != null && chfPreis(anlass.normaltarifCents),
    anlass.solitarifCents != null && `Soli ${chfPreis(anlass.solitarifCents)}`,
  ]
    .filter(Boolean)
    .join(" / ");

  const payload: Record<string, unknown> = {
    title: anlass.name,
    description: beschreibung,
    start_date: start,
    end_date: ende,
    status: "draft",
  };
  if (kosten) payload.cost = kosten;
  if (anlass.petzilink) payload.website = anlass.petzilink;

  const ziel = anlass.wpEventId
    ? `${wpUrl}/wp-json/tribe/events/v1/events/${anlass.wpEventId}`
    : `${wpUrl}/wp-json/tribe/events/v1/events`;

  let res: globalThis.Response;
  try {
    res = await fetch(ziel, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${Buffer.from(`${wpUser}:${wpPass}`).toString("base64")}`,
      },
      body: JSON.stringify(payload),
    });
  } catch {
    return Response.json({ error: "kulturspinnerei.ch ist gerade nicht erreichbar." }, { status: 502 });
  }

  const data = (await res.json().catch(() => null)) as { id?: number; message?: string } | null;

  // Event wurde in WordPress gelöscht → neu anlegen.
  if (!res.ok && anlass.wpEventId && (res.status === 404 || res.status === 410)) {
    await db.update(anlaesse).set({ wpEventId: null }).where(eq(anlaesse.id, id));
    return Response.json({ error: "Das Website-Event existiert nicht mehr — bitte nochmals publizieren (legt ein neues an)." }, { status: 409 });
  }
  if (!res.ok || !data?.id) {
    // WordPress-Meldungen enthalten teils HTML — für die Anzeige entfernen.
    const grund = data?.message ? ` (${data.message.replace(/<[^>]+>/g, "")})` : "";
    return Response.json({ error: `WordPress hat abgelehnt: HTTP ${res.status}${grund}` }, { status: 502 });
  }

  if (anlass.wpEventId !== data.id) {
    await db.update(anlaesse).set({ wpEventId: data.id }).where(eq(anlaesse.id, id));
  }

  return Response.json({
    ok: true,
    wpEventId: data.id,
    aktualisiert: !!anlass.wpEventId,
    // Direktlink in den WordPress-Editor (Entwurf prüfen, Bild ergänzen, veröffentlichen).
    editUrl: `${wpUrl}/wp-admin/post.php?post=${data.id}&action=edit`,
  });
}
