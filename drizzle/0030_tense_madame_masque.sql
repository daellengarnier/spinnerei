ALTER TABLE "users" ADD COLUMN "googleSub" text;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_googleSub_unique" UNIQUE("googleSub");