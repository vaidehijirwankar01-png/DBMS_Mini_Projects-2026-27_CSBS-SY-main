import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api';
import { FileText, CheckCircle2, Clock, XCircle, AlertCircle, ArrowUpRight } from 'lucide-react';

const StudentApplications = () => {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchApplications = async () => {
      try {
        setLoading(true);
        const res = await api.get('/students/applications');
        setApplications(res.data);
      } catch (err) {
        console.error('Error loading applications:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchApplications();
  }, []);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Selected':
        return <span className="px-3 py-1 text-xs font-bold rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">Selected</span>;
      case 'Interview':
        return <span className="px-3 py-1 text-xs font-bold rounded-full bg-purple-100 text-purple-800 border border-purple-300">Interview Scheduled</span>;
      case 'Shortlisted':
        return <span className="px-3 py-1 text-xs font-bold rounded-full bg-amber-100 text-amber-800 border border-amber-300">Shortlisted</span>;
      case 'Rejected':
        return <span className="px-3 py-1 text-xs font-bold rounded-full bg-rose-100 text-rose-800 border border-rose-300">Rejected</span>;
      default:
        return <span className="px-3 py-1 text-xs font-bold rounded-full bg-blue-100 text-blue-800 border border-blue-300">Applied</span>;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 pb-4 border-b border-gray-200">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900">My Applications</h1>
          <p className="text-gray-600 text-sm mt-1">Track the status of your placement applications in real time</p>
        </div>
        <Link
          to="/student/drives"
          className="mt-4 sm:mt-0 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-sm transition"
        >
          Explore More Drives
        </Link>
      </div>

      {loading ? (
        <div className="text-center py-16">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="text-gray-500 text-sm mt-3">Loading your applications...</p>
        </div>
      ) : applications.length > 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
              <thead className="bg-gray-50 text-gray-500 uppercase text-xs tracking-wider">
                <tr>
                  <th className="py-3.5 px-4 font-semibold">Job Title & Company</th>
                  <th className="py-3.5 px-4 font-semibold">Package</th>
                  <th className="py-3.5 px-4 font-semibold">Location</th>
                  <th className="py-3.5 px-4 font-semibold">Applied Date</th>
                  <th className="py-3.5 px-4 font-semibold">Drive Date</th>
                  <th className="py-3.5 px-4 font-semibold">Current Status</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {applications.map((app) => (
                  <tr key={app.id} className="hover:bg-gray-50 transition">
                    <td className="py-4 px-4">
                      <div className="font-bold text-gray-900">{app.job_title}</div>
                      <div className="text-xs text-gray-500">{app.company_name}</div>
                    </td>
                    <td className="py-4 px-4 font-bold text-indigo-700">₹{app.package} LPA</td>
                    <td className="py-4 px-4 text-gray-600">{app.location}</td>
                    <td className="py-4 px-4 text-gray-500 text-xs">
                      {new Date(app.application_date).toLocaleDateString()}
                    </td>
                    <td className="py-4 px-4 text-gray-500 text-xs">
                      {new Date(app.drive_date).toLocaleDateString()}
                    </td>
                    <td className="py-4 px-4">{getStatusBadge(app.status)}</td>
                    <td className="py-4 px-4 text-right">
                      {app.status === 'Selected' ? (
                        <Link
                          to="/student/selections"
                          className="inline-flex items-center space-x-1 text-xs font-bold text-emerald-600 hover:text-emerald-800"
                        >
                          <span>Offer</span>
                          <ArrowUpRight className="h-3.5 w-3.5" />
                        </Link>
                      ) : (
                        <span className="text-xs text-gray-400">In Process</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white p-12 text-center rounded-xl border border-gray-200">
          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-gray-900">No applications found</h3>
          <p className="text-gray-500 text-sm mt-1">You haven't submitted any placement applications yet.</p>
          <Link
            to="/student/drives"
            className="mt-4 inline-block px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 transition"
          >
            Browse Available Placement Drives
          </Link>
        </div>
      )}
    </div>
  );
};

export default StudentApplications;
