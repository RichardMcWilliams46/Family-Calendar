import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase, CalendarEvent, EventTypeColor } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import AppShell, { TabId } from './AppShell';
import EventModal from './EventModal';
import EventList from './EventList';
import MaltaAssistant from './MaltaAssistant';
import SettingsScreen from './SettingsScreen';
import { toCalendarDate, isDateInRange } from '../lib/date-utils';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

type RealtimePayload = {
  eventType: string;
  new: CalendarEvent;
  old: { id: string };
};

function MonthNav({
  label,
  onPrev,
  onNext,
}: {
  label: string;
  onPrev: () => void;
  onNext: () => void;
}) {
  return (
    <div className="flex items-center justify-between mb-4 sm:mb-5">
      <button
        onClick={onPrev}
        className="flex items-center gap-1 px-3 py-2.5 text-amber-700 hover:bg-amber-100/60 active:bg-amber-200/60 rounded-xl transition-colors text-sm font-medium touch-manipulation"
      >
        <ChevronLeft className="w-5 h-5" />
        <span className="hidden sm:inline">Previous</span>
      </button>
      <h2 className="text-base sm:text-xl font-bold text-amber-900">{label}</h2>
      <button
        onClick={onNext}
        className="flex items-center gap-1 px-3 py-2.5 text-amber-700 hover:bg-amber-100/60 active:bg-amber-200/60 rounded-xl transition-colors text-sm font-medium touch-manipulation"
      >
        <span className="hidden sm:inline">Next</span>
        <ChevronRight className="w-5 h-5" />
      </button>
    </div>
  );
}

export default function Calendar({ user }: { user: User }) {
  const [activeTab, setActiveTab] = useState<TabId>('list');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [eventTypeColors, setEventTypeColors] = useState<EventTypeColor[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'events-holidays'>('events-holidays');
  const [loadError, setLoadError] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  const loadEvents = useCallback(async (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const rangeStart = new Date(year, month - 1, 1).toISOString();
    const rangeEnd = new Date(year, month + 2, 0, 23, 59, 59).toISOString();

    const { data, error } = await supabase
      .from('calendar_events')
      .select('*')
      .gte('start_date', rangeStart)
      .lte('start_date', rangeEnd)
      .order('start_date', { ascending: true });

    if (error) {
      setLoadError(true);
      return;
    }

    setEvents(data ?? []);
    setLoadError(false);
    setInitialLoading(false);
  }, []);

  const loadEventTypeColors = useCallback(async () => {
    const { data, error } = await supabase
      .from('event_type_colors')
      .select('*')
      .order('event_type', { ascending: true });
    if (error) {
      setLoadError(true);
      return;
    }
    if (data) setEventTypeColors(data);
  }, []);

  // Load events whenever the visible month changes
  useEffect(() => {
    loadEvents(currentDate);
  }, [currentDate, loadEvents]);

  useEffect(() => {
    loadEventTypeColors();

    const eventsSubscription = supabase
      .channel('calendar_events_changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'calendar_events' },
        (payload) => {
          const p = payload as unknown as RealtimePayload;
          setEvents(prev => {
            if (p.eventType === 'DELETE') {
              return prev.filter(e => e.id !== p.old.id);
            }
            if (p.eventType === 'INSERT') {
              const exists = prev.some(e => e.id === p.new.id);
              if (exists) return prev;
              const merged = [...prev, p.new];
              merged.sort((a, b) => a.start_date.localeCompare(b.start_date));
              return merged;
            }
            if (p.eventType === 'UPDATE') {
              return prev.map(e => e.id === p.new.id ? p.new : e);
            }
            return prev;
          });
        }
      )
      .subscribe();

    const colorsSubscription = supabase
      .channel('event_type_colors_changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'event_type_colors' },
        () => { loadEventTypeColors(); }
      )
      .subscribe();

    return () => {
      eventsSubscription.unsubscribe();
      colorsSubscription.unsubscribe();
    };
  }, [loadEventTypeColors]);

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    const adjustedStartDay = startingDayOfWeek === 0 ? 6 : startingDayOfWeek - 1;

    const days: (Date | null)[] = [];
    for (let i = 0; i < adjustedStartDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(new Date(year, month, i));
    return days;
  };

  // Build a date-to-events lookup map once per render cycle
  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    const days = getDaysInMonth(currentDate);
    for (const day of days) {
      if (!day) continue;
      const dateKey = toCalendarDate(day);
      const dayEvents = events.filter(event =>
        isDateInRange(dateKey, event.start_date, event.end_date),
      );
      map.set(dateKey, dayEvents);
    }
    return map;
  }, [events, currentDate]);

  const getEventsForDate = (date: Date | null) => {
    if (!date) return [];
    return eventsByDate.get(toCalendarDate(date)) ?? [];
  };

  const handlePreviousMonth = () =>
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));

  const handleNextMonth = () =>
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));

  const handleDateClick = (date: Date | null) => {
    if (date) {
      setSelectedDate(date);
      setSelectedEvent(null);
      setIsModalOpen(true);
    }
  };

  const handleEventClick = (event: CalendarEvent, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedEvent(event);
    setSelectedDate(null);
    setIsModalOpen(true);
  };

  const handleAddEvent = () => {
    setSelectedDate(new Date());
    setSelectedEvent(null);
    setIsModalOpen(true);
  };

  const todayString = useMemo(() => new Date().toDateString(), []);

  const isToday = (date: Date | null) => {
    if (!date) return false;
    return date.toDateString() === todayString;
  };

  const days = getDaysInMonth(currentDate);
  const monthLabel = `${MONTHS[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
  const showFAB = activeTab !== 'malta';

  return (
    <AppShell
      activeTab={activeTab}
      onTabChange={setActiveTab}
      onAddEvent={handleAddEvent}
      monthLabel={monthLabel}
      showFAB={showFAB}
    >
      {loadError && (
        <div className="mb-5 flex items-center justify-between gap-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          <span>We could not load the latest calendar data.</span>
          <button
            type="button"
            onClick={() => {
              loadEvents(currentDate);
              loadEventTypeColors();
            }}
            className="font-semibold underline underline-offset-2"
          >
            Try again
          </button>
        </div>
      )}

      {/* ===== Calendar Grid Tab ===== */}
      {activeTab === 'calendar' && (
        <div>
          <MonthNav label={monthLabel} onPrev={handlePreviousMonth} onNext={handleNextMonth} />

          {initialLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-10 h-10 border-[3px] border-amber-200 border-t-amber-400 rounded-full animate-spin" />
            </div>
          ) : (
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-amber-200/50 shadow-sm overflow-hidden">
              <div className="grid grid-cols-7 gap-px bg-amber-200/40">
                {DAYS.map(day => (
                  <div key={day} className="bg-amber-50/80 text-center font-semibold text-amber-800 py-2.5 text-xs uppercase tracking-wider">
                    <span className="hidden sm:inline">{day}</span>
                    <span className="sm:hidden">{day.charAt(0)}</span>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-px bg-amber-200/40">
                {days.map((day, index) => {
                  const dayEvents = getEventsForDate(day);
                  const isWeekend = day && (day.getDay() === 0 || day.getDay() === 6);
                  return (
                    <div
                      key={index}
                      onClick={() => handleDateClick(day)}
                      className={`min-h-[68px] sm:min-h-[110px] lg:min-h-[120px] p-1 sm:p-2 transition-all ${
                        day
                          ? isToday(day)
                            ? 'bg-amber-100/60 cursor-pointer hover:bg-amber-100'
                            : isWeekend
                            ? 'bg-yellow-50/50 cursor-pointer hover:bg-yellow-100/60'
                            : 'bg-white/80 cursor-pointer hover:bg-amber-50/40'
                          : 'bg-amber-50/20 cursor-default'
                      }`}
                    >
                      {day && (
                        <>
                          <div className={`text-[11px] sm:text-sm font-medium mb-0.5 sm:mb-1 flex items-center justify-center w-6 h-6 rounded-full ${
                            isToday(day)
                              ? 'bg-gradient-to-br from-amber-400 to-yellow-500 text-white shadow-sm'
                              : 'text-amber-900'
                          }`}>
                            {day.getDate()}
                          </div>
                          <div className="space-y-0.5 sm:space-y-1">
                            {dayEvents.slice(0, 2).map(event => (
                              <div
                                key={event.id}
                                onClick={(e) => handleEventClick(event, e)}
                                className="text-[9px] sm:text-xs px-1 sm:px-2 py-0.5 rounded truncate hover:opacity-80 transition-opacity font-medium shadow-sm"
                                style={{ backgroundColor: event.color, color: 'white' }}
                              >
                                {event.title}
                              </div>
                            ))}
                            {dayEvents.length > 2 && (
                              <div className="text-[9px] sm:text-xs text-amber-600 px-1 sm:px-2 font-medium">
                                +{dayEvents.length - 2}
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===== List Tab ===== */}
      {activeTab === 'list' && (
        <div>
          <MonthNav label={monthLabel} onPrev={handlePreviousMonth} onNext={handleNextMonth} />
          <EventList
            events={events}
            currentDate={currentDate}
            filterType={filterType}
            onFilterChange={setFilterType}
            onEventClick={(event) => {
              setSelectedEvent(event);
              setSelectedDate(null);
              setIsModalOpen(true);
            }}
          />
        </div>
      )}

      {/* ===== Malta Tab ===== */}
      {activeTab === 'malta' && (
        <MaltaAssistant
          onAddToCalendar={(discoveredEvent) => {
            setSelectedDate(
              discoveredEvent.event_date_parsed
                ? new Date(discoveredEvent.event_date_parsed + 'T12:00:00')
                : new Date()
            );
            setSelectedEvent(null);
            setIsModalOpen(true);
          }}
        />
      )}

      {/* ===== Settings Tab ===== */}
      {activeTab === 'settings' && (
        <SettingsScreen
          eventTypeColors={eventTypeColors}
          user={user}
          onColorsSaved={() => {
            loadEventTypeColors();
            loadEvents(currentDate);
          }}
        />
      )}

      {/* ===== Event Modal (overlay) ===== */}
      {isModalOpen && (
        <EventModal
          selectedDate={selectedDate}
          selectedEvent={selectedEvent}
          eventTypeColors={eventTypeColors}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedDate(null);
            setSelectedEvent(null);
          }}
          onSave={() => loadEvents(currentDate)}
          onSaveAndAddAnother={() => loadEvents(currentDate)}
        />
      )}
    </AppShell>
  );
}
