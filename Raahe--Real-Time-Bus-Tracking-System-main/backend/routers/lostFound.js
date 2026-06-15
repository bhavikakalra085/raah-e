// backend/routers/lostFound.js
const express = require("express");
const LostFound = require("../models/lostFound");
const User = require("../models/user");
const { authenticateJWT, requireAdmin } = require("../middlewares/auth");

const router = express.Router();

/**
 * Create a complaint (USER)
 * POST /api/lostfound
 * Body: { busNumber, dateOfLoss, approxTime?, itemType, description? }
 */
router.post("/", authenticateJWT, async (req, res) => {
  try {
    const { busNumber, dateOfLoss, approxTime, itemType, description } = req.body || {};
    if (!busNumber || !dateOfLoss || !itemType) {
      return res.status(400).json({ ok: false, message: "busNumber, dateOfLoss and itemType are required" });
    }

    const user = await User.findById(req.user.sub).lean();
    if (!user) return res.status(401).json({ ok: false, message: "User not found" });

    const doc = await LostFound.create({
      user: user._id,
      userName: user.fullName || "",
      userEmail: user.email || "",
      userPhone: user.phoneNumber || "",
      busNumber: String(busNumber).trim(),
      dateOfLoss: new Date(dateOfLoss),
      approxTime: approxTime ? String(approxTime).trim() : "",
      itemType,
      description: (description || "").trim(),
    });

    return res.status(201).json({ ok: true, complaint: doc });
  } catch (err) {
    console.error("POST /api/lostfound error", err);
    return res.status(500).json({ ok: false, message: "Server error" });
  }
});

/**
 * Get my complaints (USER)
 * GET /api/lostfound/mine
 */
router.get("/mine", authenticateJWT, async (req, res) => {
  try {
    const items = await LostFound.find({ user: req.user.sub })
      .sort({ createdAt: -1 })
      .lean();
    return res.json({ ok: true, complaints: items });
  } catch (err) {
    console.error("GET /api/lostfound/mine error", err);
    return res.status(500).json({ ok: false, message: "Server error" });
  }
});

/**
 * Admin list (ADMIN)
 * GET /api/lostfound
 * Optional query: status=open|resolved
 */
router.get("/", authenticateJWT, requireAdmin, async (req, res) => {
  try {
    const q = {};
    if (req.query.status) q.status = req.query.status;
    const items = await LostFound.find(q)
      .sort({ createdAt: -1 })
      .lean();
    return res.json({ ok: true, complaints: items });
  } catch (err) {
    console.error("GET /api/lostfound error", err);
    return res.status(500).json({ ok: false, message: "Server error" });
  }
});

/**
 * Resolve a complaint (ADMIN)
 * PATCH /api/lostfound/:id/resolve
 * Body: { pickupStationCity, resolutionNote }
 */
router.patch("/:id/resolve", authenticateJWT, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { pickupStationCity, resolutionNote } = req.body || {};

    const doc = await LostFound.findById(id);
    if (!doc) return res.status(404).json({ ok: false, message: "Complaint not found" });
    if (doc.status === "resolved") {
      return res.status(400).json({ ok: false, message: "Already resolved" });
    }

    doc.status = "resolved";
    doc.pickupStationCity = (pickupStationCity || "").trim();
    doc.resolutionNote = (resolutionNote || "").trim();
    doc.resolvedBy = req.user.sub;
    doc.resolvedAt = new Date();

    await doc.save();
    return res.json({ ok: true, complaint: doc });
  } catch (err) {
    console.error("PATCH /api/lostfound/:id/resolve error", err);
    return res.status(500).json({ ok: false, message: "Server error" });
  }
});

module.exports = router;
