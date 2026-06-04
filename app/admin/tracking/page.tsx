"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, collection, getDocs, updateDoc, query, where } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

interface Vehicle {
  id: string;
  marque: string;
  modele: string;
  immatriculation: string;
  statut: string;
}

interface VehicleLocation {
  vehicleId: string;
  immatriculation: string;
  marque: string;
  modele: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  speed: number;
  timestamp: string;
  isTracking: boolean;
}

export default function GPSTracking() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [message, setMessage] = useState("");

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [vehicleLocations, setVehicleLocations] = useState<VehicleLocation[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleLocation | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const watchIdRef = useRef<number | null>(null);

  // Check auth
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        router.push("/");
        setAuthChecking(false);
        return;
      }

      try {
        const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
        if (!userDoc.exists() || userDoc.data().role !== "admin") {
          router.push("/");
          setAuthChecking(false);
          return;
        }

        setUser(userDoc.data());
        await loadVehicles();
        await loadLocations();
        initMap();
        
        setAuthChecking(false);
      } catch (error) {
        console.error("Error:", error);
        router.push("/");
        setAuthChecking(false);
      }
    });

    return () => unsubscribe();
  }, [router]);

  // Load vehicles
  const loadVehicles = async () => {
    try {
      const snap = await getDocs(collection(db, "vehicles"));
      setVehicles(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as Vehicle[]);
    } catch (error) {
      console.error("Error loading vehicles:", error);
    }
  };

  // Load locations from Firebase
  const loadLocations = async () => {
    try {
      const snap = await getDocs(collection(db, "vehicleLocations"));
      const locations = snap.docs.map((doc) => ({ ...doc.data() })) as VehicleLocation[];
      setVehicleLocations(locations);
      
      if (mapLoaded && mapRef.current) {
        updateMapMarkers(locations);
      }
    } catch (error) {
      console.error("Error loading locations:", error);
    }
  };

  // Initialize map
  const initMap = () => {
    // Load Google Maps API
    if (!window.google) {
      const script = document.createElement("script");
      script.src = `https://maps.googleapis.com/maps/api/js?key=AIzaSyAFhvJ3xI5F0Hv8kF2qXf9Uq5qJ5qJ5qJ5`;
      script.onload = () => setMapLoaded(true);
      document.head.appendChild(script);
    } else {
      setMapLoaded(true);
    }
  };

  // Update map with markers
  const updateMapMarkers = (locations: VehicleLocation[]) => {
    if (!mapRef.current || !window.google) return;

    // Clear old markers
    markersRef.current.forEach((marker) => marker.setMap(null));
    markersRef.current = [];

    // Add new markers
    locations.forEach((location) => {
      const marker = new window.google.maps.Marker({
        position: { lat: location.latitude, lng: location.longitude },
        map: mapRef.current,
        title: location.immatriculation,
        icon: `http://maps.google.com/mapfiles/ms/icons/${location.isTracking ? "green" : "red"}-dot.png`,
      });

      marker.addListener("click", () => setSelectedVehicle(location));
      markersRef.current.push(marker);
    });

    // Center map on first vehicle or default
    if (locations.length > 0) {
      const firstLoc = locations[0];
      mapRef.current.setCenter({ lat: firstLoc.latitude, lng: firstLoc.longitude });
      mapRef.current.setZoom(12);
    }
  };

  // Start tracking (simulate for demo)
  const startTracking = async () => {
    setMessage("📍 Localisation en cours...");

    if (!navigator.geolocation) {
      setMessage("❌ Géolocalisation non supportée");
      return;
    }

    // Request continuous location updates
    const watchId = navigator.geolocation.watchPosition(
      async (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        const speed = position.coords.speed || 0;

        // Simulate vehicle tracking (update all vehicles)
        const updatedLocations = vehicles.map((vehicle) => ({
          vehicleId: vehicle.id,
          immatriculation: vehicle.immatriculation,
          marque: vehicle.marque,
          modele: vehicle.modele,
          latitude: latitude + (Math.random() - 0.5) * 0.01,
          longitude: longitude + (Math.random() - 0.5) * 0.01,
          accuracy,
          speed,
          timestamp: new Date().toISOString(),
          isTracking: true,
        }));

        setVehicleLocations(updatedLocations);
        setIsTracking(true);
        setMessage("✓ Localisation active");

        // Save to Firebase (update each vehicle location)
        try {
          for (const location of updatedLocations) {
            await updateDoc(doc(db, "vehicleLocations", location.vehicleId), {
              ...location,
            }).catch(() => {
              // Create if doesn't exist
              const { vehicleId, ...data } = location;
            });
          }
        } catch (error) {
          console.error("Error saving location:", error);
        }

        updateMapMarkers(updatedLocations);
        setTimeout(() => setMessage(""), 3000);
      },
      (error) => {
        setMessage("❌ Permission refusée ou erreur GPS");
        console.error("Geolocation error:", error);
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 }
    );

    watchIdRef.current = watchId;
  };

  // Stop tracking
  const stopTracking = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsTracking(false);
    setMessage("⏸️ Localisation arrêtée");
    setTimeout(() => setMessage(""), 3000);
  };

  // Refresh locations
  const refreshLocations = async () => {
    setMessage("🔄 Actualisation...");
    await loadLocations();
    setMessage("✓ À jour");
    setTimeout(() => setMessage(""), 2000);
  };

  if (authChecking) {
    return (
      <main style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #faf8ff 0%, #f5ecff 100%)",
      }}>
        <div style={{ textAlign: "center", color: "#6a1ea3" }}>Vérification...</div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .a1 { animation: fadeUp 0.55s cubic-bezier(.22,1,.36,1) 0.00s both; }
        .a2 { animation: fadeUp 0.55s cubic-bezier(.22,1,.36,1) 0.06s both; }

        .page-bg {
          position: fixed; inset: 0;
          background:
            radial-gradient(ellipse at top left, rgba(155,62,213,0.3) 0%, transparent 50%),
            radial-gradient(ellipse at top right, rgba(200,140,240,0.25) 0%, transparent 50%),
            linear-gradient(160deg, #faf8ff 0%, #f5ecff 100%);
          z-index: 0;
        }

        .glass {
          position: relative;
          border-radius: 24px;
          padding: 1.5px;
          background: linear-gradient(135deg, rgba(155,62,213,0.4) 0%, rgba(200,140,240,0.3) 50%, rgba(220,80,180,0.4) 100%);
          box-shadow: 0 20px 50px rgba(120,30,140,0.15);
        }

        .glass-inner {
          position: relative;
          border-radius: 23px;
          background: linear-gradient(165deg, rgba(255,250,253,0.92) 0%, rgba(252,245,250,0.88) 100%);
          backdrop-filter: blur(32px);
          padding: 32px;
        }

        .map-container {
          width: 100%;
          height: 600px;
          border-radius: 20px;
          overflow: hidden;
          background: #e5e3ff;
        }

        .btn-primary {
          background: linear-gradient(135deg, #9b3ed5 0%, #c534b5 100%);
          color: white;
          border: none;
          border-radius: 10px;
          padding: 10px 20px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.25s;
        }

        .btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 28px rgba(155,62,213,0.4);
        }

        .btn-secondary {
          background: rgba(200,140,240,0.15);
          color: #9b3ed5;
          border: 1px solid rgba(200,140,240,0.3);
          border-radius: 10px;
          padding: 10px 20px;
          font-weight: 600;
          cursor: pointer;
        }

        .btn-danger {
          background: rgba(239,82,123,0.1);
          color: #ef527b;
          border: 1px solid rgba(239,82,123,0.3);
          border-radius: 10px;
          padding: 10px 20px;
          font-weight: 600;
          cursor: pointer;
        }

        .vehicle-card {
          background: rgba(255,255,255,0.4);
          border: 1px solid rgba(200,140,240,0.2);
          border-radius: 12px;
          padding: 14px;
          margin-bottom: 8px;
          transition: all 0.2s;
          cursor: pointer;
        }

        .vehicle-card:hover {
          background: rgba(255,255,255,0.6);
          border-color: rgba(155,62,213,0.3);
          box-shadow: 0 4px 12px rgba(155,62,213,0.1);
        }

        .vehicle-card.active {
          background: rgba(155,62,213,0.1);
          border-color: rgba(155,62,213,0.5);
        }

        .status-badge {
          display: inline-block;
          padding: 4px 12px;
          border-radius: 6px;
          font-size: 11px;
          font-weight: 700;
        }

        .status-online {
          background: rgba(34,197,94,0.15);
          color: #15803d;
        }

        .status-offline {
          background: rgba(107,114,128,0.15);
          color: #374151;
        }

        .msg-success {
          background: linear-gradient(135deg, rgba(34,197,94,0.15), rgba(34,197,94,0.05));
          border: 1px solid rgba(34,197,94,0.35);
          color: #15803d;
          padding: 12px 16px;
          border-radius: 10px;
          font-size: 13px;
          font-weight: 500;
        }
      `}</style>

      <div className="page-bg" />

      <div className="relative z-10 px-4 py-8">
        <div className="mx-auto max-w-7xl">

          {/* Header */}
          <div className="a1 glass mb-6">
            <div className="glass-inner">
              <div className="flex items-center justify-between">
                <div>
                  <h1 style={{ fontSize: "36px", fontWeight: 800, color: "#1f0a2a", marginBottom: "4px" }}>
                    🗺️ Suivi GPS
                  </h1>
                  <p className="text-[13.5px] text-[#6a3a78]">
                    Localisation en temps réel des véhicules
                  </p>
                </div>
                <button onClick={() => router.push("/admin")} className="btn-secondary">
                  ← Retour
                </button>
              </div>
            </div>
          </div>

          {/* Message */}
          {message && <div className="a2 msg-success mb-6">{message}</div>}

          {/* Controls */}
          <div className="a2 glass mb-6">
            <div className="glass-inner">
              <div className="flex gap-3 flex-wrap">
                {!isTracking ? (
                  <button onClick={startTracking} className="btn-primary">
                    ▶️ Commencer le suivi
                  </button>
                ) : (
                  <button onClick={stopTracking} className="btn-danger">
                    ⏹️ Arrêter le suivi
                  </button>
                )}
                <button onClick={refreshLocations} className="btn-secondary">
                  🔄 Actualiser
                </button>
                <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{
                    background: isTracking ? "rgba(34,197,94,0.2)" : "rgba(107,114,128,0.2)",
                    color: isTracking ? "#15803d" : "#6b7280",
                    padding: "6px 14px",
                    borderRadius: "8px",
                    fontSize: "13px",
                    fontWeight: 600,
                  }}>
                    {isTracking ? "🟢 ACTIF" : "⚫ INACTIF"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Map + List */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Map */}
            <div className="a2 lg:col-span-3 glass">
              <div className="glass-inner p-0">
                <div
                  ref={mapRef}
                  className="map-container"
                  style={{
                    background: "#e5e3ff url('data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22100%22 height=%22100%22><rect fill=%22%23e5e3ff%22 width=%22100%22 height=%22100%22/><path d=%22M20 20L80 80M80 20L20 80%22 stroke=%22rgba(155,62,213,0.1)%22 stroke-width=%221%22/></svg>')",
                  }}
                >
                  {!mapLoaded && (
                    <div style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      height: "100%",
                      color: "#6a1ea3",
                      fontSize: "14px",
                    }}>
                      📍 Chargement de la carte...
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Vehicle List */}
            <div className="a2 glass">
              <div className="glass-inner">
                <h2 style={{ fontSize: "16px", fontWeight: 700, color: "#1f0a2a", marginBottom: "16px" }}>
                  🚗 Véhicules ({vehicleLocations.length})
                </h2>

                <div className="space-y-2 max-h-[600px] overflow-y-auto">
                  {vehicleLocations.length === 0 ? (
                    <p className="text-[12px] text-[#6a3a78]">Aucune localisation</p>
                  ) : (
                    vehicleLocations.map((location) => (
                      <div
                        key={location.vehicleId}
                        onClick={() => setSelectedVehicle(location)}
                        className={`vehicle-card ${selectedVehicle?.vehicleId === location.vehicleId ? "active" : ""}`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p style={{ fontWeight: 700, color: "#1f0a2a", fontSize: "13px" }}>
                              {location.immatriculation}
                            </p>
                            <p style={{ fontSize: "11px", color: "#6a3a78", marginTop: "2px" }}>
                              {location.marque} {location.modele}
                            </p>
                          </div>
                          <span className={`status-badge ${location.isTracking ? "status-online" : "status-offline"}`}>
                            {location.isTracking ? "🟢 En ligne" : "⚫ Hors ligne"}
                          </span>
                        </div>

                        <p style={{ fontSize: "10px", color: "#9b3ed5", marginTop: "6px" }}>
                          📍 {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
                        </p>
                        <p style={{ fontSize: "10px", color: "#6a3a78" }}>
                          ⚡ {(location.speed || 0).toFixed(1)} km/h
                        </p>
                        <p style={{ fontSize: "10px", color: "#6a3a78" }}>
                          🎯 {location.accuracy.toFixed(0)}m
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Selected Vehicle Details */}
          {selectedVehicle && (
            <div className="a2 glass mt-6">
              <div className="glass-inner">
                <h2 style={{ fontSize: "18px", fontWeight: 700, color: "#1f0a2a", marginBottom: "16px" }}>
                  📍 Détails: {selectedVehicle.immatriculation}
                </h2>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-[11px] font-bold text-[#9b3ed5] mb-2">Latitude</p>
                    <p style={{ fontWeight: 600, color: "#1f0a2a", fontSize: "13px" }}>
                      {selectedVehicle.latitude.toFixed(6)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-[#9b3ed5] mb-2">Longitude</p>
                    <p style={{ fontWeight: 600, color: "#1f0a2a", fontSize: "13px" }}>
                      {selectedVehicle.longitude.toFixed(6)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-[#9b3ed5] mb-2">Vitesse</p>
                    <p style={{ fontWeight: 600, color: "#1f0a2a", fontSize: "13px" }}>
                      {(selectedVehicle.speed || 0).toFixed(1)} km/h
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-[#9b3ed5] mb-2">Précision</p>
                    <p style={{ fontWeight: 600, color: "#1f0a2a", fontSize: "13px" }}>
                      ±{selectedVehicle.accuracy.toFixed(0)}m
                    </p>
                  </div>
                  <div className="col-span-2 md:col-span-4">
                    <p className="text-[11px] font-bold text-[#9b3ed5] mb-2">Dernière mise à jour</p>
                    <p style={{ fontWeight: 600, color: "#1f0a2a", fontSize: "13px" }}>
                      {new Date(selectedVehicle.timestamp).toLocaleString("fr-FR")}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </main>
  );
}
