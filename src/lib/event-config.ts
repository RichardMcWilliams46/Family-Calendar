export const EVENT_TYPES = [
  'Event',
  'Holiday',
  'Maltese Bank Holiday',
  'Birthday',
  'Anniversary',
  'Appointment',
  'Meeting',
  'Reminder',
  'Travel',
  'Other',
] as const;

export const PRESET_COLORS = [
  { name: 'Yellow', value: '#EAB308' },
  { name: 'Amber', value: '#F59E0B' },
  { name: 'Orange', value: '#F97316' },
  { name: 'Terracotta', value: '#C2410C' },
  { name: 'Red', value: '#DC2626' },
  { name: 'Pink', value: '#EC4899' },
  { name: 'Coral', value: '#FB7185' },
  { name: 'Blue', value: '#0EA5E9' },
  { name: 'Teal', value: '#14B8A6' },
  { name: 'Green', value: '#10B981' },
  { name: 'Emerald', value: '#059669' },
  { name: 'Lime', value: '#84CC16' },
] as const;

export const DEFAULT_EVENT_COLOR = '#F59E0B';
