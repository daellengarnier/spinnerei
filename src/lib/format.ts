const WOCHENTAGE = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];
const MONATE = [
  "Januar",
  "Februar",
  "März",
  "April",
  "Mai",
  "Juni",
  "Juli",
  "August",
  "September",
  "Oktober",
  "November",
  "Dezember",
];

// datum kommt als "YYYY-MM-DD" aus der DB
export function parseDatum(datum: string) {
  const [jahr, monat, tag] = datum.split("-").map(Number);
  return { jahr, monat, tag, date: new Date(jahr, monat - 1, tag) };
}

export function formatDatumLang(datum: string) {
  const { jahr, monat, tag, date } = parseDatum(datum);
  return `${WOCHENTAGE[date.getDay()]}, ${tag}. ${MONATE[monat - 1]} ${jahr}`;
}

export function datumTeile(datum: string) {
  const { monat, tag, date } = parseDatum(datum);
  return {
    wochentag: WOCHENTAGE[date.getDay()],
    tag: String(tag).padStart(2, "0"),
    monat: MONATE[monat - 1].slice(0, 3),
  };
}

export function istVorbei(datum: string) {
  const { date } = parseDatum(datum);
  const heute = new Date();
  heute.setHours(0, 0, 0, 0);
  return date < heute;
}
