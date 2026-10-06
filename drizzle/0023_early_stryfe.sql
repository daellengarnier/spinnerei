ALTER TABLE "anlaesse" ADD COLUMN "shareToken" text;--> statement-breakpoint
ALTER TABLE "anlaesse" ADD CONSTRAINT "anlaesse_shareToken_unique" UNIQUE("shareToken");