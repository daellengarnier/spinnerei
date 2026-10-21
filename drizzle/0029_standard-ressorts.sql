-- Anlässe ohne Ressorts (über die API angelegt) bekommen die Standard-Ressorts,
-- gleiche Liste wie src/lib/standardRessorts.ts.
INSERT INTO "ressorts" ("anlassId", "name", "beschreibung", "farbe", "reihenfolge", "hatZeitplan", "hatFinanzen", "hatActs")
SELECT a."id", s.name, '', s.farbe, s.reihenfolge, false, s.fin, s.acts
FROM "anlaesse" a
CROSS JOIN (VALUES
  ('Acts', '#d6409f', 1, false, true),
  ('Bar', '#06b6d4', 2, false, false),
  ('Essen', '#f97316', 3, false, false),
  ('Licht', '#84cc16', 4, false, false),
  ('Ton', '#64748b', 5, false, false),
  ('Promo', '#eab308', 6, false, false),
  ('Sicherheit', '#ef4444', 7, false, false),
  ('Finanzen', '#8b5cf6', 8, true, false)
) AS s(name, farbe, reihenfolge, fin, acts)
WHERE NOT EXISTS (SELECT 1 FROM "ressorts" r WHERE r."anlassId" = a."id");
