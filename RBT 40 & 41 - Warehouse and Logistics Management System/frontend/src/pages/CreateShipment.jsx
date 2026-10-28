import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Send, 
  Plus, 
  Trash2, 
  Warehouse, 
  Truck, 
  MapPin, 
  Calendar, 
  CheckCircle2, 
  AlertCircle,
  HelpCircle,
  PackageCheck
} from 'lucide-react';
import api from '../api/client';

export default function CreateShipment() {
  const navigate = useNavigate();

  const [warehouses, setWarehouses] = useState([]);
  const [carriers, setCarriers] = useState([]);
  const [availableWarehouseInventory, setAvailableWarehouseInventory] = useState([]);
  const [loadingPrereqs, setLoadingPrereqs] = useState(true);

  // Form
  const [sourceWarehouseId, setSourceWarehouseId] = useState('');
  const [carrierId, setCarrierId] = useState('');
  const [destinationAddress, setDestinationAddress] = useState('');
  const [estimatedDelivery, setEstimatedDelivery] = useState('');
  const [customTrackingNo, setCustomTrackingNo] = useState('');

  // Items list: [{ product_id: '', quantity_shipped: 1 }]
  const [items, setItems] = useState([
    { product_id: '', quantity_shipped: 1 }
  ]);

  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successInfo, setSuccessInfo] = useState(null);

  // Fetch Warehouses & Carriers on mount
  useEffect(() => {
    async function loadData() {
      try {
        const [whRes, carrierRes] = await Promise.all([
          api.get('/warehouses'),
          api.get('/carriers')
        ]);
        setWarehouses(whRes.data || []);
        setCarriers(carrierRes.data || []);

        if (whRes.data?.length > 0) {
          setSourceWarehouseId(whRes.data[0].warehouse_id);
        }
        if (carrierRes.data?.length > 0) {
          setCarrierId(carrierRes.data[0].carrier_id);
        }

        // Set default ETA to 5 days from today
        const d = new Date();
        d.setDate(d.getDate() + 5);
        setEstimatedDelivery(d.toISOString().split('T')[0]);
      } catch (err) {
        setErrorMessage(err.message);
      } finally {
        setLoadingPrereqs(false);
      }
    }
    loadData();
  }, []);

  // When sourceWarehouseId changes, fetch products and stock in that warehouse
  useEffect(() => {
    if (!sourceWarehouseId) return;

    async function loadWarehouseStock() {
      try {
        const res = await api.get(`/inventory?warehouse_id=${sourceWarehouseId}`);
        setAvailableWarehouseInventory(res.data || []);

        // Reset items with first valid product if available
        if (res.data?.length > 0) {
          setItems([{ product_id: res.data[0].product_id, quantity_shipped: 1 }]);
        } else {
          setItems([{ product_id: '', quantity_shipped: 1 }]);
        }
      } catch (err) {
        console.error(err);
      }
    }

    loadWarehouseStock();
  }, [sourceWarehouseId]);

  const handleAddItem = () => {
    const firstProd = availableWarehouseInventory[0]?.product_id || '';
    setItems([...items, { product_id: firstProd, quantity_shipped: 1 }]);
  };

  const handleRemoveItem = (index) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index, field, value) => {
    const updated = [...items];
    updated[index][field] = value;
    setItems(updated);
  };

  const getStockForProduct = (productId) => {
    const found = availableWarehouseInventory.find(i => String(i.product_id) === String(productId));
    return found ? found.quantity_available : 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessInfo(null);
    setSubmitting(true);

    try {
      const payload = {
        tracking_no: customTrackingNo.trim() || undefined,
        carrier_id: parseInt(carrierId, 10),
        source_warehouse_id: parseInt(sourceWarehouseId, 10),
        destination_address: destinationAddress.trim(),
        estimated_delivery: estimatedDelivery,
        items: items.map(it => ({
          product_id: parseInt(it.product_id, 10),
          quantity_shipped: parseInt(it.quantity_shipped, 10)
        }))
      };

      const res = await api.post('/shipments', payload);
      setSuccessInfo(res.data);
    } catch (err) {
      // Highlights trigger-enforced constraint error!
      setErrorMessage(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-white tracking-tight">Create & Dispatch Shipment</h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Execute multi-item shipment dispatch. Tested directly against the database trigger 
          <code className="text-indigo-400 bg-slate-900 px-1 py-0.5 rounded ml-1 font-mono">trg_deduct_stock</code>.
        </p>
      </div>

      {/* Success Notification */}
      {successInfo && (
        <div className="p-6 bg-emerald-950/50 border border-emerald-800/60 rounded-2xl space-y-3 animate-in fade-in">
          <div className="flex items-center space-x-3">
            <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
            <div>
              <h3 className="text-sm font-bold text-white">Shipment Dispatched Successfully!</h3>
              <p className="text-xs text-emerald-300">
                Database trigger automatically validated stock availability and decremented inventory in source warehouse.
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-4 pt-2 border-t border-emerald-900/60">
            <span className="text-xs text-slate-300">
              Tracking Number: <strong className="font-mono text-emerald-400">{successInfo.tracking_no}</strong>
            </span>
            <Link
              to={`/tracking?no=${successInfo.tracking_no}`}
              className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg font-medium transition-colors"
            >
              Track Shipment Now →
            </Link>
            <button
              onClick={() => {
                setSuccessInfo(null);
                setDestinationAddress('');
                setCustomTrackingNo('');
              }}
              className="text-xs text-slate-400 hover:text-white underline"
            >
              Create Another
            </button>
          </div>
        </div>
      )}

      {/* Error Message (Highlights Trigger failure) */}
      {errorMessage && (
        <div className="p-4 bg-rose-950/60 border border-rose-800/70 rounded-2xl flex items-start space-x-3 animate-in fade-in">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div className="text-xs text-rose-200 space-y-1">
            <p className="font-semibold text-rose-300">Database Constraint / Trigger Rejection:</p>
            <p>{errorMessage}</p>
            <p className="text-[11px] text-rose-400/80">
              Transaction rolled back: No stock was deducted and no partial shipment was committed.
            </p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
        {/* Logistics Routing Section */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-2">
            <Warehouse className="w-4 h-4 text-indigo-400" />
            <span>1. Routing & Carrier Selection</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                Source Warehouse Hub *
              </label>
              <select
                required
                value={sourceWarehouseId}
                onChange={(e) => setSourceWarehouseId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
              >
                {warehouses.map((w) => (
                  <option key={w.warehouse_id} value={w.warehouse_id}>
                    {w.warehouse_name} — {w.city}, {w.state}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                Assigned Carrier *
              </label>
              <select
                required
                value={carrierId}
                onChange={(e) => setCarrierId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
              >
                {carriers.map((c) => (
                  <option key={c.carrier_id} value={c.carrier_id}>
                    {c.company_name} ({c.transport_type} Freight, Rating: {c.rating})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                Destination Consignee Address *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Unit 4B, Electronic City Phase 1, Bangalore, KA"
                value={destinationAddress}
                onChange={(e) => setDestinationAddress(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                Estimated Delivery Date *
              </label>
              <input
                type="date"
                required
                value={estimatedDelivery}
                onChange={(e) => setEstimatedDelivery(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">
              Custom Tracking Number <span className="text-slate-500">(Optional - auto-generated if empty)</span>
            </label>
            <input
              type="text"
              placeholder="e.g. TRK-2026-EXP-9999"
              value={customTrackingNo}
              onChange={(e) => setCustomTrackingNo(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
            />
          </div>
        </div>

        {/* Shipment Items Section */}
        <div className="space-y-4 pt-4 border-t border-slate-800">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-2">
              <PackageCheck className="w-4 h-4 text-emerald-400" />
              <span>2. Cargo Items Manifest</span>
            </h3>

            <button
              type="button"
              onClick={handleAddItem}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center space-x-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Another Item</span>
            </button>
          </div>

          {availableWarehouseInventory.length === 0 ? (
            <div className="p-4 bg-amber-950/40 border border-amber-800/40 rounded-xl text-xs text-amber-300">
              No inventory is currently stocked in this warehouse. Please restock products in this warehouse first or select another source hub.
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((item, index) => {
                const stockAvail = getStockForProduct(item.product_id);
                const isOverStock = item.quantity_shipped > stockAvail;

                return (
                  <div 
                    key={index}
                    className={`p-3.5 bg-slate-800/60 border rounded-xl flex flex-col sm:flex-row sm:items-center gap-3 transition-colors ${
                      isOverStock ? 'border-rose-600/70 bg-rose-950/20' : 'border-slate-700/80'
                    }`}
                  >
                    <div className="flex-1">
                      <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">
                        Product Item #{index + 1}
                      </label>
                      <select
                        value={item.product_id}
                        onChange={(e) => handleItemChange(index, 'product_id', e.target.value)}
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                      >
                        {availableWarehouseInventory.map((inv) => (
                          <option key={inv.product_id} value={inv.product_id}>
                            {inv.product_name} (${inv.price}) — Stock in Hub: {inv.quantity_available} units
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="w-32">
                      <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">
                        Qty to Ship
                      </label>
                      <input
                        type="number"
                        min="1"
                        required
                        value={item.quantity_shipped}
                        onChange={(e) => handleItemChange(index, 'quantity_shipped', e.target.value)}
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                      />
                    </div>

                    <div className="w-36 text-right sm:text-left pt-2 sm:pt-4 text-xs">
                      <span className="text-slate-400">Available: </span>
                      <strong className={`font-mono ${isOverStock ? 'text-rose-400' : 'text-emerald-400'}`}>
                        {stockAvail}
                      </strong>
                      {isOverStock && (
                        <p className="text-[10px] text-rose-400 font-medium">Exceeds Stock!</p>
                      )}
                    </div>

                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(index)}
                        className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-700/50 rounded-lg transition-colors self-end sm:self-center mt-2 sm:mt-4"
                        title="Remove Item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Submit Button */}
        <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
          <p className="text-xs text-slate-500 flex items-center space-x-1">
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Tip: Try ordering more than available stock to witness the SQL trigger in action.</span>
          </p>

          <button
            type="submit"
            disabled={submitting || availableWarehouseInventory.length === 0}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-indigo-600/30 disabled:opacity-50 flex items-center space-x-2"
          >
            <Send className="w-4 h-4" />
            <span>{submitting ? 'Executing SQL Transaction...' : 'Dispatch Shipment'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
