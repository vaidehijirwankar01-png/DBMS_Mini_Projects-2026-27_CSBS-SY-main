import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Warehouse, 
  Package, 
  Boxes, 
  Truck, 
  Send, 
  PlusCircle, 
  SearchCheck, 
  BarChart3,
  Database
} from 'lucide-react';

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/warehouses', label: 'Warehouses', icon: Warehouse },
  { path: '/products', label: 'Products', icon: Package },
  { path: '/inventory', label: 'Inventory Stocks', icon: Boxes },
  { path: '/carriers', label: 'Carriers', icon: Truck },
  { path: '/shipments', label: 'Shipments', icon: Send },
  { path: '/create-shipment', label: 'New Shipment', icon: PlusCircle, highlight: true },
  { path: '/tracking', label: 'Live Tracking', icon: SearchCheck },
  { path: '/reports', label: 'Reports & Analytics', icon: BarChart3 },
];

export default function Sidebar() {
  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col h-screen sticky top-0">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800 flex items-center space-x-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
          <Database className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="font-bold text-white text-lg tracking-tight">LogistiX Hub</h1>
          <p className="text-xs text-slate-400 font-medium">DBMS Warehouse Suite</p>
        </div>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                `flex items-center space-x-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? item.highlight
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                      : 'bg-slate-800 text-indigo-400 shadow-sm border border-slate-700/50'
                    : item.highlight
                    ? 'bg-indigo-950/60 text-indigo-300 hover:bg-indigo-900/60 border border-indigo-800/40'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Database Connection Status Footer */}
      <div className="p-4 border-t border-slate-800 bg-slate-900/60">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>MySQL 8.0 Engine</span>
          </span>
          <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-300 font-mono">
            3NF Schema
          </span>
        </div>
        <p className="text-[11px] text-slate-500 mt-2 font-mono truncate">
          db: logistics_db (InnoDB)
        </p>
      </div>
    </aside>
  );
}
