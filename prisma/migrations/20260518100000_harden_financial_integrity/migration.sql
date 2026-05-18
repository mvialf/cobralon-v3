-- Keep the legacy Project.balance column aligned with the canonical view.
UPDATE "Project" p
SET balance = pf.balance
FROM "ProjectFinancials" pf
WHERE pf."projectId" = p.id
  AND ABS(p.balance - pf.balance) > 1;

DO $$
BEGIN
  ALTER TABLE "project_applications"
    ADD CONSTRAINT "project_applications_amount_positive_check"
    CHECK (amount > 0);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "project_adjustments"
    ADD CONSTRAINT "project_adjustments_amount_positive_check"
    CHECK (amount > 0);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
