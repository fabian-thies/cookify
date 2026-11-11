CREATE INDEX IF NOT EXISTS "recipes_search_vector_idx" ON "recipes" USING gin ("search_vector");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "recipes_title_trgm_idx" ON "recipes" USING gin ("title" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "recipes_description_trgm_idx" ON "recipes" USING gin ("description" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tags_name_trgm_idx" ON "tags" USING gin ("name" gin_trgm_ops);