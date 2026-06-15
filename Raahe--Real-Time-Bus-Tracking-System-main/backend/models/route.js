// backend/models/route.js
const mongoose = require("mongoose");

const StopSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    lat: { type: Number, default: null },  // optional coordinate
    lng: { type: Number, default: null },  // optional coordinate
    order: { type: Number, default: 0 },
  },
  { _id: false }
);

const RouteSchema = new mongoose.Schema({
  fullName: { type: String, required: true, trim: true }, // e.g. "Amritsar → Ludhiana"
  code: { type: String, trim: true },
  stops: { type: [StopSchema], default: [] },
  startTime: { type: String, trim: true }, // "HH:mm"
  endTime: { type: String, trim: true },
  createdAt: { type: Date, default: Date.now },
});

// Optional: unique route code if you choose to use it
// RouteSchema.index({ code: 1 }, { unique: true, sparse: true });

module.exports = mongoose.models?.Route || mongoose.model("Route", RouteSchema);
