import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api';
import { Briefcase, Building2, Users, Award, CheckCircle2, ArrowRight, Sparkles, ShieldCheck, Database } from 'lucide-react';

const Home = () => {
  const [drives, setDrives] = useState([]);
  const [companies, setCompanies] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [drivesRes, companiesRes] = await Promise.all([
          api.get('/drives?status=active'),
          api.get('/companies')
        ]);
        setDrives(drivesRes.data.slice(0, 4));
        setCompanies(companiesRes.data.slice(0, 6));
      } catch (err) {
        console.error('Error loading public data:', err);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="min-h-screen bg-transparent text-slate-100 relative overflow-hidden bg-grid-pattern">
      {/* Floating 3D Background Elements */}
      <div className="absolute top-12 left-10 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none animate-pulse-glow" />
      <div className="absolute top-80 right-10 w-[30rem] h-[30rem] bg-blue-600/10 rounded-full blur-3xl pointer-events-none animate-float-reverse" />
      <div className="absolute bottom-20 left-1/3 w-80 h-80 bg-violet-600/10 rounded-full blur-3xl pointer-events-none animate-float-slow" />

      {/* Hero Section */}
      <section className="relative pt-20 pb-24 px-4 sm:px-6 lg:px-8 border-b border-slate-800/80">
        <div className="max-w-5xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center space-x-2 bg-indigo-500/10 text-indigo-300 text-xs font-semibold px-4 py-1.5 rounded-full mb-6 border border-indigo-500/30 backdrop-blur-md animate-slide-up">
            <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
            <span>DBMS Relational Campus Placement Engine</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white mb-6 leading-tight">
            Connecting Ambitious Students with <br className="hidden sm:inline" />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-blue-400 to-teal-300">
              World-Class Opportunities
            </span>
          </h1>

          <p className="max-w-2xl mx-auto text-base sm:text-lg text-slate-300 mb-10 leading-relaxed">
            A comprehensive, normalized relational database platform managing the end-to-end recruitment lifecycle with automated eligibility validation, interview tracking, and transparent placement metrics.
          </p>

          <div className="flex flex-wrap justify-center gap-4">
            <Link
              to="/login"
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-7 py-3.5 rounded-xl shadow-lg shadow-indigo-600/25 transition-all duration-200 flex items-center space-x-2 card-3d"
            >
              <span>Student Portal</span>
              <ArrowRight className="h-4 w-4" />
            </Link>

            <Link
              to="/register/student"
              className="bg-slate-800/80 hover:bg-slate-800 text-slate-200 hover:text-white font-semibold px-6 py-3.5 rounded-xl border border-slate-700/80 transition-all duration-200 card-3d"
            >
              Register as Student
            </Link>

            <Link
              to="/register/company"
              className="bg-gradient-to-r from-purple-600/80 to-indigo-600/80 hover:from-purple-600 hover:to-indigo-600 text-white font-semibold px-6 py-3.5 rounded-xl border border-purple-500/30 transition-all duration-200 card-3d"
            >
              Recruiter Sign Up
            </Link>

            <Link
              to="/public/drives"
              className="bg-slate-900/60 hover:bg-slate-800 text-indigo-300 hover:text-indigo-200 font-semibold px-6 py-3.5 rounded-xl border border-indigo-500/30 transition-all duration-200"
            >
              Browse Drives
            </Link>
          </div>
        </div>
      </section>

      {/* Feature Highlights Grid */}
      <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-extrabold text-white tracking-tight">Engineered for Academic Excellence & Industry Precision</h2>
          <p className="mt-3 text-slate-400 max-w-xl mx-auto text-sm sm:text-base">
            Built atop a 3NF normalized MySQL database with strict foreign keys, atomic transactions, and role-based access control.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-slate-800/70 border border-slate-700/60 backdrop-blur-xl p-7 rounded-2xl shadow-xl card-3d flex flex-col justify-between">
            <div>
              <div className="h-12 w-12 bg-indigo-500/20 border border-indigo-500/40 text-indigo-400 rounded-xl flex items-center justify-center mb-5">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Automated Eligibility Engine</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Dynamically evaluates candidate CGPA, maximum backlogs, department matching, and graduation year against drive constraints in real-time.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-700/50 flex items-center text-xs text-indigo-400 font-medium">
              <span>Zero-error application gatekeeping</span>
            </div>
          </div>

          <div className="bg-slate-800/70 border border-slate-700/60 backdrop-blur-xl p-7 rounded-2xl shadow-xl card-3d flex flex-col justify-between">
            <div>
              <div className="h-12 w-12 bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 rounded-xl flex items-center justify-center mb-5">
                <Briefcase className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Complete Recruitment Lifecycle</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Streamlines student progression from Applied, Shortlisted, Interview to Final Selection with instant status updates and offer tracking.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-700/50 flex items-center text-xs text-emerald-400 font-medium">
              <span>Transparent multi-round evaluations</span>
            </div>
          </div>

          <div className="bg-slate-800/70 border border-slate-700/60 backdrop-blur-xl p-7 rounded-2xl shadow-xl card-3d flex flex-col justify-between">
            <div>
              <div className="h-12 w-12 bg-blue-500/20 border border-blue-500/40 text-blue-400 rounded-xl flex items-center justify-center mb-5">
                <Database className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Live SQL Aggregations</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                High-performance dashboard metrics generated directly through relational SQL joins, aggregations, and placement rate computations.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-700/50 flex items-center text-xs text-blue-400 font-medium">
              <span>Pure DBMS architectural standard</span>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Placement Drives */}
      <section className="py-16 bg-slate-950/60 border-t border-slate-800/80 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-10 gap-4">
            <div>
              <h2 className="text-2xl font-bold text-white">Active Placement Drives</h2>
              <p className="text-slate-400 text-sm mt-1">Opportunities currently accepting applications</p>
            </div>
            <Link to="/public/drives" className="text-indigo-400 hover:text-indigo-300 text-sm font-semibold flex items-center space-x-1.5 transition">
              <span>View All Drives</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {drives.length > 0 ? (
              drives.map((drive) => (
                <div key={drive.id} className="bg-slate-800/70 border border-slate-700/60 rounded-xl p-5 shadow-lg flex flex-col justify-between card-3d hover:border-indigo-500/50 transition">
                  <div>
                    <div className="flex justify-between items-start mb-3">
                      <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase tracking-wide">
                        {drive.status}
                      </span>
                      <span className="text-sm font-bold text-indigo-300">₹{drive.package} LPA</span>
                    </div>
                    <h3 className="font-bold text-white text-lg line-clamp-1">{drive.job_title}</h3>
                    <p className="text-sm text-slate-400 mb-4">{drive.company_name}</p>
                    <div className="text-xs text-slate-400 space-y-1.5 mb-5 border-t border-slate-700/50 pt-3">
                      <div className="flex items-center space-x-1.5">
                        <span className="text-slate-500">📍</span>
                        <span>{drive.location}</span>
                      </div>
                      <div className="flex items-center space-x-1.5">
                        <span className="text-slate-500">🎓</span>
                        <span>Min CGPA: <strong className="text-slate-200">{drive.minimum_cgpa}</strong></span>
                      </div>
                      <div className="flex items-center space-x-1.5">
                        <span className="text-slate-500">🎯</span>
                        <span className="line-clamp-1">Branches: {drive.eligible_branches}</span>
                      </div>
                    </div>
                  </div>
                  <Link
                    to="/login"
                    className="w-full text-center py-2.5 bg-indigo-600/30 hover:bg-indigo-600 text-indigo-300 hover:text-white text-xs font-bold rounded-lg border border-indigo-500/30 transition duration-150"
                  >
                    Login to Apply
                  </Link>
                </div>
              ))
            ) : (
              <div className="col-span-full py-12 text-center text-slate-500 text-sm">
                No active placement drives found at this moment.
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Esteemed Recruiting Partners */}
      <section className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-10">
          <h2 className="text-2xl font-bold text-white">Our Esteemed Recruiting Partners</h2>
          <p className="text-slate-400 text-sm mt-1">Leading organizations recruiting talent from our institute</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {companies.map((comp) => (
            <div key={comp.id} className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 text-center shadow card-3d hover:border-indigo-500/40 flex flex-col items-center justify-center transition">
              <div className="h-10 w-10 bg-indigo-500/10 text-indigo-400 rounded-lg flex items-center justify-center mb-2.5">
                <Building2 className="h-5 w-5" />
              </div>
              <div className="font-bold text-white text-sm line-clamp-1">{comp.company_name}</div>
              <div className="text-xs text-slate-400 mt-0.5 line-clamp-1">{comp.industry || 'Technology'}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default Home;
