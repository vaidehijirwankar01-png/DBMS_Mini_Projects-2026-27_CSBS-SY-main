import React, { useEffect, useState } from 'react';
import api from '../../api';
import { useAuth } from '../../context/AuthContext';
import { Building2, Save, CheckCircle, AlertCircle } from 'lucide-react';

const CompanyProfile = () => {
  const { user, refreshUser } = useAuth();
  const [formData, setFormData] = useState({
    company_name: '',
    industry: '',
    website: '',
    location: '',
    contact_email: '',
    phone: '',
    description: '',
    approval_status: 'pending'
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const loadProfile = async () => {
      try {
        setLoading(true);
        const res = await api.get('/companies/profile');
        const c = res.data;
        setFormData({
          company_name: c.company_name || user?.name || '',
          industry: c.industry || 'Technology',
          website: c.website || '',
          location: c.location || '',
          contact_email: c.contact_email || user?.email || '',
          phone: c.phone || '',
          description: c.description || '',
          approval_status: c.approval_status || 'pending'
        });
      } catch (err) {
        console.error('Failed to load company profile:', err);
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
      await api.put('/companies/profile', formData);
      setMessage('Company profile updated successfully!');
      refreshUser();
    } catch (err) {
      console.error('Error saving profile:', err);
      setError(err.response?.data?.message || 'Failed to update company profile');
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
        <div className="bg-purple-900 text-white px-6 py-6 sm:px-8 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-purple-700 rounded-xl">
              <Building2 className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Company Profile</h1>
              <p className="text-xs text-purple-200 mt-0.5">Manage your corporate credentials and recruitment contact</p>
            </div>
          </div>
          <span className={`text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider ${
            formData.approval_status === 'approved' ? 'bg-green-400 text-green-950' :
            formData.approval_status === 'rejected' ? 'bg-red-400 text-red-950' : 'bg-amber-400 text-amber-950'
          }`}>
            {formData.approval_status}
          </span>
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Company Name *</label>
                <input
                  type="text"
                  name="company_name"
                  value={formData.company_name}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Industry Domain</label>
                <input
                  type="text"
                  name="industry"
                  value={formData.industry}
                  onChange={handleChange}
                  placeholder="Software, Finance, Manufacturing..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Corporate Website</label>
                <input
                  type="text"
                  name="website"
                  value={formData.website}
                  onChange={handleChange}
                  placeholder="www.company.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Headquarters / Location</label>
                <input
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  placeholder="Bangalore, Hyderabad, Remote"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Contact Email</label>
                <input
                  type="email"
                  name="contact_email"
                  value={formData.contact_email}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Contact Phone</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="9876543210"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Company Description & Overview</label>
              <textarea
                rows="4"
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Brief summary of company culture, products, and vision..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              ></textarea>
            </div>

            <div className="pt-4 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2.5 bg-purple-700 hover:bg-purple-800 text-white text-sm font-semibold rounded-lg shadow-sm transition flex items-center space-x-2 disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                <span>{saving ? 'Saving...' : 'Save Company Details'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CompanyProfile;
