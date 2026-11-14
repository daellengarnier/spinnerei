import { eq } from "drizzle-orm";
import { requireUser, isResponse } from "@/lib/auth";
import { getDb } from "@/lib/db/client";
import { ressorts } from "@/lib/db/schema";
import { vorlageInRessort } from "@/lib/vorlage";

// Checkliste in ein bestehendes Ressort übernehmen (fehlende Punkte als Todos).
export async function POST(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if (isResponse(auth)) return auth;
  const { id } = await ctx.params;
  const ressortId = Number(id);
  const r = await getDb().select({ id: ressorts.id, hatVorlage: ressorts.hatVorlage }).from(ressorts).where(eq(ressorts.id, ressortId)).limit(1);
  if (!r[0]) return Response.json({ error: "Ressort nicht gefunden" }, { status: 404 });
  if (!r[0].hatVorlage) return Response.json({ error: "Dieses Ressort hat keine Checkliste" }, { status: 400 });
  const neu = await vorlageInRessort(ressortId, auth.id);
  return Response.json({ neu });
}
