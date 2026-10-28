// In-memory fallback dataset matching seed.sql
// Used when MySQL credentials are not yet configured

const warehouses = [
  { warehouse_id: 1, warehouse_name: 'Apex Western Logistics Hub', state: 'Maharashtra', city: 'Mumbai', locality: 'Bhiwandi Cargo Zone', storage_capacity: 15000, current_stock: 1640, utilization_pct: 10.9, distinct_products_count: 9 },
  { warehouse_id: 2, warehouse_name: 'Capital Express Central Depot', state: 'Delhi', city: 'New Delhi', locality: 'Okhla Industrial Area Phase-II', storage_capacity: 12000, current_stock: 1195, utilization_pct: 10.0, distinct_products_count: 8 },
  { warehouse_id: 3, warehouse_name: 'Silicon Valley Southern Hub', state: 'Karnataka', city: 'Bengaluru', locality: 'Peenya Industrial Estate', storage_capacity: 18000, current_stock: 744, utilization_pct: 4.1, distinct_products_count: 8 },
  { warehouse_id: 4, warehouse_name: 'Coromandel Coastal Logistics', state: 'Tamil Nadu', city: 'Chennai', locality: 'Sriperumbudur SEZ', storage_capacity: 10000, current_stock: 703, utilization_pct: 7.0, distinct_products_count: 6 },
  { warehouse_id: 5, warehouse_name: 'Eastern Gateway Fulfillment Center', state: 'West Bengal', city: 'Kolkata', locality: 'Dankuni Logistics Park', storage_capacity: 14000, current_stock: 885, utilization_pct: 6.3, distinct_products_count: 5 },
];

const products = [
  { product_id: 1, product_name: 'Ergonomic Industrial Barcode Scanner', category: 'Electronics', seller: 'Honeywell Solutions', price: 149.99, sku: 'ELEC-BCS-01', total_stock_available: 360, warehouse_count: 3 },
  { product_id: 2, product_name: 'Thermal Receipt & Shipping Label Printer', category: 'Electronics', seller: 'Zebra Technologies', price: 289.50, sku: 'ELEC-PRT-02', total_stock_available: 250, warehouse_count: 4 },
  { product_id: 3, product_name: 'Heavy Duty Hydraulic Pallet Jack 3-Ton', category: 'Industrial Equipment', seller: 'Torin BigRed Corp', price: 420.00, sku: 'IND-PLJ-03', total_stock_available: 60, warehouse_count: 2 },
  { product_id: 4, product_name: 'High-Strength Poly Strapping Roll (1000m)', category: 'Packaging', seller: 'Signode Packaging', price: 45.00, sku: 'PKG-STR-04', total_stock_available: 760, warehouse_count: 3 },
  { product_id: 5, product_name: 'Industrial Stretch Wrap Film (500mm x 400m)', category: 'Packaging', seller: 'Berry Global', price: 24.50, sku: 'PKG-SWF-05', total_stock_available: 770, warehouse_count: 2 },
  { product_id: 6, product_name: 'Ultra-Rugged Warehouse Tablet (10-inch)', category: 'Electronics', seller: 'Panasonic Toughbook', price: 780.00, sku: 'ELEC-TAB-06', total_stock_available: 115, warehouse_count: 2 },
  { product_id: 7, product_name: 'Reinforced Corrugated Shipping Boxes (Pack of 50)', category: 'Packaging', seller: 'International Paper', price: 62.00, sku: 'PKG-BOX-07', total_stock_available: 1250, warehouse_count: 3 },
  { product_id: 8, product_name: 'Steel Toe Safety Work Boots (Size 10)', category: 'Safety Gear', seller: 'Timberland PRO', price: 115.00, sku: 'SFT-BOT-08', total_stock_available: 345, warehouse_count: 3 },
  { product_id: 9, product_name: 'High-Visibility Reflective Safety Vest (L)', category: 'Safety Gear', seller: '3M Personal Safety', price: 18.50, sku: 'SFT-VST-09', total_stock_available: 8, warehouse_count: 1 },
  { product_id: 10, product_name: 'Digital Heavy Crane Hanging Scale 1000kg', category: 'Industrial Equipment', seller: 'Optima Scales', price: 195.00, sku: 'IND-SCL-10', total_stock_available: 40, warehouse_count: 2 },
  { product_id: 11, product_name: 'Temperature Controlled Pharma Container', category: 'Pharma Logistics', seller: 'CSafe Global', price: 550.00, sku: 'PHM-CTR-11', total_stock_available: 85, warehouse_count: 2 },
  { product_id: 12, product_name: 'Insulated Thermal Pallet Cover', category: 'Packaging', seller: 'Cold Chain Tech', price: 85.00, sku: 'PKG-TPC-12', total_stock_available: 4, warehouse_count: 1 },
  { product_id: 13, product_name: 'Rechargeable LED Forklift Safety Halo Light', category: 'Safety Gear', seller: 'Aero Safety Lights', price: 68.00, sku: 'SFT-FKL-13', total_stock_available: 5, warehouse_count: 1 },
  { product_id: 14, product_name: 'Nitrile Industrial Chemical Gloves (Box of 100)', category: 'Safety Gear', seller: 'Ansell Healthcare', price: 22.00, sku: 'SFT-GLV-14', total_stock_available: 470, warehouse_count: 2 },
  { product_id: 15, product_name: 'Modular Heavy Duty Pallet Racking Upright', category: 'Storage & Racks', seller: 'SSI Schaefer', price: 310.00, sku: 'STR-RCK-15', total_stock_available: 30, warehouse_count: 1 },
  { product_id: 16, product_name: 'Collapsible Heavy Duty Plastic Bulk Container', category: 'Storage & Racks', seller: 'Orbis Corporation', price: 145.00, sku: 'STR-IBC-16', total_stock_available: 105, warehouse_count: 2 },
  { product_id: 17, product_name: 'RFID Long-Range Asset Tracking Tags (100-Pack)', category: 'Electronics', seller: 'Alien Technology', price: 110.00, sku: 'ELEC-RFD-17', total_stock_available: 360, warehouse_count: 2 },
  { product_id: 18, product_name: 'Pneumatic Cushion Air Pillow Roll (500m)', category: 'Packaging', seller: 'Sealed Air', price: 38.00, sku: 'PKG-APR-18', total_stock_available: 180, warehouse_count: 1 },
  { product_id: 19, product_name: 'Emergency Chemical Spill Clean Kit 50L', category: 'Safety Gear', seller: 'New Pig Corp', price: 135.00, sku: 'SFT-SPL-19', total_stock_available: 6, warehouse_count: 1 },
  { product_id: 20, product_name: 'IoT Cold Chain Temperature & GPS Data Logger', category: 'Electronics', seller: 'Sensitech Inc', price: 95.00, sku: 'ELEC-GPS-20', total_stock_available: 95, warehouse_count: 1 },
];

const carriers = [
  {
    carrier_id: 1,
    company_name: 'BlueDart Express Air & Ground',
    transport_type: 'Air',
    rating: 4.8,
    is_active: true,
    total_shipments: 4,
    contacts: [
      { contact: '+91-22-2839-6444', contact_type: 'Toll Free Support' },
      { contact: 'operations@bluedart-express.com', contact_type: 'Dispatch Email' },
      { contact: '+91-98200-11223', contact_type: 'Emergency Hot-line' }
    ]
  },
  {
    carrier_id: 2,
    company_name: 'Delhivery Freight Network',
    transport_type: 'Road',
    rating: 4.6,
    is_active: true,
    total_shipments: 4,
    contacts: [
      { contact: '+91-124-671-9500', contact_type: 'Customer Care' },
      { contact: 'freight.support@delhivery.com', contact_type: 'Dispatch Email' }
    ]
  },
  {
    carrier_id: 3,
    company_name: 'DTDC Express Logistics',
    transport_type: 'Road',
    rating: 4.3,
    is_active: true,
    total_shipments: 3,
    contacts: [
      { contact: '+91-80-2536-5032', contact_type: 'Regional Helpdesk' },
      { contact: 'tracking@dtdc.com', contact_type: 'Email Support' }
    ]
  },
  {
    carrier_id: 4,
    company_name: 'Container Corporation Freight Line',
    transport_type: 'Rail',
    rating: 4.7,
    is_active: true,
    total_shipments: 2,
    contacts: [
      { contact: '+91-11-4167-3093', contact_type: 'Rail Freight Coordination' },
      { contact: 'railfreight@concor.co.in', contact_type: 'Cargo Operations' }
    ]
  },
  {
    carrier_id: 5,
    company_name: 'Maersk Intermodal Sea Shipping',
    transport_type: 'Sea',
    rating: 4.9,
    is_active: true,
    total_shipments: 1,
    contacts: [
      { contact: '+91-22-6658-8888', contact_type: 'Maritime Logistics Desk' },
      { contact: 'booking.india@maersk.com', contact_type: 'Sea Freight Support' }
    ]
  },
];

const inventory = [
  { stock_id: 1, warehouse_id: 1, warehouse_name: 'Apex Western Logistics Hub', city: 'Mumbai', state: 'Maharashtra', product_id: 1, product_name: 'Ergonomic Industrial Barcode Scanner', category: 'Electronics', sku: 'ELEC-BCS-01', price: 149.99, quantity_available: 120, min_threshold: 15, stock_status: 'Healthy', last_restock_date: '2026-09-01' },
  { stock_id: 2, warehouse_id: 1, warehouse_name: 'Apex Western Logistics Hub', city: 'Mumbai', state: 'Maharashtra', product_id: 2, product_name: 'Thermal Receipt & Shipping Label Printer', category: 'Electronics', sku: 'ELEC-PRT-02', price: 289.50, quantity_available: 85, min_threshold: 10, stock_status: 'Healthy', last_restock_date: '2026-09-05' },
  { stock_id: 3, warehouse_id: 1, warehouse_name: 'Apex Western Logistics Hub', city: 'Mumbai', state: 'Maharashtra', product_id: 3, product_name: 'Heavy Duty Hydraulic Pallet Jack 3-Ton', category: 'Industrial Equipment', sku: 'IND-PLJ-03', price: 420.00, quantity_available: 25, min_threshold: 5, stock_status: 'Healthy', last_restock_date: '2026-08-20' },
  { stock_id: 9, warehouse_id: 1, warehouse_name: 'Apex Western Logistics Hub', city: 'Mumbai', state: 'Maharashtra', product_id: 9, product_name: 'High-Visibility Reflective Safety Vest (L)', category: 'Safety Gear', sku: 'SFT-VST-09', price: 18.50, quantity_available: 8, min_threshold: 20, stock_status: 'Low Stock', last_restock_date: '2026-08-15' },
  { stock_id: 17, warehouse_id: 2, warehouse_name: 'Capital Express Central Depot', city: 'New Delhi', state: 'Delhi', product_id: 13, product_name: 'Rechargeable LED Forklift Safety Halo Light', category: 'Safety Gear', sku: 'SFT-FKL-13', price: 68.00, quantity_available: 5, min_threshold: 15, stock_status: 'Low Stock', last_restock_date: '2026-08-25' },
  { stock_id: 28, warehouse_id: 3, warehouse_name: 'Silicon Valley Southern Hub', city: 'Bengaluru', state: 'Karnataka', product_id: 12, product_name: 'Insulated Thermal Pallet Cover', category: 'Packaging', sku: 'PKG-TPC-12', price: 85.00, quantity_available: 4, min_threshold: 15, stock_status: 'Low Stock', last_restock_date: '2026-08-30' },
  { stock_id: 34, warehouse_id: 4, warehouse_name: 'Coromandel Coastal Logistics', city: 'Chennai', state: 'Tamil Nadu', product_id: 19, product_name: 'Emergency Chemical Spill Clean Kit 50L', category: 'Safety Gear', sku: 'SFT-SPL-19', price: 135.00, quantity_available: 6, min_threshold: 12, stock_status: 'Low Stock', last_restock_date: '2026-08-28' },
];

const shipments = [
  {
    shipment_id: 1,
    tracking_no: 'TRK-2026-MUM-1001',
    carrier_id: 1,
    carrier_name: 'BlueDart Express Air & Ground',
    transport_type: 'Air',
    source_warehouse_id: 1,
    source_warehouse_name: 'Apex Western Logistics Hub',
    source_city: 'Mumbai',
    destination_address: 'Plot 45, MIDC Industrial Area, Pune, MH',
    estimated_delivery: '2026-10-02',
    status: 'Delivered',
    created_at: '2026-09-20T10:15:00.000Z',
    total_items_count: 3,
    total_quantity_shipped: 28
  },
  {
    shipment_id: 2,
    tracking_no: 'TRK-2026-MUM-1002',
    carrier_id: 2,
    carrier_name: 'Delhivery Freight Network',
    transport_type: 'Road',
    source_warehouse_id: 1,
    source_warehouse_name: 'Apex Western Logistics Hub',
    source_city: 'Mumbai',
    destination_address: 'Survey 88, Whitefield Tech Zone, Bengaluru, KA',
    estimated_delivery: '2026-10-05',
    status: 'In Transit',
    created_at: '2026-09-26T14:30:00.000Z',
    total_items_count: 2,
    total_quantity_shipped: 40
  },
  {
    shipment_id: 3,
    tracking_no: 'TRK-2026-DEL-2001',
    carrier_id: 3,
    carrier_name: 'DTDC Express Logistics',
    transport_type: 'Road',
    source_warehouse_id: 2,
    source_warehouse_name: 'Capital Express Central Depot',
    source_city: 'New Delhi',
    destination_address: 'Sector 62 Electronic City, Noida, UP',
    estimated_delivery: '2026-09-28',
    status: 'Delivered',
    created_at: '2026-09-24T09:00:00.000Z',
    total_items_count: 2,
    total_quantity_shipped: 10
  },
  {
    shipment_id: 4,
    tracking_no: 'TRK-2026-DEL-2002',
    carrier_id: 4,
    carrier_name: 'Container Corporation Freight Line',
    transport_type: 'Rail',
    source_warehouse_id: 2,
    source_warehouse_name: 'Capital Express Central Depot',
    source_city: 'New Delhi',
    destination_address: 'Container Depot, Tughlakabad, New Delhi',
    estimated_delivery: '2026-10-06',
    status: 'Pending',
    created_at: '2026-09-27T16:45:00.000Z',
    total_items_count: 2,
    total_quantity_shipped: 40
  },
  {
    shipment_id: 5,
    tracking_no: 'TRK-2026-BLR-3001',
    carrier_id: 1,
    carrier_name: 'BlueDart Express Air & Ground',
    transport_type: 'Air',
    source_warehouse_id: 3,
    source_warehouse_name: 'Silicon Valley Southern Hub',
    source_city: 'Bengaluru',
    destination_address: 'Bio-Pharma Tech Hub, Hyderabad, TS',
    estimated_delivery: '2026-10-01',
    status: 'In Transit',
    created_at: '2026-09-26T11:20:00.000Z',
    total_items_count: 2,
    total_quantity_shipped: 12
  },
  {
    shipment_id: 14,
    tracking_no: 'TRK-2026-BLR-3003',
    carrier_id: 1,
    carrier_name: 'BlueDart Express Air & Ground',
    transport_type: 'Air',
    source_warehouse_id: 3,
    source_warehouse_name: 'Silicon Valley Southern Hub',
    source_city: 'Bengaluru',
    destination_address: 'Aerospace SEZ, Devanahalli, Bengaluru, KA',
    estimated_delivery: '2026-09-25',
    status: 'Cancelled',
    created_at: '2026-09-23T16:00:00.000Z',
    total_items_count: 1,
    total_quantity_shipped: 2
  }
];

module.exports = {
  warehouses,
  products,
  carriers,
  inventory,
  shipments
};
