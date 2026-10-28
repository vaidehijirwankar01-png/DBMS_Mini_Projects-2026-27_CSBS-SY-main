import React, { useState } from 'react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BarChart3, User, Briefcase, FileText, CheckCircle2, 
  Building2, Users, GraduationCap, ChevronLeft, ChevronRight, 
  Menu, X, LogOut, ShieldCheck, Sparkles, ExternalLink 
} from 'lucide-react';

const MENU_CONFIG = {
  student: [
    { name: 'Dashboard', path: '/student', icon: BarChart3 },
    { name: 'My Profile', path: '/student/profile', icon: User },
    { name: 'Placement Drives', path: '/student/drives', icon: Briefcase },
    { name: 'My Applications', path: '/student/applications', icon: FileText },
    { name: 'Selection Status', path: '/student/selections', icon: CheckCircle2 },
  ],
  company: [
    { name: 'Dashboard', path: '/company', icon: BarChart3 },
    { name: 'Company Profile', path: '/company/profile', icon: Building2 },
    { name: 'Placement Drives', path: '/company/drives', icon: Briefcase },
    { name: 'Applicants', path: '/company/applicants', icon: Users },
    { name: 'Selection Results', path: '/company/selections', icon: CheckCircle2 },
  ],
  admin: [
    { name: 'Dashboard', path: '/admin', icon: BarChart3 },
    { name: 'Students', path: '/admin/students', icon: Users },
    { name: 'Companies', path: '/admin/companies', icon: Building2 },
    { name: 'Placement Drives', path: '/admin/drives', icon: Briefcase },
    { name: 'Applications', path: '/admin/applications', icon: FileText },
    { name: 'Selections', path: '/admin/selections', icon: CheckCircle2 },
    { name: 'Departments', path: '/admin/departments', icon: GraduationCap },
    { name: 'Reports', path: '/admin/reports', icon: FileText },
  ],
};

const ROLE_BADGE_STYLE = {
  student: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
  company: 'bg-violet-500/20 text-violet-300 border-violet-500/30',
  admin: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
};

const SidebarLayout = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const role = user?.role || 'student';
  const menuItems = MENU_CONFIG[role] || [];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path) => {
    if (path === `/${role}`) {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  const roleLabel = role === 'admin' ? 'Administrator' : role === 'company' ? 'Recruiter' : 'Student';

  return (
    <div className="flex min-h-[calc(100vh-4rem)] relative">
      {/* Mobile Backdrop Overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMobileOpen(false)}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar Container */}
      <aside
        className={`fixed lg:sticky top-16 z-40 h-[calc(100vh-4rem)] flex flex-col justify-between 
        bg-slate-950/85 backdrop-blur-2xl border-r border-white/10 transition-all duration-300 ease-in-out
        ${collapsed ? 'w-20' : 'w-64'}
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        {/* Top Section */}
        <div className="p-4">
          {/* Role Header */}
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-white/10">
            {!collapsed ? (
              <div className="flex items-center space-x-2.5 overflow-hidden">
                <div className="p-1.5 bg-gradient-to-tr from-indigo-500 to-violet-500 rounded-lg shadow-md shadow-indigo-500/25 flex-shrink-0">
                  {role === 'admin' ? (
                    <ShieldCheck className="h-4 w-4 text-white" />
                  ) : role === 'company' ? (
                    <Building2 className="h-4 w-4 text-white" />
                  ) : (
                    <GraduationCap className="h-4 w-4 text-white" />
                  )}
                </div>
                <div className="truncate">
                  <span className="text-xs font-bold text-white block truncate uppercase tracking-wider">
                    {roleLabel} Portal
                  </span>
                  <span className="text-[10px] text-slate-400 block truncate">
                    Placement Workspace
                  </span>
                </div>
              </div>
            ) : (
              <div className="mx-auto p-1.5 bg-gradient-to-tr from-indigo-500 to-violet-500 rounded-lg shadow-md">
                <Sparkles className="h-4 w-4 text-white" />
              </div>
            )}

            {/* Desktop Collapse Toggle */}
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="hidden lg:flex p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition"
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1.5">
            {menuItems.map((item) => {
              const active = isActive(item.path);
              const Icon = item.icon;

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileOpen(false)}
                  className={`group relative flex items-center px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200
                  ${active 
                    ? 'bg-gradient-to-r from-indigo-600/30 to-violet-600/30 text-white border border-indigo-500/40 shadow-lg shadow-indigo-500/10' 
                    : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                >
                  <Icon className={`h-4 w-4 flex-shrink-0 transition-colors ${active ? 'text-indigo-400' : 'text-slate-400 group-hover:text-slate-200'}`} />
                  
                  {!collapsed && (
                    <span className="ml-3 truncate font-medium tracking-wide">
                      {item.name}
                    </span>
                  )}

                  {/* Active glowing indicator pill */}
                  {active && (
                    <span className="absolute right-2 h-1.5 w-1.5 rounded-full bg-indigo-400 shadow-[0_0_8px_#818cf8]" />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom Section: User Profile & Logout */}
        <div className="p-4 border-t border-white/10 bg-slate-950/40">
          {!collapsed ? (
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center space-x-2.5 truncate">
                <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-indigo-500 to-cyan-400 flex items-center justify-center font-bold text-white text-xs shadow-md">
                  {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                </div>
                <div className="truncate">
                  <div className="text-xs font-bold text-white truncate">{user?.name}</div>
                  <div className={`text-[10px] uppercase font-semibold px-1.5 py-0.2 rounded border inline-block mt-0.5 ${ROLE_BADGE_STYLE[role] || 'text-slate-400'}`}>
                    {role}
                  </div>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
                title="Logout"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={handleLogout}
              className="w-full flex justify-center p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
              title="Logout"
            >
              <LogOut className="h-4 w-4" />
            </button>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Mobile Sidebar Toggle Header */}
        <div className="lg:hidden flex items-center justify-between p-3.5 bg-slate-950/60 backdrop-blur-md border-b border-white/10 sticky top-16 z-30">
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="flex items-center space-x-2 px-3 py-1.5 bg-slate-800/80 text-white rounded-xl text-xs font-semibold border border-slate-700"
          >
            {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            <span>Menu • {roleLabel}</span>
          </button>
          <div className="text-xs text-slate-400 font-medium truncate max-w-[180px]">
            {user?.name}
          </div>
        </div>

        {/* Animated Page Outlet */}
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="flex-1"
        >
          <Outlet />
        </motion.div>
      </div>
    </div>
  );
};

export default SidebarLayout;
