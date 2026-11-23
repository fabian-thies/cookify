CREATE TABLE "shopping_list_shares" (
	"owner_id" text NOT NULL,
	"member_id" text NOT NULL,
	CONSTRAINT "shopping_list_shares_owner_id_member_id_pk" PRIMARY KEY("owner_id","member_id"),
	CONSTRAINT "shopping_list_shares_distinct_users_check" CHECK ("shopping_list_shares"."owner_id" <> "shopping_list_shares"."member_id")
);
--> statement-breakpoint
ALTER TABLE "shopping_list_items" DROP CONSTRAINT "shopping_list_items_user_week_name_unit_unique";--> statement-breakpoint
ALTER TABLE "shopping_list_items" ADD COLUMN "already_have" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "shopping_list_items" ADD COLUMN "manual" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "shopping_list_shares" ADD CONSTRAINT "shopping_list_shares_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shopping_list_shares" ADD CONSTRAINT "shopping_list_shares_member_id_user_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "shopping_list_shares_member_idx" ON "shopping_list_shares" USING btree ("member_id");--> statement-breakpoint
ALTER TABLE "shopping_list_items" ADD CONSTRAINT "shopping_list_items_user_week_name_unit_manual_unique" UNIQUE("user_id","week_start","name","unit","manual");--> statement-breakpoint
ALTER TABLE "shopping_list_items" ADD CONSTRAINT "shopping_list_items_one_status_check" CHECK (not ("shopping_list_items"."checked" and "shopping_list_items"."already_have"));