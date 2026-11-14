CREATE TABLE "vorlage_punkte" (
	"id" serial PRIMARY KEY NOT NULL,
	"titel" text NOT NULL,
	"beschreibung" text DEFAULT '' NOT NULL,
	"reihenfolge" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ressorts" ADD COLUMN "hatVorlage" boolean DEFAULT false NOT NULL;--> statement-breakpoint
-- Kommende Anlässe bekommen das neue Standard-Ressort (vergangene bleiben, wie sie sind).
INSERT INTO "ressorts" ("anlassId", "name", "beschreibung", "farbe", "reihenfolge", "hatVorlage")
SELECT a."id", 'Putzen & Vorbereitung', '', '#14b8a6',
  COALESCE((SELECT MAX(r."reihenfolge") FROM "ressorts" r WHERE r."anlassId" = a."id"), 0) + 1, true
FROM "anlaesse" a
WHERE a."datum" >= to_char(current_date, 'YYYY-MM-DD')
  AND NOT EXISTS (SELECT 1 FROM "ressorts" r WHERE r."anlassId" = a."id" AND r."hatVorlage");
