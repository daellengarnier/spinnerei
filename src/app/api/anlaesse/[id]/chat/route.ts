import { and, asc, eq, inArray, or } from "drizzle-orm";
import { requireUser, isResponse } from "@/lib/auth";
import { getDb } from "@/lib/db/client";
import { commentMentions, comments, ressorts, users } from "@/lib/db/schema";

// Chat-Verlauf eines Anlasses: neue Chat-Nachrichten (parentTyp "anlass") plus
// die bisherigen Pinnwand-Beiträge der Ressorts dieses Anlasses — nur gelesen
// und zusammen angezeigt, nichts wird verschoben.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if (isResponse(auth)) return auth;
  const anlassId = Number((await params).id);
  if (!anlassId) return Response.json({ error: "Ungültige ID" }, { status: 400 });
  const db = getDb();

  const anlassRessorts = await db
    .select({ id: ressorts.id, name: ressorts.name, farbe: ressorts.farbe })
    .from(ressorts)
    .where(eq(ressorts.anlassId, anlassId));
  const ressortIds = anlassRessorts.map((r) => r.id);

  const chatFilter = and(eq(comments.parentTyp, "anlass"), eq(comments.parentId, anlassId));
  const rows = await db
    .select({
      id: comments.id,
      parentTyp: comments.parentTyp,
      parentId: comments.parentId,
      text: comments.text,
      createdAt: comments.createdAt,
      autorUserId: comments.autorUserId,
      autorName: users.name,
      autorColor: users.avatarColor,
    })
    .from(comments)
    .leftJoin(users, eq(users.id, comments.autorUserId))
    .where(
      ressortIds.length
        ? or(chatFilter, and(eq(comments.parentTyp, "ressort"), inArray(comments.parentId, ressortIds)))
        : chatFilter,
    )
    .orderBy(asc(comments.createdAt), asc(comments.id));

  const ids = rows.map((r) => r.id);
  const mentions = ids.length
    ? await db
        .select({ commentId: commentMentions.commentId, id: users.id, name: users.name })
        .from(commentMentions)
        .innerJoin(users, eq(users.id, commentMentions.userId))
        .where(inArray(commentMentions.commentId, ids))
    : [];
  const ressortById = new Map(anlassRessorts.map((r) => [r.id, r]));

  return Response.json({
    comments: rows.map((r) => ({
      ...r,
      // Herkunft alter Pinnwand-Beiträge (Etikett im Chat).
      ressort: r.parentTyp === "ressort" ? (ressortById.get(r.parentId) ?? null) : null,
      mentions: mentions.filter((m) => m.commentId === r.id).map(({ id, name }) => ({ id, name })),
    })),
  });
}
