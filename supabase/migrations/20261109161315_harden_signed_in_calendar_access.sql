/*
# Harden signed-in calendar access

1. Purpose
- Remove unnecessary Data API privileges from the public `anon` role.
- Keep the shared calendar usable by signed-in users.
- Prevent clients from changing event ownership, identifiers, or audit timestamps.

2. Modified tables
- `calendar_events`
  - `created_by` now defaults to the authenticated user when omitted.
  - Signed-in users can insert and update event content, but cannot write ownership or audit columns.
  - Add an index for `parent_event_id` to support recurring-event lookups and cascades.
- `event_type_colors`
  - Signed-in users can read and update existing shared colors.
  - Public and unnecessary insert/delete access is removed.
- `discovered_events`
  - Public role access is removed; existing signed-in ownership policies remain in force.
- `assistant_last_checked`
  - Public role access is removed; existing signed-in ownership policies remain in force.

3. Security
- Revoke all privileges from `anon` on all application tables.
- Grant only the verbs required by the signed-in application.
- Preserve row-level security and signed-in ownership checks.

4. Important notes
- The calendar remains intentionally shared between signed-in users through its existing SELECT policy.
- The frontend must omit `created_by` when inserting or updating events so the database owns that field.
*/

ALTER TABLE calendar_events
  ALTER COLUMN created_by SET DEFAULT auth.uid();

REVOKE ALL PRIVILEGES ON calendar_events, event_type_colors, discovered_events, assistant_last_checked FROM anon;

REVOKE INSERT, UPDATE ON calendar_events FROM authenticated;
GRANT INSERT (
  title,
  description,
  start_date,
  end_date,
  all_day,
  event_type,
  color,
  is_recurring,
  recurrence_rule,
  recurrence_end_date,
  parent_event_id,
  hyperlink
) ON calendar_events TO authenticated;
GRANT UPDATE (
  title,
  description,
  start_date,
  end_date,
  all_day,
  event_type,
  color,
  is_recurring,
  recurrence_rule,
  recurrence_end_date,
  parent_event_id,
  hyperlink
) ON calendar_events TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON discovered_events TO authenticated;
GRANT SELECT, INSERT, UPDATE ON assistant_last_checked TO authenticated;
GRANT SELECT, UPDATE ON event_type_colors TO authenticated;

CREATE INDEX IF NOT EXISTS calendar_events_parent_event_id_idx
  ON calendar_events(parent_event_id);

DROP POLICY IF EXISTS "Authenticated users can create events" ON calendar_events;
CREATE POLICY "Authenticated users can create events"
  ON calendar_events
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = created_by);

DROP POLICY IF EXISTS "Users can update own events" ON calendar_events;
CREATE POLICY "Users can update own events"
  ON calendar_events
  FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = created_by)
  WITH CHECK ((select auth.uid()) = created_by);

DROP POLICY IF EXISTS "Users can delete own events" ON calendar_events;
CREATE POLICY "Users can delete own events"
  ON calendar_events
  FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = created_by);

DROP POLICY IF EXISTS "Users can select own discovered events" ON discovered_events;
CREATE POLICY "Users can select own discovered events"
  ON discovered_events
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert own discovered events" ON discovered_events;
CREATE POLICY "Users can insert own discovered events"
  ON discovered_events
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own discovered events" ON discovered_events;
CREATE POLICY "Users can update own discovered events"
  ON discovered_events
  FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete own discovered events" ON discovered_events;
CREATE POLICY "Users can delete own discovered events"
  ON discovered_events
  FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can select own last checked" ON assistant_last_checked;
CREATE POLICY "Users can select own last checked"
  ON assistant_last_checked
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert own last checked" ON assistant_last_checked;
CREATE POLICY "Users can insert own last checked"
  ON assistant_last_checked
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own last checked" ON assistant_last_checked;
CREATE POLICY "Users can update own last checked"
  ON assistant_last_checked
  FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);
