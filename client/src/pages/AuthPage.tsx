import { useState } from 'react';
import { Navigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../lib/auth';

interface Props { mode: 'login' | 'register' }

export default function AuthPage({ mode }: Props) {
  const { user, login, register } = useAuth();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={location.state?.from || '/'} replace />;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === 'login') await login(email, password);
      else await register(email, name, password);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-full flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="font-mono text-[10px] tracking-[0.18em] uppercase text-amber-gold mb-2">
            meeting tracker
          </div>
          <h1 className="font-serif text-4xl">
            <span className="italic text-amber-gold">{mode === 'login' ? 'Welcome' : 'Get'}</span>{' '}
            {mode === 'login' ? 'back' : 'started'}
          </h1>
        </div>

        <form onSubmit={submit} className="card p-6 space-y-4">
          <div>
            <label className="label">Email</label>
            <input
              className="input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>
          {mode === 'register' && (
            <div>
              <label className="label">Name</label>
              <input
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
          )}
          <div>
            <label className="label">Password</label>
            <input
              className="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            />
            {mode === 'register' && (
              <p className="text-[11px] text-cream-100/40 mt-1">At least 6 characters</p>
            )}
          </div>

          {error && (
            <div className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded p-2">
              {error}
            </div>
          )}

          <button type="submit" disabled={busy} className="btn-primary w-full justify-center py-2.5">
            {busy ? '...' : mode === 'login' ? 'Sign in' : 'Create account'}
          </button>

          <p className="text-center text-xs text-cream-100/50 pt-2">
            {mode === 'login' ? (
              <>No account? <Link to="/register" className="text-amber-gold underline">Register</Link></>
            ) : (
              <>Have an account? <Link to="/login" className="text-amber-gold underline">Sign in</Link></>
            )}
          </p>
          {mode === 'register' && (
            <p className="text-center text-[10px] text-cream-100/30">
              First account becomes admin automatically.
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
