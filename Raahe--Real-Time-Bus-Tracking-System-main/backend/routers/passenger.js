// routes/passenger.js
const express = require('express');
const router = express.Router();
const Ride = require('../models/ride');
const User = require('../models/user');

/**
 * GET /api/passenger/nearby-buses
 * Query: lat, lng, radius (meters, optional), limit (optional)
 * Returns: { ok: true, buses: [...] }
 *
 * Unchanged from your version.
 */
router.get('/nearby-buses', async (req, res) => {
  try {
    const lat = parseFloat(req.query.lat);
    const lng = parseFloat(req.query.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return res.status(400).json({ ok: false, message: 'lat & lng required as numbers' });
    }
    const radius = Number(req.query.radius || 3000); // default 3km
    const limit = Math.min(Number(req.query.limit || 20), 100);

    const agg = [
      {
        $geoNear: {
          near: { type: 'Point', coordinates: [lng, lat] },
          distanceField: 'distMeters',
          spherical: true,
          maxDistance: radius
          // if your geo field is NOT the default index, specify: key: 'lastLocation'
        }
      },
      // Only active/visible rides (adjust as per your app's rules)
      { $match: { status: { $in: ['ongoing', 'paused'] } } },
      // add driver info
      { $lookup: { from: 'users', localField: 'driver', foreignField: '_id', as: 'driverInfo' } },
      { $unwind: { path: '$driverInfo', preserveNullAndEmptyArrays: true } },
      // join route
      { $lookup: { from: 'routes', localField: 'route', foreignField: '_id', as: 'routeInfo' } },
      { $unwind: { path: '$routeInfo', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 1,
          status: 1,
          startedAt: 1,
          distMeters: 1,
          lastLocation: 1,
          "driver._id": "$driverInfo._id",
          "driver.fullName": "$driverInfo.fullName",
          "driver.vehicleNumber": "$driverInfo.vehicleNumber",
          "driver.phoneNumber": "$driverInfo.phoneNumber",
          "driver.licenseNumber": "$driverInfo.licenseNumber",
          "route._id": "$routeInfo._id",
          "route.fullName": "$routeInfo.fullName",
          "route.stops": "$routeInfo.stops",
          "route.startTime": "$routeInfo.startTime",
          "route.endTime": "$routeInfo.endTime"
        }
      },
      { $sort: { distMeters: 1 } },
      { $limit: limit }
    ];

    const results = await Ride.aggregate(agg);
    return res.json({ ok: true, buses: results });
  } catch (err) {
    console.error('nearby-buses error', err);
    return res.status(500).json({ ok: false, message: 'Server error' });
  }
});

/**
 * GET /api/passenger/city-buses
 * Query: city (required), lat (optional), lng (optional), limit (optional)
 *
 * Returns all active rides whose route mentions the city
 * (in route.fullName OR in any stop name / stop string).
 *
 * If lat/lng are provided, includes distMeters via $geoNear
 * (no maxDistance) to help your UI compute/sort/display ETA/distance.
 *
 * Response: { ok: true, buses: [...] }
 */
router.get('/city-buses', async (req, res) => {
  try {
    const city = (req.query.city || '').toString().trim();
    if (!city) {
      return res.status(400).json({ ok: false, message: 'city is required' });
    }

    const lat = parseFloat(req.query.lat);
    const lng = parseFloat(req.query.lng);
    const haveCoords = Number.isFinite(lat) && Number.isFinite(lng);
    const limit = Math.min(Number(req.query.limit || 50), 200);

    // Build aggregation
    const pipeline = [];

    // If coords provided, add $geoNear FIRST to compute distMeters (no maxDistance)
    if (haveCoords) {
      pipeline.push({
        $geoNear: {
          near: { type: 'Point', coordinates: [lng, lat] },
          distanceField: 'distMeters',
          spherical: true
          // if your geo field is NOT the default index, specify: key: 'lastLocation'
        }
      });
    } else {
      // Dummy stage so we can still keep the pipeline valid
      pipeline.push({ $match: {} });
    }

    // Only active rides
    pipeline.push({ $match: { status: { $in: ['ongoing', 'paused'] } } });

    // Join route + driver
    pipeline.push(
      { $lookup: { from: 'routes', localField: 'route', foreignField: '_id', as: 'routeInfo' } },
      { $unwind: { path: '$routeInfo', preserveNullAndEmptyArrays: true } },
      { $lookup: { from: 'users', localField: 'driver', foreignField: '_id', as: 'driverInfo' } },
      { $unwind: { path: '$driverInfo', preserveNullAndEmptyArrays: true } }
    );

    // Case-insensitive regex for city
    const re = new RegExp(city, 'i');

    // Match city against:
    // - routeInfo.fullName (string)
    // - routeInfo.stops.name (stops as array of objects)
    // - routeInfo.stops (stops as array of strings) -> regex against array matches any string element
    pipeline.push({
      $match: {
        $or: [
          { "routeInfo.fullName": { $regex: re } },
          { "routeInfo.stops.name": { $regex: re } },
          { "routeInfo.stops": { $regex: re } }
        ]
      }
    });

    // Shape the document for the frontend
    pipeline.push({
      $project: {
        _id: 1,
        status: 1,
        startedAt: 1,
        distMeters: haveCoords ? 1 : 0, // only if we computed it
        lastLocation: 1,
        "driver._id": "$driverInfo._id",
        "driver.fullName": "$driverInfo.fullName",
        "driver.vehicleNumber": "$driverInfo.vehicleNumber",
        "driver.phoneNumber": "$driverInfo.phoneNumber",
        "driver.licenseNumber": "$driverInfo.licenseNumber",
        "route._id": "$routeInfo._id",
        "route.fullName": "$routeInfo.fullName",
        "route.stops": "$routeInfo.stops",
        "route.startTime": "$routeInfo.startTime",
        "route.endTime": "$routeInfo.endTime"
      }
    });

    // Sort by distance when we have it; else by recency (optional)
    if (haveCoords) {
      pipeline.push({ $sort: { distMeters: 1 } });
    } else {
      pipeline.push({ $sort: { startedAt: -1 } });
    }

    pipeline.push({ $limit: limit });

    const results = await Ride.aggregate(pipeline);
    return res.json({ ok: true, buses: results });
  } catch (err) {
    console.error('city-buses error', err);
    return res.status(500).json({ ok: false, message: 'Server error' });
  }
});

/**
 * (Optional) GET /api/passenger/all-buses
 * Returns all active rides with driver+route info.
 * Useful as a fallback endpoint in the client.
 */
router.get('/all-buses', async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit || 200), 500);

    const pipeline = [
      { $match: { status: { $in: ['ongoing', 'paused'] } } },
      { $lookup: { from: 'users', localField: 'driver', foreignField: '_id', as: 'driverInfo' } },
      { $unwind: { path: '$driverInfo', preserveNullAndEmptyArrays: true } },
      { $lookup: { from: 'routes', localField: 'route', foreignField: '_id', as: 'routeInfo' } },
      { $unwind: { path: '$routeInfo', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 1,
          status: 1,
          startedAt: 1,
          lastLocation: 1,
          "driver._id": "$driverInfo._id",
          "driver.fullName": "$driverInfo.fullName",
          "driver.vehicleNumber": "$driverInfo.vehicleNumber",
          "driver.phoneNumber": "$driverInfo.phoneNumber",
          "driver.licenseNumber": "$driverInfo.licenseNumber",
          "route._id": "$routeInfo._id",
          "route.fullName": "$routeInfo.fullName",
          "route.stops": "$routeInfo.stops",
          "route.startTime": "$routeInfo.startTime",
          "route.endTime": "$routeInfo.endTime"
        }
      },
      { $sort: { startedAt: -1 } },
      { $limit: limit }
    ];

    const results = await Ride.aggregate(pipeline);
    return res.json({ ok: true, buses: results });
  } catch (err) {
    console.error('all-buses error', err);
    return res.status(500).json({ ok: false, message: 'Server error' });
  }
});

module.exports = router;
