CREATE TABLE "petzi_tickets" (
	"id" serial PRIMARY KEY NOT NULL,
	"ticketNumber" text NOT NULL,
	"eventId" integer,
	"eventTitel" text DEFAULT '' NOT NULL,
	"kategorie" text DEFAULT '' NOT NULL,
	"betragCents" integer,
	"storniert" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "petzi_tickets_ticketNumber_unique" UNIQUE("ticketNumber")
);
