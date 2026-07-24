// Läuft einmal beim Serverstart (Next.js Instrumentation).
// Startet den stündlichen Check für die Abendverantwortungs-Erinnerungen:
// 30 und 14 Tage vor einem Anlass bekommt die AV eine Nachfrage, ob alles läuft.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { avReminderCheck } = await import("@/lib/avReminder");

  const lauf = () =>
    avReminderCheck().catch((err) => console.error("[av-reminder] Fehler:", err));

  // Beim Start einmal, danach stündlich (Dedupe passiert im Check selbst).
  setTimeout(lauf, 15_000);
  setInterval(lauf, 60 * 60 * 1000);
}
