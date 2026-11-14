-- Standard-Checkliste für Anlässe (Vorlage, im Admin bearbeitbar).
-- Nur befüllen, wenn die Vorlage noch leer ist.
INSERT INTO "checkliste_vorlage" ("phase", "gruppe", "titel", "beschreibung", "reihenfolge")
SELECT v.phase, v.gruppe, v.titel, v.beschreibung, v.reihenfolge
FROM (VALUES
  ('vorbereitung', 'Organisation', 'Schichten besetzen', '', 10),
  ('vorbereitung', 'Organisation', 'Materialbestand prüfen und einkaufen', 'Eis, Zitronen, Kartonbecher, WC-Papier, Seife, Ohrstöpsel', 20),
  ('vorbereitung', 'Organisation', 'Kartenlesegerät und PETZI-Scanner laden', '', 30),
  ('vorbereitung', 'Putzen und Aufräumen', 'Recycling entsorgen', '', 40),
  ('vorbereitung', 'Putzen und Aufräumen', 'WC putzen', 'Abfall leeren, WC-Papier und Seife auffüllen', 50),
  ('vorbereitung', 'Putzen und Aufräumen', 'Backstage aufräumen und putzen', '', 60),
  ('vorbereitung', 'Putzen und Aufräumen', 'Bar aufräumen und putzen', '', 70),
  ('vorbereitung', 'Putzen und Aufräumen', 'Überall staubsaugen', '', 80),
  ('vorbereitung', 'Putzen und Aufräumen', 'Boden aufnehmen', '', 90),
  ('vorbereitung', 'Putzen und Aufräumen', 'Alle Abfallsäcke wechseln', '', 100),
  ('vorbereitung', 'Einrichten', 'Notausgänge Pyramide freiräumen', '', 110),
  ('vorbereitung', 'Einrichten', 'Eingang einrichten und freiräumen', '', 120),
  ('vorbereitung', 'Einrichten', 'Garderobe einrichten und freiräumen', '', 130),
  ('vorbereitung', 'Einrichten', 'Vorplatz einrichten', 'Feuerschale vorbereiten, Aschenbecher aufstellen', 140),
  ('vorbereitung', 'Einrichten', 'Aussenbeleuchtung einrichten', '', 150),
  ('vorbereitung', 'Einrichten', 'Chillout einrichten', '', 160),
  ('vorbereitung', 'Einrichten', 'Kühlschränke und Kühlschubladen auffüllen', '', 170),
  ('vorbereitung', 'Einrichten', 'Bar einrichten', '', 180),
  ('vorbereitung', 'Einrichten', 'Backstage-Verpflegung bereitstellen', 'Getränke kühlstellen, Snacks vorbereiten', 190),
  ('vorbereitung', 'Einrichten', 'Gästezimmer vorbereiten (falls benötigt)', '', 200),
  ('vorbereitung', 'Einlass und Kasse', 'Kassen vorbereiten', '', 210),
  ('vorbereitung', 'Einlass und Kasse', 'Einlass einrichten', 'PETZI einrichten, Strichliliste bereitlegen', 220),
  ('vorbereitung', 'Lüftung und Brandmeldeanlage', 'Lüftung einschalten', '', 230),
  ('vorbereitung', 'Lüftung und Brandmeldeanlage', 'Brandmeldeanlage umschalten', '', 240),
  ('nachbereitung', 'Direkt nach dem Anlass', 'Becher usw. abwaschen', '', 250),
  ('nachbereitung', 'Direkt nach dem Anlass', 'Gläserspülmaschine reinigen und ausschalten', '', 260),
  ('nachbereitung', 'Direkt nach dem Anlass', 'Feuer löschen', '', 270),
  ('nachbereitung', 'Direkt nach dem Anlass', 'Lüftung ausschalten', '', 280),
  ('nachbereitung', 'Direkt nach dem Anlass', 'Brandmeldeanlage zurückschalten', '', 290),
  ('nachbereitung', 'Direkt nach dem Anlass', 'Licht löschen', '', 300),
  ('nachbereitung', 'Nach dem Anlass, spätestens am Folgetag', 'Getränke und Abfall einsammeln', '', 310),
  ('nachbereitung', 'Nach dem Anlass, spätestens am Folgetag', 'Kassen abrechnen', '', 320),
  ('nachbereitung', 'Nach dem Anlass, spätestens am Folgetag', 'Vorplatz und Eingang aufräumen', '', 330),
  ('nachbereitung', 'Am Folgetag', 'Gästezimmer aufräumen (falls benötigt)', '', 340)
) AS v(phase, gruppe, titel, beschreibung, reihenfolge)
WHERE NOT EXISTS (SELECT 1 FROM "checkliste_vorlage");
