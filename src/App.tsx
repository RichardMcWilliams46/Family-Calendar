import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';
import Auth from './components/Auth';
import Calendar from './components/Calendar';
import Sunflower from './components/Sunflower';
import type { User } from '@supabase/supabase-js';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      (async () => {
        setUser(session?.user ?? null);
      })();
    });

    return () => subscription.unsubscribe();
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

  return user ? <Calendar user={user} /> : <Auth />;
}

export default App;
