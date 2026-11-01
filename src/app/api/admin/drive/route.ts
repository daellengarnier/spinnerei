import { count, eq, isNull } from "drizzle-orm";
import { requireAdmin, isResponse } from "@/lib/auth";
import { getDb } from "@/lib/db/client";
import { attachments, expenses } from "@/lib/db/schema";
import { driveStatus, driveTrennen, finanzenOrdnerId } from "@/lib/googleDrive";
import { folderUrl } from "@/lib/drive";

// Stand der Beleg-Ablage im Google Drive.
export async function GET() {
  const auth = await requireAdmin();
  if (isResponse(auth)) return auth;
  const db = getDb();
  const zaehle = async (abgelegt: boolean) =>
    (
      await db
        .select({ c: count() })
        .from(expenses)
        .innerJoin(attachments, eq(attachments.id, expenses.belegId))
        .where(abgelegt ? undefined : isNull(attachments.driveFileId))
    )[0].c;
  const total = await zaehle(true); // alle Ausgaben mit Beleg
  const ausstehend = await zaehle(false);
  return Response.json({ ...(await driveStatus()), ordnerUrl: folderUrl(finanzenOrdnerId()), belegeTotal: total, ausstehend });
}

// Verbindung trennen (abgelegte Belege bleiben im Drive).
export async function DELETE() {
  const auth = await requireAdmin();
  if (isResponse(auth)) return auth;
  await driveTrennen();
  return Response.json({ ok: true });
}
