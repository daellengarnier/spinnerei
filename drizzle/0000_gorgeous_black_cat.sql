-- Aufräumen: Tabellen der ersten App-Version (kein produktiver Datenbestand).
DROP TABLE IF EXISTS "schicht_helfer" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "schichten" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "aufgaben" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "infos" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "anlaesse" CASCADE;--> statement-breakpoint
CREATE TABLE "act_files" (
	"id" serial PRIMARY KEY NOT NULL,
	"actId" integer NOT NULL,
	"attachmentId" integer NOT NULL,
	"rubrik" text DEFAULT 'sonstiges' NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "activity_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"actorUserId" integer,
	"typ" text NOT NULL,
	"text" text DEFAULT '' NOT NULL,
	"refTyp" text NOT NULL,
	"refId" integer NOT NULL,
	"gelesen" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "acts" (
	"id" serial PRIMARY KEY NOT NULL,
	"ressortId" integer NOT NULL,
	"name" text DEFAULT '' NOT NULL,
	"typ" text DEFAULT 'band' NOT NULL,
	"kostenCents" integer,
	"uebernachtung" boolean DEFAULT false NOT NULL,
	"anzahlPersonen" integer,
	"promotext" text DEFAULT '' NOT NULL,
	"notiz" text DEFAULT '' NOT NULL,
	"getIn" text DEFAULT '' NOT NULL,
	"soundcheck" text DEFAULT '' NOT NULL,
	"createdBy" integer,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "anlaesse" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"datum" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "anlaesse_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "app_settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" text DEFAULT '' NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "attachments" (
	"id" serial PRIMARY KEY NOT NULL,
	"filename" text NOT NULL,
	"mime" text DEFAULT 'application/octet-stream' NOT NULL,
	"size" integer DEFAULT 0 NOT NULL,
	"dataB64" text NOT NULL,
	"uploadedBy" integer,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "budget_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"ressortId" integer NOT NULL,
	"kategorie" text DEFAULT 'Sonstiges' NOT NULL,
	"titel" text DEFAULT '' NOT NULL,
	"betragCents" integer NOT NULL,
	"beschreibung" text DEFAULT '' NOT NULL,
	"createdBy" integer,
	"actId" integer,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "category_budgets" (
	"anlassId" integer NOT NULL,
	"kategorie" text NOT NULL,
	"betragCents" integer DEFAULT 0 NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "category_budgets_anlassId_kategorie_pk" PRIMARY KEY("anlassId","kategorie")
);
--> statement-breakpoint
CREATE TABLE "comment_mentions" (
	"commentId" integer NOT NULL,
	"userId" integer NOT NULL,
	CONSTRAINT "comment_mentions_commentId_userId_pk" PRIMARY KEY("commentId","userId")
);
--> statement-breakpoint
CREATE TABLE "comments" (
	"id" serial PRIMARY KEY NOT NULL,
	"parentTyp" text NOT NULL,
	"parentId" integer NOT NULL,
	"autorUserId" integer,
	"text" text NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "expenses" (
	"id" serial PRIMARY KEY NOT NULL,
	"ressortId" integer NOT NULL,
	"userId" integer,
	"betragCents" integer NOT NULL,
	"waehrung" text DEFAULT 'CHF' NOT NULL,
	"kategorie" text DEFAULT 'Sonstiges' NOT NULL,
	"beschreibung" text DEFAULT '' NOT NULL,
	"datum" text,
	"belegId" integer,
	"actId" integer,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "meeting_slots" (
	"id" serial PRIMARY KEY NOT NULL,
	"meetingId" integer NOT NULL,
	"datum" text NOT NULL,
	"startzeit" text DEFAULT '' NOT NULL,
	"endzeit" text
);
--> statement-breakpoint
CREATE TABLE "meetings" (
	"id" serial PRIMARY KEY NOT NULL,
	"anlassId" integer NOT NULL,
	"titel" text NOT NULL,
	"beschreibung" text DEFAULT '' NOT NULL,
	"organisatorUserId" integer,
	"ressortId" integer,
	"status" text DEFAULT 'umfrage_laeuft' NOT NULL,
	"fixierterSlotId" integer,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "protocols" (
	"id" serial PRIMARY KEY NOT NULL,
	"meetingId" integer NOT NULL,
	"inhalt" text DEFAULT '' NOT NULL,
	"aktualisiertVon" integer,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "protocols_meetingId_unique" UNIQUE("meetingId")
);
--> statement-breakpoint
CREATE TABLE "push_subscriptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"endpoint" text NOT NULL,
	"p256dh" text NOT NULL,
	"auth" text NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "push_subscriptions_endpoint_unique" UNIQUE("endpoint")
);
--> statement-breakpoint
CREATE TABLE "ressort_leads" (
	"ressortId" integer NOT NULL,
	"userId" integer NOT NULL,
	CONSTRAINT "ressort_leads_ressortId_userId_pk" PRIMARY KEY("ressortId","userId")
);
--> statement-breakpoint
CREATE TABLE "ressorts" (
	"id" serial PRIMARY KEY NOT NULL,
	"anlassId" integer NOT NULL,
	"name" text NOT NULL,
	"beschreibung" text DEFAULT '' NOT NULL,
	"farbe" text DEFAULT '#6366f1' NOT NULL,
	"reihenfolge" integer DEFAULT 0 NOT NULL,
	"hatZeitplan" boolean DEFAULT false NOT NULL,
	"hatFinanzen" boolean DEFAULT false NOT NULL,
	"hatActs" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "schedule_entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"ressortId" integer NOT NULL,
	"board" text DEFAULT 'programm' NOT NULL,
	"floor" text DEFAULT '' NOT NULL,
	"titel" text DEFAULT '' NOT NULL,
	"startMin" integer NOT NULL,
	"endMin" integer NOT NULL,
	"notiz" text DEFAULT '' NOT NULL,
	"anzahlLeute" integer,
	"gageCents" integer,
	"actId" integer,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "schedule_entry_files" (
	"entryId" integer NOT NULL,
	"attachmentId" integer NOT NULL,
	CONSTRAINT "schedule_entry_files_entryId_attachmentId_pk" PRIMARY KEY("entryId","attachmentId")
);
--> statement-breakpoint
CREATE TABLE "schedule_floors" (
	"id" serial PRIMARY KEY NOT NULL,
	"ressortId" integer NOT NULL,
	"board" text DEFAULT 'programm' NOT NULL,
	"name" text NOT NULL,
	"farbe" text DEFAULT '#6366f1' NOT NULL,
	"reihenfolge" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "schedule_markers" (
	"id" serial PRIMARY KEY NOT NULL,
	"ressortId" integer NOT NULL,
	"board" text DEFAULT 'programm' NOT NULL,
	"titel" text DEFAULT '' NOT NULL,
	"startMin" integer NOT NULL,
	"endMin" integer NOT NULL,
	"farbe" text DEFAULT '#f59e0b' NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"token" text PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"expiresAt" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shopping_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"ressortId" integer NOT NULL,
	"subRessortId" integer,
	"titel" text NOT NULL,
	"menge" text DEFAULT '' NOT NULL,
	"erledigt" boolean DEFAULT false NOT NULL,
	"createdBy" integer,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "slot_votes" (
	"id" serial PRIMARY KEY NOT NULL,
	"slotId" integer NOT NULL,
	"userId" integer NOT NULL,
	"verfuegbarkeit" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sub_ressorts" (
	"id" serial PRIMARY KEY NOT NULL,
	"ressortId" integer NOT NULL,
	"name" text NOT NULL,
	"beschreibung" text DEFAULT '' NOT NULL,
	"reihenfolge" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "todo_assignees" (
	"todoId" integer NOT NULL,
	"userId" integer NOT NULL,
	CONSTRAINT "todo_assignees_todoId_userId_pk" PRIMARY KEY("todoId","userId")
);
--> statement-breakpoint
CREATE TABLE "todos" (
	"id" serial PRIMARY KEY NOT NULL,
	"ressortId" integer NOT NULL,
	"subRessortId" integer,
	"titel" text NOT NULL,
	"beschreibung" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'offen' NOT NULL,
	"fristDatum" text,
	"erstelltVon" integer,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"passwordHash" text NOT NULL,
	"rolle" text DEFAULT 'mitglied' NOT NULL,
	"avatarColor" text DEFAULT '#64748b' NOT NULL,
	"avatarAttachmentId" integer,
	"mustChangePassword" boolean DEFAULT false NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"claimed" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "act_files" ADD CONSTRAINT "act_files_actId_acts_id_fk" FOREIGN KEY ("actId") REFERENCES "public"."acts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "act_files" ADD CONSTRAINT "act_files_attachmentId_attachments_id_fk" FOREIGN KEY ("attachmentId") REFERENCES "public"."attachments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_items" ADD CONSTRAINT "activity_items_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_items" ADD CONSTRAINT "activity_items_actorUserId_users_id_fk" FOREIGN KEY ("actorUserId") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "acts" ADD CONSTRAINT "acts_ressortId_ressorts_id_fk" FOREIGN KEY ("ressortId") REFERENCES "public"."ressorts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "acts" ADD CONSTRAINT "acts_createdBy_users_id_fk" FOREIGN KEY ("createdBy") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_uploadedBy_users_id_fk" FOREIGN KEY ("uploadedBy") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budget_items" ADD CONSTRAINT "budget_items_ressortId_ressorts_id_fk" FOREIGN KEY ("ressortId") REFERENCES "public"."ressorts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budget_items" ADD CONSTRAINT "budget_items_createdBy_users_id_fk" FOREIGN KEY ("createdBy") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budget_items" ADD CONSTRAINT "budget_items_actId_acts_id_fk" FOREIGN KEY ("actId") REFERENCES "public"."acts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "category_budgets" ADD CONSTRAINT "category_budgets_anlassId_anlaesse_id_fk" FOREIGN KEY ("anlassId") REFERENCES "public"."anlaesse"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comment_mentions" ADD CONSTRAINT "comment_mentions_commentId_comments_id_fk" FOREIGN KEY ("commentId") REFERENCES "public"."comments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comment_mentions" ADD CONSTRAINT "comment_mentions_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_autorUserId_users_id_fk" FOREIGN KEY ("autorUserId") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_ressortId_ressorts_id_fk" FOREIGN KEY ("ressortId") REFERENCES "public"."ressorts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_belegId_attachments_id_fk" FOREIGN KEY ("belegId") REFERENCES "public"."attachments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_actId_acts_id_fk" FOREIGN KEY ("actId") REFERENCES "public"."acts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meeting_slots" ADD CONSTRAINT "meeting_slots_meetingId_meetings_id_fk" FOREIGN KEY ("meetingId") REFERENCES "public"."meetings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meetings" ADD CONSTRAINT "meetings_anlassId_anlaesse_id_fk" FOREIGN KEY ("anlassId") REFERENCES "public"."anlaesse"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meetings" ADD CONSTRAINT "meetings_organisatorUserId_users_id_fk" FOREIGN KEY ("organisatorUserId") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meetings" ADD CONSTRAINT "meetings_ressortId_ressorts_id_fk" FOREIGN KEY ("ressortId") REFERENCES "public"."ressorts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "protocols" ADD CONSTRAINT "protocols_meetingId_meetings_id_fk" FOREIGN KEY ("meetingId") REFERENCES "public"."meetings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "protocols" ADD CONSTRAINT "protocols_aktualisiertVon_users_id_fk" FOREIGN KEY ("aktualisiertVon") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ressort_leads" ADD CONSTRAINT "ressort_leads_ressortId_ressorts_id_fk" FOREIGN KEY ("ressortId") REFERENCES "public"."ressorts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ressort_leads" ADD CONSTRAINT "ressort_leads_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ressorts" ADD CONSTRAINT "ressorts_anlassId_anlaesse_id_fk" FOREIGN KEY ("anlassId") REFERENCES "public"."anlaesse"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_entries" ADD CONSTRAINT "schedule_entries_ressortId_ressorts_id_fk" FOREIGN KEY ("ressortId") REFERENCES "public"."ressorts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_entries" ADD CONSTRAINT "schedule_entries_actId_acts_id_fk" FOREIGN KEY ("actId") REFERENCES "public"."acts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_entry_files" ADD CONSTRAINT "schedule_entry_files_entryId_schedule_entries_id_fk" FOREIGN KEY ("entryId") REFERENCES "public"."schedule_entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_entry_files" ADD CONSTRAINT "schedule_entry_files_attachmentId_attachments_id_fk" FOREIGN KEY ("attachmentId") REFERENCES "public"."attachments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_floors" ADD CONSTRAINT "schedule_floors_ressortId_ressorts_id_fk" FOREIGN KEY ("ressortId") REFERENCES "public"."ressorts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_markers" ADD CONSTRAINT "schedule_markers_ressortId_ressorts_id_fk" FOREIGN KEY ("ressortId") REFERENCES "public"."ressorts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shopping_items" ADD CONSTRAINT "shopping_items_ressortId_ressorts_id_fk" FOREIGN KEY ("ressortId") REFERENCES "public"."ressorts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shopping_items" ADD CONSTRAINT "shopping_items_subRessortId_sub_ressorts_id_fk" FOREIGN KEY ("subRessortId") REFERENCES "public"."sub_ressorts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shopping_items" ADD CONSTRAINT "shopping_items_createdBy_users_id_fk" FOREIGN KEY ("createdBy") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "slot_votes" ADD CONSTRAINT "slot_votes_slotId_meeting_slots_id_fk" FOREIGN KEY ("slotId") REFERENCES "public"."meeting_slots"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "slot_votes" ADD CONSTRAINT "slot_votes_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sub_ressorts" ADD CONSTRAINT "sub_ressorts_ressortId_ressorts_id_fk" FOREIGN KEY ("ressortId") REFERENCES "public"."ressorts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "todo_assignees" ADD CONSTRAINT "todo_assignees_todoId_todos_id_fk" FOREIGN KEY ("todoId") REFERENCES "public"."todos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "todo_assignees" ADD CONSTRAINT "todo_assignees_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "todos" ADD CONSTRAINT "todos_ressortId_ressorts_id_fk" FOREIGN KEY ("ressortId") REFERENCES "public"."ressorts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "todos" ADD CONSTRAINT "todos_subRessortId_sub_ressorts_id_fk" FOREIGN KEY ("subRessortId") REFERENCES "public"."sub_ressorts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "todos" ADD CONSTRAINT "todos_erstelltVon_users_id_fk" FOREIGN KEY ("erstelltVon") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_activity_user" ON "activity_items" USING btree ("userId","gelesen");--> statement-breakpoint
CREATE INDEX "idx_comments_parent" ON "comments" USING btree ("parentTyp","parentId");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_floor_ressort_board_name" ON "schedule_floors" USING btree ("ressortId","board","name");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_slot_user" ON "slot_votes" USING btree ("slotId","userId");