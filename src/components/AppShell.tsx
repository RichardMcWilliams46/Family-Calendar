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
    <div
      className="min-h-screen w-full flex flex-col bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50"
      style={{ height: '100dvh' }}
    >
      {/* ===== Top App Bar ===== */}
      <header className="flex-shrink-0 z-40 bg-white/90 backdrop-blur-md border-b border-amber-200/50 safe-area-top">
        <div className="flex items-center justify-between px-4 sm:px-6 h-14 sm:h-16 max-w-5xl mx-auto w-full">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex-shrink-0">
              <Sunflower size={32} day={today.getDate()} />
            </div>
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-bold text-amber-900 leading-tight truncate">
                Our Calendar
              </h1>
              <p className="text-[11px] text-amber-600 leading-tight hidden sm:block">
                {today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="bg-amber-100/60 rounded-lg px-3 sm:px-4 py-1.5">
              <span className="text-xs sm:text-sm font-semibold text-amber-800">
                {monthLabel}
              </span>
            </div>
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex items-stretch border-t border-amber-100/50 bg-white/60 backdrop-blur-sm">
          <div className="flex items-stretch max-w-5xl mx-auto w-full">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2 transition-all duration-200 relative ${
                    active ? 'text-amber-600' : 'text-amber-400'
                  }`}
                >
                  {active && (
                    <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-0.5 bg-gradient-to-r from-amber-400 to-yellow-500 rounded-full" />
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
        </div>
      </header>

      {/* ===== Content Area ===== */}
      <main className="flex-1 min-h-0 overflow-y-auto scrollbar-thin bg-amber-50/40">
        <div className="max-w-5xl mx-auto p-4 sm:p-6 lg:p-8 animate-fadeIn pb-24" key={activeTab}>
          {children}
        </div>
      </main>

      {/* ===== FAB ===== */}
      {showFAB && (
        <button
          onClick={onAddEvent}
          className="fixed bottom-6 right-5 z-40 w-14 h-14 rounded-full bg-gradient-to-br from-amber-400 to-yellow-500 text-white shadow-xl hover:shadow-2xl hover:from-amber-500 hover:to-yellow-600 transition-all duration-200 flex items-center justify-center transform hover:scale-105 active:scale-95"
          aria-label="Add Event"
        >
          <Plus className="w-6 h-6" strokeWidth={2.5} />
        </button>
      )}
    </div>
  );
}
