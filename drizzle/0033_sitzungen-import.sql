-- Import der letzten Vereinssitzungen aus den Google-Docs-Protokollen
-- (Drive-Ordner «Sitzungen 2026») ins HQ-Ressort «Sitzungen».
-- Pendenzen nur aus der letzten Sitzung (26.10.2026), als Todos mit Zuständigen.
-- Läuft nur, wenn es das Ressort gibt; eine Sitzung, die es am selben Datum
-- schon gibt, wird übersprungen. Personen werden über den Namen gefunden.
DO $do$
DECLARE
  rid integer;
  sid integer;
  autor integer;
  tid integer;
BEGIN
  SELECT id INTO rid FROM ressorts WHERE "anlassId" IS NULL AND "hatSitzungen" = true ORDER BY id LIMIT 1;
  IF rid IS NULL THEN
    RETURN;
  END IF;
  SELECT id INTO autor FROM users WHERE name = 'Ambar' LIMIT 1;

  -- ── Sitzung 06.05.2026 ────────────────────────────────────────────────
  IF NOT EXISTS (SELECT 1 FROM sitzungen WHERE "ressortId" = rid AND datum = '2026-05-06') THEN
    INSERT INTO sitzungen ("ressortId", datum, startzeit, ort, protokoll)
    VALUES (rid, '2026-05-06', '', '', $t$Anwesend: Nina, Ambar, Dällen, Mike
Sitzungsleitung: Ambar · Protokoll: Dällen

Pendenzen aus der letzten Sitzung
• Suisa: Nina und Simä haben die Anlässe seit 2025 erfasst (ohne DJ-Anlässe, dafür gibt es ein eigenes Formular). Nina fragt bei etablierten Orten nach, wie sie es handhaben. Bei der Abrechnung alle Artist-Ausgaben angeben (Gage, Spesen, Essen, Gästezimmer), das ist abziehbar. Für ein Onlinekonto braucht es eine Rechnungsnummer.
• Info-Mail-Eingang: Dällen und Mike.
• Programm-Ideen: Lost in a Detail.
• Plakatdruck: Ambar zeigt Nina die Karte für die Bezahlung.
• Präsidium: Dällen schaut die Aufgaben an und was es für einen Wechsel braucht.

Rückblick
• Soirée Tropicale (25.04.): guter Vibe, finanziell rausgekommen (60 bis 70 Zahlende), evtl. um 21:00 starten.
• Bass Weight (02.05.): guter Vibe, finanziell gut, Leute früh da, coole Crew, Besuch aus dem Haus Felsenau mit viel Freude.

Nächste Anlässe
• 23.05. Los Palms & Natalí: Mike kocht (8 Artists), Dällen filmt und schaut mit Yves fürs Licht, Dällen fragt Alvi fürs Gästezimmer in der Via3. Alle machen nochmals Werbung.

Nächste Saison
• 05.09. Hausfest Via1 (fix, viele Helfende nötig, nicht auf den Flyer), 09.10. TÔ YÔ, 24.10. Kinderparty (Nachmittag), 31.10. Daydance QUM, 06.11. Jugendsession, 07.11. Kitchen, 14.11. Artlu Bubble, 28.11. Soirée Tropicale (Alvi/Mo fragen), 12.12. Mothers Cake und Fancy and the Boys.
• Sturzflug Drum&Bass: lieber Winter/Frühling oder Herbst 2027.
• Anfrage Silvester (privat, ca. 150 Personen): Dällen ruft Dani an.

Varia
• Haus-Felsenau-Bewohnende: Einlass, wenn sie zahlen können. Dällen schreibt Fabienne zurück, fragt nach einer Notfallnummer (Nachtwache) und was «es geht nicht» für uns bedeutet.
• Saisonplakat: Programm bis Mitte Juni fix, damit Judith designen kann.
• GV: in Arbeit.
• Retraite: Vorschlag 18./19. oder 25./26. Juli.
• Programmübersicht erstellen.

Nächste Sitzung: vor der Sommerpause keine mehr.

Originalprotokoll: https://docs.google.com/document/d/1WjuK4sV4RO1idd7TKsiq5YzcSMdBCDH8rQlpoauCBUs/edit$t$)
    RETURNING id INTO sid;
    INSERT INTO traktanden ("sitzungId", text, erledigt, "erstelltVon") VALUES
      (sid, 'Befindlichkeitsrunde', true, autor),
      (sid, 'Pendenzen aus der letzten Sitzung', true, autor),
      (sid, 'Rückblick: Soirée Tropicale und Bass Weight', true, autor),
      (sid, 'Nächste Anlässe: Infos und Verantwortungen', true, autor),
      (sid, 'Nächste Saison', true, autor),
      (sid, 'Varia', true, autor);
  END IF;

  -- ── Sitzung 28.09.2026 ────────────────────────────────────────────────
  IF NOT EXISTS (SELECT 1 FROM sitzungen WHERE "ressortId" = rid AND datum = '2026-09-28') THEN
    INSERT INTO sitzungen ("ressortId", datum, startzeit, ort, protokoll)
    VALUES (rid, '2026-09-28', '', '', $t$Anwesend: Ambar, Dällen, Laurin, Mike, Mara
Sitzungsleitung: Ambar · Protokoll: Ambar

Pendenzen aus der letzten Sitzung
• App: alle haben sie jetzt heruntergeladen.
• Suisa: Frage an Nina, ob sie weitermacht oder abgibt. Offen: was bringt das Onlinekonto, was ist die Rechnungsnummer?
• Info-Mail-Eingang: Dällen und Mike.
• Präsidium: Dällen schaut die Aufgaben an und was es für einen Wechsel braucht.
• GV machen.
• Haus-Felsenau-Bewohnende: Einlass, wenn sie zahlen können. Dällen schreibt Fabienne zurück, fragt nach einer Notfallnummer (Nachtwache) und was «es geht nicht» für uns bedeutet.

Nächste Anlässe
• 09.10. TÔ YÔ: AV Dällen, BV Ambar. Mike ab 18:00, Laurin nicht da. Technik-Support Dällen, Mike organisiert wen zum Kochen, Ambar macht das Gästezimmer, Licht Yves.
• 24.10. Kinderparty «Beats für Gross und Klein», 14:00 bis 17:00: Organisation Mara und Aurelia. DJs Tino, Simä b2b Lucien. Popcorn-/Sirup-Bar und Cüpli-Bar. 5 bis 10 CHF pro Person (Popcorn und Sirup für Kids inbegriffen). Promo: Mara schickt Flyer und Text für Insta, macht Druckwerbung und Quartierchat. Da: Mike, Dällen, Laurin, Ambar. Schichten: 2 h Eingang, 2x 1.5 h Bar. Mara organisiert Snacks. Keine Altersbegrenzung.
• 31.10. Daydance QUM: AV Dällen, BV Ambar. Da: Laurin, Mike. Mike kocht Daal mit Naan. Laurin schaut mit Yves für eine Licht-Einführung.
• 06.11. Jugendsession: BV Ambar. Mike wahrscheinlich nicht da, Laurin schon.
• 07.11. Kitchen, 14.11. Artlu Bubble, 28.11. Soirée Tropicale, 12.12. Mothers Cake und Fancy and the Boys.
• Sturzflug Drum&Bass: lieber Winter/Frühling oder Herbst 2027.

Varia
• Lucien und Päde sind interessiert, ins Kollektiv zu kommen.
• Putzen/Vorbereitung: Ambar macht eine To-do-Liste, Dällen macht dafür einen Abschnitt pro Anlass in der App.

Nächste Sitzung: 26.10., sofern die Neuen können.

Originalprotokoll: https://docs.google.com/document/d/1o3_G96FqLfRpzl_fuHXAwVMqh4UgYYxv0xQ-4eba8Qw/edit$t$)
    RETURNING id INTO sid;
    INSERT INTO traktanden ("sitzungId", text, erledigt, "erstelltVon") VALUES
      (sid, 'Befindlichkeitsrunde', true, autor),
      (sid, 'Pendenzen aus der letzten Sitzung', true, autor),
      (sid, 'Rückblick', true, autor),
      (sid, 'Nächste Anlässe: Infos und Verantwortungen', true, autor),
      (sid, 'Varia: Lucien und Päde, Putzen/Vorbereitung', true, autor);
  END IF;

  -- ── Sitzung 26.10.2026 (mit Pendenzen) ────────────────────────────────
  IF NOT EXISTS (SELECT 1 FROM sitzungen WHERE "ressortId" = rid AND datum = '2026-10-26') THEN
    INSERT INTO sitzungen ("ressortId", datum, startzeit, ort, protokoll)
    VALUES (rid, '2026-10-26', '', '', $t$Anwesend: Ambar, Dällen, Laurin, Päde, Lucien, Nina, Mike
Sitzungsleitung: Ambar · Protokoll: Ambar

Pendenzen aus der letzten Sitzung
• Suisa: Nina macht weiter, bis es eingegroovt ist.
• Info-Mail-Eingang: Dällen betreut ihn jetzt mit Jarvis (KI-Assistenz).
• Präsidium: Bank-Infos wechseln und weiteres anpassen, Dällen schaut mit Simä und Yves.
• GV: für dieses Jahr gemacht.
• Haus-Felsenau-Bewohnende: Einlass, wenn sie zahlen können. Dällen schreibt Fabienne zurück, fragt nach einer Notfallnummer (Nachtwache) und was «es geht nicht» für uns bedeutet.
• To-do-Liste Putzen/Vorbereitung: Ambar macht die Liste, Dällen den Abschnitt pro Anlass in der App.
• Licht-Einführung: Yves für Laurin, am 31.10. zusammen.

Einblick für Lucien und Päde
• Rahmen: etwa 1 Sitzung pro Monat, optimal 1 Retraite mit GV pro Jahr. Etwa alle zwei Wochen ein Anlass. Sommerpause meist Juli bis September, ideal für Retraite und/oder Putzaktion.
• Bedarf in den Ressorts: Deko, Social Media/Werbung, Technik. Dazu Hilfe bei kleinen Vor- und Nachbereitungen (allgemeine To-do-Liste in der App) und Schichten.
• Organisation: Orga-App und Spinnplan.
• Lucien: motiviert für Deko und Technik, vor allem Licht (Interesse, noch ohne Erfahrung), evtl. Social Media.
• Päde: motiviert, aber nicht riesige Kapazität. Social Media, kleinere To-dos, Deko mit Lucien.

Rückblick
• 09.10. TÔ YÔ (Japan)
• 24.10. Kinderparty «Beats für Gross und Klein»

Nächste Anlässe
• 30.10. Reservation Pluto
• 31.10. Daydance QUM: AV Dällen, BV Ambar. Da: Laurin, Mike, Nina, Lucien, Päde. Mike kocht Daal mit Naan (20 Personen). Licht: Laurin mit Yves.
• 06.11. Jugendsession: AV Dällen, BV Ambar. Mike wahrscheinlich nicht da, Laurin (Licht), Nina, Päde. Essen: evtl. zusammen Pizza bestellen.
• 07.11. Kitchen: AV Nina, BV Ambar, Filmen Dällen. Laurin unsicher, Mike, Yves (Licht)? Mike kocht. Die Band will am Nachmittag früh aufstellen und vor dem Soundcheck nochmals Pause machen (direkt mit Bäscht).
• 14.11. Artlu Bubble: AV Dällen, BV Ambar. Da: Lucien, Päde (evtl. später), Nina, Laurin, Mike. Kochen: evtl. Lucien, sonst wen organisieren.
• 28.11. Soirée Tropicale
• 12.12. Mothers Cake und Fancy and the Boys
• Sturzflug Drum&Bass: lieber Winter/Frühling oder Herbst 2027.

Varia
• Booking-Vorschlag von Nina: Tortoise (Dällen schaut).

Nächste Sitzung: 27.11., 20:30 Uhr, kurz sitzen und dann vorbereiten.

Originalprotokoll: https://docs.google.com/document/d/1d1J18_YtSyvRNqDy3Kv6rBNjetzcUEknggjr9Es8Ps0/edit$t$)
    RETURNING id INTO sid;
    INSERT INTO traktanden ("sitzungId", text, erledigt, "erstelltVon") VALUES
      (sid, 'Befindlichkeitsrunde', true, autor),
      (sid, 'Pendenzen aus der letzten Sitzung', true, autor),
      (sid, 'Einblick für Lucien und Päde', true, autor),
      (sid, 'Rückblick: TÔ YÔ und Kinderparty', true, autor),
      (sid, 'Nächste Anlässe: Infos und Verantwortungen', true, autor),
      (sid, 'Varia: Booking-Vorschlag Tortoise', true, autor);

    -- Pendenzen: Todos im Ressort Sitzungen, an dieser Sitzung beschlossen.
    INSERT INTO todos ("ressortId", "sitzungId", titel, beschreibung, "erstelltVon")
    VALUES (rid, sid, 'Suisa weiterführen, bis es eingegroovt ist', '', autor) RETURNING id INTO tid;
    INSERT INTO todo_assignees ("todoId", "userId") SELECT tid, id FROM users WHERE name = 'Nina';

    INSERT INTO todos ("ressortId", "sitzungId", titel, beschreibung, "erstelltVon")
    VALUES (rid, sid, 'Präsidium: Bank-Infos wechseln und weiteres anpassen', 'Zusammen mit Simä und Yves.', autor) RETURNING id INTO tid;
    INSERT INTO todo_assignees ("todoId", "userId") SELECT tid, id FROM users WHERE name = 'Dällen';

    INSERT INTO todos ("ressortId", "sitzungId", titel, beschreibung, "erstelltVon")
    VALUES (rid, sid, 'Haus Felsenau: Fabienne zurückschreiben', 'Einlass, wenn sie zahlen können. Nach einer Notfallnummer (Nachtwache) fragen und klären, was «es geht nicht» für uns bedeutet und mit wem es nicht funktioniert.', autor) RETURNING id INTO tid;
    INSERT INTO todo_assignees ("todoId", "userId") SELECT tid, id FROM users WHERE name = 'Dällen';

    INSERT INTO todos ("ressortId", "sitzungId", titel, beschreibung, "erstelltVon")
    VALUES (rid, sid, 'To-do-Liste für Putzen und Vorbereitung erstellen', '', autor) RETURNING id INTO tid;
    INSERT INTO todo_assignees ("todoId", "userId") SELECT tid, id FROM users WHERE name = 'Ambar';

    INSERT INTO todos ("ressortId", "sitzungId", titel, beschreibung, "erstelltVon")
    VALUES (rid, sid, 'Abschnitt Putzen/Vorbereitung pro Anlass in der App einrichten', 'Für Ambars To-do-Liste.', autor) RETURNING id INTO tid;
    INSERT INTO todo_assignees ("todoId", "userId") SELECT tid, id FROM users WHERE name = 'Dällen';

    INSERT INTO todos ("ressortId", "sitzungId", titel, beschreibung, "fristDatum", "erstelltVon")
    VALUES (rid, sid, 'Licht-Einführung von Yves für Laurin', 'Am 31.10. zusammen anschauen.', '2026-10-31', autor) RETURNING id INTO tid;
    INSERT INTO todo_assignees ("todoId", "userId") SELECT tid, id FROM users WHERE name IN ('Laurin', 'Yves');

    INSERT INTO todos ("ressortId", "sitzungId", titel, beschreibung, "erstelltVon")
    VALUES (rid, sid, 'Booking-Vorschlag Tortoise anschauen', 'Vorschlag von Nina, steht auch im HQ unter Booking.', autor) RETURNING id INTO tid;
    INSERT INTO todo_assignees ("todoId", "userId") SELECT tid, id FROM users WHERE name = 'Dällen';

    -- Tortoise als Booking-Anfrage fürs Stimmungsbild.
    INSERT INTO booking_anfragen ("ressortId", titel, notiz, "erstelltVon")
    SELECT b.id, 'Tortoise', 'Vorschlag von Nina an der Sitzung vom 26.10.2026, Dällen schaut.', (SELECT id FROM users WHERE name = 'Nina' LIMIT 1)
    FROM ressorts b
    WHERE b."anlassId" IS NULL AND b."hatBooking" = true
      AND NOT EXISTS (SELECT 1 FROM booking_anfragen a WHERE a."ressortId" = b.id AND a.titel = 'Tortoise')
    LIMIT 1;
  END IF;

  -- ── Nächste Sitzung 27.11.2026 ────────────────────────────────────────
  IF NOT EXISTS (SELECT 1 FROM sitzungen WHERE "ressortId" = rid AND datum = '2026-11-27') THEN
    INSERT INTO sitzungen ("ressortId", datum, startzeit, ort, protokoll)
    VALUES (rid, '2026-11-27', '20:30', '', '')
    RETURNING id INTO sid;
    INSERT INTO traktanden ("sitzungId", text, "erstelltVon") VALUES
      (sid, 'Befindlichkeitsrunde', autor),
      (sid, 'Pendenzen aus der letzten Sitzung', autor),
      (sid, 'Rückblick', autor),
      (sid, 'Nächste Anlässe: Infos und Verantwortungen', autor),
      (sid, 'Varia', autor),
      (sid, 'Danach gemeinsam vorbereiten', autor);
  END IF;
END
$do$;
