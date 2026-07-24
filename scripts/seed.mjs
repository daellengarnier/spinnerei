// Idempotenter Seed: legt pro Anlass eine Start-Ressortstruktur an.
// KEINE Benutzerkonten – die Leute registrieren sich selbst (eigene E-Mail +
// Passwort), der erste Account wird Admin.
// Wird im Entrypoint nach der Migration ausgeführt. Manuell: `npm run db:seed`.
import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("[seed] DATABASE_URL fehlt — Seed abgebrochen.");
  process.exit(1);
}

// Volle Struktur fürs Hausfest (aus der hausfest26-App, ohne Programmübersicht/
// Zeitplan — die Programm-Übersicht gibt es in der Spinnerei-App nicht).
const HAUSFEST_RESSORTS = [
  { name: "Acts", farbe: "#d6409f", acts: true, subs: [] },
  { name: "Essen", farbe: "#f97316", subs: [] },
  { name: "Getränke", farbe: "#06b6d4", subs: [] },
  { name: "Technik", farbe: "#64748b", subs: [] },
  { name: "Promo", farbe: "#eab308", subs: [] },
  { name: "Deko", farbe: "#22c55e", subs: [] },
  { name: "Sicherheit & Awareness", farbe: "#ef4444", subs: [] },
  { name: "Finanzen", farbe: "#8b5cf6", finanzen: true, subs: [] },
];

// Schlankes Standard-Set für alle übrigen Anlässe (Konzerte etc.).
const STANDARD_RESSORTS = [
  { name: "Allgemein", farbe: "#c9a84c", subs: [] },
  { name: "Acts", farbe: "#d6409f", acts: true, subs: [] },
  { name: "Bar", farbe: "#06b6d4", subs: [] },
  { name: "Technik", farbe: "#64748b", subs: [] },
  { name: "Finanzen", farbe: "#8b5cf6", finanzen: true, subs: [] },
];

const sql = postgres(url, { max: 1, prepare: false });

try {
  const anlaesse = await sql`SELECT id, slug, name FROM anlaesse ORDER BY datum`;
  for (const anlass of anlaesse) {
    const existing = await sql`SELECT COUNT(*)::int AS c FROM ressorts WHERE "anlassId" = ${anlass.id}`;
    if (existing[0].c > 0) continue;

    const ressorts = anlass.slug === "hausfest" ? HAUSFEST_RESSORTS : STANDARD_RESSORTS;
    await sql.begin(async (tx) => {
      let order = 1;
      for (const r of ressorts) {
        const [row] = await tx`
          INSERT INTO ressorts ("anlassId", name, beschreibung, farbe, reihenfolge, "hatZeitplan", "hatFinanzen", "hatActs")
          VALUES (${anlass.id}, ${r.name}, ${""}, ${r.farbe}, ${order++}, false, ${r.finanzen ?? false}, ${r.acts ?? false})
          RETURNING id`;
        let sOrder = 1;
        for (const sub of r.subs) {
          await tx`INSERT INTO sub_ressorts ("ressortId", name, reihenfolge) VALUES (${row.id}, ${sub}, ${sOrder++})`;
        }
      }
    });
    console.log(`[seed] Ressorts für „${anlass.name}" angelegt (${ressorts.length}).`);
  }
  console.log("[seed] Fertig.");
} catch (err) {
  console.error("[seed] Fehler:", err);
  process.exitCode = 1;
} finally {
  await sql.end({ timeout: 5 });
}
