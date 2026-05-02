CREATE TABLE "tips" (
	"id" serial PRIMARY KEY NOT NULL,
	"recipe_id" integer NOT NULL,
	"tip" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "tips" ADD CONSTRAINT "tips_recipe_id_recipes_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("id") ON DELETE no action ON UPDATE no action;