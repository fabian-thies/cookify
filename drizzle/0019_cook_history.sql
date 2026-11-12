CREATE TABLE "cook_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"recipe_id" integer NOT NULL,
	"cooked_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "cook_history" ADD CONSTRAINT "cook_history_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cook_history" ADD CONSTRAINT "cook_history_recipe_id_recipes_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "cook_history_user_cooked_at_idx" ON "cook_history" USING btree ("user_id","cooked_at");--> statement-breakpoint
CREATE INDEX "cook_history_recipe_idx" ON "cook_history" USING btree ("recipe_id");