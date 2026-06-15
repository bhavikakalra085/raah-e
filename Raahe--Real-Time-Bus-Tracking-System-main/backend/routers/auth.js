// backend/routers/auth.js
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const User = require('../models/user');
const { authenticateJWT } = require('../middlewares/auth'); // expects authenticateJWT exported

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'dev_jwt_secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '8h';

/**
 * POST /api/auth/register
 * body: { fullName, email, password, phoneNumber, role, licenseNumber, vehicleNumber, adminSecret }
 */
router.post('/register', async (req, res) => {
  try {
    const { fullName, email, password, phoneNumber, role = 'user', licenseNumber, vehicleNumber, adminSecret } = req.body;
    if (!fullName || !email || !password) {
      return res.status(400).json({ message: 'fullName, email and password are required' });
    }

    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ message: 'User already exists' });

    const hashed = await bcrypt.hash(password, 10);
    const user = new User({
      fullName,
      email,
      password: hashed,
      phoneNumber,
      role,
      licenseNumber: role === 'driver' ? licenseNumber : undefined,
      vehicleNumber: role === 'driver' ? vehicleNumber : undefined,
      adminSecret: role === 'admin' ? adminSecret : undefined
    });

    await user.save();
    // do NOT return password
    const safe = user.toObject();
    delete safe.password;
    res.status(201).json({ user: safe });
  } catch (err) {
    console.error('register error', err);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * POST /api/auth/login
 * body: { email, password }
 * returns { token, user }
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Email and password required' });

    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ message: 'Invalid credentials' });

    const payload = { sub: user._id.toString(), role: user.role };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    const safe = user.toObject();
    delete safe.password;

    res.json({ token, user: safe });
  } catch (err) {
    console.error('login error', err);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * GET /api/auth/me
 * header: Authorization: Bearer <token>
 * returns { user }
 */
// routes/auth.js (or new middleware file)
function authMiddleware(req, _res, next) {
  const hdr = req.headers.authorization || '';
  const token = hdr.startsWith('Bearer ') ? hdr.slice(7) : null;
  if (!token) return next(); // unauthenticated allowed for some routes
  try {
    req.userJwt = jwt.verify(token, JWT_SECRET);
  } catch { /* ignore */ }
  next();
}

// apply once near top (after router init)
router.use(authMiddleware);

router.get('/me', async (req, res) => {
  try {
    if (!req.userJwt?.sub) return res.status(401).json({ message: 'Unauthenticated' });
    const user = await User.findById(req.userJwt.sub).lean();
    if (!user) return res.status(404).json({ message: 'User not found' });
    // Return fields WomenSafety expects
    return res.json({
      user: {
        _id: user._id,
        fullName: user.fullName,
        role: user.role,
        phoneNumber: user.phoneNumber,
        emergencyContacts: user.emergencyContacts || [],
      }
    });
  } catch (e) {
    console.error('/me error', e);
    res.status(500).json({ message: 'Server error' });
  }
});


function normalizePhone(raw) {
  if (!raw) return '';
  const s = String(raw).replace(/[^\d+]/g, '');
  if (/^\d{10}$/.test(s)) return '+91' + s;           // common India case
  if (/^\+?\d{7,15}$/.test(s)) return s.startsWith('+') ? s : '+' + s;
  return s; // last resort; you can also reject invalids
}


module.exports = router;
