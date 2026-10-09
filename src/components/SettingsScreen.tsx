import { useState } from 'react';
import { supabase, EventTypeColor } from '../lib/supabase';
import { LogOut, User as UserIcon, Info } from 'lucide-react';
import ColorSettings from './ColorSettings';
import type { User } from '@supabase/supabase-js';

interface SettingsScreenProps {
  eventTypeColors: EventTypeColor[];
  user: User;
  onColorsSaved: () => void;
}

export default function SettingsScreen({ eventTypeColors, user, onColorsSaved }: SettingsScreenProps) {
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = async () => {
    setSigningOut(true);
    await supabase.auth.signOut();
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-amber-900">Settings</h2>
        <p className="text-sm text-amber-600 mt-1">Manage your calendar preferences and account</p>
      </div>

      {/* Account section */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-amber-200/50 shadow-sm overflow-hidden">
        <div className="px-5 sm:px-6 py-4 border-b border-amber-100 flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <UserIcon className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-amber-900">Account</h3>
            <p className="text-xs text-amber-600">Your login and session</p>
          </div>
        </div>

        <div className="p-5 sm:p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
              {user.email?.charAt(0).toUpperCase() ?? '?'}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-amber-900 truncate">{user.email}</p>
              <p className="text-xs text-amber-500">Signed in</p>
            </div>
          </div>

          <button
            onClick={handleSignOut}
            disabled={signingOut}
            className="flex items-center gap-2 px-5 py-3 bg-red-50/80 border border-red-200 text-red-600 hover:bg-red-100 font-semibold rounded-xl transition-all duration-200 disabled:opacity-50 transform active:scale-95"
          >
            <LogOut className="w-5 h-5" />
            {signingOut ? 'Signing out...' : 'Log Out'}
          </button>
        </div>
      </div>

      {/* Color settings section */}
      <ColorSettings eventTypeColors={eventTypeColors} onSave={onColorsSaved} />

      {/* About section */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-amber-200/50 shadow-sm p-5 sm:p-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <Info className="w-5 h-5 text-amber-600" />
          </div>
          <h3 className="text-sm font-bold text-amber-900">About</h3>
        </div>
        <p className="text-sm text-amber-600">
          Sunflower Calendar - a beautiful shared calendar for keeping you organized, together.
        </p>
      </div>
    </div>
  );
}
