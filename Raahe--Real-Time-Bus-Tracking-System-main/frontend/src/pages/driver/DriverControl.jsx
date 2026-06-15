// src/components/DriverControl.jsx
import React, { useEffect, useRef, useState, useMemo } from "react";
import io from "socket.io-client";
import axios from "axios";
import { GoogleMap, Marker, Polyline } from "@react-google-maps/api";
import { useGoogleMaps } from "../../lib/GoogleMapsProvider.jsx";

/**
 * DriverControlEnhanced
 * Runs driver features only when role === 'driver'.
 * Ensures route.stops are hydrated on first render (no refresh needed).
 */
export default function DriverControl({ token: propToken, driverId, apiBase = "" }) {
  const [status, setStatus] = useState("not_started"); // not_started | ongoing | paused | ended
  const [rideId, setRideId] = useState(null);
  const [routeName, setRouteName] = useState("");
  const [stops, setStops] = useState(null); // null until hydrated
  const [rideHydrated, setRideHydrated] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);
  const [lastPoint, setLastPoint] = useState(null);
  const [totalDistance, setTotalDistance] = useState(0); // meters
  const [avgSpeed, setAvgSpeed] = useState(null); // m/s
  const [startedAt, setStartedAt] = useState(null);
  const [elapsed, setElapsed] = useState(0); // seconds
  const [isEnding, setIsEnding] = useState(false);
  const [gpsStatus, setGpsStatus] = useState("idle"); // idle | watching | error
  const [error, setError] = useState("");

  // role detection states
  const [isDriver, setIsDriver] = useState(null); // null = checking
  const [checkingRole, setCheckingRole] = useState(false);

  const watchIdRef = useRef(null);
  const socketRef = useRef(null);
  const pointsRef = useRef([]); // for distance/speed

  // Memoize BASE & auth header so they don't bounce between renders
  const BASE = useMemo(() => apiBase || "http://localhost:5000", [apiBase]);
  const storedToken = useMemo(() => propToken || localStorage.getItem("token") || null, [propToken]);
  const authHeader = useMemo(
    () => ({ headers: { Authorization: storedToken ? `Bearer ${storedToken}` : "" } }),
    [storedToken]
  );

  // === use shared Google Maps loader from provider ===
  const { isLoaded: mapLoaded, loadError } = useGoogleMaps();

  // reference to map instance for panTo
  const mapRef = useRef(null);
  const onMapLoad = (map) => { mapRef.current = map; };

  // ---------- helpers ----------
  function haversineMeters(a, b) {
    if (!a || !b) return 0;
    const toRad = (d) => (d * Math.PI) / 180;
    const R = 6371000;
    const dLat = toRad(b.lat - a.lat);
    const dLon = toRad(b.lng - a.lng);
    const lat1 = toRad(a.lat);
    const lat2 = toRad(b.lat);
    const aa =
      Math.sin(dLat / 2) ** 2 +
      Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
    const c = 2 * Math.atan2(Math.sqrt(aa), Math.sqrt(1 - aa));
    return R * c;
  }

  function computeFromHistory(points) {
    if (!Array.isArray(points) || points.length === 0) return;
    pointsRef.current = points.slice();
    let tot = 0;
    for (let i = 1; i < points.length; i++) tot += haversineMeters(points[i - 1], points[i]);
    setTotalDistance(tot);
    const last = points[points.length - 1];
    setLastPoint(last);
    if (points.length >= 2) {
      const timeS = (points[points.length - 1].ts - points[0].ts) / 1000 || 1;
      setAvgSpeed(tot / timeS);
    }
  }

  async function sendLocationToServer(rid, point) {
    try {
      if (socketRef.current && socketConnected) {
        socketRef.current.emit("driverLocation", { rideId: rid, point });
        await axios.post(`${BASE}/api/driver/${rid}/location`, point, authHeader).catch(() => {});
      } else {
        await axios.post(`${BASE}/api/driver/${rid}/location`, point, authHeader);
      }
    } catch (err) {
      console.error("sendLocation error", err?.response?.data || err.message || err);
      setError("Location sync failed (will retry).");
    }
  }

  function startGeolocation(rid) {
    if (!isDriver) { setError("GPS available for drivers only."); return; }
    setError("");
    if (!("geolocation" in navigator)) {
      setError("Geolocation not supported in this browser.");
      setGpsStatus("error");
      return;
    }
    setGpsStatus("watching");
    pointsRef.current = [];
    setTotalDistance(0);
    setAvgSpeed(null);

    const id = navigator.geolocation.watchPosition(
      async (pos) => {
        const point = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          speed: pos.coords.speed ?? null,
          accuracy: pos.coords.accuracy ?? null,
          ts: pos.timestamp ?? Date.now(),
        };

        const prev = pointsRef.current.length ? pointsRef.current[pointsRef.current.length - 1] : null;
        if (prev) setTotalDistance((s) => s + haversineMeters(prev, point));
        pointsRef.current.push(point);

        if (pointsRef.current.length >= 2) {
          const lastN = pointsRef.current.slice(-6);
          let dist = 0, time = 0;
          for (let i = 1; i < lastN.length; i++) {
            dist += haversineMeters(lastN[i - 1], lastN[i]);
            time += (lastN[i].ts - lastN[i - 1].ts) / 1000;
          }
          if (time > 0) setAvgSpeed(dist / time);
        }

        setLastPoint(point);
        if (rid) sendLocationToServer(rid, point);
      },
      (err) => {
        console.error("geolocation error", err);
        setError("GPS error: " + (err.message || err.code));
        setGpsStatus("error");
      },
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 10000 }
    );
    watchIdRef.current = id;
  }

  function stopGeolocation() {
    if (watchIdRef.current != null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setGpsStatus("idle");
  }

  // ---------- ROLE DETECTION ----------
  useEffect(() => {
    async function detectRole() {
      setCheckingRole(true);
      try {
        if (!storedToken) { setIsDriver(false); return; }

        function parseJwtPayload(token) {
          try {
            const parts = token.split(".");
            if (parts.length < 2) return null;
            const payload = parts[1];
            let b64 = payload.replace(/-/g, "+").replace(/_/g, "/");
            while (b64.length % 4) b64 += "=";
            const str = atob(b64);
            const decoded = decodeURIComponent(
              str.split("").map((c) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0")).join("")
            );
            return JSON.parse(decoded);
          } catch {
            return null;
          }
        }

        const payload = parseJwtPayload(storedToken);
        if (payload?.role) { setIsDriver(payload.role === "driver"); return; }

        const tryEndpoints = ["/api/auth/me", "/api/me", "/api/user/me", "/api/profile"];
        for (const ep of tryEndpoints) {
          try {
            const url = `${BASE}${ep}`;
            const res = await fetch(url, { headers: authHeader.headers });
            if (!res.ok) continue;
            const json = await res.json();
            const role = json?.user?.role ?? json?.role ?? json?.data?.role ?? json?.user?.role;
            if (role) { setIsDriver(role === "driver"); return; }
          } catch { /* next */ }
        }
        setIsDriver(false);
      } catch (err) {
        console.error("role detection error", err);
        setIsDriver(false);
      } finally {
        setCheckingRole(false);
      }
    }

    detectRole();
  }, [storedToken, BASE, authHeader.headers]);

  // ---------- SOCKET (only drivers) ----------
  useEffect(() => {
    if (!isDriver) return;
    const socket = io(BASE || "/", {
      path: "/socket.io",
      transports: ["websocket"],
      auth: storedToken ? { token: storedToken } : undefined,
    });
    socketRef.current = socket;

    socket.on("connect", () => setSocketConnected(true));
    socket.on("disconnect", () => setSocketConnected(false));
    socket.on("connect_error", (err) => console.warn("Socket connect_error", err?.message || err));

    socket.on("rideUpdated", (payload) => {
      if (payload?.rideId === rideId) {
        if (payload.status) setStatus(payload.status);
        if (payload.startedAt) setStartedAt(payload.startedAt);
        if (payload.route) {
          setRouteName(payload.route.fullName || "");
          if (Array.isArray(payload.route.stops)) setStops(payload.route.stops);
        }
      }
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [BASE, storedToken, isDriver, rideId]);

  // pan map to last point
  useEffect(() => {
    if (!mapRef.current || !lastPoint) return;
    try { mapRef.current.panTo({ lat: lastPoint.lat, lng: lastPoint.lng }); } catch {}
  }, [lastPoint]);

  // elapsed timer
  useEffect(() => {
    if (!isDriver) return;
    let t;
    if (status === "ongoing" && startedAt) {
      t = setInterval(() => {
        setElapsed(Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000));
      }, 1000);
    } else {
      setElapsed(0);
    }
    return () => clearInterval(t);
  }, [status, startedAt, isDriver]);

  // ---------- HYDRATION HELPERS ----------
  async function tryGetPopulatedRide(rideId) {
    // Try variants that return populated route (adjust to your backend if needed)
    const urls = [
      `${BASE}/api/driver/ride/${rideId}?populate=route`,
      `${BASE}/api/rides/${rideId}?populate=route`,
      `${BASE}/api/driver/ride/${rideId}`,
      `${BASE}/api/rides/${rideId}`,
    ];
    for (const url of urls) {
      try {
        const r = await axios.get(url, authHeader);
        const data = r?.data?.ride ?? r?.data; // normalize common shapes
        const routeObj = data?.route ?? data?.ride?.route ?? data;
        if (routeObj && (routeObj.fullName || Array.isArray(routeObj.stops))) {
          return { routeName: routeObj.fullName || "", stops: Array.isArray(routeObj.stops) ? routeObj.stops : [] };
        }
      } catch { /* try next */ }
    }
    return null;
  }

  async function hydrateRouteIfNeeded(ride) {
    const existingStops = Array.isArray(ride?.route?.stops) ? ride.route.stops : [];
    if (existingStops.length > 0) {
      return { routeName: ride?.route?.fullName || "", stops: existingStops };
    }
    // If route id is present, try fetching the route directly
    const candidates = [];
    const routeId = ride?.route?._id || (typeof ride?.route === "string" ? ride.route : null);
    if (routeId) {
      candidates.push(`${BASE}/api/routes/${routeId}?populate=stops`);
      candidates.push(`${BASE}/api/route/${routeId}?populate=stops`);
      candidates.push(`${BASE}/api/routes/${routeId}`);
      candidates.push(`${BASE}/api/route/${routeId}`);
    }

    for (const url of candidates) {
      try {
        const res = await axios.get(url, authHeader);
        const data = res?.data?.route ?? res?.data;
        const fetchedStops = Array.isArray(data?.stops) ? data.stops : [];
        const fetchedName = data?.fullName || ride?.route?.fullName || "";
        if (fetchedStops.length > 0 || fetchedName) {
          return { routeName: fetchedName, stops: fetchedStops };
        }
      } catch { /* next */ }
    }

    // Fallback: try to get a populated ride
    if (ride?._id) {
      const populated = await tryGetPopulatedRide(ride._id);
      if (populated) return populated;
    }

    return { routeName: ride?.route?.fullName || "", stops: existingStops };
  }

  // ---------- ACTIVE RIDE CHECK (first load) ----------
  useEffect(() => {
    if (!isDriver) return;
    const ac = new AbortController();

    (async () => {
      try {
        // Prefer a "populated" active-ride endpoint first
        const urls = [
          `${BASE}/api/driver/my-active-ride?populate=route`,
          `${BASE}/api/driver/my-active-ride`,
        ];

        let rideRes = null;
        for (const url of urls) {
          try {
            const r = await axios.get(url, { ...authHeader, signal: ac.signal });
            if (r?.data?.ride) { rideRes = r.data.ride; break; }
          } catch (e) {
            if (ac.signal.aborted) return;
          }
        }

        if (!rideRes) {
          setRideId(null);
          setStatus("not_started");
          setStops(null);
          setRouteName("");
          setRideHydrated(true);
          return;
        }

        setRideId(rideRes._id);
        setStatus(rideRes.status || "ongoing");
        setStartedAt(rideRes.startedAt || rideRes.createdAt || new Date());

        // Always hydrate route/stops before flipping rideHydrated
        let hydrated = await hydrateRouteIfNeeded(rideRes);
        if (ac.signal.aborted) return;

        setRouteName(hydrated.routeName || "");
        setStops(Array.isArray(hydrated.stops) ? hydrated.stops : []);

        if (rideRes.locations && Array.isArray(rideRes.locations) && rideRes.locations.length) {
          const pts = rideRes.locations.map((p) => ({
            lat: p.lat ?? p.latitude ?? p[0],
            lng: p.lng ?? p.longitude ?? p[1],
            ts: p.ts ?? p.timestamp ?? p.time ?? Date.now(),
            accuracy: p.accuracy ?? null,
            speed: p.speed ?? null,
          }));
          computeFromHistory(pts);
        }

        if (socketRef.current && socketConnected) socketRef.current.emit("joinRide", rideRes._id);
        if (rideRes.status === "ongoing") startGeolocation(rideRes._id);
        if (rideRes.status === "paused") stopGeolocation();

        setRideHydrated(true);
      } catch (err) {
        if (!ac.signal.aborted) {
          console.error("checkActiveRide error", err?.response?.data || err.message || err);
          setRideHydrated(true);
        }
      }
    })();

    return () => ac.abort();
  }, [BASE, storedToken, socketConnected, isDriver]); // triggers once role is known

  // ---------- JOIN RIDE ROOM WHEN KNOWN ----------
  useEffect(() => {
    if (!isDriver || !rideId) return;
    const socket = socketRef.current;
    if (socket && socketConnected) {
      socket.emit("joinRide", rideId);
    }
    const onServerPoint = (payload) => {
      if (payload?.rideId !== rideId) return;
      if (payload.point) {
        pointsRef.current.push(payload.point);
        setLastPoint(payload.point);
      }
    };
    if (socket) socket.on("rideLocation", onServerPoint);
    return () => { if (socket) socket.off("rideLocation", onServerPoint); };
  }, [rideId, socketConnected, isDriver]);

  // ---------- ACTIONS ----------
  async function handleStart() {
    if (!isDriver) { setError("Only drivers can start a ride"); return; }
    setError("");
    try {
      const res = await axios.post(`${BASE}/api/driver/start`, {}, authHeader);
      const ride = res?.data?.ride;
      if (!ride) throw new Error("No ride in response");

      setRideId(ride._id);
      setStatus("ongoing");
      setStartedAt(ride.startedAt || new Date());

      // Hydrate route immediately so UI shows stops without refresh
      const hydrated = await hydrateRouteIfNeeded(ride);
      setRouteName(hydrated.routeName || "");
      setStops(Array.isArray(hydrated.stops) ? hydrated.stops : []);
      setRideHydrated(true);

      if (socketRef.current && socketConnected) socketRef.current.emit("joinRide", ride._id);
      startGeolocation(ride._id);
    } catch (err) {
      console.error(err);
      setError(err?.response?.data?.message || "Failed to start ride");
    }
  }

  async function handlePause() {
    if (!isDriver) { setError("Only drivers can pause a ride"); return; }
    setError("");
    if (!rideId) return;
    try {
      await axios.post(`${BASE}/api/driver/${rideId}/pause`, {}, authHeader);
      setStatus("paused");
      stopGeolocation();
    } catch (err) {
      console.error(err);
      setError("Failed to pause ride");
    }
  }

  async function handleResume() {
    if (!isDriver) { setError("Only drivers can resume a ride"); return; }
    setError("");
    if (!rideId) return;
    try {
      await axios.post(`${BASE}/api/driver/${rideId}/resume`, {}, authHeader);
      setStatus("ongoing");
      startGeolocation(rideId);
    } catch (err) {
      console.error(err);
      setError("Failed to resume ride");
    }
  }

  async function handleEndConfirmed() {
    if (!isDriver) { setError("Only drivers can end a ride"); return; }
    setIsEnding(false);
    setError("");
    if (!rideId) return;
    try {
      await axios.post(`${BASE}/api/driver/${rideId}/end`, {}, authHeader);
      setStatus("ended");
      stopGeolocation();
    } catch (err) {
      console.error(err);
      setError("Failed to end ride");
    }
  }

  // ---------- MAP ----------
  const containerStyle = { width: "240px", height: "160px" };
  const path = pointsRef.current.map((p) => ({ lat: p.lat, lng: p.lng }));
  const center = lastPoint
    ? { lat: lastPoint.lat, lng: lastPoint.lng }
    : (path.length ? path[path.length - 1] : { lat: 22.5726, lng: 88.3639 });

  // ---------- UI helpers ----------
  function formatDuration(sec) {
    if (!sec) return "00:00";
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    if (h > 0) return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  function formatMeters(m) { return m >= 1000 ? `${(m / 1000).toFixed(2)} km` : `${Math.round(m)} m`; }
  function formatSpeed(mps) { if (mps == null) return "—"; return `${Math.round(mps * 3.6)} km/h`; }

  // ---------- RENDER ----------
  if (isDriver === null || checkingRole) {
    return (
      <div className="max-w-3xl mx-auto p-4">
        <div className="text-gray-600">Checking account role…</div>
      </div>
    );
  }

  if (!storedToken) {
    return (
      <div className="max-w-3xl mx-auto p-4">
        <h2 className="text-2xl font-semibold mb-3">You are not logged in</h2>
        <div className="p-4 bg-yellow-50 border rounded">
          <p className="mb-2">This dashboard is only available to users registered as <strong>Drivers</strong>.</p>
          <p className="text-sm text-gray-600">You must log in as a Driver in order to access this page</p>
        </div>
      </div>
    );
  }

  if (!isDriver) {
    return (
      <div className="max-w-3xl mx-auto p-4">
        <h2 className="text-2xl font-semibold mb-3">Driver Dashboard</h2>
        <div className="p-4 bg-yellow-50 border rounded">
          <p className="mb-2">This dashboard is only available to users registered as <strong>drivers</strong>.</p>
          <p className="text-sm text-gray-600">If you believe you should have access, ask an administrator to change your account role or register as a driver.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-semibold">Driver Dashboard</h2>
        <div className="flex items-center gap-3">
          <div className="text-sm text-gray-500">GPS:</div>
          <div className={`px-2 py-1 rounded-md text-xs font-medium ${gpsStatus === "watching" ? "bg-green-100 text-green-800" : gpsStatus === "error" ? "bg-red-100 text-red-800" : "bg-gray-100 text-gray-800"}`}>
            {gpsStatus === "watching" ? "Active" : gpsStatus === "error" ? "Error" : "Idle"}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* left: big controls */}
        <div className="md:col-span-2 bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-sm text-gray-500">Ride status</div>
              <div className="text-xl font-semibold">{status.replace("_", " ").toUpperCase()}</div>
            </div>
            <div className="text-right">
              <div className="text-sm font-bold text-gray-700">
                {rideHydrated ? (routeName || "—") : "Loading…"}
              </div>
              <div className="text-xs text-gray-500">
                {rideHydrated ? (Array.isArray(stops) ? `${stops.length} stops` : "—") : "—"}
              </div>
              <div className="text-xs text-gray-500">
                {rideHydrated && Array.isArray(stops) && stops.length
                  ? stops.map((s) => s?.name ?? "Unnamed").join(" → ")
                  : " "}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="p-3 border rounded">
              <div className="text-xs text-gray-500">Elapsed</div>
              <div className="text-lg font-medium">{formatDuration(elapsed)}</div>
            </div>
            <div className="p-3 border rounded">
              <div className="text-xs text-gray-500">Distance</div>
              <div className="text-lg font-medium">{formatMeters(totalDistance)}</div>
            </div>
            <div className="p-3 border rounded">
              <div className="text-xs text-gray-500">Speed (avg)</div>
              <div className="text-lg font-medium">{formatSpeed(avgSpeed)}</div>
            </div>
            <div className="p-3 border rounded">
              <div className="text-xs text-gray-500">Last accuracy</div>
              <div className="text-lg font-medium">{lastPoint?.accuracy ? `${Math.round(lastPoint.accuracy)} m` : "—"}</div>
            </div>
          </div>

          {/* main action buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              className={`flex-1 py-3 rounded-lg text-white font-semibold transition ${status === "ongoing" ? "bg-gray-400 cursor-not-allowed" : "bg-green-600 hover:bg-green-700"}`}
              onClick={handleStart}
              disabled={status === "ongoing" || status === "ended"}
              aria-disabled={status === "ongoing" || status === "ended"}
            >
              <span className="inline-block mr-2 align-middle">▶</span>
              Start Ride
            </button>

            <button
              className={`flex-1 py-3 rounded-lg font-semibold transition ${status !== "ongoing" ? "bg-gray-200 text-gray-500 cursor-not-allowed" : "bg-yellow-500 hover:bg-yellow-600 text-white"}`}
              onClick={handlePause}
              disabled={status !== "ongoing"}
            >
              ⏸ Pause
            </button>

            <button
              className={`flex-1 py-3 rounded-lg font-semibold transition ${status !== "paused" ? "bg-gray-200 text-gray-500 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700 text-white"}`}
              onClick={handleResume}
              disabled={status !== "paused"}
            >
              ⏵ Resume
            </button>

            <button
              className={`flex-1 py-3 rounded-lg font-semibold transition ${status === "ended" || status === "not_started" ? "bg-gray-200 text-gray-500 cursor-not-allowed" : "bg-red-600 hover:bg-red-700 text-white"}`}
              onClick={() => setIsEnding(true)}
              disabled={status === "ended" || status === "not_started"}
            >
              ✕ End Ride
            </button>
          </div>

          {error && <div className="mt-3 text-sm text-red-600">{error}</div>}
        </div>

        {/* right column: live info + small map side-by-side */}
        <div className="bg-white rounded-lg shadow p-4 w-fit">
          <div className="text-sm text-gray-500 mb-2">Live Location</div>

          <div className="flex gap-3 items-start">
            <div className="flex-1 h-40 flex flex-col items-center justify-center bg-gray-50 border rounded w-40">
              {lastPoint ? (
                <>
                  <div className="text-sm font-medium">{lastPoint.lat.toFixed(5)}, {lastPoint.lng.toFixed(5)}</div>
                  <div className="text-xs text-gray-500">Updated {new Date(lastPoint.ts).toLocaleTimeString()}</div>
                  <div className="text-xs text-gray-500 mt-2">
                    Speed: {lastPoint?.speed ? `${Math.round(lastPoint.speed * 3.6)} km/h` : (avgSpeed ? `${Math.round(avgSpeed * 3.6)} km/h` : "—")}
                  </div>
                </>
              ) : (
                <div className="text-sm text-gray-400">No GPS data yet</div>
              )}
            </div>

            <div className="w-[240px] h-[160px] border rounded overflow-hidden">
              {loadError && <div className="p-3 text-xs text-red-600">Map failed to load</div>}
              {!mapLoaded && !loadError && <div className="p-3 text-xs text-gray-500">Loading map…</div>}
              {mapLoaded && (
                <GoogleMap
                  mapContainerStyle={containerStyle}
                  center={center}
                  zoom={16}
                  onLoad={onMapLoad}
                  options={{ disableDefaultUI: true, zoomControl: false }}
                >
                  {lastPoint && <Marker position={{ lat: lastPoint.lat, lng: lastPoint.lng }} />}
                  {path.length >= 2 && (
                    <Polyline
                      path={path}
                      options={{ strokeColor: "#2563eb", strokeOpacity: 0.8, strokeWeight: 4 }}
                    />
                  )}
                </GoogleMap>
              )}
            </div>
          </div>

          <div className="mt-3 text-xs text-gray-500">Quick actions</div>
          <div className="flex gap-2 mt-2">
            <button
              className="flex-1 py-2 rounded border text-sm"
              onClick={() => {
                if (!rideId || !lastPoint) return setError("No point or ride available");
                sendLocationToServer(rideId, lastPoint);
              }}
            >
              Sync Now
            </button>
            <button
              className="flex-1 py-2 rounded border text-sm"
              onClick={() => {
                if (watchIdRef.current) stopGeolocation();
                else if (rideId) startGeolocation(rideId);
                else setError("Start a ride first");
              }}
            >
              {watchIdRef.current ? "Stop GPS" : "Start GPS"}
            </button>
          </div>

          <div className="mt-4 text-xs text-gray-500">
            Tips: Map requires Google Maps API key & billing enabled. Geolocation needs HTTPS in production.
          </div>
        </div>
      </div>

      {/* confirm end modal */}
      {isEnding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setIsEnding(false)} />
          <div className="relative z-10 bg-white rounded-lg shadow p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-2">End ride?</h3>
            <p className="text-sm text-gray-600 mb-4">Are you sure you want to end this ride? This action cannot be undone.</p>
            <div className="flex justify-end gap-3">
              <button className="px-4 py-2 rounded border" onClick={() => setIsEnding(false)}>Cancel</button>
              <button className="px-4 py-2 rounded bg-red-600 text-white" onClick={handleEndConfirmed}>End Ride</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}