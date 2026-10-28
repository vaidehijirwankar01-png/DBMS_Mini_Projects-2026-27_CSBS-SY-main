import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './pages/Dashboard';
import Warehouses from './pages/Warehouses';
import Products from './pages/Products';
import Inventory from './pages/Inventory';
import Carriers from './pages/Carriers';
import Shipments from './pages/Shipments';
import CreateShipment from './pages/CreateShipment';
import Tracking from './pages/Tracking';
import Reports from './pages/Reports';

export default function App() {
  return (
    <BrowserRouter>
      <div className="flex min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-indigo-600 selection:text-white">
        {/* Fixed Collapsible Sidebar */}
        <Sidebar />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0">
          <Header 
            title="Warehouse & Logistics Management System" 
            subtitle="Database Management System (DBMS) Project Suite" 
          />

          <main className="flex-1 overflow-y-auto">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/warehouses" element={<Warehouses />} />
              <Route path="/products" element={<Products />} />
              <Route path="/inventory" element={<Inventory />} />
              <Route path="/carriers" element={<Carriers />} />
              <Route path="/shipments" element={<Shipments />} />
              <Route path="/create-shipment" element={<CreateShipment />} />
              <Route path="/tracking" element={<Tracking />} />
              <Route path="/reports" element={<Reports />} />
            </Routes>
          </main>
        </div>
      </div>
    </BrowserRouter>
  );
}
