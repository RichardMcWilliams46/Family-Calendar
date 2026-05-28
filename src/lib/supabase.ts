import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type CalendarEvent = {
  id: string;
  title: string;
  description: string;
  start_date: string;
  end_date: string;
  all_day: boolean;
  event_type: string;
  color: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  is_recurring: boolean;
  recurrence_rule: string | null;
  recurrence_end_date: string | null;
  parent_event_id: string | null;
  hyperlink: string | null;
};

export type EventTypeColor = {
  id: string;
  event_type: string;
  color: string;
  created_at: string;
  updated_at: string;
};
