import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider } from './context/AuthContext';

// Public pages
import Home from './pages/public/Home';
import About from './pages/public/About';
import PublicDrives from './pages/public/PublicDrives';
import PublicCompanies from './pages/public/PublicCompanies';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import RegisterStudent from './pages/auth/RegisterStudent';
import RegisterCompany from './pages/auth/RegisterCompany';

// Student pages
import StudentDashboard from './pages/student/StudentDashboard';
import StudentProfile from './pages/student/StudentProfile';
import StudentDrives from './pages/student/StudentDrives';
import StudentApplications from './pages/student/StudentApplications';
import StudentSelections from './pages/student/StudentSelections';

// Company pages
import CompanyDashboard from './pages/company/CompanyDashboard';
import CompanyProfile from './pages/company/CompanyProfile';
import CompanyDrives from './pages/company/CompanyDrives';
import CompanyApplicants from './pages/company/CompanyApplicants';
import CompanySelections from './pages/company/CompanySelections';

// Admin pages
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminStudents from './pages/admin/AdminStudents';
import AdminCompanies from './pages/admin/AdminCompanies';
import AdminDrives from './pages/admin/AdminDrives';
import AdminApplications from './pages/admin/AdminApplications';
import AdminSelections from './pages/admin/AdminSelections';
import AdminDepartments from './pages/admin/AdminDepartments';
import AdminReports from './pages/admin/AdminReports';

import SidebarLayout from './components/SidebarLayout';
import { Toaster } from 'react-hot-toast';

const Background3D = React.lazy(() => import('./components/Background3D'));

function App() {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-[#0F172A] text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white relative">
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: 'rgba(15, 23, 42, 0.9)',
              color: '#f8fafc',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              backdropFilter: 'blur(16px)',
              borderRadius: '0.75rem',
              fontSize: '0.875rem',
            },
          }}
        />
        <React.Suspense fallback={null}>
          <Background3D />
        </React.Suspense>
        <Navbar />
        <main className="flex-1">
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Home />} />
            <Route path="/about" element={<About />} />
            <Route path="/public/drives" element={<PublicDrives />} />
            <Route path="/public/companies" element={<PublicCompanies />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/register/student" element={<RegisterStudent />} />
            <Route path="/register/company" element={<RegisterCompany />} />

            {/* Student Protected Routes */}
            <Route element={<ProtectedRoute allowedRoles={['student']} />}>
              <Route element={<SidebarLayout />}>
                <Route path="/student" element={<StudentDashboard />} />
                <Route path="/student/profile" element={<StudentProfile />} />
                <Route path="/student/drives" element={<StudentDrives />} />
                <Route path="/student/applications" element={<StudentApplications />} />
                <Route path="/student/selections" element={<StudentSelections />} />
              </Route>
            </Route>

            {/* Company Protected Routes */}
            <Route element={<ProtectedRoute allowedRoles={['company']} />}>
              <Route element={<SidebarLayout />}>
                <Route path="/company" element={<CompanyDashboard />} />
                <Route path="/company/profile" element={<CompanyProfile />} />
                <Route path="/company/drives" element={<CompanyDrives />} />
                <Route path="/company/applicants" element={<CompanyApplicants />} />
                <Route path="/company/selections" element={<CompanySelections />} />
              </Route>
            </Route>

            {/* Admin Protected Routes */}
            <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
              <Route element={<SidebarLayout />}>
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="/admin/students" element={<AdminStudents />} />
                <Route path="/admin/companies" element={<AdminCompanies />} />
                <Route path="/admin/drives" element={<AdminDrives />} />
                <Route path="/admin/applications" element={<AdminApplications />} />
                <Route path="/admin/selections" element={<AdminSelections />} />
                <Route path="/admin/departments" element={<AdminDepartments />} />
                <Route path="/admin/reports" element={<AdminReports />} />
              </Route>
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>

        <footer className="bg-slate-950 text-slate-400 py-8 px-4 text-center text-xs border-t border-slate-800/80">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-left">
              <span className="font-bold text-slate-200">CampusPlacement System</span>
              <p className="text-slate-500 mt-0.5">Automated Placement & Recruitment Lifecycle Management (DBMS)</p>
            </div>
            <div className="text-slate-500 text-xs">
              Powered by React • Vite • Tailwind • Node.js • Express • MySQL 8.0
            </div>
          </div>
        </footer>
      </div>
    </AuthProvider>
  );
}

export default App;
