import { requireAdmin, isResponse } from "@/lib/auth";
import { getDb } from "@/lib/db/client";
import { abrechnungen, acts, anlaesse, attachments, budgetItems, categoryBudgets, expenses, petziTickets, ressorts } from "@/lib/db/schema";

// Sicherheitskopie aller Finanzdaten als eine JSON-Datei zum Herunterladen:
// Abrechnungen, Ausgaben inkl. Belegdateien (Base64), Budgets, Petzi-Tickets,
// dazu Anlässe, Ressorts und Acts, damit die Bezüge lesbar bleiben.
// Nur lesend; Zugangsdaten (app_settings, Passwörter) sind nicht enthalten.
export async function GET() {
  const auth = await requireAdmin();
  if (isResponse(auth)) return auth;
  const db = getDb();
  const belegIds = new Set((await db.select({ id: expenses.belegId }).from(expenses)).map((e) => e.id).filter(Boolean));
  const belege = (await db.select().from(attachments)).filter((a) => belegIds.has(a.id));

  const daten = {
    erstellt: new Date().toISOString(),
    erstelltVon: auth.name,
    inhalt: "Spinnerei-Orga: Finanzdaten (Sicherheitskopie)",
    anlaesse: await db.select().from(anlaesse),
    ressorts: await db.select().from(ressorts),
    acts: await db.select().from(acts),
    abrechnungen: await db.select().from(abrechnungen),
    ausgaben: await db.select().from(expenses),
    belege,
    budgetKategorien: await db.select().from(categoryBudgets),
    budgetPosten: await db.select().from(budgetItems),
    petziTickets: await db.select().from(petziTickets),
  };
  const stempel = new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-");
  return new Response(JSON.stringify(daten, null, 1), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="spinnerei-finanzen-${stempel}.json"`,
      "cache-control": "no-store",
    },
  });
}
