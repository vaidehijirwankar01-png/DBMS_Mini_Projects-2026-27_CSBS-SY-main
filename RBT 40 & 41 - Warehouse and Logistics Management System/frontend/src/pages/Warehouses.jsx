import React, { useState, useEffect } from 'react';
import { 
  Warehouse as WarehouseIcon, 
  Plus, 
  MapPin, 
  Boxes, 
  Trash2, 
  Edit, 
  Eye, 
  Search,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import api from '../api/client';
import Modal from '../components/Modal';

export default function Warehouses() {
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modals
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [selectedWarehouse, setSelectedWarehouse] = useState(null);
  
  // Form State
  const [formData, setFormData] = useState({
    warehouse_name: '',
    state: '',
    city: '',
    locality: '',
    storage_capacity: ''
  });
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchWarehouses = async () => {
    setLoading(true);
    try {
      const res = await api.get('/warehouses');
      setWarehouses(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWarehouses();
  }, []);

  const handleOpenAdd = () => {
    setFormData({
      warehouse_name: '',
      state: '',
      city: '',
      locality: '',
      storage_capacity: ''
    });
    setFormError('');
    setIsAddOpen(true);
  };

  const handleView = async (id) => {
    try {
      const res = await api.get(`/warehouses/${id}`);
      setSelectedWarehouse(res.data);
      setIsViewOpen(true);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete warehouse "${name}"?`)) return;
    try {
      await api.delete(`/warehouses/${id}`);
      fetchWarehouses();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);
    try {
      await api.post('/warehouses', formData);
      setIsAddOpen(false);
      fetchWarehouses();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredWarehouses = warehouses.filter(w => 
    w.warehouse_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    w.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
    w.state.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header with Search and Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Warehouse Network</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Manage distribution hubs, geographic localities, and capacity utilization limits.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search hubs by city/name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-500 w-60"
            />
          </div>

          <button
            onClick={handleOpenAdd}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition-all shadow-md shadow-indigo-600/20 flex items-center space-x-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Add Hub</span>
          </button>
        </div>
      </div>

      {/* Grid of Warehouses */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 text-sm">
          <RefreshCw className="w-6 h-6 text-indigo-500 animate-spin mx-auto mb-2" />
          Loading warehouse facilities...
        </div>
      ) : filteredWarehouses.length === 0 ? (
        <div className="p-12 text-center text-slate-500 text-sm bg-slate-900 border border-slate-800 rounded-2xl">
          No warehouses found matching your criteria.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredWarehouses.map((w) => {
            const util = Number(w.utilization_pct) || 0;
            const isHigh = util > 85;
            const isMid = util > 50 && util <= 85;

            return (
              <div 
                key={w.warehouse_id} 
                className="bg-slate-900 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition-all shadow-sm flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-xl bg-indigo-950/60 border border-indigo-800/50 flex items-center justify-center text-indigo-400">
                        <WarehouseIcon className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white">{w.warehouse_name}</h3>
                        <p className="text-[11px] text-slate-400 flex items-center space-x-1 mt-0.5">
                          <MapPin className="w-3 h-3 text-slate-500" />
                          <span>{w.locality ? `${w.locality}, ` : ''}{w.city}, {w.state}</span>
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Capacity Bar */}
                  <div className="mt-5 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">Storage Utilization</span>
                      <span className={`font-mono font-bold ${isHigh ? 'text-rose-400' : isMid ? 'text-amber-400' : 'text-emerald-400'}`}>
                        {util}%
                      </span>
                    </div>

                    <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${
                          isHigh ? 'bg-rose-500' : isMid ? 'bg-amber-500' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${Math.min(util, 100)}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
                      <span>Stock: {Number(w.current_stock).toLocaleString()} units</span>
                      <span>Cap: {Number(w.storage_capacity).toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Footer details & actions */}
                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                  <span className="text-slate-400 flex items-center space-x-1">
                    <Boxes className="w-3.5 h-3.5 text-indigo-400" />
                    <span>{w.distinct_products_count} Distinct Products</span>
                  </span>

                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => handleView(w.warehouse_id)}
                      className="p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-slate-800 rounded-lg transition-colors"
                      title="View Inventory Breakdown"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(w.warehouse_id, w.warehouse_name)}
                      className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
                      title="Delete Warehouse"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Warehouse Modal */}
      <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="Add Warehouse Facility">
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && (
            <div className="p-3 bg-rose-950/60 border border-rose-800/60 rounded-xl text-xs text-rose-300 flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Warehouse Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. Northern Hub Transit Logistics"
              value={formData.warehouse_name}
              onChange={(e) => setFormData({ ...formData, warehouse_name: e.target.value })}
              className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">State *</label>
              <input
                type="text"
                required
                placeholder="e.g. Maharashtra"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">City *</label>
              <input
                type="text"
                required
                placeholder="e.g. Mumbai"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Locality / Industrial Area</label>
            <input
              type="text"
              placeholder="e.g. MIDC Industrial Area Phase-1"
              value={formData.locality}
              onChange={(e) => setFormData({ ...formData, locality: e.target.value })}
              className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Storage Capacity (Units) *</label>
            <input
              type="number"
              min="100"
              required
              placeholder="e.g. 15000"
              value={formData.storage_capacity}
              onChange={(e) => setFormData({ ...formData, storage_capacity: e.target.value })}
              className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsAddOpen(false)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition-all shadow-md shadow-indigo-600/30 disabled:opacity-50"
            >
              {submitting ? 'Creating...' : 'Create Warehouse'}
            </button>
          </div>
        </form>
      </Modal>

      {/* View Warehouse Inventory Modal */}
      <Modal 
        isOpen={isViewOpen} 
        onClose={() => setIsViewOpen(false)} 
        title={`Stock in ${selectedWarehouse?.warehouse_name || 'Warehouse'}`}
        maxWidth="max-w-2xl"
      >
        <div className="space-y-4">
          <div className="p-3 bg-slate-800/50 rounded-xl flex items-center justify-between text-xs text-slate-300">
            <span>Location: <strong>{selectedWarehouse?.city}, {selectedWarehouse?.state}</strong></span>
            <span>Capacity: <strong>{Number(selectedWarehouse?.storage_capacity).toLocaleString()} units</strong></span>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {selectedWarehouse?.inventory?.length === 0 ? (
              <p className="text-center text-slate-500 py-6 text-xs">No products currently stocked in this hub.</p>
            ) : (
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-800 text-slate-400 uppercase text-[10px] tracking-wider sticky top-0">
                  <tr>
                    <th className="py-2.5 px-3 rounded-l-lg">Product</th>
                    <th className="py-2.5 px-3">SKU</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3">Qty Available</th>
                    <th className="py-2.5 px-3 rounded-r-lg">Last Restocked</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {selectedWarehouse?.inventory?.map((item) => (
                    <tr key={item.stock_id} className="hover:bg-slate-800/40">
                      <td className="py-2.5 px-3 font-medium text-white">{item.product_name}</td>
                      <td className="py-2.5 px-3 font-mono text-slate-400">{item.sku}</td>
                      <td className="py-2.5 px-3 text-slate-400">{item.category}</td>
                      <td className="py-2.5 px-3 font-mono font-bold text-indigo-400">{item.quantity_available}</td>
                      <td className="py-2.5 px-3 text-slate-400">{item.last_restock_date ? item.last_restock_date.split('T')[0] : 'N/A'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}
