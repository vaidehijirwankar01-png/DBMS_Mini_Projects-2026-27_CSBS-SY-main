import React, { useState } from 'react';
import api from '../api';

const CompanyDashboard = () => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const handlePostJob = async (e) => {
    e.preventDefault();
    try {
      await api.post('/jobs', { title, description });
      alert('Job posted successfully!');
      setTitle('');
      setDescription('');
    } catch (err) {
      alert('Failed to post job');
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Company Dashboard</h1>
      <div className="bg-white p-6 rounded shadow border max-w-lg">
        <h2 className="text-xl font-semibold mb-4">Post a New Job</h2>
        <form onSubmit={handlePostJob} className="space-y-4">
          <input 
            type="text" 
            placeholder="Job Title" 
            className="w-full border p-2 rounded" 
            value={title} 
            onChange={e => setTitle(e.target.value)} 
            required 
          />
          <textarea 
            placeholder="Job Description" 
            className="w-full border p-2 rounded h-32" 
            value={description} 
            onChange={e => setDescription(e.target.value)} 
            required
          ></textarea>
          <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">Post Job</button>
        </form>
      </div>
    </div>
  );
};

export default CompanyDashboard;
