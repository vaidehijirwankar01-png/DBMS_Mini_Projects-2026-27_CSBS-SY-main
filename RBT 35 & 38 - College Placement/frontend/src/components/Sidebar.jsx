import React from 'react';
import { Link } from 'react-router-dom';

const Sidebar = () => {
  return (
    <aside className="w-64 bg-gray-800 text-white min-h-screen p-4 hidden md:block">
      <h2 className="text-xl font-bold mb-6">Menu</h2>
      <ul className="space-y-4">
        <li>
          <Link to="/" className="hover:text-blue-400">Home</Link>
        </li>
        <li>
          <Link to="/student" className="hover:text-blue-400">Student Dashboard</Link>
        </li>
        <li>
          <Link to="/company" className="hover:text-blue-400">Company Dashboard</Link>
        </li>
        <li>
          <Link to="/admin" className="hover:text-blue-400">Admin Dashboard</Link>
        </li>
      </ul>
    </aside>
  );
};

export default Sidebar;
