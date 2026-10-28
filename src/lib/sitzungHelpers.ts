import "server-only";
import { asc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { sitzungen, todoAssignees, todos, users } from "@/lib/db/schema";
import type { SQL } from "drizzle-orm";

// Pendenzen (Todos) samt Zuständigen und Sitzungsdatum laden.
export async function pendenzenMit(where: SQL | undefined) {
  const db = getDb();
  const rows = await db
    .select({ todo: todos, sitzungDatum: sitzungen.datum })
    .from(todos)
    .leftJoin(sitzungen, eq(sitzungen.id, todos.sitzungId))
    .where(where)
    .orderBy(asc(todos.id));
  const zustaendige = rows.length
    ? await db
        .select({ todoId: todoAssignees.todoId, id: users.id, name: users.name, avatarColor: users.avatarColor })
        .from(todoAssignees)
        .innerJoin(users, eq(users.id, todoAssignees.userId))
        .where(inArray(todoAssignees.todoId, rows.map((r) => r.todo.id)))
    : [];
  return rows.map(({ todo, sitzungDatum }) => ({
    ...todo,
    sitzungDatum,
    assignees: zustaendige.filter((z) => z.todoId === todo.id).map(({ id, name, avatarColor }) => ({ id, name, avatarColor })),
  }));
}
