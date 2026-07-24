// Kalender-Export (.ics) der Anlässe — von der Anlässe-Startseite aufgerufen.
import { istFolgetag } from "@/lib/uiUtil";

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
