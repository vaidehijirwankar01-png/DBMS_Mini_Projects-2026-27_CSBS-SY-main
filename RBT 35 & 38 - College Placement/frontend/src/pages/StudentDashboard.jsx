import React, { useEffect, useState } from 'react';
import api from '../api';

const StudentDashboard = () => {
  const [jobs, setJobs] = useState([]);

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const res = await api.get('/jobs');
        setJobs(res.data);
      } catch (err) {
        console.error('Failed to fetch jobs', err);
      }
    };
    fetchJobs();
  }, []);

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Student Dashboard</h1>
      <h2 className="text-xl font-semibold mb-4">Available Placements</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {jobs.length > 0 ? jobs.map((job) => (
          <div key={job._id || job.id} className="bg-white p-4 rounded shadow border">
            <h3 className="text-lg font-bold">{job.title}</h3>
            <p className="text-gray-600">{job.company}</p>
            <p className="mt-2 text-sm">{job.description}</p>
            <button className="mt-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm">Apply Now</button>
          </div>
        )) : <p className="text-gray-600">No jobs available at the moment.</p>}
      </div>
    </div>
  );
};

export default StudentDashboard;
