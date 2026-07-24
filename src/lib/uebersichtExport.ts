// Export der Saison-Übersicht: PDF (jsPDF) und Kalender (.ics).
// Wird von der Anlässe-Startseite aus aufgerufen.
import { formatDate, istFolgetag } from "@/lib/uiUtil";

export interface UebersichtAct {
  name: string;
  typ: string;
  genre: string;
  herkunft: string;
  showtime: string;
}

export interface UebersichtAnlass {
  id: number;
  name: string;
  datum: string;
  art: string;
  stichwort: string;
  zugang: string;
  tueroeffnung: string;
  essen: string;
  ende: string;
  petzilink: string;
  acts: UebersichtAct[];
}

// PDF der Saison-Übersicht im App-Stil: dunkler Grund, Karten,
// Gold-Akzente, Uppercase-Titel (clientseitig mit jsPDF, Helvetica).
// Unicode-Schrift einbetten (Liberation Sans, Helvetica-kompatibel) — die
// eingebaute Helvetica kann kein Latin Extended (z. B. Ō in «TŌ YŌ»).
async function ladeFont(doc: { addFileToVFS: (n: string, d: string) => void; addFont: (f: string, n: string, s: string) => void }, datei: string, stil: "normal" | "bold") {
  const res = await fetch(`/fonts/${datei}`);
  const buf = await res.arrayBuffer();
  let bin = "";
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < bytes.length; i += 8192) bin += String.fromCharCode(...bytes.subarray(i, i + 8192));
  doc.addFileToVFS(datei, btoa(bin));
  doc.addFont(datei, "Sans", stil);
}

export async function pdfHerunterladen(anlaesse: UebersichtAnlass[]) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  await ladeFont(doc, "LiberationSans-Regular.ttf", "normal");
  await ladeFont(doc, "LiberationSans-Bold.ttf", "bold");

  const GOLD: [number, number, number] = [201, 168, 76];
  const INK: [number, number, number] = [240, 240, 240];
  const DIM: [number, number, number] = [153, 153, 153];
  const BG: [number, number, number] = [10, 10, 10];
  const KARTE: [number, number, number] = [20, 20, 20];
  const LINIE: [number, number, number] = [42, 42, 42];

  const links = 14;
  const rechts = 196;
  const breite = rechts - links;
  let y = 0;

  const seiteFuellen = () => {
    doc.setFillColor(...BG);
    doc.rect(0, 0, 210, 297, "F");
  };
  const neueSeiteFalls = (platz: number) => {
    if (y + platz > 285) {
      doc.addPage();
      seiteFuellen();
      y = 16;
    }
  };

  seiteFuellen();
  y = 20;
  doc.setFont("Sans", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...DIM);
  doc.setCharSpace(1.2);
  doc.text("SPINNEREI — ORGA", links, y);
  doc.setCharSpace(0);
  y += 8;
  doc.setFontSize(19);
  doc.setTextColor(...INK);
  doc.text("ÜBERSICHT ALLE ANLÄSSE", links, y);
  doc.setFont("Sans", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...DIM);
  doc.text(`Stand: ${new Date().toLocaleDateString("de-CH")}`, rechts, y, { align: "right" });
  y += 8;

  for (const a of anlaesse) {
    const zugangLabel = a.zugang === "privat" ? "PRIVAT" : a.zugang === "oeffentlich" ? "ÖFFENTLICH" : "";
    const chips = [a.art?.toUpperCase(), a.stichwort?.toUpperCase(), zugangLabel].filter(Boolean) as string[];
    const zeiten = [
      a.tueroeffnung && `Türöffnung ${a.tueroeffnung}`,
      a.essen && `Essen ${a.essen}`,
      a.ende && `Ende ${a.ende}${istFolgetag(a.tueroeffnung, a.ende) ? " (Folgetag)" : ""}`,
      a.petzilink && "Petzi vorhanden",
    ].filter(Boolean) as string[];

    // Kartenhöhe vorausberechnen: Kopf 14, Zeitenzeile 6, Acts (Trennlinie 3 + n·6), Abschluss 4.
    const hoehe = 14 + (zeiten.length > 0 ? 6 : 0) + (a.acts.length > 0 ? 4 + a.acts.length * 6 : 0) + 4;
    neueSeiteFalls(hoehe + 5);

    // Karte
    doc.setFillColor(...KARTE);
    doc.setDrawColor(...LINIE);
    doc.rect(links, y, breite, hoehe, "FD");

    // Gold-Marker + Name
    let cy = y + 9;
    doc.setFillColor(...GOLD);
    doc.rect(links + 5, cy - 4.2, 1.6, 5.2, "F");
    doc.setFont("Sans", "bold");
    doc.setFontSize(12.5);
    doc.setTextColor(...INK);
    doc.setCharSpace(0.4);
    doc.text(a.name.toUpperCase(), links + 9.5, cy);
    doc.setCharSpace(0);

    // Chips rechts vom Namen? Platzsparend: Chips rechtsbündig auf Kopfzeile.
    if (chips.length > 0) {
      doc.setFont("Sans", "bold");
      doc.setFontSize(6.5);
      let cx = rechts - 5;
      for (const chip of [...chips].reverse()) {
        const w = doc.getTextWidth(chip) + 4;
        cx -= w;
        doc.setFillColor(...LINIE);
        doc.rect(cx, cy - 3.6, w, 5, "F");
        doc.setTextColor(...(chip === a.stichwort?.toUpperCase() ? GOLD : DIM));
        doc.text(chip, cx + 2, cy - 0.2);
        cx -= 2;
      }
    }

    // Datum
    cy += 5.5;
    doc.setFont("Sans", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...DIM);
    doc.text(formatDate(a.datum), links + 9.5, cy);

    // Zeiten
    if (zeiten.length > 0) {
      cy += 6;
      doc.setFontSize(8.5);
      doc.setTextColor(...DIM);
      doc.text(zeiten.join("   ·   "), links + 9.5, cy);
    }

    // Acts
    if (a.acts.length > 0) {
      cy += 3.5;
      doc.setDrawColor(...LINIE);
      doc.line(links + 5, cy, rechts - 5, cy);
      for (const act of a.acts) {
        cy += 6;
        doc.setFontSize(9.5);
        let ax = links + 9.5;
        if (act.showtime) {
          doc.setFont("Sans", "bold");
          doc.setTextColor(...GOLD);
          doc.text(act.showtime, ax, cy);
          ax += doc.getTextWidth(act.showtime) + 3;
        }
        doc.setFont("Sans", "bold");
        doc.setTextColor(...INK);
        doc.text(act.name || "Unbenannter Act", ax, cy);
        const detail = [act.genre, act.herkunft].filter(Boolean).join(" · ");
        if (detail) {
          doc.setFont("Sans", "normal");
          doc.setFontSize(8.5);
          doc.setTextColor(...DIM);
          doc.text(detail, rechts - 5, cy, { align: "right" });
        }
      }
    }

    y += hoehe + 4;
  }

  doc.save(`Spinnerei_Anlaesse_${new Date().toISOString().slice(0, 10)}.pdf`);
}


// Text für ICS escapen (Komma, Semikolon, Zeilenumbrüche).
const icsText = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
const icsDatum = (datum: string) => datum.replace(/-/g, "");
const icsZeit = (datum: string, zeit: string, plusTage = 0) => {
  const d = new Date(`${datum}T00:00:00`);
  d.setDate(d.getDate() + plusTage);
  const iso = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  return `${iso}T${zeit.replace(":", "")}00`;
};

// Alle Anlässe als Kalenderdatei (.ics) — Zeiten als lokale Zeit (Schweiz).
export function icsHerunterladen(anlaesse: UebersichtAnlass[], dateiname = "Spinnerei_Anlaesse.ics") {
  const stamp = new Date().toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z";
  const zeilen: string[] = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Spinnerei//Orga//DE", "CALSCALE:GREGORIAN"];
  for (const a of anlaesse) {
    const zugangLabel = a.zugang === "privat" ? "Privat" : a.zugang === "oeffentlich" ? "Öffentlich" : "";
    const beschreibung = [
      [a.art, a.stichwort, zugangLabel].filter(Boolean).join(" · "),
      a.essen && `Essen ${a.essen}`,
      ...a.acts.map((x) => `${x.showtime ? x.showtime + " " : ""}${x.name}${x.genre || x.herkunft ? ` (${[x.genre, x.herkunft].filter(Boolean).join(", ")})` : ""}`),
    ]
      .filter(Boolean)
      .join("\n");
    zeilen.push("BEGIN:VEVENT", `UID:anlass-${a.id}@spinnerei.al-daellen.ch`, `DTSTAMP:${stamp}`, `SUMMARY:${icsText(a.name)}`);
    if (a.tueroeffnung) {
      zeilen.push(`DTSTART:${icsZeit(a.datum, a.tueroeffnung)}`);
      if (a.ende) zeilen.push(`DTEND:${icsZeit(a.datum, a.ende, istFolgetag(a.tueroeffnung, a.ende) ? 1 : 0)}`);
    } else {
      // Ohne Türöffnung: Ganztages-Eintrag.
      zeilen.push(`DTSTART;VALUE=DATE:${icsDatum(a.datum)}`);
    }
    if (beschreibung) zeilen.push(`DESCRIPTION:${icsText(beschreibung)}`);
    if (a.petzilink) zeilen.push(`URL:${a.petzilink}`);
    zeilen.push("END:VEVENT");
  }
  zeilen.push("END:VCALENDAR");

  const blob = new Blob([zeilen.join("\r\n") + "\r\n"], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = dateiname;
  link.click();
  URL.revokeObjectURL(url);
}
