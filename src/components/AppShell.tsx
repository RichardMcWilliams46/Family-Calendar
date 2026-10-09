import { ReactNode } from 'react';
import { CalendarDays, List, MapPin, Settings as SettingsIcon, Plus } from 'lucide-react';
import Sunflower from './Sunflower';

export type TabId = 'calendar' | 'list' | 'malta' | 'settings';

interface NavItem {
  id: TabId;
  label: string;
  icon: typeof CalendarDays;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'calendar', label: 'Calendar', icon: CalendarDays },
  { id: 'list', label: 'List', icon: List },
  { id: 'malta', label: 'Malta', icon: MapPin },
  { id: 'settings', label: 'Settings', icon: SettingsIcon },
];

interface AppShellProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  onAddEvent: () => void;
  monthLabel: string;
  showFAB: boolean;
  children: ReactNode;
}

export default function AppShell({
  activeTab,
  onTabChange,
  onAddEvent,
  monthLabel,
  showFAB,
  children,
}: AppShellProps) {
  const today = new Date();

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50/60 via-yellow-50/40 to-orange-50/30 flex flex-col">
      {/* ===== Top App Bar ===== */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-amber-200/50 safe-area-top">
        <div className="flex items-center justify-between px-4 sm:px-6 lg:px-8 h-14 sm:h-16">
          {/* Left: Logo + Title */}
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="flex-shrink-0">
              <Sunflower size={32} day={today.getDate()} />
            </div>
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-bold text-amber-900 leading-tight truncate">
                Our Calendar
              </h1>
              <p className="text-xs text-amber-600 leading-tight hidden sm:block">
                {today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </p>
            </div>
          </div>

          {/* Right: Month label */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="bg-amber-100/60 rounded-lg px-3 sm:px-4 py-1.5 sm:py-2">
              <span className="text-xs sm:text-sm font-semibold text-amber-800">
                {monthLabel}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* ===== Body: Sidebar + Content ===== */}
      <div className="flex flex-1 min-h-0">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:flex flex-col w-64 flex-shrink-0 border-r border-amber-200/50 bg-white/70 backdrop-blur-sm">
          <div className="p-5 border-b border-amber-100">
            <div className="flex items-center gap-2.5">
              <Sunflower size={36} />
              <div>
                <p className="text-sm font-bold text-amber-900">Sunflower</p>
                <p className="text-xs text-amber-500">Calendar</p>
              </div>
            </div>
          </div>

          <nav className="flex-1 p-3 space-y-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 relative ${
                    active
                      ? 'bg-gradient-to-r from-amber-100 to-yellow-100 text-amber-900'
                      : 'text-amber-700 hover:bg-amber-50/60'
                  }`}
                >
                  {active && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-7 bg-gradient-to-b from-amber-400 to-yellow-500 rounded-r-full" />
                  )}
                  <Icon
                    className={`w-5 h-5 flex-shrink-0 ${active ? 'text-amber-600' : 'text-amber-400'}`}
                    strokeWidth={active ? 2.4 : 2}
                  />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="p-4 border-t border-amber-100">
            <p className="text-xs text-amber-400 text-center">
              Keeping us organized, together
            </p>
          </div>
        </aside>

        {/* Content Area */}
        <main className="flex-1 min-w-0 min-h-0 overflow-y-auto scrollbar-thin pb-nav">
          <div className="max-w-5xl mx-auto p-4 sm:p-6 lg:p-8 animate-fadeIn" key={activeTab}>
            {children}
          </div>
        </main>
      </div>

      {/* ===== FAB ===== */}
      {showFAB && (
        <button
          onClick={onAddEvent}
          className="fixed bottom-20 right-5 z-40 lg:bottom-8 lg:right-8 w-14 h-14 rounded-full bg-gradient-to-br from-amber-400 to-yellow-500 text-white shadow-xl hover:shadow-2xl hover:from-amber-500 hover:to-yellow-600 transition-all duration-200 flex items-center justify-center transform hover:scale-105 active:scale-95"
          aria-label="Add Event"
        >
          <Plus className="w-6 h-6" strokeWidth={2.5} />
        </button>
      )}

      {/* ===== Mobile Bottom Navigation ===== */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-amber-200/50 safe-area-bottom">
        <div className="flex items-stretch justify-around h-16">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`flex-1 flex flex-col items-center justify-center gap-0.5 transition-all duration-200 relative ${
                  active ? 'text-amber-600' : 'text-amber-400'
                }`}
              >
                {active && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 w-10 h-0.5 bg-gradient-to-r from-amber-400 to-yellow-500 rounded-full" />
                )}
                <Icon
                  className="w-5 h-5"
                  strokeWidth={active ? 2.5 : 2}
                />
                <span className={`text-[10px] font-medium ${active ? 'text-amber-700' : 'text-amber-400'}`}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
