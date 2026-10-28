import React, { useEffect, useState } from 'react';
import api from '../../api';
import { Award, CheckCircle2, DollarSign } from 'lucide-react';

const AdminSelections = () => {
  const [selections, setSelections] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSelections = async () => {
      try {
        setLoading(true);
        const res = await api.get('/admin/selections');
        setSelections(res.data);
      } catch (err) {
        console.error('Failed to load selections:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchSelections();
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-8 pb-4 border-b border-gray-200">
        <h1 className="text-3xl font-extrabold text-gray-900">Campus Placements & Selections</h1>
        <p className="text-gray-600 text-sm mt-1">Verified record of all candidates successfully placed through campus recruitment</p>
      </div>

      {loading ? (
        <div className="text-center py-16">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-rose-600 mx-auto"></div>
          <p className="text-gray-500 text-sm mt-3">Loading selection records...</p>
        </div>
      ) : selections.length > 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
              <thead className="bg-gray-50 text-gray-500 uppercase text-xs tracking-wider">
                <tr>
                  <th className="py-3.5 px-4 font-semibold">Student Name & ID</th>
                  <th className="py-3.5 px-4 font-semibold">Department</th>
                  <th className="py-3.5 px-4 font-semibold">Recruiting Company</th>
                  <th className="py-3.5 px-4 font-semibold">Job Title</th>
                  <th className="py-3.5 px-4 font-semibold">Offered Package</th>
                  <th className="py-3.5 px-4 font-semibold">Joining Date</th>
                  <th className="py-3.5 px-4 font-semibold">Result</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {selections.map((sel) => (
                  <tr key={sel.id} className="hover:bg-gray-50 transition">
                    <td className="py-4 px-4">
                      <div className="font-bold text-gray-900">{sel.student_name}</div>
                      <div className="text-xs text-gray-500">{sel.enrollment_number}</div>
                    </td>
                    <td className="py-4 px-4 text-xs">
                      <div className="font-semibold text-gray-800">{sel.department_code}</div>
                      <div className="text-gray-500">{sel.department_name}</div>
                    </td>
                    <td className="py-4 px-4 font-bold text-gray-900">{sel.company_name}</td>
                    <td className="py-4 px-4 text-gray-700 font-medium">{sel.job_title}</td>
                    <td className="py-4 px-4 font-black text-emerald-700">₹{sel.package} LPA</td>
                    <td className="py-4 px-4 text-xs text-gray-600">
                      {sel.joining_date ? new Date(sel.joining_date).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="py-4 px-4">
                      <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-full inline-flex items-center space-x-1">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>Placed</span>
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
          <Award className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-gray-900">No placements recorded yet</h3>
        </div>
      )}
    </div>
  );
};

export default AdminSelections;
