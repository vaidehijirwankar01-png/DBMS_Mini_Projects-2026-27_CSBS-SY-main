import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  Search, 
  Truck, 
  MapPin, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Phone, 
  Warehouse, 
  ShieldCheck,
  Package,
  XCircle
} from 'lucide-react';
import api from '../api/client';
import Badge from '../components/Badge';

export default function Tracking() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialNo = searchParams.get('no') || '';

  const [trackingInput, setTrackingInput] = useState(initialNo);
  const [shipmentData, setShipmentData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const sampleTrackingNumbers = [
    'TRK-2026-MUM-1001',
    'TRK-2026-MUM-1002',
    'TRK-2026-BLR-3001',
    'TRK-2026-CHE-4001',
    'TRK-2026-BLR-3003'
  ];

  const handleTrack = async (noToTrack) => {
    const code = (noToTrack || trackingInput).trim();
    if (!code) return;

    setLoading(true);
    setError('');
    setShipmentData(null);

    try {
      const res = await api.get(`/track/${code}`);
      setShipmentData(res.data);
      setSearchParams({ no: code });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialNo) {
      handleTrack(initialNo);
    }
  }, [initialNo]);

  const handleSubmit = (e) => {
    e.preventDefault();
    handleTrack();
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-white tracking-tight">Live Cargo Tracking Portal</h2>
        <p className="text-xs text-slate-400 max-w-md mx-auto">
          Enter any shipment tracking identifier to view real-time transit telemetry, warehouse dispatch origin, and delivery timeline.
        </p>
      </div>

      {/* Tracking Input Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="e.g. TRK-2026-MUM-1001"
              value={trackingInput}
              onChange={(e) => setTrackingInput(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500 font-mono uppercase tracking-wider"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold transition-all shadow-md shadow-indigo-600/30 disabled:opacity-50"
          >
            {loading ? 'Searching...' : 'Track'}
          </button>
        </form>

        {/* Demo Chips */}
        <div className="flex flex-wrap items-center gap-2 pt-2">
          <span className="text-xs text-slate-500">Quick Test Samples:</span>
          {sampleTrackingNumbers.map((no) => (
            <button
              key={no}
              type="button"
              onClick={() => {
                setTrackingInput(no);
                handleTrack(no);
              }}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[11px] font-mono border border-slate-700 transition-colors"
            >
              {no}
            </button>
          ))}
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 bg-rose-950/60 border border-rose-800/60 rounded-2xl text-xs text-rose-300 flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Tracking Result View */}
      {shipmentData && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-8 animate-in fade-in">
          {/* Header Summary */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
            <div>
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Tracking Identifier</span>
              <h3 className="text-xl font-bold font-mono text-white mt-0.5">{shipmentData.tracking_no}</h3>
              <p className="text-xs text-slate-400 mt-1">
                Dispatched on {new Date(shipmentData.created_at).toLocaleDateString()}
              </p>
            </div>

            <div className="flex items-center space-x-3">
              <Badge variant={
                shipmentData.status === 'Delivered' ? 'delivered' :
                shipmentData.status === 'In Transit' ? 'inTransit' :
                shipmentData.status === 'Cancelled' ? 'cancelled' : 'pending'
              } className="text-sm px-3 py-1">
                {shipmentData.status}
              </Badge>
            </div>
          </div>

          {/* Timeline Visualizer */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Dispatch & Delivery Timeline</h4>

            <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
              {shipmentData.timeline.map((item, idx) => (
                <div key={idx} className="relative flex items-start space-x-3">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center -ml-6 border-2 shrink-0 ${
                    item.isCancelled
                      ? 'bg-rose-500 border-slate-900 text-white'
                      : item.completed
                      ? 'bg-emerald-500 border-slate-900 text-white'
                      : item.active
                      ? 'bg-blue-500 border-slate-900 animate-pulse text-white'
                      : 'bg-slate-800 border-slate-700 text-slate-500'
                  }`}>
                    {item.isCancelled ? (
                      <XCircle className="w-3.5 h-3.5" />
                    ) : (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    )}
                  </div>

                  <div>
                    <h5 className={`text-xs font-bold ${item.completed || item.active ? 'text-white' : 'text-slate-500'}`}>
                      {item.stage}
                    </h5>
                    <p className="text-xs text-slate-400 mt-0.5">{item.description}</p>
                    {item.eta && (
                      <p className="text-[11px] text-indigo-400 font-mono mt-1">
                        Target ETA: {item.eta.split('T')[0]}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Logistics Route Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-6 border-t border-slate-800">
            {/* Origin */}
            <div className="p-4 bg-slate-800/40 rounded-xl space-y-2">
              <div className="flex items-center space-x-2 text-xs font-semibold text-slate-300 uppercase">
                <Warehouse className="w-4 h-4 text-indigo-400" />
                <span>Origin Hub</span>
              </div>
              <p className="text-sm font-bold text-white">{shipmentData.source_warehouse_name}</p>
              <p className="text-xs text-slate-400">
                {shipmentData.source_locality ? `${shipmentData.source_locality}, ` : ''}
                {shipmentData.source_city}, {shipmentData.source_state}
              </p>
            </div>

            {/* Destination */}
            <div className="p-4 bg-slate-800/40 rounded-xl space-y-2">
              <div className="flex items-center space-x-2 text-xs font-semibold text-slate-300 uppercase">
                <MapPin className="w-4 h-4 text-emerald-400" />
                <span>Delivery Destination</span>
              </div>
              <p className="text-sm font-bold text-white">Consignee Site</p>
              <p className="text-xs text-slate-400">{shipmentData.destination_address}</p>
            </div>
          </div>

          {/* Carrier Hotline & Support Contacts */}
          <div className="p-4 bg-slate-800/40 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-xs font-semibold text-slate-300 uppercase">
                <Truck className="w-4 h-4 text-sky-400" />
                <span>Carrier: {shipmentData.carrier_name} ({shipmentData.transport_type} Freight)</span>
              </div>
              <span className="text-xs text-amber-400 font-mono">Rating: {shipmentData.carrier_rating} / 5.0</span>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              {shipmentData.carrier_contacts?.map((cnt, idx) => (
                <div key={idx} className="flex items-center space-x-1.5 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-700/80 text-xs text-slate-300">
                  <Phone className="w-3 h-3 text-emerald-400" />
                  <span className="font-mono">{cnt.contact}</span>
                  <span className="text-[10px] text-slate-500">({cnt.contact_type})</span>
                </div>
              ))}
            </div>
          </div>

          {/* Manifest Cargo */}
          <div className="space-y-3 pt-4 border-t border-slate-800">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-2">
              <Package className="w-4 h-4 text-indigo-400" />
              <span>Manifest Cargo ({shipmentData.items?.length || 0} items)</span>
            </h4>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-800/80 text-slate-400 uppercase text-[10px]">
                  <tr>
                    <th className="py-2.5 px-3">Item #</th>
                    <th className="py-2.5 px-3">Product Name</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3">SKU</th>
                    <th className="py-2.5 px-3 text-right">Quantity Shipped</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {shipmentData.items?.map((it) => (
                    <tr key={it.item_no}>
                      <td className="py-2.5 px-3 font-mono text-slate-400">#{it.item_no}</td>
                      <td className="py-2.5 px-3 font-medium text-white">{it.product_name}</td>
                      <td className="py-2.5 px-3 text-slate-400">{it.category}</td>
                      <td className="py-2.5 px-3 font-mono text-slate-400">{it.sku}</td>
                      <td className="py-2.5 px-3 font-mono font-bold text-indigo-400 text-right">{it.quantity_shipped} units</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
