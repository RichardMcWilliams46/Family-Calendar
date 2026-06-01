import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { X, MapPin, ExternalLink, Plus, RefreshCw, Music, Theater, Calendar, Star, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';

interface DiscoveredEvent {
  id: string;
  title: string;
  description: string;
  event_date: string;
  event_date_parsed: string | null;
  venue: string;
  category: string;
  source_url: string;
  source_title: string;
  discovered_at: string;
  added_to_calendar: boolean;
  dismissed: boolean;
}

interface Props {
  onClose: () => void;
  onAddToCalendar: (event: DiscoveredEvent) => void;
}

const CATEGORY_ICONS: Record<string, typeof Music> = {
  concert: Music,
  theatre: Theater,
  festival: Star,
  event: Calendar,
};

const CATEGORY_COLORS: Record<string, string> = {
  concert: 'bg-rose-100 text-rose-700 border-rose-200',
  theatre: 'bg-blue-100 text-blue-700 border-blue-200',
  festival: 'bg-amber-100 text-amber-700 border-amber-200',
  event: 'bg-green-100 text-green-700 border-green-200',
};

function formatEventDate(dateStr: string | null): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr + 'T12:00:00');
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

function timeAgo(isoStr: string): string {
  const diff = Date.now() - new Date(isoStr).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return 'just now';
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'yesterday';
  return `${days} days ago`;
}

export default function MaltaAssistant({ onClose, onAddToCalendar }: Props) {
  const [events, setEvents] = useState<DiscoveredEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newCount, setNewCount] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'concert' | 'theatre' | 'festival' | 'event'>('all');

  const fetchEvents = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/malta-events-search`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
            Apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
        }
      );

      const json = await res.json();

      if (json.error && json.error === 'TAVILY_API_KEY not configured') {
        setError('no_key');
      } else if (json.error) {
        setError(json.error);
      } else {
        setEvents(json.events ?? []);
        setNewCount(json.new_count ?? 0);
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents(false);
  }, [fetchEvents]);

  const dismissEvent = async (id: string) => {
    await supabase.from('discovered_events').update({ dismissed: true }).eq('id', id);
    setEvents(prev => prev.filter(e => e.id !== id));
  };

  const markAdded = async (id: string) => {
    await supabase.from('discovered_events').update({ added_to_calendar: true }).eq('id', id);
    setEvents(prev => prev.map(e => e.id === id ? { ...e, added_to_calendar: true } : e));
  };

  const filtered = filter === 'all' ? events : events.filter(e => e.category === filter);
  const categories = ['all', 'concert', 'theatre', 'festival', 'event'] as const;
  const categoryCounts = categories.reduce((acc, cat) => {
    acc[cat] = cat === 'all' ? events.length : events.filter(e => e.category === cat).length;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white w-full sm:max-w-lg sm:mx-4 sm:rounded-2xl rounded-t-2xl shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[85vh] overflow-hidden border border-amber-200/50">

        {/* Header */}
        <div className="bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 px-5 py-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
                <MapPin className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-white font-bold text-lg leading-tight">Malta Assistant</h2>
                <p className="text-amber-100 text-xs">Concerts, shows & events in Malta</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => fetchEvents(true)}
                disabled={refreshing || loading}
                className="p-2 hover:bg-white/20 rounded-xl transition-colors disabled:opacity-50"
                title="Refresh"
              >
                <RefreshCw className={`w-4 h-4 text-white ${refreshing ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/20 rounded-xl transition-colors"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>

          {newCount > 0 && (
            <div className="mt-3 bg-white/20 rounded-xl px-3 py-2 text-white text-xs font-medium">
              {newCount} new event{newCount !== 1 ? 's' : ''} found since your last visit
            </div>
          )}
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1 px-4 py-3 bg-amber-50/60 border-b border-amber-100 flex-shrink-0 overflow-x-auto">
          {categories.map(cat => {
            const count = categoryCounts[cat];
            if (count === 0 && cat !== 'all') return null;
            const Icon = cat === 'all' ? Star : CATEGORY_ICONS[cat];
            return (
              <button
                key={cat}
                onClick={() => setFilter(cat)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap flex-shrink-0 ${
                  filter === cat
                    ? 'bg-amber-400 text-white shadow-sm'
                    : 'bg-white text-amber-800 border border-amber-200 hover:bg-amber-50'
                }`}
              >
                <Icon className="w-3 h-3" />
                <span className="capitalize">{cat === 'all' ? 'All' : cat}</span>
                <span className={`text-xs rounded-full px-1.5 ${filter === cat ? 'bg-white/30 text-white' : 'bg-amber-100 text-amber-600'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          {loading && (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <div className="w-12 h-12 border-3 border-amber-200 border-t-amber-400 rounded-full animate-spin" style={{borderWidth: '3px'}} />
              <div className="text-center">
                <p className="text-amber-900 font-medium text-sm">Searching for Malta events...</p>
                <p className="text-amber-500 text-xs mt-1">Scanning concerts, theatre & more</p>
              </div>
            </div>
          )}

          {!loading && error === 'no_key' && (
            <div className="p-6 text-center">
              <div className="w-14 h-14 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-7 h-7 text-amber-500" />
              </div>
              <h3 className="font-semibold text-amber-900 mb-2">Search not configured</h3>
              <p className="text-sm text-amber-700 mb-4 leading-relaxed">
                A Tavily API key is needed to search for Malta events. Add <code className="bg-amber-100 px-1 rounded text-xs">TAVILY_API_KEY</code> to your Supabase edge function secrets to enable live event discovery.
              </p>
            </div>
          )}

          {!loading && error && error !== 'no_key' && (
            <div className="p-6 text-center">
              <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-3" />
              <p className="text-sm text-red-600">{error}</p>
              <button
                onClick={() => fetchEvents(true)}
                className="mt-3 text-xs text-amber-600 underline"
              >
                Try again
              </button>
            </div>
          )}

          {!loading && !error && filtered.length === 0 && (
            <div className="p-6 text-center">
              <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Calendar className="w-7 h-7 text-amber-300" />
              </div>
              <p className="text-amber-800 font-medium text-sm">No events found yet</p>
              <p className="text-amber-500 text-xs mt-1">Pull to refresh or check back later</p>
            </div>
          )}

          {!loading && !error && filtered.length > 0 && (
            <div className="p-4 space-y-3">
              {filtered.map(event => {
                const Icon = CATEGORY_ICONS[event.category] ?? Calendar;
                const colorClass = CATEGORY_COLORS[event.category] ?? CATEGORY_COLORS.event;
                const isExpanded = expandedId === event.id;

                return (
                  <div
                    key={event.id}
                    className={`bg-white rounded-xl border transition-all duration-200 ${
                      event.added_to_calendar
                        ? 'border-green-200 bg-green-50/30'
                        : 'border-amber-100 hover:border-amber-200 hover:shadow-sm'
                    }`}
                  >
                    <div className="p-4">
                      <div className="flex items-start gap-3">
                        <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center border ${colorClass}`}>
                          <Icon className="w-4 h-4" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className="font-semibold text-amber-900 text-sm leading-tight line-clamp-2">
                              {event.title}
                            </p>
                            <button
                              onClick={() => dismissEvent(event.id)}
                              className="flex-shrink-0 p-1 text-amber-300 hover:text-amber-500 transition-colors"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 mt-1.5">
                            {event.event_date_parsed && (
                              <span className="text-xs text-amber-600 font-medium">
                                {formatEventDate(event.event_date_parsed)}
                              </span>
                            )}
                            {event.venue && (
                              <span className="text-xs text-amber-500 flex items-center gap-0.5">
                                <MapPin className="w-3 h-3" />
                                {event.venue}
                              </span>
                            )}
                          </div>

                          {event.description && (
                            <button
                              onClick={() => setExpandedId(isExpanded ? null : event.id)}
                              className="flex items-center gap-1 text-xs text-amber-500 hover:text-amber-700 mt-1.5 transition-colors"
                            >
                              {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                              {isExpanded ? 'Less' : 'More details'}
                            </button>
                          )}

                          {isExpanded && event.description && (
                            <p className="text-xs text-amber-700 mt-2 leading-relaxed bg-amber-50/60 rounded-lg p-2">
                              {event.description}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-amber-50">
                        <div className="flex items-center gap-2">
                          {event.source_url && (
                            <a
                              href={event.source_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-xs text-amber-500 hover:text-amber-700 transition-colors"
                            >
                              <ExternalLink className="w-3 h-3" />
                              Source
                            </a>
                          )}
                          <span className="text-xs text-amber-300">{timeAgo(event.discovered_at)}</span>
                        </div>

                        {event.added_to_calendar ? (
                          <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                            <Plus className="w-3 h-3" /> Added
                          </span>
                        ) : (
                          <button
                            onClick={() => {
                              onAddToCalendar(event);
                              markAdded(event.id);
                            }}
                            className="flex items-center gap-1.5 bg-amber-400 hover:bg-amber-500 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
                          >
                            <Plus className="w-3 h-3" />
                            Add to Calendar
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        {!loading && !error && (
          <div className="px-5 py-3 border-t border-amber-100 bg-amber-50/40 flex-shrink-0">
            <p className="text-xs text-amber-400 text-center">
              Events sourced from the web — always verify details before attending
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
