// Rechenlogik der Anlass-Abrechnung — geteilt zwischen UI und Export.
// Bildet das bisherige Excel-Sheet ab, inklusive der Abhängigkeiten:
//
//   SumUp/Twint:   Kartenzahlung Total (Abend & Nacht) kommt aus dem SumUp-
//                  Report. Twint separat. Gebühr = 2 % auf (Karten + Twint).
//   Abendkasse:    Gewinn Kasse = Endstock − Anfangsstock (Bargeld Eingang).
//                  Plus die dort getätigten Kartenzahlungen = Total Abendkasse.
//   Bar unten:     Kartenzahlungen werden NICHT ausgefüllt, sondern berechnet:
//                  Karten Total − Abendkasse-Karten. Umsatz = (Endstock −
//                  Anfangsstock) + Bar-Karten. Warenkosten = 40 % vom Umsatz.
//   Quercheck:     Total Abendkasse sollte dem Total der Eintritte Abendkasse
//                  entsprechen (Kassensturz vs. gezählte Eintritte).
//   Einnahmen:     Bar-Gewinn + Gewinn Eintritte (VVK + AK) + Miete.
//   Umsatz f. Buchhaltung: Bar-Umsatz + Gewinn Kasse (Abendkasse).

export interface EintrittsStufe {
  preisCents: number;
  anzahl: number;
}

export interface MietPosten {
  art: string;
  preisCents: number;
}

export interface GagenPosten {
  funktion: string;
  name: string;
  preisCents: number;
}

export interface AbrechnungDaten {
  barAnfangCents: number | null;
  barEndCents: number | null;
  akAnfangCents: number | null;
  akEndCents: number | null;
  akKartenCents: number | null;
  kartenTotalCents: number | null;
  twintCents: number | null;
  eintritteVvk: EintrittsStufe[];
  eintritteAk: EintrittsStufe[];
  miete: MietPosten[];
  gagenManuell: GagenPosten[];
}

export const WARENKOSTEN_PROZENT = 40;
export const GEBUEHR_PROZENT = 2;

export const DEFAULT_VVK_STUFEN: EintrittsStufe[] = [3500, 2500, 2000, 1500, 1000, 750].map((p) => ({ preisCents: p, anzahl: 0 }));
export const DEFAULT_AK_STUFEN: EintrittsStufe[] = [3500, 3000, 2500, 2000, 1500, 1000].map((p) => ({ preisCents: p, anzahl: 0 }));

export function leereAbrechnung(): AbrechnungDaten {
  return {
    barAnfangCents: null,
    barEndCents: null,
    akAnfangCents: null,
    akEndCents: null,
    akKartenCents: null,
    kartenTotalCents: null,
    twintCents: null,
    eintritteVvk: DEFAULT_VVK_STUFEN,
    eintritteAk: DEFAULT_AK_STUFEN,
    miete: [],
    gagenManuell: [],
  };
}

export interface AbrechnungBerechnet {
  // Bar unten
  barKartenCents: number; // berechnet: Karten Total − AK-Karten
  barUmsatzCents: number;
  warenkostenCents: number;
  barGewinnCents: number;
  // Abendkasse
  akGewinnKasseCents: number;
  akTotalCents: number;
  // SumUp/Twint
  gebuehrCents: number;
  sumupTotalCents: number;
  // Eintritte
  vvkTotalCents: number;
  vvkAnzahl: number;
  akEintritteTotalCents: number;
  akEintritteAnzahl: number;
  eintritteGewinnCents: number;
  eintritteAnzahl: number;
  // Miete
  mieteTotalCents: number;
  // Ausgaben
  gagenTotalCents: number;
  sonstigeTotalCents: number;
  ausgabenTotalCents: number;
  // Zusammenzug
  einnahmenCents: number;
  gewinnVerlustCents: number;
  umsatzBuchhaltungCents: number;
  // Quercheck Abendkasse vs. Eintritte Abendkasse
  kassenDifferenzCents: number;
}

export function berechneAbrechnung(
  d: AbrechnungDaten,
  gagenActsCents: number,
  sonstigeCents: number,
): AbrechnungBerechnet {
  const n = (v: number | null) => v ?? 0;

  const akKarten = n(d.akKartenCents);
  const kartenTotal = n(d.kartenTotalCents);
  const barKarten = kartenTotal - akKarten;

  const barUmsatz = n(d.barEndCents) - n(d.barAnfangCents) + barKarten;
  const warenkosten = Math.round((barUmsatz * WARENKOSTEN_PROZENT) / 100);
  const barGewinn = barUmsatz - warenkosten;

  const akGewinnKasse = n(d.akEndCents) - n(d.akAnfangCents);
  const akTotal = akGewinnKasse + akKarten;

  const twint = n(d.twintCents);
  const gebuehr = Math.round(((kartenTotal + twint) * GEBUEHR_PROZENT) / 100);
  const sumupTotal = kartenTotal + twint - gebuehr;

  const summe = (stufen: EintrittsStufe[]) => stufen.reduce((s, e) => s + e.preisCents * e.anzahl, 0);
  const anzahl = (stufen: EintrittsStufe[]) => stufen.reduce((s, e) => s + e.anzahl, 0);
  const vvkTotal = summe(d.eintritteVvk);
  const akEintritteTotal = summe(d.eintritteAk);
  const eintritteGewinn = vvkTotal + akEintritteTotal;

  const mieteTotal = d.miete.reduce((s, m) => s + m.preisCents, 0);

  const gagenTotal = gagenActsCents + d.gagenManuell.reduce((s, g) => s + g.preisCents, 0);
  const ausgabenTotal = gagenTotal + sonstigeCents;

  const einnahmen = barGewinn + eintritteGewinn + mieteTotal;

  return {
    barKartenCents: barKarten,
    barUmsatzCents: barUmsatz,
    warenkostenCents: warenkosten,
    barGewinnCents: barGewinn,
    akGewinnKasseCents: akGewinnKasse,
    akTotalCents: akTotal,
    gebuehrCents: gebuehr,
    sumupTotalCents: sumupTotal,
    vvkTotalCents: vvkTotal,
    vvkAnzahl: anzahl(d.eintritteVvk),
    akEintritteTotalCents: akEintritteTotal,
    akEintritteAnzahl: anzahl(d.eintritteAk),
    eintritteGewinnCents: eintritteGewinn,
    eintritteAnzahl: anzahl(d.eintritteVvk) + anzahl(d.eintritteAk),
    mieteTotalCents: mieteTotal,
    gagenTotalCents: gagenTotal,
    sonstigeTotalCents: sonstigeCents,
    ausgabenTotalCents: ausgabenTotal,
    einnahmenCents: einnahmen,
    gewinnVerlustCents: einnahmen - ausgabenTotal,
    umsatzBuchhaltungCents: barUmsatz + akGewinnKasse,
    kassenDifferenzCents: akTotal - akEintritteTotal,
  };
}
