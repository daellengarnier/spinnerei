-- Die in 0033 importierten Protokolle auf die neue Sitzungsstruktur verteilen:
-- Notizen pro Traktandum, Sitzungsleitung, Protokollführung, Anwesende und
-- Pendenzen am Traktandum. Nur für Sitzungen, deren Notizen noch dem Import
-- entsprechen (beginnen mit «Anwesend:»), und nur leere Traktanden-Notizen.
DO $do$
DECLARE
  rid integer;
  sid integer;
BEGIN
  SELECT id INTO rid FROM ressorts WHERE "anlassId" IS NULL AND "hatSitzungen" = true ORDER BY id LIMIT 1;
  IF rid IS NULL THEN
    RETURN;
  END IF;

  -- ── 06.05.2026 ────────────────────────────────────────────────────────
  SELECT id INTO sid FROM sitzungen WHERE "ressortId" = rid AND datum = '2026-05-06' AND protokoll LIKE 'Anwesend:%';
  IF sid IS NOT NULL THEN
    UPDATE sitzungen SET sitzungsleitung = 'Ambar', protokollfuehrung = 'Dällen',
      protokoll = 'Originalprotokoll: https://docs.google.com/document/d/1WjuK4sV4RO1idd7TKsiq5YzcSMdBCDH8rQlpoauCBUs/edit'
    WHERE id = sid;
    INSERT INTO sitzung_anwesende ("sitzungId", "userId")
      SELECT sid, id FROM users WHERE name IN ('Nina', 'Ambar', 'Dällen', 'Mike') ON CONFLICT DO NOTHING;
    UPDATE traktanden SET notizen = $t$• Suisa: Nina und Simä haben die Anlässe seit 2025 erfasst (ohne DJ-Anlässe, dafür gibt es ein eigenes Formular). Nina fragt bei etablierten Orten nach, wie sie es handhaben. Bei der Abrechnung alle Artist-Ausgaben angeben (Gage, Spesen, Essen, Gästezimmer), das ist abziehbar. Für ein Onlinekonto braucht es eine Rechnungsnummer.
• Info-Mail-Eingang: Dällen und Mike.
• Programm-Ideen: Lost in a Detail.
• Plakatdruck: Ambar zeigt Nina die Karte für die Bezahlung.
• Präsidium: Dällen schaut die Aufgaben an und was es für einen Wechsel braucht.$t$
      WHERE "sitzungId" = sid AND text = 'Pendenzen aus der letzten Sitzung' AND notizen = '';
    UPDATE traktanden SET notizen = $t$• Soirée Tropicale (25.04.): guter Vibe, finanziell rausgekommen (60 bis 70 Zahlende), evtl. um 21:00 starten.
• Bass Weight (02.05.): guter Vibe, finanziell gut, Leute früh da, coole Crew, Besuch aus dem Haus Felsenau mit viel Freude.$t$
      WHERE "sitzungId" = sid AND text = 'Rückblick: Soirée Tropicale und Bass Weight' AND notizen = '';
    UPDATE traktanden SET notizen = $t$• 23.05. Los Palms & Natalí: Mike kocht (8 Artists), Dällen filmt und schaut mit Yves fürs Licht, Dällen fragt Alvi fürs Gästezimmer in der Via3. Alle machen nochmals Werbung.$t$
      WHERE "sitzungId" = sid AND text = 'Nächste Anlässe: Infos und Verantwortungen' AND notizen = '';
    UPDATE traktanden SET notizen = $t$• 05.09. Hausfest Via1 (fix, viele Helfende nötig, nicht auf den Flyer), 09.10. TÔ YÔ, 24.10. Kinderparty (Nachmittag), 31.10. Daydance QUM, 06.11. Jugendsession, 07.11. Kitchen, 14.11. Artlu Bubble, 28.11. Soirée Tropicale (Alvi/Mo fragen), 12.12. Mothers Cake und Fancy and the Boys.
• Sturzflug Drum&Bass: lieber Winter/Frühling oder Herbst 2027.
• Anfrage Silvester (privat, ca. 150 Personen): Dällen ruft Dani an.$t$
      WHERE "sitzungId" = sid AND text = 'Nächste Saison' AND notizen = '';
    UPDATE traktanden SET notizen = $t$• Haus-Felsenau-Bewohnende: Einlass, wenn sie zahlen können. Dällen schreibt Fabienne zurück, fragt nach einer Notfallnummer (Nachtwache) und was «es geht nicht» für uns bedeutet.
• Saisonplakat: Programm bis Mitte Juni fix, damit Judith designen kann.
• GV: in Arbeit.
• Retraite: Vorschlag 18./19. oder 25./26. Juli.
• Programmübersicht erstellen.
• Nächste Sitzung: vor der Sommerpause keine mehr.$t$
      WHERE "sitzungId" = sid AND text = 'Varia' AND notizen = '';
  END IF;

  -- ── 28.09.2026 ────────────────────────────────────────────────────────
  sid := NULL;
  SELECT id INTO sid FROM sitzungen WHERE "ressortId" = rid AND datum = '2026-09-28' AND protokoll LIKE 'Anwesend:%';
  IF sid IS NOT NULL THEN
    UPDATE sitzungen SET sitzungsleitung = 'Ambar', protokollfuehrung = 'Ambar',
      protokoll = $t$Ausserdem anwesend: Mara.

Originalprotokoll: https://docs.google.com/document/d/1o3_G96FqLfRpzl_fuHXAwVMqh4UgYYxv0xQ-4eba8Qw/edit$t$
    WHERE id = sid;
    INSERT INTO sitzung_anwesende ("sitzungId", "userId")
      SELECT sid, id FROM users WHERE name IN ('Ambar', 'Dällen', 'Laurin', 'Mike') ON CONFLICT DO NOTHING;
    UPDATE traktanden SET notizen = $t$• App: alle haben sie jetzt heruntergeladen.
• Suisa: Frage an Nina, ob sie weitermacht oder abgibt. Offen: was bringt das Onlinekonto, was ist die Rechnungsnummer?
• Info-Mail-Eingang: Dällen und Mike.
• Präsidium: Dällen schaut die Aufgaben an und was es für einen Wechsel braucht.
• GV machen.
• Haus-Felsenau-Bewohnende: Einlass, wenn sie zahlen können. Dällen schreibt Fabienne zurück, fragt nach einer Notfallnummer (Nachtwache) und was «es geht nicht» für uns bedeutet.$t$
      WHERE "sitzungId" = sid AND text = 'Pendenzen aus der letzten Sitzung' AND notizen = '';
    UPDATE traktanden SET notizen = $t$• 09.10. TÔ YÔ: AV Dällen, BV Ambar. Mike ab 18:00, Laurin nicht da. Technik-Support Dällen, Mike organisiert wen zum Kochen, Ambar macht das Gästezimmer, Licht Yves.
• 24.10. Kinderparty «Beats für Gross und Klein», 14:00 bis 17:00: Organisation Mara und Aurelia. DJs Tino, Simä b2b Lucien. Popcorn-/Sirup-Bar und Cüpli-Bar. 5 bis 10 CHF pro Person (Popcorn und Sirup für Kids inbegriffen). Promo: Mara schickt Flyer und Text für Insta, macht Druckwerbung und Quartierchat. Da: Mike, Dällen, Laurin, Ambar. Schichten: 2 h Eingang, 2x 1.5 h Bar. Mara organisiert Snacks. Keine Altersbegrenzung.
• 31.10. Daydance QUM: AV Dällen, BV Ambar. Da: Laurin, Mike. Mike kocht Daal mit Naan. Laurin schaut mit Yves für eine Licht-Einführung.
• 06.11. Jugendsession: BV Ambar. Mike wahrscheinlich nicht da, Laurin schon.
• 07.11. Kitchen, 14.11. Artlu Bubble, 28.11. Soirée Tropicale, 12.12. Mothers Cake und Fancy and the Boys.
• Sturzflug Drum&Bass: lieber Winter/Frühling oder Herbst 2027.$t$
      WHERE "sitzungId" = sid AND text = 'Nächste Anlässe: Infos und Verantwortungen' AND notizen = '';
    UPDATE traktanden SET notizen = $t$• Lucien und Päde sind interessiert, ins Kollektiv zu kommen.
• Putzen/Vorbereitung: Ambar macht eine To-do-Liste, Dällen macht dafür einen Abschnitt pro Anlass in der App.
• Nächste Sitzung: 26.10., sofern die Neuen können.$t$
      WHERE "sitzungId" = sid AND text = 'Varia: Lucien und Päde, Putzen/Vorbereitung' AND notizen = '';
  END IF;

  -- ── 26.10.2026 ────────────────────────────────────────────────────────
  sid := NULL;
  SELECT id INTO sid FROM sitzungen WHERE "ressortId" = rid AND datum = '2026-10-26' AND protokoll LIKE 'Anwesend:%';
  IF sid IS NOT NULL THEN
    UPDATE sitzungen SET sitzungsleitung = 'Ambar', protokollfuehrung = 'Ambar',
      protokoll = 'Originalprotokoll: https://docs.google.com/document/d/1d1J18_YtSyvRNqDy3Kv6rBNjetzcUEknggjr9Es8Ps0/edit'
    WHERE id = sid;
    INSERT INTO sitzung_anwesende ("sitzungId", "userId")
      SELECT sid, id FROM users WHERE name IN ('Ambar', 'Dällen', 'Laurin', 'Päde', 'Lucien', 'Nina', 'Mike') ON CONFLICT DO NOTHING;
    UPDATE traktanden SET notizen = $t$• Suisa: Nina macht weiter, bis es eingegroovt ist.
• Info-Mail-Eingang: Dällen betreut ihn jetzt mit Jarvis (KI-Assistenz).
• Präsidium: Bank-Infos wechseln und weiteres anpassen, Dällen schaut mit Simä und Yves.
• GV: für dieses Jahr gemacht.
• Haus-Felsenau-Bewohnende: Einlass, wenn sie zahlen können. Dällen schreibt Fabienne zurück, fragt nach einer Notfallnummer (Nachtwache) und was «es geht nicht» für uns bedeutet.
• To-do-Liste Putzen/Vorbereitung: Ambar macht die Liste, Dällen den Abschnitt pro Anlass in der App.
• Licht-Einführung: Yves für Laurin, am 31.10. zusammen.$t$
      WHERE "sitzungId" = sid AND text = 'Pendenzen aus der letzten Sitzung' AND notizen = '';
    UPDATE traktanden SET notizen = $t$• Rahmen: etwa 1 Sitzung pro Monat, optimal 1 Retraite mit GV pro Jahr. Etwa alle zwei Wochen ein Anlass. Sommerpause meist Juli bis September, ideal für Retraite und/oder Putzaktion.
• Bedarf in den Ressorts: Deko, Social Media/Werbung, Technik. Dazu Hilfe bei kleinen Vor- und Nachbereitungen (allgemeine To-do-Liste in der App) und Schichten.
• Organisation: Orga-App und Spinnplan.
• Lucien: motiviert für Deko und Technik, vor allem Licht (Interesse, noch ohne Erfahrung), evtl. Social Media.
• Päde: motiviert, aber nicht riesige Kapazität. Social Media, kleinere To-dos, Deko mit Lucien.$t$
      WHERE "sitzungId" = sid AND text = 'Einblick für Lucien und Päde' AND notizen = '';
    UPDATE traktanden SET notizen = $t$• 09.10. TÔ YÔ (Japan)
• 24.10. Kinderparty «Beats für Gross und Klein»$t$
      WHERE "sitzungId" = sid AND text = 'Rückblick: TÔ YÔ und Kinderparty' AND notizen = '';
    UPDATE traktanden SET notizen = $t$• 30.10. Reservation Pluto
• 31.10. Daydance QUM: AV Dällen, BV Ambar. Da: Laurin, Mike, Nina, Lucien, Päde. Mike kocht Daal mit Naan (20 Personen). Licht: Laurin mit Yves.
• 06.11. Jugendsession: AV Dällen, BV Ambar. Mike wahrscheinlich nicht da, Laurin (Licht), Nina, Päde. Essen: evtl. zusammen Pizza bestellen.
• 07.11. Kitchen: AV Nina, BV Ambar, Filmen Dällen. Laurin unsicher, Mike, Yves (Licht)? Mike kocht. Die Band will am Nachmittag früh aufstellen und vor dem Soundcheck nochmals Pause machen (direkt mit Bäscht).
• 14.11. Artlu Bubble: AV Dällen, BV Ambar. Da: Lucien, Päde (evtl. später), Nina, Laurin, Mike. Kochen: evtl. Lucien, sonst wen organisieren.
• 28.11. Soirée Tropicale
• 12.12. Mothers Cake und Fancy and the Boys
• Sturzflug Drum&Bass: lieber Winter/Frühling oder Herbst 2027.$t$
      WHERE "sitzungId" = sid AND text = 'Nächste Anlässe: Infos und Verantwortungen' AND notizen = '';
    UPDATE traktanden SET notizen = $t$• Booking-Vorschlag von Nina: Tortoise (Dällen schaut).
• Nächste Sitzung: 27.11., 20:30 Uhr, kurz sitzen und dann vorbereiten.$t$
      WHERE "sitzungId" = sid AND text = 'Varia: Booking-Vorschlag Tortoise' AND notizen = '';

    -- Pendenzen ans passende Traktandum hängen.
    UPDATE todos SET "traktandumId" = (SELECT id FROM traktanden WHERE "sitzungId" = sid AND text = 'Varia: Booking-Vorschlag Tortoise' LIMIT 1)
      WHERE "sitzungId" = sid AND "traktandumId" IS NULL AND titel = 'Booking-Vorschlag Tortoise anschauen';
    UPDATE todos SET "traktandumId" = (SELECT id FROM traktanden WHERE "sitzungId" = sid AND text = 'Pendenzen aus der letzten Sitzung' LIMIT 1)
      WHERE "sitzungId" = sid AND "traktandumId" IS NULL;
  END IF;

  -- Bestehende Traktanden behalten ihre bisherige Reihenfolge (nach Erfassung).
  UPDATE traktanden t SET reihenfolge = x.rn
  FROM (
    SELECT tr.id, row_number() OVER (PARTITION BY tr."sitzungId" ORDER BY tr.id) AS rn
    FROM traktanden tr JOIN sitzungen s ON s.id = tr."sitzungId"
    WHERE s."ressortId" = rid
  ) x
  WHERE t.id = x.id AND t.reihenfolge = 0;
END
$do$;
