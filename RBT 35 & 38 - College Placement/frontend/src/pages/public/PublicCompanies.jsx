import React, { useEffect, useState } from 'react';
import api from '../../api';
import { Building2, Globe, MapPin, Mail, Phone, ExternalLink } from 'lucide-react';

const PublicCompanies = () => {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        setLoading(true);
        const res = await api.get('/companies');
        setCompanies(res.data);
      } catch (err) {
        console.error('Failed to load companies:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchCompanies();
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="text-center max-w-3xl mx-auto mb-10">
        <h1 className="text-3xl font-extrabold text-gray-900">Partner Recruiting Companies</h1>
        <p className="mt-2 text-gray-600 text-sm">
          Organizations actively engaging with our college placement cell for campus hiring drives.
        </p>
      </div>

      {loading ? (
        <div className="text-center py-16">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="text-gray-500 text-sm mt-3">Loading companies...</p>
        </div>
      ) : companies.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {companies.map((company) => (
            <div key={company.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 hover:shadow-md transition">
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-3 bg-indigo-50 text-indigo-700 rounded-lg">
                  <Building2 className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-lg">{company.company_name}</h3>
                  <span className="inline-block bg-gray-100 text-gray-700 text-xs px-2 py-0.5 rounded font-medium">
                    {company.industry || 'Corporate'}
                  </span>
                </div>
              </div>

              <p className="text-sm text-gray-600 mb-4 line-clamp-3">
                {company.description || 'Verified campus recruitment partner.'}
              </p>

              <div className="space-y-2 text-xs text-gray-500 border-t border-gray-100 pt-3">
                {company.location && (
                  <div className="flex items-center space-x-2">
                    <MapPin className="h-3.5 w-3.5 text-gray-400" />
                    <span>{company.location}</span>
                  </div>
                )}
                {company.contact_email && (
                  <div className="flex items-center space-x-2">
                    <Mail className="h-3.5 w-3.5 text-gray-400" />
                    <span>{company.contact_email}</span>
                  </div>
                )}
                {company.website && (
                  <div className="flex items-center space-x-2">
                    <Globe className="h-3.5 w-3.5 text-gray-400" />
                    <a
                      href={company.website.startsWith('http') ? company.website : `https://${company.website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-600 hover:underline flex items-center space-x-1"
                    >
                      <span>{company.website}</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white p-12 text-center rounded-xl border border-gray-200">
          <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-gray-900">No companies listed yet</h3>
        </div>
      )}
    </div>
  );
};

export default PublicCompanies;
