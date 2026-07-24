ALTER TABLE "acts" ADD COLUMN "showtime" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "anlaesse" ADD COLUMN "tueroeffnung" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "anlaesse" ADD COLUMN "essen" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "anlaesse" ADD COLUMN "ende" text DEFAULT '' NOT NULL;--> statement-breakpoint
-- Ressort-Struktur neu aufsetzen: alte Seeds (inkl. „Allgemein") entfernen,
-- der Seed legt danach die definitive Liste an (Acts, Bar, Essen, Licht & Ton,
-- Promo, Sicherheit, Finanzen). Kein produktiver Datenbestand vorhanden.
DELETE FROM "ressorts";
