import { useState, useEffect, useMemo, useRef } from 'react';
import { supabase, CalendarEvent, EventTypeColor } from '../lib/supabase';
import { DEFAULT_EVENT_COLOR, EVENT_TYPES } from '../lib/event-config';
import { toDateInputValue, toTimeInputValue, advanceRecurrence } from '../lib/date-utils';
import { X, Calendar, Clock, Tag, Trash2, Repeat, Link, FileText, CalendarClock, AlertCircle, Plus } from 'lucide-react';

interface OccurrenceRow {
  title: string;
  description: string;
  hyperlink: string | null;
  start_date: string;
  end_date: string;
  all_day: boolean;
  event_type: string;
  color: string;
  is_recurring: boolean;
  parent_event_id: string | null;
}

function buildOccurrences(
  startISO: string,
  endISO: string,
  rule: string,
  recEndDateStr: string,
  fields: { title: string; description: string; hyperlink: string | null; all_day: boolean; event_type: string; color: string },
): OccurrenceRow[] {
  const recurrences: OccurrenceRow[] = [];
  const start = new Date(startISO);
  const end = new Date(endISO);
  const recEndDate = recEndDateStr
    ? new Date(recEndDateStr + 'T23:59:59')
    : new Date(start.getTime() + 365 * 24 * 60 * 60 * 1000);

  const duration = end.getTime() - start.getTime();
  const MAX_RECURRENCES = 366;
  let current = new Date(start);

  while (current <= recEndDate && recurrences.length < MAX_RECURRENCES) {
    current = advanceRecurrence(current, rule as 'daily' | 'weekly' | 'monthly' | 'yearly');

    if (current <= recEndDate) {
      recurrences.push({
        title: fields.title,
        description: fields.description,
        hyperlink: fields.hyperlink,
        start_date: current.toISOString(),
        end_date: new Date(current.getTime() + duration).toISOString(),
        all_day: fields.all_day,
        event_type: fields.event_type,
        color: fields.color,
        is_recurring: false,
        parent_event_id: null,
      });
    }
  }

  return recurrences;
}

interface EventModalProps {
  selectedDate: Date | null;
  selectedEvent: CalendarEvent | null;
  eventTypeColors: EventTypeColor[];
  onClose: () => void;
  onSave: () => void;
  onSaveAndAddAnother?: () => void;
}

function SectionHeader({ icon: Icon, title }: { icon: typeof Calendar; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-3 mt-1">
      <Icon className="w-4 h-4 text-amber-500 flex-shrink-0" />
      <h3 className="text-xs font-bold uppercase tracking-wider text-amber-500">{title}</h3>
      <div className="flex-1 h-px bg-gradient-to-r from-amber-200/60 to-transparent" />
    </div>
  );
}

/** Add one hour to a "HH:MM" time string, wrapping past midnight. */
function addHour(timeStr: string): string {
  const [h, m] = timeStr.split(':').map(Number);
  const newH = (h + 1) % 24;
  return `${String(newH).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export default function EventModal({ selectedDate, selectedEvent, eventTypeColors, onClose, onSave, onSaveAndAddAnother }: EventModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [hyperlink, setHyperlink] = useState('');
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('10:00');
  const [allDay, setAllDay] = useState(false);
  const [eventType, setEventType] = useState('Event');
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceRule, setRecurrenceRule] = useState('daily');
  const [recurrenceEndDate, setRecurrenceEndDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [submissionBlocked, setSubmissionBlocked] = useState(false);


  // Track original recurrence values to detect changes when editing
  const originalRecurrence = useRef<{ isRecurring: boolean; rule: string; endDate: string } | null>(null);

  // ===== Track whether recurrence settings changed from the original event =====
  const recurrenceWasModified = useMemo(() => {
    if (!selectedEvent || !originalRecurrence.current) return false;
    const orig = originalRecurrence.current;
    return (
      orig.isRecurring !== isRecurring ||
      orig.rule !== recurrenceRule ||
      orig.endDate !== recurrenceEndDate
    );
  }, [selectedEvent, isRecurring, recurrenceRule, recurrenceEndDate]);

  useEffect(() => {
    if (selectedEvent) {
      setTitle(selectedEvent.title);
      setDescription(selectedEvent.description);
      setHyperlink(selectedEvent.hyperlink || '');
      const start = new Date(selectedEvent.start_date);
      const end = new Date(selectedEvent.end_date);

      setStartDate(toDateInputValue(start));
      setStartTime(toTimeInputValue(start));
      setEndDate(toDateInputValue(end));
      setEndTime(toTimeInputValue(end));

      setAllDay(selectedEvent.all_day);
      setEventType(selectedEvent.event_type);
      setIsRecurring(selectedEvent.is_recurring);
      setRecurrenceRule(selectedEvent.recurrence_rule || 'daily');
      const recEnd = selectedEvent.recurrence_end_date
        ? toDateInputValue(new Date(selectedEvent.recurrence_end_date))
        : '';
      setRecurrenceEndDate(recEnd);

      originalRecurrence.current = {
        isRecurring: selectedEvent.is_recurring,
        rule: selectedEvent.recurrence_rule || 'daily',
        endDate: recEnd,
      };

    } else {
      setTitle('');
      setDescription('');
      setHyperlink('');
      setStartTime('09:00');
      setEndTime('10:00');
      setAllDay(false);
      setEventType('Event');
      setIsRecurring(false);
      setRecurrenceRule('daily');
      setRecurrenceEndDate('');

      originalRecurrence.current = null;

      if (selectedDate) {
        const dateStr = toDateInputValue(selectedDate);
        setStartDate(dateStr);
        setEndDate(dateStr);
      } else {
        setStartDate('');
        setEndDate('');
      }
    }
  }, [selectedEvent, selectedDate, eventTypeColors]);

  // ===== Inline validation =====
  const endTimeBeforeStart = useMemo(() => {
    if (allDay) return false;
    if (startDate === endDate && startTime && endTime) {
      return endTime <= startTime;
    }
    return false;
  }, [allDay, startDate, endDate, startTime, endTime]);

  const recEndBeforeStart = useMemo(() => {
    if (!isRecurring || !recurrenceEndDate || !startDate) return false;
    return recurrenceEndDate < startDate;
  }, [isRecurring, recurrenceEndDate, startDate]);

  const hasValidationErrors = endTimeBeforeStart || recEndBeforeStart;

  // ===== Recurrence preview =====
  const recurrenceSummary = useMemo(() => {
    if (!isRecurring || !startDate) return null;

    const ruleText: Record<string, string> = {
      daily: 'Daily',
      weekly: 'Weekly',
      monthly: 'Monthly',
      yearly: 'Yearly',
    };
    const prefix = `Repeats ${ruleText[recurrenceRule]?.toLowerCase()}`;

    if (!recurrenceEndDate) {
      return `${prefix} indefinitely (capped at 1 year)`;
    }

    const recEnd = new Date(recurrenceEndDate + 'T12:00:00');
    const start = new Date(startDate + 'T12:00:00');

    const dayMs = 24 * 60 * 60 * 1000;
    let count = 0;

    if (recurrenceRule === 'daily') {
      count = Math.floor((recEnd.getTime() - start.getTime()) / dayMs);
    } else if (recurrenceRule === 'weekly') {
      count = Math.floor((recEnd.getTime() - start.getTime()) / (7 * dayMs));
    } else if (recurrenceRule === 'monthly') {
      count = (recEnd.getFullYear() - start.getFullYear()) * 12 + (recEnd.getMonth() - start.getMonth());
    } else if (recurrenceRule === 'yearly') {
      count = recEnd.getFullYear() - start.getFullYear();
    }

    const endDateText = recEnd.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    return `${prefix} until ${endDateText} -- ${count} occurrence${count !== 1 ? 's' : ''} will be created`;
  }, [isRecurring, recurrenceRule, recurrenceEndDate, startDate]);

  // ===== Handlers with auto-fill logic =====
  const handleStartDateChange = (value: string) => {
    setStartDate(value);
    if (endDate && value > endDate) {
      setEndDate(value);
    }
  };

  const handleStartTimeChange = (value: string) => {
    setStartTime(value);
    // Auto-advance end time to 1 hour after start, but only if end time
    // is currently equal to or before the new start time.
    setEndTime(prevEnd => {
      if (prevEnd <= value) return addHour(value);
      return prevEnd;
    });
  };

  const handleEventTypeChange = (type: string) => {
    setEventType(type);
  };

  const handleRecurringToggle = (checked: boolean) => {
    setIsRecurring(checked);
  };

  const handleRecurrenceRuleChange = (rule: string) => {
    setRecurrenceRule(rule);
  };

  const handleRecurrenceEndDateChange = (date: string) => {
    setRecurrenceEndDate(date);
  };

  const performSave = async (): Promise<boolean> => {
    if (hasValidationErrors) {
      setSubmissionBlocked(true);
      return false;
    }

    setLoading(true);
    setError('');
    setSubmissionBlocked(false);

    try {
      const startDateTime = allDay
        ? new Date(startDate + 'T00:00:00').toISOString()
        : new Date(startDate + 'T' + startTime).toISOString();

      const endDateTime = allDay
        ? new Date(endDate + 'T23:59:59').toISOString()
        : new Date(endDate + 'T' + endTime).toISOString();

      const resolvedColor = eventTypeColors.find(etc => etc.event_type === eventType)?.color || DEFAULT_EVENT_COLOR;

      const eventData = {
        title,
        description,
        hyperlink: hyperlink || null,
        start_date: startDateTime,
        end_date: endDateTime,
        all_day: allDay,
        event_type: eventType,
        color: resolvedColor,
        is_recurring: isRecurring,
        recurrence_rule: isRecurring ? recurrenceRule : null,
        recurrence_end_date: isRecurring && recurrenceEndDate ? new Date(recurrenceEndDate + 'T23:59:59').toISOString() : null,
      };

      if (selectedEvent) {
        // If recurrence settings changed on an existing recurring event,
        // delete all child occurrences and regenerate them.
        if (recurrenceWasModified && isRecurring) {
          await supabase
            .from('calendar_events')
            .delete()
            .eq('parent_event_id', selectedEvent.id);

          const occurrences = buildOccurrences(
            startDateTime,
            endDateTime,
            recurrenceRule,
            recurrenceEndDate,
            { title, description, hyperlink: hyperlink || null, all_day: allDay, event_type: eventType, color: resolvedColor },
          );

          const { error: rpcError } = await supabase
            .rpc('create_recurring_event', {
              p_payload: {
                title,
                description,
                hyperlink: hyperlink || null,
                start_date: startDateTime,
                end_date: endDateTime,
                all_day: allDay,
                event_type: eventType,
                color: resolvedColor,
                recurrence_rule: recurrenceRule,
                recurrence_end_date: recurrenceEndDate
                  ? new Date(recurrenceEndDate + 'T23:59:59').toISOString()
                  : null,
              },
              p_occurrences: occurrences,
            });

          if (rpcError) throw rpcError;
        }

        // Update the parent event itself
        const { error } = await supabase
          .from('calendar_events')
          .update(eventData)
          .eq('id', selectedEvent.id);

        if (error) throw error;

        // If turning off recurrence, delete all children
        if (recurrenceWasModified && !isRecurring && originalRecurrence.current?.isRecurring) {
          await supabase
            .from('calendar_events')
            .delete()
            .eq('parent_event_id', selectedEvent.id);
        }
      } else if (isRecurring) {
        const occurrences = buildOccurrences(
          startDateTime,
          endDateTime,
          recurrenceRule,
          recurrenceEndDate,
          { title, description, hyperlink: hyperlink || null, all_day: allDay, event_type: eventType, color: resolvedColor },
        );

        const { error: rpcError } = await supabase
          .rpc('create_recurring_event', {
            p_payload: {
              title,
              description,
              hyperlink: hyperlink || null,
              start_date: startDateTime,
              end_date: endDateTime,
              all_day: allDay,
              event_type: eventType,
              color: resolvedColor,
              recurrence_rule: recurrenceRule,
              recurrence_end_date: recurrenceEndDate
                ? new Date(recurrenceEndDate + 'T23:59:59').toISOString()
                : null,
            },
            p_occurrences: occurrences,
          });

        if (rpcError) throw rpcError;
      } else {
        const { error: insertError } = await supabase
          .from('calendar_events')
          .insert([eventData]);

        if (insertError) throw insertError;
      }

      return true;
    } catch {
      setError('Could not save this event. Please try again.');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await performSave();
    if (success) {
      onSave();
      onClose();
    }
  };

  const handleSaveAndAddAnother = async () => {
    if (!title.trim()) {
      setSubmissionBlocked(true);
      return;
    }
    const success = await performSave();
    if (success) {
      onSave();
      // Reset form for next entry, keeping the same date
      setTitle('');
      setDescription('');
      setHyperlink('');
      setStartTime('09:00');
      setEndTime('10:00');
      setAllDay(false);
      setEventType('Event');
      setIsRecurring(false);
      setRecurrenceRule('daily');
      setRecurrenceEndDate('');
      setError('');
      setSubmissionBlocked(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedEvent) return;

    setLoading(true);
    setConfirmDelete(false);
    try {
      // Delete child occurrences too if this is a recurring parent
      if (selectedEvent.is_recurring) {
        await supabase
          .from('calendar_events')
          .delete()
          .eq('parent_event_id', selectedEvent.id);
      }

      const { error } = await supabase
        .from('calendar_events')
        .delete()
        .eq('id', selectedEvent.id);

      if (error) throw error;

      onSave();
      onClose();
    } catch {
      setError('Could not delete this event. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const isCreateMode = !selectedEvent;
  const canAddAnother = isCreateMode && !!onSaveAndAddAnother;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 animate-fadeIn px-0">
      <div className="bg-gradient-to-br from-amber-50/95 via-yellow-50/95 to-white/95 backdrop-blur-md rounded-t-3xl sm:rounded-3xl shadow-2xl w-full max-w-full sm:max-w-2xl mx-0 sm:mx-4 h-[92vh] sm:h-auto sm:max-h-[90vh] flex flex-col transform transition-all duration-300 scale-100 overflow-hidden border-2 border-amber-200/50 min-w-0">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-white px-6 sm:px-8 py-5 sm:py-6 flex items-center justify-between rounded-t-3xl flex-shrink-0 relative overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-2 left-4 text-6xl">🌻</div>
            <div className="absolute bottom-0 right-8 text-5xl">🌻</div>
          </div>
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold relative z-10">
            {selectedEvent ? 'Edit Event' : 'Create Event'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 active:bg-white/20 rounded-xl transition-all duration-200 flex-shrink-0 relative z-10"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 w-full min-w-0">
          <div className="p-4 sm:p-8 space-y-6 overflow-y-auto overflow-x-hidden flex-1 overscroll-contain w-full min-w-0">

            {/* ===== Section: Details ===== */}
            <SectionHeader icon={FileText} title="Details" />
            <div className="space-y-5">
              <div>
                <label htmlFor="title" className="block text-sm font-semibold text-amber-900 mb-2">
                  Event Title
                </label>
                <input
                  id="title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  className="w-full px-4 py-3 sm:px-5 sm:py-3.5 bg-white/80 border-2 border-amber-200 rounded-xl focus:ring-2 focus:ring-amber-400 focus:border-amber-400 focus:bg-white outline-none transition-all duration-200 text-base placeholder:text-amber-300"
                  placeholder="Enter event title"
                />
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-semibold text-amber-900 mb-2">
                  Description
                </label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 sm:px-5 sm:py-3.5 bg-white/80 border-2 border-amber-200 rounded-xl focus:ring-2 focus:ring-amber-400 focus:border-amber-400 focus:bg-white outline-none transition-all duration-200 resize-none text-base placeholder:text-amber-300"
                  placeholder="Add details about this event"
                />
              </div>

              <div>
                <label htmlFor="hyperlink" className="block text-sm font-semibold text-amber-900 mb-2 flex items-center gap-2">
                  <Link className="w-4 h-4 text-amber-600" />
                  Link (accommodation, venue, etc.)
                </label>
                <input
                  id="hyperlink"
                  type="url"
                  value={hyperlink}
                  onChange={(e) => setHyperlink(e.target.value)}
                  className="w-full px-4 py-3 sm:px-5 sm:py-3.5 bg-white/80 border-2 border-amber-200 rounded-xl focus:ring-2 focus:ring-amber-400 focus:border-amber-400 focus:bg-white outline-none transition-all duration-200 text-base placeholder:text-amber-300"
                  placeholder="https://example.com/booking"
                />
              </div>
            </div>

            {/* ===== Section: When ===== */}
            <SectionHeader icon={CalendarClock} title="When" />
            <div className="space-y-4">
              <div className="flex items-center gap-3 bg-gradient-to-r from-amber-100/50 to-yellow-100/50 p-3.5 sm:p-4 rounded-xl border border-amber-200/50">
                <input
                  id="allDay"
                  type="checkbox"
                  checked={allDay}
                  onChange={(e) => setAllDay(e.target.checked)}
                  className="w-5 h-5 text-amber-600 border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 flex-shrink-0"
                />
                <label htmlFor="allDay" className="text-sm font-semibold text-amber-900 cursor-pointer select-none">
                  All-day event
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3" style={{gridTemplateColumns: allDay ? '1fr' : '1fr 1fr'}}>
                <div className="min-w-0 overflow-hidden">
                  <label htmlFor="startDate" className="block text-xs font-semibold text-amber-900 mb-1.5 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                    Start Date
                  </label>
                  <input
                    id="startDate"
                    type="date"
                    value={startDate}
                    onChange={(e) => handleStartDateChange(e.target.value)}
                    required
                    style={{width: '100%', maxWidth: '100%', boxSizing: 'border-box'}}
                    className="block px-2.5 py-2.5 bg-white/80 border-2 border-amber-200 rounded-xl focus:ring-2 focus:ring-amber-400 focus:border-amber-400 focus:bg-white outline-none transition-all duration-200 text-sm"
                  />
                </div>

                {!allDay && (
                  <div className="min-w-0 overflow-hidden">
                    <label htmlFor="startTime" className="block text-xs font-semibold text-amber-900 mb-1.5 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                      Start Time
                    </label>
                    <input
                      id="startTime"
                      type="time"
                      value={startTime}
                      onChange={(e) => handleStartTimeChange(e.target.value)}
                      required
                      style={{width: '100%', maxWidth: '100%', boxSizing: 'border-box'}}
                      className="block px-2.5 py-2.5 bg-white/80 border-2 border-amber-200 rounded-xl focus:ring-2 focus:ring-amber-400 focus:border-amber-400 focus:bg-white outline-none transition-all duration-200 text-sm"
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3" style={{gridTemplateColumns: allDay ? '1fr' : '1fr 1fr'}}>
                <div className="min-w-0 overflow-hidden">
                  <label htmlFor="endDate" className="block text-xs font-semibold text-amber-900 mb-1.5 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-amber-700 flex-shrink-0" />
                    End Date
                  </label>
                  <input
                    id="endDate"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    min={startDate}
                    required
                    style={{width: '100%', maxWidth: '100%', boxSizing: 'border-box'}}
                    className={`block px-2.5 py-2.5 bg-white/80 border-2 rounded-xl focus:ring-2 focus:ring-amber-400 focus:bg-white outline-none transition-all duration-200 text-sm ${
                      endTimeBeforeStart ? 'border-red-400' : 'border-amber-200 focus:border-amber-400'
                    }`}
                  />
                </div>

                {!allDay && (
                  <div className="min-w-0 overflow-hidden">
                    <label htmlFor="endTime" className="block text-xs font-semibold text-amber-900 mb-1.5 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-amber-700 flex-shrink-0" />
                      End Time
                    </label>
                    <input
                      id="endTime"
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      required
                      style={{width: '100%', maxWidth: '100%', boxSizing: 'border-box'}}
                      className={`block px-2.5 py-2.5 bg-white/80 border-2 rounded-xl focus:ring-2 focus:ring-amber-400 focus:bg-white outline-none transition-all duration-200 text-sm ${
                        endTimeBeforeStart ? 'border-red-400 focus:ring-red-400' : 'border-amber-200 focus:border-amber-400'
                      }`}
                    />
                  </div>
                )}
              </div>

              {/* Inline validation: end time before start */}
              {endTimeBeforeStart && (
                <div className="flex items-center gap-2 text-xs text-red-600 font-medium bg-red-50/60 border border-red-200 rounded-lg px-3 py-2 animate-slideDown">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  End time must be after the start time
                </div>
              )}
            </div>

            {/* ===== Section: Repeats ===== */}
            <SectionHeader icon={Repeat} title="Repeats" />
            <div className="space-y-4">
              <div className="flex items-center gap-3 bg-gradient-to-r from-yellow-100/50 to-amber-100/50 p-3.5 sm:p-4 rounded-xl border border-amber-200/50">
                <input
                  id="isRecurring"
                  type="checkbox"
                  checked={isRecurring}
                  onChange={(e) => handleRecurringToggle(e.target.checked)}
                  className="w-5 h-5 text-amber-600 border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 flex-shrink-0"
                />
                <label htmlFor="isRecurring" className="text-sm font-semibold text-amber-900 flex items-center gap-2 cursor-pointer select-none">
                  <Repeat className="w-4 h-4 flex-shrink-0" />
                  Recurring event
                </label>
              </div>

              {isRecurring && (
                <div className="space-y-4">
                  {/* Warning when editing an existing recurring event's pattern */}
                  {selectedEvent && recurrenceWasModified && (
                    <div className="flex items-start gap-2 text-xs text-amber-800 font-medium bg-amber-100/80 border border-amber-300 rounded-lg px-3 py-2.5 animate-slideDown">
                      <AlertCircle className="w-4 h-4 flex-shrink-0 text-amber-600 mt-0.5" />
                      <span>
                        Changing the recurrence pattern will delete all existing repeated events and create new ones based on the updated schedule.
                      </span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 bg-gradient-to-r from-yellow-100/50 to-amber-100/50 p-4 sm:p-5 rounded-xl border border-amber-200/50">
                    <div>
                      <label htmlFor="recurrenceRule" className="block text-sm font-semibold text-amber-900 mb-2 flex items-center gap-2">
                        <Repeat className="w-4 h-4 text-amber-600 flex-shrink-0" />
                        Repeat
                      </label>
                      <select
                        id="recurrenceRule"
                        value={recurrenceRule}
                        onChange={(e) => handleRecurrenceRuleChange(e.target.value)}
                        className="w-full px-4 py-3 sm:px-5 sm:py-3.5 bg-white/80 border-2 border-amber-200 rounded-xl focus:ring-2 focus:ring-amber-400 focus:border-amber-400 outline-none transition-all duration-200 font-medium text-base"
                      >
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                        <option value="yearly">Yearly</option>
                      </select>
                    </div>

                    <div>
                      <label htmlFor="recurrenceEndDate" className="block text-sm font-semibold text-amber-900 mb-2 flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-amber-600 flex-shrink-0" />
                        End Repeat
                      </label>
                      <input
                        id="recurrenceEndDate"
                        type="date"
                        value={recurrenceEndDate}
                        onChange={(e) => handleRecurrenceEndDateChange(e.target.value)}
                        className={`w-full px-4 py-3 sm:px-5 sm:py-3.5 bg-white/80 border-2 rounded-xl focus:ring-2 focus:ring-amber-400 outline-none transition-all duration-200 text-base placeholder:text-amber-300 ${
                          recEndBeforeStart ? 'border-red-400 focus:ring-red-400' : 'border-amber-200 focus:border-amber-400'
                        }`}
                        placeholder="Optional"
                      />
                    </div>
                  </div>

                  {/* Recurrence preview summary */}
                  {recurrenceSummary && !recEndBeforeStart && (
                    <div className="flex items-center gap-2 text-xs text-amber-700 font-medium bg-amber-50/80 border border-amber-200/60 rounded-lg px-3 py-2.5 animate-slideDown">
                      <Repeat className="w-3.5 h-3.5 flex-shrink-0 text-amber-500" />
                      {recurrenceSummary}
                    </div>
                  )}

                  {/* Inline validation: recurrence end before start */}
                  {recEndBeforeStart && (
                    <div className="flex items-center gap-2 text-xs text-red-600 font-medium bg-red-50/60 border border-red-200 rounded-lg px-3 py-2 animate-slideDown">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      Recurrence end date must be after the event start date
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ===== Section: Type ===== */}
            <SectionHeader icon={Tag} title="Type" />
            <div>
              <label className="block text-sm font-semibold text-amber-900 mb-2.5 flex items-center gap-2">
                <Tag className="w-4 h-4 text-amber-600 flex-shrink-0" />
                Event Type
              </label>
              <div className="flex flex-wrap gap-2">
                {EVENT_TYPES.map(type => {
                  const typeColor = eventTypeColors.find(etc => etc.event_type === type)?.color;
                  const isSelected = eventType === type;
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => handleEventTypeChange(type)}
                      className={`px-3.5 py-2 rounded-xl text-sm font-medium transition-all duration-200 transform active:scale-95 touch-manipulation border-2 ${
                        isSelected
                          ? 'bg-amber-400 text-white border-amber-400 shadow-md'
                          : 'bg-white/80 text-amber-800 border-amber-200 hover:border-amber-300 hover:bg-amber-50/60'
                      }`}
                    >
                      {typeColor && (
                        <span
                          className="inline-block w-2.5 h-2.5 rounded-full mr-2 align-middle"
                          style={{ backgroundColor: typeColor }}
                        />
                      )}
                      {type}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Submission blocked message */}
            {submissionBlocked && hasValidationErrors && (
              <div className="flex items-center gap-2 text-sm text-red-700 font-medium bg-red-100/80 border-2 border-red-300 rounded-xl px-4 py-3.5 animate-slideDown">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                Please fix the highlighted fields before saving
              </div>
            )}

            {/* Server error */}
            {error && (
              <div className="bg-red-100/80 border-2 border-red-300 text-red-800 px-4 py-3.5 sm:px-5 sm:py-4 rounded-xl text-sm font-medium">
                {error}
              </div>
            )}
          </div>

          {/* ===== Footer / Actions ===== */}
          <div className="flex flex-col sm:flex-row gap-3 p-6 sm:p-8 pt-4 sm:pt-6 border-t-2 border-amber-100 flex-shrink-0 bg-gradient-to-br from-amber-50/80 to-yellow-50/80">
            {selectedEvent && (
              confirmDelete ? (
                <div className="flex items-center gap-2 w-full sm:w-auto animate-slideDown">
                  <span className="text-sm font-medium text-red-700 hidden sm:inline">Delete this event?</span>
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={loading}
                    className="flex items-center justify-center gap-1.5 px-4 py-3 bg-red-600 active:bg-red-700 hover:bg-red-700 text-white font-semibold rounded-xl transition-all duration-200 disabled:opacity-50 shadow-md text-sm touch-manipulation"
                  >
                    <Trash2 className="w-4 h-4 flex-shrink-0" />
                    {loading ? 'Deleting...' : 'Yes, Delete'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    className="px-4 py-3 border-2 border-amber-300 hover:bg-amber-50 text-amber-900 font-semibold rounded-xl transition-all duration-200 text-sm touch-manipulation bg-white/50"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  disabled={loading}
                  className="flex items-center justify-center gap-2 px-6 py-3.5 bg-red-500 active:bg-red-600 sm:hover:bg-red-600 text-white font-semibold rounded-xl transition-all duration-200 disabled:opacity-50 shadow-md active:shadow-lg sm:hover:shadow-lg transform active:scale-95 sm:hover:-translate-y-0.5 w-full sm:w-auto touch-manipulation"
                >
                  <Trash2 className="w-5 h-5 flex-shrink-0" />
                  Delete
                </button>
              )
            )}
            <div className="hidden sm:block flex-1" />
            <div className="flex flex-col sm:flex-row gap-3 sm:items-center w-full sm:w-auto">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-3.5 border-2 border-amber-300 active:bg-amber-50 sm:hover:bg-amber-50 text-amber-900 font-semibold rounded-xl transition-all duration-200 w-full sm:w-auto touch-manipulation bg-white/50 order-3 sm:order-none"
              >
                Cancel
              </button>
              {canAddAnother && (
                <button
                  type="button"
                  onClick={handleSaveAndAddAnother}
                  disabled={loading}
                  className="flex items-center justify-center gap-2 px-6 py-3.5 bg-white/90 border-2 border-amber-400 active:bg-amber-50 sm:hover:bg-amber-50 text-amber-800 font-semibold rounded-xl transition-all duration-200 disabled:opacity-50 shadow-md active:shadow-lg sm:hover:shadow-lg transform active:scale-95 w-full sm:w-auto touch-manipulation order-2 sm:order-none"
                >
                  <Plus className="w-5 h-5 flex-shrink-0" />
                  {loading ? 'Saving...' : 'Save & Add Another'}
                </button>
              )}
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-3.5 bg-gradient-to-r from-amber-400 to-yellow-500 active:from-amber-500 active:to-yellow-600 sm:hover:from-amber-500 sm:hover:to-yellow-600 text-white font-semibold rounded-xl transition-all duration-200 disabled:opacity-50 shadow-lg active:shadow-xl sm:hover:shadow-xl transform active:scale-95 sm:hover:-translate-y-0.5 w-full sm:w-auto touch-manipulation order-1 sm:order-none"
              >
                {loading ? 'Saving...' : selectedEvent ? 'Update Event' : 'Create Event'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
