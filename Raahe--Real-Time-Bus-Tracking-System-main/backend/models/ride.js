// models/ride.js
const mongoose = require('mongoose');

const GeoPointSchema = new mongoose.Schema({
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], default: [0,0] } // [lng, lat]
  }, { _id: false });

const LocationPoint = new mongoose.Schema({
  lat: Number,
  lng: Number,
  speed: Number,      // optional meters/sec
  accuracy: Number,   // optional
  ts: { type: Date, default: Date.now }
}, { _id: false });

const RideSchema = new mongoose.Schema({
  driver: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  route: { type: mongoose.Schema.Types.ObjectId, ref: 'Route', required: true },
  status: { type: String, enum: ['not_started','ongoing','paused','ended'], default: 'not_started' },
  startedAt: Date,
  pausedAt: Date,
  endedAt: Date,
  // location history appended during ride
  locations: { type: [LocationPoint], default: [] },
  // last known location for quick lookup:
  lastLocation: LocationPoint,

  lastLocation: LocationPoint,
lastLocationGeo: { type: GeoPointSchema, default: { type: 'Point', coordinates: [0,0] } },
  // current stop index on route (optional)
  currentStopIndex: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});
RideSchema.index({ lastLocationGeo: '2dsphere' });

module.exports = mongoose.models.Ride || mongoose.model('Ride', RideSchema);
