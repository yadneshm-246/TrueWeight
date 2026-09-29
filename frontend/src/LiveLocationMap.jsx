import { useEffect, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Circle,
  Popup,
  useMap,
} from "react-leaflet";
import L from "leaflet";

// =====================================================
// LIVE LOCATION MARKER
// =====================================================

function LocationMarker({ position, accuracy }) {
  const map = useMap();

  useEffect(() => {
    if (position) {
      map.setView(position, 17);
    }
  }, [position, map]);

  if (!position) {
    return null;
  }

  const icon = L.divIcon({
    className: "trueweight-location-marker",
    html: `
      <div style="
        width: 18px;
        height: 18px;
        background: #2563eb;
        border: 3px solid white;
        border-radius: 50%;
        box-shadow: 0 2px 8px rgba(0,0,0,0.35);
      "></div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });

  return (
    <>
      <Marker position={position} icon={icon}>
        <Popup>
          <strong>TrueWeight Inspector</strong>
          <br />
          Current physical location
        </Popup>
      </Marker>

      {accuracy !== null && (
        <Circle
          center={position}
          radius={accuracy}
          pathOptions={{
            color: "#2563eb",
            fillColor: "#2563eb",
            fillOpacity: 0.12,
            weight: 2,
          }}
        />
      )}
    </>
  );
}

// =====================================================
// LIVE LOCATION MAP
// =====================================================

function LiveLocationMap({ onLocationChange }) {
  const [position, setPosition] = useState(null);
  const [accuracy, setAccuracy] = useState(null);
  const [altitude, setAltitude] = useState(null);
  const [timestamp, setTimestamp] = useState(null);

  const [locationError, setLocationError] = useState("");
  const [gpsStatus, setGpsStatus] = useState("REQUESTING");

  useEffect(() => {
    if (!navigator.geolocation) {
      setGpsStatus("UNAVAILABLE");

      setLocationError(
        "Geolocation is not supported by this browser."
      );

      return;
    }

    setGpsStatus("REQUESTING");

    const watchId = navigator.geolocation.watchPosition(
      (location) => {
        const coords = location.coords;

        const locationData = {
          latitude: coords.latitude,
          longitude: coords.longitude,

          altitude:
            coords.altitude !== null
              ? coords.altitude
              : null,

          accuracy: coords.accuracy,

          timestamp: new Date(
            location.timestamp
          ).toISOString(),
        };

        setPosition([
          coords.latitude,
          coords.longitude,
        ]);

        setAccuracy(coords.accuracy);

        setAltitude(
          coords.altitude !== null
            ? coords.altitude
            : null
        );

        setTimestamp(
          new Date(
            location.timestamp
          ).toISOString()
        );

        setLocationError("");
        setGpsStatus("LIVE");

        if (onLocationChange) {
          onLocationChange(locationData);
        }
      },

      (error) => {
        console.error(
          "Geolocation error:",
          error
        );

        setGpsStatus("ERROR");

        if (error.code === 1) {
          setLocationError(
            "Location permission was denied. Please allow location access."
          );
        } else if (error.code === 2) {
          setLocationError(
            "Your current location could not be determined."
          );
        } else if (error.code === 3) {
          setLocationError(
            "Location request timed out. Trying again..."
          );
        } else {
          setLocationError(
            "Unable to get your current location."
          );
        }
      },

      {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 15000,
      }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [onLocationChange]);

  // Default map position before GPS is received
  const defaultPosition = [
    20.5937,
    78.9629,
  ];

  return (
    <div
      style={{
        marginTop: "24px",
        padding: "20px",
        border: "1px solid #e5e7eb",
        borderRadius: "14px",
        background: "#ffffff",
      }}
    >
      {/* =================================================
          HEADER
      ================================================= */}

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "15px",
          gap: "15px",
        }}
      >
        <div>
          <h3
            style={{
              margin: 0,
              marginBottom: "5px",
            }}
          >
            📍 Live Physical Location
          </h3>

          <p
            style={{
              margin: 0,
              color: "#6b7280",
              fontSize: "14px",
            }}
          >
            Inspector location captured from
            the device GPS.
          </p>
        </div>

        <div
          style={{
            padding: "7px 12px",
            borderRadius: "20px",
            fontSize: "12px",
            fontWeight: "700",
            background:
              gpsStatus === "LIVE"
                ? "#dcfce7"
                : "#fef3c7",
            color:
              gpsStatus === "LIVE"
                ? "#166534"
                : "#92400e",
            whiteSpace: "nowrap",
          }}
        >
          ●{" "}
          {gpsStatus === "LIVE"
            ? "GPS LIVE"
            : gpsStatus}
        </div>
      </div>

      {/* =================================================
          ERROR
      ================================================= */}

      {locationError && (
        <div
          style={{
            padding: "12px",
            marginBottom: "15px",
            borderRadius: "8px",
            background: "#fef2f2",
            color: "#b91c1c",
            fontSize: "14px",
          }}
        >
          ⚠️ {locationError}
        </div>
      )}

      {/* =================================================
          MAP
      ================================================= */}

      <div
        style={{
          width: "100%",
          height: "380px",
          borderRadius: "12px",
          overflow: "hidden",
        }}
      >
        <MapContainer
          center={
            position || defaultPosition
          }
          zoom={position ? 17 : 5}
          scrollWheelZoom={true}
          style={{
            height: "100%",
            width: "100%",
          }}
        >
          <TileLayer
            attribution='&copy; OpenStreetMap contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <LocationMarker
            position={position}
            accuracy={accuracy}
          />
        </MapContainer>
      </div>

      {/* =================================================
          LOCATION DATA
      ================================================= */}

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(4, 1fr)",
          gap: "10px",
          marginTop: "15px",
        }}
      >
        <div
          style={{
            padding: "12px",
            background: "#f8fafc",
            borderRadius: "10px",
          }}
        >
          <div
            style={{
              fontSize: "12px",
              color: "#64748b",
            }}
          >
            Latitude
          </div>

          <strong>
            {position
              ? position[0].toFixed(6)
              : "Waiting..."}
          </strong>
        </div>

        <div
          style={{
            padding: "12px",
            background: "#f8fafc",
            borderRadius: "10px",
          }}
        >
          <div
            style={{
              fontSize: "12px",
              color: "#64748b",
            }}
          >
            Longitude
          </div>

          <strong>
            {position
              ? position[1].toFixed(6)
              : "Waiting..."}
          </strong>
        </div>

        <div
          style={{
            padding: "12px",
            background: "#f8fafc",
            borderRadius: "10px",
          }}
        >
          <div
            style={{
              fontSize: "12px",
              color: "#64748b",
            }}
          >
            Accuracy
          </div>

          <strong>
            {accuracy !== null
              ? `±${accuracy.toFixed(1)} m`
              : "Waiting..."}
          </strong>
        </div>

        <div
          style={{
            padding: "12px",
            background: "#f8fafc",
            borderRadius: "10px",
          }}
        >
          <div
            style={{
              fontSize: "12px",
              color: "#64748b",
            }}
          >
            Altitude
          </div>

          <strong>
            {altitude !== null
              ? `${altitude.toFixed(1)} m`
              : "Not provided"}
          </strong>
        </div>
      </div>

      {/* =================================================
          TIMESTAMP
      ================================================= */}

      {timestamp && (
        <div
          style={{
            marginTop: "12px",
            fontSize: "12px",
            color: "#64748b",
          }}
        >
          GPS captured:{" "}
          {new Date(
            timestamp
          ).toLocaleString()}
        </div>
      )}
    </div>
  );
}

export default LiveLocationMap;