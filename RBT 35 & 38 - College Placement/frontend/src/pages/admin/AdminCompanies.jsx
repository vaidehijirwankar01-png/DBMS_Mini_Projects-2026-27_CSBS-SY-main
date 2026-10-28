import React, { useEffect, useState } from 'react';
import api from '../../api';
import { Building2, Check, X, ExternalLink, AlertCircle, CheckCircle2 } from 'lucide-react';

const AdminCompanies = () => {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState({ type: '', message: '' });

  const fetchCompanies = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/companies');
      setCompanies(res.data);
    } catch (err) {
      console.error('Failed to load companies:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  const handleUpdateStatus = async (id, status) => {
    try {
      await api.put(`/admin/companies/${id}/status`, { approval_status: status });
      setNotification({ type: 'success', message: `Company status updated to ${status}` });
      fetchCompanies();
    } catch (err) {
      console.error('Error updating company status:', err);
      setNotification({ type: 'error', message: 'Failed to update company approval status' });
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-8 pb-4 border-b border-gray-200">
        <h1 className="text-3xl font-extrabold text-gray-900">Manage Recruiting Companies</h1>
        <p className="text-gray-600 text-sm mt-1">Review recruiter registrations and manage campus drive authorizations</p>
      </div>

      {notification.message && (
        <div className={`p-4 mb-6 rounded-xl border flex items-center space-x-3 ${
          notification.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          {notification.type === 'success' ? <CheckCircle2 className="h-5 w-5 text-green-600" /> : <AlertCircle className="h-5 w-5 text-red-600" />}
          <span className="text-sm font-medium">{notification.message}</span>
        </div>
      )}

      {loading ? (
        <div className="text-center py-16">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-rose-600 mx-auto"></div>
          <p className="text-gray-500 text-sm mt-3">Loading companies...</p>
        </div>
      ) : companies.length > 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
              <thead className="bg-gray-50 text-gray-500 uppercase text-xs tracking-wider">
                <tr>
                  <th className="py-3.5 px-4 font-semibold">Company Name & Industry</th>
                  <th className="py-3.5 px-4 font-semibold">Contact Person & Email</th>
                  <th className="py-3.5 px-4 font-semibold">Location</th>
                  <th className="py-3.5 px-4 font-semibold">Website</th>
                  <th className="py-3.5 px-4 font-semibold">Drives</th>
                  <th className="py-3.5 px-4 font-semibold">Approval Status</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Approval Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {companies.map((comp) => (
                  <tr key={comp.id} className="hover:bg-gray-50 transition">
                    <td className="py-4 px-4">
                      <div className="font-bold text-gray-900">{comp.company_name}</div>
                      <div className="text-xs text-gray-500">{comp.industry || 'General'}</div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="text-gray-800 font-medium">{comp.contact_person || 'HR Desk'}</div>
                      <div className="text-xs text-gray-500">{comp.contact_email || comp.user_email}</div>
                    </td>
                    <td className="py-4 px-4 text-gray-600 text-xs">{comp.location || 'India'}</td>
                    <td className="py-4 px-4 text-xs">
                      {comp.website ? (
                        <a
                          href={comp.website.startsWith('http') ? comp.website : `https://${comp.website}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-indigo-600 hover:underline flex items-center space-x-1"
                        >
                          <span>Visit</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        <span className="text-gray-400">N/A</span>
                      )}
                    </td>
                    <td className="py-4 px-4 text-center font-bold text-indigo-700">{comp.total_drives || 0}</td>
                    <td className="py-4 px-4">
                      <span className={`px-2.5 py-1 text-xs font-bold rounded-full uppercase ${
                        comp.approval_status === 'approved' ? 'bg-green-100 text-green-800' :
                        comp.approval_status === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {comp.approval_status}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right space-x-2 whitespace-nowrap">
                      {comp.approval_status !== 'approved' && (
                        <button
                          onClick={() => handleUpdateStatus(comp.id, 'approved')}
                          className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded transition inline-flex items-center space-x-1"
                        >
                          <Check className="h-3.5 w-3.5" />
                          <span>Approve</span>
                        </button>
                      )}

                      {comp.approval_status !== 'rejected' && (
                        <button
                          onClick={() => handleUpdateStatus(comp.id, 'rejected')}
                          className="px-3 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded border border-rose-200 transition inline-flex items-center space-x-1"
                        >
                          <X className="h-3.5 w-3.5" />
                          <span>Reject</span>
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
          <p className="text-gray-500 text-sm">No companies registered in the system yet.</p>
        </div>
      )}
    </div>
  );
};

export default AdminCompanies;
