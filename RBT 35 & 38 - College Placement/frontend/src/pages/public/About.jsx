import React from 'react';
import { Shield, BookOpen, Target, Phone, Mail, MapPin } from 'lucide-react';

const About = () => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center max-w-3xl mx-auto mb-12">
        <h1 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">Training & Placement Cell</h1>
        <p className="mt-4 text-lg text-gray-600">
          Bridging the gap between academic brilliance and industry excellence through transparent, rigorous placement procedures.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <Target className="h-8 w-8 text-indigo-600 mb-3" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">Our Mission</h3>
          <p className="text-gray-600 text-sm leading-relaxed">
            To provide 100% placement assistance, impart industry-aligned skill enhancements, and facilitate seamless recruiter engagements.
          </p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <Shield className="h-8 w-8 text-green-600 mb-3" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">Placement Policy</h3>
          <p className="text-gray-600 text-sm leading-relaxed">
            A single offer policy is strictly maintained. All eligibility metrics (CGPA, backlogs, branch codes) are validated in real-time through the database.
          </p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <BookOpen className="h-8 w-8 text-blue-600 mb-3" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">Training Programs</h3>
          <p className="text-gray-600 text-sm leading-relaxed">
            Pre-placement training includes mock interviews, coding bootcamps, resume vetting, and industry guest lectures.
          </p>
        </div>
      </div>

      <div className="bg-indigo-900 text-white rounded-2xl p-8 sm:p-12 shadow-md">
        <h2 className="text-2xl font-bold mb-6">Contact Placement Office</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="flex items-center space-x-3">
            <MapPin className="h-6 w-6 text-indigo-400" />
            <div>
              <div className="text-sm font-semibold">Location</div>
              <div className="text-xs text-indigo-200">Placement Block, Campus Center</div>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <Mail className="h-6 w-6 text-indigo-400" />
            <div>
              <div className="text-sm font-semibold">Email</div>
              <div className="text-xs text-indigo-200">placements@college.edu</div>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <Phone className="h-6 w-6 text-indigo-400" />
            <div>
              <div className="text-sm font-semibold">Helpline</div>
              <div className="text-xs text-indigo-200">+91 (0) 80 2345 6789</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default About;
