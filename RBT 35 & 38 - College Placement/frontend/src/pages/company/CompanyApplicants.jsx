import React, { useEffect, useState } from 'react';
import api from '../../api';
import { Users, Filter, CheckCircle2, Clock, XCircle, Award, ExternalLink, AlertCircle } from 'lucide-react';

const CompanyApplicants = () => {
  const [applicants, setApplicants] = useState([]);
  const [drives, setDrives] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDrive, setSelectedDrive] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [notification, setNotification] = useState({ type: '', message: '' });

  // Selection modal state
  const [selectionModalApp, setSelectionModalApp] = useState(null);
  const [offerPackage, setOfferPackage] = useState('');
  const [joiningDate, setJoiningDate] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      let url = '/companies/applicants?';
      if (selectedDrive) url += `drive_id=${selectedDrive}&`;
      if (selectedStatus) url += `status=${selectedStatus}&`;

      const [appsRes, drivesRes] = await Promise.all([
        api.get(url),
        api.get('/companies/drives')
      ]);
      setApplicants(appsRes.data);
      setDrives(drivesRes.data);
    } catch (err) {
      console.error('Error fetching applicants:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedDrive, selectedStatus]);

  const handleUpdateStatus = async (appId, newStatus, extraData = {}) => {
    try {
      await api.put(`/companies/applicants/${appId}/status`, {
        status: newStatus,
        ...extraData
      });
      setNotification({ type: 'success', message: `Applicant status changed to ${newStatus}` });
      fetchData();
    } catch (err) {
      console.error('Failed to update applicant status:', err);
      setNotification({ type: 'error', message: err.response?.data?.message || 'Failed to update status' });
    }
  };

  const openSelectModal = (app) => {
    setSelectionModalApp(app);
    setOfferPackage(app.package || '');
    setJoiningDate(new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
  };

  const handleConfirmSelect = async (e) => {
    e.preventDefault();
    if (!selectionModalApp) return;

    await handleUpdateStatus(selectionModalApp.application_id, 'Selected', {
      package: parseFloat(offerPackage),
      joining_date: joiningDate
    });
    setSelectionModalApp(null);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 pb-4 border-b border-gray-200">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900">Applicant Tracking System</h1>
          <p className="text-gray-600 text-sm mt-1">Review candidates, schedule interviews, and issue campus offers</p>
        </div>
      </div>

      {notification.message && (
        <div className={`p-4 mb-6 rounded-xl border flex items-center space-x-3 ${
          notification.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          {notification.type === 'success' ? <CheckCircle2 className="h-5 w-5 text-green-600" /> : <AlertCircle className="h-5 w-5 text-red-600" />}
          <span className="text-sm font-medium">{notification.message}</span>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm mb-6 flex flex-wrap gap-4 items-center">
        <div className="flex items-center space-x-2">
          <label className="text-xs font-semibold text-gray-600">Filter by Drive:</label>
          <select
            value={selectedDrive}
            onChange={(e) => setSelectedDrive(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
          >
            <option value="">All Drives</option>
            {drives.map((d) => (
              <option key={d.id} value={d.id}>
                {d.job_title} (₹{d.package} LPA)
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center space-x-2">
          <label className="text-xs font-semibold text-gray-600">Filter by Status:</label>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
          >
            <option value="">All Statuses</option>
            <option value="Applied">Applied</option>
            <option value="Shortlisted">Shortlisted</option>
            <option value="Interview">Interview</option>
            <option value="Selected">Selected</option>
            <option value="Rejected">Rejected</option>
          </select>
        </div>
      </div>

      {/* Applicants Table */}
      {loading ? (
        <div className="text-center py-16">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-600 mx-auto"></div>
          <p className="text-gray-500 text-sm mt-3">Loading applicants...</p>
        </div>
      ) : applicants.length > 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
              <thead className="bg-gray-50 text-gray-500 uppercase text-xs tracking-wider">
                <tr>
                  <th className="py-3.5 px-4 font-semibold">Student Name & Enrollment</th>
                  <th className="py-3.5 px-4 font-semibold">Drive Applied</th>
                  <th className="py-3.5 px-4 font-semibold">Dept & CGPA</th>
                  <th className="py-3.5 px-4 font-semibold">Backlogs</th>
                  <th className="py-3.5 px-4 font-semibold">Resume</th>
                  <th className="py-3.5 px-4 font-semibold">Current Status</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Recruitment Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {applicants.map((app) => (
                  <tr key={app.application_id} className="hover:bg-gray-50 transition">
                    <td className="py-4 px-4">
                      <div className="font-bold text-gray-900">{app.student_name}</div>
                      <div className="text-xs text-gray-500">{app.enrollment_number} • {app.student_email}</div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="font-semibold text-gray-800">{app.job_title}</div>
                      <div className="text-xs text-indigo-700">₹{app.package} LPA</div>
                    </td>
                    <td className="py-4 px-4">
                      <span className="font-bold text-gray-900">{app.cgpa}</span>
                      <span className="text-xs text-gray-500 ml-1">({app.department_code})</span>
                    </td>
                    <td className="py-4 px-4">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                        app.backlogs > 0 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                      }`}>
                        {app.backlogs}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-xs">
                      {app.resume_url ? (
                        <a
                          href={app.resume_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-purple-600 hover:underline flex items-center space-x-1"
                        >
                          <span>View PDF</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        <span className="text-gray-400">Not uploaded</span>
                      )}
                    </td>
                    <td className="py-4 px-4">
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                        app.status === 'Selected' ? 'bg-emerald-100 text-emerald-800' :
                        app.status === 'Shortlisted' ? 'bg-amber-100 text-amber-800' :
                        app.status === 'Interview' ? 'bg-purple-100 text-purple-800' :
                        app.status === 'Rejected' ? 'bg-rose-100 text-rose-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {app.status}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right space-x-1.5 whitespace-nowrap">
                      {app.status !== 'Shortlisted' && app.status !== 'Selected' && (
                        <button
                          onClick={() => handleUpdateStatus(app.application_id, 'Shortlisted')}
                          className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 text-xs font-bold rounded border border-amber-200 transition"
                        >
                          Shortlist
                        </button>
                      )}

                      {app.status !== 'Interview' && app.status !== 'Selected' && (
                        <button
                          onClick={() => handleUpdateStatus(app.application_id, 'Interview')}
                          className="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-bold rounded border border-purple-200 transition"
                        >
                          Interview
                        </button>
                      )}

                      {app.status !== 'Selected' && (
                        <button
                          onClick={() => openSelectModal(app)}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded transition"
                        >
                          Select
                        </button>
                      )}

                      {app.status !== 'Rejected' && (
                        <button
                          onClick={() => handleUpdateStatus(app.application_id, 'Rejected')}
                          className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded border border-rose-200 transition"
                        >
                          Reject
                        </button>
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
          <Users className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-gray-900">No applicants found</h3>
          <p className="text-gray-500 text-sm mt-1">There are no candidates matching the active filter.</p>
        </div>
      )}

      {/* Select Student / Offer Modal */}
      {selectionModalApp && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-gray-900 mb-2">
              Extend Placement Offer
            </h2>
            <p className="text-xs text-gray-600 mb-4">
              Select <strong>{selectionModalApp.student_name}</strong> ({selectionModalApp.enrollment_number}) for <strong>{selectionModalApp.job_title}</strong>.
            </p>

            <form onSubmit={handleConfirmSelect} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Final Agreed Package (LPA in ₹) *</label>
                <input
                  type="number"
                  step="0.1"
                  required
                  value={offerPackage}
                  onChange={(e) => setOfferPackage(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Expected Joining Date *</label>
                <input
                  type="date"
                  required
                  value={joiningDate}
                  onChange={(e) => setJoiningDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="pt-4 flex justify-end space-x-3 border-t">
                <button
                  type="button"
                  onClick={() => setSelectionModalApp(null)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm"
                >
                  Confirm Selection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompanyApplicants;
