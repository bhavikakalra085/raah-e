// backend/routers/admin.js
const express = require("express");
const User = require("../models/user");
const Route = require("../models/route");
const { authenticateJWT, requireAdmin } = require("../middlewares/auth");

const router = express.Router();

/** ---------- Helpers ---------- **/

function coerceNumber(n) {
  if (n === null || n === undefined || n === "") return null;
  const num = Number(n);
  return Number.isFinite(num) ? num : null;
}

/**
 * Normalize and validate stops payload:
 * - keeps only items with a non-empty name
 * - trims name
 * - coerces lat/lng to numbers (or null)
 * - assigns order if missing based on array index
 */
function normalizeStops(stops = []) {
  if (!Array.isArray(stops)) return [];
  return stops
    .map((s, idx) => {
      const name = typeof s?.name === "string" ? s.name.trim() : "";
      if (!name) return null;
      const lat = coerceNumber(s.lat);
      const lng = coerceNumber(s.lng);
      const order = Number.isFinite(s?.order) ? s.order : idx;
      return { name, lat, lng, order };
    })
    .filter(Boolean);
}

/** ---------- Routes ---------- **/

// GET /api/admin/drivers
router.get("/drivers", authenticateJWT, requireAdmin, async (req, res) => {
  try {
    const drivers = await User.find({ role: "driver" })
      .select("-password")
      .populate("route")
      .lean();
    return res.json({ ok: true, drivers });
  } catch (err) {
    console.error("GET /admin/drivers error", err);
    return res.status(500).json({ ok: false, message: "Server error" });
  }
});

// GET /api/admin/routes
router.get("/routes", authenticateJWT, requireAdmin, async (req, res) => {
  try {
    const routes = await Route.find().lean();
    return res.json({ ok: true, routes });
  } catch (err) {
    console.error("GET /admin/routes error", err);
    return res.status(500).json({ ok: false, message: "Server error" });
  }
});

// POST /api/admin/routes
// Body: { fullName, code?, stops?, startTime?, endTime? }
router.post("/routes", authenticateJWT, requireAdmin, async (req, res) => {
  try {
    const { fullName, code, stops = [], startTime, endTime } = req.body || {};
    if (!fullName || !String(fullName).trim()) {
      return res.status(400).json({ ok: false, message: "Route fullName required" });
    }

    const normalizedStops = normalizeStops(stops);

    const route = await Route.create({
      fullName: String(fullName).trim(),
      code: code ? String(code).trim() : undefined,
      stops: normalizedStops,
      startTime: startTime ? String(startTime).trim() : undefined,
      endTime: endTime ? String(endTime).trim() : undefined,
    });

    return res.status(201).json({ ok: true, route });
  } catch (err) {
    console.error("POST /admin/routes error", err);
    // Handle duplicate code nicely if you enable unique index
    if (err?.code === 11000) {
      return res.status(409).json({ ok: false, message: "Route code already exists" });
    }
    return res.status(500).json({ ok: false, message: "Server error" });
  }
});

// POST /api/admin/driver/:id/assign-route
// Body: { routeId } OR { route: { fullName, code?, stops?, startTime?, endTime? } }
router.post("/driver/:id/assign-route", authenticateJWT, requireAdmin, async (req, res) => {
  try {
    const driverId = req.params.id;
    const { routeId, route } = req.body || {};

    const driver = await User.findById(driverId);
    if (!driver || driver.role !== "driver") {
      return res.status(404).json({ ok: false, message: "Driver not found" });
    }

    let assignedRoute;

    if (routeId) {
      assignedRoute = await Route.findById(routeId);
      if (!assignedRoute) {
        return res.status(404).json({ ok: false, message: "Route not found" });
      }
    } else if (route && typeof route === "object") {
      const { fullName, code, stops = [], startTime, endTime } = route;
      if (!fullName || !String(fullName).trim()) {
        return res.status(400).json({ ok: false, message: "Route fullName required" });
      }

      const normalizedStops = normalizeStops(stops);

      assignedRoute = await Route.create({
        fullName: String(fullName).trim(),
        code: code ? String(code).trim() : undefined,
        stops: normalizedStops,
        startTime: startTime ? String(startTime).trim() : undefined,
        endTime: endTime ? String(endTime).trim() : undefined,
      });
    } else {
      return res.status(400).json({ ok: false, message: "routeId or route body required" });
    }

    driver.route = assignedRoute._id;
    await driver.save();

    const populated = await User.findById(driverId).select("-password").populate("route").lean();
    return res.json({ ok: true, driver: populated });
  } catch (err) {
    console.error("POST /admin/driver/:id/assign-route error", err);
    return res.status(500).json({ ok: false, message: "Server error" });
  }
});

module.exports = router;
