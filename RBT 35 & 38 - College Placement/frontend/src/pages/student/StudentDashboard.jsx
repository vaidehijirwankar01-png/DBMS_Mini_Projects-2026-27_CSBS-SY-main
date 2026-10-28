import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api';
import { Briefcase, FileCheck, CheckCircle2, Award, Clock, ArrowRight, Sparkles, User, GraduationCap } from 'lucide-react';

const StudentDashboard = () => {
  const { user } = useAuth();
  const [drives, setDrives] = useState([]);
  const [applications, setApplications] = useState([]);
  const [selections, setSelections] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const [profRes, drivesRes, appsRes, selRes] = await Promise.all([
          api.get('/students/profile'),
          api.get('/students/drives'),
          api.get('/students/applications'),
          api.get('/students/selections')
        ]);
        setProfile(profRes.data);
        setDrives(drivesRes.data);
        setApplications(appsRes.data);
        setSelections(selRes.data);
      } catch (err) {
        console.error('Error fetching student dashboard:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, []);

  const totalDrives = drives.length;
  const eligibleDrives = drives.filter(d => d.is_eligible).length;
  const appliedCount = applications.length;
  const shortlistedCount = applications.filter(a => a.status === 'Shortlisted' || a.status === 'Interview').length;
  const selectedCount = selections.length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-400"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative">
      {/* Subtle ambient blur */}
      <div className="absolute top-10 right-20 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Welcome Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-indigo-900/90 via-slate-900/90 to-indigo-950/90 border border-indigo-500/30 text-white rounded-2xl p-6 sm:p-8 shadow-xl mb-8 backdrop-blur-xl card-3d">
        <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="inline-flex items-center space-x-2 text-indigo-300 text-xs font-semibold px-2.5 py-1 rounded-md bg-indigo-500/20 mb-2 border border-indigo-500/30">
              <GraduationCap className="h-3.5 w-3.5" />
              <span>Student Academic & Placement Workspace</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Welcome back, {user?.name}!</h1>
            <p className="text-slate-300 text-sm mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
              <span>Enrollment: <strong className="text-indigo-200">{profile?.enrollment_number || 'N/A'}</strong></span>
              <span>•</span>
              <span>Dept: <strong className="text-indigo-200">{profile?.department_code || 'N/A'}</strong></span>
              <span>•</span>
              <span>CGPA: <strong className="text-indigo-200">{profile?.cgpa || '0.00'}</strong></span>
              <span>•</span>
              <span>Backlogs: <strong className="text-indigo-200">{profile?.backlogs ?? 0}</strong></span>
            </p>
          </div>
          <Link
            to="/student/profile"
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-600/30 transition flex items-center space-x-1.5"
          >
            <User className="h-3.5 w-3.5" />
            <span>Edit Profile</span>
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
        <div className="bg-slate-800/70 border border-slate-700/60 p-5 rounded-2xl shadow-lg flex items-center justify-between card-3d">
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Available Drives</div>
            <div className="text-2xl sm:text-3xl font-extrabold text-white mt-1.5">{totalDrives}</div>
            <div className="text-xs text-emerald-400 font-medium mt-1">{eligibleDrives} eligible for you</div>
          </div>
          <div className="p-3 bg-indigo-500/20 text-indigo-400 rounded-xl border border-indigo-500/30">
            <Briefcase className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-slate-800/70 border border-slate-700/60 p-5 rounded-2xl shadow-lg flex items-center justify-between card-3d">
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Applications</div>
            <div className="text-2xl sm:text-3xl font-extrabold text-white mt-1.5">{appliedCount}</div>
            <div className="text-xs text-blue-400 mt-1 font-medium">Submitted</div>
          </div>
          <div className="p-3 bg-blue-500/20 text-blue-400 rounded-xl border border-blue-500/30">
            <FileCheck className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-slate-800/70 border border-slate-700/60 p-5 rounded-2xl shadow-lg flex items-center justify-between card-3d">
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Shortlisted</div>
            <div className="text-2xl sm:text-3xl font-extrabold text-white mt-1.5">{shortlistedCount}</div>
            <div className="text-xs text-amber-400 font-medium mt-1">Under evaluation</div>
          </div>
          <div className="p-3 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/30">
            <Clock className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-slate-800/70 border border-slate-700/60 p-5 rounded-2xl shadow-lg flex items-center justify-between card-3d">
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Placement Offers</div>
            <div className="text-2xl sm:text-3xl font-extrabold text-emerald-400 mt-1.5">{selectedCount}</div>
            <div className="text-xs text-slate-400 font-medium mt-1">
              {selectedCount > 0 ? 'Selected' : 'Awaiting result'}
            </div>
          </div>
          <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
            <Award className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* Offers Alert Banner if Selected */}
      {selections.length > 0 && (
        <div className="bg-emerald-950/40 border border-emerald-500/40 rounded-2xl p-5 mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 backdrop-blur-md">
          <div className="flex items-center space-x-3.5">
            <CheckCircle2 className="h-8 w-8 text-emerald-400 flex-shrink-0" />
            <div>
              <h3 className="font-bold text-emerald-300 text-base">Congratulations! You have received a Placement Offer!</h3>
              <p className="text-xs text-emerald-200/80 mt-0.5">
                Offer from <strong className="text-white">{selections[0].company_name}</strong> for <strong className="text-white">{selections[0].job_title}</strong> with package <strong className="text-white">₹{selections[0].package} LPA</strong>.
              </p>
            </div>
          </div>
          <Link
            to="/student/selections"
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-600/30 transition whitespace-nowrap"
          >
            View Offer Details
          </Link>
        </div>
      )}

      {/* Two columns: Available drives & Active applications */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Recommended Placement Drives */}
        <div className="bg-slate-800/70 border border-slate-700/60 rounded-2xl p-6 shadow-xl card-3d">
          <div className="flex justify-between items-center mb-5">
            <h2 className="text-lg font-bold text-white">Recommended Drives</h2>
            <Link to="/student/drives" className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center space-x-1 transition">
              <span>View All ({drives.length})</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="space-y-3">
            {drives.slice(0, 3).map((drive) => (
              <div key={drive.id} className="p-4 rounded-xl border border-slate-700/60 bg-slate-900/50 flex items-center justify-between hover:border-slate-600 transition">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-white text-sm">{drive.job_title}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      drive.is_eligible ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-red-500/20 text-red-300 border border-red-500/30'
                    }`}>
                      {drive.is_eligible ? 'Eligible' : 'Not Eligible'}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 mt-1">{drive.company_name} • <span className="text-indigo-300 font-medium">₹{drive.package} LPA</span></div>
                </div>
                <Link
                  to="/student/drives"
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-indigo-300 rounded-lg transition"
                >
                  View &rarr;
                </Link>
              </div>
            ))}
          </div>
        </div>

        {/* My Applications Recent Progress */}
        <div className="bg-slate-800/70 border border-slate-700/60 rounded-2xl p-6 shadow-xl card-3d">
          <div className="flex justify-between items-center mb-5">
            <h2 className="text-lg font-bold text-white">Application Status Tracker</h2>
            <Link to="/student/applications" className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center space-x-1 transition">
              <span>All Applications ({applications.length})</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {applications.length > 0 ? (
            <div className="space-y-3">
              {applications.slice(0, 4).map((app) => (
                <div key={app.id} className="p-4 rounded-xl border border-slate-700/60 bg-slate-900/50 flex items-center justify-between hover:border-slate-600 transition">
                  <div>
                    <div className="font-bold text-white text-sm">{app.job_title}</div>
                    <div className="text-xs text-slate-400 mt-0.5">{app.company_name}</div>
                  </div>
                  <div>
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                      app.status === 'Selected' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                      app.status === 'Interview' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' :
                      app.status === 'Shortlisted' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                      app.status === 'Rejected' ? 'bg-red-500/20 text-red-300 border border-red-500/30' : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                    }`}>
                      {app.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10 text-slate-500 text-sm">
              You have not applied to any placement drives yet.
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default StudentDashboard;
