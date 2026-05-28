import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Calendar, Heart } from 'lucide-react';
import Sunflower from './Sunflower';

export default function Auth() {
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      }
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50/80 via-yellow-50/60 to-orange-50/40 flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAiIGhlaWdodD0iODAiIHZpZXdCb3g9IjAgMCA4MCA4MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxjaXJjbGUgY3g9IjQwIiBjeT0iNDAiIHI9IjgiIHN0cm9rZT0iI0ZCQ0Y0QSIgc3Ryb2tlLXdpZHRoPSIxIiBvcGFjaXR5PSIwLjMiLz48L2c+PC9zdmc+')] opacity-40"></div>

      <Sunflower className="absolute top-10 left-10 opacity-20 rotate-12 hidden lg:block" size={100} />
      <Sunflower className="absolute bottom-20 right-16 opacity-20 -rotate-12 hidden lg:block" size={120} />
      <Sunflower className="absolute top-1/3 right-1/4 opacity-10 rotate-45 hidden xl:block" size={80} />
      <Sunflower className="absolute bottom-1/4 left-1/4 opacity-10 -rotate-45 hidden xl:block" size={90} />

      <div className="relative bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl p-10 w-full max-w-md border-2 border-amber-200/50">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-amber-400 to-yellow-500 rounded-2xl mb-6 shadow-lg transform hover:scale-105 transition-transform duration-300 relative">
            <div className="absolute -top-1 -right-1 text-2xl">🌻</div>
            <Calendar className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-amber-600 to-yellow-600 bg-clip-text text-transparent mb-3">
            Our Calendar
          </h1>
          <div className="flex items-center justify-center gap-2 text-amber-800 mb-2">
            <span>Keeping us organized</span>
            <Heart className="w-4 h-4 fill-amber-500 text-amber-500" />
            <span>together</span>
          </div>
          <p className="text-sm text-amber-600">
            {isSignUp ? 'Create your account to get started' : 'Welcome back! Sign in to continue'}
          </p>
        </div>

        <form onSubmit={handleAuth} className="space-y-5">
          <div>
            <label htmlFor="email" className="block text-sm font-semibold text-amber-900 mb-2">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3.5 bg-amber-50/50 border-2 border-amber-200 rounded-xl focus:ring-2 focus:ring-amber-400 focus:border-amber-400 focus:bg-white outline-none transition-all duration-200 placeholder:text-amber-300"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-semibold text-amber-900 mb-2">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full px-4 py-3.5 bg-amber-50/50 border-2 border-amber-200 rounded-xl focus:ring-2 focus:ring-amber-400 focus:border-amber-400 focus:bg-white outline-none transition-all duration-200 placeholder:text-amber-300"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="bg-red-100/80 border-2 border-red-300 text-red-800 px-4 py-3.5 rounded-xl text-sm font-medium">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-500 hover:to-yellow-600 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                <span>Loading...</span>
              </>
            ) : (
              <span>{isSignUp ? 'Create Account' : 'Sign In'}</span>
            )}
          </button>
        </form>

        <div className="mt-8 text-center">
          <button
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError('');
            }}
            className="text-amber-600 hover:text-amber-700 font-semibold text-sm transition-colors duration-200"
          >
            {isSignUp
              ? 'Already have an account? Sign in'
              : "Don't have an account? Sign up"}
          </button>
        </div>
      </div>
    </div>
  );
}
