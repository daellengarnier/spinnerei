ALTER TABLE "anlaesse" ADD COLUMN "mitEssen" boolean;--> statement-breakpoint
UPDATE "anlaesse" SET "mitEssen" = true WHERE "essen" <> '';
