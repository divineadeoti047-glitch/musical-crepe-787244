CREATE TABLE "task_workspaces" (
	"id" text PRIMARY KEY,
	"tasks" jsonb NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
