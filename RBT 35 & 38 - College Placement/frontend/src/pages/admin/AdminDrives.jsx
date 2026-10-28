import React, { useEffect, useState } from 'react';
import api from '../../api';
import { Briefcase, Trash2, MapPin } from 'lucide-react';

const AdminDrives = () => {
  const [drives, setDrives] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchDrives = async () => {
    try {
      setLoading(true);
      const res = await api.get('/drives');
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

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this placement drive from the database?')) return;
    try {
      await api.delete(`/drives/${id}`);
      fetchDrives();
    } catch (err) {
      console.error('Error deleting drive:', err);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-8 pb-4 border-b border-gray-200">
        <h1 className="text-3xl font-extrabold text-gray-900">Placement Drives Oversight</h1>
        <p className="text-gray-600 text-sm mt-1">Global view of all drives posted by recruiting organizations</p>
      </div>

      {loading ? (
        <div className="text-center py-16">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-rose-600 mx-auto"></div>
          <p className="text-gray-500 text-sm mt-3">Loading drives...</p>
        </div>
      ) : drives.length > 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
              <thead className="bg-gray-50 text-gray-500 uppercase text-xs tracking-wider">
                <tr>
                  <th className="py-3.5 px-4 font-semibold">Job Title & Company</th>
                  <th className="py-3.5 px-4 font-semibold">Package</th>
                  <th className="py-3.5 px-4 font-semibold">Location</th>
                  <th className="py-3.5 px-4 font-semibold">Eligibility Criteria</th>
                  <th className="py-3.5 px-4 font-semibold">Drive Date</th>
                  <th className="py-3.5 px-4 font-semibold">Applicants</th>
                  <th className="py-3.5 px-4 font-semibold">Status</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {drives.map((d) => (
                  <tr key={d.id} className="hover:bg-gray-50 transition">
                    <td className="py-4 px-4">
                      <div className="font-bold text-gray-900">{d.job_title}</div>
                      <div className="text-xs text-gray-500">{d.company_name}</div>
                    </td>
                    <td className="py-4 px-4 font-bold text-indigo-700">₹{d.package} LPA</td>
                    <td className="py-4 px-4 text-xs text-gray-600">{d.location}</td>
                    <td className="py-4 px-4 text-xs text-gray-600">
                      <div>Min CGPA: <strong>{d.minimum_cgpa}</strong></div>
                      <div>Branches: <strong>{d.eligible_branches}</strong></div>
                    </td>
                    <td className="py-4 px-4 text-xs text-gray-600">
                      {new Date(d.drive_date).toLocaleDateString()}
                    </td>
                    <td className="py-4 px-4 text-center font-bold text-purple-700">
                      {d.total_applicants || 0}
                    </td>
                    <td className="py-4 px-4">
                      <span className={`px-2.5 py-1 text-xs font-bold rounded-full uppercase ${
                        d.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'
                      }`}>
                        {d.status}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <button
                        onClick={() => handleDelete(d.id)}
                        className="p-1.5 text-gray-400 hover:text-rose-600 transition"
                        title="Delete Drive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white p-12 text-center rounded-xl border border-gray-200">
          <p className="text-gray-500 text-sm">No drives registered in database.</p>
        </div>
      )}
    </div>
  );
};

export default AdminDrives;
