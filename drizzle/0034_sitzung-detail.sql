CREATE TABLE "sitzung_anwesende" (
	"sitzungId" integer NOT NULL,
	"userId" integer NOT NULL,
	CONSTRAINT "sitzung_anwesende_sitzungId_userId_pk" PRIMARY KEY("sitzungId","userId")
);
--> statement-breakpoint
ALTER TABLE "sitzungen" ADD COLUMN "sitzungsleitung" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "sitzungen" ADD COLUMN "protokollfuehrung" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "todos" ADD COLUMN "traktandumId" integer;--> statement-breakpoint
ALTER TABLE "todos" ADD COLUMN "erledigtAm" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "todos" ADD COLUMN "erledigtNotiz" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "traktanden" ADD COLUMN "notizen" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "traktanden" ADD COLUMN "reihenfolge" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "sitzung_anwesende" ADD CONSTRAINT "sitzung_anwesende_sitzungId_sitzungen_id_fk" FOREIGN KEY ("sitzungId") REFERENCES "public"."sitzungen"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sitzung_anwesende" ADD CONSTRAINT "sitzung_anwesende_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "todos" ADD CONSTRAINT "todos_traktandumId_traktanden_id_fk" FOREIGN KEY ("traktandumId") REFERENCES "public"."traktanden"("id") ON DELETE set null ON UPDATE no action;