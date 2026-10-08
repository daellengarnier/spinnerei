// Menüwahl fürs Essen am Anlass (Acts & Crew): Anzahl Personen pro Menü.
export const MENUS = [
  { key: "fleisch", label: "Fleisch" },
  { key: "vegi", label: "Vegi" },
  { key: "vegan", label: "Vegan" },
] as const;

export type MenuKey = (typeof MENUS)[number]["key"];
export type Menu = Record<MenuKey, number | null>;

export const menuSumme = (m: Menu) => MENUS.reduce((s, x) => s + (m[x.key] ?? 0), 0);

// „2 Fleisch, 1 Vegi" — nur Menüs mit Anzahl.
export const menuText = (m: Menu) =>
  MENUS.filter((x) => m[x.key])
    .map((x) => `${m[x.key]} ${x.label}`)
    .join(", ");
