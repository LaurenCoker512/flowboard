CREATE TYPE "public"."default_view" AS ENUM('board', 'week', 'month');--> statement-breakpoint
CREATE TYPE "public"."density" AS ENUM('compact', 'default', 'roomy');--> statement-breakpoint
CREATE TYPE "public"."priority" AS ENUM('must_do', 'can_wait', 'fun');--> statement-breakpoint
CREATE TYPE "public"."status" AS ENUM('backlog', 'up_next', 'in_progress', 'done');--> statement-breakpoint
CREATE TYPE "public"."week_start_day" AS ENUM('sunday', 'monday');--> statement-breakpoint
CREATE TABLE "password_reset_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" varchar(64) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"color" varchar(7) NOT NULL,
	"description" text,
	"is_archived" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"week_start_day" "week_start_day" DEFAULT 'sunday' NOT NULL,
	"default_view" "default_view" DEFAULT 'board' NOT NULL,
	"default_project_id" uuid,
	"density" "density" DEFAULT 'default' NOT NULL,
	"quiet_evenings" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "settings_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(255) NOT NULL,
	"project_id" uuid NOT NULL,
	"priority" "priority" NOT NULL,
	"status" "status" NOT NULL,
	"is_archived" boolean DEFAULT false NOT NULL,
	"date" date,
	"start_at" timestamp with time zone,
	"end_at" timestamp with time zone,
	"is_recurring" boolean DEFAULT false NOT NULL,
	"recurrence_rule" jsonb,
	"completion_count" integer DEFAULT 0 NOT NULL,
	"completed_at" timestamp with time zone,
	"recurring_master_id" uuid,
	"recurring_occurrence_date" date,
	"backlog_order" varchar(255),
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settings" ADD CONSTRAINT "settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settings" ADD CONSTRAINT "settings_default_project_id_projects_id_fk" FOREIGN KEY ("default_project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_recurring_master_id_tasks_id_fk" FOREIGN KEY ("recurring_master_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_prt_token_hash" ON "password_reset_tokens" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "idx_prt_user_id" ON "password_reset_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_tasks_project_id" ON "tasks" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_tasks_status" ON "tasks" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_tasks_date" ON "tasks" USING btree ("date");--> statement-breakpoint
CREATE INDEX "idx_tasks_recurring_master_id" ON "tasks" USING btree ("recurring_master_id");