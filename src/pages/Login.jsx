import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, User, ArrowRight, ShieldCheck, AlertTriangle, MapPin } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in both fields.');
      return;
    }
    setLoading(true);
    setError(null);
    // Simulate auth; replace with Supabase signIn when backend is wired
    await new Promise((r) => setTimeout(r, 900));
    login(email);
    setLoading(false);
    navigate('/dashboard');
  };

  return (
    <div className="flex min-h-screen w-full bg-resq-deep">
      {/* Left: brand panel */}
      <div className="hidden md:flex md:w-1/2 flex-col justify-center items-center p-12 bg-gradient-to-b from-resq-deep via-resq-deep/95 to-black border-r border-slate-900/50">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-water/10 flex items-center justify-center text-water shadow-[0_0_20px_rgba(14,165,233,0.25)]">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">ResQ</h1>
            <p className="text-slate-400 text-sm">Galamsey &amp; Water Pollution Watch</p>
          </div>
        </div>

        <div className="w-full max-w-md text-slate-300 space-y-6">
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-white">Report. Respond. Restore.</h2>
            <p className="text-slate-400 leading-relaxed">
              Join the community watch to report illegal mining and water pollution in Ghana.
              Your report goes live on the satellite map instantly.
            </p>
          </div>

          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6">
            <div className="flex items-start gap-3 mb-4">
              <MapPin className="w-5 h-5 text-water mt-0.5" />
              <div>
                <p className="text-sm font-medium text-white">Coverage Area</p>
                <p className="text-xs text-slate-400">Pra • Ankobra • Birim basins</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-white">High Severity Alerts</p>
                <p className="text-xs text-slate-400">Real-time satellite verification</p>
              </div>
            </div>
          </div>
        </div>

        <p className="text-[11px] text-slate-500 mt-8 uppercase tracking-widest">
          ResQ &bull; Community Environmental Watch
        </p>
      </div>

      {/* Right: login card */}
      <div className="flex-1 flex items-center justify-center p-8 bg-resq-deep">
        <div className="w-full max-w-md">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-water/10 flex items-center justify-center text-water">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">Sign in to ResQ</h2>
          </div>
          <p className="text-slate-400 text-sm mb-8">Access your reporting dashboard</p>

          {error && (
            <div className="mb-6 p-3.5 rounded-lg bg-red-900/20 border border-red-500/30 text-red-300 text-sm flex items-start gap-3">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">
                Email address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="email"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 pl-10 text-sm text-white focus:outline-none focus:ring-2 focus:ring-water focus:border-transparent transition-all placeholder-slate-500"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">
                  Password
                </label>
                <a href="#" className="text-xs text-water hover:text-cyan-400 transition-colors">
                  Forgot password?
                </a>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="password"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 pl-10 text-sm text-white focus:outline-none focus:ring-2 focus:ring-water focus:border-transparent transition-all placeholder-slate-500"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-water hover:bg-cyan-400 text-white font-bold text-sm py-3.5 rounded-xl shadow-[0_0_25px_rgba(14,165,233,0.35)] disabled:opacity-60 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 uppercase tracking-wider"
            >
              {loading ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Signing in...
                </>
              ) : (
                <>
                  <ArrowRight className="w-4 h-4" />
                  Sign in
                </>
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-slate-500">
            Don't have an account?{' '}
            <button
              onClick={() => navigate('/register')}
              className="text-water font-medium hover:text-cyan-400 transition-colors underline decoration-water/30 decoration-underline"
            >
              Create an account
            </button>
          </p>
          <p className="text-center text-xs text-slate-500 mt-2">
            Reporting without an account?{' '}
            <button
              onClick={() => navigate('/dashboard')}
              className="text-emerald-400 font-medium hover:text-emerald-300 transition-colors underline decoration-emerald-400/30 decoration-underline"
            >
              Continue as guest
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}