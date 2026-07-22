import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signup } from '../api';

function SignupPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    try {
      await signup({ name: form.name, email: form.email, password: form.password });
      navigate('/login?registered=true');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen font-display">
      {/* Left Panel */}
      <div className="w-[44%] min-w-[340px] bg-gradient-to-br from-[#0F7B5A] via-primary to-[#0B8A62] p-10 flex flex-col relative overflow-hidden max-md:w-full max-md:min-w-0 max-md:p-7">
        <Link to="/" className="flex items-center gap-2.5 z-10 no-underline">
          <div className="w-9 h-9 bg-white/20 rounded-[10px] flex items-center justify-center shrink-0">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 12l2 2 4-4" /><path d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z" />
            </svg>
          </div>
          <span className="text-[1.05rem] font-bold text-white tracking-tight">ComplianceIQ</span>
        </Link>
        <div className="flex-1 flex flex-col justify-center py-8 z-10 max-md:py-6">
          <h1 className="text-[2rem] font-extrabold text-white leading-[1.2] tracking-tight mb-3.5 max-md:text-2xl">Start testing compliance<br />in minutes</h1>
          <p className="text-white/80 text-[0.97rem] leading-relaxed mb-7">Create your account and run your first compliance evaluation immediately.</p>
          <ul className="flex flex-col gap-2.5 list-none max-md:hidden">
            {['Instant ingredient alias resolution', 'Ingredient interaction detection', 'Full evaluation history & audit trail', 'Downloadable PDF compliance reports'].map((text) => (
              <li key={text} className="flex items-center gap-2 text-white/90 text-sm font-medium">
                <svg className="w-4 h-4 stroke-white/80 shrink-0" viewBox="0 0 24 24" fill="none" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                {text}
              </li>
            ))}
          </ul>
        </div>
        {/* Decorative circles */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute w-[300px] h-[300px] rounded-full bg-white/[0.06] -right-20 -top-20" />
          <div className="absolute w-[200px] h-[200px] rounded-full bg-white/[0.06] -left-[60px] -bottom-10" />
        </div>
      </div>

      {/* Right Panel */}
      <div className="flex-1 flex items-center justify-center bg-white p-8 max-md:p-5">
        <div className="w-full max-w-[420px]">
          <div className="mb-7">
            <h2 className="text-[1.6rem] font-extrabold text-slate-900 tracking-tight">Create your account</h2>
            <p className="text-slate-500 mt-1 text-[0.95rem]">Start your compliance journey today</p>
          </div>

          {error && (
            <div className="flex items-center gap-2 bg-red-100 border border-red-300 text-red-700 rounded-lg px-3.5 py-2.5 text-sm font-medium mb-5">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="name" className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Full Name</label>
              <input id="name" name="name" type="text" placeholder="Dr. Jane Smith" value={form.name} onChange={handleChange} required autoComplete="name"
                className="px-3.5 py-2.5 border-[1.5px] border-slate-200 rounded-lg text-[0.95rem] text-slate-900 bg-white transition-all outline-none focus:border-primary focus:ring-[3px] focus:ring-primary/10 placeholder:text-slate-400" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="email" className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Email Address</label>
              <input id="email" name="email" type="email" placeholder="you@company.com" value={form.email} onChange={handleChange} required autoComplete="email"
                className="px-3.5 py-2.5 border-[1.5px] border-slate-200 rounded-lg text-[0.95rem] text-slate-900 bg-white transition-all outline-none focus:border-primary focus:ring-[3px] focus:ring-primary/10 placeholder:text-slate-400" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="password" className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Password</label>
              <input id="password" name="password" type="password" placeholder="Min. 6 characters" value={form.password} onChange={handleChange} required autoComplete="new-password"
                className="px-3.5 py-2.5 border-[1.5px] border-slate-200 rounded-lg text-[0.95rem] text-slate-900 bg-white transition-all outline-none focus:border-primary focus:ring-[3px] focus:ring-primary/10 placeholder:text-slate-400" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="confirmPassword" className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Confirm Password</label>
              <input id="confirmPassword" name="confirmPassword" type="password" placeholder="••••••••" value={form.confirmPassword} onChange={handleChange} required autoComplete="new-password"
                className="px-3.5 py-2.5 border-[1.5px] border-slate-200 rounded-lg text-[0.95rem] text-slate-900 bg-white transition-all outline-none focus:border-primary focus:ring-[3px] focus:ring-primary/10 placeholder:text-slate-400" />
            </div>
            <button type="submit" className="mt-1.5 w-full py-3 text-[0.97rem] font-bold text-white bg-gradient-to-r from-primary to-[#0B8A62] border-none rounded-lg cursor-pointer flex items-center justify-center gap-2 transition-all shadow-lg shadow-primary/30 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary/40 disabled:opacity-65 disabled:cursor-not-allowed disabled:translate-y-0" disabled={loading}>
              {loading ? <><span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Creating Account...</> : 'Create Account'}
            </button>
          </form>

          <p className="text-center mt-5 text-sm text-slate-500">
            Already have an account? <Link to="/login" className="text-primary font-semibold no-underline hover:underline">Sign In →</Link>
          </p>
          <p className="text-center mt-2 text-[0.85rem]"><Link to="/" className="text-slate-400 no-underline hover:text-slate-600">← Back to Home</Link></p>
        </div>
      </div>
    </div>
  );
}

export default SignupPage;
