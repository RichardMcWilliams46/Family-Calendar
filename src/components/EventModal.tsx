import { useState, useEffect, useMemo } from 'react';
import { supabase, CalendarEvent, EventTypeColor } from '../lib/supabase';
import { X, Calendar, Clock, Tag, Palette, Trash2, Repeat, Link, FileText, CalendarClock, AlertCircle } from 'lucide-react';

const EVENT_TYPES = [
  'Event',
  'Holiday',
  'Maltese Bank Holiday',
  'Birthday',
  'Anniversary',
  'Appointment',
  'Meeting',
  'Reminder',
  'Travel',
  'Other'
];

const COLORS = [
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
];

interface EventModalProps {
  selectedDate: Date | null;
  selectedEvent: CalendarEvent | null;
  eventTypeColors: EventTypeColor[];
  onClose: () => void;
  onSave: () => void;
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

export default function EventModal({ selectedDate, selectedEvent, eventTypeColors, onClose, onSave }: EventModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [hyperlink, setHyperlink] = useState('');
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('10:00');
  const [allDay, setAllDay] = useState(false);
  const [eventType, setEventType] = useState('Event');
  const [color, setColor] = useState('#F59E0B');
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceRule, setRecurrenceRule] = useState('daily');
  const [recurrenceEndDate, setRecurrenceEndDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [submissionBlocked, setSubmissionBlocked] = useState(false);

  useEffect(() => {
    if (selectedEvent) {
      setTitle(selectedEvent.title);
      setDescription(selectedEvent.description);
      setHyperlink(selectedEvent.hyperlink || '');
      const start = new Date(selectedEvent.start_date);
      const end = new Date(selectedEvent.end_date);

      const startYear = start.getFullYear();
      const startMonth = String(start.getMonth() + 1).padStart(2, '0');
      const startDay = String(start.getDate()).padStart(2, '0');
      setStartDate(`${startYear}-${startMonth}-${startDay}`);
      setStartTime(start.toTimeString().slice(0, 5));

      const endYear = end.getFullYear();
      const endMonth = String(end.getMonth() + 1).padStart(2, '0');
      const endDay = String(end.getDate()).padStart(2, '0');
      setEndDate(`${endYear}-${endMonth}-${endDay}`);
      setEndTime(end.toTimeString().slice(0, 5));

      setAllDay(selectedEvent.all_day);
      setEventType(selectedEvent.event_type);
      setColor(selectedEvent.color);
      setIsRecurring(selectedEvent.is_recurring);
      setRecurrenceRule(selectedEvent.recurrence_rule || 'daily');
      if (selectedEvent.recurrence_end_date) {
        const recEnd = new Date(selectedEvent.recurrence_end_date);
        const recEndYear = recEnd.getFullYear();
        const recEndMonth = String(recEnd.getMonth() + 1).padStart(2, '0');
        const recEndDay = String(recEnd.getDate()).padStart(2, '0');
        setRecurrenceEndDate(`${recEndYear}-${recEndMonth}-${recEndDay}`);
      }
    } else if (selectedDate) {
      const year = selectedDate.getFullYear();
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const day = String(selectedDate.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      setStartDate(dateStr);
      setEndDate(dateStr);

      const defaultColor = eventTypeColors.find(etc => etc.event_type === 'Event')?.color || '#F59E0B';
      setColor(defaultColor);
    }
  }, [selectedEvent, selectedDate, eventTypeColors]);

  useEffect(() => {
    const typeColor = eventTypeColors.find(etc => etc.event_type === eventType);
    if (typeColor && !selectedEvent) {
      setColor(typeColor.color);
    }
  }, [eventType, eventTypeColors]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (hasValidationErrors) {
      setSubmissionBlocked(true);
      return;
    }

    setLoading(true);
    setError('');
    setSubmissionBlocked(false);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const startDateTime = allDay
        ? new Date(startDate + 'T00:00:00').toISOString()
        : new Date(startDate + 'T' + startTime).toISOString();

      const endDateTime = allDay
        ? new Date(endDate + 'T23:59:59').toISOString()
        : new Date(endDate + 'T' + endTime).toISOString();

      const eventData = {
        title,
        description,
        hyperlink: hyperlink || null,
        start_date: startDateTime,
        end_date: endDateTime,
        all_day: allDay,
        event_type: eventType,
        color,
        created_by: user.id,
        is_recurring: isRecurring,
        recurrence_rule: isRecurring ? recurrenceRule : null,
        recurrence_end_date: isRecurring && recurrenceEndDate ? new Date(recurrenceEndDate + 'T23:59:59').toISOString() : null,
      };

      if (selectedEvent) {
        const { error } = await supabase
          .from('calendar_events')
          .update(eventData)
          .eq('id', selectedEvent.id);

        if (error) throw error;
      } else {
        const { data: newEvent, error: insertError } = await supabase
          .from('calendar_events')
          .insert([eventData])
          .select()
          .single();

        if (insertError) throw insertError;

        if (isRecurring && newEvent) {
          await generateRecurringEvents(newEvent);
        }
      }

      onSave();
      onClose();
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const generateRecurringEvents = async (parentEvent: CalendarEvent) => {
    const recurrences: any[] = [];
    const startDate = new Date(parentEvent.start_date);
    const endDate = new Date(parentEvent.end_date);
    const recEndDate = parentEvent.recurrence_end_date ? new Date(parentEvent.recurrence_end_date) : new Date(startDate.getTime() + 365 * 24 * 60 * 60 * 1000);

    const duration = endDate.getTime() - startDate.getTime();

    let currentDate = new Date(startDate);

    while (currentDate <= recEndDate) {
      switch (parentEvent.recurrence_rule) {
        case 'daily':
          currentDate = new Date(currentDate.getTime() + 24 * 60 * 60 * 1000);
          break;
        case 'weekly':
          currentDate = new Date(currentDate.getTime() + 7 * 24 * 60 * 60 * 1000);
          break;
        case 'monthly':
          currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, currentDate.getDate());
          break;
        case 'yearly':
          currentDate = new Date(currentDate.getFullYear() + 1, currentDate.getMonth(), currentDate.getDate());
          break;
      }

      if (currentDate <= recEndDate) {
        const recEndDateTime = new Date(currentDate.getTime() + duration);
        recurrences.push({
          title: parentEvent.title,
          description: parentEvent.description,
          hyperlink: parentEvent.hyperlink,
          start_date: currentDate.toISOString(),
          end_date: recEndDateTime.toISOString(),
          all_day: parentEvent.all_day,
          event_type: parentEvent.event_type,
          color: parentEvent.color,
          created_by: parentEvent.created_by,
          is_recurring: false,
          parent_event_id: parentEvent.id,
        });
      }
    }

    if (recurrences.length > 0) {
      await supabase.from('calendar_events').insert(recurrences);
    }
  };

  const handleDelete = async () => {
    if (!selectedEvent) return;

    setLoading(true);
    setConfirmDelete(false);
    try {
      const { error } = await supabase
        .from('calendar_events')
        .delete()
        .eq('id', selectedEvent.id);

      if (error) throw error;

      onSave();
      onClose();
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };


  const selectedColorName = COLORS.find(c => c.value === color)?.name ?? '';


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
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      if (endDate && e.target.value > endDate) {
                        setEndDate(e.target.value);
                      }
                    }}
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
                      onChange={(e) => setStartTime(e.target.value)}
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
            {!selectedEvent && (
              <>
                <SectionHeader icon={Repeat} title="Repeats" />
                <div className="space-y-4">
                  <div className="flex items-center gap-3 bg-gradient-to-r from-yellow-100/50 to-amber-100/50 p-3.5 sm:p-4 rounded-xl border border-amber-200/50">
                    <input
                      id="isRecurring"
                      type="checkbox"
                      checked={isRecurring}
                      onChange={(e) => setIsRecurring(e.target.checked)}
                      className="w-5 h-5 text-amber-600 border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 flex-shrink-0"
                    />
                    <label htmlFor="isRecurring" className="text-sm font-semibold text-amber-900 flex items-center gap-2 cursor-pointer select-none">
                      <Repeat className="w-4 h-4 flex-shrink-0" />
                      Recurring event
                    </label>
                  </div>

                  {isRecurring && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 bg-gradient-to-r from-yellow-100/50 to-amber-100/50 p-4 sm:p-5 rounded-xl border border-amber-200/50">
                        <div>
                          <label htmlFor="recurrenceRule" className="block text-sm font-semibold text-amber-900 mb-2 flex items-center gap-2">
                            <Repeat className="w-4 h-4 text-amber-600 flex-shrink-0" />
                            Repeat
                          </label>
                          <select
                            id="recurrenceRule"
                            value={recurrenceRule}
                            onChange={(e) => setRecurrenceRule(e.target.value)}
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
                            onChange={(e) => setRecurrenceEndDate(e.target.value)}
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
              </>
            )}

            {/* ===== Section: Appearance ===== */}
            <SectionHeader icon={Palette} title="Appearance" />
            <div className="space-y-5">
              <div>
                <label htmlFor="eventType" className="block text-sm font-semibold text-amber-900 mb-2 flex items-center gap-2">
                  <Tag className="w-4 h-4 text-amber-600 flex-shrink-0" />
                  Event Type
                </label>
                <select
                  id="eventType"
                  value={eventType}
                  onChange={(e) => setEventType(e.target.value)}
                  className="w-full px-4 py-3 sm:px-5 sm:py-3.5 bg-white/80 border-2 border-amber-200 rounded-xl focus:ring-2 focus:ring-amber-400 focus:border-amber-400 focus:bg-white outline-none transition-all duration-200 font-medium text-base"
                >
                  {EVENT_TYPES.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-amber-900 mb-2.5 sm:mb-3 flex items-center gap-2">
                  <Palette className="w-4 h-4 text-amber-600 flex-shrink-0" />
                  Color {selectedColorName && <span className="text-amber-400 font-normal">-- {selectedColorName}</span>}
                </label>
                <div className="flex flex-wrap gap-2 sm:gap-3">
                  {COLORS.map(c => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setColor(c.value)}
                      className={`w-11 h-11 sm:w-12 sm:h-12 rounded-xl transition-all duration-200 transform active:scale-95 sm:hover:scale-110 shadow-md active:shadow-lg sm:hover:shadow-lg flex-shrink-0 ${
                        color === c.value ? 'ring-4 ring-amber-400 ring-offset-2' : 'sm:hover:ring-2 sm:hover:ring-amber-300 sm:hover:ring-offset-1'
                      }`}
                      style={{ backgroundColor: c.value }}
                      title={c.name}
                      aria-label={c.name}
                    />
                  ))}
                </div>
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
            <div className="flex-1" />
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3.5 border-2 border-amber-300 active:bg-amber-50 sm:hover:bg-amber-50 text-amber-900 font-semibold rounded-xl transition-all duration-200 w-full sm:w-auto order-2 sm:order-none touch-manipulation bg-white/50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3.5 bg-gradient-to-r from-amber-400 to-yellow-500 active:from-amber-500 active:to-yellow-600 sm:hover:from-amber-500 sm:hover:to-yellow-600 text-white font-semibold rounded-xl transition-all duration-200 disabled:opacity-50 shadow-lg active:shadow-xl sm:hover:shadow-xl transform active:scale-95 sm:hover:-translate-y-0.5 w-full sm:w-auto order-1 sm:order-none touch-manipulation"
            >
              {loading ? 'Saving...' : selectedEvent ? 'Update Event' : 'Create Event'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
