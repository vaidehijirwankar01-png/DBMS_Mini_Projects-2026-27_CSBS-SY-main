import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import RegisterStudent from './RegisterStudent';
import RegisterCompany from './RegisterCompany';
import { GraduationCap, Building2 } from 'lucide-react';

const Register = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialRole = searchParams.get('role') === 'company' ? 'company' : 'student';
  const [activeTab, setActiveTab] = useState(initialRole);

  useEffect(() => {
    const roleParam = searchParams.get('role');
    if (roleParam === 'company' || roleParam === 'student') {
      setActiveTab(roleParam);
    }
  }, [searchParams]);

  const handleTabChange = (role) => {
    setActiveTab(role);
    setSearchParams({ role });
  };

  return (
    <div className="bg-transparent min-h-[calc(100vh-4rem)]">
      {/* Top Role Switcher Bar */}
      <div className="max-w-md mx-auto pt-6 px-4">
        <div className="flex p-1.5 bg-slate-800/90 border border-slate-700/80 rounded-2xl shadow-lg backdrop-blur-md">
          <button
            type="button"
            onClick={() => handleTabChange('student')}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center space-x-2 transition ${
              activeTab === 'student'
                ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <GraduationCap className="h-4 w-4" />
            <span>Student Registration</span>
          </button>
          
          <button
            type="button"
            onClick={() => handleTabChange('company')}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center space-x-2 transition ${
              activeTab === 'company'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Building2 className="h-4 w-4" />
            <span>Company Sign Up</span>
          </button>
        </div>
      </div>

      {/* Render Active Registration Form */}
      <div>
        {activeTab === 'student' ? <RegisterStudent /> : <RegisterCompany />}
      </div>
    </div>
  );
};

export default Register;
