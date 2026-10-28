import React, { useEffect, useState } from 'react';
import api from '../../api';
import { FileText, Search } from 'lucide-react';

const AdminApplications = () => {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchApplications = async () => {
      try {
        setLoading(true);
        const res = await api.get('/admin/applications');
        setApplications(res.data);
      } catch (err) {
        console.error('Failed to load applications:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchApplications();
  }, []);

  const filtered = applications.filter(a =>
    a.student_name.toLowerCase().includes(search.toLowerCase()) ||
    a.company_name.toLowerCase().includes(search.toLowerCase()) ||
    a.job_title.toLowerCase().includes(search.toLowerCase()) ||
    a.enrollment_number.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-8 pb-4 border-b border-gray-200">
        <h1 className="text-3xl font-extrabold text-gray-900">All Placement Applications</h1>
        <p className="text-gray-600 text-sm mt-1">Global audit ledger of all candidate applications submitted across all drives</p>
      </div>

      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by student, company, enrollment number, or job title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-rose-500 focus:outline-none"
          />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-rose-600 mx-auto"></div>
          <p className="text-gray-500 text-sm mt-3">Loading applications...</p>
        </div>
      ) : filtered.length > 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
              <thead className="bg-gray-50 text-gray-500 uppercase text-xs tracking-wider">
                <tr>
                  <th className="py-3.5 px-4 font-semibold">Student Name & ID</th>
                  <th className="py-3.5 px-4 font-semibold">Branch & CGPA</th>
                  <th className="py-3.5 px-4 font-semibold">Applied Company</th>
                  <th className="py-3.5 px-4 font-semibold">Job Title & Package</th>
                  <th className="py-3.5 px-4 font-semibold">Application Date</th>
                  <th className="py-3.5 px-4 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {filtered.map((app) => (
                  <tr key={app.id} className="hover:bg-gray-50 transition">
                    <td className="py-4 px-4">
                      <div className="font-bold text-gray-900">{app.student_name}</div>
                      <div className="text-xs text-gray-500">{app.enrollment_number}</div>
                    </td>
                    <td className="py-4 px-4 text-xs">
                      <span className="font-bold text-gray-800">{app.cgpa}</span>
                      <span className="text-gray-500 ml-1">({app.department_code})</span>
                    </td>
                    <td className="py-4 px-4 font-semibold text-gray-800">{app.company_name}</td>
                    <td className="py-4 px-4">
                      <div className="font-medium text-gray-900">{app.job_title}</div>
                      <div className="text-xs font-bold text-indigo-700">₹{app.drive_package} LPA</div>
                    </td>
                    <td className="py-4 px-4 text-xs text-gray-500">
                      {new Date(app.application_date).toLocaleDateString()}
                    </td>
                    <td className="py-4 px-4">
                      <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${
                        app.status === 'Selected' ? 'bg-emerald-100 text-emerald-800' :
                        app.status === 'Shortlisted' ? 'bg-amber-100 text-amber-800' :
                        app.status === 'Interview' ? 'bg-purple-100 text-purple-800' :
                        app.status === 'Rejected' ? 'bg-rose-100 text-rose-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {app.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white p-12 text-center rounded-xl border border-gray-200">
          <p className="text-gray-500 text-sm">No applications found.</p>
        </div>
      )}
    </div>
  );
};

export default AdminApplications;
