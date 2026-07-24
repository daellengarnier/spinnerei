import { asc, count, eq, and, ne } from "drizzle-orm";
import { requireUser, requireAdmin, isResponse } from "@/lib/auth";
import { getDb } from "@/lib/db/client";
import { anlaesse, ressorts, todos } from "@/lib/db/schema";
import { allUsers, notifyMany } from "@/lib/notify";
import { formatDatumKurz } from "@/lib/datum";

// Alle Anlässe, chronologisch, mit Anzahl offener Todos.
export async function GET() {
  const auth = await requireUser();
  if (isResponse(auth)) return auth;
  const db = getDb();
  const list = await db.select().from(anlaesse).orderBy(asc(anlaesse.datum), asc(anlaesse.id));

  const result = await Promise.all(
    list.map(async (a) => {
      const open = await db
        .select({ c: count() })
        .from(todos)
        .innerJoin(ressorts, eq(ressorts.id, todos.ressortId))
        .where(and(eq(ressorts.anlassId, a.id), ne(todos.status, "erledigt")));
      return { ...a, openTodos: open[0].c };
    }),
  );
  return Response.json({ anlaesse: result });
}

// Admin: neuen Anlass anlegen.
export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (isResponse(auth)) return auth;
  const body = await request.json().catch(() => ({}));
  const name = String(body?.name ?? "").trim();
  const datum = String(body?.datum ?? "").trim(); // 'YYYY-MM-DD'
  if (!name || !/^\d{4}-\d{2}-\d{2}$/.test(datum)) {
    return Response.json({ error: "Name und Datum (YYYY-MM-DD) erforderlich" }, { status: 400 });
  }
  const slugBase =
    name
      .toLowerCase()
      .replace(/[äàâ]/g, "a")
      .replace(/[öô]/g, "o")
      .replace(/[üû]/g, "u")
      .replace(/é|è|ê/g, "e")
      .replace(/ß/g, "ss")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "anlass";

  const db = getDb();
  let slug = slugBase;
  for (let i = 2; ; i++) {
    const clash = await db.select({ id: anlaesse.id }).from(anlaesse).where(eq(anlaesse.slug, slug)).limit(1);
    if (!clash[0]) break;
    slug = `${slugBase}-${i}`;
  }
  const inserted = await db.insert(anlaesse).values({ slug, name, datum }).returning({ id: anlaesse.id });

  // Alle Mitglieder benachrichtigen (Inbox + Push).
  const alle = await allUsers();
  await notifyMany(
    alle.map((u) => ({
      userId: u.id,
      actorUserId: auth.id,
      typ: "neuer_anlass" as const,
      text: `Neuer Anlass: ${name} am ${formatDatumKurz(datum)}`,
      refTyp: "anlass",
      refId: inserted[0].id,
    })),
  );
  return Response.json({ id: inserted[0].id, slug }, { status: 201 });
}
