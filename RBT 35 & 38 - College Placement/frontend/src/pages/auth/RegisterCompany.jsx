import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api';
import { 
  Building2, Mail, Key, User, Phone, Globe, MapPin, 
  Briefcase, AlertCircle, Eye, EyeOff, ArrowRight, CheckCircle2, GraduationCap
} from 'lucide-react';

const RegisterCompany = () => {
  const [formData, setFormData] = useState({
    company_name: '',
    name: '', // Recruiter/Contact person name
    email: '',
    password: '',
    confirm_password: '',
    phone: '',
    website: '',
    industry: 'Information Technology',
    location: '',
    description: ''
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Frontend validations
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (formData.password !== formData.confirm_password) {
      setError('Passwords do not match. Please verify your confirm password field.');
      return;
    }

    setLoading(true);

    try {
      // Register using dedicated company endpoint
      const res = await api.post('/auth/register/company', formData);
      const { token, user } = res.data;
      localStorage.setItem('token', token);
      localStorage.setItem('role', user.role);

      // Redirect directly to Company Dashboard
      navigate('/company');
    } catch (err) {
      console.error('Company registration error:', err);
      setError(err.response?.data?.message || 'Company registration failed. Please check your information.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 sm:p-6 lg:p-10 bg-transparent bg-grid-pattern relative overflow-hidden">
      
      {/* 3D Ambient Decorative Floating Orbs */}
      <div className="absolute top-10 right-10 w-80 h-80 bg-purple-600/20 rounded-full blur-3xl pointer-events-none animate-pulse-glow"></div>
      <div className="absolute bottom-10 left-10 w-80 h-80 bg-violet-600/20 rounded-full blur-3xl pointer-events-none animate-pulse-glow"></div>

      <div className="max-w-5xl w-full bg-slate-800/90 backdrop-blur-xl border border-slate-700/60 rounded-3xl shadow-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 relative z-10 card-3d">
        
        {/* Left Column: Company/Recruiter Pitch */}
        <div className="lg:col-span-5 bg-gradient-to-br from-purple-950 via-slate-900 to-indigo-950 p-8 sm:p-10 text-white flex flex-col justify-between relative overflow-hidden border-b lg:border-b-0 lg:border-r border-purple-800/40">
          <div>
            <div className="flex items-center space-x-3 mb-6">
              <div className="p-2.5 bg-gradient-to-tr from-purple-600 to-indigo-500 rounded-xl shadow-lg flex items-center justify-center">
                <Building2 className="h-6 w-6 text-white" />
              </div>
              <div>
                <span className="text-xl font-black tracking-wide text-white">Recruiter Portal</span>
                <span className="block text-[11px] text-purple-300 font-semibold uppercase tracking-widest">
                  Corporate Campus Hiring Partner
                </span>
              </div>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold leading-snug mb-4 text-white">
              Connect with top campus talent.
            </h1>
            <p className="text-purple-200/80 text-sm leading-relaxed mb-6">
              Publish placement drives, customize branch & CGPA filters, review verified candidate resumes, and schedule interviews effortlessly.
            </p>

            <div className="space-y-3">
              <div className="flex items-center space-x-3 text-xs text-purple-100 bg-purple-950/60 p-3 rounded-xl border border-purple-800/40">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                <span>Post placement drives with tailored criteria</span>
              </div>
              <div className="flex items-center space-x-3 text-xs text-purple-100 bg-purple-950/60 p-3 rounded-xl border border-purple-800/40">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                <span>Filter applicants by CGPA, branch, and backlogs</span>
              </div>
              <div className="flex items-center space-x-3 text-xs text-purple-100 bg-purple-950/60 p-3 rounded-xl border border-purple-800/40">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                <span>Manage shortlists, interviews, and official offers</span>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-purple-800/50">
            <span className="text-xs text-purple-300 block mb-2">Are you a graduating student?</span>
            <Link
              to="/register/student"
              className="inline-flex items-center space-x-1.5 text-xs font-semibold text-indigo-300 hover:text-indigo-200 transition"
            >
              <GraduationCap className="h-3.5 w-3.5" />
              <span>Switch to Student Sign Up &rarr;</span>
            </Link>
          </div>
        </div>

        {/* Right Column: Company Registration Form */}
        <div className="lg:col-span-7 p-8 sm:p-10 lg:p-12 bg-slate-900/60">
          <div>
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Company Sign Up</h2>
                <p className="text-slate-400 text-xs sm:text-sm mt-1">Register your organization for campus recruitment</p>
              </div>
              <span className="px-2.5 py-1 bg-purple-500/10 border border-purple-400/20 text-purple-300 rounded-full text-xs font-bold">
                Role: Recruiter
              </span>
            </div>

            {error && (
              <div className="mb-6 p-3.5 bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm rounded-xl flex items-center space-x-3 animate-slide-up">
                <AlertCircle className="h-5 w-5 text-rose-400 flex-shrink-0" />
                <span className="font-medium">{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* Company Name & Recruiter Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                    Company Name *
                  </label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      name="company_name"
                      required
                      value={formData.company_name}
                      onChange={handleChange}
                      placeholder="e.g. Acme Technologies"
                      className="w-full pl-9 pr-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                    Contact Person / HR Lead *
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      name="name"
                      required
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="e.g. Sarah Jenkins"
                      className="w-full pl-9 pr-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
                    />
                  </div>
                </div>
              </div>

              {/* Email & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                    Official Corporate Email *
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <input
                      type="email"
                      name="email"
                      required
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="careers@company.com"
                      className="w-full pl-9 pr-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                    Official Phone Number
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="9876543210"
                      className="w-full pl-9 pr-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
                    />
                  </div>
                </div>
              </div>

              {/* Password & Confirm Password */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                    Password (min 6 chars) *
                  </label>
                  <div className="relative">
                    <Key className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      required
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="••••••••"
                      className="w-full pl-9 pr-10 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-200 transition"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                    Confirm Password *
                  </label>
                  <div className="relative">
                    <Key className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      name="confirm_password"
                      required
                      value={formData.confirm_password}
                      onChange={handleChange}
                      placeholder="••••••••"
                      className="w-full pl-9 pr-10 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-200 transition"
                      tabIndex={-1}
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Website & Industry */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                    Corporate Website
                  </label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      name="website"
                      value={formData.website}
                      onChange={handleChange}
                      placeholder="https://company.com"
                      className="w-full pl-9 pr-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                    Industry Sector
                  </label>
                  <input
                    type="text"
                    name="industry"
                    value={formData.industry}
                    onChange={handleChange}
                    placeholder="Software, Finance, AI, Automotive"
                    className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
                  />
                </div>
              </div>

              {/* Location */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                  Headquarters / Office Location
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    name="location"
                    value={formData.location}
                    onChange={handleChange}
                    placeholder="Bangalore, Hyderabad, Pune, Mumbai, Remote"
                    className="w-full pl-9 pr-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
                  />
                </div>
              </div>

              {/* Company Description */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                  Company Overview & Culture
                </label>
                <textarea
                  rows="3"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Tell students about your company products, mission, and work environment..."
                  className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
                ></textarea>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 px-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold rounded-xl shadow-lg shadow-purple-600/30 hover:shadow-purple-600/50 active:scale-[0.99] transition disabled:opacity-50 flex items-center justify-center space-x-2 text-sm"
                >
                  {loading ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>Creating Company Profile...</span>
                    </div>
                  ) : (
                    <>
                      <span>Complete Company Sign Up</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </div>
            </form>

            <div className="mt-6 pt-6 border-t border-slate-800 text-center text-xs text-slate-400">
              Already have a recruiter account?{' '}
              <Link to="/login" className="font-semibold text-purple-400 hover:text-purple-300 transition underline underline-offset-4">
                Sign In here
              </Link>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default RegisterCompany;
