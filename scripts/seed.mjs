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

// Einheitliche Ressort-Struktur für jeden Anlass.
const STANDARD_RESSORTS = [
  { name: "Acts", farbe: "#d6409f", acts: true, subs: [] },
  { name: "Bar", farbe: "#06b6d4", subs: [] },
  { name: "Essen", farbe: "#f97316", subs: [] },
  { name: "Licht", farbe: "#84cc16", subs: [] },
  { name: "Ton", farbe: "#64748b", subs: [] },
  { name: "Promo", farbe: "#eab308", subs: [] },
  { name: "Sicherheit", farbe: "#ef4444", subs: [] },
  { name: "Finanzen", farbe: "#8b5cf6", finanzen: true, subs: [] },
];

// Vereinsressorts im HQ (ohne Anlass-Bezug, anlassId NULL).
const HQ_RESSORTS = [
  { name: "Sitzungen", farbe: "#38bdf8" },
  { name: "Retraite", farbe: "#22c55e" },
  { name: "Revision", farbe: "#a78bfa" },
  { name: "Booking", farbe: "#f472b6" },
];

// Kollektiv-Mitglieder als vorbelegte Profile (claimed=false). Beim
// Registrieren mit exakt diesem Namen übernimmt die Person ihr Profil.
// Bis dahin sind sie bereits als Verantwortliche/Zuständige wählbar.
const KOLLEKTIV = [
  { name: "Ambar", farbe: "#e0685c" },
  { name: "Dällen", farbe: "#c9a84c" },
  { name: "Mike", farbe: "#7a9fe8" },
  { name: "Nina", farbe: "#b06cc4" },
  { name: "Alvi", farbe: "#6fcf7a" },
  { name: "Yves", farbe: "#e8a13c" },
  { name: "Laurin", farbe: "#5cc4c4" },
];

const sql = postgres(url, { max: 1, prepare: false });

try {
  for (const person of KOLLEKTIV) {
    const existing = await sql`SELECT id FROM users WHERE name = ${person.name} LIMIT 1`;
    if (existing[0]) continue;
    await sql`
      INSERT INTO users (name, email, "passwordHash", rolle, "avatarColor", claimed, active)
      VALUES (${person.name}, ${`${person.name.toLowerCase()}@platzhalter.local`}, ${""}, 'mitglied', ${person.farbe}, false, true)`;
    console.log(`[seed] Profil für ${person.name} vorbereitet.`);
  }

  const anlaesse = await sql`SELECT id, slug, name FROM anlaesse ORDER BY datum`;
  for (const anlass of anlaesse) {
    const existing = await sql`SELECT COUNT(*)::int AS c FROM ressorts WHERE "anlassId" = ${anlass.id}`;
    if (existing[0].c > 0) continue;

    const ressorts = STANDARD_RESSORTS;
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
  // HQ-Ressorts (einzeln idempotent, damit neue Einträge später nachrutschen).
  let hqOrder = 0;
  for (const r of HQ_RESSORTS) {
    hqOrder++;
    const existing = await sql`SELECT id FROM ressorts WHERE "anlassId" IS NULL AND name = ${r.name} LIMIT 1`;
    if (existing[0]) continue;
    await sql`
      INSERT INTO ressorts ("anlassId", name, beschreibung, farbe, reihenfolge, "hatZeitplan", "hatFinanzen", "hatActs")
      VALUES (NULL, ${r.name}, ${""}, ${r.farbe}, ${hqOrder}, false, false, false)`;
    console.log(`[seed] HQ-Ressort „${r.name}" angelegt.`);
  }

  console.log("[seed] Fertig.");
} catch (err) {
  console.error("[seed] Fehler:", err);
  process.exitCode = 1;
} finally {
  await sql.end({ timeout: 5 });
}
