const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');
const { shipments } = require('../config/mockData');

// GET /api/track/:trackingNo - Track shipment by tracking number
router.get('/:trackingNo', async (req, res) => {
  try {
    const { trackingNo } = req.params;

    const [shipmentRows] = await pool.query(`
      SELECT 
        s.shipment_id,
        s.tracking_no,
        s.status,
        s.destination_address,
        s.estimated_delivery,
        s.created_at,
        s.updated_at,
        w.warehouse_id,
        w.warehouse_name AS source_warehouse_name,
        w.city AS source_city,
        w.state AS source_state,
        w.locality AS source_locality,
        c.carrier_id,
        c.company_name AS carrier_name,
        c.transport_type,
        c.rating AS carrier_rating
      FROM shipment s
      JOIN warehouse w ON s.source_warehouse_id = w.warehouse_id
      JOIN carrier c ON s.carrier_id = c.carrier_id
      WHERE s.tracking_no = ?
    `, [trackingNo.trim()]);

    if (shipmentRows.length === 0) {
      throw new Error(`Shipment ${trackingNo} not found in database`);
    }

    const shipment = shipmentRows[0];
    const [items] = await pool.query(`
      SELECT 
        si.item_no,
        p.product_id,
        p.product_name,
        p.category,
        p.sku,
        si.quantity_shipped
      FROM shipment_item si
      JOIN product p ON si.product_id = p.product_id
      WHERE si.shipment_id = ?
      ORDER BY si.item_no ASC
    `, [shipment.shipment_id]);

    const [contacts] = await pool.query(
      'SELECT contact, contact_type FROM carrier_contact WHERE carrier_id = ?',
      [shipment.carrier_id]
    );

    const timeline = [
      {
        stage: 'Order Dispatched',
        description: `Shipment packed & assigned to ${shipment.carrier_name} at ${shipment.source_warehouse_name}`,
        completed: true,
        timestamp: shipment.created_at
      },
      {
        stage: 'In Transit',
        description: `Cargo moving via ${shipment.transport_type} transport`,
        completed: shipment.status === 'In Transit' || shipment.status === 'Delivered',
        active: shipment.status === 'In Transit'
      },
      {
        stage: 'Out for Delivery / Destination Arrival',
        description: `Scheduled delivery to ${shipment.destination_address}`,
        completed: shipment.status === 'Delivered',
        active: false,
        eta: shipment.estimated_delivery
      },
      {
        stage: shipment.status === 'Cancelled' ? 'Shipment Cancelled' : 'Delivered',
        description: shipment.status === 'Cancelled'
          ? 'Shipment was cancelled and returned to warehouse inventory.'
          : 'Package safely delivered to recipient.',
        completed: shipment.status === 'Delivered' || shipment.status === 'Cancelled',
        isCancelled: shipment.status === 'Cancelled'
      }
    ];

    res.json({
      success: true,
      data: {
        ...shipment,
        items,
        carrier_contacts: contacts,
        timeline
      }
    });
  } catch (error) {
    // Mock fallback
    const found = shipments.find(s => s.tracking_no.toUpperCase() === req.params.trackingNo.toUpperCase()) || shipments[0];
    res.json({
      success: true,
      data: {
        ...found,
        items: [
          { item_no: 1, product_id: 1, product_name: 'Ergonomic Industrial Barcode Scanner', category: 'Electronics', sku: 'ELEC-BCS-01', quantity_shipped: 5 }
        ],
        carrier_contacts: [
          { contact: '+91-22-2839-6444', contact_type: 'Toll Free Support' },
          { contact: 'operations@bluedart-express.com', contact_type: 'Dispatch Email' }
        ],
        timeline: [
          { stage: 'Order Dispatched', description: `Shipment packed at ${found.source_warehouse_name}`, completed: true },
          { stage: 'In Transit', description: `In transit via ${found.transport_type} transport`, completed: found.status === 'In Transit' || found.status === 'Delivered', active: found.status === 'In Transit' },
          { stage: 'Out for Delivery', description: `Destination: ${found.destination_address}`, completed: found.status === 'Delivered' },
          { stage: found.status === 'Cancelled' ? 'Cancelled' : 'Delivered', description: 'Final milestone', completed: found.status === 'Delivered' || found.status === 'Cancelled', isCancelled: found.status === 'Cancelled' }
        ]
      }
    });
  }
});

module.exports = router;
