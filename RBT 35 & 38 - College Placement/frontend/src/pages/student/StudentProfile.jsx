import React, { useEffect, useState } from 'react';
import api from '../../api';
import { useAuth } from '../../context/AuthContext';
import { User, GraduationCap, CheckCircle, AlertCircle, Save } from 'lucide-react';

const StudentProfile = () => {
  const { user, refreshUser } = useAuth();
  const [departments, setDepartments] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    enrollment_number: '',
    phone: '',
    department_id: '',
    graduation_year: '',
    cgpa: '',
    backlogs: '',
    resume_url: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const loadProfile = async () => {
      try {
        setLoading(true);
        const [profRes, deptRes] = await Promise.all([
          api.get('/students/profile'),
          api.get('/departments')
        ]);
        setDepartments(deptRes.data);
        const p = profRes.data;
        setFormData({
          name: p.name || user?.name || '',
          email: p.email || user?.email || '',
          enrollment_number: p.enrollment_number || '',
          phone: p.phone || '',
          department_id: p.department_id || (deptRes.data[0]?.id || ''),
          graduation_year: p.graduation_year || '2024',
          cgpa: p.cgpa || '',
          backlogs: p.backlogs || 0,
          resume_url: p.resume_url || ''
        });
      } catch (err) {
        console.error('Error loading profile:', err);
      } finally {
        setLoading(false);
      }
    };
    loadProfile();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    setError('');

    try {
      await api.put('/students/profile', formData);
      setMessage('Profile updated successfully!');
      refreshUser();
    } catch (err) {
      console.error('Error saving profile:', err);
      setError(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-md overflow-hidden">
        <div className="bg-indigo-900 text-white px-6 py-6 sm:px-8 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-indigo-700 rounded-xl">
              <User className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Academic Profile</h1>
              <p className="text-xs text-indigo-200 mt-0.5">Manage your placement eligibility and academic credentials</p>
            </div>
          </div>
        </div>

        <div className="p-6 sm:p-8">
          {message && (
            <div className="p-3 mb-6 bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 flex-shrink-0" />
              <span>{message}</span>
            </div>
          )}

          {error && (
            <div className="p-3 mb-6 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg flex items-center space-x-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Info */}
            <div>
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 border-b pb-2">
                Personal Information
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    value={formData.email}
                    disabled
                    className="w-full px-3 py-2 border border-gray-200 bg-gray-100 rounded-lg text-sm text-gray-500 cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="9876543210"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Resume Link (PDF URL)</label>
                  <input
                    type="url"
                    name="resume_url"
                    value={formData.resume_url}
                    onChange={handleChange}
                    placeholder="https://drive.google.com/your-resume.pdf"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Academic Info */}
            <div>
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 border-b pb-2">
                Academic & Placement Credentials (Used in Eligibility Checking)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Enrollment Number</label>
                  <input
                    type="text"
                    name="enrollment_number"
                    value={formData.enrollment_number}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Department</label>
                  <select
                    name="department_id"
                    value={formData.department_id}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Graduation Year</label>
                  <input
                    type="number"
                    name="graduation_year"
                    value={formData.graduation_year}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Cumulative CGPA (Scale 10)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="10"
                    name="cgpa"
                    value={formData.cgpa}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Active Backlogs</label>
                  <input
                    type="number"
                    min="0"
                    name="backlogs"
                    value={formData.backlogs}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg shadow-sm transition flex items-center space-x-2 disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                <span>{saving ? 'Saving...' : 'Save Profile Changes'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default StudentProfile;
