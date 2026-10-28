import React, { useEffect, useState } from 'react';
import api from '../../api';
import { BarChart3, Building2, Calendar, Printer } from 'lucide-react';

const AdminReports = () => {
  const [reports, setReports] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReports = async () => {
      try {
        setLoading(true);
        const res = await api.get('/admin/reports');
        setReports(res.data);
      } catch (err) {
        console.error('Failed to load reports:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchReports();
  }, []);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-rose-600"></div>
      </div>
    );
  }

  const companyReport = reports?.companyReport || [];
  const yearlyReport = reports?.yearlyReport || [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 pb-4 border-b border-gray-200">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900">Placement Analytics & DBMS Reports</h1>
          <p className="text-gray-600 text-sm mt-1">Multi-table SQL aggregations (COUNT, AVG, MAX, GROUP BY, HAVING)</p>
        </div>
        <button
          onClick={handlePrint}
          className="mt-4 sm:mt-0 px-4 py-2 bg-gray-800 hover:bg-gray-900 text-white text-xs font-semibold rounded-lg shadow-sm transition flex items-center space-x-1.5"
        >
          <Printer className="h-4 w-4" />
          <span>Print / Export Report</span>
        </button>
      </div>

      {/* Report 1: Company Hiring Performance */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-10">
        <div className="flex items-center space-x-3 mb-4">
          <div className="p-2 bg-purple-100 text-purple-700 rounded-lg">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">Recruiter Campus Engagement & Hiring Performance</h2>
            <p className="text-xs text-gray-500">Evaluates companies by total drives conducted, applicant pool, and average package</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
            <thead className="bg-gray-50 text-gray-500 uppercase text-xs tracking-wider">
              <tr>
                <th className="py-3 px-4 font-semibold">Company Name</th>
                <th className="py-3 px-4 font-semibold">Industry</th>
                <th className="py-3 px-4 font-semibold">Drives Conducted</th>
                <th className="py-3 px-4 font-semibold">Total Applicants</th>
                <th className="py-3 px-4 font-semibold">Offers Extended</th>
                <th className="py-3 px-4 font-semibold">Average Package (SQL AVG)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {companyReport.map((c, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="py-3 px-4 font-bold text-gray-900">{c.company_name}</td>
                  <td className="py-3 px-4 text-gray-600 text-xs">{c.industry}</td>
                  <td className="py-3 px-4 font-semibold text-gray-700">{c.drives_conducted}</td>
                  <td className="py-3 px-4 text-gray-600">{c.total_applicants}</td>
                  <td className="py-3 px-4 font-bold text-emerald-600">{c.students_hired}</td>
                  <td className="py-3 px-4 font-bold text-indigo-700">
                    ₹{Number(c.avg_package_offered).toFixed(2)} LPA
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Report 2: Cohort / Graduation Year Placement Summary */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="flex items-center space-x-3 mb-4">
          <div className="p-2 bg-blue-100 text-blue-700 rounded-lg">
            <Calendar className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">Graduation Batch Placement Summary</h2>
            <p className="text-xs text-gray-500">Aggregated batch placement success rate and package distributions</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
            <thead className="bg-gray-50 text-gray-500 uppercase text-xs tracking-wider">
              <tr>
                <th className="py-3 px-4 font-semibold">Graduation Batch</th>
                <th className="py-3 px-4 font-semibold">Registered Candidates</th>
                <th className="py-3 px-4 font-semibold">Placed Candidates</th>
                <th className="py-3 px-4 font-semibold">Placement Rate</th>
                <th className="py-3 px-4 font-semibold">Average Package</th>
                <th className="py-3 px-4 font-semibold">Highest Package (SQL MAX)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {yearlyReport.map((y, i) => {
                const rate = y.total_candidates > 0
                  ? ((y.placed_candidates / y.total_candidates) * 100).toFixed(1)
                  : 0;
                return (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="py-3 px-4 font-bold text-gray-900">Class of {y.graduation_year}</td>
                    <td className="py-3 px-4 text-gray-600">{y.total_candidates}</td>
                    <td className="py-3 px-4 font-bold text-emerald-600">{y.placed_candidates}</td>
                    <td className="py-3 px-4 font-bold text-gray-900">{rate}%</td>
                    <td className="py-3 px-4 font-semibold text-indigo-700">₹{Number(y.avg_package).toFixed(2)} LPA</td>
                    <td className="py-3 px-4 font-bold text-rose-700">₹{Number(y.highest_package).toFixed(2)} LPA</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminReports;
