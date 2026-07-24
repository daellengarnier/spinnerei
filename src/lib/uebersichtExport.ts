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

// PDF der Saison-Übersicht — clientseitig mit jsPDF (Standard-Helvetica).
export async function pdfHerunterladen(anlaesse: UebersichtAnlass[]) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const links = 20;
  const rechts = 190;
  let y = 22;

  const neueSeiteFalls = (platz: number) => {
    if (y + platz > 280) {
      doc.addPage();
      y = 22;
    }
  };

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("Spinnerei — Übersicht alle Anlässe", links, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text(`Stand: ${new Date().toLocaleDateString("de-CH")}`, links, y);
  doc.setTextColor(0);
  y += 10;

  for (const a of anlaesse) {
    neueSeiteFalls(24);
    doc.setDrawColor(180);
    doc.line(links, y - 4, rechts, y - 4);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text(a.name, links, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const zugangLabel = a.zugang === "privat" ? "Privat" : a.zugang === "oeffentlich" ? "Öffentlich" : "";
    const kopfInfos = [formatDate(a.datum), a.art, a.stichwort, zugangLabel].filter(Boolean).join("  ·  ");
    y += 5.5;
    doc.text(kopfInfos, links, y);

    const zeiten = [
      a.tueroeffnung && `Türöffnung ${a.tueroeffnung}`,
      a.essen && `Essen ${a.essen}`,
      a.ende && `Ende ${a.ende}${istFolgetag(a.tueroeffnung, a.ende) ? " (Folgetag)" : ""}`,
    ].filter(Boolean);
    if (zeiten.length > 0) {
      y += 5;
      doc.setTextColor(100);
      doc.text(zeiten.join("  ·  "), links, y);
      doc.setTextColor(0);
    }

    if (a.acts.length > 0) {
      y += 3;
      for (const act of a.acts) {
        neueSeiteFalls(6);
        y += 5;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        const zeit = act.showtime ? `${act.showtime}  ` : "";
        doc.text(`${zeit}${act.name || "Unbenannter Act"}`, links + 4, y);
        const detail = [act.genre, act.herkunft].filter(Boolean).join(" · ");
        if (detail) {
          doc.setFont("helvetica", "normal");
          doc.setTextColor(100);
          doc.text(detail, rechts, y, { align: "right" });
          doc.setTextColor(0);
        }
      }
    }
    y += 10;
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
export function icsHerunterladen(anlaesse: UebersichtAnlass[]) {
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
  link.download = "Spinnerei_Anlaesse.ics";
  link.click();
  URL.revokeObjectURL(url);
}
