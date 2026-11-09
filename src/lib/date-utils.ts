/**
 * Timezone-safe date utilities for calendar operations.
 *
 * Events are stored as ISO strings (timestamptz). All-day events use
 * T00:00:00–T23:59:59 on the intended calendar day, but when the browser
 * parses these as local time, a user in a negative-offset timezone can see
 * the event shifted to the previous day.
 *
 * These helpers normalize every comparison to a YYYY-MM-DD calendar string
 * derived from the UTC component, so all-day events always display on the
 * day the user intended regardless of their timezone.
 */

/** Format a Date (or ISO string) as a zero-padded YYYY-MM-DD calendar key. */
export function toCalendarDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Format a native Date for an HTML <input type="date"> value (YYYY-MM-DD). */
export function toDateInputValue(date: Date): string {
  return toCalendarDate(date);
}

/** Format a native Date for an HTML <input type="time"> value (HH:MM). */
export function toTimeInputValue(date: Date): string {
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

/**
 * Returns true when the given calendar date (YYYY-MM-DD) falls within an
 * event's date span (inclusive). Uses calendar-day comparison, not
 * millisecond comparison, so all-day events display on the correct day
 * regardless of timezone.
 */
export function isDateInRange(
  calendarDate: string,
  eventStartDate: string,
  eventEndDate: string,
): boolean {
  const start = toCalendarDate(eventStartDate);
  const end = toCalendarDate(eventEndDate);
  return calendarDate >= start && calendarDate <= end;
}

/** Human-friendly date label, e.g. "Mar 5, 2026". */
export function formatHumanDate(dateStr: string, includeYear = true): string {
  const date = new Date(dateStr + (dateStr.length === 10 ? 'T12:00:00' : ''));
  const options: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
  };
  if (includeYear) options.year = 'numeric';
  return date.toLocaleDateString('en-US', options);
}

/** Human-friendly time label, e.g. "2:30 PM". */
export function formatHumanTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/** True when start and end fall on different calendar days. */
export function isMultiDay(startISO: string, endISO: string): boolean {
  return toCalendarDate(startISO) !== toCalendarDate(endISO);
}

/**
 * Advance a date by a recurrence rule, clamping month-end dates so a
 * Jan 31 monthly recurrence lands on Feb 28 (or 29) rather than Mar 3.
 */
export function advanceRecurrence(
  date: Date,
  rule: 'daily' | 'weekly' | 'monthly' | 'yearly',
): Date {
  switch (rule) {
    case 'daily':
      return new Date(date.getTime() + 24 * 60 * 60 * 1000);
    case 'weekly':
      return new Date(date.getTime() + 7 * 24 * 60 * 60 * 1000);
    case 'monthly':
      return clampMonthEnd(date, date.getFullYear(), date.getMonth() + 1);
    case 'yearly':
      return clampMonthEnd(date, date.getFullYear() + 1, date.getMonth());
  }
}

function clampMonthEnd(
  original: Date,
  year: number,
  month: number,
): Date {
  const targetMonth = ((month % 12) + 12) % 12;
  const yearAdjust = Math.floor(month / 12);
  const actualYear = year + yearAdjust;
  const lastDayOfTargetMonth = new Date(actualYear, targetMonth + 1, 0).getDate();
  const day = Math.min(original.getDate(), lastDayOfTargetMonth);
  return new Date(actualYear, targetMonth, day);
}
