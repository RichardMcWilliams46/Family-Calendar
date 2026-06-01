/*
  # Malta Travel Assistant Tables

  1. New Tables
    - `discovered_events`
      - `id` (uuid, primary key)
      - `title` (text) - event name
      - `description` (text) - event details
      - `event_date` (text) - date string as found on the web (may be partial/fuzzy)
      - `event_date_parsed` (date, nullable) - parsed date if extractable
      - `venue` (text, nullable) - venue/location
      - `category` (text) - 'concert', 'theatre', 'event', 'festival', etc.
      - `source_url` (text, nullable) - URL where the event was found
      - `source_title` (text, nullable) - title of the source page
      - `discovered_at` (timestamptz) - when we found this
      - `added_to_calendar` (boolean) - whether user added it to their calendar
      - `dismissed` (boolean) - whether user dismissed it
      - `user_id` (uuid) - owner

    - `assistant_last_checked`
      - `id` (uuid, primary key)
      - `user_id` (uuid, unique)
      - `last_checked_at` (timestamptz) - last time we searched for events

  2. Security
    - RLS on both tables, users can only see/modify their own rows
*/

CREATE TABLE IF NOT EXISTS discovered_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text DEFAULT '',
  event_date text DEFAULT '',
  event_date_parsed date,
  venue text DEFAULT '',
  category text DEFAULT 'event',
  source_url text DEFAULT '',
  source_title text DEFAULT '',
  discovered_at timestamptz DEFAULT now(),
  added_to_calendar boolean DEFAULT false,
  dismissed boolean DEFAULT false,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

ALTER TABLE discovered_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own discovered events"
  ON discovered_events FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own discovered events"
  ON discovered_events FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own discovered events"
  ON discovered_events FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own discovered events"
  ON discovered_events FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_discovered_events_user_id ON discovered_events(user_id);
CREATE INDEX IF NOT EXISTS idx_discovered_events_dismissed ON discovered_events(user_id, dismissed);

-- Track last checked time per user
CREATE TABLE IF NOT EXISTS assistant_last_checked (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  last_checked_at timestamptz DEFAULT '2000-01-01'::timestamptz
);

ALTER TABLE assistant_last_checked ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own last checked"
  ON assistant_last_checked FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own last checked"
  ON assistant_last_checked FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own last checked"
  ON assistant_last_checked FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
