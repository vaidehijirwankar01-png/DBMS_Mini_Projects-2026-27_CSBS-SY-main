import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  Warehouse, 
  Truck, 
  Package, 
  Clock, 
  AlertTriangle, 
  RefreshCw,
  TrendingUp,
  Download
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  Legend 
} from 'recharts';
import api from '../api/client';
import Badge from '../components/Badge';

export default function Reports() {
  const [activeTab, setActiveTab] = useState('utilization');
  const [loading, setLoading] = useState(true);

  // Report datasets
  const [utilizationData, setUtilizationData] = useState([]);
  const [carrierData, setCarrierData] = useState([]);
  const [topProductsData, setTopProductsData] = useState([]);
  const [lateShipmentsData, setLateShipmentsData] = useState([]);
  const [lowStockData, setLowStockData] = useState([]);

  const fetchAllReports = async () => {
    setLoading(true);
    try {
      const [uRes, cRes, tpRes, lsRes, lwsRes] = await Promise.all([
        api.get('/reports/utilization'),
        api.get('/reports/carrier-performance'),
        api.get('/reports/top-products'),
        api.get('/reports/late-shipments'),
        api.get('/reports/low-stock')
      ]);

      setUtilizationData(uRes.data || []);
      setCarrierData(cRes.data || []);
      setTopProductsData(tpRes.data || []);
      setLateShipmentsData(lsRes.data || []);
      setLowStockData(lwsRes.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllReports();
  }, []);

  const tabs = [
    { id: 'utilization', label: 'Warehouse Capacity (GROUP BY)', icon: Warehouse },
    { id: 'carriers', label: 'Carrier Performance (JOIN)', icon: Truck },
    { id: 'products', label: 'Top Shipped Products', icon: Package },
    { id: 'late', label: 'Late Dispatches Monitor', icon: Clock },
    { id: 'lowstock', label: 'Low Stock Warnings', icon: AlertTriangle }
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Database Intelligence & DBMS Reports</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            SQL aggregate queries demonstrating JOINs, GROUP BY, HAVING, and dynamic view projections.
          </p>
        </div>

        <button
          onClick={fetchAllReports}
          className="p-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 rounded-xl transition-colors self-start"
          title="Refresh All Reports"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-3">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center space-x-2 transition-all ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Content Area */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 text-sm">
          <RefreshCw className="w-6 h-6 text-indigo-500 animate-spin mx-auto mb-2" />
          Querying SQL views and calculating aggregations...
        </div>
      ) : (
        <div className="space-y-6">
          {/* TAB 1: WAREHOUSE UTILIZATION */}
          {activeTab === 'utilization' && (
            <div className="space-y-6">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-white">View: v_warehouse_utilization</h3>
                    <p className="text-xs text-slate-400">Total stored product units compared to hub storage capacity</p>
                  </div>
                  <span className="text-[10px] font-mono text-indigo-400 bg-indigo-950/60 px-2 py-1 rounded border border-indigo-800/40">
                    SQL: GROUP BY warehouse_id
                  </span>
                </div>

                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={utilizationData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                      <XAxis dataKey="city" stroke="#64748b" fontSize={11} tickLine={false} />
                      <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                      <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }} />
                      <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '12px' }} />
                      <Bar dataKey="storage_capacity" name="Max Capacity" fill="#334155" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="current_stock_units" name="Occupied Stock" fill="#6366f1" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-800/80 text-slate-400 uppercase text-[10px]">
                    <tr>
                      <th className="py-3 px-4">Warehouse</th>
                      <th className="py-3 px-4">Location</th>
                      <th className="py-3 px-4 font-mono">Max Capacity</th>
                      <th className="py-3 px-4 font-mono">Current Stock</th>
                      <th className="py-3 px-4">Utilization %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {utilizationData.map((u) => (
                      <tr key={u.warehouse_id} className="hover:bg-slate-800/40">
                        <td className="py-3 px-4 font-semibold text-white">{u.warehouse_name}</td>
                        <td className="py-3 px-4 text-slate-400">{u.city}, {u.state}</td>
                        <td className="py-3 px-4 font-mono">{Number(u.storage_capacity).toLocaleString()}</td>
                        <td className="py-3 px-4 font-mono font-bold text-indigo-400">{Number(u.current_stock_units).toLocaleString()}</td>
                        <td className="py-3 px-4 font-mono font-bold">
                          <span className={u.utilization_percentage > 85 ? 'text-rose-400' : 'text-emerald-400'}>
                            {u.utilization_percentage}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: CARRIER PERFORMANCE */}
          {activeTab === 'carriers' && (
            <div className="space-y-6">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-white">View: v_carrier_performance</h3>
                    <p className="text-xs text-slate-400">Carrier dispatch volume, transit completion, and satisfaction ratings</p>
                  </div>
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-1 rounded border border-emerald-800/40">
                    SQL: JOIN carrier WITH shipment
                  </span>
                </div>

                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={carrierData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                      <XAxis dataKey="company_name" stroke="#64748b" fontSize={10} tickLine={false} />
                      <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                      <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }} />
                      <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '12px' }} />
                      <Bar dataKey="delivered_count" name="Delivered" fill="#10b981" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="in_transit_count" name="In Transit" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="pending_count" name="Pending" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-800/80 text-slate-400 uppercase text-[10px]">
                    <tr>
                      <th className="py-3 px-4">Carrier Company</th>
                      <th className="py-3 px-4">Transport Mode</th>
                      <th className="py-3 px-4">Rating</th>
                      <th className="py-3 px-4">Total Orders</th>
                      <th className="py-3 px-4">Delivered</th>
                      <th className="py-3 px-4">In Transit</th>
                      <th className="py-3 px-4">Cancelled</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {carrierData.map((c) => (
                      <tr key={c.carrier_id} className="hover:bg-slate-800/40">
                        <td className="py-3 px-4 font-semibold text-white">{c.company_name}</td>
                        <td className="py-3 px-4 text-slate-400">{c.transport_type}</td>
                        <td className="py-3 px-4 font-mono font-bold text-amber-400">{c.rating}</td>
                        <td className="py-3 px-4 font-mono font-bold text-white">{c.total_shipments}</td>
                        <td className="py-3 px-4 font-mono text-emerald-400">{c.delivered_count}</td>
                        <td className="py-3 px-4 font-mono text-blue-400">{c.in_transit_count}</td>
                        <td className="py-3 px-4 font-mono text-rose-400">{c.cancelled_count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: TOP PRODUCTS */}
          {activeTab === 'products' && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden space-y-4 p-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div>
                  <h3 className="text-sm font-bold text-white">View: v_top_products</h3>
                  <p className="text-xs text-slate-400">High-volume products shipped across all shipments</p>
                </div>
                <span className="text-[10px] font-mono text-indigo-400 bg-indigo-950/60 px-2 py-1 rounded border border-indigo-800/40">
                  SQL: SUM(si.quantity_shipped) ORDER BY DESC
                </span>
              </div>

              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-800/80 text-slate-400 uppercase text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Rank</th>
                    <th className="py-3 px-4">Product Name</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Price</th>
                    <th className="py-3 px-4">Total Units Shipped</th>
                    <th className="py-3 px-4">Distinct Shipments</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {topProductsData.map((p, idx) => (
                    <tr key={p.product_id} className="hover:bg-slate-800/40">
                      <td className="py-3 px-4 font-mono font-bold text-indigo-400">#{idx + 1}</td>
                      <td className="py-3 px-4 font-semibold text-white">{p.product_name}</td>
                      <td className="py-3 px-4 text-slate-400">{p.category}</td>
                      <td className="py-3 px-4 font-mono">${Number(p.price).toFixed(2)}</td>
                      <td className="py-3 px-4 font-mono font-bold text-emerald-400">{p.total_quantity_shipped} units</td>
                      <td className="py-3 px-4 font-mono text-slate-300">{p.shipment_appearances} dispatches</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 4: LATE SHIPMENTS */}
          {activeTab === 'late' && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden space-y-4 p-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div>
                  <h3 className="text-sm font-bold text-white">View: v_late_shipments</h3>
                  <p className="text-xs text-slate-400">Shipments exceeding target ETA without reaching Delivered status</p>
                </div>
                <span className="text-[10px] font-mono text-rose-400 bg-rose-950/60 px-2 py-1 rounded border border-rose-800/40">
                  SQL: estimated_delivery &lt; CURDATE() AND status != 'Delivered'
                </span>
              </div>

              {lateShipmentsData.length === 0 ? (
                <div className="p-8 text-center text-xs text-emerald-400">
                  ✓ Excellent! No shipments are currently delayed beyond their estimated delivery dates.
                </div>
              ) : (
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-800/80 text-slate-400 uppercase text-[10px]">
                    <tr>
                      <th className="py-3 px-4">Tracking #</th>
                      <th className="py-3 px-4">Carrier</th>
                      <th className="py-3 px-4">Origin Hub</th>
                      <th className="py-3 px-4">Destination</th>
                      <th className="py-3 px-4">Target ETA</th>
                      <th className="py-3 px-4 text-right">Days Overdue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {lateShipmentsData.map((s) => (
                      <tr key={s.shipment_id} className="hover:bg-slate-800/40">
                        <td className="py-3 px-4 font-mono font-bold text-indigo-300">{s.tracking_no}</td>
                        <td className="py-3 px-4 text-slate-300">{s.carrier_name}</td>
                        <td className="py-3 px-4 text-slate-400">{s.source_warehouse}</td>
                        <td className="py-3 px-4 text-slate-400 truncate max-w-xs">{s.destination_address}</td>
                        <td className="py-3 px-4 font-mono text-slate-300">{s.estimated_delivery ? s.estimated_delivery.split('T')[0] : 'N/A'}</td>
                        <td className="py-3 px-4 font-mono font-bold text-rose-400 text-right">{s.days_overdue} days</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* TAB 5: LOW STOCK ALERTS */}
          {activeTab === 'lowstock' && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden space-y-4 p-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div>
                  <h3 className="text-sm font-bold text-white">View: v_low_stock</h3>
                  <p className="text-xs text-slate-400">Inventory nodes requiring restocking based on minimum thresholds</p>
                </div>
                <span className="text-[10px] font-mono text-amber-400 bg-amber-950/60 px-2 py-1 rounded border border-amber-800/40">
                  SQL: quantity_available &lt;= min_threshold
                </span>
              </div>

              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-800/80 text-slate-400 uppercase text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Warehouse Hub</th>
                    <th className="py-3 px-4">Product Name</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Available Stock</th>
                    <th className="py-3 px-4">Min. Threshold</th>
                    <th className="py-3 px-4">Last Restock Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {lowStockData.map((item) => (
                    <tr key={item.stock_id} className="hover:bg-slate-800/40">
                      <td className="py-3 px-4 font-medium text-white">{item.warehouse_name}</td>
                      <td className="py-3 px-4 font-semibold text-slate-200">{item.product_name}</td>
                      <td className="py-3 px-4 text-slate-400">{item.category}</td>
                      <td className="py-3 px-4 font-mono font-bold text-amber-400">{item.quantity_available} units</td>
                      <td className="py-3 px-4 font-mono text-slate-400">{item.min_threshold} units</td>
                      <td className="py-3 px-4 text-slate-400">{item.last_restock_date ? item.last_restock_date.split('T')[0] : 'N/A'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
