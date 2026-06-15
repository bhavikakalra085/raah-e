// src/pages/PassengerNearby.jsx
import React, { useEffect, useState, useRef, useMemo } from "react";
import { GoogleMap, Marker, Polyline } from "@react-google-maps/api";
import { useGoogleMaps } from "../../lib/GoogleMapsProvider.jsx";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";

// === Hardcoded speed for ETA (km/h) ===
const BUS_SPEED_KMPH = 35;

// MiniMap: small map box that centers on provided lat/lng and optionally draws a short path
function MiniMap({ lat, lng, path = null, mapDisabled = false, onEnableMap = () => {} }) {
  const containerStyle = { width: "240px", height: "160px" };

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return (
      <div className="w-[240px] h-[160px] border rounded flex items-center justify-center bg-gray-50 text-xs text-gray-500">
        No location
      </div>
    );
  }

  const options = {
    disableDefaultUI: true,
    clickableIcons: false,
    gestureHandling: "none",
  };

  if (mapDisabled) {
    // Lightweight placeholder for low-bandwidth mode
    return (
      <div className="w-[240px] h-[160px] border rounded flex flex-col items-center justify-center bg-gray-50 text-xs text-gray-500 p-3">
        <div className="text-sm font-medium mb-2">Map disabled (low bandwidth)</div>
        <div className="text-[11px] text-gray-400 text-center mb-3">
          To save data and load faster, interactive maps are disabled. You can enable the map if you want.
        </div>
        <button
          className="px-3 py-1 text-sm rounded bg-blue-600 text-white"
          onClick={onEnableMap}
        >
          Show map anyway
        </button>
      </div>
    );
  }

  return (
    <div className="w-[240px] h-[160px] border rounded overflow-hidden">
      <GoogleMap mapContainerStyle={containerStyle} center={{ lat, lng }} zoom={13} options={options}>
        <Marker position={{ lat, lng }} />
        {Array.isArray(path) && path.length >= 2 && (
          <Polyline
            path={path.map((p) => ({ lat: p.lat, lng: p.lng }))}
            options={{ strokeColor: "#2563eb", strokeOpacity: 0.8, strokeWeight: 3 }}
          />
        )}
      </GoogleMap>
    </div>
  );
}

// List of major Punjab cities (name + approximate center lat/lng)
const PUNJAB_CITIES = [
  { name: "Amritsar", lat: 31.6339793, lng: 74.8722641 },
  { name: "Ludhiana", lat: 30.9009658, lng: 75.8572752 },
  { name: "Jalandhar", lat: 31.326015, lng: 75.576182 },
  { name: "Patiala", lat: 30.3398, lng: 76.3869 },
  { name: "Bathinda", lat: 30.211, lng: 74.9455 },
  { name: "Mohali (SAS Nagar)", lat: 30.7046, lng: 76.7179 },
  { name: "Hoshiarpur", lat: 31.5326, lng: 75.9139 },
  { name: "Pathankot", lat: 32.2734, lng: 75.652 },
  { name: "Moga", lat: 30.8165, lng: 75.171 },
  { name: "Kapurthala", lat: 31.3797, lng: 75.3847 },
  { name: "Firozpur", lat: 30.9168, lng: 74.613 },
  { name: "Faridkot", lat: 30.6769, lng: 74.7554 },
  { name: "Rupnagar (Ropar)", lat: 30.9659, lng: 76.533 },
  { name: "Barnala", lat: 30.3771, lng: 75.5536 },
  { name: "Sangrur", lat: 30.245, lng: 75.8421 },
  { name: "Tarn Taran", lat: 31.4515, lng: 74.9333 },
  { name: "Fazilka", lat: 30.4032, lng: 74.5736 },
  { name: "Muktsar", lat: 30.47, lng: 74.5206 },
];

// ---------- Geo helpers ----------
function toRad(d) { return (d * Math.PI) / 180; }
function haversineMeters(a, b) {
  if (!a || !b) return NaN;
  if (!Number.isFinite(a.lat) || !Number.isFinite(a.lng) || !Number.isFinite(b.lat) || !Number.isFinite(b.lng)) return NaN;
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

export default function PassengerNearby() {
  // UI / data states
  const [mode, setMode] = useState(""); // "" | "nearby" | "city"
  const [usingGps, setUsingGps] = useState(false);
  const [coords, setCoords] = useState({ lat: "", lng: "" });
  const [buses, setBuses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [radius, setRadius] = useState(300000);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const intervalRef = useRef(null);

  // city search state
  const [cityQuery, setCityQuery] = useState("");
  const [selectedCity, setSelectedCity] = useState(null);

  // role detection: only allow 'user' role to use this page
  const [isUser, setIsUser] = useState(null); // null = checking, true/false afterwards
  const [checkingRole, setCheckingRole] = useState(false);

  const [lowBandwidth, setLowBandwidth] = useState(false);
  const [forceShowMap, setForceShowMap] = useState(false);

  // use shared loader provided at app root
  const { isLoaded: mapLoaded, loadError } = useGoogleMaps();

  const storedToken = localStorage.getItem("token");

  const citiesFiltered = useMemo(() => {
    const q = (cityQuery || "").trim().toLowerCase();
    if (!q) return PUNJAB_CITIES;
    return PUNJAB_CITIES.filter((c) => c.name.toLowerCase().includes(q));
  }, [cityQuery]);

  // ---- ROLE DETECTION ----
  useEffect(() => {
    let mounted = true;
    async function detectRole() {
      setCheckingRole(true);
      try {
        if (!storedToken) {
          if (mounted) setIsUser(false);
          return;
        }

        function parseJwtPayload(token) {
          try {
            const parts = token.split(".");
            if (parts.length < 2) return null;
            let b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
            while (b64.length % 4) b64 += "=";
            const str = atob(b64);
            const decoded = decodeURIComponent(
              str
                .split("")
                .map((c) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0"))
                .join("")
            );
            return JSON.parse(decoded);
          } catch {
            return null;
          }
        }

        const payload = parseJwtPayload(storedToken);
        if (payload?.role) {
          if (mounted) setIsUser(payload.role === "user");
          return;
        }

        const tryEndpoints = ["/api/auth/me", "/api/me", "/api/user/me", "/api/profile"];
        for (const ep of tryEndpoints) {
          try {
            const url = `${API_BASE}${ep}`;
            const res = await fetch(url, { headers: { Authorization: `Bearer ${storedToken}` } });
            if (!res.ok) continue;
            const json = await res.json();
            const role = json?.user?.role ?? json?.role ?? json?.data?.role;
            if (role) {
              if (mounted) setIsUser(role === "user");
              return;
            }
          } catch { /* try next */ }
        }
        if (mounted) setIsUser(false);
      } catch (err) {
        console.error("role detection error", err);
        if (mounted) setIsUser(false);
      } finally {
        if (mounted) setCheckingRole(false);
      }
    }
    detectRole();
    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storedToken]);


  useEffect(() => {
    function isLow() {
      try {
        const nav = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
        if (!nav) return false;
        const type = (nav.effectiveType || "").toLowerCase();
        const downlink = Number(nav.downlink || 10);
        // heuristic: treat slow-2g/2g and small downlink speeds as "low bandwidth"
        return type.includes("2g") || type === "slow-2g" || downlink < 1.5;
      } catch {
        return false;
      }
    }

    setLowBandwidth(isLow());

    const nav = navigator.connection;
    if (nav && typeof nav.addEventListener === "function") {
      const onChange = () => setLowBandwidth(isLow());
      nav.addEventListener("change", onChange);
      return () => nav.removeEventListener("change", onChange);
    }
    return;
  }, []);


  // ---------- Common formatters ----------
  function fmtDist(m) {
    if (m == null || isNaN(m)) return "—";
    if (m >= 1000) return (m / 1000).toFixed(2) + " km";
    return Math.round(m) + " m";
  }

  function fmtArrivalClock(min, { timeZone, showDayHint = false } = {}) {
    if (min == null || isNaN(min)) return "—";
    const totalMin = Math.max(0, Math.round(min));
    const now = new Date();
    const arrival = new Date(now.getTime() + totalMin * 60 * 1000);

    const label = arrival.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
      ...(timeZone ? { timeZone } : {}),
    });

    if (!showDayHint) return label;

    const sameDay =
      arrival.toLocaleDateString(undefined, { timeZone }) ===
      now.toLocaleDateString(undefined, { timeZone });
    if (sameDay) return label;
    const day = arrival.toLocaleDateString([], {
      weekday: "short",
      ...(timeZone ? { timeZone } : {}),
    });
    return `${label} (${day})`;
  }

  // Helper: extract lat/lng for each bus (account for different server field names)
  function getBusLatLng(bus) {
    const cand =
      bus.lastLocation ||
      bus.location ||
      (bus.driver && (bus.driver.lastLocation || bus.driver.location)) ||
      (bus.lat !== undefined && bus.lng !== undefined ? { lat: bus.lat, lng: bus.lng } : null);

    if (!cand) return null;
    const lat = parseFloat(cand.lat ?? cand.latitude ?? cand[0]);
    const lng = parseFloat(cand.lng ?? cand.longitude ?? cand[1]);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { lat, lng };
  }

  // Small path extractor (optional)
  function getBusPath(bus) {
    const pts = bus.path || bus.locations || bus.routePath || null;
    if (!Array.isArray(pts) || pts.length < 2) return null;
    return pts
      .map((p) => {
        const lat = parseFloat(p.lat ?? p.latitude ?? p[0]);
        const lng = parseFloat(p.lng ?? p.longitude ?? p[1]);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
        return { lat, lng };
      })
      .filter(Boolean);
  }

  // Does a bus's route contain the city name? (case-insensitive; checks route name & stop names)
  function routeMentionsCity(bus, cityName) {
    if (!cityName) return false;
    const q = cityName.trim().toLowerCase();
    const fullName = bus?.route?.fullName ? String(bus.route.fullName).toLowerCase() : "";
    if (fullName.includes(q)) return true;
    const stops = Array.isArray(bus?.route?.stops) ? bus.route.stops : [];
    return stops.some((s) => {
      const name = typeof s === "string" ? s : s?.name;
      return name && String(name).toLowerCase().includes(q);
    });
  }

  // Compute ETA (in minutes) from bus to passenger coords using hardcoded BUS_SPEED_KMPH
  function computeEtaMinutes(bus, passenger) {
    if (!passenger || !Number.isFinite(passenger.lat) || !Number.isFinite(passenger.lng)) return NaN;
    const busPos = getBusLatLng(bus);
    if (!busPos) return NaN;
    const distM = haversineMeters(busPos, passenger);
    if (!Number.isFinite(distM)) return NaN;
    const distKm = distM / 1000;
    const hours = distKm / Math.max(1e-6, BUS_SPEED_KMPH);
    return hours * 60;
  }

  // ---------- Fetchers ----------
  async function fetchNearbyRaw({ lat, lng, radiusMeters = 3000 }) {
    const url = `${API_BASE}/api/passenger/nearby-buses?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(
      lng
    )}&radius=${encodeURIComponent(radiusMeters)}`;
    const res = await fetch(url);
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(txt || `HTTP ${res.status}`);
    }
    const json = await res.json();
    if (!json.ok) throw new Error(json.message || "Invalid response");
    return json.buses || [];
  }

  // Fetch ONLY buses whose route mentions the city (strict filter).
  async function fetchCityStrict(cityName) {
    const candidates = [
      `${API_BASE}/api/passenger/city-buses?city=${encodeURIComponent(cityName)}`,
      `${API_BASE}/api/passenger/buses-in-city?city=${encodeURIComponent(cityName)}`,
      `${API_BASE}/api/passenger/search-buses?city=${encodeURIComponent(cityName)}`,
      `${API_BASE}/api/passenger/buses?city=${encodeURIComponent(cityName)}`,
      // Fallbacks that might return all buses; we'll filter client-side
      `${API_BASE}/api/passenger/all-buses`,
      `${API_BASE}/api/buses`,
      `${API_BASE}/api/bus`,
    ];

    for (const url of candidates) {
      try {
        const res = await fetch(url);
        if (!res.ok) continue;
        const json = await res.json().catch(() => ({}));
        const arr =
          json?.buses ??
          json?.data?.buses ??
          (Array.isArray(json) ? json : null);
        if (!arr) continue;
        // Strict filter by route/city mention
        return arr.filter((b) => routeMentionsCity(b, cityName));
      } catch {
        // try next
      }
    }
    return [];
  }

  async function fetchNearby({ lat, lng, radiusMeters = 3000 }) {
    if (!isUser) {
      setError("Only passengers (users) can search nearby buses.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const list = await fetchNearbyRaw({ lat, lng, radiusMeters });
      setBuses(list);
    } catch (err) {
      console.error("fetchNearby error", err);
      setError(err.message || "Failed to load nearby buses");
    } finally {
      setLoading(false);
    }
  }

  // ---- UI actions ----
  function getLocationAndSearch() {
    if (!isUser) {
      setError("Only passengers (users) can use location-based search.");
      return;
    }
    if (!("geolocation" in navigator)) {
      setError("Geolocation not supported by your browser.");
      return;
    }
    setUsingGps(true);
    setError("");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setCoords({ lat, lng });
        await fetchNearby({ lat, lng, radiusMeters: radius });
      },
      (err) => {
        console.warn("geolocation error", err);
        setError("Could not get location: " + (err.message || err.code));
        setUsingGps(false);
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    );
  }

  function handleManualSearch(e) {
    e?.preventDefault();
    if (!isUser) {
      setError("Only passengers (users) can search nearby buses.");
      return;
    }
    const lat = parseFloat(coords.lat);
    const lng = parseFloat(coords.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      setError("Enter valid numeric latitude & longitude.");
      return;
    }
    setUsingGps(false);
    setMode("nearby");
    fetchNearby({ lat, lng, radiusMeters: radius });
  }

  async function handleSearchCity() {
    if (!isUser) {
      setError("Only passengers (users) can search by city.");
      return;
    }
    if (!selectedCity) {
      setError("Select a city first.");
      return;
    }
    setError("");
    const { lat, lng } = selectedCity;
    // We set coords to city center so ETA/Distance compute against city center (unless user changes coords).
    setCoords({ lat, lng });
    setMode("city");

    setLoading(true);
    try {
      const strictList = await fetchCityStrict(selectedCity.name); // ONLY buses with that city in route/stops
      setBuses(strictList);
    } catch (err) {
      console.error("city strict fetch failed", err);
      setError("Failed to load city buses.");
    } finally {
      setLoading(false);
    }
  }

  // auto-refresh (guarded)
  useEffect(() => {
    if (!isUser) return;
    if (!autoRefresh) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }
    const latVal = coords?.lat;
    const lngVal = coords?.lng;
    if (latVal && lngVal) {
      intervalRef.current = setInterval(async () => {
        const lat = parseFloat(latVal);
        const lng = parseFloat(lngVal);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

        try {
          if (mode === "city" && selectedCity?.name) {
            // STRICT refresh in city mode
            const strictList = await fetchCityStrict(selectedCity.name);
            setBuses(strictList);
          } else {
            const list = await fetchNearbyRaw({ lat, lng, radiusMeters: radius });
            setBuses(list);
          }
        } catch (err) {
          console.warn("auto-refresh fetch error", err?.message || err);
        }
      }, 10000);
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRefresh, coords, radius, isUser, mode, selectedCity?.name]);

  // While role detection in progress show loader
  if (isUser === null || checkingRole) {
    return (
      <div className="p-4 max-w-2xl mx-auto">
        <div className="text-gray-600">Checking account role…</div>
      </div>
    );
  }

  if (!storedToken) {
    return (
      <div className="max-w-3xl mx-auto p-4">
        <h2 className="text-2xl font-semibold mb-3">You are not logged in</h2>
        <div className="p-4 bg-yellow-50 border rounded">
          <p className="mb-2">This dashboard is only available to users registered as <strong>Passengers</strong>.</p>
          <p className="text-sm text-gray-600">You must log in as a Passenger in order to access this page</p>
        </div>
      </div>
    );
  }

  // If not a passenger user, show message and prevent usage
  if (!isUser) {
    return (
      <div className="p-4 max-w-2xl mx-auto">
        <h1 className="text-2xl font-semibold mb-3">Find Buses</h1>
        <div className="p-4 bg-yellow-50 border rounded">
          <p className="mb-2">This page is for passengers (users) only.</p>
          <p className="text-sm text-gray-600">Your account role does not appear to be a passenger. If you believe this is incorrect, contact an administrator.</p>
        </div>
      </div>
    );
  }

  // show initial chooser when mode is not set
  if (!mode) {
    return (
      <div className="p-4 max-w-2xl mx-auto">
        <h1 className="text-2xl font-semibold mb-4">Find Buses</h1>
        <p className="mb-4 text-gray-600">
          Choose how you'd like to find buses: by your current location or by selecting a city in Punjab.
        </p>

        <div className="flex gap-4">
          <button
            className="px-4 py-3 bg-blue-600 text-white rounded-lg"
            onClick={() => {
              setMode("nearby");
              getLocationAndSearch();
            }}
          >
            Use my location (Nearby)
          </button>

        <button
            className="px-4 py-3 bg-gray-800 text-white rounded-lg"
            onClick={() => {
              setMode("city");
            }}
          >
            Search by city (Punjab)
          </button>
        </div>

        <div className="mt-6 text-sm text-gray-500">
          Tip: For best results allow precise location on mobile and enable high-accuracy mode.
        </div>
      </div>
    );
  }

  // Render the main page (nearby or city mode)
  return (
    <div className="p-4 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-semibold">
            {mode === "nearby" ? "Nearby Buses" : "Buses in selected city"}
          </h1>
          <div className="text-sm text-gray-500">
            {mode === "nearby"
              ? "Showing buses near your location"
              : "Showing only buses whose route mentions the selected city"}
          </div>
        </div>

        <div className="flex gap-2 items-center">
          <button
            className="px-3 py-2 border rounded text-sm"
            onClick={() => {
              // back to mode chooser
              setMode("");
              setBuses([]);
              setCoords({ lat: "", lng: "" });
              setSelectedCity(null);
              setCityQuery("");
            }}
          >
            ← Change method
          </button>

          <div className="flex flex-col items-center gap-4 text-sm">
            {/* Show current auto-detected connection status + override */}
            <div className="text-xs ml-1 px-2 py-1 text-gray-500 mr-2">
              {lowBandwidth ? "Low-bandwidth detected" : "Normal connection"}
            </div>
            <button
              title={forceShowMap ? "Maps will be shown" : "Force show maps"}
              onClick={() => setForceShowMap((s) => !s)}
              className={`px-2 py-1 text-xs rounded ${forceShowMap ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-700"}`}
            >
              {forceShowMap ? "Map override ON" : "Map override OFF"}
            </button>
            <label className="inline-flex items-center gap-1 text-sm ml-2 mt-4">
              <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} />
              <span>Auto refresh</span>
            </label>
          </div>

          {/* <label className="inline-flex items-center gap-1 text-sm">
            <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} />
            <span>Auto refresh</span>
          </label> */}
        </div>
      </div>

      {/* Top controls */}
      <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-3">
        {mode === "nearby" && (
          <>
            <div className="col-span-1 md:col-span-2 flex gap-2">
              <button className="px-3 py-2 bg-blue-600 text-white rounded" onClick={getLocationAndSearch}>
                Use my location
              </button>
              <form onSubmit={handleManualSearch} className="flex gap-2 items-center">
                <input
                  placeholder="lat"
                  value={coords.lat}
                  onChange={(e) => setCoords((s) => ({ ...s, lat: e.target.value }))}
                  className="border rounded px-2 py-1 w-28"
                />
                <input
                  placeholder="lng"
                  value={coords.lng}
                  onChange={(e) => setCoords((s) => ({ ...s, lng: e.target.value }))}
                  className="border rounded px-2 py-1 w-28"
                />
                <button type="submit" className="px-3 py-2 bg-gray-800 text-white rounded">Search</button>
              </form>
            </div>
            <div className="flex items-center gap-2 justify-end">
              <label className="text-sm text-gray-600">radius (m)</label>
              <input value={radius} onChange={(e) => setRadius(Number(e.target.value || 0))} className="border rounded px-2 py-1 w-24" />
            </div>
          </>
        )}

        {mode === "city" && (
          <>
            <div className="col-span-1 md:col-span-2">
              <div className="flex gap-2 items-center">
                <select
                  value={selectedCity ? selectedCity.name : ""}
                  onChange={(e) => {
                    const sel = PUNJAB_CITIES.find((c) => c.name === e.target.value);
                    setSelectedCity(sel || null);
                  }}
                  className="border rounded px-2 py-1"
                >
                  <option value="">-- Select city --</option>
                  {citiesFiltered.map((c) => (
                    <option key={c.name} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>

                <button
                  className="px-3 py-2 bg-gray-800 text-white rounded"
                  onClick={async () => {
                    if (!selectedCity && cityQuery) {
                      const exact = PUNJAB_CITIES.find((c) => c.name.toLowerCase() === cityQuery.trim().toLowerCase());
                      if (exact) setSelectedCity(exact);
                    }
                    await handleSearchCity();
                  }}
                >
                  Search city
                </button>
              </div>
              <div className="text-xs text-gray-500 mt-2">
                Quick picks:
                {PUNJAB_CITIES.slice(0, 6).map((c) => (
                  <button
                    key={c.name}
                    className="ml-2 underline text-sm"
                    onClick={() => {
                      setSelectedCity(c);
                      setCityQuery("");
                    }}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            </div>

            {/* radius no longer affects city filter; you can hide it, or keep for future */}
            <div className="flex items-center gap-2 justify-end opacity-60">
              <label className="text-sm text-gray-600">radius (m)</label>
              <input value={radius} onChange={(e) => setRadius(Number(e.target.value || 0))} className="border rounded px-2 py-1 w-24" />
            </div>
          </>
        )}
      </div>

      {error && <div className="text-red-600 mb-3">{error}</div>}

      {/* Results */}
      <div className="space-y-3">
        {loading && <div>Loading…</div>}
        {!loading && buses.length === 0 && <div className="text-gray-500">No buses found.</div>}

        {buses.map((b) => {
          const pos = getBusLatLng(b);
          const path = getBusPath(b);

          // If user has coords, compute distance/ETA from there; in city mode coords = city center by default
          const passengerPoint =
            Number.isFinite(parseFloat(coords.lat)) && Number.isFinite(parseFloat(coords.lng))
              ? { lat: parseFloat(coords.lat), lng: parseFloat(coords.lng) }
              : null;

          const clientDist = passengerPoint && pos ? haversineMeters(passengerPoint, pos) : NaN;
          const distToShow = Number.isFinite(b.distMeters) ? b.distMeters : clientDist;
          const etaMin = passengerPoint ? computeEtaMinutes(b, passengerPoint) : NaN;

          return (
            <div
              key={
                b._id || b.id || (b.driver?.id || b.driver?._id) + (b.route?.id || b.route?._id || b.route?.fullName || "")
              }
              className="flex gap-6 w-full"
            >
              <div className="border rounded p-3 px-6 flex-1 flex justify-between">
                <div>
                  <div className="font-semibold text-lg">{b.route?.fullName || "Route"}</div>
                  <div className="text-gray-600 mt-2">
                    <span className="text-gray-700 font-medium">Stops:</span>{" "}
                    {Array.isArray(b.route?.stops) && b.route.stops.length
                      ? b.route.stops.map((s) => (typeof s === "string" ? s : s.name)).join(" → ")
                      : "—"}
                  </div>
                  <div className="mt-1 text-sm text-gray-700">
                    <span className="font-medium text-gray-700">Time:</span>{" "}
                    <span className="text-gray-600">
                      {b.route?.startTime ? `${b.route.startTime} → ${b.route.endTime || "—"}` : "—"}
                    </span>
                  </div>

                  <div className="flex flex-col text-sm text-gray-700 mt-2">
                    <span className="font-medium">Driver:</span> {b.driver?.fullName || "—"}{" "}
                    {b.driver?.phoneNumber ? `• ${b.driver.phoneNumber}` : ""}
                    <div className="flex gap-4 items-center">
                      <span className="font-medium mt-2">Vehicle No.</span>
                      <span className="mt-2">{b.driver?.vehicleNumber ?? ""}</span>

                      <span className="font-medium mt-2 ml-4">License No.</span>
                      <span className="mt-2">{b.driver?.licenseNumber ?? ""}</span>
                    </div>
                  </div>
                </div>

                <div className="text-right mt-3 flex flex-col justify-between">
                  <div>
                    <div className="text-sm text-gray-600">Distance</div>
                    <div className="text-xl font-semibold">{fmtDist(distToShow)}</div>
                  </div>
                  <div className="text-sm text-gray-600">Arrival time</div>
                  <div className="text-xl font-semibold">
                    {fmtArrivalClock(etaMin, { timeZone: "Asia/Kolkata" })}
                  </div>

                  <div className="text-xs text-gray-500 mt-2">{b.status ? b.status.toUpperCase() : ""}</div>
                </div>
              </div>

              {/* mini map area */}
              <div className="mt-3">
                {!mapLoaded && !loadError && (
                  <div className="w-[240px] h-[160px] border rounded flex items-center justify-center bg-gray-50 text-xs text-gray-500">
                    Loading map…
                  </div>
                )}

                {loadError && (
                  <div className="w-[240px] h-[160px] border rounded flex items-center justify-center bg-red-50 text-xs text-red-600">
                    Map failed to load
                  </div>
                )}

                {mapLoaded && (
                  <MiniMap
                    lat={pos?.lat}
                    lng={pos?.lng}
                    path={path}
                    mapDisabled={lowBandwidth && !forceShowMap}
                    onEnableMap={() => setForceShowMap(true)}
                  />
                )}  
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
