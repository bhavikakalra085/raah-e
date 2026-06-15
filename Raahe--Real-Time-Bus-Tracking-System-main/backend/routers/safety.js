// backend/routers/safety.js
const express = require("express");
const router = express.Router();
const Ride = require("../models/ride");
const User = require("../models/user");
const Route = require("../models/route");
const geolib = require("geolib");

// Twilio optional init
let twilioClient = null;
const TWILIO_FROM = process.env.TWILIO_FROM || null;
if (process.env.TWILIO_SID && process.env.TWILIO_AUTH_TOKEN) {
  try {
    const twilio = require("twilio");
    twilioClient = twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH_TOKEN);
  } catch (e) {
    console.warn("Twilio module not available / failed to init:", e.message);
  }
}

/**
 * Utility: safe SMS trimming for Twilio trial accounts.
 * Trial accounts prepend a prefix (e.g. "Sent from your Twilio trial account - "),
 * so we conservatively limit user-visible body to MAX_USER_BODY characters.
 *
 * For trial accounts choose a conservative limit (120). For paid accounts you may
 * increase this (160 - prefix length or higher).
 */
const MAX_USER_BODY = 160; // conservative for Twilio trial prefix

/**
 * Build a concise safety message from provided info.
 * We'll try to include the most important fields, then trim longer fields if needed.
 */
function buildSafetyMessage({ passengerName, routeName, vehicleNumber, driverName, driverPhone, lat, lng, timeIso, stops = [], note }) {
  const timeText = timeIso ? new Date(timeIso).toLocaleString() : new Date().toLocaleString();

  // coords string and short google maps link
  const coordsPresent = Number.isFinite(lat) && Number.isFinite(lng);
  const coords = coordsPresent ? `${lat.toFixed(5)},${lng.toFixed(5)}` : null;
  const mapUrl = coordsPresent ? `https://maps.google.com/?q=${lat.toFixed(5)},${lng.toFixed(5)}` : null;

  // Base pieces (descending importance)
  function buildParts({ useCoords = true, useMap = false, rname = routeName, dname = driverName, vnum = vehicleNumber }) {
    const parts = [];
    if (passengerName) parts.push(`PASSENGER: ${passengerName}`);
    if (rname) parts.push(`Route: ${rname}`);
    if (vnum) parts.push(`Veh: ${vnum}`);
    if (dname) parts.push(`Driver: ${dname}`);
    if (driverPhone) parts.push(`DrvPhone: ${driverPhone}`);
    if (useMap && mapUrl) parts.push(`Map: ${mapUrl}`);
    else if (useCoords && coords) parts.push(`Loc: ${coords}`);
    parts.push(`Time: ${timeText}`);
    if (note) parts.push(`Note: ${truncateAscii(note, 40)}`);
    return parts;
  }

  // Try building a message with current full fields preferring map link (if short)
  let msgParts = buildParts({ useCoords: true, useMap: false });
  let msg = msgParts.join(" • ");

  // If full message fits and is GSM-7, return immediately
  if (msg.length <= MAX_USER_BODY && isGsm7(msg)) return msg;

  // Try replacing coords with map URL (more useful). If that fits, return.
  if (mapUrl) {
    msgParts = buildParts({ useCoords: false, useMap: true });
    msg = msgParts.join(" • ");
    if (msg.length <= MAX_USER_BODY && isGsm7(msg)) return msg;
  }

  // Progressive shortening strategy (same idea as before), but include note in attempts (shortened)
  function shorten(str, max) {
    if (!str) return str;
    return str.length <= max ? str : str.slice(0, Math.max(0, max - 1)) + "…";
  }

  const attempts = [
    { r: 30, d: 18, v: 12, n: 32 },
    { r: 20, d: 12, v: 8, n: 24 },
    { r: 12, d: 8, v: 6, n: 12 },
    { r: 0, d: 0, v: 0, n: 0 },
  ];

  for (const a of attempts) {
    const rShort = a.r ? shorten(routeName, a.r) : null;
    const dShort = a.d ? shorten(driverName, a.d) : null;
    const vShort = a.v ? shorten(vehicleNumber, a.v) : null;
    const nShort = a.n ? shorten(note, a.n) : null;

    // First try with map link (if present)
    msgParts = [];
    if (passengerName) msgParts.push(`PASSENGER: ${passengerName}`);
    if (rShort) msgParts.push(`Route: ${rShort}`);
    if (vShort) msgParts.push(`Veh: ${vShort}`);
    if (dShort) msgParts.push(`Driver: ${dShort}`);
    if (driverPhone) msgParts.push(`DrvPhone: ${driverPhone}`);
    if (mapUrl) msgParts.push(`Map: ${mapUrl}`);
    if (nShort) msgParts.push(`Note: ${nShort}`);
    msgParts.push(`Time: ${timeText}`);
    msg = msgParts.join(" • ");
    if (msg.length <= MAX_USER_BODY && isGsm7(msg)) return msg;

    // If map link didn't fit, try with coords instead
    msgParts = [];
    if (passengerName) msgParts.push(`PASSENGER: ${passengerName}`);
    if (rShort) msgParts.push(`Route: ${rShort}`);
    if (vShort) msgParts.push(`Veh: ${vShort}`);
    if (dShort) msgParts.push(`Driver: ${dShort}`);
    if (driverPhone) msgParts.push(`DrvPhone: ${driverPhone}`);
    if (coords) msgParts.push(`Loc: ${coords}`);
    if (nShort) msgParts.push(`Note: ${nShort}`);
    msgParts.push(`Time: ${timeText}`);
    msg = msgParts.join(" • ");
    if (msg.length <= MAX_USER_BODY && isGsm7(msg)) return msg;
  }

  // Essentials-only fallback; try to include mapUrl if possible
  const essential = [];
  if (passengerName) essential.push(`PASS:${truncateAscii(passengerName, 12)}`);
  if (vehicleNumber) essential.push(`Veh:${truncateAscii(vehicleNumber, 10)}`);
  if (driverName) essential.push(`Drv:${truncateAscii(driverName, 15)}`);
  if (driverPhone) essential.push(`${truncateAscii(driverPhone, 20)}`);
  if (mapUrl) essential.push(`${mapUrl}`);
  else if (coords) essential.push(`${coords}`);
  if (note) essential.push(`Note:${truncateAscii(note, 18)}`);
  essential.push(truncateAscii(timeText, 25));
  if (routeName) essential.push(`${truncateAscii(routeName, 15)}`);
  essential.push("#SafeRide");
  msg = essential.filter(Boolean).join(" • ");
  if (msg.length <= MAX_USER_BODY && isGsm7(msg)) return msg;

  // final hard truncate
  return truncateAscii(msg, MAX_USER_BODY - 1);
}

// Helper: truncate to ascii-safe string of maxLen
function truncateAscii(str, maxLen) {
  if (!str) return str;
  // Replace newlines, tabs with spaces
  const s = String(str).replace(/\s+/g, " ").trim();
  return s.length <= maxLen ? s : s.slice(0, maxLen);
}

// Helper: quick GSM-7 check (very permissive) — ensure we avoid many unicode chars
function isGsm7(str) {
  // Basic check: characters outside basic ASCII range are likely UCS-2
  // We allow common punctuation; this is a heuristic.
  for (let i = 0; i < (str || "").length; i++) {
    if (str.charCodeAt(i) > 127) return false;
  }
  return true;
}

/**
 * GET /nearby-rides
 * Query: lat, lng, radius (meters)
 */
router.get("/nearby-rides", async (req, res) => {
  try {
    const lat = parseFloat(req.query.lat);
    const lng = parseFloat(req.query.lng);
    const radius = Number(req.query.radius || 1000);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return res.status(400).json({ ok: false, message: "lat and lng required numeric" });
    }
    if (!Number.isFinite(radius) || radius <= 0) {
      return res.status(400).json({ ok: false, message: "radius must be positive (meters)" });
    }

    const candidates = await Ride.find({
      status: { $in: ["ongoing", "paused"] },
      "lastLocation.lat": { $exists: true },
      "lastLocation.lng": { $exists: true },
    })
      .populate("driver route")
      .lean();

    const center = { latitude: lat, longitude: lng };
    const found = [];

    for (const r of candidates) {
      const loc = r.lastLocation;
      if (!loc || !Number.isFinite(loc.lat) || !Number.isFinite(loc.lng)) continue;
      let dist;
      try {
        dist = geolib.getDistance(center, { latitude: loc.lat, longitude: loc.lng });
      } catch (e) {
        continue;
      }
      if (dist <= radius) {
        found.push({
          _id: r._id,
          status: r.status,
          distMeters: dist,
          lastLocation: { lat: loc.lat, lng: loc.lng, ts: loc.ts || r.updatedAt || null },
          route: r.route
            ? {
                _id: r.route._id,
                fullName: r.route.fullName,
                code: r.route.code,
                stops: r.route.stops || [],
                startTime: r.route.startTime,
                endTime: r.route.endTime,
              }
            : null,
          driver: r.driver
            ? {
                _id: r.driver._id,
                fullName: r.driver.fullName,
                phoneNumber: r.driver.phoneNumber,
                vehicleNumber: r.driver.vehicleNumber,
                licenseNumber: r.driver.licenseNumber,
              }
            : null,
        });
      }
    }

    found.sort((a, b) => a.distMeters - b.distMeters);
    return res.json({ ok: true, rides: found });
  } catch (err) {
    console.error("nearby-rides error", err);
    return res.status(500).json({ ok: false, message: "Server error" });
  }
});

/**
 * POST /alert
 * Body:
 * {
 *   passengerName: optional,
 *   rideId: optional (if supplied we'll fetch ride/driver/route data),
 *   routeName/vehicleNumber/driverName/driverPhone/lat/lng/time: optional fallback fields,
 *   recipients: ["+91xxxxxxxxxx", "+919xxxxxxxxx"]  // array of up to 4 numbers
 * }
 *
 * Sends an SMS to each recipient with a trimmed message.
 */
router.post("/alert", async (req, res) => {
  try {
    // incoming fields (legacy + new)
    const {
      passengerName: bodyPassenger,
      rideId,
      routeName: bodyRouteName,
      vehicleNumber: bodyVehicleNumber,
      driverName: bodyDriverName,
      driverPhone: bodyDriverPhone,
      lat: bodyLat,
      lng: bodyLng,
      time: bodyTime,
      to1,
      to2,
      recipients: bodyRecipients, // optional array from frontend
      note,
      ...rest
    } = req.body || {};

    // Helper: normalize phone (accept 10-digit Indian -> +91; accept +/digits)
    function normalizePhone(raw) {
      if (!raw) return null;
      const s = String(raw).replace(/[\s-()]/g, "");
      // plain 10-digit Indian
      if (/^\d{10}$/.test(s)) return "+91" + s;
      // already with country code (11-15 digits), allow optional leading +
      if (/^\+?\d{11,15}$/.test(s)) return s.startsWith("+") ? s : "+" + s;
      return null;
    }

    // collect recipients with dedupe
    const recipients = [];
    const pushRecipient = (raw) => {
      const n = normalizePhone(raw);
      if (!n) return;
      if (!recipients.includes(n) && recipients.length < 4) recipients.push(n);
    };

    // 1) frontend-provided recipients (array)
    if (Array.isArray(bodyRecipients)) {
      for (const r of bodyRecipients) {
        if (recipients.length >= 4) break;
        pushRecipient(r);
      }
    }

    // 2) legacy to1/to2
    pushRecipient(to1);
    pushRecipient(to2);

    // 3) if still none, pull from req.user (profile) if available
    if (recipients.length === 0 && req.user) {
      const fromUserContacts = Array.isArray(req.user.emergencyContacts) ? req.user.emergencyContacts : [];
      for (const c of fromUserContacts) {
        if (recipients.length >= 4) break;
        if (!c) continue;
        if (typeof c === "string") pushRecipient(c);
        else if (typeof c === "object") pushRecipient(c.phone || c.number || c.value || c.contact);
      }
    }

    // still nothing -> error
    if (recipients.length === 0) {
      return res
        .status(400)
        .json({ ok: false, message: "Provide at least one valid phone (to1/to2/recipients) or add emergency contacts to your profile." });
    }

    // Now fetch ride (if provided) and gather route/driver info just like your old handler
    let routeName = bodyRouteName;
    let vehicleNumber = bodyVehicleNumber;
    let driverName = bodyDriverName;
    let driverPhone = bodyDriverPhone;
    let stops = [];
    let lat = Number(bodyLat);
    let lng = Number(bodyLng);
    let time = bodyTime;

    if (rideId) {
      const ride = await Ride.findById(rideId).populate("driver route").lean();
      if (!ride) return res.status(404).json({ ok: false, message: "ride not found" });

      if (ride.route) {
        routeName = routeName || ride.route.fullName || (ride.route.code ? `Route ${ride.route.code}` : null);
        stops = Array.isArray(ride.route.stops) ? ride.route.stops : [];
      }
      if (ride.driver) {
        driverName = driverName || ride.driver.fullName;
        driverPhone = driverPhone || ride.driver.phoneNumber;
        vehicleNumber = vehicleNumber || ride.driver.vehicleNumber;
      }
      if (ride.lastLocation) {
        lat = Number.isFinite(ride.lastLocation.lat) ? ride.lastLocation.lat : lat;
        lng = Number.isFinite(ride.lastLocation.lng) ? ride.lastLocation.lng : lng;
        time =
          time ||
          (ride.lastLocation.ts
            ? new Date(ride.lastLocation.ts).toISOString()
            : ride.startedAt
            ? new Date(ride.startedAt).toISOString()
            : undefined);
      }
      time = time || ride.startedAt || ride.createdAt;
    }

    // Choose passengerName: prefer body, then req.user.fullName, else fallback
    const passengerName = bodyPassenger || (req.user && (req.user.fullName || req.user.name)) || "Passenger";

    // Build final message using your existing helper (pass stops etc)
    const message = buildSafetyMessage({
      passengerName,
      routeName,
      vehicleNumber,
      driverName,
      driverPhone,
      lat: Number.isFinite(lat) ? lat : undefined,
      lng: Number.isFinite(lng) ? lng : undefined,
      timeIso: time,
      stops,
      note,
    });

    // DEBUG: log length to help troubleshooting (remove in prod if verbose)
    console.info(`Prepared safety message (len=${message.length}) to send to ${recipients.length} recipient(s)`);

    // If Twilio not configured, return debug info (same behaviour as old)
    if (!twilioClient || !TWILIO_FROM) {
      console.warn("Twilio not configured — would send to:", recipients, "body:", message);
      return res.json({ ok: true, debug: true, message: "Twilio not configured (dev)", body: message, recipients });
    }

    // Additional safety: if message still longer than MAX_USER_BODY, log & trim again (defensive)
    let toSend = message;
    if (toSend.length > MAX_USER_BODY) {
      console.warn("Final message still exceeds MAX_USER_BODY, trimming defensively.");
      toSend = toSend.slice(0, MAX_USER_BODY - 1);
    }

    // Send SMSes sequentially and collect results
    const results = [];
    for (const to of recipients) {
      try {
        const sent = await twilioClient.messages.create({
          to,
          from: TWILIO_FROM,
          body: toSend,
        });
        results.push({ to, sid: sent.sid, status: sent.status });
      } catch (twErr) {
        console.error("Twilio send error for", to, twErr);
        results.push({ to, error: (twErr.message || String(twErr)) });
      }
    }

    const failed = results.filter((r) => r.error);
    if (failed.length) {
      return res.status(500).json({ ok: false, message: "Some sends failed", results });
    }

    return res.json({ ok: true, results });
  } catch (err) {
    console.error("alert error", err);
    return res.status(500).json({ ok: false, message: "Server error" });
  }
});

module.exports = router;
