-- Clear non-critical operational data.
--
-- Business decision:
-- - Preserve models and functionality for future use.
-- - Preserve customers, projects, payments, project applications, credit ledger,
--   project adjustments, installments, statuses, colors, and auth data.
-- - Current calendar, aftersale, visit, and team assignment records are not
--   important and can be reset.
--
-- TRUNCATE ... CASCADE also clears Prisma implicit many-to-many join tables
-- that reference these tables, such as event/team-tag pivots.

TRUNCATE TABLE
  "project_events",
  "aftersale_events",
  "visit_events",
  "Aftersale",
  "visits",
  "team_tags"
CASCADE;
