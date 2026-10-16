-- CMS translations: existing columns stay the uz version; other languages live in "translations".
ALTER TABLE "pages" ADD COLUMN "translations" JSONB NOT NULL DEFAULT '{}';
ALTER TABLE "news_articles" ADD COLUMN "translations" JSONB NOT NULL DEFAULT '{}';
ALTER TABLE "faq_items" ADD COLUMN "translations" JSONB NOT NULL DEFAULT '{}';

-- Language of notices / e-mails per user.
ALTER TABLE "notification_preferences" ADD COLUMN "language" TEXT NOT NULL DEFAULT 'uz';

-- CreateTable
CREATE TABLE "notification_templates" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "updatedById" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_templates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "notification_templates_key_language_key" ON "notification_templates"("key", "language");
