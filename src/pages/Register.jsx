import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, User, Phone, ArrowLeft, ShieldCheck } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function Register() {
  const [form, setForm] = useState({ fullName: '', email: '', phone: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const { register } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.fullName || !form.email || !form.password) {
      setError('Please fill in all required fields.');
      return;
    }
    setLoading(true);
    setError(null);
    await new Promise((r) => setTimeout(r, 900));
    register(form.email, form.fullName, form.phone);
    setLoading(false);
    navigate('/dashboard');
  };

  return (
    <div className="flex min-h-screen w-full bg-resq-deep">
      <div className="hidden md:flex md:w-1/2 flex-col justify-center items-center p-12 bg-gradient-to-b from-resq-deep via-resq-deep/95 to-black border-r border-slate-900/50">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-water/10 flex items-center justify-center text-water shadow-[0_0_20px_rgba(14,165,233,0.25)]">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">ResQ</h1>
            <p className="text-slate-400 text-sm">Join the community watch</p>
          </div>
        </div>

        <div className="w-full max-w-md text-slate-300 space-y-6">
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-white">Create your ResQ account</h2>
            <p className="text-slate-400 leading-relaxed">
              Sign up to submit reports, track satellite verification, and receive live alerts about
              illegal mining near you.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {[['Name', 'user'], ['Phone', 'phone']].map(([label, icon]) => (
              <div key={label} className="space-y-2">
                <label className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">{label}</label>
                <div className="relative">
                  {icon === 'user' ? (
                    <User className="absolute left-3 top-2 w-4 h-4 text-slate-500" />
                  ) : (
                    <Phone className="absolute left-3 top-2 w-4 h-4 text-slate-500" />
                  )}
                  <input
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 pl-10 text-sm text-white focus:outline-none focus:ring-1 focus:ring-water transition-all"
                    placeholder={label.toLowerCase()}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-8 bg-resq-deep">
        <div className="w-full max-w-md">
          <button onClick={() => navigate('/')} className="inline-flex items-center gap-2 text-xs text-slate-400 hover:text-white mb-6 transition-colors">
            <ArrowLeft className="w-3 h-3" /> Back to sign in
          </button>

          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-water/10 flex items-center justify-center text-water">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">Create account</h2>
          </div>
          <p className="text-slate-400 text-sm mb-8">Join the environmental watch network</p>

          {error && (
            <div className="mb-6 p-3.5 rounded-lg bg-red-900/20 border border-red-500/30 text-red-300 text-sm flex items-start gap-3">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">
                Full name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 pl-10 text-sm text-white focus:outline-none focus:ring-2 focus:ring-water focus:border-transparent transition-all placeholder-slate-500"
                  placeholder="Kwame Asare"
                  value={form.fullName}
                  onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                />
              </div>
            </div>

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
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="password"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 pl-10 text-sm text-white focus:outline-none focus:ring-2 focus:ring-water focus:border-transparent transition-all placeholder-slate-500"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-water hover:bg-cyan-400 text-white font-bold text-sm py-3.5 rounded-xl shadow-[0_0_25px_rgba(14,165,233,0.35)] disabled:opacity-60 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 uppercase tracking-wider"
            >
              {loading ? 'Creating account...' : 'Create account'}
            </button>
          </form>

          <p className="mt-8 text-center text-xs text-slate-500">
            By signing up you agree to our{' '}
            <a href="#" className="text-water hover:text-cyan-400 transition-colors underline">
              Terms of Service
            </a>
            {'&'}
            <a href="#" className="text-water hover:text-cyan-400 transition-colors underline">
              Privacy Policy
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}