-- Custom SQL migration file, put your code below! ---- Seed: Anlässe Herbst/Winter 2026 (aus der Google-Drive-Ordnerstruktur)
INSERT INTO "anlaesse" ("slug", "name", "datum") VALUES
	('hausfest', 'Hausfest', '2026-09-05'),
	('to-yo-natali', 'TÔ YÔ & Natalí', '2026-10-09'),
	('kinderdisco', 'Kinderdisco', '2026-10-24'),
	('qum-daydance', 'QUM Daydance', '2026-10-31'),
	('jugendsession', 'Jugendsession', '2026-11-06'),
	('kitchen', 'Kitchen', '2026-11-07'),
	('artlu-bubble', 'Artlu Bubble and the Dead Animal Gang', '2026-11-14'),
	('mothers-cake', 'Mothers Cake & Fancy and the Boys', '2026-12-12')
ON CONFLICT ("slug") DO NOTHING;
