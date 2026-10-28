import React, { useState, useEffect } from 'react';
import { 
  Package, 
  Plus, 
  Search, 
  Filter, 
  Trash2, 
  Edit, 
  Boxes, 
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import api from '../api/client';
import Modal from '../components/Modal';

export default function Products() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    product_name: '',
    category: '',
    seller: '',
    price: '',
    sku: ''
  });
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const params = {};
      if (selectedCategory) params.category = selectedCategory;
      if (searchTerm) params.search = searchTerm;

      const res = await api.get('/products', { params });
      setProducts(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await api.get('/products/categories');
      setCategories(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchProducts();
    }, 200);
    return () => clearTimeout(timer);
  }, [selectedCategory, searchTerm]);

  const handleOpenAdd = () => {
    setIsEditing(false);
    setEditingId(null);
    setFormData({
      product_name: '',
      category: '',
      seller: '',
      price: '',
      sku: `SKU-${Date.now().toString().slice(-6)}`
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (p) => {
    setIsEditing(true);
    setEditingId(p.product_id);
    setFormData({
      product_name: p.product_name,
      category: p.category,
      seller: p.seller || '',
      price: p.price,
      sku: p.sku || ''
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete product "${name}"?`)) return;
    try {
      await api.delete(`/products/${id}`);
      fetchProducts();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);
    try {
      if (isEditing) {
        await api.put(`/products/${editingId}`, formData);
      } else {
        await api.post('/products', formData);
      }
      setIsModalOpen(false);
      fetchProducts();
      fetchCategories();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Top Bar with Search, Category Filter, and Add Button */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Products Catalog</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Manage product catalog, pricing, vendor sources, and global inventory footprints.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search product / SKU / seller..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-500 w-56"
            />
          </div>

          <div className="relative">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <button
            onClick={handleOpenAdd}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition-all shadow-md shadow-indigo-600/20 flex items-center space-x-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Add Product</span>
          </button>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            <RefreshCw className="w-6 h-6 text-indigo-500 animate-spin mx-auto mb-2" />
            Loading products...
          </div>
        ) : products.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-sm">
            No products found. Add a product to get started.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-800/80 text-slate-400 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">Product Name</th>
                  <th className="py-3 px-4">SKU</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Vendor / Seller</th>
                  <th className="py-3 px-4">Unit Price</th>
                  <th className="py-3 px-4">Total Stock</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {products.map((p) => (
                  <tr key={p.product_id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-semibold text-white">
                      {p.product_name}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-400">{p.sku || 'N/A'}</td>
                    <td className="py-3 px-4">
                      <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full text-[11px] border border-slate-700">
                        {p.category}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-400">{p.seller || 'N/A'}</td>
                    <td className="py-3 px-4 font-mono font-bold text-emerald-400">
                      ${Number(p.price).toFixed(2)}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-1.5">
                        <Boxes className="w-3.5 h-3.5 text-indigo-400" />
                        <span className="font-mono font-bold text-slate-200">
                          {Number(p.total_stock_available).toLocaleString()}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          across {p.warehouse_count} hubs
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right space-x-1">
                      <button
                        onClick={() => handleOpenEdit(p)}
                        className="p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-slate-800 rounded-lg transition-colors"
                        title="Edit Product"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(p.product_id, p.product_name)}
                        className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
                        title="Delete Product"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Product Modal */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={isEditing ? 'Edit Product' : 'Add New Product'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && (
            <div className="p-3 bg-rose-950/60 border border-rose-800/60 rounded-xl text-xs text-rose-300 flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Product Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. Ergonomic Industrial Barcode Scanner"
              value={formData.product_name}
              onChange={(e) => setFormData({ ...formData, product_name: e.target.value })}
              className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Category *</label>
              <input
                type="text"
                required
                placeholder="e.g. Electronics, Packaging"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">SKU Code</label>
              <input
                type="text"
                placeholder="e.g. ELEC-BCS-01"
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Seller / Vendor</label>
              <input
                type="text"
                placeholder="e.g. Honeywell Solutions"
                value={formData.seller}
                onChange={(e) => setFormData({ ...formData, seller: e.target.value })}
                className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Unit Price ($) *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                placeholder="e.g. 149.99"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
              />
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
              {submitting ? 'Saving...' : isEditing ? 'Update Product' : 'Add Product'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
