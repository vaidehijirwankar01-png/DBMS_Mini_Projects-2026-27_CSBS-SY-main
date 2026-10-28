import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api';
import { Users, Building2, Briefcase, FileText, CheckCircle2, TrendingUp, Award, DollarSign, ShieldAlert, ShieldCheck } from 'lucide-react';

const AdminDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAdminStats = async () => {
      try {
        setLoading(true);
        const res = await api.get('/admin/dashboard');
        setData(res.data);
      } catch (err) {
        console.error('Error fetching admin dashboard:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAdminStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-rose-500"></div>
      </div>
    );
  }

  const stats = data?.stats || {};
  const departmentStats = data?.departmentStats || [];
  const recentApplications = data?.recentApplications || [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative">
      {/* Ambient glow */}
      <div className="absolute top-10 left-20 w-80 h-80 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Admin Welcome Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-rose-950/90 via-slate-900/90 to-indigo-950/90 border border-rose-500/30 text-white rounded-2xl p-6 sm:p-8 shadow-xl mb-8 backdrop-blur-xl card-3d">
        <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="inline-flex items-center space-x-2 text-rose-300 text-xs font-semibold px-2.5 py-1 rounded-md bg-rose-500/20 mb-2 border border-rose-500/30">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Privileged Administrator & Placement Officer Control Center</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Central Placement Command</h1>
            <p className="text-slate-300 text-sm mt-1">
              Live Relational SQL Queries • Real-Time Placement Aggregations & Audits
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              to="/admin/reports"
              className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-rose-600/30 transition"
            >
              Generate Reports
            </Link>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid (Real SQL Aggregations) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 mb-8">
        <div className="bg-slate-800/70 border border-slate-700/60 p-5 rounded-2xl shadow-lg card-3d">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Students</span>
            <Users className="h-5 w-5 text-indigo-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white mt-2">{stats.total_students || 0}</div>
          <div className="text-xs text-indigo-400 font-medium mt-1">Registered candidates</div>
        </div>

        <div className="bg-slate-800/70 border border-slate-700/60 p-5 rounded-2xl shadow-lg card-3d">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Companies</span>
            <Building2 className="h-5 w-5 text-purple-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white mt-2">{stats.total_companies || 0}</div>
          <div className="text-xs text-emerald-400 font-medium mt-1">{stats.approved_companies || 0} Approved</div>
        </div>

        <div className="bg-slate-800/70 border border-slate-700/60 p-5 rounded-2xl shadow-lg card-3d">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Drives</span>
            <Briefcase className="h-5 w-5 text-blue-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white mt-2">{stats.active_drives || 0}</div>
          <div className="text-xs text-blue-400 font-medium mt-1">Accepting applicants</div>
        </div>

        <div className="bg-slate-800/70 border border-slate-700/60 p-5 rounded-2xl shadow-lg card-3d">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Applications</span>
            <FileText className="h-5 w-5 text-amber-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white mt-2">{stats.total_applications || 0}</div>
          <div className="text-xs text-amber-400 font-medium mt-1">Processed</div>
        </div>
      </div>

      {/* Financial & Placement Success Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
        <div className="bg-gradient-to-br from-emerald-950/60 to-slate-900/80 p-6 rounded-2xl border border-emerald-500/30 shadow-lg card-3d">
          <div className="flex items-center space-x-2 text-emerald-400 font-semibold text-sm">
            <Award className="h-5 w-5" />
            <span>Placement Percentage</span>
          </div>
          <div className="text-3xl sm:text-4xl font-black text-emerald-300 mt-2">
            {stats.placement_percentage}%
          </div>
          <div className="text-xs text-emerald-400/80 mt-1 font-medium">
            {stats.total_selected_students || 0} of {stats.total_students || 0} Students Placed
          </div>
        </div>

        <div className="bg-gradient-to-br from-indigo-950/60 to-slate-900/80 p-6 rounded-2xl border border-indigo-500/30 shadow-lg card-3d">
          <div className="flex items-center space-x-2 text-indigo-400 font-semibold text-sm">
            <DollarSign className="h-5 w-5" />
            <span>Average Package (SQL AVG)</span>
          </div>
          <div className="text-3xl sm:text-4xl font-black text-indigo-300 mt-2">
            ₹{stats.average_package} LPA
          </div>
          <div className="text-xs text-indigo-400/80 mt-1 font-medium">
            Computed across all offers
          </div>
        </div>

        <div className="bg-gradient-to-br from-rose-950/60 to-slate-900/80 p-6 rounded-2xl border border-rose-500/30 shadow-lg card-3d">
          <div className="flex items-center space-x-2 text-rose-400 font-semibold text-sm">
            <TrendingUp className="h-5 w-5" />
            <span>Highest Package (SQL MAX)</span>
          </div>
          <div className="text-3xl sm:text-4xl font-black text-rose-300 mt-2">
            ₹{stats.highest_package} LPA
          </div>
          <div className="text-xs text-rose-400/80 mt-1 font-medium">
            Peak campus offer
          </div>
        </div>
      </div>

      {/* Department Breakdown Table & Recent Applications */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Department-wise Placement Stats */}
        <div className="bg-slate-800/70 border border-slate-700/60 rounded-2xl p-6 shadow-xl card-3d">
          <div className="flex justify-between items-center mb-5">
            <h2 className="text-lg font-bold text-white">Branch-wise Placement Statistics</h2>
            <Link to="/admin/departments" className="text-xs text-rose-400 hover:text-rose-300 font-semibold transition">
              Manage Branches &rarr;
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-xs">
              <thead className="bg-slate-900/60 text-slate-400 uppercase tracking-wider border-b border-slate-700/60">
                <tr>
                  <th className="py-3 px-3">Branch</th>
                  <th className="py-3 px-3">Students</th>
                  <th className="py-3 px-3">Placed</th>
                  <th className="py-3 px-3">Avg Package</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {departmentStats.map((dept, idx) => (
                  <tr key={idx} className="hover:bg-slate-700/30 transition">
                    <td className="py-3 px-3 font-semibold text-slate-200">
                      {dept.department_name} ({dept.code})
                    </td>
                    <td className="py-3 px-3 text-slate-400">{dept.total_students}</td>
                    <td className="py-3 px-3 font-bold text-emerald-400">{dept.placed_students}</td>
                    <td className="py-3 px-3 text-indigo-300 font-semibold">
                      ₹{Number(dept.avg_package).toFixed(2)} LPA
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Applications Audit */}
        <div className="bg-slate-800/70 border border-slate-700/60 rounded-2xl p-6 shadow-xl card-3d">
          <div className="flex justify-between items-center mb-5">
            <h2 className="text-lg font-bold text-white">Recent Applications Stream</h2>
            <Link to="/admin/applications" className="text-xs text-rose-400 hover:text-rose-300 font-semibold transition">
              View All &rarr;
            </Link>
          </div>

          <div className="space-y-3">
            {recentApplications.map((app) => (
              <div key={app.id} className="p-3.5 bg-slate-900/50 rounded-xl border border-slate-700/60 flex items-center justify-between text-xs hover:border-slate-600 transition">
                <div>
                  <div className="font-bold text-white">{app.student_name} <span className="text-slate-400 font-normal">({app.enrollment_number})</span></div>
                  <div className="text-slate-400 mt-0.5">{app.job_title} at <strong className="text-slate-300">{app.company_name}</strong></div>
                </div>
                <span className={`px-2.5 py-0.5 rounded-full font-bold border ${
                  app.status === 'Selected' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' :
                  app.status === 'Shortlisted' ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' :
                  app.status === 'Interview' ? 'bg-purple-500/20 text-purple-300 border-purple-500/30' :
                  app.status === 'Rejected' ? 'bg-red-500/20 text-red-300 border-red-500/30' : 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                }`}>
                  {app.status}
                </span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};

export default AdminDashboard;
