import { asc, eq, inArray } from "drizzle-orm";
import { requireUser, requireAdmin, isResponse } from "@/lib/auth";
import { getDb } from "@/lib/db/client";
import { acts, anlaesse, ressorts } from "@/lib/db/schema";

// Einzelner Anlass inkl. Anlassübersicht: Eckzeiten + alle Acts (mit Zeiten)
// aus den Acts-Ressorts dieses Anlasses.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if (isResponse(auth)) return auth;
  const id = Number((await params).id);
  if (!id) return Response.json({ error: "Ungültige ID" }, { status: 400 });
  const db = getDb();
  const rows = await db.select().from(anlaesse).where(eq(anlaesse.id, id)).limit(1);
  if (!rows[0]) return Response.json({ error: "Anlass nicht gefunden" }, { status: 404 });

  const anlassRessorts = await db
    .select({ id: ressorts.id })
    .from(ressorts)
    .where(eq(ressorts.anlassId, id));
  const ressortIds = anlassRessorts.map((r) => r.id);
  const anlassActs = ressortIds.length
    ? await db
        .select({
          id: acts.id,
          ressortId: acts.ressortId,
          name: acts.name,
          typ: acts.typ,
          getIn: acts.getIn,
          soundcheck: acts.soundcheck,
          showtime: acts.showtime,
        })
        .from(acts)
        .where(inArray(acts.ressortId, ressortIds))
        .orderBy(asc(acts.showtime), asc(acts.name))
    : [];

  return Response.json({ anlass: rows[0], acts: anlassActs });
}

// Anlass ändern. Eckzeiten (Türöffnung/Essen/Ende) dürfen alle Mitglieder
// pflegen; Name/Datum nur Admin.
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  if (!id) return Response.json({ error: "Ungültige ID" }, { status: 400 });
  const body = await request.json().catch(() => ({}));

  const wantsAdminFields = body?.name !== undefined || body?.datum !== undefined;
  const auth = wantsAdminFields ? await requireAdmin() : await requireUser();
  if (isResponse(auth)) return auth;

  const zeit = (v: unknown) => {
    const s = String(v).trim();
    return s === "" || /^\d{2}:\d{2}$/.test(s) ? s : null;
  };

  const patch: Partial<{ name: string; datum: string; tueroeffnung: string; essen: string; ende: string; petzilink: string; art: string; stichwort: string; zugang: string }> = {};
  if (body?.name !== undefined) {
    const name = String(body.name).trim();
    if (!name) return Response.json({ error: "Name darf nicht leer sein" }, { status: 400 });
    patch.name = name;
  }
  if (body?.datum !== undefined) {
    const datum = String(body.datum).trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(datum)) return Response.json({ error: "Datum als YYYY-MM-DD" }, { status: 400 });
    patch.datum = datum;
  }
  for (const feld of ["tueroeffnung", "essen", "ende"] as const) {
    if (body?.[feld] !== undefined) {
      const wert = zeit(body[feld]);
      if (wert === null) return Response.json({ error: "Zeit als HH:MM" }, { status: 400 });
      patch[feld] = wert;
    }
  }
  if (body?.art !== undefined) patch.art = String(body.art).trim();
  // Stichwort: maximal 3 Wörter (z. B. "Psytrance", "Melodic Techno").
  if (body?.stichwort !== undefined) patch.stichwort = String(body.stichwort).trim().split(/\s+/).filter(Boolean).slice(0, 3).join(" ");
  if (body?.zugang !== undefined) {
    const zugang = String(body.zugang);
    if (!["", "oeffentlich", "privat"].includes(zugang)) return Response.json({ error: "Zugang: oeffentlich oder privat" }, { status: 400 });
    patch.zugang = zugang;
  }
  if (body?.petzilink !== undefined) {
    const link = String(body.petzilink).trim();
    if (link && !/^https?:\/\//.test(link)) return Response.json({ error: "Petzilink muss mit http(s):// beginnen" }, { status: 400 });
    patch.petzilink = link;
  }
  if (Object.keys(patch).length === 0) return Response.json({ error: "Nichts zu ändern" }, { status: 400 });
  await getDb().update(anlaesse).set(patch).where(eq(anlaesse.id, id));
  return Response.json({ ok: true });
}

// Admin: Anlass samt Inhalt löschen.
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (isResponse(auth)) return auth;
  const id = Number((await params).id);
  if (!id) return Response.json({ error: "Ungültige ID" }, { status: 400 });
  await getDb().delete(anlaesse).where(eq(anlaesse.id, id));
  return Response.json({ ok: true });
}
