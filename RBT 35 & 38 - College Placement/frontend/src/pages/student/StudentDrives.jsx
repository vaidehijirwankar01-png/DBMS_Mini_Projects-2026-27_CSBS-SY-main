import React, { useEffect, useState } from 'react';
import api from '../../api';
import { Search, MapPin, Calendar, Award, CheckCircle2, XCircle, AlertCircle, FileText } from 'lucide-react';

const StudentDrives = () => {
  const [drives, setDrives] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [applyingId, setApplyingId] = useState(null);
  const [notification, setNotification] = useState({ type: '', message: '' });
  const [selectedDriveDetails, setSelectedDriveDetails] = useState(null);

  const fetchDrives = async () => {
    try {
      setLoading(true);
      const res = await api.get('/students/drives');
      setDrives(res.data);
    } catch (err) {
      console.error('Failed to load drives:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDrives();
  }, []);

  const handleApply = async (driveId) => {
    try {
      setApplyingId(driveId);
      setNotification({ type: '', message: '' });
      const res = await api.post('/applications', { drive_id: driveId });
      setNotification({ type: 'success', message: res.data.message || 'Applied successfully!' });
      // Refresh list to update status
      await fetchDrives();
    } catch (err) {
      console.error('Application failed:', err);
      const errorMsg = err.response?.data?.message || 'Failed to submit application';
      const reasons = err.response?.data?.reasons?.join(', ') || '';
      setNotification({
        type: 'error',
        message: reasons ? `${errorMsg}: ${reasons}` : errorMsg
      });
    } finally {
      setApplyingId(null);
    }
  };

  const filteredDrives = drives.filter(d =>
    d.job_title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.eligible_branches.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 pb-4 border-b border-gray-200">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900">Campus Placement Drives</h1>
          <p className="text-gray-600 text-sm mt-1">
            Check your verified eligibility criteria and apply for ongoing drives
          </p>
        </div>
      </div>

      {notification.message && (
        <div className={`p-4 mb-6 rounded-xl border flex items-center space-x-3 ${
          notification.type === 'success'
            ? 'bg-green-50 border-green-200 text-green-800'
            : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          {notification.type === 'success' ? (
            <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
          ) : (
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
          )}
          <span className="text-sm font-medium">{notification.message}</span>
        </div>
      )}

      {/* Search Input */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm mb-8">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by job title, company name, or branch (e.g. CSE, IT)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Drives Grid */}
      {loading ? (
        <div className="text-center py-16">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="text-gray-500 text-sm mt-3">Evaluating eligibility against current criteria...</p>
        </div>
      ) : filteredDrives.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDrives.map((drive) => (
            <div
              key={drive.id}
              className={`bg-white rounded-xl border shadow-sm p-6 flex flex-col justify-between transition hover:shadow-md ${
                drive.has_applied ? 'border-blue-300 bg-blue-50/20' : 'border-gray-200'
              }`}
            >
              <div>
                {/* Header status and salary */}
                <div className="flex justify-between items-start mb-3">
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full flex items-center space-x-1 ${
                    drive.is_eligible ? 'bg-green-100 text-green-800' : 'bg-rose-100 text-rose-800'
                  }`}>
                    {drive.is_eligible ? (
                      <>
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1 inline" />
                        <span>Eligible</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="h-3.5 w-3.5 mr-1 inline" />
                        <span>Not Eligible</span>
                      </>
                    )}
                  </span>
                  <div className="text-lg font-black text-indigo-700">₹{drive.package} LPA</div>
                </div>

                <h3 className="text-xl font-bold text-gray-900">{drive.job_title}</h3>
                <p className="text-sm font-semibold text-gray-600 mb-4">{drive.company_name} • {drive.industry}</p>

                {/* Eligibility Criteria Breakdown */}
                <div className="bg-gray-50 p-3.5 rounded-lg border border-gray-100 space-y-2 text-xs text-gray-600 mb-4">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Min CGPA Required:</span>
                    <span className="font-bold text-gray-800">{drive.minimum_cgpa}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Max Backlogs Allowed:</span>
                    <span className="font-bold text-gray-800">{drive.maximum_backlogs}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Eligible Branches:</span>
                    <span className="font-bold text-gray-800">{drive.eligible_branches}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Graduation Year:</span>
                    <span className="font-bold text-gray-800">{drive.graduation_year}</span>
                  </div>
                  <div className="flex items-center justify-between pt-1 border-t border-gray-200">
                    <span className="text-gray-500">Location:</span>
                    <span className="font-medium text-gray-800">{drive.location}</span>
                  </div>
                </div>

                {/* If Not Eligible, display explicit reasons */}
                {!drive.is_eligible && drive.eligibility_reasons?.length > 0 && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                    <div className="font-bold mb-1 flex items-center">
                      <AlertCircle className="h-3.5 w-3.5 mr-1" />
                      Ineligibility Reason:
                    </div>
                    <ul className="list-disc list-inside space-y-0.5">
                      {drive.eligibility_reasons.map((r, i) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setSelectedDriveDetails(drive)}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold"
                >
                  Job Details
                </button>

                {drive.has_applied ? (
                  <span className="px-4 py-2 bg-blue-100 text-blue-800 text-xs font-bold rounded-lg border border-blue-200">
                    ✓ Applied ({drive.application_status})
                  </span>
                ) : drive.is_eligible ? (
                  <button
                    onClick={() => handleApply(drive.id)}
                    disabled={applyingId === drive.id}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-sm transition disabled:opacity-50"
                  >
                    {applyingId === drive.id ? 'Submitting...' : 'Apply Now'}
                  </button>
                ) : (
                  <button
                    disabled
                    className="px-4 py-2 bg-gray-200 text-gray-500 text-xs font-bold rounded-lg cursor-not-allowed"
                  >
                    Not Eligible
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white p-12 text-center rounded-xl border border-gray-200">
          <p className="text-gray-500 text-sm">No drives found matching your criteria.</p>
        </div>
      )}

      {/* Drive Details Modal */}
      {selectedDriveDetails && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <div>
                <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">{selectedDriveDetails.company_name}</span>
                <h2 className="text-2xl font-bold text-gray-900 mt-1">{selectedDriveDetails.job_title}</h2>
              </div>
              <button
                onClick={() => setSelectedDriveDetails(null)}
                className="text-gray-400 hover:text-gray-600 text-xl font-bold p-1"
              >
                &times;
              </button>
            </div>

            <div className="space-y-4 text-sm text-gray-700">
              <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
                <div><strong>Package:</strong> ₹{selectedDriveDetails.package} LPA</div>
                <div><strong>Location:</strong> {selectedDriveDetails.location}</div>
              </div>

              <div>
                <h4 className="font-bold text-gray-900 mb-1">Job Description:</h4>
                <p className="whitespace-pre-line text-gray-600 leading-relaxed bg-gray-50 p-4 rounded-lg border border-gray-100">
                  {selectedDriveDetails.job_description}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs bg-indigo-50 p-3 rounded-lg text-indigo-900">
                <div><strong>Drive Date:</strong> {new Date(selectedDriveDetails.drive_date).toLocaleDateString()}</div>
                <div><strong>Deadline:</strong> {new Date(selectedDriveDetails.application_deadline).toLocaleDateString()}</div>
                <div><strong>Min CGPA:</strong> {selectedDriveDetails.minimum_cgpa}</div>
                <div><strong>Eligible Branches:</strong> {selectedDriveDetails.eligible_branches}</div>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setSelectedDriveDetails(null)}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 text-sm font-semibold rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentDrives;
