import { useMemo } from 'react';
import { CalendarEvent } from '../lib/supabase';
import { Calendar, Clock, Tag, ExternalLink } from 'lucide-react';
import { formatHumanDate, formatHumanTime, isMultiDay } from '../lib/date-utils';

interface EventListProps {
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
  currentDate: Date;
  filterType: 'all' | 'events-holidays';
  onFilterChange: (filter: 'all' | 'events-holidays') => void;
}

export default function EventList({ events, onEventClick, currentDate, filterType, onFilterChange }: EventListProps) {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const { filteredEvents, filteredCount } = useMemo(() => {
    const monthStart = new Date(year, month, 1);
    const monthEnd = new Date(year, month + 1, 0, 23, 59, 59);

    const monthEvents = events.filter(event => {
      const start = new Date(event.start_date);
      const end = new Date(event.end_date);
      return start <= monthEnd && end >= monthStart;
    });

    const isHolidayOrEvent = (eventType: string) =>
      eventType === 'Holiday' || eventType === 'Event';

    if (filterType === 'events-holidays') {
      const filtered = monthEvents.filter(e => isHolidayOrEvent(e.event_type));
      return { filteredEvents: filtered, filteredCount: filtered.length };
    }
    return { filteredEvents: monthEvents, filteredCount: monthEvents.length };
  }, [events, year, month, filterType]);

  return (
    <div>
      {/* Filter toggle */}
      <div className="mb-5 flex items-center justify-center">
        <div className="flex bg-amber-100/50 rounded-xl p-1">
          <button
            onClick={() => onFilterChange('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all relative ${
              filterType === 'all' ? 'bg-white text-amber-900 shadow-sm' : 'text-amber-700 hover:text-amber-900'
            }`}
          >
            All Events
            {filterType === 'all' && (
              <span className="absolute -top-1 -right-1 bg-gradient-to-br from-amber-400 to-yellow-500 text-white text-xs font-semibold rounded-full w-5 h-5 flex items-center justify-center shadow-sm">
                {filteredCount}
              </span>
            )}
          </button>
          <button
            onClick={() => onFilterChange('events-holidays')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all relative ${
              filterType === 'events-holidays' ? 'bg-white text-amber-900 shadow-sm' : 'text-amber-700 hover:text-amber-900'
            }`}
          >
            Holidays &amp; Events
            {filterType === 'events-holidays' && (
              <span className="absolute -top-1 -right-1 bg-gradient-to-br from-amber-400 to-yellow-500 text-white text-xs font-semibold rounded-full w-5 h-5 flex items-center justify-center shadow-sm">
                {filteredCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {filteredEvents.length === 0 ? (
        <div className="text-center py-12 sm:py-16">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-amber-100/50 rounded-2xl mb-4 border border-amber-200/50">
            <Calendar className="w-8 h-8 text-amber-500" />
          </div>
          <h3 className="text-lg font-semibold text-amber-900 mb-2">No Events To Display</h3>
          <p className="text-amber-600 text-sm">
            {filterType === 'events-holidays'
              ? 'No holidays or events in this month'
              : 'No events scheduled for this month'}
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredEvents.map(event => {
            const showYear = new Date(event.start_date).getFullYear() !== new Date(event.end_date).getFullYear();
            return (
              <div
                key={event.id}
                onClick={() => onEventClick(event)}
                className="bg-white/90 border border-amber-200/50 rounded-xl p-4 hover:border-amber-300 hover:shadow-md hover:bg-white transition-all cursor-pointer active:scale-[0.99]"
              >
                <div className="flex items-start gap-3">
                  <div
                    className="w-1 self-stretch rounded-full shadow-sm flex-shrink-0"
                    style={{ backgroundColor: event.color }}
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-amber-900 mb-1">{event.title}</h4>
                    {event.description && (
                      <p className="text-sm text-amber-800/80 mb-2 line-clamp-2">{event.description}</p>
                    )}
                    {event.hyperlink && (
                      <a
                        href={event.hyperlink}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-600 hover:text-amber-700 mb-2"
                      >
                        <ExternalLink className="w-3 h-3" />
                        View Location
                      </a>
                    )}
                    <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-amber-700/80">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-amber-500" />
                        <span>
                          {formatHumanDate(event.start_date, showYear)}
                          {isMultiDay(event.start_date, event.end_date) &&
                            ` - ${formatHumanDate(event.end_date, showYear)}`}
                        </span>
                      </div>
                      {!event.all_day && (
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-amber-500" />
                          <span>{formatHumanTime(event.start_date)} - {formatHumanTime(event.end_date)}</span>
                        </div>
                      )}
                      {!(filterType === 'events-holidays' && (event.event_type === 'Holiday' || event.event_type === 'Event')) && (
                        <div className="flex items-center gap-1.5">
                          <Tag className="w-3.5 h-3.5 text-amber-500" />
                          <span>{event.event_type}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
