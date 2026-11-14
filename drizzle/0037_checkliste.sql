CREATE TABLE "checkliste_punkte" (
	"id" serial PRIMARY KEY NOT NULL,
	"anlassId" integer NOT NULL,
	"phase" text NOT NULL,
	"gruppe" text NOT NULL,
	"titel" text NOT NULL,
	"beschreibung" text DEFAULT '' NOT NULL,
	"reihenfolge" integer DEFAULT 0 NOT NULL,
	"erledigtVon" integer,
	"erledigtAm" timestamp with time zone,
	"erstelltVon" integer,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "checkliste_vorlage" (
	"id" serial PRIMARY KEY NOT NULL,
	"phase" text NOT NULL,
	"gruppe" text NOT NULL,
	"titel" text NOT NULL,
	"beschreibung" text DEFAULT '' NOT NULL,
	"reihenfolge" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "checkliste_punkte" ADD CONSTRAINT "checkliste_punkte_anlassId_anlaesse_id_fk" FOREIGN KEY ("anlassId") REFERENCES "public"."anlaesse"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checkliste_punkte" ADD CONSTRAINT "checkliste_punkte_erledigtVon_users_id_fk" FOREIGN KEY ("erledigtVon") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checkliste_punkte" ADD CONSTRAINT "checkliste_punkte_erstelltVon_users_id_fk" FOREIGN KEY ("erstelltVon") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "checkliste_punkte_anlass_idx" ON "checkliste_punkte" USING btree ("anlassId");