DO $$
BEGIN
  CREATE TYPE "ProjectApplicationSourceType" AS ENUM ('CASH', 'CUSTOMER_CREDIT', 'ADJUSTMENT');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "project_applications" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "amount" DECIMAL(12, 2) NOT NULL,
  "sourceType" "ProjectApplicationSourceType" NOT NULL,
  "paymentId" TEXT,
  "paymentAllocationId" TEXT,
  "creditTransactionId" TEXT,
  "projectAdjustmentId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "project_applications_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "project_applications_paymentAllocationId_key"
  ON "project_applications"("paymentAllocationId");
CREATE UNIQUE INDEX IF NOT EXISTS "project_applications_creditTransactionId_key"
  ON "project_applications"("creditTransactionId");
CREATE UNIQUE INDEX IF NOT EXISTS "project_applications_projectAdjustmentId_key"
  ON "project_applications"("projectAdjustmentId");

CREATE INDEX IF NOT EXISTS "project_applications_projectId_idx"
  ON "project_applications"("projectId");
CREATE INDEX IF NOT EXISTS "project_applications_customerId_idx"
  ON "project_applications"("customerId");
CREATE INDEX IF NOT EXISTS "project_applications_sourceType_idx"
  ON "project_applications"("sourceType");
CREATE INDEX IF NOT EXISTS "project_applications_paymentId_idx"
  ON "project_applications"("paymentId");
CREATE INDEX IF NOT EXISTS "project_applications_projectId_sourceType_idx"
  ON "project_applications"("projectId", "sourceType");
CREATE INDEX IF NOT EXISTS "project_applications_customerId_createdAt_idx"
  ON "project_applications"("customerId", "createdAt" DESC);

DO $$
BEGIN
  ALTER TABLE "project_applications"
    ADD CONSTRAINT "project_applications_projectId_fkey"
    FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "project_applications"
    ADD CONSTRAINT "project_applications_customerId_fkey"
    FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "project_applications"
    ADD CONSTRAINT "project_applications_paymentId_fkey"
    FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "project_applications"
    ADD CONSTRAINT "project_applications_paymentAllocationId_fkey"
    FOREIGN KEY ("paymentAllocationId") REFERENCES "PaymentAllocation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "project_applications"
    ADD CONSTRAINT "project_applications_creditTransactionId_fkey"
    FOREIGN KEY ("creditTransactionId") REFERENCES "credit_transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "project_applications"
    ADD CONSTRAINT "project_applications_projectAdjustmentId_fkey"
    FOREIGN KEY ("projectAdjustmentId") REFERENCES "project_adjustments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

INSERT INTO "project_applications" (
  "id",
  "projectId",
  "customerId",
  "amount",
  "sourceType",
  "paymentId",
  "paymentAllocationId",
  "createdAt"
)
SELECT
  CONCAT('pa_', MD5(pa."id")),
  pa."projectId",
  p."customerId",
  pa."allocatedAmount",
  'CASH'::"ProjectApplicationSourceType",
  pa."paymentId",
  pa."id",
  pa."createdAt"
FROM "PaymentAllocation" pa
JOIN "Project" p ON p."id" = pa."projectId"
WHERE NOT EXISTS (
  SELECT 1
  FROM "project_applications" existing
  WHERE existing."paymentAllocationId" = pa."id"
);

INSERT INTO "project_applications" (
  "id",
  "projectId",
  "customerId",
  "amount",
  "sourceType",
  "projectAdjustmentId",
  "createdAt"
)
SELECT
  CONCAT('adj_', MD5(adj."id")),
  adj."projectId",
  p."customerId",
  adj."amount",
  'ADJUSTMENT'::"ProjectApplicationSourceType",
  adj."id",
  adj."createdAt"
FROM "project_adjustments" adj
JOIN "Project" p ON p."id" = adj."projectId"
WHERE NOT EXISTS (
  SELECT 1
  FROM "project_applications" existing
  WHERE existing."projectAdjustmentId" = adj."id"
);

INSERT INTO "project_applications" (
  "id",
  "projectId",
  "customerId",
  "amount",
  "sourceType",
  "paymentId",
  "creditTransactionId",
  "createdAt"
)
SELECT
  CONCAT('ct_', MD5(ct."id")),
  ct."projectId",
  ct."customerId",
  ABS(ct."amount"),
  'CUSTOMER_CREDIT'::"ProjectApplicationSourceType",
  ct."paymentId",
  ct."id",
  ct."createdAt"
FROM "credit_transactions" ct
WHERE ct."type" = 'APPLIED'
  AND ct."projectId" IS NOT NULL
  AND ct."amount" < 0
  AND NOT EXISTS (
    SELECT 1
    FROM "project_applications" existing
    WHERE existing."creditTransactionId" = ct."id"
  );

CREATE OR REPLACE VIEW "ProjectFinancials" AS
SELECT
  p.id AS "projectId",
  COALESCE(app."appliedCashTotal", 0)::numeric(12, 2) AS "allocatedTotal",
  COALESCE(app."adjustmentTotal", 0)::numeric(12, 2) AS "adjustmentTotal",
  (
    COALESCE(p."totalAmount", 0)
    - COALESCE(app."settledTotal", 0)
  )::numeric(12, 2) AS "rawBalance",
  GREATEST(
    0,
    COALESCE(p."totalAmount", 0)
    - COALESCE(app."settledTotal", 0)
  )::numeric(12, 2) AS balance,
  GREATEST(
    0,
    -(
      COALESCE(p."totalAmount", 0)
      - COALESCE(app."settledTotal", 0)
    )
  )::numeric(12, 2) AS overpayment,
  COALESCE(app."appliedCashTotal", 0)::numeric(12, 2) AS "appliedCashTotal",
  COALESCE(app."appliedCreditTotal", 0)::numeric(12, 2) AS "appliedCreditTotal",
  COALESCE(app."settledTotal", 0)::numeric(12, 2) AS "settledTotal"
FROM "Project" p
LEFT JOIN (
  SELECT
    "projectId",
    SUM(amount) FILTER (WHERE "sourceType" = 'CASH'::"ProjectApplicationSourceType") AS "appliedCashTotal",
    SUM(amount) FILTER (WHERE "sourceType" = 'CUSTOMER_CREDIT'::"ProjectApplicationSourceType") AS "appliedCreditTotal",
    SUM(amount) FILTER (WHERE "sourceType" = 'ADJUSTMENT'::"ProjectApplicationSourceType") AS "adjustmentTotal",
    SUM(amount) AS "settledTotal"
  FROM "project_applications"
  GROUP BY "projectId"
) app ON app."projectId" = p.id;
