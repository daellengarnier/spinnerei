-- «Licht & Ton» pro Anlass in zwei Ressorts «Licht» und «Ton» aufteilen.
-- Das bestehende Ressort wird zu «Licht» (behält Todos etc.), «Ton» kommt
-- direkt dahinter; nachfolgende Ressorts rücken eins nach hinten.
UPDATE "ressorts" r SET "reihenfolge" = r."reihenfolge" + 1
WHERE EXISTS (
  SELECT 1 FROM "ressorts" lt
  WHERE lt."anlassId" = r."anlassId" AND lt."name" = 'Licht & Ton' AND r."reihenfolge" > lt."reihenfolge"
);--> statement-breakpoint
INSERT INTO "ressorts" ("anlassId", "name", "beschreibung", "farbe", "reihenfolge", "hatZeitplan", "hatFinanzen", "hatActs")
SELECT "anlassId", 'Ton', '', '#64748b', "reihenfolge" + 1, false, false, false
FROM "ressorts" WHERE "name" = 'Licht & Ton';--> statement-breakpoint
UPDATE "ressorts" SET "name" = 'Licht', "farbe" = '#84cc16' WHERE "name" = 'Licht & Ton';
