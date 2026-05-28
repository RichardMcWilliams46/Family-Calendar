/*
  # Add Event Type Colors and Recurring Events

  1. New Tables
    - `event_type_colors`
      - `id` (uuid, primary key) - Unique identifier
      - `event_type` (text, unique, required) - The type of event (Holiday, Birthday, etc.)
      - `color` (text, required) - Hex color code for this event type
      - `created_at` (timestamptz, default now()) - When created
      - `updated_at` (timestamptz, default now()) - When last updated

  2. Modified Tables
    - `calendar_events`
      - Add `is_recurring` (boolean, default false) - Whether event repeats
      - Add `recurrence_rule` (text, optional) - How the event recurs (daily, weekly, monthly, yearly)
      - Add `recurrence_end_date` (timestamptz, optional) - When recurring stops
      - Add `parent_event_id` (uuid, optional, references calendar_events) - Links to parent recurring event

  3. Security
    - Enable RLS on `event_type_colors` table
    - All authenticated users can view color settings (shared configuration)
    - All authenticated users can update color settings (shared management)

  4. Default Data
    - Insert default event type color mappings with sunflower/yellow theme

  5. Important Notes
    - Event type colors are shared between all users for consistency
    - Recurring events can be daily, weekly, monthly, or yearly
    - Individual instances of recurring events link back to parent
*/

-- Create event_type_colors table
CREATE TABLE IF NOT EXISTS event_type_colors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text UNIQUE NOT NULL,
  color text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE event_type_colors ENABLE ROW LEVEL SECURITY;

-- Policy: All authenticated users can view event type colors
CREATE POLICY "Authenticated users can view event type colors"
  ON event_type_colors
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: All authenticated users can update event type colors
CREATE POLICY "Authenticated users can update event type colors"
  ON event_type_colors
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policy: All authenticated users can insert event type colors
CREATE POLICY "Authenticated users can insert event type colors"
  ON event_type_colors
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Insert default sunflower/yellow themed color mappings
INSERT INTO event_type_colors (event_type, color) VALUES
  ('Event', '#F59E0B'),
  ('Holiday', '#DC2626'),
  ('Birthday', '#EC4899'),
  ('Anniversary', '#8B5CF6'),
  ('Appointment', '#0EA5E9'),
  ('Meeting', '#10B981'),
  ('Reminder', '#F97316'),
  ('Other', '#6B7280')
ON CONFLICT (event_type) DO NOTHING;

-- Add recurring event fields to calendar_events
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'calendar_events' AND column_name = 'is_recurring'
  ) THEN
    ALTER TABLE calendar_events ADD COLUMN is_recurring boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'calendar_events' AND column_name = 'recurrence_rule'
  ) THEN
    ALTER TABLE calendar_events ADD COLUMN recurrence_rule text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'calendar_events' AND column_name = 'recurrence_end_date'
  ) THEN
    ALTER TABLE calendar_events ADD COLUMN recurrence_end_date timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'calendar_events' AND column_name = 'parent_event_id'
  ) THEN
    ALTER TABLE calendar_events ADD COLUMN parent_event_id uuid REFERENCES calendar_events(id) ON DELETE CASCADE;
  END IF;
END $$;