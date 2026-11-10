import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';
import Auth from './components/Auth';
import Calendar from './components/Calendar';
import Sunflower from './components/Sunflower';
import type { User } from '@supabase/supabase-js';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(false);

  useEffect(() => {
    const timeoutId = setTimeout(() => setLoading(false), 5000);

    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        clearTimeout(timeoutId);
        setUser(session?.user ?? null);
        setLoading(false);
      })
      .catch(() => {
        clearTimeout(timeoutId);
        setAuthError(true);
        setLoading(false);
      });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50/80 via-yellow-50/60 to-orange-50/40 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-pulse">
            <Sunflower size={72} day={new Date().getDate()} />
          </div>
          <p className="mt-6 text-amber-800 font-semibold text-lg">Loading...</p>
        </div>
      </div>
    );
  }

  if (authError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 to-orange-50 p-6">
        <div className="text-center max-w-sm">
          <div className="text-5xl mb-4">🌻</div>
          <h1 className="text-xl font-bold text-amber-900 mb-2">Connection problem</h1>
          <p className="text-sm text-amber-700 mb-6">
            We couldn't connect to the calendar service. Check your internet connection and try again.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-gradient-to-r from-amber-400 to-yellow-500 text-white font-semibold rounded-xl shadow-lg active:scale-95 transition-transform"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return user ? <Calendar user={user} /> : <Auth />;
}

export default App;
