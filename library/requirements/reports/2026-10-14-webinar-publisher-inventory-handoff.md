# Publisher tenant inventory correction

Root owns this separate test-only extension. The frozen database handoff and its ten source pins remain unchanged.

`supabase/tests/phase0_scaffold.pgtap.sql` changes the exact tenant-table expectation from 31 to 36 for the five assigned publisher tables, adds five named existence assertions and changes the pgTAP plan from 22 to 27. Existing ownership, RLS, forced RLS, runtime privileges, foreign-key indexes and function-grant checks remain intact. SHA-256: `150930696f8d9d5152800870e52b975d7e67930e65b6bddff1419f8bf8f9ef93`.

The new migration was inspected for all five `location_id` columns. `git diff --check` passes. Actual PostgreSQL and pgTAP execution remains pending canonical CI; this is an inventory correction, not a runtime qualification result.
