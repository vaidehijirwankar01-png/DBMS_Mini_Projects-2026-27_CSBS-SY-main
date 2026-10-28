import React, { useEffect, useState } from 'react';
import api from '../../api';
import { Users, Search, ExternalLink } from 'lucide-react';

const AdminStudents = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        setLoading(true);
        const res = await api.get('/admin/students');
        setStudents(res.data);
      } catch (err) {
        console.error('Failed to load students:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStudents();
  }, []);

  const filtered = students.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.enrollment_number.toLowerCase().includes(search.toLowerCase()) ||
    (s.department_code || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 pb-4 border-b border-gray-200">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900">Registered Students Directory</h1>
          <p className="text-gray-600 text-sm mt-1">Total {students.length} registered students across all academic departments</p>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by student name, enrollment number, or branch..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-rose-500 focus:outline-none"
          />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-rose-600 mx-auto"></div>
          <p className="text-gray-500 text-sm mt-3">Loading student records...</p>
        </div>
      ) : filtered.length > 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
              <thead className="bg-gray-50 text-gray-500 uppercase text-xs tracking-wider">
                <tr>
                  <th className="py-3.5 px-4 font-semibold">Student Name & Contact</th>
                  <th className="py-3.5 px-4 font-semibold">Enrollment No</th>
                  <th className="py-3.5 px-4 font-semibold">Branch</th>
                  <th className="py-3.5 px-4 font-semibold">CGPA</th>
                  <th className="py-3.5 px-4 font-semibold">Backlogs</th>
                  <th className="py-3.5 px-4 font-semibold">Grad Year</th>
                  <th className="py-3.5 px-4 font-semibold">Applications</th>
                  <th className="py-3.5 px-4 font-semibold">Placement Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {filtered.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50 transition">
                    <td className="py-4 px-4">
                      <div className="font-bold text-gray-900">{s.name}</div>
                      <div className="text-xs text-gray-500">{s.email} • {s.phone || 'No phone'}</div>
                    </td>
                    <td className="py-4 px-4 font-mono font-medium text-gray-700">{s.enrollment_number}</td>
                    <td className="py-4 px-4 text-gray-800 font-semibold">{s.department_code || 'N/A'}</td>
                    <td className="py-4 px-4 font-bold text-gray-900">{s.cgpa}</td>
                    <td className="py-4 px-4">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                        s.backlogs > 0 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                      }`}>
                        {s.backlogs}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-gray-600">{s.graduation_year}</td>
                    <td className="py-4 px-4 text-center font-bold text-indigo-700">{s.total_applied || 0}</td>
                    <td className="py-4 px-4">
                      <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${
                        s.is_placed > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {s.is_placed > 0 ? '✓ Placed' : 'Unplaced'}
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
          <p className="text-gray-500 text-sm">No students match your search.</p>
        </div>
      )}
    </div>
  );
};

export default AdminStudents;
