import { useState, useEffect, useRef } from 'react';
import { supabase, CalendarEvent, EventTypeColor } from '../lib/supabase';
import { ChevronLeft, ChevronRight, Plus, LogOut, Settings, Menu, X } from 'lucide-react';
import EventModal from './EventModal';
import EventList from './EventList';
import ColorSettings from './ColorSettings';
import Sunflower from './Sunflower';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function Calendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [eventTypeColors, setEventTypeColors] = useState<EventTypeColor[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isBurgerOpen, setIsBurgerOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('list');
  const [filterType, setFilterType] = useState<'all' | 'events-holidays'>('events-holidays');
  const burgerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadEvents();
    loadEventTypeColors();

    const eventsSubscription = supabase
      .channel('calendar_events_changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'calendar_events' },
        () => { loadEvents(); }
      )
      .subscribe();

    const colorsSubscription = supabase
      .channel('event_type_colors_changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'event_type_colors' },
        () => {
          loadEventTypeColors();
          loadEvents();
        }
      )
      .subscribe();

    return () => {
      eventsSubscription.unsubscribe();
      colorsSubscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (burgerRef.current && !burgerRef.current.contains(e.target as Node)) {
        setIsBurgerOpen(false);
      }
    };
    if (isBurgerOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isBurgerOpen]);

  const loadEvents = async () => {
    const { data, error } = await supabase
      .from('calendar_events')
      .select('*')
      .order('start_date', { ascending: true });
    if (!error && data) setEvents(data);
  };

  const loadEventTypeColors = async () => {
    const { data, error } = await supabase
      .from('event_type_colors')
      .select('*')
      .order('event_type', { ascending: true });
    if (!error && data) setEventTypeColors(data);
  };

  const handleSignOut = async () => {
    setIsBurgerOpen(false);
    await supabase.auth.signOut();
  };

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

  const getEventsForDate = (date: Date | null) => {
    if (!date) return [];
    const year = date.getFullYear();
    const month = date.getMonth();
    const day = date.getDate();
    const localDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    return events.filter(event => {
      const s = new Date(event.start_date);
      const e = new Date(event.end_date);
      const startStr = `${s.getFullYear()}-${String(s.getMonth() + 1).padStart(2, '0')}-${String(s.getDate()).padStart(2, '0')}`;
      const endStr = `${e.getFullYear()}-${String(e.getMonth() + 1).padStart(2, '0')}-${String(e.getDate()).padStart(2, '0')}`;
      return localDateStr >= startStr && localDateStr <= endStr;
    });
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

  const isToday = (date: Date | null) => {
    if (!date) return false;
    return date.toDateString() === new Date().toDateString();
  };

  const days = getDaysInMonth(currentDate);

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50/60 via-yellow-50/40 to-orange-50/30 relative overflow-hidden">
      <div className="absolute top-10 left-10 opacity-10 pointer-events-none">
        <Sunflower size={180} />
      </div>
      <div className="absolute bottom-20 right-20 opacity-10 pointer-events-none">
        <Sunflower size={220} />
      </div>
      <div className="absolute top-1/2 right-10 opacity-5 pointer-events-none">
        <Sunflower size={150} />
      </div>

      <div className="max-w-7xl mx-auto p-4 sm:p-6 relative z-10">
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-amber-200/50 overflow-hidden">
          <div className="px-6 py-6 border-b border-amber-200/50 bg-gradient-to-r from-amber-100/40 via-yellow-100/30 to-amber-100/40">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Sunflower size={40} day={new Date().getDate()} />
                <h1 className="text-2xl font-semibold text-amber-900">Our Calendar</h1>
              </div>

              {/* Burger menu */}
              <div className="relative" ref={burgerRef}>
                <button
                  onClick={() => setIsBurgerOpen(prev => !prev)}
                  className="p-2 text-amber-800 hover:bg-amber-100/60 rounded-lg transition-colors"
                  aria-label="Menu"
                >
                  {isBurgerOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </button>

                {isBurgerOpen && (
                  <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-xl border border-amber-200/60 overflow-hidden z-50">
                    <button
                      onClick={() => { setIsSettingsOpen(true); setIsBurgerOpen(false); }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-amber-900 hover:bg-amber-50 transition-colors"
                    >
                      <Settings className="w-4 h-4 text-amber-600" />
                      Settings
                    </button>
                    <div className="border-t border-amber-100" />
                    <button
                      onClick={handleSignOut}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-amber-900 hover:bg-amber-50 transition-colors"
                    >
                      <LogOut className="w-4 h-4 text-amber-600" />
                      Log Out
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-center gap-2">
                <button
                  onClick={handlePreviousMonth}
                  className="p-2 hover:bg-amber-100/50 rounded-lg transition-colors"
                >
                  <ChevronLeft className="w-5 h-5 text-amber-700" />
                </button>
                <h2 className="text-xl font-semibold text-amber-900 min-w-[200px] text-center">
                  {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
                </h2>
                <button
                  onClick={handleNextMonth}
                  className="p-2 hover:bg-amber-100/50 rounded-lg transition-colors"
                >
                  <ChevronRight className="w-5 h-5 text-amber-700" />
                </button>
              </div>

              <div className="flex items-center justify-center gap-2 flex-wrap">
                <div className="flex bg-amber-100/50 rounded-lg p-1">
                  <button
                    onClick={() => setViewMode('list')}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                      viewMode === 'list' ? 'bg-white text-amber-900 shadow-sm' : 'text-amber-700 hover:text-amber-900'
                    }`}
                  >
                    List
                  </button>
                  <button
                    onClick={() => setViewMode('calendar')}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                      viewMode === 'calendar' ? 'bg-white text-amber-900 shadow-sm' : 'text-amber-700 hover:text-amber-900'
                    }`}
                  >
                    Calendar
                  </button>
                </div>
                <button
                  onClick={() => {
                    setSelectedDate(new Date());
                    setSelectedEvent(null);
                    setIsModalOpen(true);
                  }}
                  className="flex items-center gap-2 bg-gradient-to-r from-amber-400 to-yellow-500 text-white hover:from-amber-500 hover:to-yellow-600 px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-md hover:shadow-lg"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Event</span>
                </button>
              </div>
            </div>
          </div>

          {viewMode === 'calendar' ? (
            <div className="p-6 bg-gradient-to-br from-amber-50/20 via-transparent to-yellow-50/20">
              <div className="grid grid-cols-7 gap-px bg-amber-200/50 rounded-lg overflow-hidden mb-px">
                {DAYS.map(day => (
                  <div key={day} className="bg-amber-50/80 text-center font-semibold text-amber-800 py-3 text-xs uppercase tracking-wider">
                    <span className="hidden sm:inline">{day}</span>
                    <span className="sm:hidden">{day.charAt(0)}</span>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-px bg-amber-200/50 rounded-lg overflow-hidden">
                {days.map((day, index) => {
                  const dayEvents = getEventsForDate(day);
                  const isWeekend = day && (day.getDay() === 0 || day.getDay() === 6);
                  return (
                    <div
                      key={index}
                      onClick={() => handleDateClick(day)}
                      className={`min-h-[100px] sm:min-h-[120px] p-2 transition-all ${
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
                          <div className={`text-sm font-medium mb-2 flex items-center justify-center w-6 h-6 rounded-full ${
                            isToday(day)
                              ? 'bg-gradient-to-br from-amber-400 to-yellow-500 text-white shadow-sm'
                              : 'text-amber-900'
                          }`}>
                            {day.getDate()}
                          </div>
                          <div className="space-y-1">
                            {dayEvents.slice(0, 2).map(event => (
                              <div
                                key={event.id}
                                onClick={(e) => handleEventClick(event, e)}
                                className="text-xs px-2 py-1 rounded truncate hover:opacity-80 transition-opacity font-medium shadow-sm"
                                style={{ backgroundColor: event.color, color: 'white' }}
                              >
                                {event.title}
                              </div>
                            ))}
                            {dayEvents.length > 2 && (
                              <div className="text-xs text-amber-600 px-2 font-medium">
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
          ) : (
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
          )}
        </div>
      </div>

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
          onSave={loadEvents}
        />
      )}

      {isSettingsOpen && (
        <ColorSettings
          eventTypeColors={eventTypeColors}
          onClose={() => setIsSettingsOpen(false)}
          onSave={() => {
            loadEventTypeColors();
            loadEvents();
          }}
        />
      )}
    </div>
  );
}
