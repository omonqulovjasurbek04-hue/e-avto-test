-- Server-generated secrets (JWT_SECRET_FROM_DB).
CREATE TABLE "app_secrets" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "app_secrets_pkey" PRIMARY KEY ("key")
);
