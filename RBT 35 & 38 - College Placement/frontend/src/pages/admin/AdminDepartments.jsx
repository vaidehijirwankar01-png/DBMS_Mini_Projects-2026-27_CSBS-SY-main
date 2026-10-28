import React, { useEffect, useState } from 'react';
import api from '../../api';
import { Plus, Trash2, CheckCircle2, AlertCircle } from 'lucide-react';

const AdminDepartments = () => {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [notification, setNotification] = useState({ type: '', message: '' });

  const fetchDepartments = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/departments');
      setDepartments(res.data);
    } catch (err) {
      console.error('Failed to load departments:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await api.post('/admin/departments', { name, code });
      setNotification({ type: 'success', message: 'Department created successfully!' });
      setName('');
      setCode('');
      fetchDepartments();
    } catch (err) {
      console.error('Error creating department:', err);
      setNotification({ type: 'error', message: err.response?.data?.message || 'Failed to create department' });
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this department? Warning: will fail if students are enrolled.')) return;
    try {
      await api.delete(`/admin/departments/${id}`);
      setNotification({ type: 'success', message: 'Department deleted successfully.' });
      fetchDepartments();
    } catch (err) {
      console.error('Error deleting department:', err);
      setNotification({ type: 'error', message: err.response?.data?.message || 'Failed to delete department' });
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-8 pb-4 border-b border-gray-200">
        <h1 className="text-3xl font-extrabold text-gray-900">Academic Departments</h1>
        <p className="text-gray-600 text-sm mt-1">Manage institutional departments and program codes</p>
      </div>

      {notification.message && (
        <div className={`p-4 mb-6 rounded-xl border flex items-center space-x-3 ${
          notification.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          {notification.type === 'success' ? <CheckCircle2 className="h-5 w-5 text-green-600" /> : <AlertCircle className="h-5 w-5 text-red-600" />}
          <span className="text-sm font-medium">{notification.message}</span>
        </div>
      )}

      {/* Add Department Form */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm mb-8">
        <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4">Add New Department</h2>
        <form onSubmit={handleCreate} className="flex flex-col sm:flex-row gap-4 items-end">
          <div className="flex-1">
            <label className="block text-xs font-semibold text-gray-700 mb-1">Department Name *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Civil Engineering"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-rose-500 focus:outline-none"
            />
          </div>

          <div className="w-full sm:w-48">
            <label className="block text-xs font-semibold text-gray-700 mb-1">Branch Code *</label>
            <input
              type="text"
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="e.g. CE"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm uppercase focus:ring-2 focus:ring-rose-500 focus:outline-none"
            />
          </div>

          <button
            type="submit"
            className="w-full sm:w-auto px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg shadow-sm transition flex items-center justify-center space-x-1"
          >
            <Plus className="h-4 w-4" />
            <span>Add Department</span>
          </button>
        </form>
      </div>

      {/* Departments Table */}
      {loading ? (
        <div className="text-center py-16">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-rose-600 mx-auto"></div>
          <p className="text-gray-500 text-sm mt-3">Loading departments...</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
            <thead className="bg-gray-50 text-gray-500 uppercase text-xs tracking-wider">
              <tr>
                <th className="py-3.5 px-4 font-semibold">Department ID</th>
                <th className="py-3.5 px-4 font-semibold">Department Name</th>
                <th className="py-3.5 px-4 font-semibold">Code</th>
                <th className="py-3.5 px-4 font-semibold">Enrolled Students</th>
                <th className="py-3.5 px-4 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {departments.map((dept) => (
                <tr key={dept.id} className="hover:bg-gray-50 transition">
                  <td className="py-4 px-4 font-mono text-gray-500">#{dept.id}</td>
                  <td className="py-4 px-4 font-bold text-gray-900">{dept.name}</td>
                  <td className="py-4 px-4 font-mono font-bold text-indigo-700">{dept.code}</td>
                  <td className="py-4 px-4 font-semibold text-gray-700">{dept.student_count || 0}</td>
                  <td className="py-4 px-4 text-right">
                    <button
                      onClick={() => handleDelete(dept.id)}
                      className="p-1.5 text-gray-400 hover:text-rose-600 transition"
                      title="Delete Department"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AdminDepartments;
