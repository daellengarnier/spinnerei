-- Anlass Super Jet Kinoko, 11.06.2027. Bestätigt per Mail von Luca Landi (Annibale Booking), 16.11.2026:
-- Gage 2000 EUR, Unterkunft und Catering. Gleicher Aufbau wie POST /api/anlaesse
-- (Standard-Ressorts, Checkliste aus der Vorlage), plus der Act im Ressort Acts.
-- Läuft nur, wenn es den Anlass noch nicht gibt.
DO $$
DECLARE
  aid integer;
  rid integer;
BEGIN
  IF EXISTS (SELECT 1 FROM anlaesse WHERE slug = 'super-jet-kinoko') THEN
    RETURN;
  END IF;

  INSERT INTO anlaesse (slug, name, datum, art)
  VALUES ('super-jet-kinoko', 'Super Jet Kinoko', '2027-06-11', 'Konzert')
  RETURNING id INTO aid;

  INSERT INTO ressorts ("anlassId", name, farbe, reihenfolge, "hatActs", "hatFinanzen")
  VALUES
    (aid, 'Acts', '#d6409f', 1, true, false),
    (aid, 'Bar', '#06b6d4', 2, false, false),
    (aid, 'Essen', '#f97316', 3, false, false),
    (aid, 'Licht', '#84cc16', 4, false, false),
    (aid, 'Ton', '#64748b', 5, false, false),
    (aid, 'Promo', '#eab308', 6, false, false),
    (aid, 'Sicherheit', '#ef4444', 7, false, false),
    (aid, 'Finanzen', '#8b5cf6', 8, false, true);

  INSERT INTO checkliste_punkte ("anlassId", phase, gruppe, titel, beschreibung, reihenfolge)
  SELECT aid, phase, gruppe, titel, beschreibung, reihenfolge
  FROM checkliste_vorlage
  ORDER BY reihenfolge, id;

  SELECT id INTO rid FROM ressorts WHERE "anlassId" = aid AND "hatActs" LIMIT 1;
  INSERT INTO acts ("ressortId", name, typ, genre, herkunft, uebernachtung, notiz)
  VALUES (
    rid, 'Super Jet Kinoko', 'band', 'Psych Trance', 'Japan', true,
    'Agentur: Annibale Booking, Luca Landi (luca@annibale.eu). Deal laut Mail vom 16.11.2026: Gage 2000 EUR, dazu Unterkunft und Catering. Gage hier noch nicht eingetragen, weil das Feld CHF ist.'
  );
END $$;
