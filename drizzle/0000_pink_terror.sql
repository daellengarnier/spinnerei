CREATE TABLE "anlaesse" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"datum" date NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "anlaesse_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "aufgaben" (
	"id" serial PRIMARY KEY NOT NULL,
	"anlass_id" integer NOT NULL,
	"titel" text NOT NULL,
	"zustaendig" text,
	"erledigt" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "infos" (
	"id" serial PRIMARY KEY NOT NULL,
	"anlass_id" integer NOT NULL,
	"titel" text NOT NULL,
	"text" text NOT NULL,
	"autor" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "schicht_helfer" (
	"id" serial PRIMARY KEY NOT NULL,
	"schicht_id" integer NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "schichten" (
	"id" serial PRIMARY KEY NOT NULL,
	"anlass_id" integer NOT NULL,
	"bereich" text NOT NULL,
	"zeit_von" text NOT NULL,
	"zeit_bis" text NOT NULL,
	"plaetze" integer DEFAULT 2 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "aufgaben" ADD CONSTRAINT "aufgaben_anlass_id_anlaesse_id_fk" FOREIGN KEY ("anlass_id") REFERENCES "public"."anlaesse"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "infos" ADD CONSTRAINT "infos_anlass_id_anlaesse_id_fk" FOREIGN KEY ("anlass_id") REFERENCES "public"."anlaesse"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schicht_helfer" ADD CONSTRAINT "schicht_helfer_schicht_id_schichten_id_fk" FOREIGN KEY ("schicht_id") REFERENCES "public"."schichten"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schichten" ADD CONSTRAINT "schichten_anlass_id_anlaesse_id_fk" FOREIGN KEY ("anlass_id") REFERENCES "public"."anlaesse"("id") ON DELETE cascade ON UPDATE no action;