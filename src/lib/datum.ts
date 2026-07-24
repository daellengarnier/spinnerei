// Server-taugliche Datums-Helfer (ohne Client-Abhängigkeiten).

// 'YYYY-MM-DD' → 'Sa, 05.09.2026'
export function formatDatumKurz(datum: string): string {
  const [j, m, t] = datum.split("-").map(Number);
  const wt = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"][new Date(j, (m ?? 1) - 1, t ?? 1).getDay()] ?? "";
  return `${wt}, ${String(t).padStart(2, "0")}.${String(m).padStart(2, "0")}.${j}`;
}

// Heute (lokal) plus N Tage als 'YYYY-MM-DD'.
export function heutePlusTage(tage: number): string {
  const d = new Date();
  d.setDate(d.getDate() + tage);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
