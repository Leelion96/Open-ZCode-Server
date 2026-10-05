CREATE TABLE "server_metadata" (
  "key" TEXT NOT NULL,
  "value" TEXT NOT NULL,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "server_metadata_pkey" PRIMARY KEY ("key")
);
INSERT INTO "server_metadata" ("key", "value", "updated_at") VALUES ('schema-version', '0.1.0', CURRENT_TIMESTAMP);
