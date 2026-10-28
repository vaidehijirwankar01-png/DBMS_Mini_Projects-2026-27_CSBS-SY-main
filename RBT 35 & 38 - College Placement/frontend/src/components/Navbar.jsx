import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  GraduationCap, LogOut, User, Building2, Briefcase, 
  FileText, CheckCircle, ShieldCheck, BarChart3, Users, Menu, X, ChevronDown, Sparkles 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [registerDropdownOpen, setRegisterDropdownOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
    setMobileMenuOpen(false);
  };

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const roleDashboardLink = user?.role ? `/${user.role}` : '/login';

  return (
    <header className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur-xl border-b border-white/10 shadow-2xl transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Brand Logo with Gradient & Subtle Glow */}
          <Link to="/" className="flex items-center space-x-3 group">
            <div className="p-2.5 bg-gradient-to-tr from-indigo-500 via-indigo-600 to-violet-600 rounded-xl shadow-lg shadow-indigo-500/25 group-hover:shadow-indigo-500/50 group-hover:scale-105 transition-all duration-300">
              <GraduationCap className="h-5 w-5 text-white" />
            </div>
            <div>
              <span className="font-extrabold text-lg tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-100 to-indigo-200">
                Placement<span className="text-cyan-400">Pro</span>
              </span>
              <span className="text-[10px] text-indigo-400 font-semibold uppercase tracking-widest block leading-none">
                Campus Recruitment
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1 lg:space-x-2">
            {!user ? (
              <>
                {[
                  { name: 'Home', path: '/' },
                  { name: 'Placement Drives', path: '/public/drives' },
                  { name: 'Companies', path: '/public/companies' },
                  { name: 'About', path: '/about' },
                ].map((item) => {
                  const active = isActive(item.path);
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`relative px-3.5 py-2 text-xs lg:text-sm font-semibold rounded-xl transition-all duration-200
                      ${active ? 'text-white' : 'text-slate-300 hover:text-white hover:bg-white/5'}`}
                    >
                      {item.name}
                      {/* Active Underline Animation */}
                      {active && (
                        <motion.span
                          layoutId="navbar-active-pill"
                          className="absolute inset-x-2 bottom-0 h-0.5 bg-gradient-to-r from-indigo-400 to-cyan-400 rounded-full"
                          transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                        />
                      )}
                    </Link>
                  );
                })}
              </>
            ) : (
              /* Authenticated Quick Switcher */
              <div className="flex items-center space-x-2">
                <Link
                  to={roleDashboardLink}
                  className="px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-500/30 transition flex items-center space-x-1.5"
                >
                  <BarChart3 className="h-3.5 w-3.5" />
                  <span>Open {user.role.charAt(0).toUpperCase() + user.role.slice(1)} Workspace</span>
                </Link>
              </div>
            )}
          </nav>

          {/* User Auth Controls / Profile Menu */}
          <div className="hidden md:flex items-center space-x-3">
            {user ? (
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-slate-900/80 border border-white/10">
                  <div className="h-7 w-7 rounded-full bg-gradient-to-tr from-indigo-500 to-cyan-400 flex items-center justify-center font-bold text-white text-xs">
                    {user.name?.charAt(0).toUpperCase()}
                  </div>
                  <div className="text-left text-xs">
                    <span className="font-bold text-white block leading-tight truncate max-w-[120px]">
                      {user.name}
                    </span>
                    <span className="text-[10px] text-indigo-400 font-semibold uppercase tracking-wider">
                      {user.role}
                    </span>
                  </div>
                </div>

                <button
                  onClick={handleLogout}
                  className="flex items-center space-x-1.5 bg-rose-500/10 hover:bg-rose-500 text-rose-300 hover:text-white text-xs font-semibold px-3 py-2 rounded-xl border border-rose-500/20 transition-all duration-200 active:scale-95"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span>Logout</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-3">
                <Link
                  to="/login"
                  className="btn-secondary px-4 py-2 text-xs font-semibold shadow-sm"
                >
                  Sign In
                </Link>

                {/* Sign Up Dropdown Hub */}
                <div className="relative">
                  <button
                    onClick={() => setRegisterDropdownOpen(!registerDropdownOpen)}
                    className="btn-primary px-4 py-2 text-xs font-semibold flex items-center space-x-1.5"
                  >
                    <span>Register</span>
                    <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${registerDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  <AnimatePresence>
                    {registerDropdownOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        onMouseLeave={() => setRegisterDropdownOpen(false)}
                        className="absolute right-0 mt-2 w-56 rounded-2xl bg-slate-900/95 backdrop-blur-2xl border border-white/15 shadow-2xl p-2 z-50"
                      >
                        <Link
                          to="/register/student"
                          onClick={() => setRegisterDropdownOpen(false)}
                          className="flex items-start p-2.5 rounded-xl hover:bg-indigo-600/20 hover:border hover:border-indigo-500/30 transition text-left group"
                        >
                          <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-lg mr-2.5">
                            <GraduationCap className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="text-xs font-bold text-white group-hover:text-indigo-300">Student Account</div>
                            <div className="text-[10px] text-slate-400">Apply to placement drives</div>
                          </div>
                        </Link>

                        <Link
                          to="/register/company"
                          onClick={() => setRegisterDropdownOpen(false)}
                          className="flex items-start p-2.5 rounded-xl hover:bg-violet-600/20 hover:border hover:border-violet-500/30 transition text-left group mt-1"
                        >
                          <div className="p-2 bg-purple-500/20 text-purple-400 rounded-lg mr-2.5">
                            <Building2 className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="text-xs font-bold text-white group-hover:text-purple-300">Recruiter / Company</div>
                            <div className="text-[10px] text-slate-400">Post drives & hire talent</div>
                          </div>
                        </Link>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            )}
          </div>

          {/* Mobile Menu Hamburger */}
          <div className="flex md:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Drawer Navigation */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-slate-950/95 backdrop-blur-2xl border-b border-white/10 px-4 pt-2 pb-6 space-y-3"
          >
            {!user ? (
              <div className="space-y-1">
                <Link to="/" onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2 text-sm font-semibold text-slate-200 hover:bg-white/5 rounded-xl">Home</Link>
                <Link to="/public/drives" onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2 text-sm font-semibold text-slate-200 hover:bg-white/5 rounded-xl">Placement Drives</Link>
                <Link to="/public/companies" onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2 text-sm font-semibold text-slate-200 hover:bg-white/5 rounded-xl">Companies</Link>
                <Link to="/about" onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2 text-sm font-semibold text-slate-200 hover:bg-white/5 rounded-xl">About</Link>
                
                <div className="pt-3 border-t border-white/10 space-y-2">
                  <Link to="/login" onClick={() => setMobileMenuOpen(false)} className="block text-center btn-secondary w-full py-2.5 text-xs font-semibold">Sign In</Link>
                  <Link to="/register/student" onClick={() => setMobileMenuOpen(false)} className="block text-center btn-primary w-full py-2.5 text-xs font-semibold">Register as Student</Link>
                  <Link to="/register/company" onClick={() => setMobileMenuOpen(false)} className="block text-center btn-secondary w-full py-2.5 text-xs font-semibold">Register as Recruiter</Link>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="p-3 bg-slate-900 rounded-xl border border-white/10 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-white text-sm">{user.name}</div>
                    <div className="text-xs text-indigo-400 uppercase font-semibold">{user.role}</div>
                  </div>
                  <Link
                    to={roleDashboardLink}
                    onClick={() => setMobileMenuOpen(false)}
                    className="btn-primary px-3 py-1.5 text-xs font-semibold"
                  >
                    Go to Portal
                  </Link>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full text-center py-2 text-xs font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-xl hover:bg-rose-500 hover:text-white transition"
                >
                  Logout
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};

export default Navbar;
