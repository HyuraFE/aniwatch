CREATE TABLE "bookmarks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"manga_id" uuid NOT NULL,
	"status" text DEFAULT 'reading' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chapters" (
	"id" uuid PRIMARY KEY NOT NULL,
	"manga_id" uuid NOT NULL,
	"chapter_number" text NOT NULL,
	"volume_number" text,
	"title" text,
	"translated_language" text NOT NULL,
	"scanlation_groups" text[] DEFAULT '{}' NOT NULL,
	"pages_count" integer DEFAULT 0 NOT NULL,
	"external_url" text,
	"is_unavailable" boolean DEFAULT false NOT NULL,
	"published_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "feed_pages" (
	"manga_id" uuid NOT NULL,
	"language" text NOT NULL,
	"offset" integer NOT NULL,
	"total" integer NOT NULL,
	"fetched_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "feed_pages_manga_id_language_offset_pk" PRIMARY KEY("manga_id","language","offset")
);
--> statement-breakpoint
CREATE TABLE "manga" (
	"id" uuid PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"alt_titles" jsonb,
	"description" text,
	"cover_file_name" text,
	"status" text,
	"content_rating" text,
	"original_language" text,
	"available_languages" text[] DEFAULT '{}' NOT NULL,
	"chapter_counts" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"tags" text[] DEFAULT '{}' NOT NULL,
	"year" integer,
	"last_synced_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reading_progress" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"manga_id" uuid NOT NULL,
	"chapter_id" uuid NOT NULL,
	"last_page" integer DEFAULT 1 NOT NULL,
	"is_completed" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "search_cache" (
	"query_key" text PRIMARY KEY NOT NULL,
	"payload" jsonb NOT NULL,
	"expires_at" timestamp NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bookmarks" ADD CONSTRAINT "bookmarks_manga_id_manga_id_fk" FOREIGN KEY ("manga_id") REFERENCES "public"."manga"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chapters" ADD CONSTRAINT "chapters_manga_id_manga_id_fk" FOREIGN KEY ("manga_id") REFERENCES "public"."manga"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feed_pages" ADD CONSTRAINT "feed_pages_manga_id_manga_id_fk" FOREIGN KEY ("manga_id") REFERENCES "public"."manga"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reading_progress" ADD CONSTRAINT "reading_progress_manga_id_manga_id_fk" FOREIGN KEY ("manga_id") REFERENCES "public"."manga"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "bookmarks_user_manga_idx" ON "bookmarks" USING btree ("user_id","manga_id");--> statement-breakpoint
CREATE INDEX "chapters_manga_lang_idx" ON "chapters" USING btree ("manga_id","translated_language");--> statement-breakpoint
CREATE INDEX "chapters_manga_num_idx" ON "chapters" USING btree ("manga_id","chapter_number");--> statement-breakpoint
CREATE INDEX "manga_title_idx" ON "manga" USING btree ("title");--> statement-breakpoint
CREATE UNIQUE INDEX "progress_user_chapter_idx" ON "reading_progress" USING btree ("user_id","chapter_id");