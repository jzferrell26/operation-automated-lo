# Public financing tenant inventory correction

Root owns this separate test-only extension. The frozen persistence repair, original Security HOLD and foundation pins remain unchanged.

`supabase/tests/phase0_scaffold.pgtap.sql` changes the exact tenant-table expectation from 31 to 39 for the seven assigned persistence tables plus the protected public scope table, adds eight named existence assertions and changes the pgTAP plan from 22 to 30. Existing ownership, RLS, forced RLS, runtime privileges, foreign-key indexes and function-grant checks remain intact. SHA-256: `d42095b013a097275d7475dda03356b7a8063cce73cad989e4bb7a51d111a6be`.

The assigned migration was inspected, including the scope table's `location_id` and forced RLS. `git diff --check` passes. Actual PostgreSQL and pgTAP execution remains pending canonical CI; no successful SQL attack reproduction or runtime qualification is claimed.
