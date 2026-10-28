import React, { useEffect, useState } from 'react';
import api from '../../api';
import { Briefcase, Plus, Edit2, Trash2, Calendar, MapPin, Award, CheckCircle2, AlertCircle } from 'lucide-react';

const CompanyDrives = () => {
  const [drives, setDrives] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingDrive, setEditingDrive] = useState(null);
  const [formData, setFormData] = useState({
    job_title: '',
    job_description: '',
    package: '',
    location: '',
    minimum_cgpa: '7.0',
    maximum_backlogs: '0',
    eligible_branches: 'CSE,IT,ECE',
    graduation_year: '2024',
    application_deadline: '',
    drive_date: '',
    status: 'active'
  });
  const [notification, setNotification] = useState({ type: '', message: '' });

  const fetchDrives = async () => {
    try {
      setLoading(true);
      const res = await api.get('/companies/drives');
      setDrives(res.data);
    } catch (err) {
      console.error('Error fetching company drives:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDrives();
  }, []);

  const openCreateModal = () => {
    setEditingDrive(null);
    setFormData({
      job_title: '',
      job_description: '',
      package: '',
      location: 'Bangalore',
      minimum_cgpa: '7.5',
      maximum_backlogs: '0',
      eligible_branches: 'CSE,IT',
      graduation_year: '2024',
      application_deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
      drive_date: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
      status: 'active'
    });
    setShowModal(true);
  };

  const openEditModal = (drive) => {
    setEditingDrive(drive);
    setFormData({
      job_title: drive.job_title,
      job_description: drive.job_description,
      package: drive.package,
      location: drive.location,
      minimum_cgpa: drive.minimum_cgpa,
      maximum_backlogs: drive.maximum_backlogs,
      eligible_branches: drive.eligible_branches,
      graduation_year: drive.graduation_year,
      application_deadline: drive.application_deadline ? new Date(drive.application_deadline).toISOString().slice(0, 16) : '',
      drive_date: drive.drive_date ? new Date(drive.drive_date).toISOString().slice(0, 16) : '',
      status: drive.status
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingDrive) {
        await api.put(`/drives/${editingDrive.id}`, formData);
        setNotification({ type: 'success', message: 'Drive updated successfully!' });
      } else {
        await api.post('/drives', formData);
        setNotification({ type: 'success', message: 'Placement drive posted successfully!' });
      }
      setShowModal(false);
      fetchDrives();
    } catch (err) {
      console.error('Error saving drive:', err);
      setNotification({ type: 'error', message: err.response?.data?.message || 'Failed to save placement drive' });
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this placement drive?')) return;
    try {
      await api.delete(`/drives/${id}`);
      setNotification({ type: 'success', message: 'Drive deleted successfully.' });
      fetchDrives();
    } catch (err) {
      console.error('Error deleting drive:', err);
      setNotification({ type: 'error', message: 'Failed to delete drive' });
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 pb-4 border-b border-gray-200">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900">Manage Placement Drives</h1>
          <p className="text-gray-600 text-sm mt-1">Configure recruitment eligibility criteria and hiring schedules</p>
        </div>
        <button
          onClick={openCreateModal}
          className="mt-4 sm:mt-0 px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white text-xs font-semibold rounded-lg shadow-sm transition flex items-center space-x-1.5"
        >
          <Plus className="h-4 w-4" />
          <span>Create Placement Drive</span>
        </button>
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
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="text-gray-500 text-sm mt-3">Loading company drives...</p>
        </div>
      ) : drives.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {drives.map((drive) => (
            <div key={drive.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 flex flex-col justify-between hover:shadow-md transition">
              <div>
                <div className="flex justify-between items-start mb-2">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded uppercase ${
                    drive.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {drive.status}
                  </span>
                  <div className="text-lg font-black text-purple-700">₹{drive.package} LPA</div>
                </div>

                <h3 className="text-xl font-bold text-gray-900">{drive.job_title}</h3>
                <div className="flex items-center space-x-1 text-xs text-gray-500 mb-3">
                  <MapPin className="h-3.5 w-3.5" />
                  <span>{drive.location}</span>
                </div>

                <div className="space-y-1 text-xs text-gray-600 bg-gray-50 p-3 rounded-lg border border-gray-100 mb-4">
                  <div><strong>Min CGPA:</strong> {drive.minimum_cgpa}</div>
                  <div><strong>Max Backlogs:</strong> {drive.maximum_backlogs}</div>
                  <div><strong>Branches:</strong> {drive.eligible_branches}</div>
                  <div><strong>Grad Year:</strong> {drive.graduation_year}</div>
                  <div><strong>Drive Date:</strong> {new Date(drive.drive_date).toLocaleDateString()}</div>
                </div>

                {/* Candidate Stats */}
                <div className="grid grid-cols-3 gap-2 text-center text-xs py-2 bg-purple-50 rounded-lg text-purple-900 mb-4">
                  <div>
                    <div className="font-bold text-base">{drive.total_applicants || 0}</div>
                    <div className="text-[10px] uppercase font-semibold text-purple-700">Applicants</div>
                  </div>
                  <div>
                    <div className="font-bold text-base">{drive.shortlisted_count || 0}</div>
                    <div className="text-[10px] uppercase font-semibold text-purple-700">Shortlisted</div>
                  </div>
                  <div>
                    <div className="font-bold text-base">{drive.selected_count || 0}</div>
                    <div className="text-[10px] uppercase font-semibold text-purple-700">Selected</div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-gray-100">
                <button
                  onClick={() => openEditModal(drive)}
                  className="p-1.5 text-gray-600 hover:text-indigo-600 hover:bg-gray-100 rounded transition"
                  title="Edit Drive"
                >
                  <Edit2 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDelete(drive.id)}
                  className="p-1.5 text-gray-600 hover:text-rose-600 hover:bg-gray-100 rounded transition"
                  title="Delete Drive"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white p-12 text-center rounded-xl border border-gray-200">
          <Briefcase className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-gray-900">No drives posted yet</h3>
          <p className="text-gray-500 text-sm mt-1">Start by clicking "Create Placement Drive".</p>
        </div>
      )}

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b">
              {editingDrive ? 'Edit Placement Drive' : 'Create New Placement Drive'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Job Title *</label>
                  <input
                    type="text"
                    required
                    value={formData.job_title}
                    onChange={(e) => setFormData({ ...formData, job_title: e.target.value })}
                    placeholder="Software Engineer, Data Analyst..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Annual Package (LPA in ₹) *</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={formData.package}
                    onChange={(e) => setFormData({ ...formData, package: e.target.value })}
                    placeholder="12.0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Job Description *</label>
                <textarea
                  rows="3"
                  required
                  value={formData.job_description}
                  onChange={(e) => setFormData({ ...formData, job_description: e.target.value })}
                  placeholder="Outline responsibilities, required skills, and role expectations..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none"
                ></textarea>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Location</label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="Bangalore, Pune, Remote"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Eligible Branches (comma separated) *</label>
                  <input
                    type="text"
                    required
                    value={formData.eligible_branches}
                    onChange={(e) => setFormData({ ...formData, eligible_branches: e.target.value })}
                    placeholder="CSE,IT,ECE or ALL"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Minimum CGPA *</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="10"
                    required
                    value={formData.minimum_cgpa}
                    onChange={(e) => setFormData({ ...formData, minimum_cgpa: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Max Allowed Backlogs *</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formData.maximum_backlogs}
                    onChange={(e) => setFormData({ ...formData, maximum_backlogs: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Graduation Year *</label>
                  <input
                    type="number"
                    required
                    value={formData.graduation_year}
                    onChange={(e) => setFormData({ ...formData, graduation_year: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Application Deadline</label>
                  <input
                    type="datetime-local"
                    value={formData.application_deadline}
                    onChange={(e) => setFormData({ ...formData, application_deadline: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Drive Date</label>
                  <input
                    type="datetime-local"
                    value={formData.drive_date}
                    onChange={(e) => setFormData({ ...formData, drive_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Drive Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  >
                    <option value="active">Active</option>
                    <option value="upcoming">Upcoming</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 flex justify-end space-x-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-purple-700 hover:bg-purple-800 text-white text-xs font-semibold rounded-lg shadow-sm"
                >
                  {editingDrive ? 'Update Drive' : 'Publish Drive'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompanyDrives;
