import { eq } from "drizzle-orm";
import { requireUser, isResponse } from "@/lib/auth";
import { getDb } from "@/lib/db/client";
import { ressorts, todos } from "@/lib/db/schema";
import type { TodoStatus } from "@/lib/db/schema";
import { setAssignees, todoWithDetail } from "@/lib/todoHelpers";

const STATUS: TodoStatus[] = ["offen", "in_arbeit", "erledigt"];

export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if (isResponse(auth)) return auth;
  const { id } = await ctx.params;
  const todo = await todoWithDetail(Number(id));
  if (!todo) return Response.json({ error: "Todo nicht gefunden" }, { status: 404 });
  return Response.json({ todo });
}

export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if (isResponse(auth)) return auth;
  const { id } = await ctx.params;
  const todoId = Number(id);
  const db = getDb();
  const rows = await db
    .select({ id: todos.id, titel: todos.titel, ressortId: todos.ressortId, anlassId: todos.anlassId })
    .from(todos)
    .where(eq(todos.id, todoId))
    .limit(1);
  const existing = rows[0];
  if (!existing) return Response.json({ error: "Todo nicht gefunden" }, { status: 404 });

  const body = await request.json().catch(() => ({}));
  const patch: Partial<typeof todos.$inferInsert> = {};
  if (body?.titel !== undefined) patch.titel = String(body.titel).trim();
  if (body?.beschreibung !== undefined) patch.beschreibung = String(body.beschreibung);
  if (body?.status !== undefined && STATUS.includes(body.status)) {
    patch.status = body.status;
    // Erledigt-Zeitpunkt für «Erledigt seit der letzten Sitzung».
    patch.erledigtAm = body.status === "erledigt" ? new Date() : null;
  }
  if (body?.erledigtNotiz !== undefined) patch.erledigtNotiz = String(body.erledigtNotiz).trim();
  if (body?.fristDatum !== undefined) patch.fristDatum = body.fristDatum || null;
  if (body?.subRessortId !== undefined) patch.subRessortId = body.subRessortId ? Number(body.subRessortId) : null;
  // Bereich wechseln (nur innerhalb desselben Anlasses): ressortId setzen oder
  // leeren; ohne Bereich hängt das Todo direkt am Anlass.
  if (body?.ressortId !== undefined) {
    const anlassVon = async (rid: number | null) =>
      rid ? ((await db.select({ a: ressorts.anlassId }).from(ressorts).where(eq(ressorts.id, rid)).limit(1))[0]?.a ?? null) : null;
    const todoAnlass = existing.anlassId ?? (await anlassVon(existing.ressortId));
    if (todoAnlass !== null) {
      const ziel = body.ressortId ? Number(body.ressortId) : null;
      if (ziel === null) {
        patch.ressortId = null;
        patch.subRessortId = null;
        patch.anlassId = todoAnlass;
      } else if (ziel !== existing.ressortId) {
        if ((await anlassVon(ziel)) !== todoAnlass) {
          return Response.json({ error: "Bereich gehört nicht zu diesem Anlass" }, { status: 400 });
        }
        patch.ressortId = ziel;
        patch.subRessortId = null;
        patch.anlassId = null;
      }
    }
  }
  patch.updatedAt = new Date();
  await db.update(todos).set(patch).where(eq(todos.id, todoId));

  if (Array.isArray(body?.assigneeIds)) {
    await setAssignees(
      todoId,
      body.assigneeIds.map(Number),
      auth.id,
      body?.titel !== undefined ? String(body.titel) : existing.titel,
    );
  }
  return Response.json({ todo: await todoWithDetail(todoId) });
}

export async function DELETE(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if (isResponse(auth)) return auth;
  const { id } = await ctx.params;
  await getDb().delete(todos).where(eq(todos.id, Number(id)));
  return Response.json({ ok: true });
}
