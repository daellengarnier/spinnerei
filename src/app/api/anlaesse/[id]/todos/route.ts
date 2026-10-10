import { and, asc, count, eq, inArray, or, sql } from "drizzle-orm";
import { requireUser, isResponse } from "@/lib/auth";
import { getDb } from "@/lib/db/client";
import { comments, ressorts, todoAssignees, todos, users } from "@/lib/db/schema";

// Alle Todos eines Anlasses: direkt am Anlass erfasste (todos.anlassId) und
// die aus den Bereichen/Ressorts des Anlasses — eine gemeinsame Liste.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if (isResponse(auth)) return auth;
  const anlassId = Number((await params).id);
  if (!anlassId) return Response.json({ error: "Ungültige ID" }, { status: 400 });
  const db = getDb();

  const bereiche = await db
    .select({ id: ressorts.id, name: ressorts.name, farbe: ressorts.farbe })
    .from(ressorts)
    .where(eq(ressorts.anlassId, anlassId))
    .orderBy(asc(ressorts.reihenfolge), asc(ressorts.id));
  const ressortIds = bereiche.map((r) => r.id);

  const rows = await db
    .select({
      id: todos.id,
      ressortId: todos.ressortId,
      subRessortId: todos.subRessortId,
      anlassId: todos.anlassId,
      titel: todos.titel,
      beschreibung: todos.beschreibung,
      status: todos.status,
      fristDatum: todos.fristDatum,
      erstelltVon: todos.erstelltVon,
      erstelltVonName: users.name,
      createdAt: todos.createdAt,
      updatedAt: todos.updatedAt,
    })
    .from(todos)
    .leftJoin(users, eq(users.id, todos.erstelltVon))
    .where(ressortIds.length ? or(eq(todos.anlassId, anlassId), inArray(todos.ressortId, ressortIds)) : eq(todos.anlassId, anlassId))
    .orderBy(sql`${todos.fristDatum} NULLS LAST`, asc(todos.createdAt));

  const ids = rows.map((r) => r.id);
  const assignees = ids.length
    ? await db
        .select({ todoId: todoAssignees.todoId, id: users.id, name: users.name, avatarColor: users.avatarColor })
        .from(todoAssignees)
        .innerJoin(users, eq(users.id, todoAssignees.userId))
        .where(inArray(todoAssignees.todoId, ids))
    : [];
  const commentCounts = ids.length
    ? await db
        .select({ todoId: comments.parentId, c: count() })
        .from(comments)
        .where(and(eq(comments.parentTyp, "todo"), inArray(comments.parentId, ids)))
        .groupBy(comments.parentId)
    : [];

  const bereichById = new Map(bereiche.map((b) => [b.id, b]));
  const result = rows.map((t) => ({
    ...t,
    ressort: t.ressortId ? (bereichById.get(t.ressortId) ?? null) : null,
    assignees: assignees.filter((a) => a.todoId === t.id).map(({ id, name, avatarColor }) => ({ id, name, avatarColor })),
    commentCount: commentCounts.find((c) => c.todoId === t.id)?.c ?? 0,
  }));

  return Response.json({ todos: result, bereiche });
}
