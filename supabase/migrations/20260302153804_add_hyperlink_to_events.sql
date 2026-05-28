/*
  # Add hyperlink field to calendar events

  1. Changes
    - Add `hyperlink` column to `calendar_events` table
      - Type: text (nullable)
      - Stores URLs to accommodation, venues, or related places
  
  2. Notes
    - Column is optional to maintain backward compatibility
    - Can store any valid URL (accommodation, venue, maps, etc.)
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'calendar_events' AND column_name = 'hyperlink'
  ) THEN
    ALTER TABLE calendar_events ADD COLUMN hyperlink text;
  END IF;
END $$;