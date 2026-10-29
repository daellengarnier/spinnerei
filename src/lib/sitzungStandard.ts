// Fester Ablauf jeder Vereinssitzung. Diese Punkte gibt es immer; in der
// Vorschau der nächsten Sitzung stehen sie nur als eine Zeile, aufgelistet
// werden die zusätzlich eingetragenen Traktanden. Bestehende Traktanden mit
// diesen Namen bleiben erhalten (fürs Protokoll) — sie werden nur dort nicht
// nochmals aufgeführt.
export const STANDARD_TRAKTANDEN = [
  { label: "Befindlichkeitsrunde", muster: /^befindlichkeit/i },
  { label: "Pendenzen", muster: /^pendenzen/i },
  { label: "Rückblick", muster: /^rückblick/i },
  { label: "Ausblick", muster: /^(ausblick|nächste anlässe)/i },
  { label: "Varia", muster: /^varia\b/i },
] as const;

export const istStandardTraktandum = (text: string) => STANDARD_TRAKTANDEN.some((s) => s.muster.test(text.trim()));
