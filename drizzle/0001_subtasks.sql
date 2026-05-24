ALTER TABLE "tasks" ADD COLUMN "show_subtasks_inline" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
CREATE TABLE "subtasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"task_id" uuid NOT NULL,
	"title" varchar(255) NOT NULL,
	"is_completed" boolean DEFAULT false NOT NULL,
	"sort_order" real DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "subtasks" ADD CONSTRAINT "subtasks_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "idx_subtasks_task_id" ON "subtasks" USING btree ("task_id");
