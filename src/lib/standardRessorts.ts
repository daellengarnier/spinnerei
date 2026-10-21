// Standard-Ressorts, die jeder neue Anlass bekommt (wie Soirée Tropicale).
// Gleiche Liste in drizzle/0029_standard-ressorts.sql für bestehende Anlässe ohne Ressorts.
export const STANDARD_RESSORTS = [
  { name: "Acts", farbe: "#d6409f", hatActs: true },
  { name: "Bar", farbe: "#06b6d4" },
  { name: "Essen", farbe: "#f97316" },
  { name: "Licht", farbe: "#84cc16" },
  { name: "Ton", farbe: "#64748b" },
  { name: "Promo", farbe: "#eab308" },
  { name: "Sicherheit", farbe: "#ef4444" },
  { name: "Finanzen", farbe: "#8b5cf6", hatFinanzen: true },
] as const;
