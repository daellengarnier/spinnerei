import { eq, isNull } from "drizzle-orm";
import { requireAdmin, isResponse } from "@/lib/auth";
import { getDb } from "@/lib/db/client";
import { attachments, expenses } from "@/lib/db/schema";
import { belegAblegen } from "@/lib/googleDrive";

const PRO_DURCHGANG = 20;

// Bisherige Belege nachträglich ablegen, in Portionen (die Admin-Seite ruft
// so lange auf, bis nichts mehr aussteht). Nichts wird gelöscht oder doppelt
// hochgeladen: abgelegte Belege sind über attachments.driveFileId markiert.
export async function POST() {
  const auth = await requireAdmin();
  if (isResponse(auth)) return auth;
  const db = getDb();
  const offen = await db
    .select({ id: expenses.id })
    .from(expenses)
    .innerJoin(attachments, eq(attachments.id, expenses.belegId))
    .where(isNull(attachments.driveFileId))
    .orderBy(expenses.id)
    .limit(PRO_DURCHGANG);

  let abgelegt = 0;
  const fehler: string[] = [];
  for (const { id } of offen) {
    try {
      const r = await belegAblegen(id);
      if (r === "nicht_verbunden") return Response.json({ error: "Google Drive ist nicht verbunden" }, { status: 409 });
      if (r === "abgelegt") abgelegt++;
    } catch (e) {
      fehler.push(`Ausgabe ${id}: ${(e as Error).message}`);
    }
  }
  return Response.json({ abgelegt, fehler, weitere: offen.length === PRO_DURCHGANG && fehler.length === 0 });
}
