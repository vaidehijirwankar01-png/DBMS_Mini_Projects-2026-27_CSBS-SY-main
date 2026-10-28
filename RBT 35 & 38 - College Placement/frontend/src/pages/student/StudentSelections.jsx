import React, { useEffect, useState } from 'react';
import api from '../../api';
import { Award, CheckCircle2, Calendar, Building2, Briefcase, ExternalLink } from 'lucide-react';

const StudentSelections = () => {
  const [selections, setSelections] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSelections = async () => {
      try {
        setLoading(true);
        const res = await api.get('/students/selections');
        setSelections(res.data);
      } catch (err) {
        console.error('Failed to load selections:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchSelections();
  }, []);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="text-center max-w-xl mx-auto mb-10">
        <h1 className="text-3xl font-extrabold text-gray-900">Placement Offer & Selection Status</h1>
        <p className="mt-2 text-sm text-gray-600">Official confirmation of your campus recruitment selections</p>
      </div>

      {loading ? (
        <div className="text-center py-16">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="text-gray-500 text-sm mt-3">Loading selection results...</p>
        </div>
      ) : selections.length > 0 ? (
        <div className="space-y-6">
          {selections.map((sel) => (
            <div
              key={sel.id}
              className="bg-gradient-to-br from-emerald-50 via-white to-green-50 rounded-2xl border-2 border-emerald-400 p-6 sm:p-8 shadow-lg relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 bg-emerald-600 text-white text-xs font-bold px-4 py-1.5 rounded-bl-xl uppercase tracking-wider">
                Official Placement Offer
              </div>

              <div className="flex items-start space-x-4 mb-6">
                <div className="p-3 bg-emerald-100 text-emerald-700 rounded-xl">
                  <Award className="h-8 w-8" />
                </div>
                <div>
                  <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">Congratulations!</span>
                  <h2 className="text-2xl font-black text-gray-900 mt-0.5">{sel.job_title}</h2>
                  <div className="flex items-center space-x-2 text-gray-600 text-sm mt-1">
                    <Building2 className="h-4 w-4 text-gray-400" />
                    <span className="font-semibold">{sel.company_name}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-white/80 p-4 rounded-xl border border-emerald-200 mb-6">
                <div>
                  <div className="text-xs text-gray-500 uppercase font-semibold">Compensation Package</div>
                  <div className="text-2xl font-black text-emerald-700 mt-0.5">₹{sel.package} LPA</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 uppercase font-semibold">Expected Joining Date</div>
                  <div className="text-sm font-bold text-gray-800 mt-1">
                    {sel.joining_date ? new Date(sel.joining_date).toLocaleDateString() : 'To be announced'}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 uppercase font-semibold">Selection Result</div>
                  <div className="text-sm font-bold text-emerald-600 mt-1 flex items-center space-x-1">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Hired & Selected</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-gray-500 pt-3 border-t border-emerald-100">
                <span>Offer recorded on: {new Date(sel.created_at).toLocaleDateString()}</span>
                {sel.website && (
                  <a
                    href={sel.website.startsWith('http') ? sel.website : `https://${sel.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-700 font-semibold hover:underline flex items-center space-x-1"
                  >
                    <span>Visit Company Website</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white p-12 text-center rounded-2xl border border-gray-200 shadow-sm">
          <Award className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-gray-900">No Final Selections Yet</h3>
          <p className="text-gray-500 text-sm mt-1 max-w-md mx-auto">
            You do not currently have any final selection offers recorded in the database. Apply to more placement drives and track your shortlist and interview rounds.
          </p>
        </div>
      )}
    </div>
  );
};

export default StudentSelections;
