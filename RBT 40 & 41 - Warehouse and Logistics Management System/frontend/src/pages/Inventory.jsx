import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  Boxes, 
  Plus, 
  RotateCw, 
  AlertTriangle, 
  Search, 
  Warehouse, 
  RefreshCw,
  Calendar,
  AlertCircle
} from 'lucide-react';
import api from '../api/client';
import Modal from '../components/Modal';
import Badge from '../components/Badge';

export default function Inventory() {
  const [searchParams] = useSearchParams();
  const [inventory, setInventory] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedWarehouse, setSelectedWarehouse] = useState(searchParams.get('warehouse') || '');
  const [onlyLowStock, setOnlyLowStock] = useState(searchParams.get('low_stock') === 'true');
  const [searchTerm, setSearchTerm] = useState('');

  // Modals
  const [isRestockOpen, setIsRestockOpen] = useState(false);
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [activeItem, setActiveItem] = useState(null);

  // Forms
  const [restockQty, setRestockQty] = useState('');
  const [restockDate, setRestockDate] = useState(new Date().toISOString().split('T')[0]);
  const [assignForm, setAssignForm] = useState({
    warehouse_id: '',
    product_id: '',
    quantity_available: 50,
    min_threshold: 10
  });

  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchInventory = async () => {
    setLoading(true);
    try {
      const params = {};
      if (selectedWarehouse) params.warehouse_id = selectedWarehouse;
      if (onlyLowStock) params.low_stock = 'true';
      if (searchTerm) params.search = searchTerm;

      const res = await api.get('/inventory', { params });
      setInventory(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPrerequisites = async () => {
    try {
      const [whRes, prodRes] = await Promise.all([
        api.get('/warehouses'),
        api.get('/products')
      ]);
      setWarehouses(whRes.data || []);
      setProducts(prodRes.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchPrerequisites();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchInventory();
    }, 200);
    return () => clearTimeout(timer);
  }, [selectedWarehouse, onlyLowStock, searchTerm]);

  const handleOpenRestock = (item) => {
    setActiveItem(item);
    setRestockQty('50');
    setRestockDate(new Date().toISOString().split('T')[0]);
    setFormError('');
    setIsRestockOpen(true);
  };

  const handleRestockSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);
    try {
      await api.post('/inventory/restock', {
        warehouse_id: activeItem.warehouse_id,
        product_id: activeItem.product_id,
        quantity: parseInt(restockQty, 10),
        restock_date: restockDate
      });
      setIsRestockOpen(false);
      fetchInventory();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAssignSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);
    try {
      await api.post('/inventory', assignForm);
      setIsAssignOpen(false);
      fetchInventory();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header with Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Warehouse Inventory Stocks</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Monitor real-time stock levels, execute stored procedure restocking, and enforce threshold triggers.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search product / SKU..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-500 w-48"
            />
          </div>

          <select
            value={selectedWarehouse}
            onChange={(e) => setSelectedWarehouse(e.target.value)}
            className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
          >
            <option value="">All Warehouse Hubs</option>
            {warehouses.map((w) => (
              <option key={w.warehouse_id} value={w.warehouse_id}>
                {w.warehouse_name} ({w.city})
              </option>
            ))}
          </select>

          <button
            onClick={() => setOnlyLowStock(!onlyLowStock)}
            className={`px-3 py-2 rounded-xl text-xs font-medium border transition-colors flex items-center space-x-1.5 ${
              onlyLowStock
                ? 'bg-amber-950/80 border-amber-700 text-amber-300'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Low Stock Only</span>
          </button>

          <button
            onClick={() => {
              setAssignForm({
                warehouse_id: warehouses[0]?.warehouse_id || '',
                product_id: products[0]?.product_id || '',
                quantity_available: 50,
                min_threshold: 10
              });
              setFormError('');
              setIsAssignOpen(true);
            }}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition-all shadow-md shadow-indigo-600/20 flex items-center space-x-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Add Stock Entry</span>
          </button>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            <RefreshCw className="w-6 h-6 text-indigo-500 animate-spin mx-auto mb-2" />
            Loading warehouse stock levels...
          </div>
        ) : inventory.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-sm">
            No stock records found matching your filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-800/80 text-slate-400 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">Warehouse Hub</th>
                  <th className="py-3 px-4">Product Name</th>
                  <th className="py-3 px-4">SKU / Category</th>
                  <th className="py-3 px-4">Available Stock</th>
                  <th className="py-3 px-4">Min. Threshold</th>
                  <th className="py-3 px-4">Stock Health</th>
                  <th className="py-3 px-4">Last Restocked</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {inventory.map((item) => (
                  <tr key={item.stock_id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-medium text-white">
                      <div>{item.warehouse_name}</div>
                      <div className="text-[10px] text-slate-500">{item.city}, {item.state}</div>
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-200">
                      {item.product_name}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-mono text-slate-400">{item.sku}</span>
                      <span className="text-[10px] text-slate-500 block">{item.category}</span>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-base text-white">
                      {item.quantity_available}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-400">
                      {item.min_threshold}
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant={
                        item.stock_status === 'Healthy' ? 'healthy' :
                        item.stock_status === 'Low Stock' ? 'lowStock' : 'outOfStock'
                      }>
                        {item.stock_status}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-slate-400">
                      {item.last_restock_date ? item.last_restock_date.split('T')[0] : 'N/A'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleOpenRestock(item)}
                        className="px-2.5 py-1.5 bg-slate-800 hover:bg-indigo-600 hover:text-white text-indigo-400 rounded-lg text-xs font-medium border border-slate-700 transition-colors inline-flex items-center space-x-1"
                        title="Restock Product using Stored Procedure"
                      >
                        <RotateCw className="w-3.5 h-3.5" />
                        <span>Restock</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Restock Modal (Invokes sp_restock_product) */}
      <Modal 
        isOpen={isRestockOpen} 
        onClose={() => setIsRestockOpen(false)} 
        title="Execute Stored Procedure: Restock Product"
      >
        <form onSubmit={handleRestockSubmit} className="space-y-4">
          <div className="p-3 bg-indigo-950/40 border border-indigo-800/40 rounded-xl space-y-1 text-xs">
            <p className="text-indigo-300 font-semibold">Target Inventory Node:</p>
            <p className="text-slate-200"><strong>Product:</strong> {activeItem?.product_name}</p>
            <p className="text-slate-200"><strong>Warehouse:</strong> {activeItem?.warehouse_name}</p>
            <p className="text-slate-400 font-mono">Current Quantity: {activeItem?.quantity_available} units</p>
          </div>

          {formError && (
            <div className="p-3 bg-rose-950/60 border border-rose-800/60 rounded-xl text-xs text-rose-300 flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Restock Quantity *</label>
            <input
              type="number"
              min="1"
              required
              value={restockQty}
              onChange={(e) => setRestockQty(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Restock Date</label>
            <input
              type="date"
              required
              value={restockDate}
              onChange={(e) => setRestockDate(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsRestockOpen(false)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition-all shadow-md shadow-indigo-600/30 disabled:opacity-50"
            >
              {submitting ? 'Calling Procedure...' : 'Execute Restock'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Add Stock Entry Modal */}
      <Modal 
        isOpen={isAssignOpen} 
        onClose={() => setIsAssignOpen(false)} 
        title="Assign Product to Warehouse Stock"
      >
        <form onSubmit={handleAssignSubmit} className="space-y-4">
          {formError && (
            <div className="p-3 bg-rose-950/60 border border-rose-800/60 rounded-xl text-xs text-rose-300 flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Target Warehouse *</label>
            <select
              value={assignForm.warehouse_id}
              onChange={(e) => setAssignForm({ ...assignForm, warehouse_id: e.target.value })}
              className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
            >
              {warehouses.map((w) => (
                <option key={w.warehouse_id} value={w.warehouse_id}>
                  {w.warehouse_name} ({w.city})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Product *</label>
            <select
              value={assignForm.product_id}
              onChange={(e) => setAssignForm({ ...assignForm, product_id: e.target.value })}
              className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
            >
              {products.map((p) => (
                <option key={p.product_id} value={p.product_id}>
                  {p.product_name} ({p.sku || p.category})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Initial Quantity</label>
              <input
                type="number"
                min="0"
                value={assignForm.quantity_available}
                onChange={(e) => setAssignForm({ ...assignForm, quantity_available: e.target.value })}
                className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Safety Threshold</label>
              <input
                type="number"
                min="1"
                value={assignForm.min_threshold}
                onChange={(e) => setAssignForm({ ...assignForm, min_threshold: e.target.value })}
                className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsAssignOpen(false)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition-all shadow-md shadow-indigo-600/30 disabled:opacity-50"
            >
              {submitting ? 'Saving...' : 'Add Stock Node'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
