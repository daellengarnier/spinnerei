CREATE TABLE "booking_anfragen" (
	"id" serial PRIMARY KEY NOT NULL,
	"ressortId" integer NOT NULL,
	"titel" text NOT NULL,
	"notiz" text DEFAULT '' NOT NULL,
	"link" text DEFAULT '' NOT NULL,
	"erstelltVon" integer,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "booking_votes" (
	"id" serial PRIMARY KEY NOT NULL,
	"anfrageId" integer NOT NULL,
	"userId" integer NOT NULL,
	"wert" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sitzungen" (
	"id" serial PRIMARY KEY NOT NULL,
	"ressortId" integer NOT NULL,
	"datum" text NOT NULL,
	"startzeit" text DEFAULT '' NOT NULL,
	"ort" text DEFAULT '' NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "traktanden" (
	"id" serial PRIMARY KEY NOT NULL,
	"sitzungId" integer NOT NULL,
	"text" text NOT NULL,
	"erledigt" boolean DEFAULT false NOT NULL,
	"erstelltVon" integer,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ressorts" ADD COLUMN "hatSitzungen" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "ressorts" ADD COLUMN "hatBooking" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "booking_anfragen" ADD CONSTRAINT "booking_anfragen_ressortId_ressorts_id_fk" FOREIGN KEY ("ressortId") REFERENCES "public"."ressorts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_anfragen" ADD CONSTRAINT "booking_anfragen_erstelltVon_users_id_fk" FOREIGN KEY ("erstelltVon") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_votes" ADD CONSTRAINT "booking_votes_anfrageId_booking_anfragen_id_fk" FOREIGN KEY ("anfrageId") REFERENCES "public"."booking_anfragen"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_votes" ADD CONSTRAINT "booking_votes_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sitzungen" ADD CONSTRAINT "sitzungen_ressortId_ressorts_id_fk" FOREIGN KEY ("ressortId") REFERENCES "public"."ressorts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "traktanden" ADD CONSTRAINT "traktanden_sitzungId_sitzungen_id_fk" FOREIGN KEY ("sitzungId") REFERENCES "public"."sitzungen"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "traktanden" ADD CONSTRAINT "traktanden_erstelltVon_users_id_fk" FOREIGN KEY ("erstelltVon") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_booking_vote" ON "booking_votes" USING btree ("anfrageId","userId");--> statement-breakpoint
UPDATE "ressorts" SET name = 'Infrastruktur' WHERE "anlassId" IS NULL AND name = 'Revision';--> statement-breakpoint
UPDATE "ressorts" SET "hatSitzungen" = true WHERE "anlassId" IS NULL AND name = 'Sitzungen';--> statement-breakpoint
UPDATE "ressorts" SET "hatBooking" = true WHERE "anlassId" IS NULL AND name = 'Booking';
