'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  // Sync any guest progress recorded before signing in
  useEffect(() => {
    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        try {
          const raw = window.localStorage.getItem('aniwatch:progress');
          if (raw) {
            const guestMap = JSON.parse(raw);
            await fetch('/api/progress/merge', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ guestMap }),
            });
            window.localStorage.removeItem('aniwatch:progress');
          }
        } catch {
          // Merge failure must not block sign-in.
        }
        router.push('/library');
        router.refresh();
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMessage('');

    const supabase = createClient();

    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
        });
        if (error) throw error;
        setMessage(
          'Check your email to confirm your account, then sign in.'
        );
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      }
    } catch (err: any) {
      setMessage(err.message || 'Authentication failed.');
    } finally {
      setBusy(false);
    }
  };

  const handleOAuth = async (provider: 'google' | 'github') => {
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) setMessage(error.message);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-paper">
      <div className="w-full max-w-md">
        {/* Masthead */}
        <div className="text-center mb-8">
          <span className="inline-block font-kanji font-black text-xs px-2 py-0.5 bg-vermilion text-white tracking-widest mb-3">
            会員ログイン
          </span>
          <h1 className="font-display font-black text-3xl tracking-masthead text-ink">
            ANI<span className="italic font-editorial text-vermilion">WATCH</span>
          </h1>
          <p className="font-meta text-xs text-muted mt-2">
            {mode === 'login'
              ? 'Sign in to sync your shelf and reading progress.'
              : 'Create a free account to sync your shelf and progress.'}
          </p>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="border border-hairline bg-zinc-950 p-5 space-y-4"
        >
          <div>
            <label className="font-meta text-[11px] uppercase tracking-wider text-muted block mb-1.5">
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-black border border-hairline px-3 py-2 font-meta text-sm text-ink placeholder-muted focus:outline-none focus:border-vermilion transition"
              placeholder="reader@example.com"
            />
          </div>

          <div>
            <label className="font-meta text-[11px] uppercase tracking-wider text-muted block mb-1.5">
              Password
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-black border border-hairline px-3 py-2 font-meta text-sm text-ink placeholder-muted focus:outline-none focus:border-vermilion transition"
              placeholder="••••••••"
            />
          </div>

          {message && (
            <p className="font-meta text-xs text-vermilion border-l-2 border-vermilion pl-2.5 py-1">
              {message}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full py-2.5 bg-vermilion hover:bg-vermilion-dark disabled:opacity-50 text-white font-meta font-bold text-sm uppercase tracking-wider transition"
          >
            {busy
              ? 'Working…'
              : mode === 'login'
                ? 'Sign In'
                : 'Create Account'}
          </button>

          {/* OAuth Divider */}
          <div className="flex items-center gap-3 py-1">
            <span className="flex-1 h-px bg-hairline"></span>
            <span className="font-meta text-[10px] uppercase tracking-widest text-muted">
              or
            </span>
            <span className="flex-1 h-px bg-hairline"></span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleOAuth('google')}
              className="py-2 border border-hairline hover:border-vermilion font-meta text-xs font-bold text-zinc-300 hover:text-ink transition"
            >
              Google
            </button>
            <button
              type="button"
              onClick={() => handleOAuth('github')}
              className="py-2 border border-hairline hover:border-vermilion font-meta text-xs font-bold text-zinc-300 hover:text-ink transition"
            >
              GitHub
            </button>
          </div>

          <button
            type="button"
            onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
            className="w-full text-center font-meta text-xs text-muted hover:text-vermilion transition pt-1"
          >
            {mode === 'login'
              ? 'Need an account? Register here'
              : 'Already registered? Sign in'}
          </button>
        </form>

        <p className="font-meta text-[10px] text-zinc-600 text-center mt-5 leading-relaxed">
          Accounts store only your shelf and reading positions. No personal
          data is collected or sold.
        </p>
      </div>
    </div>
  );
}
