CREATE TABLE "announcement_receipts" (
    "device_mid" UUID NOT NULL,
    "campaign_id" VARCHAR(128) NOT NULL,
    "action_type" VARCHAR(7) NOT NULL CHECK ("action_type" IN ('confirm', 'cancel')),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "announcement_receipts_pkey" PRIMARY KEY ("device_mid", "campaign_id")
);
UPDATE "server_metadata" SET "value" = '0.1.1', "updated_at" = CURRENT_TIMESTAMP WHERE "key" = 'schema-version';
