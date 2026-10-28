import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Warehouse, 
  Boxes, 
  Send, 
  AlertTriangle, 
  PlusCircle, 
  ArrowUpRight, 
  CheckCircle2, 
  Clock, 
  RotateCcw,
  RefreshCw
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  PieChart, 
  Pie, 
  Cell, 
  Legend 
} from 'recharts';
import api from '../api/client';
import StatCard from '../components/StatCard';
import Badge from '../components/Badge';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [utilization, setUtilization] = useState([]);
  const [recentShipments, setRecentShipments] = useState([]);
  const [lowStock, setLowStock] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsRes, utilRes, shipmentsRes, lowStockRes] = await Promise.all([
        api.get('/reports/dashboard-stats'),
        api.get('/reports/utilization'),
        api.get('/shipments'),
        api.get('/reports/low-stock')
      ]);

      setStats(statsRes.data);
      setUtilization(utilRes.data || []);
      setRecentShipments((shipmentsRes.data || []).slice(0, 5));
      setLowStock((lowStockRes.data || []).slice(0, 4));
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to connect to backend/MySQL database');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const shipmentStatusData = stats?.shipments ? [
    { name: 'Delivered', value: Number(stats.shipments.delivered_shipments) || 0, color: '#10b981' },
    { name: 'In Transit', value: Number(stats.shipments.in_transit_shipments) || 0, color: '#3b82f6' },
    { name: 'Pending', value: Number(stats.shipments.pending_shipments) || 0, color: '#f59e0b' },
    { name: 'Cancelled', value: Number(stats.shipments.cancelled_shipments) || 0, color: '#f43f5e' }
  ].filter(item => item.value > 0) : [];

  if (loading) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
        <p className="text-slate-400 text-sm">Loading logistics intelligence dashboard...</p>
      </div>
    );
  }

  // Do not block the page with full error screen; allow preview dataset to render!


  return (
    <div className="p-6 space-y-6">
      {/* Top Action Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 bg-gradient-to-r from-indigo-900/40 via-slate-900 to-slate-900 border border-indigo-800/30 rounded-2xl shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Logistics Command Center</h2>
          <p className="text-xs text-slate-400 mt-1">
            Real-time warehouse utilization, inventory triggers, and active supply chain dispatches.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Link
            to="/create-shipment"
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-medium transition-all shadow-md shadow-indigo-600/30 flex items-center space-x-2"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create Shipment</span>
          </Link>
          <button
            onClick={fetchDashboardData}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition-colors"
            title="Refresh Data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Database Status Banner if using fallback */}
      {!stats?.is_live_mysql && (
        <div className="p-4 bg-amber-950/40 border border-amber-700/60 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-200">
          <div className="flex items-center space-x-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <span className="font-bold text-amber-300">Interactive Preview Active:</span> Showing realistic seed dataset.
              To connect your live MySQL instance, provide your MySQL password or run <code className="bg-slate-900 px-1 py-0.5 rounded font-mono text-emerald-400">setup_all.sql</code> in MySQL Workbench.
            </div>
          </div>
          <button 
            onClick={fetchDashboardData} 
            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-medium transition-colors shrink-0 self-start sm:self-center"
          >
            Check Live MySQL
          </button>
        </div>
      )}


      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Warehouses"
          value={stats?.total_warehouses || 0}
          subtitle="Active distribution hubs"
          icon={Warehouse}
          color="indigo"
        />
        <StatCard
          title="Stock In Hand"
          value={(stats?.total_inventory_units || 0).toLocaleString()}
          subtitle="Total product units across hubs"
          icon={Boxes}
          color="emerald"
        />
        <StatCard
          title="Total Shipments"
          value={stats?.shipments?.total_shipments || 0}
          subtitle={`${stats?.shipments?.in_transit_shipments || 0} currently in transit`}
          icon={Send}
          color="cyan"
        />
        <StatCard
          title="Low Stock Alerts"
          value={stats?.low_stock_alerts || 0}
          subtitle="Items at or below safety threshold"
          icon={AlertTriangle}
          color="amber"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Warehouse Capacity Bar Chart */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-white">Hub Capacity vs Current Stock</h3>
              <p className="text-xs text-slate-400">Total available storage capacity compared to occupied stock</p>
            </div>
            <Link to="/warehouses" className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center space-x-1">
              <span>View All</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={utilization} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis 
                  dataKey="city" 
                  stroke="#64748b" 
                  fontSize={11} 
                  tickLine={false} 
                />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }}
                />
                <Bar dataKey="storage_capacity" name="Max Capacity" fill="#334155" radius={[4, 4, 0, 0]} />
                <Bar dataKey="current_stock_units" name="Current Stock" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Shipment Status Donut Chart */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-base font-semibold text-white">Shipment Pipeline</h3>
            <p className="text-xs text-slate-400">Status breakdown of logistics orders</p>
          </div>

          <div className="h-52 w-full my-auto">
            {shipmentStatusData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={shipmentStatusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={75}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {shipmentStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }}
                  />
                  <Legend 
                    verticalAlign="bottom" 
                    iconType="circle" 
                    formatter={(val) => <span className="text-xs text-slate-300 font-medium">{val}</span>} 
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-500">
                No shipment data available
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-800/80 text-center">
            <div className="p-2 bg-slate-800/40 rounded-lg">
              <p className="text-[11px] text-slate-400">Delivered</p>
              <p className="text-sm font-bold text-emerald-400">{stats?.shipments?.delivered_shipments || 0}</p>
            </div>
            <div className="p-2 bg-slate-800/40 rounded-lg">
              <p className="text-[11px] text-slate-400">In Transit</p>
              <p className="text-sm font-bold text-blue-400">{stats?.shipments?.in_transit_shipments || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tables Bottom Grid: Recent Shipments & Low Stock Warnings */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Shipments */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-white">Recent Dispatches</h3>
            <Link to="/shipments" className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center space-x-1">
              <span>View All Shipments</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-800/60 text-slate-400 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-2.5 px-3 rounded-l-lg">Tracking #</th>
                  <th className="py-2.5 px-3">Warehouse Hub</th>
                  <th className="py-2.5 px-3">Carrier</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 rounded-r-lg">Est. Delivery</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {recentShipments.map((s) => (
                  <tr key={s.shipment_id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-3 font-mono font-medium text-indigo-300">
                      <Link to={`/tracking?no=${s.tracking_no}`} className="hover:underline">
                        {s.tracking_no}
                      </Link>
                    </td>
                    <td className="py-3 px-3 text-slate-200">{s.source_warehouse_name}</td>
                    <td className="py-3 px-3 text-slate-400">{s.carrier_name}</td>
                    <td className="py-3 px-3">
                      <Badge variant={
                        s.status === 'Delivered' ? 'delivered' :
                        s.status === 'In Transit' ? 'inTransit' :
                        s.status === 'Cancelled' ? 'cancelled' : 'pending'
                      }>
                        {s.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-3 text-slate-400">{s.estimated_delivery ? s.estimated_delivery.split('T')[0] : 'N/A'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Low Stock Warning Sidebar */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <h3 className="text-base font-semibold text-white">Stock Warnings</h3>
            </div>
            <Link to="/inventory?low_stock=true" className="text-xs text-amber-400 hover:text-amber-300">
              Manage
            </Link>
          </div>

          <div className="space-y-3">
            {lowStock.length > 0 ? (
              lowStock.map((item) => (
                <div key={item.stock_id} className="p-3 bg-slate-800/40 border border-slate-800 rounded-xl space-y-1">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-semibold text-slate-200 truncate max-w-[180px]">{item.product_name}</h4>
                    <span className="text-xs font-mono font-bold text-amber-400">{item.quantity_available} left</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span>{item.warehouse_name}</span>
                    <span>Min: {item.min_threshold}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-6 text-center text-xs text-slate-500 space-y-1">
                <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto" />
                <p>All warehouse inventory levels are healthy!</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
