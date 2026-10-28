const mongoose = require('mongoose');
const E = require('./config');
const M = {};
for (const [key, ent] of Object.entries(E)) {
  const def = {};
  for (const [n, t, ref] of ent.fields) {
    def[n] = t === 'ref' ? { type: mongoose.Schema.Types.ObjectId, ref: ref, required: true }
           : t === 'number' || t === 'auto' ? Number
           : t === 'date' ? Date : String;
  }
  M[key] = mongoose.model(key, new mongoose.Schema(def, { timestamps: true }), key);
}
module.exports = M;
