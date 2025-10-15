UPDATE "recipes" SET "view_count" = 0 WHERE "view_count" IS NULL;

ALTER TABLE "recipes" ALTER COLUMN "view_count" SET NOT NULL;

ALTER TABLE "recipes" ALTER COLUMN "view_count" SET DEFAULT 0;