/*
  # Create Calendar Events Table

  1. New Tables
    - `calendar_events`
      - `id` (uuid, primary key) - Unique identifier for each event
      - `title` (text, required) - Name/title of the event
      - `description` (text, optional) - Additional details about the event
      - `start_date` (timestamptz, required) - When the event starts
      - `end_date` (timestamptz, required) - When the event ends
      - `all_day` (boolean, default false) - Whether it's an all-day event
      - `event_type` (text, default 'event') - Category like 'holiday', 'birthday', 'appointment', etc.
      - `color` (text, default '#3B82F6') - Color code for visual organization
      - `created_by` (uuid, references auth.users) - User who created the event
      - `created_at` (timestamptz, default now()) - When the event was created
      - `updated_at` (timestamptz, default now()) - When the event was last updated

  2. Security
    - Enable RLS on `calendar_events` table
    - Add policy for authenticated users to view all events (shared calendar)
    - Add policy for authenticated users to create events
    - Add policy for users to update their own events
    - Add policy for users to delete their own events

  3. Important Notes
    - All authenticated users can view all events (shared between husband and wife)
    - Users can only modify/delete events they created
    - Timestamps are stored in UTC for consistency
*/

CREATE TABLE IF NOT EXISTS calendar_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text DEFAULT '',
  start_date timestamptz NOT NULL,
  end_date timestamptz NOT NULL,
  all_day boolean DEFAULT false,
  event_type text DEFAULT 'event',
  color text DEFAULT '#3B82F6',
  created_by uuid REFERENCES auth.users(id) NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

-- Policy: All authenticated users can view all events (shared calendar)
CREATE POLICY "Authenticated users can view all events"
  ON calendar_events
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Authenticated users can create events
CREATE POLICY "Authenticated users can create events"
  ON calendar_events
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

-- Policy: Users can update their own events
CREATE POLICY "Users can update own events"
  ON calendar_events
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

-- Policy: Users can delete their own events
CREATE POLICY "Users can delete own events"
  ON calendar_events
  FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by);

-- Create index for faster date-based queries
CREATE INDEX IF NOT EXISTS calendar_events_start_date_idx ON calendar_events(start_date);
CREATE INDEX IF NOT EXISTS calendar_events_created_by_idx ON calendar_events(created_by);