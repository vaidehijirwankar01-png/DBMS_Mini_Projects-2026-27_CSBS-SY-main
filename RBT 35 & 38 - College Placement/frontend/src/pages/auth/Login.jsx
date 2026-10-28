import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  LogIn, Key, Mail, AlertCircle, Eye, EyeOff, 
  GraduationCap, Building2, ShieldCheck, Sparkles, CheckCircle2, ArrowRight
} from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const user = await login(email, password);
      if (user.role === 'admin') navigate('/admin');
      else if (user.role === 'company') navigate('/company');
      else navigate('/student');
    } catch (err) {
      console.error('Login error:', err);
      setError(err.response?.data?.message || 'Invalid email or password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFill = (demoEmail, demoPassword) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setError('');
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 sm:p-6 lg:p-10 bg-transparent bg-grid-pattern relative overflow-hidden">
      
      {/* 3D Ambient Decorative Floating Orbs */}
      <div className="absolute top-10 left-10 w-72 h-72 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none animate-pulse-glow"></div>
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl pointer-events-none animate-pulse-glow" style={{ animationDelay: '2s' }}></div>
      <div className="absolute top-1/2 left-1/3 w-64 h-64 bg-blue-600/15 rounded-full blur-2xl pointer-events-none"></div>

      {/* Main Two-Column Card */}
      <div className="max-w-5xl w-full bg-slate-800/90 backdrop-blur-xl border border-slate-700/60 rounded-3xl shadow-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 relative z-10 card-3d">
        
        {/* Left Column: Premium Branding & Platform Features */}
        <div className="lg:col-span-5 bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-900 p-8 sm:p-10 text-white flex flex-col justify-between relative overflow-hidden border-b lg:border-b-0 lg:border-r border-indigo-800/40">
          
          {/* Subtle floating 3D geometric shape */}
          <div className="absolute -top-12 -right-12 w-40 h-40 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-2xl rotate-12 blur-sm animate-float-slow pointer-events-none"></div>
          <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-gradient-to-tr from-blue-500/20 to-cyan-500/20 rounded-full animate-float-reverse pointer-events-none"></div>

          <div>
            <div className="flex items-center space-x-3 mb-6">
              <div className="p-2.5 bg-gradient-to-tr from-indigo-600 to-violet-500 rounded-xl shadow-lg shadow-indigo-500/30 flex items-center justify-center">
                <GraduationCap className="h-6 w-6 text-white" />
              </div>
              <div>
                <span className="text-xl font-black tracking-wide bg-gradient-to-r from-white via-indigo-100 to-indigo-300 bg-clip-text text-transparent">
                  CampusPlacement
                </span>
                <span className="block text-[11px] text-indigo-300 font-semibold uppercase tracking-widest">
                  Training & Placement Cell
                </span>
              </div>
            </div>

            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-400/20 text-indigo-300 text-xs font-semibold mb-6">
              <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
              <span>Real-Time Relational DBMS</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold leading-snug mb-4 text-white">
              Launch your career with verified opportunities.
            </h1>
            <p className="text-indigo-200/80 text-sm leading-relaxed mb-8">
              A unified recruitment portal with automated eligibility matching, live applicant tracking, and institutional placement analytics.
            </p>

            {/* Platform Highlights */}
            <div className="space-y-3">
              <div className="flex items-center space-x-3 text-xs text-indigo-100/90 bg-indigo-950/50 p-2.5 rounded-lg border border-indigo-800/40">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                <span>Strict backend eligibility criteria verification</span>
              </div>
              <div className="flex items-center space-x-3 text-xs text-indigo-100/90 bg-indigo-950/50 p-2.5 rounded-lg border border-indigo-800/40">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                <span>Multi-role access: Students, Recruiters, and Admin</span>
              </div>
              <div className="flex items-center space-x-3 text-xs text-indigo-100/90 bg-indigo-950/50 p-2.5 rounded-lg border border-indigo-800/40">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                <span>Transactional security & parameterized SQL queries</span>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-indigo-800/50 flex justify-between items-center text-xs text-indigo-300">
            <span>Enterprise Grade</span>
            <span>MySQL 8.0 • JWT Secured</span>
          </div>
        </div>

        {/* Right Column: Modern Authentication Form */}
        <div className="lg:col-span-7 p-8 sm:p-10 lg:p-12 flex flex-col justify-center bg-slate-900/60">
          <div>
            <div className="mb-6">
              <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Sign In</h2>
              <p className="text-slate-400 text-sm mt-1">Access your account dashboard and ongoing recruitment processes</p>
            </div>

            {error && (
              <div className="mb-6 p-3.5 bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm rounded-xl flex items-center space-x-3 animate-slide-up">
                <AlertCircle className="h-5 w-5 text-rose-400 flex-shrink-0" />
                <span className="font-medium">{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="student@college.edu or hr@company.com"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Key className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-11 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-200 transition p-0.5"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold rounded-xl shadow-lg shadow-indigo-600/30 hover:shadow-indigo-600/50 active:scale-[0.99] transition disabled:opacity-50 flex items-center justify-center space-x-2 text-sm"
              >
                {loading ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Signing in...</span>
                  </div>
                ) : (
                  <>
                    <span>Sign In to Portal</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>

            {/* Quick Demo Logins Bar */}
            <div className="mt-8 pt-6 border-t border-slate-800">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">
                  Quick Demo Accounts
                </span>
                <span className="text-[11px] text-slate-500">Click to autofill (password: password)</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => handleQuickFill('alice@student.college.edu', 'password')}
                  className="px-2.5 py-2 bg-indigo-950/60 hover:bg-indigo-900 text-indigo-300 text-xs font-semibold rounded-lg border border-indigo-800/60 transition flex items-center justify-center space-x-1"
                >
                  <GraduationCap className="h-3.5 w-3.5" />
                  <span>Student</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickFill('hr@techcorp.com', 'password')}
                  className="px-2.5 py-2 bg-purple-950/60 hover:bg-purple-900 text-purple-300 text-xs font-semibold rounded-lg border border-purple-800/60 transition flex items-center justify-center space-x-1"
                >
                  <Building2 className="h-3.5 w-3.5" />
                  <span>Recruiter</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickFill('admin@college.edu', 'password')}
                  className="px-2.5 py-2 bg-rose-950/60 hover:bg-rose-900 text-rose-300 text-xs font-semibold rounded-lg border border-rose-800/60 transition flex items-center justify-center space-x-1"
                >
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span>Admin</span>
                </button>
              </div>
            </div>

            {/* Two Separate Registration Links As Required */}
            <div className="mt-8 pt-6 border-t border-slate-800 space-y-2 text-center text-xs">
              <div>
                <span className="text-slate-400">Don't have an account? </span>
                <Link
                  to="/register/student"
                  className="font-semibold text-indigo-400 hover:text-indigo-300 transition underline underline-offset-4"
                >
                  Register as a Student
                </Link>
              </div>
              <div>
                <span className="text-slate-400">Don't have a company account? </span>
                <Link
                  to="/register/company"
                  className="font-semibold text-purple-400 hover:text-purple-300 transition underline underline-offset-4"
                >
                  Register as a Company
                </Link>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};

export default Login;
