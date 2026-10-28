import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ allowedRoles }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return (
      <div className="max-w-xl mx-auto mt-20 p-6 bg-red-50 border border-red-200 rounded-lg text-center">
        <h2 className="text-xl font-bold text-red-700">Access Denied</h2>
        <p className="text-gray-600 mt-2">You do not have permission to view this section.</p>
      </div>
    );
  }

  return <Outlet />;
};

export default ProtectedRoute;
