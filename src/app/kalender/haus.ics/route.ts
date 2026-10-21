import { asc, gte } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { anlaesse } from "@/lib/db/schema";
import { istFolgetag } from "@/lib/uiUtil";

// Öffentliches Kalender-Abo (iCal) fürs Haus: alle Anlässe inkl. privater
// Vermietungen, damit die Bewohnenden wissen, wann in der Spinnerei etwas läuft.
// Kein Login. Private Anlässe erscheinen nur als "Private Veranstaltung",
// ohne Namen oder Details.

export const dynamic = "force-dynamic";

const VTIMEZONE = [
  "BEGIN:VTIMEZONE",
  "TZID:Europe/Zurich",
  "BEGIN:DAYLIGHT",
  "TZOFFSETFROM:+0100",
  "TZOFFSETTO:+0200",
  "TZNAME:CEST",
  "DTSTART:19700329T020000",
  "RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU",
  "END:DAYLIGHT",
  "BEGIN:STANDARD",
  "TZOFFSETFROM:+0200",
  "TZOFFSETTO:+0100",
  "TZNAME:CET",
  "DTSTART:19701025T030000",
  "RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU",
  "END:STANDARD",
  "END:VTIMEZONE",
];

function escape(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

// Zeilen nach RFC 5545 auf 75 Oktette falten.
function fold(line: string): string {
  const bytes = Buffer.from(line, "utf8");
  if (bytes.length <= 75) return line;
  const parts: string[] = [];
  let current = "";
  let size = 0;
  for (const ch of line) {
    const len = Buffer.byteLength(ch, "utf8");
    if (size + len > (parts.length ? 74 : 75)) {
      parts.push(current);
      current = "";
      size = 0;
    }
    current += ch;
    size += len;
  }
  parts.push(current);
  return parts.join("\r\n ");
}

function datumPlusTage(datum: string, tage: number): string {
  const d = new Date(`${datum}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + tage);
  return d.toISOString().slice(0, 10);
}

const kompakt = (datum: string) => datum.replace(/-/g, "");
const zeit = (hhmm: string) => `${hhmm.replace(":", "")}00`;
const istZeit = (s: string) => /^\d{2}:\d{2}$/.test(s);

export async function GET() {
  const db = getDb();
  const ab = datumPlusTage(new Date().toISOString().slice(0, 10), -60);
  const list = await db
    .select()
    .from(anlaesse)
    .where(gte(anlaesse.datum, ab))
    .orderBy(asc(anlaesse.datum), asc(anlaesse.id));

  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Spinnerei Bern//Haus-Kalender//DE",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:Spinnerei Anlässe",
    "X-WR-TIMEZONE:Europe/Zurich",
    "REFRESH-INTERVAL;VALUE=DURATION:PT6H",
    "X-PUBLISHED-TTL:PT6H",
    ...VTIMEZONE,
  ];

  for (const a of list) {
    const privat = a.zugang === "privat";
    const summary = privat ? "Spinnerei: Private Veranstaltung" : `Spinnerei: ${a.name}`;
    const beschreibung = privat ? "Private Vermietung, nicht öffentlich." : [a.art, "https://kulturspinnerei.ch"].filter(Boolean).join("\n");

    lines.push("BEGIN:VEVENT", `UID:anlass-${a.id}@spinnerei.al-daellen.ch`, `DTSTAMP:${stamp}`);
    const start = istZeit(a.tueroeffnung) ? a.tueroeffnung : "";
    const ende = istZeit(a.ende) ? a.ende : "";
    if (start) {
      lines.push(`DTSTART;TZID=Europe/Zurich:${kompakt(a.datum)}T${zeit(start)}`);
      if (ende) {
        const endDatum = istFolgetag(start, ende) ? datumPlusTage(a.datum, 1) : a.datum;
        lines.push(`DTEND;TZID=Europe/Zurich:${kompakt(endDatum)}T${zeit(ende)}`);
      }
    } else {
      // Ohne Türöffnung: ganztägig, Endzeit in der Beschreibung.
      lines.push(`DTSTART;VALUE=DATE:${kompakt(a.datum)}`, `DTEND;VALUE=DATE:${kompakt(datumPlusTage(a.datum, 1))}`);
    }
    const text = !start && ende ? `${beschreibung}\nEnde: ${ende}`.trim() : beschreibung;
    lines.push(`SUMMARY:${escape(summary)}`, "LOCATION:Spinnerei\\, Spinnereiweg 17\\, 3004 Bern");
    if (text) lines.push(`DESCRIPTION:${escape(text)}`);
    lines.push("END:VEVENT");
  }
  lines.push("END:VCALENDAR");

  return new Response(lines.map(fold).join("\r\n") + "\r\n", {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="spinnerei-haus.ics"',
      "Cache-Control": "public, max-age=900",
    },
  });
}
