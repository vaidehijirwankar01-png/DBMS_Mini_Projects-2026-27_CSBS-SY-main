import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api';
import { Search, Briefcase, MapPin, Calendar, Award } from 'lucide-react';

const PublicDrives = () => {
  const [drives, setDrives] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const fetchDrives = async () => {
    try {
      setLoading(true);
      let url = `/drives?`;
      if (searchTerm) url += `search=${encodeURIComponent(searchTerm)}&`;
      if (statusFilter) url += `status=${encodeURIComponent(statusFilter)}&`;
      const res = await api.get(url);
      setDrives(res.data);
    } catch (err) {
      console.error('Error fetching drives:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDrives();
  }, [statusFilter]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchDrives();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 pb-4 border-b border-gray-200">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900">Campus Placement Drives</h1>
          <p className="text-gray-600 text-sm mt-1">Explore current and upcoming opportunities from verified recruiters</p>
        </div>
        <Link
          to="/login"
          className="mt-4 sm:mt-0 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
        >
          Login to Apply
        </Link>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm mb-8 flex flex-col sm:flex-row gap-4">
        <form onSubmit={handleSearch} className="flex-1 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by job title, company, or branch..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition"
          >
            Search
          </button>
        </form>

        <div className="flex items-center space-x-2">
          <label className="text-sm font-medium text-gray-700">Status:</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="upcoming">Upcoming</option>
            <option value="completed">Completed</option>
          </select>
        </div>
      </div>

      {/* Drives Grid */}
      {loading ? (
        <div className="text-center py-16">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="text-gray-500 text-sm mt-3">Loading placement drives...</p>
        </div>
      ) : drives.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {drives.map((drive) => (
            <div key={drive.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 hover:shadow-md transition flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start mb-3">
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                    drive.status === 'active' ? 'bg-green-100 text-green-800' :
                    drive.status === 'upcoming' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {drive.status}
                  </span>
                  <div className="text-lg font-extrabold text-indigo-700">₹{drive.package} LPA</div>
                </div>

                <h3 className="text-xl font-bold text-gray-900">{drive.job_title}</h3>
                <p className="text-sm font-medium text-gray-600 mb-4">{drive.company_name} • <span className="text-gray-500">{drive.industry}</span></p>

                <div className="space-y-2 text-sm text-gray-600 mb-6 bg-gray-50 p-3 rounded-lg border border-gray-100">
                  <div className="flex items-center space-x-2">
                    <MapPin className="h-4 w-4 text-gray-400" />
                    <span>Location: {drive.location}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Award className="h-4 w-4 text-gray-400" />
                    <span>Min CGPA: <strong>{drive.minimum_cgpa}</strong> | Max Backlogs: <strong>{drive.maximum_backlogs}</strong></span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <span>Drive Date: {new Date(drive.drive_date).toLocaleDateString()}</span>
                  </div>
                  <div className="text-xs text-indigo-600 font-medium pt-1">
                    Eligible: {drive.eligible_branches} ({drive.graduation_year})
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
                <span className="text-xs text-gray-500">
                  Deadline: {new Date(drive.application_deadline).toLocaleDateString()}
                </span>
                <Link
                  to="/login"
                  className="px-3.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-md transition"
                >
                  Apply & Details &rarr;
                </Link>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white p-12 text-center rounded-xl border border-gray-200">
          <Briefcase className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-gray-900">No drives match your criteria</h3>
          <p className="text-gray-500 text-sm mt-1">Try resetting the search filters or check back later.</p>
        </div>
      )}
    </div>
  );
};

export default PublicDrives;
