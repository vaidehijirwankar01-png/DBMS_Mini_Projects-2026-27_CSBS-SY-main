import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api';
import { 
  GraduationCap, Mail, Key, User, Phone, BookOpen, Calendar, 
  Award, AlertTriangle, AlertCircle, Eye, EyeOff, ArrowRight, CheckCircle2, Building2
} from 'lucide-react';

const RegisterStudent = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirm_password: '',
    enrollment_number: '',
    phone: '',
    department_id: '',
    graduation_year: '2025',
    cgpa: '8.00',
    backlogs: '0',
    resume_url: ''
  });

  const [departments, setDepartments] = useState([]);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const res = await api.get('/departments');
        setDepartments(res.data);
        if (res.data.length > 0) {
          setFormData((prev) => ({ ...prev, department_id: res.data[0].id }));
        }
      } catch (err) {
        console.error('Failed to load departments:', err);
      }
    };
    fetchDepartments();
  }, []);

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

    const cgpaVal = parseFloat(formData.cgpa);
    if (isNaN(cgpaVal) || cgpaVal < 0 || cgpaVal > 10) {
      setError('CGPA must be a valid number between 0.00 and 10.00.');
      return;
    }

    setLoading(true);

    try {
      // Register using dedicated endpoint
      const res = await api.post('/auth/register/student', formData);
      const { token, user } = res.data;
      localStorage.setItem('token', token);
      localStorage.setItem('role', user.role);

      // Redirect directly to Student Dashboard
      navigate('/student');
    } catch (err) {
      console.error('Student registration error:', err);
      setError(err.response?.data?.message || 'Registration failed. Please check your information.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 sm:p-6 lg:p-10 bg-transparent bg-grid-pattern relative overflow-hidden">
      
      {/* 3D Ambient Decorative Floating Orbs */}
      <div className="absolute top-10 left-10 w-80 h-80 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none animate-pulse-glow"></div>
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-blue-600/20 rounded-full blur-3xl pointer-events-none animate-pulse-glow"></div>

      <div className="max-w-5xl w-full bg-slate-800/90 backdrop-blur-xl border border-slate-700/60 rounded-3xl shadow-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 relative z-10 card-3d">
        
        {/* Left Column: Student Specific Pitch */}
        <div className="lg:col-span-5 bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-900 p-8 sm:p-10 text-white flex flex-col justify-between relative overflow-hidden border-b lg:border-b-0 lg:border-r border-indigo-800/40">
          <div>
            <div className="flex items-center space-x-3 mb-6">
              <div className="p-2.5 bg-gradient-to-tr from-indigo-600 to-blue-500 rounded-xl shadow-lg flex items-center justify-center">
                <GraduationCap className="h-6 w-6 text-white" />
              </div>
              <div>
                <span className="text-xl font-black tracking-wide text-white">Student Portal</span>
                <span className="block text-[11px] text-indigo-300 font-semibold uppercase tracking-widest">
                  Campus Placement Drive Registration
                </span>
              </div>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold leading-snug mb-4 text-white">
              Create your verified student profile.
            </h1>
            <p className="text-indigo-200/80 text-sm leading-relaxed mb-6">
              Register your academic credentials to unlock automated placement eligibility matching across all participating corporate recruiters.
            </p>

            <div className="space-y-3">
              <div className="flex items-center space-x-3 text-xs text-indigo-100 bg-indigo-950/60 p-3 rounded-xl border border-indigo-800/40">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                <span>Instant eligibility calculation against company criteria</span>
              </div>
              <div className="flex items-center space-x-3 text-xs text-indigo-100 bg-indigo-950/60 p-3 rounded-xl border border-indigo-800/40">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                <span>Direct one-click applications to active placement drives</span>
              </div>
              <div className="flex items-center space-x-3 text-xs text-indigo-100 bg-indigo-950/60 p-3 rounded-xl border border-indigo-800/40">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                <span>Track shortlists, interview calls, and official offer letters</span>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-indigo-800/50">
            <span className="text-xs text-indigo-300 block mb-2">Need to hire students instead?</span>
            <Link
              to="/register/company"
              className="inline-flex items-center space-x-1.5 text-xs font-semibold text-purple-300 hover:text-purple-200 transition"
            >
              <Building2 className="h-3.5 w-3.5" />
              <span>Switch to Company / Recruiter Sign Up &rarr;</span>
            </Link>
          </div>
        </div>

        {/* Right Column: Student Registration Form */}
        <div className="lg:col-span-7 p-8 sm:p-10 lg:p-12 bg-slate-900/60">
          <div>
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Student Registration</h2>
                <p className="text-slate-400 text-xs sm:text-sm mt-1">Fill in your academic and contact details</p>
              </div>
              <span className="px-2.5 py-1 bg-indigo-500/10 border border-indigo-400/20 text-indigo-300 rounded-full text-xs font-bold">
                Role: Student
              </span>
            </div>

            {error && (
              <div className="mb-6 p-3.5 bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm rounded-xl flex items-center space-x-3 animate-slide-up">
                <AlertCircle className="h-5 w-5 text-rose-400 flex-shrink-0" />
                <span className="font-medium">{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* Name & Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                    Full Name *
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      name="name"
                      required
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="e.g. Rahul Sharma"
                      className="w-full pl-9 pr-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                    College Email Address *
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <input
                      type="email"
                      name="email"
                      required
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="student@college.edu"
                      className="w-full pl-9 pr-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                    />
                  </div>
                </div>
              </div>

              {/* Password & Confirm Password with Visibility Toggle */}
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
                      className="w-full pl-9 pr-10 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
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
                      className="w-full pl-9 pr-10 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
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

              {/* Enrollment Number & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                    Enrollment Number (Unique) *
                  </label>
                  <input
                    type="text"
                    name="enrollment_number"
                    required
                    value={formData.enrollment_number}
                    onChange={handleChange}
                    placeholder="e.g. ENR2024045"
                    className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm uppercase focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                    Contact Phone Number
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="9876543210"
                      className="w-full pl-9 pr-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                    />
                  </div>
                </div>
              </div>

              {/* Department & Graduation Year */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                    Department / Branch *
                  </label>
                  <select
                    name="department_id"
                    value={formData.department_id}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                  >
                    {departments.map((dept) => (
                      <option key={dept.id} value={dept.id}>
                        {dept.name} ({dept.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                    Graduation Year *
                  </label>
                  <input
                    type="number"
                    name="graduation_year"
                    required
                    value={formData.graduation_year}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                  />
                </div>
              </div>

              {/* CGPA & Backlogs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                    Current Cumulative CGPA (Scale 10) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="10"
                    name="cgpa"
                    required
                    value={formData.cgpa}
                    onChange={handleChange}
                    placeholder="8.50"
                    className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                    Active Backlogs Count
                  </label>
                  <input
                    type="number"
                    min="0"
                    name="backlogs"
                    value={formData.backlogs}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                  Resume Link (PDF / Google Drive URL)
                </label>
                <input
                  type="url"
                  name="resume_url"
                  value={formData.resume_url}
                  onChange={handleChange}
                  placeholder="https://drive.google.com/your-resume.pdf"
                  className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 px-4 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-semibold rounded-xl shadow-lg shadow-indigo-600/30 hover:shadow-indigo-600/50 active:scale-[0.99] transition disabled:opacity-50 flex items-center justify-center space-x-2 text-sm"
                >
                  {loading ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>Creating Student Account...</span>
                    </div>
                  ) : (
                    <>
                      <span>Complete Student Registration</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </div>
            </form>

            <div className="mt-6 pt-6 border-t border-slate-800 text-center text-xs text-slate-400">
              Already registered as a student?{' '}
              <Link to="/login" className="font-semibold text-indigo-400 hover:text-indigo-300 transition underline underline-offset-4">
                Sign In here
              </Link>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default RegisterStudent;
