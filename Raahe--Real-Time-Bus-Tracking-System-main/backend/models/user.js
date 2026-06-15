// models/user.js
const mongoose = require('mongoose');

const EmergencyContactSchema = new mongoose.Schema({
  label: { type: String, trim: true },
  phone: { type: String, trim: true }, // store E.164 like +9198xxxxxxx
}, { _id: false });

const userSchema = new mongoose.Schema({
  fullName: { type: String, required: true, trim: true },

  // required for user/admin; optional for driver (OTP flow)
  email: {
    type: String,
    trim: true,
    index: true,
    required: function () { return this.role !== 'driver'; },
    sparse: true,
    unique: false, // keep non-unique if you want multiple drivers without email
  },

  // required for user/admin; not required for driver (OTP)
  password: {
    type: String,
    required: function () { return this.role !== 'driver'; },
  },

  // unique when present; drivers will log in with this
  phoneNumber: {
    type: String,
    trim: true,
    index: true,
    unique: true,
    sparse: true, // allows many docs without phoneNumber
  },

  emergencyContacts: {
    type: [EmergencyContactSchema],
    default: [],
    validate: v => Array.isArray(v) && v.length <= 5, // cap if you want
  },

  createdAt: { type: Date, default: Date.now },
  role: { type: String, enum: ['user', 'admin', 'driver'], default: 'user' },

  route: { type: mongoose.Schema.Types.ObjectId, ref: "Route", default: null },

  // driver-only
  licenseNumber: { type: String, trim: true },
  vehicleNumber: { type: String, trim: true },

  // admin-only
  adminSecret: { type: String, trim: true },
});

// helper index if you also want to enforce unique emails for non-drivers
userSchema.index({ email: 1 }, { unique: true, sparse: true });

userSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.password;
    return ret;
  }
});

const User = mongoose.model('User', userSchema);
module.exports = User;
