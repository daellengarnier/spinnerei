import ExcelJS from "exceljs";
import { eq } from "drizzle-orm";
import { requireUser, isResponse } from "@/lib/auth";
import { getDb } from "@/lib/db/client";
import { anlaesse } from "@/lib/db/schema";
import { berechneAbrechnung, GEBUEHR_PROZENT, WARENKOSTEN_PROZENT } from "@/lib/abrechnung";
import { gagenAusActs, ladeDaten, sonstigeAusgaben } from "@/lib/abrechnungServer";

const chf = (cents: number | null | undefined) => (cents == null ? "" : Math.round(cents) / 100);

// Excel-Export im Layout des bisherigen Abrechnungs-Sheets.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if (isResponse(auth)) return auth;
  const anlassId = Number((await params).id);
  if (!anlassId) return Response.json({ error: "Ungültige ID" }, { status: 400 });
  const rows = await getDb().select().from(anlaesse).where(eq(anlaesse.id, anlassId)).limit(1);
  const anlass = rows[0];
  if (!anlass) return Response.json({ error: "Anlass nicht gefunden" }, { status: 404 });

  const daten = await ladeDaten(anlassId);
  const gagenActs = await gagenAusActs(anlassId);
  const sonstige = await sonstigeAusgaben(anlassId);
  const b = berechneAbrechnung(
    daten,
    gagenActs.reduce((s, g) => s + g.preisCents, 0),
    sonstige.reduce((s, a) => s + a.preisCents, 0),
  );

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Abrechnung");
  ws.getColumn(2).width = 38;
  ws.getColumn(3).width = 16;
  ws.getColumn(4).width = 14;
  ws.getColumn(6).width = 26;
  ws.getColumn(7).width = 22;
  ws.getColumn(8).width = 14;

  const fett = (zelle: ExcelJS.Cell) => (zelle.font = { bold: true });
  let z = 1;
  const set = (row: number, col: number, wert: string | number, bold = false) => {
    const c = ws.getCell(row, col);
    c.value = wert;
    if (bold) fett(c);
    return c;
  };

  set(z, 1, "Abrechnung Anlass", true);
  z++;
  set(z++, 1, "Anlass:") && set(z - 1, 2, anlass.name);
  set(z++, 1, "Datum:") && set(z - 1, 2, anlass.datum);
  if (anlass.art) set(z++, 1, "Art:") && set(z - 1, 2, anlass.art);
  z++;
  set(z, 5, "GEWINN/VERLUST", true);
  set(z + 1, 5, chf(b.gewinnVerlustCents), true);
  set(z, 1, "Umsatz für Buchhaltung", true);
  set(z + 1, 1, chf(b.umsatzBuchhaltungCents), true);
  set(z, 2, "Einnahmen", true);
  set(z + 1, 2, chf(b.einnahmenCents), true);
  set(z, 6, "Ausgaben", true);
  set(z + 1, 6, chf(b.ausgabenTotalCents), true);
  z += 3;

  // ── Einnahmen (Spalten B–D) ───────────────────────────────
  const einnahmenStart = z;
  set(z++, 2, "BAREINNAHMEN (unten)", true);
  set(z++, 2, "Anfangsstock") && set(z - 1, 4, chf(daten.barAnfangCents));
  set(z++, 2, "Endstock") && set(z - 1, 4, chf(daten.barEndCents));
  set(z++, 2, "Kartenzahlungen (berechnet)") && set(z - 1, 4, chf(b.barKartenCents));
  set(z++, 2, "Umsatz", true) && set(z - 1, 4, chf(b.barUmsatzCents), true);
  set(z++, 2, `Warenkosten (${WARENKOSTEN_PROZENT}%)`) && set(z - 1, 4, chf(b.warenkostenCents));
  set(z++, 2, "Gewinn", true) && set(z - 1, 4, chf(b.barGewinnCents), true);
  z++;
  set(z++, 2, "ABENDKASSE (oben)", true);
  set(z++, 2, "Anfangsstock") && set(z - 1, 4, chf(daten.akAnfangCents));
  set(z++, 2, "Endstock") && set(z - 1, 4, chf(daten.akEndCents));
  set(z++, 2, "Gewinn Kasse") && set(z - 1, 4, chf(b.akGewinnKasseCents));
  set(z++, 2, "Kartenzahlungen") && set(z - 1, 4, chf(daten.akKartenCents));
  set(z++, 2, "Total Einnahmen Abendkasse", true) && set(z - 1, 4, chf(b.akTotalCents), true);
  z++;
  set(z++, 2, "SUMUP / TWINT", true);
  set(z++, 2, "Kartenzahlung Total (Abend & Nacht)") && set(z - 1, 4, chf(daten.kartenTotalCents));
  set(z++, 2, "Twint") && set(z - 1, 4, chf(daten.twintCents));
  set(z++, 2, `Gebühr (${GEBUEHR_PROZENT}%)`) && set(z - 1, 4, chf(b.gebuehrCents));
  set(z++, 2, "Total", true) && set(z - 1, 4, chf(b.sumupTotalCents), true);
  z++;
  set(z++, 2, "EINTRITTE VORVERKAUF (PETZI)", true);
  set(z, 2, "Preis") && set(z, 3, "Anzahl Eintritte") && set(z, 4, "Total");
  z++;
  for (const s of daten.eintritteVvk) {
    set(z, 2, chf(s.preisCents));
    set(z, 3, s.anzahl);
    set(z, 4, chf(s.preisCents * s.anzahl));
    z++;
  }
  set(z++, 2, "Total", true) && set(z - 1, 3, b.vvkAnzahl, true) && set(z - 1, 4, chf(b.vvkTotalCents), true);
  z++;
  set(z++, 2, "EINTRITTE ABENDKASSE", true);
  for (const s of daten.eintritteAk) {
    set(z, 2, chf(s.preisCents));
    set(z, 3, s.anzahl);
    set(z, 4, chf(s.preisCents * s.anzahl));
    z++;
  }
  set(z++, 2, "Total", true) && set(z - 1, 3, b.akEintritteAnzahl, true) && set(z - 1, 4, chf(b.akEintritteTotalCents), true);
  set(z++, 2, "Total Eintritte (Petzi + Abendkasse)") && set(z - 1, 3, b.eintritteAnzahl);
  set(z++, 2, "Total Gewinn", true) && set(z - 1, 4, chf(b.eintritteGewinnCents), true);
  z++;
  set(z++, 2, "MIETEINNAHMEN (Raum, Material, etc.)", true);
  set(z, 2, "Art") && set(z, 4, "Preis");
  z++;
  for (const m of daten.miete) {
    set(z, 2, m.art);
    set(z, 4, chf(m.preisCents));
    z++;
  }
  set(z++, 2, "Total", true) && set(z - 1, 4, chf(b.mieteTotalCents), true);

  // ── Ausgaben (Spalten F–H) ────────────────────────────────
  let a = einnahmenStart;
  set(a++, 6, "GAGEN (Personen)", true);
  set(a, 6, "Funktion") && set(a, 7, "Name") && set(a, 8, "Preis");
  a++;
  for (const g of [...gagenActs, ...daten.gagenManuell]) {
    set(a, 6, g.funktion);
    set(a, 7, g.name);
    set(a, 8, chf(g.preisCents));
    a++;
  }
  set(a++, 6, "Total", true) && set(a - 1, 8, chf(b.gagenTotalCents), true);
  a++;
  set(a++, 6, "SONSTIGE AUSGABEN (Materiell)", true);
  set(a, 6, "Art") && set(a, 7, "Eigentümer") && set(a, 8, "Preis");
  a++;
  for (const s of sonstige) {
    set(a, 6, s.art);
    set(a, 7, s.eigentuemer);
    set(a, 8, chf(s.preisCents));
    a++;
  }
  set(a++, 6, "Total", true) && set(a - 1, 8, chf(b.sonstigeTotalCents), true);

  const buffer = await wb.xlsx.writeBuffer();
  const dateiname = `Abrechnung_${anlass.name.replace(/[^\wäöüÄÖÜ-]+/g, "_")}.xlsx`;
  return new Response(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${dateiname}"`,
    },
  });
}
