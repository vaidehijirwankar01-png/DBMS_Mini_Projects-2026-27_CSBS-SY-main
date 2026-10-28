import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api';
import { Briefcase, Users, UserCheck, Award, PlusCircle, ArrowRight, AlertCircle, Building2, ExternalLink } from 'lucide-react';

const CompanyDashboard = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [drives, setDrives] = useState([]);
  const [applicants, setApplicants] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCompanyData = async () => {
      try {
        setLoading(true);
        const [profRes, drivesRes, appsRes] = await Promise.all([
          api.get('/companies/profile'),
          api.get('/companies/drives'),
          api.get('/companies/applicants')
        ]);
        setProfile(profRes.data);
        setDrives(drivesRes.data);
        setApplicants(appsRes.data);
      } catch (err) {
        console.error('Error fetching company dashboard:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchCompanyData();
  }, []);

  const totalDrives = drives.length;
  const activeDrives = drives.filter(d => d.status === 'active').length;
  const totalApplicants = applicants.length;
  const shortlistedCount = applicants.filter(a => a.status === 'Shortlisted' || a.status === 'Interview').length;
  const hiredCount = applicants.filter(a => a.status === 'Selected').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-400"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative">
      {/* Ambient background glow */}
      <div className="absolute top-10 right-20 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-purple-900/90 via-slate-900/90 to-indigo-950/90 border border-purple-500/30 text-white rounded-2xl p-6 sm:p-8 shadow-xl mb-8 backdrop-blur-xl card-3d">
        <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="flex items-center space-x-2.5">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white">{profile?.company_name || user?.name}</h1>
              <span className={`text-xs font-bold px-3 py-0.5 rounded-full uppercase tracking-wider border ${
                profile?.approval_status === 'approved' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' :
                profile?.approval_status === 'rejected' ? 'bg-red-500/20 text-red-300 border-red-500/30' : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
              }`}>
                {profile?.approval_status || 'Pending Approval'}
              </span>
            </div>
            <p className="text-slate-300 text-sm mt-1.5 flex items-center space-x-2">
              <span>Recruiter Portal</span>
              <span>•</span>
              <span className="text-purple-300">{profile?.industry || 'Technology'}</span>
              <span>•</span>
              <span className="text-slate-400">{profile?.location || 'India'}</span>
            </p>
          </div>
          <div className="flex space-x-3">
            <Link
              to="/company/drives"
              className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-purple-600/30 transition flex items-center space-x-1.5"
            >
              <PlusCircle className="h-4 w-4" />
              <span>Post New Drive</span>
            </Link>
          </div>
        </div>
      </div>

      {profile?.approval_status === 'pending' && (
        <div className="bg-amber-950/40 border border-amber-500/30 rounded-2xl p-4 mb-8 flex items-center space-x-3 text-amber-200 text-sm backdrop-blur-md">
          <AlertCircle className="h-5 w-5 flex-shrink-0 text-amber-400" />
          <span>
            Your company account is currently pending administrative approval. While you can configure your profile and drives, students will see your drives once approved.
          </span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
        <div className="bg-slate-800/70 border border-slate-700/60 p-5 rounded-2xl shadow-lg flex items-center justify-between card-3d">
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Drives</div>
            <div className="text-2xl sm:text-3xl font-extrabold text-white mt-1.5">{activeDrives}</div>
            <div className="text-xs text-indigo-400 mt-1 font-medium">{totalDrives} total drives</div>
          </div>
          <div className="p-3 bg-purple-500/20 text-purple-400 rounded-xl border border-purple-500/30">
            <Briefcase className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-slate-800/70 border border-slate-700/60 p-5 rounded-2xl shadow-lg flex items-center justify-between card-3d">
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Applicants</div>
            <div className="text-2xl sm:text-3xl font-extrabold text-white mt-1.5">{totalApplicants}</div>
            <div className="text-xs text-blue-400 mt-1 font-medium">Across all drives</div>
          </div>
          <div className="p-3 bg-blue-500/20 text-blue-400 rounded-xl border border-blue-500/30">
            <Users className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-slate-800/70 border border-slate-700/60 p-5 rounded-2xl shadow-lg flex items-center justify-between card-3d">
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Shortlisted</div>
            <div className="text-2xl sm:text-3xl font-extrabold text-white mt-1.5">{shortlistedCount}</div>
            <div className="text-xs text-amber-400 mt-1 font-medium">Ready for rounds</div>
          </div>
          <div className="p-3 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/30">
            <UserCheck className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-slate-800/70 border border-slate-700/60 p-5 rounded-2xl shadow-lg flex items-center justify-between card-3d">
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Hired Candidates</div>
            <div className="text-2xl sm:text-3xl font-extrabold text-emerald-400 mt-1.5">{hiredCount}</div>
            <div className="text-xs text-slate-400 mt-1 font-medium">Offers extended</div>
          </div>
          <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
            <Award className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* Two columns: Drives & Recent Applicants */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Company Drives Summary */}
        <div className="bg-slate-800/70 border border-slate-700/60 rounded-2xl p-6 shadow-xl card-3d">
          <div className="flex justify-between items-center mb-5">
            <h2 className="text-lg font-bold text-white">Your Placement Drives</h2>
            <Link to="/company/drives" className="text-xs text-purple-400 hover:text-purple-300 font-semibold flex items-center space-x-1 transition">
              <span>Manage All ({drives.length})</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="space-y-3">
            {drives.length > 0 ? (
              drives.slice(0, 4).map((d) => (
                <div key={d.id} className="p-4 rounded-xl border border-slate-700/60 bg-slate-900/50 flex items-center justify-between hover:border-slate-600 transition">
                  <div>
                    <div className="font-bold text-white text-sm">{d.job_title}</div>
                    <div className="text-xs text-slate-400 mt-1">
                      <span className="text-purple-300 font-medium">₹{d.package} LPA</span> • {d.total_applicants || 0} Applicants • {d.selected_count || 0} Hired
                    </div>
                  </div>
                  <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full capitalize border ${
                    d.status === 'active' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-slate-700/50 text-slate-400 border-slate-600'
                  }`}>
                    {d.status}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500 py-6 text-center">No drives created yet. Click Post New Drive to start.</p>
            )}
          </div>
        </div>

        {/* Recent Applicants */}
        <div className="bg-slate-800/70 border border-slate-700/60 rounded-2xl p-6 shadow-xl card-3d">
          <div className="flex justify-between items-center mb-5">
            <h2 className="text-lg font-bold text-white">Recent Applicants</h2>
            <Link to="/company/applicants" className="text-xs text-purple-400 hover:text-purple-300 font-semibold flex items-center space-x-1 transition">
              <span>View All ({applicants.length})</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="space-y-3">
            {applicants.length > 0 ? (
              applicants.slice(0, 4).map((app) => (
                <div key={app.application_id} className="p-4 rounded-xl border border-slate-700/60 bg-slate-900/50 flex items-center justify-between hover:border-slate-600 transition">
                  <div>
                    <div className="font-bold text-white text-sm">{app.student_name}</div>
                    <div className="text-xs text-slate-400 mt-1">
                      {app.job_title} • CGPA: <strong className="text-slate-300">{app.cgpa}</strong> • {app.department_code}
                    </div>
                  </div>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
                    app.status === 'Selected' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' :
                    app.status === 'Shortlisted' ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' :
                    app.status === 'Interview' ? 'bg-purple-500/20 text-purple-300 border-purple-500/30' :
                    app.status === 'Rejected' ? 'bg-red-500/20 text-red-300 border-red-500/30' : 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                  }`}>
                    {app.status}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500 py-6 text-center">No student applications received yet.</p>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default CompanyDashboard;
