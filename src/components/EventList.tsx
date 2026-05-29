import { CalendarEvent } from '../lib/supabase';
import { Calendar, Clock, Tag, ExternalLink } from 'lucide-react';

interface EventListProps {
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
  currentDate: Date;
  filterType: 'all' | 'events-holidays';
  onFilterChange: (filter: 'all' | 'events-holidays') => void;
}

const isHolidayOrEvent = (eventType: string) =>
  eventType === 'Holiday' || eventType === 'Event';

export default function EventList({ events, onEventClick, currentDate, filterType, onFilterChange }: EventListProps) {
  const formatDate = (dateStr: string, includeYear: boolean = true) => {
    const date = new Date(dateStr);
    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    if (includeYear) options.year = 'numeric';
    return date.toLocaleDateString('en-US', options);
  };

  const shouldShowYear = (startDate: string, endDate: string) => {
    return new Date(startDate).getFullYear() !== new Date(endDate).getFullYear();
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthEvents = events.filter(event => {
    const start = new Date(event.start_date);
    const end = new Date(event.end_date);
    // Include event if it overlaps with the current month at all
    const monthStart = new Date(year, month, 1);
    const monthEnd = new Date(year, month + 1, 0, 23, 59, 59);
    return start <= monthEnd && end >= monthStart;
  });

  const filteredEvents = filterType === 'events-holidays'
    ? monthEvents.filter(e => e.event_type === 'Event' || e.event_type === 'Holiday')
    : monthEvents;

  const filteredCount = filterType === 'events-holidays'
    ? monthEvents.filter(e => e.event_type === 'Event' || e.event_type === 'Holiday').length
    : monthEvents.length;

  return (
    <div className="p-6 bg-gradient-to-br from-amber-50/20 via-transparent to-yellow-50/20">
      <div className="mb-6 flex items-center justify-center gap-3">
        <div className="flex bg-amber-100/50 rounded-lg p-1">
          <button
            onClick={() => onFilterChange('all')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all relative ${
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
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all relative ${
              filterType === 'events-holidays' ? 'bg-white text-amber-900 shadow-sm' : 'text-amber-700 hover:text-amber-900'
            }`}
          >
            Holidays & Events
            {filterType === 'events-holidays' && (
              <span className="absolute -top-1 -right-1 bg-gradient-to-br from-amber-400 to-yellow-500 text-white text-xs font-semibold rounded-full w-5 h-5 flex items-center justify-center shadow-sm">
                {filteredCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {filteredEvents.length === 0 ? (
        <div className="text-center py-12">
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
        <div className="space-y-2">
          {filteredEvents.map(event => {
            const showYear = shouldShowYear(event.start_date, event.end_date);
            return (
              <div
                key={event.id}
                onClick={() => onEventClick(event)}
                className="bg-white/90 border border-amber-200/50 rounded-lg p-4 hover:border-amber-300 hover:shadow-md hover:bg-white transition-all cursor-pointer"
              >
                <div className="flex items-start gap-3">
                  <div
                    className="w-1 self-stretch rounded-full shadow-sm flex-shrink-0"
                    style={{ backgroundColor: event.color }}
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-amber-900 mb-1">{event.title}</h4>
                    {event.description && (
                      <p className="text-sm text-amber-800/80 mb-2">{event.description}</p>
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
                    <div className="flex flex-wrap gap-3 text-xs text-amber-700/80">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-amber-500" />
                        <span>
                          {formatDate(event.start_date, showYear)}
                          {event.start_date.split('T')[0] !== event.end_date.split('T')[0] &&
                            ` - ${formatDate(event.end_date, showYear)}`}
                        </span>
                      </div>
                      {!event.all_day && (
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-amber-500" />
                          <span>{formatTime(event.start_date)} - {formatTime(event.end_date)}</span>
                        </div>
                      )}
                      {!(filterType === 'events-holidays' && isHolidayOrEvent(event.event_type)) && (
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
