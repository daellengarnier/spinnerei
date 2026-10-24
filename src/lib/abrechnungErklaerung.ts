// «Wie kommt diese Zahl zustande?» — Aufschlüsselung der berechneten Werte
// der Abrechnung. Rein zur Anzeige: liest Daten und Ergebnis von
// berechneAbrechnung, speichert und verändert nichts.
import { GEBUEHR_PROZENT, WARENKOSTEN_PROZENT, type AbrechnungBerechnet, type AbrechnungDaten, type EintrittsStufe } from "@/lib/abrechnung";

export type RechenZeile =
  | { op: "+" | "−"; label: string; cents: number }
  | { op: "%"; label: string; prozent: number };

export interface Rechnung {
  zeilen: RechenZeile[];
  ergebnisCents: number;
  hinweis?: string;
}

export type ErklaerungKey =
  | "gebuehr"
  | "sumupTotal"
  | "akGewinnKasse"
  | "akKarten"
  | "akTotal"
  | "barKarten"
  | "barUmsatz"
  | "warenkosten"
  | "barGewinn"
  | "vvkTotal"
  | "akEintritteTotal"
  | "eintritteGewinn"
  | "mieteTotal"
  | "gagenTotal"
  | "sonstigeTotal"
  | "einnahmen"
  | "ausgaben"
  | "gewinnVerlust"
  | "umsatzBuchhaltung";

const plus = (label: string, cents: number): RechenZeile => ({ op: "+", label, cents });
const minus = (label: string, cents: number): RechenZeile => ({ op: "−", label, cents });

const chf = (cents: number) => (cents / 100).toFixed(2);

function stufenZeilen(stufen: EintrittsStufe[]): RechenZeile[] {
  return stufen.filter((s) => s.anzahl > 0).map((s) => plus(`${s.anzahl} × ${chf(s.preisCents)}`, s.anzahl * s.preisCents));
}

export function erklaereAbrechnung(
  d: AbrechnungDaten,
  b: AbrechnungBerechnet,
  gagenActs: { name: string; funktion: string; preisCents: number }[],
  sonstige: { art: string; preisCents: number }[],
): Record<ErklaerungKey, Rechnung> {
  const n = (v: number | null) => v ?? 0;
  const kartenTotal = n(d.kartenTotalCents);
  const twint = n(d.twintCents);

  return {
    gebuehr: {
      zeilen: [plus("Kartenzahlung Total", kartenTotal), plus("Twint", twint), { op: "%", label: "Gebühr", prozent: GEBUEHR_PROZENT }],
      ergebnisCents: b.gebuehrCents,
      hinweis: "auf Rappen gerundet",
    },
    sumupTotal: {
      zeilen: [plus("Kartenzahlung Total", kartenTotal), plus("Twint", twint), minus(`Gebühr (${GEBUEHR_PROZENT}%)`, b.gebuehrCents)],
      ergebnisCents: b.sumupTotalCents,
    },
    akGewinnKasse: {
      zeilen: [plus("Endstock", n(d.akEndCents)), minus("Anfangsstock", n(d.akAnfangCents))],
      ergebnisCents: b.akGewinnKasseCents,
    },
    akKarten: b.akKartenManuell
      ? {
          zeilen: [plus("Manuell erfasst", b.akKartenCents)],
          ergebnisCents: b.akKartenCents,
          hinweis: `Berechnet aus Eintritten wären es ${chf(b.akKartenBerechnetCents)} (Eintritte Abendkasse − Gewinn Kasse).`,
        }
      : {
          zeilen: [plus("Eintritte Abendkasse", b.akEintritteTotalCents), minus("Gewinn Kasse (Bargeld)", b.akGewinnKasseCents)],
          ergebnisCents: b.akKartenCents,
          hinweis:
            b.akEintritteTotalCents - b.akGewinnKasseCents < 0
              ? "Mehr Bargeld als Eintritte — Kartenzahlungen werden auf 0 gesetzt, die Differenz zeigt der Quercheck."
              : "Was an der Abendkasse eingenommen, aber nicht bar in der Kasse liegt, wurde mit Karte bezahlt.",
        },
    akTotal: {
      zeilen: [plus("Gewinn Kasse", b.akGewinnKasseCents), plus("Kartenzahlungen Abendkasse", b.akKartenCents)],
      ergebnisCents: b.akTotalCents,
    },
    barKarten: {
      zeilen: [plus("Kartenzahlung Total (SumUp)", kartenTotal), minus("Kartenzahlungen Abendkasse", b.akKartenCents)],
      ergebnisCents: b.barKartenCents,
    },
    barUmsatz: {
      zeilen: [plus("Endstock", n(d.barEndCents)), minus("Anfangsstock", n(d.barAnfangCents)), plus("Kartenzahlungen Bar", b.barKartenCents)],
      ergebnisCents: b.barUmsatzCents,
    },
    warenkosten: {
      zeilen: [plus("Umsatz Bar", b.barUmsatzCents), { op: "%", label: "Warenkosten", prozent: WARENKOSTEN_PROZENT }],
      ergebnisCents: b.warenkostenCents,
      hinweis: "auf Rappen gerundet",
    },
    barGewinn: {
      zeilen: [plus("Umsatz Bar", b.barUmsatzCents), minus(`Warenkosten (${WARENKOSTEN_PROZENT}%)`, b.warenkostenCents)],
      ergebnisCents: b.barGewinnCents,
    },
    vvkTotal: { zeilen: stufenZeilen(d.eintritteVvk), ergebnisCents: b.vvkTotalCents },
    akEintritteTotal: { zeilen: stufenZeilen(d.eintritteAk), ergebnisCents: b.akEintritteTotalCents },
    eintritteGewinn: {
      zeilen: [plus("Eintritte Vorverkauf (Petzi)", b.vvkTotalCents), plus("Eintritte Abendkasse", b.akEintritteTotalCents)],
      ergebnisCents: b.eintritteGewinnCents,
    },
    mieteTotal: { zeilen: d.miete.map((m) => plus(m.art || "Mietposten", m.preisCents)), ergebnisCents: b.mieteTotalCents },
    gagenTotal: {
      zeilen: [
        ...gagenActs.map((g) => plus(`${g.funktion}: ${g.name}`, g.preisCents)),
        ...d.gagenManuell.map((g) => plus([g.funktion, g.name].filter(Boolean).join(": ") || "Gage", g.preisCents)),
      ],
      ergebnisCents: b.gagenTotalCents,
    },
    sonstigeTotal: { zeilen: sonstige.map((s) => plus(s.art || "Ausgabe", s.preisCents)), ergebnisCents: b.sonstigeTotalCents },
    einnahmen: {
      zeilen: [plus("Gewinn Bar", b.barGewinnCents), plus("Gewinn Eintritte", b.eintritteGewinnCents), plus("Mieteinnahmen", b.mieteTotalCents)],
      ergebnisCents: b.einnahmenCents,
    },
    ausgaben: {
      zeilen: [plus("Gagen", b.gagenTotalCents), plus("Sonstige Ausgaben", b.sonstigeTotalCents)],
      ergebnisCents: b.ausgabenTotalCents,
    },
    gewinnVerlust: {
      zeilen: [plus("Einnahmen", b.einnahmenCents), minus("Ausgaben", b.ausgabenTotalCents)],
      ergebnisCents: b.gewinnVerlustCents,
    },
    umsatzBuchhaltung: {
      zeilen: [plus("Umsatz Bar", b.barUmsatzCents), plus("Gewinn Kasse (Abendkasse, bar)", b.akGewinnKasseCents)],
      ergebnisCents: b.umsatzBuchhaltungCents,
    },
  };
}
