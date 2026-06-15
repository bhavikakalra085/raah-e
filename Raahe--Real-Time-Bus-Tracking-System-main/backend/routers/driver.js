const express = require('express');
const router = express.Router();
const Ride = require('../models/ride');
const User = require('../models/user');
const Route = require('../models/route');
const geolib = require('geolib');
const { authenticateJWT, requireDriver } = require('../middlewares/auth');

// Start ride (creates ride document)
router.post('/start', authenticateJWT, requireDriver, async (req, res) => {
  try {
    const driverId = req.user.sub;
    const driver = await User.findById(driverId).populate('route');
    if (!driver) return res.status(404).json({ message: 'Driver not found' });
    if (!driver.route) return res.status(400).json({ message: 'Driver has no route' });

    // check active ride exists
    const existing = await Ride.findOne({ driver: driverId, status: { $in: ['ongoing','paused'] } });
    if (existing) return res.status(400).json({ message: 'Active ride already exists', ride: existing });

    const ride = await Ride.create({
      driver: driverId,
      route: driver.route._id,
      status: 'ongoing',
      startedAt: new Date(),
      currentStopIndex: 0
    });

    // broadcast via socket if available
    const io = req.app.get('io');
    if (io) io.emit('rideStarted', { rideId: ride._id, ride });

    return res.json({ ride });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// pause ride
router.post('/:rideId/pause', authenticateJWT, requireDriver, async (req, res) => {
  try {
    const { rideId } = req.params;
    const ride = await Ride.findById(rideId);
    if (!ride) return res.status(404).json({ message: 'Ride not found' });
    if (String(ride.driver) !== req.user.sub) return res.status(403).json({ message: 'Not your ride' });

    ride.status = 'paused';
    ride.pausedAt = new Date();
    await ride.save();
    const io = req.app.get('io');
    if (io) io.to(`ride:${rideId}`).emit('ridePaused', { rideId });
    return res.json({ ride });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// resume
router.post('/:rideId/resume', authenticateJWT, requireDriver, async (req, res) => {
  try {
    const { rideId } = req.params;
    const ride = await Ride.findById(rideId);
    if (!ride) return res.status(404).json({ message: 'Ride not found' });
    if (String(ride.driver) !== req.user.sub) return res.status(403).json({ message: 'Not your ride' });

    ride.status = 'ongoing';
    ride.pausedAt = undefined;
    await ride.save();
    const io = req.app.get('io');
    if (io) io.to(`ride:${rideId}`).emit('rideResumed', { rideId });
    return res.json({ ride });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// end
router.post('/:rideId/end', authenticateJWT, requireDriver, async (req, res) => {
  try {
    const { rideId } = req.params;
    const ride = await Ride.findById(rideId);
    if (!ride) return res.status(404).json({ message: 'Ride not found' });
    if (String(ride.driver) !== req.user.sub) return res.status(403).json({ message: 'Not your ride' });

    ride.status = 'ended';
    ride.endedAt = new Date();
    await ride.save();

    const io = req.app.get('io');
    if (io) io.to(`ride:${rideId}`).emit('rideEnded', { rideId });
    return res.json({ ride });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// location update
router.post('/:rideId/location', authenticateJWT, requireDriver, async (req, res) => {
  try {
    const { rideId } = req.params;
    const { lat, lng, speed, accuracy, ts } = req.body;
    const ride = await Ride.findById(rideId).populate('route');
    if (!ride) return res.status(404).json({ message: 'Ride not found' });
    if (String(ride.driver) !== req.user.sub) return res.status(403).json({ message: 'Not your ride' });
    if (!['ongoing','paused'].includes(ride.status)) return res.status(400).json({ message: 'Ride not active' });

    const point = {
        lat: Number(lat),
        lng: Number(lng),
        speed: speed != null ? Number(speed) : null,
        accuracy: accuracy != null ? Number(accuracy) : null,
        ts: ts ? new Date(ts) : new Date()
      };
      
      ride.locations.push(point);
      ride.lastLocation = point;
      
      // set GeoJSON lastLocationGeo correctly (lng, lat)
      if (Number.isFinite(Number(lng)) && Number.isFinite(Number(lat))) {
        ride.lastLocationGeo = {
          type: "Point",
          coordinates: [ Number(lng), Number(lat) ]  // IMPORTANT: [lng, lat]
        };
      }

    // optional: advance currentStopIndex if near stop
    // optional: advance currentStopIndex if near stop (safe version)
if (ride.route && Array.isArray(ride.route.stops) && ride.route.stops.length) {
    try {
      // ensure incoming values are numbers
      const currLat = Number(lat);
      const currLng = Number(lng);
      if (!Number.isFinite(currLat) || !Number.isFinite(currLng)) {
        // invalid incoming coords — skip proximity check
        console.warn("Invalid incoming coords, skipping proximity checks:", lat, lng);
      } else {
        let minDist = Infinity;
        // start from currentStopIndex or 0
        const startIdx = Number.isInteger(ride.currentStopIndex) ? ride.currentStopIndex : 0;
        let bestIdx = startIdx;
  
        for (let i = startIdx; i < ride.route.stops.length; i++) {
          const s = ride.route.stops[i];
          if (!s) continue;
          // Accept multiple possible field names for coordinates
          const stopLat = s.lat ?? s.latitude ?? s.latLng?.lat ?? s.coords?.lat;
          const stopLng = s.lng ?? s.longitude ?? s.latLng?.lng ?? s.coords?.lng;
  
          // skip stops without valid coordinates
          const stopLatNum = Number(stopLat);
          const stopLngNum = Number(stopLng);
          if (!Number.isFinite(stopLatNum) || !Number.isFinite(stopLngNum)) {
            // console.debug("Skipping stop without coords at index", i);
            continue;
          }
  
          let d;
          try {
            d = geolib.getDistance(
              { latitude: currLat, longitude: currLng },
              { latitude: stopLatNum, longitude: stopLngNum }
            );
          } catch (e) {
            console.warn("geolib error for stop index", i, e);
            continue;
          }
  
          if (d < minDist) {
            minDist = d;
            bestIdx = i;
          }
        }
  
        // threshold in meters to consider the stop reached (adjustable)
        const NEAR_THRESHOLD = 50;
        // advance only forward (no backward jump)
        const currentIdx = Number.isInteger(ride.currentStopIndex) ? ride.currentStopIndex : -1;
        if (minDist < NEAR_THRESHOLD && bestIdx > currentIdx) {
          ride.currentStopIndex = bestIdx;
        }
      }
    } catch (e) {
      console.error("Error while checking proximity to stops:", e);
      // don't block location saving due to this
    }
  }
  

    await ride.save();

    // broadcast update
    const io = req.app.get('io');
    if (io) io.to(`ride:${rideId}`).emit('locationUpdate', { rideId, point, currentStopIndex: ride.currentStopIndex });

    return res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// get driver's active ride
router.get('/my-active-ride', authenticateJWT, requireDriver, async (req, res) => {
  try {
    const ride = await Ride.findOne({ driver: req.user.sub, status: { $in: ['ongoing','paused'] } }).populate('route');
    return res.json({ ride });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
