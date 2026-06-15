// routes/auth.js
const express = require('express');
const router = express.Router();
const User = require('../models/user');
const Otp = require('../models/otp');   // <- newly imported
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
require('dotenv').config();


// Optional Twilio (install `twilio` if using SMS sending)
let twilioClient = null;
if (process.env.TWILIO_SID && process.env.TWILIO_AUTH_TOKEN) {
  try {
    const twilio = require('twilio');
    twilioClient = twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH_TOKEN);
  } catch (e) {
    console.warn('Twilio module not available or failed to init:', e.message);
  }
}

// config
const JWT_SECRET = process.env.JWT_SECRET || 'dev_jwt_secret';
const OTP_SECRET = process.env.OTP_SECRET || 'dev_otp_secret';
const OTP_TTL_SECONDS = parseInt(process.env.OTP_TTL_SECONDS || '300', 10); // 5 minutes
const OTP_LENGTH = parseInt(process.env.OTP_LENGTH || '6', 10);

// --- OTP model (simple, stored here so you don't need a separate file) ---
// const mongoose = require('mongoose');
// const OtpSchema = new mongoose.Schema({
//   phone: { type: String, index: true },
//   otpHash: { type: String, required: true },
//   createdAt: { type: Date, default: Date.now },
//   expiresAt: { type: Date, required: true },
//   attempts: { type: Number, default: 0 },
//   used: { type: Boolean, default: false },
// });
// // TTL index that removes docs when expiresAt < now
// OtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// const Otp = mongoose.models.Otp || mongoose.model('Otp', OtpSchema);


function normalizePhone(raw) {
  if (!raw) return '';
  const s = String(raw).replace(/[^\d+]/g, '');
  if (/^\d{10}$/.test(s)) return '+91' + s;           // common India case
  if (/^\+?\d{7,15}$/.test(s)) return s.startsWith('+') ? s : '+' + s;
  return s; // last resort; you can also reject invalids
}

// --- helpers ---
function genNumericOtp(length = 6) {
  const min = 10 ** (length - 1);
  const max = 10 ** length - 1;
  return String(Math.floor(Math.random() * (max - min + 1)) + min);
}
function hashOtp(phone, otp) {
  // HMAC-SHA256 keyed by server secret
  return crypto.createHmac('sha256', OTP_SECRET).update(`${phone}:${otp}`).digest('hex');
}
function signToken(user) {
  return jwt.sign(
    {
      sub: user._id.toString(),
      role: user.role,
      fullName: user.fullName || '',
      phoneNumber: user.phoneNumber || '',
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}


// --- rate limiter for sending OTPs (by IP) ---
const sendOtpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 min
  max: 6, // max requests per window per IP
  standardHeaders: true,
  legacyHeaders: false,
});

// ------------------ Existing register route ------------------
// routes/auth.js (inside your existing /register)
// routes/auth.js (/register handler)
router.post('/register', async (req, res) => {
  const {
    fullName, email, password, phoneNumber,
    role, licenseNumber, vehicleNumber, adminSecret,
    emergencyContacts = []
  } = req.body || {};

  const roleSafe = (role || 'user').trim();
  if (!fullName?.trim()) return res.status(400).json({ message: 'fullName is required' });

  // role-specific requireds
  if (roleSafe !== 'driver') {
    if (!email || !password) {
      return res.status(400).json({ message: 'Email & password are required for non-driver' });
    }
  } else {
    if (!phoneNumber) {
      return res.status(400).json({ message: 'phoneNumber is required for driver' });
    }
  }

  try {
    const emailNorm = (roleSafe !== 'driver' && email) ? String(email).trim().toLowerCase() : undefined;

    // Uniqueness checks only if the field exists
    if (emailNorm) {
      const exists = await User.findOne({ email: emailNorm }).lean();
      if (exists) return res.status(400).json({ message: 'User with this email already exists' });
    }
    if (phoneNumber) {
      const phoneNorm = normalizePhone(phoneNumber);
      const existsPhone = await User.findOne({ phoneNumber: phoneNorm }).lean();
      if (existsPhone) return res.status(400).json({ message: 'User with this phone already exists' });
    }

    const contactsClean = (Array.isArray(emergencyContacts) ? emergencyContacts : [])
      .map(c => ({ label: (c?.label || '').trim(), phone: normalizePhone(c?.phone || c?.number || '') }))
      .filter(c => !!c.phone);

    const doc = new User({
      fullName: fullName.trim(),
      role: roleSafe,
      ...(emailNorm ? { email: emailNorm } : {}),                          // omit if undefined
      ...(roleSafe !== 'driver' && password ? { password: await bcrypt.hash(password, 10) } : {}),
      ...(phoneNumber ? { phoneNumber: normalizePhone(phoneNumber) } : {}),
      ...(roleSafe === 'user' ? { emergencyContacts: contactsClean } : {}),

      ...(roleSafe === 'driver' ? {
        licenseNumber: (licenseNumber || '').trim(),
        vehicleNumber: (vehicleNumber || '').trim(),
      } : {}),

      ...(roleSafe === 'admin' ? { adminSecret: (adminSecret || '').trim() } : {}),
    });

    await doc.save();
    return res.status(201).json({ message: 'User registered successfully', user: doc.toJSON() });
  } catch (error) {
    console.error('Error registering user:', error);
    if (error?.code === 11000) {
      const field = Object.keys(error.keyPattern || {})[0] || 'field';
      return res.status(400).json({ message: `Duplicate ${field}` });
    }
    return res.status(500).json({ message: 'Server error' });
  }
});



// ------------------ List users (unchanged) ------------------
router.get('/', async(req, res)=>{
  try {
      const users = await User.find().select('-password');
      res.json(users);
  } catch (error) {
      console.error('Error fetching users:', error);
      res.status(500).json({ message: 'Server error' });
  }
});

// ------------------ Email/password login ------------------
router.post('/login', async (req, res) => {
  try {
    const { email, password, role } = req.body || {};
    if (!email || !password) return res.status(400).json({ message: 'Email and password required' });

    const user = await User.findOne({ email }).exec();
    if (!user) return res.status(401).json({ message: 'Invalid credentialss' });

    // optional: enforce role match if provided
    if (role && user.role !== role) return res.status(403).json({ message: 'Role mismatch' });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ message: 'Invalid credentials' });

    const token = signToken(user);
    return res.json({ token, user: { _id: user._id, fullName: user.fullName, email: user.email, role: user.role, phoneNumber: user.phoneNumber } });
  } catch (err) {
    console.error('Login error', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ------------------ Send OTP (driver) ------------------
router.post('/send-otp', sendOtpLimiter, async (req, res) => {
  try {
    const { phone, role } = req.body || {};
    if (!phone || role !== 'driver') return res.status(400).json({ message: 'Invalid request' });
    if (!/^\+?\d{7,15}$/.test(phone)) return res.status(400).json({ message: 'Invalid phone' });

    // Invalidate previous unused OTPs for this phone
    await Otp.updateMany({ phone, used: false }, { used: true }).exec();

    const code = genNumericOtp(OTP_LENGTH);
    const doc = new Otp({
      phone,
      otpHash: hashOtp(phone, code),
      expiresAt: new Date(Date.now() + OTP_TTL_SECONDS * 1000),
    });
    await doc.save();

    // Try sending SMS if Twilio configured; otherwise log in dev
    if (twilioClient && process.env.TWILIO_FROM) {
      try {
        await twilioClient.messages.create({
          to: phone,
          from: process.env.TWILIO_FROM,
          body: `Your verification code is ${code}. It expires in ${Math.floor(OTP_TTL_SECONDS/60)} minutes.`,
        });
      } catch (smsErr) {
        console.error('SMS send failed', smsErr);
        // cleanup OTP doc if sending failed
        await Otp.deleteOne({ _id: doc._id });
        return res.status(500).json({ message: 'Failed to send OTP' });
      }
    } else {
      // DEV fallback: log the OTP (do not do this in production)
      if (process.env.NODE_ENV !== 'production') {
        console.log(`[DEV OTP] ${phone} -> ${code}`);
      }
    }

    return res.json({ success: true, message: 'OTP sent' });
  } catch (err) {
    console.error('send-otp error', err);
    return res.status(500).json({ message: 'Internal error' });
  }
});

// ------------------ Verify OTP (driver) ------------------
router.post('/verify-otp', async (req, res) => {
  try {
    const { phone, otp, role } = req.body || {};
    if (!phone || !otp || role !== 'driver') return res.status(400).json({ message: 'Invalid request' });

    // find latest unused otp
    const otpRecord = await Otp.findOne({ phone, used: false }).sort({ createdAt: -1 }).exec();
    if (!otpRecord) return res.status(400).json({ message: 'No valid OTP found or expired' });

    if (otpRecord.attempts >= 5) {
      return res.status(429).json({ message: 'Too many attempts. Try again later.' });
    }

    const expected = hashOtp(phone, otp);
    if (expected !== otpRecord.otpHash) {
      otpRecord.attempts += 1;
      await otpRecord.save();
      return res.status(401).json({ message: 'Invalid OTP' });
    }

    // success: mark used
    otpRecord.used = true;
    await otpRecord.save();

    // find driver user by phone; if not exist, create one (adjust as you need)
    let user = await User.findOne({ phoneNumber: phone }).exec();
    if (!user) {
      user = new User({ fullName: '', email: undefined, password: undefined, phoneNumber: phone, role: 'driver' });
      await user.save();
    }

    const token = signToken(user);
    return res.json({ token, user: { _id: user._id, fullName: user.fullName, phoneNumber: user.phoneNumber, role: user.role }});
  } catch (err) {
    console.error('verify-otp error', err);
    return res.status(500).json({ message: 'Internal error' });
  }
});

module.exports = router;