// Backend: Express REST API + MongoDB (Mongoose). Frontend is plain HTML/CSS/JS in /public
const express = require('express');
const mongoose = require('mongoose');
const E = require('./config');
const M = require('./models');
const app = express();
app.use(express.json());
app.use(express.static('public'));

const wrap = fn => (req, res) => fn(req, res).catch(err => res.status(400).json({ error: err.message }));
const refs = e => E[e].fields.filter(f => f[1] === 'ref').map(f => f[0]).join(' ');
const clean = (e, b) => {
  const o = {};
  for (const [n, t] of E[e].fields) if (t !== 'auto' && b[n] !== undefined && b[n] !== '') o[n] = b[n];
  if (e === 'sales') o.total_amount = (+o.quantity || 0) * (+o.price_per_unit || 0);
  return o;
};
const lookup = (from, as) => ({ $lookup: { from, localField: '_id', foreignField: '_id', as } });

app.get('/api/meta', (req, res) => res.json(E));

app.get('/api/counts', wrap(async (req, res) => {
  const counts = {};
  for (const k of Object.keys(E)) counts[k] = await M[k].countDocuments();
  const t = await M.sales.aggregate([{ $group: { _id: null, s: { $sum: '$total_amount' } } }]);
  res.json({ counts, revenue: t[0]?.s || 0 });
}));

app.get('/api/reports', wrap(async (req, res) => {
  const out = [];
  let d = await M.sales.aggregate([{ $group: { _id: '$farmer', total: { $sum: '$total_amount' }, n: { $sum: 1 } } },
    lookup('farmers', 'f'), { $unwind: '$f' }, { $sort: { total: -1 } }]);
  out.push({ title: 'Total sales per farmer ($group + $lookup)', head: ['Farmer', 'Sales count', 'Total amount'],
    rows: d.map(x => [x.f.first_name + ' ' + x.f.last_name, x.n, x.total]) });
  d = await M.lands.aggregate([{ $group: { _id: '$farmer', area: { $sum: '$area' }, n: { $sum: 1 } } },
    lookup('farmers', 'f'), { $unwind: '$f' }, { $sort: { area: -1 } }]);
  out.push({ title: 'Total land area per farmer ($group + $sum)', head: ['Farmer', 'No. of lands', 'Total area'],
    rows: d.map(x => [x.f.first_name + ' ' + x.f.last_name, x.n, x.area]) });
  d = await M.cultivations.aggregate([{ $group: { _id: '$crop', actual: { $avg: '$actual_yield' }, n: { $sum: 1 } } },
    lookup('crops', 'c'), { $unwind: '$c' }, { $project: { name: '$c.crop_name', expected: '$c.expected_yield', actual: 1, n: 1 } }]);
  out.push({ title: 'Crop-wise expected vs actual yield ($lookup + $project)', head: ['Crop', 'Cultivations', 'Expected yield', 'Avg actual yield'],
    rows: d.map(x => [x.name, x.n, x.expected, +(x.actual || 0).toFixed(1)]) });
  d = await M.sales.find({ payment_status: 'Pending' }).populate('farmer buyer crop');
  out.push({ title: 'Pending payments ($match)', head: ['Date', 'Farmer', 'Buyer', 'Crop', 'Amount'],
    rows: d.map(x => [x.sale_date.toISOString().slice(0, 10), x.farmer.first_name, x.buyer.buyer_name, x.crop.crop_name, x.total_amount]) });
  res.json(out);
}));

app.use('/api/:e', (req, res, next) => E[req.params.e] ? next() : res.status(404).json({ error: 'Unknown entity' }));
app.get('/api/:e', wrap(async (req, res) => {
  const { e } = req.params, q = (req.query.q || '').trim();
  const filter = q ? { $or: E[e].fields.filter(f => f[1] === 'text' || f[1].startsWith('select'))
    .map(f => ({ [f[0]]: { $regex: q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' } })) } : {};
  res.json(await M[e].find(filter).populate(refs(e)).sort({ createdAt: -1 }));
}));
app.get('/api/:e/:id', wrap(async (req, res) => res.json(await M[req.params.e].findById(req.params.id))));
app.post('/api/:e', wrap(async (req, res) => res.status(201).json(await M[req.params.e].create(clean(req.params.e, req.body)))));
app.put('/api/:e/:id', wrap(async (req, res) =>
  res.json(await M[req.params.e].findByIdAndUpdate(req.params.id, clean(req.params.e, req.body), { new: true, runValidators: true }))));
app.delete('/api/:e/:id', wrap(async (req, res) => { await M[req.params.e].findByIdAndDelete(req.params.id); res.json({ ok: true }); }));

const URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/agri_management';
mongoose.connect(URI).then(() => app.listen(3000, () => console.log('Open http://localhost:3000')))
  .catch(err => console.error('MongoDB connection failed:', err.message));
