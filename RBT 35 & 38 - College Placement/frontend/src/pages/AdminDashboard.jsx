import React from 'react';

const AdminDashboard = () => {
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded shadow border">
          <h2 className="text-xl font-semibold mb-4">Manage Students</h2>
          <p className="text-gray-600 mb-4">View and approve student profiles.</p>
          <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">View Students</button>
        </div>
        <div className="bg-white p-6 rounded shadow border">
          <h2 className="text-xl font-semibold mb-4">Manage Companies</h2>
          <p className="text-gray-600 mb-4">Approve company registrations and job postings.</p>
          <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">View Companies</button>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
