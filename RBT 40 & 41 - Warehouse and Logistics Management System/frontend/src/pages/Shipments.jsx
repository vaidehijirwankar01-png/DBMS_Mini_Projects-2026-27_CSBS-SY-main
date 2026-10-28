import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Send, 
  Search, 
  Filter, 
  Eye, 
  Trash2, 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  Truck, 
  Clock, 
  AlertCircle,
  PlusCircle,
  Package
} from 'lucide-react';
import api from '../api/client';
import Modal from '../components/Modal';
import Badge from '../components/Badge';

export default function Shipments() {
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Detailed modal
  const [selectedShipment, setSelectedShipment] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [statusActionMessage, setStatusActionMessage] = useState('');

  const fetchShipments = async () => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      if (searchTerm) params.search = searchTerm;

      const res = await api.get('/shipments', { params });
      setShipments(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchShipments();
    }, 200);
    return () => clearTimeout(timer);
  }, [statusFilter, searchTerm]);

  const handleViewDetail = async (id) => {
    try {
      const res = await api.get(`/shipments/${id}`);
      setSelectedShipment(res.data);
      setIsDetailOpen(true);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleUpdateStatus = async (id, newStatus) => {
    setStatusActionMessage('');
    try {
      const res = await api.patch(`/shipments/${id}/status`, { status: newStatus });
      setStatusActionMessage(res.message);
      fetchShipments();

      // If open in modal, refresh
      if (selectedShipment && selectedShipment.shipment_id === id) {
        setSelectedShipment({ ...selectedShipment, status: newStatus });
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDelete = async (id, trackingNo) => {
    if (!window.confirm(`Delete shipment record "${trackingNo}"?`)) return;
    try {
      await api.delete(`/shipments/${id}`);
      fetchShipments();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Top Banner & Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Shipment Dispatches & Logistics Orders</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Track dispatches, update pipeline milestones, and test stock restoration on cancellation.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search tracking # / destination..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-500 w-60"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
          >
            <option value="">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="In Transit">In Transit</option>
            <option value="Delivered">Delivered</option>
            <option value="Cancelled">Cancelled</option>
          </select>

          <Link
            to="/create-shipment"
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition-all shadow-md shadow-indigo-600/20 flex items-center space-x-1.5"
          >
            <PlusCircle className="w-4 h-4" />
            <span>New Shipment</span>
          </Link>
        </div>
      </div>

      {/* Action feedback message */}
      {statusActionMessage && (
        <div className="p-3 bg-indigo-950/60 border border-indigo-800/60 rounded-xl text-xs text-indigo-300 flex items-center justify-between animate-in fade-in">
          <span>{statusActionMessage}</span>
          <button onClick={() => setStatusActionMessage('')} className="text-indigo-400 hover:text-white text-xs underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Shipments Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            <RefreshCw className="w-6 h-6 text-indigo-500 animate-spin mx-auto mb-2" />
            Loading dispatches...
          </div>
        ) : shipments.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-sm">
            No shipments found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-800/80 text-slate-400 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">Tracking #</th>
                  <th className="py-3 px-4">Origin Hub</th>
                  <th className="py-3 px-4">Carrier</th>
                  <th className="py-3 px-4">Destination</th>
                  <th className="py-3 px-4">Cargo Units</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Est. Delivery</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {shipments.map((s) => (
                  <tr key={s.shipment_id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-indigo-300">
                      <Link to={`/tracking?no=${s.tracking_no}`} className="hover:underline">
                        {s.tracking_no}
                      </Link>
                    </td>
                    <td className="py-3 px-4 text-white font-medium">
                      <div>{s.source_warehouse_name}</div>
                      <div className="text-[10px] text-slate-500">{s.source_city}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-slate-200">{s.carrier_name}</div>
                      <div className="text-[10px] text-slate-500">{s.transport_type} Freight</div>
                    </td>
                    <td className="py-3 px-4 text-slate-400 truncate max-w-xs" title={s.destination_address}>
                      {s.destination_address}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-200">
                      {s.total_quantity_shipped} <span className="text-[10px] font-normal text-slate-500">({s.total_items_count} items)</span>
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant={
                        s.status === 'Delivered' ? 'delivered' :
                        s.status === 'In Transit' ? 'inTransit' :
                        s.status === 'Cancelled' ? 'cancelled' : 'pending'
                      }>
                        {s.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-slate-400 font-mono">
                      {s.estimated_delivery ? s.estimated_delivery.split('T')[0] : 'N/A'}
                    </td>
                    <td className="py-3 px-4 text-right space-x-1">
                      <button
                        onClick={() => handleViewDetail(s.shipment_id)}
                        className="p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-slate-800 rounded-lg transition-colors"
                        title="View Manifest & Carrier"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      {s.status !== 'Delivered' && s.status !== 'Cancelled' && (
                        <>
                          <button
                            onClick={() => handleUpdateStatus(s.shipment_id, 'In Transit')}
                            className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-slate-800 rounded-lg transition-colors"
                            title="Set In Transit"
                          >
                            <Truck className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleUpdateStatus(s.shipment_id, 'Delivered')}
                            className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded-lg transition-colors"
                            title="Set Delivered"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleUpdateStatus(s.shipment_id, 'Cancelled')}
                            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
                            title="Cancel Shipment (Restores Stock via Trigger)"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </>
                      )}

                      <button
                        onClick={() => handleDelete(s.shipment_id, s.tracking_no)}
                        className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
                        title="Delete Shipment"
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

      {/* Shipment Manifest Detail Modal */}
      <Modal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        title={`Shipment Manifest: ${selectedShipment?.tracking_no}`}
        maxWidth="max-w-2xl"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 p-3.5 bg-slate-800/50 rounded-xl text-xs">
            <div>
              <p className="text-slate-400">Source Warehouse:</p>
              <p className="text-white font-semibold mt-0.5">{selectedShipment?.source_warehouse_name}</p>
              <p className="text-[11px] text-slate-400">{selectedShipment?.source_warehouse_locality}, {selectedShipment?.source_warehouse_city}</p>
            </div>
            <div>
              <p className="text-slate-400">Carrier Partner:</p>
              <p className="text-white font-semibold mt-0.5">{selectedShipment?.carrier_name}</p>
              <p className="text-[11px] text-slate-400">{selectedShipment?.transport_type} Freight (Rating: {selectedShipment?.carrier_rating})</p>
            </div>
          </div>

          <div className="p-3 bg-slate-800/30 rounded-xl text-xs space-y-1">
            <p className="text-slate-400">Destination Address:</p>
            <p className="text-slate-200 font-medium">{selectedShipment?.destination_address}</p>
            <p className="text-slate-400 pt-1">
              Estimated Delivery: <strong className="text-white font-mono">{selectedShipment?.estimated_delivery ? selectedShipment.estimated_delivery.split('T')[0] : 'N/A'}</strong>
            </p>
          </div>

          {/* Manifest Items Table */}
          <div>
            <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider mb-2">Manifest Cargo Items (Shipment_Item Weak Entity)</h4>
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-800 text-slate-400 uppercase text-[10px]">
                <tr>
                  <th className="py-2 px-3 rounded-l-lg">Item #</th>
                  <th className="py-2 px-3">Product Name</th>
                  <th className="py-2 px-3">SKU</th>
                  <th className="py-2 px-3">Unit Price</th>
                  <th className="py-2 px-3">Qty Shipped</th>
                  <th className="py-2 px-3 rounded-r-lg text-right">Line Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {selectedShipment?.items?.map((it) => (
                  <tr key={it.item_no}>
                    <td className="py-2.5 px-3 font-mono text-slate-400">#{it.item_no}</td>
                    <td className="py-2.5 px-3 font-semibold text-white">{it.product_name}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-400">{it.sku}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-300">${Number(it.price).toFixed(2)}</td>
                    <td className="py-2.5 px-3 font-mono font-bold text-indigo-400">{it.quantity_shipped}</td>
                    <td className="py-2.5 px-3 font-mono font-bold text-emerald-400 text-right">${Number(it.line_total).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Status Quick Update Inside Modal */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
            <span className="text-xs text-slate-400">
              Current Status: <strong className="text-white ml-1">{selectedShipment?.status}</strong>
            </span>

            <div className="flex items-center space-x-2">
              {selectedShipment?.status !== 'Delivered' && selectedShipment?.status !== 'Cancelled' && (
                <>
                  <button
                    onClick={() => handleUpdateStatus(selectedShipment.shipment_id, 'In Transit')}
                    className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-medium"
                  >
                    In Transit
                  </button>
                  <button
                    onClick={() => handleUpdateStatus(selectedShipment.shipment_id, 'Delivered')}
                    className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-medium"
                  >
                    Delivered
                  </button>
                  <button
                    onClick={() => handleUpdateStatus(selectedShipment.shipment_id, 'Cancelled')}
                    className="px-2.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-medium"
                  >
                    Cancel Shipment
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
