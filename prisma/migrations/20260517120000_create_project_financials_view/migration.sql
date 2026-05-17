CREATE OR REPLACE VIEW "ProjectFinancials" AS
SELECT
  p.id AS "projectId",
  COALESCE(pa."allocatedTotal", 0)::numeric(12, 2) AS "allocatedTotal",
  COALESCE(adj."adjustmentTotal", 0)::numeric(12, 2) AS "adjustmentTotal",
  (
    COALESCE(p."totalAmount", 0)
    - COALESCE(pa."allocatedTotal", 0)
    - COALESCE(adj."adjustmentTotal", 0)
  )::numeric(12, 2) AS "rawBalance",
  GREATEST(
    0,
    COALESCE(p."totalAmount", 0)
    - COALESCE(pa."allocatedTotal", 0)
    - COALESCE(adj."adjustmentTotal", 0)
  )::numeric(12, 2) AS balance,
  GREATEST(
    0,
    -(
      COALESCE(p."totalAmount", 0)
      - COALESCE(pa."allocatedTotal", 0)
      - COALESCE(adj."adjustmentTotal", 0)
    )
  )::numeric(12, 2) AS overpayment
FROM "Project" p
LEFT JOIN (
  SELECT
    "projectId",
    SUM("allocatedAmount") AS "allocatedTotal"
  FROM "PaymentAllocation"
  GROUP BY "projectId"
) pa ON pa."projectId" = p.id
LEFT JOIN (
  SELECT
    "projectId",
    SUM(amount) AS "adjustmentTotal"
  FROM "project_adjustments"
  GROUP BY "projectId"
) adj ON adj."projectId" = p.id;
