/*
# Add atomic color-update and recurring-event generation functions

1. Purpose
- Replace the frontend's multi-step, non-atomic color save with a single
  server-side function that updates event_type_colors and all matching
  calendar_events in one transaction. If any step fails, nothing changes.
- Replace the frontend's two-step recurring event creation (insert parent,
  then insert children in a separate call) with a single function that
  creates the parent and all recurrence children atomically. If the child
  insert fails, the parent is rolled back — no orphaned recurring events.

2. New Functions
- `update_event_type_color(event_type text, new_color text)`
  - SECURITY DEFINER, callable by authenticated users only.
  - Updates the event_type_colors row for the given type.
  - Updates the color on all calendar_events matching that type.
  - Both updates succeed or both fail — no partial mismatch.
  - Returns the count of events updated.

- `create_recurring_event(payload jsonb, occurrences jsonb)`
  - SECURITY DEFINER, callable by authenticated users only.
  - Inserts the parent event from `payload`, then inserts all `occurrences`
    as child events in the same transaction.
  - If any insert fails, everything rolls back — no orphaned parents.
  - Returns the parent event row as JSON.

3. Security
- Both functions are SECURITY DEFINER (run with the table owner's privileges)
  so they can perform multi-table writes that RLS would otherwise gate per-row.
- EXECUTE is revoked from PUBLIC and anon, granted only to authenticated.
- The functions verify auth.uid() internally to ensure the caller is signed in.
- The recurring function sets created_by on every row to auth.uid() so
  ownership is always correct, regardless of what the client sends.
*/

-- ===== Atomic color update =====

CREATE OR REPLACE FUNCTION update_event_type_color(
  p_event_type text,
  p_new_color text
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_updated_count integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Update the shared color setting
  UPDATE event_type_colors
  SET color = p_new_color, updated_at = now()
  WHERE event_type = p_event_type;

  -- Update all events of this type to match
  UPDATE calendar_events
  SET color = p_new_color, updated_at = now()
  WHERE event_type = p_event_type;

  GET DIAGNOSTICS v_updated_count = ROW_COUNT;

  RETURN v_updated_count;
END;
$$;

REVOKE EXECUTE ON FUNCTION update_event_type_color(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION update_event_type_color(text, text) TO authenticated;


-- ===== Atomic recurring event creation =====

CREATE OR REPLACE FUNCTION create_recurring_event(
  p_payload jsonb,
  p_occurrences jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_parent_id uuid;
  v_parent_row record;
  v_occ jsonb;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Insert the parent event, forcing created_by to the authenticated user
  INSERT INTO calendar_events (
    title, description, hyperlink,
    start_date, end_date, all_day,
    event_type, color,
    is_recurring, recurrence_rule, recurrence_end_date,
    created_by
  )
  SELECT
    p_payload->>'title',
    COALESCE(p_payload->>'description', ''),
    p_payload->>'hyperlink',
    (p_payload->>'start_date')::timestamptz,
    (p_payload->>'end_date')::timestamptz,
    COALESCE((p_payload->>'all_day')::boolean, false),
    COALESCE(p_payload->>'event_type', 'Event'),
    COALESCE(p_payload->>'color', '#F59E0B'),
    true,
    p_payload->>'recurrence_rule',
    NULLIF(p_payload->>'recurrence_end_date', '')::timestamptz,
    auth.uid()
  RETURNING id INTO v_parent_id;

  -- Insert all recurrence children atomically
  FOR v_occ IN SELECT jsonb_array_elements(p_occurrences)
  LOOP
    INSERT INTO calendar_events (
      title, description, hyperlink,
      start_date, end_date, all_day,
      event_type, color,
      is_recurring, parent_event_id,
      created_by
    )
    VALUES (
      v_occ->>'title',
      COALESCE(v_occ->>'description', ''),
      v_occ->>'hyperlink',
      (v_occ->>'start_date')::timestamptz,
      (v_occ->>'end_date')::timestamptz,
      COALESCE((v_occ->>'all_day')::boolean, false),
      COALESCE(v_occ->>'event_type', 'Event'),
      COALESCE(v_occ->>'color', '#F59E0B'),
      false,
      v_parent_id,
      auth.uid()
    );
  END LOOP;

  -- Return the parent row as JSON
  SELECT to_jsonb(t) INTO v_parent_row
  FROM (
    SELECT * FROM calendar_events WHERE id = v_parent_id
  ) t;

  RETURN v_parent_row;
END;
$$;

REVOKE EXECUTE ON FUNCTION create_recurring_event(jsonb, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION create_recurring_event(jsonb, jsonb) TO authenticated;
