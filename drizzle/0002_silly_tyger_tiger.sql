CREATE TABLE "task_completions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"task_id" uuid,
	"title" varchar(255) NOT NULL,
	"project_id" uuid,
	"project_name" varchar(100) NOT NULL,
	"project_color" varchar(7) NOT NULL,
	"completed_at" timestamp with time zone NOT NULL,
	"date" date,
	"start_at" timestamp with time zone,
	"end_at" timestamp with time zone,
	"is_recurring" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "task_completions" ADD CONSTRAINT "task_completions_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "idx_tc_completed_at" ON "task_completions" USING btree ("completed_at");
--> statement-breakpoint
CREATE INDEX "idx_tc_task_id" ON "task_completions" USING btree ("task_id");
