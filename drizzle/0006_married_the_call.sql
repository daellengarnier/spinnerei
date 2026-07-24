CREATE TABLE "abrechnungen" (
	"id" serial PRIMARY KEY NOT NULL,
	"anlassId" integer NOT NULL,
	"barAnfangCents" integer,
	"barEndCents" integer,
	"akAnfangCents" integer,
	"akEndCents" integer,
	"akKartenCents" integer,
	"kartenTotalCents" integer,
	"twintCents" integer,
	"eintritteVvk" text DEFAULT '[]' NOT NULL,
	"eintritteAk" text DEFAULT '[]' NOT NULL,
	"miete" text DEFAULT '[]' NOT NULL,
	"gagenManuell" text DEFAULT '[]' NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "abrechnungen_anlassId_unique" UNIQUE("anlassId")
);
--> statement-breakpoint
ALTER TABLE "abrechnungen" ADD CONSTRAINT "abrechnungen_anlassId_anlaesse_id_fk" FOREIGN KEY ("anlassId") REFERENCES "public"."anlaesse"("id") ON DELETE cascade ON UPDATE no action;