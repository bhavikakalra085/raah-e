import React, { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const vehicleIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.3/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.3/dist/images/marker-icon-2x.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

function FitBounds({ coords }) {
  const map = useMap();
  useEffect(() => {
    if (!coords || coords.length === 0) return;
    const latlngs = coords.map((c) => [c.lat, c.lng]);
    map.fitBounds(latlngs, { padding: [40, 40] });
  }, [coords, map]);
  return null;
}

export default function RouteMap({ route, ride, socket }) {
  const [vehiclePos, setVehiclePos] = useState(null);
  const [history, setHistory] = useState([]);

  const coords = useMemo(() => {
    if (!route || !route.stops) return [];
    return [...route.stops].sort((a,b) => (a.order ?? 0) - (b.order ?? 0)).map(s => ({ lat: s.lat, lng: s.lng, name: s.name }));
  }, [route]);

  useEffect(() => {
    if (ride && ride.lastLocation) {
      const p = { lat: ride.lastLocation.lat, lng: ride.lastLocation.lng, ts: new Date(ride.lastLocation.ts) };
      setVehiclePos(p);
      setHistory(h => [...h, p]);
    }
  }, [ride?.lastLocation]);

  useEffect(() => {
    if (!socket || !ride) return;
    function onLoc(data) {
      if (data?.rideId !== ride._id) return;
      const p = data.point ? { lat: data.point.lat, lng: data.point.lng, ts: new Date(data.point.ts) } : null;
      if (p) {
        setVehiclePos(p);
        setHistory(h => [...h, p]);
      }
    }
    socket.on('locationUpdate', onLoc);
    return () => socket.off('locationUpdate', onLoc);
  }, [socket, ride]);

  const polyline = coords.map(c => [c.lat, c.lng]);
  const initialCenter = coords.length ? [coords[0].lat, coords[0].lng] : [0,0];

  return (
    <MapContainer center={initialCenter} zoom={13} style={{ height: '100%', width: '100%' }}>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap contributors' />
      {coords.length > 0 && <FitBounds coords={coords} />}
      {polyline.length > 0 && <Polyline positions={polyline} color="#2563eb" weight={5} opacity={0.75} />}
      {coords.map((c,i) => <Marker key={i} position={[c.lat, c.lng]}>
        <Popup><div><div className="font-medium">{c.name}</div><div>Stop #{i+1}</div></div></Popup>
      </Marker>)}
      {vehiclePos && <>
        <Marker position={[vehiclePos.lat, vehiclePos.lng]} icon={vehicleIcon}>
          <Popup><div>Vehicle • {vehiclePos.ts?.toLocaleTimeString?.()}</div></Popup>
        </Marker>
        {history.length>1 && <Polyline positions={history.map(p=>[p.lat,p.lng])} color="#ff0000" weight={3} dashArray="6" />}
      </>}
    </MapContainer>
  );
}
