import React, { useState, useEffect } from 'react';
import { 
  Truck, 
  Plus, 
  Plane, 
  Train, 
  Ship, 
  Phone, 
  Mail, 
  Star, 
  Trash2, 
  Edit, 
  RefreshCw,
  AlertCircle,
  X
} from 'lucide-react';
import api from '../api/client';
import Modal from '../components/Modal';
import Badge from '../components/Badge';

export default function Carriers() {
  const [carriers, setCarriers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [formData, setFormData] = useState({
    company_name: '',
    transport_type: 'Road',
    rating: '4.5',
    contacts: [{ contact: '', contact_type: 'Phone' }]
  });

  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchCarriers = async () => {
    setLoading(true);
    try {
      const res = await api.get('/carriers');
      setCarriers(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCarriers();
  }, []);

  const handleOpenAdd = () => {
    setIsEditing(false);
    setEditingId(null);
    setFormData({
      company_name: '',
      transport_type: 'Road',
      rating: '4.5',
      contacts: [{ contact: '', contact_type: 'Phone' }]
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (c) => {
    setIsEditing(true);
    setEditingId(c.carrier_id);
    setFormData({
      company_name: c.company_name,
      transport_type: c.transport_type,
      rating: c.rating,
      contacts: c.contacts && c.contacts.length > 0
        ? c.contacts.map(item => ({ contact: item.contact, contact_type: item.contact_type || 'Phone' }))
        : [{ contact: '', contact_type: 'Phone' }]
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleAddContactField = () => {
    setFormData({
      ...formData,
      contacts: [...formData.contacts, { contact: '', contact_type: 'Phone' }]
    });
  };

  const handleRemoveContactField = (index) => {
    const updated = formData.contacts.filter((_, i) => i !== index);
    setFormData({ ...formData, contacts: updated });
  };

  const handleContactChange = (index, field, value) => {
    const updated = [...formData.contacts];
    updated[index][field] = value;
    setFormData({ ...formData, contacts: updated });
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete carrier "${name}"?`)) return;
    try {
      await api.delete(`/carriers/${id}`);
      fetchCarriers();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);
    try {
      const payload = {
        company_name: formData.company_name,
        transport_type: formData.transport_type,
        rating: parseFloat(formData.rating),
        contacts: formData.contacts.filter(c => c.contact && c.contact.trim())
      };

      if (isEditing) {
        await api.put(`/carriers/${editingId}`, payload);
      } else {
        await api.post('/carriers', payload);
      }

      setIsModalOpen(false);
      fetchCarriers();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const getTransportIcon = (type) => {
    switch (type) {
      case 'Air': return <Plane className="w-5 h-5 text-sky-400" />;
      case 'Rail': return <Train className="w-5 h-5 text-emerald-400" />;
      case 'Sea': return <Ship className="w-5 h-5 text-indigo-400" />;
      default: return <Truck className="w-5 h-5 text-amber-400" />;
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Logistics Carriers & Fleets</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Transport partners, multivalued contact hotlines, modal operations, and performance ratings.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition-all shadow-md shadow-indigo-600/20 flex items-center space-x-1.5 self-start"
        >
          <Plus className="w-4 h-4" />
          <span>Add Carrier</span>
        </button>
      </div>

      {/* Carrier Cards */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 text-sm">
          <RefreshCw className="w-6 h-6 text-indigo-500 animate-spin mx-auto mb-2" />
          Loading carriers...
        </div>
      ) : carriers.length === 0 ? (
        <div className="p-12 text-center text-slate-500 text-sm bg-slate-900 border border-slate-800 rounded-2xl">
          No carriers found.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {carriers.map((c) => (
            <div 
              key={c.carrier_id}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition-all shadow-sm flex flex-col justify-between space-y-4"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-11 h-11 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center">
                      {getTransportIcon(c.transport_type)}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white">{c.company_name}</h3>
                      <div className="flex items-center space-x-2 mt-1">
                        <Badge variant={
                          c.transport_type === 'Air' ? 'air' :
                          c.transport_type === 'Sea' ? 'sea' :
                          c.transport_type === 'Rail' ? 'rail' : 'road'
                        }>
                          {c.transport_type} Freight
                        </Badge>
                        <span className="flex items-center text-xs text-amber-400 font-semibold space-x-0.5">
                          <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                          <span>{c.rating}</span>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Multivalued contacts demonstration */}
                <div className="mt-4 pt-3 border-t border-slate-800/80 space-y-2">
                  <p className="text-[11px] font-semibold uppercase text-slate-500 tracking-wider">
                    Support Contacts ({c.contacts?.length || 0})
                  </p>
                  <div className="space-y-1.5 max-h-24 overflow-y-auto">
                    {c.contacts && c.contacts.length > 0 ? (
                      c.contacts.map((cnt, idx) => (
                        <div key={idx} className="flex items-center space-x-2 text-xs text-slate-300 bg-slate-800/50 px-2.5 py-1 rounded-lg">
                          {cnt.contact.includes('@') ? (
                            <Mail className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                          ) : (
                            <Phone className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          )}
                          <span className="font-mono truncate">{cnt.contact}</span>
                          <span className="text-[10px] text-slate-500 ml-auto shrink-0">{cnt.contact_type}</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-slate-500 italic">No contact details registered.</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Card Footer */}
              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                <span className="text-slate-400">
                  <strong className="text-white font-mono">{c.total_shipments}</strong> Shipments Handled
                </span>

                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => handleOpenEdit(c)}
                    className="p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-slate-800 rounded-lg transition-colors"
                    title="Edit Carrier"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(c.carrier_id, c.company_name)}
                    className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
                    title="Delete Carrier"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Carrier Modal */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={isEditing ? 'Edit Carrier Company' : 'Register New Carrier'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && (
            <div className="p-3 bg-rose-950/60 border border-rose-800/60 rounded-xl text-xs text-rose-300 flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Carrier Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. BlueDart Express"
              value={formData.company_name}
              onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
              className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Transport Mode *</label>
              <select
                value={formData.transport_type}
                onChange={(e) => setFormData({ ...formData, transport_type: e.target.value })}
                className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="Road">Road</option>
                <option value="Rail">Rail</option>
                <option value="Air">Air</option>
                <option value="Sea">Sea</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Rating (1.0 - 5.0)</label>
              <input
                type="number"
                step="0.1"
                min="1.0"
                max="5.0"
                value={formData.rating}
                onChange={(e) => setFormData({ ...formData, rating: e.target.value })}
                className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Multivalued contacts manager */}
          <div className="space-y-2 pt-2 border-t border-slate-800">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-300 uppercase">Support Contacts (Multivalued)</label>
              <button
                type="button"
                onClick={handleAddContactField}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center space-x-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Contact</span>
              </button>
            </div>

            <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
              {formData.contacts.map((cnt, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <input
                    type="text"
                    placeholder="Phone or email..."
                    value={cnt.contact}
                    onChange={(e) => handleContactChange(index, 'contact', e.target.value)}
                    className="flex-1 px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                  <select
                    value={cnt.contact_type}
                    onChange={(e) => handleContactChange(index, 'contact_type', e.target.value)}
                    className="w-28 px-2 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="Phone">Phone</option>
                    <option value="Email">Email</option>
                    <option value="Hotline">Hotline</option>
                    <option value="Toll Free">Toll Free</option>
                  </select>
                  {formData.contacts.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveContactField(index)}
                      className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-slate-800"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition-all shadow-md shadow-indigo-600/30 disabled:opacity-50"
            >
              {submitting ? 'Saving...' : isEditing ? 'Update Carrier' : 'Register Carrier'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
