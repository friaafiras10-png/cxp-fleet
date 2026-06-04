"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, createUserWithEmailAndPassword, signOut, deleteUser } from "firebase/auth";
import { doc, getDoc, collection, getDocs, query, where, updateDoc, addDoc, setDoc, deleteDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

// Leaflet types
declare global {
  interface Window {
    L: any;
  }
}

interface UserData {
  firstName: string;
  lastName: string;
  email: string;
  role: string;
}

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  createdAt: string;
}

interface FuelRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  vehicleInfo: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
}

interface IssueReport {
  id: string;
  employeeId: string;
  employeeName: string;
  vehicleInfo: string;
  problemType: string;
  description: string;
  urgency: string;
  status: "reported" | "acknowledged" | "resolved";
  createdAt: string;
}

interface VacationRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
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

interface Vehicle {
  id: string;
  marque: string;
  modele: string;
  immatriculation: string;
  chauffeurAssigne: string;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [authChecking, setAuthChecking] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [message, setMessage] = useState("");

  // Data
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [fuelRequests, setFuelRequests] = useState<FuelRequest[]>([]);
  const [issueReports, setIssueReports] = useState<IssueReport[]>([]);
  const [vacationRequests, setVacationRequests] = useState<VacationRequest[]>([]);

  // Stats
  const [pendingFuelCount, setPendingFuelCount] = useState(0);
  const [pendingIssuesCount, setPendingIssuesCount] = useState(0);
  const [pendingVacationCount, setPendingVacationCount] = useState(0);
  const [activeSessionsCount, setActiveSessionsCount] = useState(0);

  // Vehicle & Location data
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [vehicleLocations, setVehicleLocations] = useState<VehicleLocation[]>([]);
  const [workSessions, setWorkSessions] = useState<any[]>([]);

  // Employee details modal
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [selectedEmployeeVehicle, setSelectedEmployeeVehicle] = useState<Vehicle | null>(null);
  const [selectedEmployeeLocation, setSelectedEmployeeLocation] = useState<VehicleLocation | null>(null);

  // Employee creation
  const [showCreateEmployee, setShowCreateEmployee] = useState(false);
  const [newEmpFirstName, setNewEmpFirstName] = useState("");
  const [newEmpLastName, setNewEmpLastName] = useState("");
  const [newEmpEmail, setNewEmpEmail] = useState("");
  const [newEmpPassword, setNewEmpPassword] = useState("");
  const [newEmpRole, setNewEmpRole] = useState("worker");

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

        setUser(userDoc.data() as UserData);
        
        // Load all data
        await loadAllData();
        
        setAuthChecking(false);
        setLoading(false);
      } catch (error) {
        console.error("Error:", error);
        router.push("/");
        setAuthChecking(false);
      }
    });

    return () => unsubscribe();
  }, [router]);

  // Initialize and update map with Leaflet
  useEffect(() => {
    if (activeTab === "tracking" && vehicleLocations.length > 0) {
      loadLeaflet();
    }
  }, [activeTab, vehicleLocations]);

  const loadLeaflet = () => {
    // Load Leaflet CSS and JS if not already loaded
    if (!window.L) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css";
      document.head.appendChild(link);

      const script = document.createElement("script");
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js";
      script.async = true;
      script.onload = () => initializeMap();
      document.head.appendChild(script);
    } else {
      initializeMap();
    }
  };

  const initializeMap = () => {
    if (!window.L || !vehicleLocations.length) return;

    const mapElement = document.getElementById("map");
    if (!mapElement) return;

    // Clear existing map
    if (mapElement._leaflet_id) {
      window.L.map(mapElement).remove();
    }

    const firstLoc = vehicleLocations[0];
    const map = window.L.map("map", {
      center: [firstLoc.latitude, firstLoc.longitude],
      zoom: 13,
      zoomControl: true,
    });

    // Add OpenStreetMap tiles
    window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
      maxZoom: 19,
    }).addTo(map);

    // Add markers for each vehicle
    vehicleLocations.forEach((location) => {
      const color = location.isTracking ? "green" : "red";
      const html = `
        <div style="
          background: ${location.isTracking ? "#15803d" : "#dc2626"};
          color: white;
          border-radius: 50%;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          border: 3px solid white;
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
          cursor: pointer;
        ">
          🚗
        </div>
      `;

      const icon = window.L.divIcon({
        html: html,
        iconSize: [32, 32],
        className: "custom-marker",
      });

      const marker = window.L.marker([location.latitude, location.longitude], {
        icon: icon,
        title: location.immatriculation,
      }).addTo(map);

      marker.bindPopup(`
        <div style="font-size: 12px; min-width: 150px;">
          <strong>${location.immatriculation}</strong><br/>
          ${location.marque} ${location.modele}<br/>
          ⚡ ${(location.speed || 0).toFixed(1)} km/h<br/>
          ${location.isTracking ? "🟢 En ligne" : "⚫ Hors ligne"}
        </div>
      `);

      marker.on("click", () => {
        setSelectedEmployee(location as any);
      });
    });
  };

  // Load all data
  const loadAllData = async () => {
    try {
      const empSnap = await getDocs(collection(db, "users"));
      const empData = empSnap.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .filter((e: any) => e.role === "worker" || e.role === "admin") as Employee[];
      setEmployees(empData);

      const fuelSnap = await getDocs(collection(db, "fuelRequests"));
      const fuelData = fuelSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as FuelRequest[];
      setFuelRequests(fuelData);
      setPendingFuelCount(fuelData.filter((f) => f.status === "pending").length);

      const issueSnap = await getDocs(collection(db, "issueReports"));
      const issueData = issueSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as IssueReport[];
      setIssueReports(issueData);
      setPendingIssuesCount(issueData.filter((i) => i.status === "reported").length);

      const vacationSnap = await getDocs(collection(db, "vacationRequests"));
      const vacationData = vacationSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as VacationRequest[];
      setVacationRequests(vacationData);
      setPendingVacationCount(vacationData.filter((v) => v.status === "pending").length);

      // Load vehicles
      const vehiclesSnap = await getDocs(collection(db, "vehicles"));
      const vehiclesData = vehiclesSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as Vehicle[];
      setVehicles(vehiclesData);

      // Load vehicle locations and deduplicate (keep latest per vehicleId)
      const locationsSnap = await getDocs(collection(db, "vehicleLocations"));
      const locationsData = locationsSnap.docs.map((doc) => doc.data()) as VehicleLocation[];
      
      // Remove duplicates - keep only the latest location per vehicle
      const locationsMap = new Map();
      locationsData.forEach((loc) => {
        const existing = locationsMap.get(loc.vehicleId);
        if (!existing || new Date(loc.timestamp) > new Date(existing.timestamp)) {
          locationsMap.set(loc.vehicleId, loc);
        }
      });
      
      setVehicleLocations(Array.from(locationsMap.values()));

      // Load work sessions
      const sessionsSnap = await getDocs(collection(db, "workSessions"));
      const sessionsData = sessionsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setWorkSessions(sessionsData);
      setActiveSessionsCount(sessionsData.filter((s: any) => s.status === "active").length);
    } catch (error) {
      console.error("Error loading data:", error);
    }
  };

  // Approve fuel request
  const approveFuelRequest = async (id: string) => {
    try {
      await updateDoc(doc(db, "fuelRequests", id), { status: "approved" });
      await loadAllData();
      setMessage("✓ Demande d'essence approuvée");
      setTimeout(() => setMessage(""), 3000);
    } catch (error) {
      console.error("Error:", error);
      setMessage("Erreur lors de l'approbation");
    }
  };

  // Reject fuel request
  const rejectFuelRequest = async (id: string) => {
    try {
      await updateDoc(doc(db, "fuelRequests", id), { status: "rejected" });
      await loadAllData();
      setMessage("✓ Demande d'essence rejetée");
      setTimeout(() => setMessage(""), 3000);
    } catch (error) {
      console.error("Error:", error);
      setMessage("Erreur lors du rejet");
    }
  };

  // Approve vacation request
  const approveVacation = async (id: string) => {
    try {
      await updateDoc(doc(db, "vacationRequests", id), { status: "approved" });
      await loadAllData();
      setMessage("✓ Congé approuvé");
      setTimeout(() => setMessage(""), 3000);
    } catch (error) {
      console.error("Error:", error);
      setMessage("Erreur lors de l'approbation");
    }
  };

  // Reject vacation request
  const rejectVacation = async (id: string) => {
    try {
      await updateDoc(doc(db, "vacationRequests", id), { status: "rejected" });
      await loadAllData();
      setMessage("✓ Congé rejeté");
      setTimeout(() => setMessage(""), 3000);
    } catch (error) {
      console.error("Error:", error);
      setMessage("Erreur lors du rejet");
    }
  };

  // Acknowledge issue
  const acknowledgeIssue = async (id: string) => {
    try {
      await updateDoc(doc(db, "issueReports", id), { status: "acknowledged" });
      await loadAllData();
      setMessage("✓ Signalement reconnu");
      setTimeout(() => setMessage(""), 3000);
    } catch (error) {
      console.error("Error:", error);
      setMessage("Erreur");
    }
  };

  // Resolve issue
  const resolveIssue = async (id: string) => {
    try {
      await updateDoc(doc(db, "issueReports", id), { status: "resolved" });
      await loadAllData();
      setMessage("✓ Signalement résolu");
      setTimeout(() => setMessage(""), 3000);
    } catch (error) {
      console.error("Error:", error);
      setMessage("Erreur");
    }
  };

  // Handle employee click to show location
  const handleEmployeeClick = (employee: Employee) => {
    setSelectedEmployee(employee);
    // Find vehicle assigned to this employee
    const assignedVehicle = vehicles.find((v) => v.chauffeurAssigne === employee.firstName + " " + employee.lastName || v.chauffeurAssigne === employee.email);
    setSelectedEmployeeVehicle(assignedVehicle || null);
    
    // Find vehicle location
    if (assignedVehicle) {
      const location = vehicleLocations.find((l) => l.vehicleId === assignedVehicle.id);
      setSelectedEmployeeLocation(location || null);
    } else {
      setSelectedEmployeeLocation(null);
    }
  };

  // Create new employee
  const createEmployee = async () => {
    if (!newEmpFirstName || !newEmpLastName || !newEmpEmail || !newEmpPassword) {
      setMessage("❌ Remplissez tous les champs");
      return;
    }

    try {
      // Create Firebase user
      const userCredential = await createUserWithEmailAndPassword(auth, newEmpEmail, newEmpPassword);
      const uid = userCredential.user.uid;

      // Add to Firestore with UID as document ID
      await setDoc(doc(db, "users", uid), {
        firstName: newEmpFirstName,
        lastName: newEmpLastName,
        email: newEmpEmail,
        role: newEmpRole,
        createdAt: new Date().toISOString(),
      });

      setMessage("✓ Employé créé avec succès!");
      setShowCreateEmployee(false);
      setNewEmpFirstName("");
      setNewEmpLastName("");
      setNewEmpEmail("");
      setNewEmpPassword("");
      setNewEmpRole("worker");
      
      // Sign out the new employee to restore admin session
      await signOut(auth);
      
      // Reload to re-authenticate as admin
      setTimeout(() => window.location.reload(), 800);
      
    } catch (error: any) {
      setMessage(`❌ Erreur: ${error.message}`);
    }
  };

  // Delete employee
  const deleteEmployee = async (empId: string, empEmail: string) => {
    if (!window.confirm(`Supprimer ${empEmail}?`)) return;

    try {
      // Delete from Firestore
      await deleteDoc(doc(db, "users", empId));
      
      setMessage("✓ Employé supprimé");
      await loadAllData();
      setTimeout(() => setMessage(""), 2000);
    } catch (error: any) {
      setMessage(`❌ Erreur: ${error.message}`);
    }
  };

  // Logout
  const handleLogout = async () => {
    try {
      await auth.signOut();
      router.push("/");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  if (authChecking) {
    return (
      <main style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #faf8ff 0%, #f5ecff 100%)",
        fontFamily: "'Inter', sans-serif",
      }}>
        <div style={{ textAlign: "center", color: "#6a1ea3" }}>
          <div style={{ fontSize: "24px", fontWeight: 700 }}>Vérification...</div>
        </div>
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
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        .a1 { animation: fadeUp 0.55s cubic-bezier(.22,1,.36,1) 0.00s both; }
        .a2 { animation: fadeUp 0.55s cubic-bezier(.22,1,.36,1) 0.06s both; }
        .a3 { animation: fadeUp 0.55s cubic-bezier(.22,1,.36,1) 0.12s both; }

        body { font-family: 'Inter', sans-serif; }

        .page-bg {
          position: fixed; inset: 0;
          background:
            radial-gradient(ellipse at top left, rgba(155,62,213,0.3) 0%, transparent 50%),
            radial-gradient(ellipse at top right, rgba(200,140,240,0.25) 0%, transparent 50%),
            radial-gradient(ellipse at bottom right, rgba(220,80,180,0.2) 0%, transparent 55%),
            linear-gradient(160deg, #faf8ff 0%, #f5ecff 35%, #ede8f5 70%, #f0e8ff 100%);
          z-index: 0;
        }

        .atmo {
          position: fixed;
          border-radius: 50%;
          filter: blur(90px);
          pointer-events: none;
          z-index: 1;
        }

        .glass {
          position: relative;
          border-radius: 24px;
          padding: 1.5px;
          background: linear-gradient(135deg,
            rgba(155,62,213,0.4) 0%,
            rgba(200,140,240,0.3) 50%,
            rgba(220,80,180,0.4) 100%);
          box-shadow:
            0 20px 50px rgba(120,30,140,0.15),
            0 6px 18px rgba(0,0,0,0.05);
        }

        .glass-inner {
          position: relative;
          border-radius: 23px;
          background:
            radial-gradient(ellipse at top left, rgba(200,140,240,0.2) 0%, transparent 55%),
            radial-gradient(ellipse at bottom right, rgba(220,150,190,0.25) 0%, transparent 55%),
            linear-gradient(165deg, rgba(255,250,253,0.92) 0%, rgba(252,245,250,0.88) 100%);
          backdrop-filter: blur(32px) saturate(180%);
          -webkit-backdrop-filter: blur(32px) saturate(180%);
          overflow: hidden;
          padding: 32px;
        }

        .glass-inner::before {
          content: '';
          position: absolute;
          top: 0; left: 10%; right: 10%;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.95), transparent);
        }

        .stat-card {
          background: rgba(255,255,255,0.6);
          border: 1.5px solid rgba(200,140,240,0.3);
          border-radius: 16px;
          padding: 20px;
          backdrop-filter: blur(8px);
          transition: all 0.3s;
          position: relative;
          overflow: hidden;
          cursor: pointer;
        }

        .stat-card:hover {
          border-color: rgba(155,62,213,0.5);
          background: rgba(255,255,255,0.8);
          box-shadow: 0 12px 30px rgba(155,62,213,0.1);
          transform: translateY(-4px);
        }

        .stat-badge {
          position: absolute;
          top: -8px;
          right: -8px;
          width: 40px;
          height: 40px;
          background: linear-gradient(135deg, #ff2f78 0%, #ff5f9e 100%);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: 800;
          font-size: 18px;
          animation: pulse 2s infinite;
        }

        .tab-button {
          padding: 10px 20px;
          border: none;
          border-radius: 12px;
          font-weight: 600;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.25s;
          color: #6a1ea3;
          background: transparent;
        }

        .tab-button.active {
          background: linear-gradient(135deg, #9b3ed5 0%, #c534b5 100%);
          color: white;
          box-shadow: 0 8px 20px rgba(155,62,213,0.3);
        }

        .btn-primary {
          background: linear-gradient(135deg, #9b3ed5 0%, #c534b5 100%);
          color: white;
          border: none;
          border-radius: 10px;
          padding: 8px 16px;
          font-weight: 600;
          font-size: 13px;
          cursor: pointer;
          transition: all 0.25s;
          box-shadow: 0 8px 20px rgba(155,62,213,0.3);
        }

        .btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 28px rgba(155,62,213,0.4);
        }

        .btn-success {
          background: rgba(34,197,94,0.1);
          color: #15803d;
          border: 1px solid rgba(34,197,94,0.3);
          border-radius: 8px;
          padding: 6px 12px;
          font-weight: 600;
          font-size: 12px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-success:hover {
          background: rgba(34,197,94,0.2);
          border-color: rgba(34,197,94,0.5);
        }

        .btn-danger {
          background: rgba(239,82,123,0.1);
          color: #ef527b;
          border: 1px solid rgba(239,82,123,0.3);
          border-radius: 8px;
          padding: 6px 12px;
          font-weight: 600;
          font-size: 12px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-danger:hover {
          background: rgba(239,82,123,0.2);
          border-color: rgba(239,82,123,0.5);
        }

        .btn-warning {
          background: rgba(245,158,11,0.1);
          color: #b45309;
          border: 1px solid rgba(245,158,11,0.3);
          border-radius: 8px;
          padding: 6px 12px;
          font-weight: 600;
          font-size: 12px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-warning:hover {
          background: rgba(245,158,11,0.2);
          border-color: rgba(245,158,11,0.5);
        }

        .input-field {
          width: 100%;
          padding: 10px 14px;
          border: 1.5px solid rgba(200,140,240,0.3);
          border-radius: 10px;
          font-size: 14px;
          transition: all 0.2s;
          background: rgba(255,255,255,0.6);
          backdrop-filter: blur(8px);
          font-family: 'Inter', sans-serif;
        }

        .input-field:focus {
          outline: none;
          border-color: #9b3ed5;
          background: rgba(255,255,255,0.85);
          box-shadow: 0 0 0 3px rgba(155,62,213,0.1);
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

        .request-item {
          background: rgba(255,255,255,0.4);
          border: 1px solid rgba(200,140,240,0.2);
          border-radius: 12px;
          padding: 16px;
          margin-bottom: 12px;
          transition: all 0.2s;
        }

        .request-item:hover {
          background: rgba(255,255,255,0.6);
          border-color: rgba(155,62,213,0.3);
          box-shadow: 0 4px 12px rgba(155,62,213,0.1);
        }

        .status-badge {
          display: inline-block;
          padding: 6px 12px;
          border-radius: 8px;
          font-size: 11px;
          font-weight: 600;
        }

        .status-pending {
          background: rgba(245,158,11,0.15);
          color: #b45309;
        }

        .status-approved {
          background: rgba(34,197,94,0.15);
          color: #15803d;
        }

        .status-rejected {
          background: rgba(239,82,123,0.15);
          color: #ef527b;
        }

        .urgency-high {
          border-left: 4px solid #ef527b;
        }

        .urgency-medium {
          border-left: 4px solid #f59e0b;
        }

        .urgency-low {
          border-left: 4px solid #3b82f6;
        }

        .table-container {
          overflow-x: auto;
        }

        table {
          width: 100%;
          border-collapse: collapse;
        }

        th {
          padding: 12px;
          text-align: left;
          font-weight: 700;
          font-size: 12px;
          color: #6a1ea3;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          border-bottom: 2px solid rgba(155,62,213,0.15);
        }

        td {
          padding: 12px;
          border-bottom: 1px solid rgba(155,62,213,0.08);
          font-size: 13px;
          color: #3a2a4a;
        }

        tbody tr:hover {
          background: rgba(155,62,213,0.05);
        }

        .feature-card {
          background: rgba(255,255,255,0.4);
          border: 1px solid rgba(200,140,240,0.2);
          border-radius: 16px;
          padding: 24px;
          text-align: center;
          transition: all 0.3s;
          cursor: pointer;
        }

        .feature-card:hover {
          background: rgba(255,255,255,0.7);
          border-color: rgba(155,62,213,0.4);
          transform: translateY(-6px);
          box-shadow: 0 12px 30px rgba(155,62,213,0.15);
        }

        .feature-card-icon {
          font-size: 48px;
          margin-bottom: 12px;
        }

        .feature-card-title {
          font-size: 16px;
          font-weight: 700;
          color: #1f0a2a;
          margin-bottom: 8px;
        }

        .feature-card-desc {
          font-size: 13px;
          color: #6a3a78;
          margin-bottom: 16px;
        }
      `}</style>

      <div className="page-bg" />
      <div className="atmo" style={{
        width: 460,
        height: 460,
        top: "5%",
        left: "-5%",
        background: "radial-gradient(circle, rgba(155,62,213,0.25), transparent 60%)",
        animation: "float1 14s ease-in-out infinite",
      }} />
      <div className="atmo" style={{
        width: 400,
        height: 400,
        bottom: "5%",
        right: "-5%",
        background: "radial-gradient(circle, rgba(200,140,240,0.3), transparent 60%)",
        animation: "float2 16s ease-in-out infinite",
      }} />

      <div className="relative z-10 px-4 py-8">
        <div className="mx-auto max-w-7xl">

          {/* Header */}
          <div className="a1 glass mb-6">
            <div className="glass-inner">
              <div className="flex items-center justify-between">
                <div>
                  <h1 style={{
                    fontSize: "36px",
                    fontWeight: 800,
                    color: "#1f0a2a",
                    letterSpacing: "-0.025em",
                    marginBottom: "4px",
                  }}>
                    Tableau de bord Admin 🛡️
                  </h1>
                  <p className="text-[13.5px] text-[#6a3a78]">
                    Gestion centralisée complète de CXP
                  </p>
                </div>
                <button
                  onClick={handleLogout}
                  className="btn-danger"
                  style={{ padding: "10px 20px", fontSize: "13px" }}
                >
                  Déconnexion
                </button>
              </div>
            </div>
          </div>

          {/* Message */}
          {message && (
            <div className="a2 msg-success mb-6">
              {message}
            </div>
          )}

          {/* Quick Stats */}
          <div className="a2 grid grid-cols-1 md:grid-cols-4 gap-5 mb-8">
            <div className="stat-card" onClick={() => setActiveTab("fuel")}>
              {pendingFuelCount > 0 && <div className="stat-badge">{pendingFuelCount}</div>}
              <div className="text-[12px] font-bold text-[#9b3ed5] mb-2">⛽ Essence en attente</div>
              <div style={{ fontSize: "28px", fontWeight: 800, color: "#1f0a2a" }}>
                {pendingFuelCount}
              </div>
              <p className="text-[12px] text-[#6a3a78] mt-1">{fuelRequests.length} total</p>
            </div>

            <div className="stat-card" onClick={() => setActiveTab("issues")}>
              {pendingIssuesCount > 0 && <div className="stat-badge">{pendingIssuesCount}</div>}
              <div className="text-[12px] font-bold text-[#9b3ed5] mb-2">🚗 Problèmes signalés</div>
              <div style={{ fontSize: "28px", fontWeight: 800, color: "#1f0a2a" }}>
                {pendingIssuesCount}
              </div>
              <p className="text-[12px] text-[#6a3a78] mt-1">{issueReports.length} total</p>
            </div>

            <div className="stat-card" onClick={() => setActiveTab("vacation")}>
              {pendingVacationCount > 0 && <div className="stat-badge">{pendingVacationCount}</div>}
              <div className="text-[12px] font-bold text-[#9b3ed5] mb-2">🏖️ Congés en attente</div>
              <div style={{ fontSize: "28px", fontWeight: 800, color: "#1f0a2a" }}>
                {pendingVacationCount}
              </div>
              <p className="text-[12px] text-[#6a3a78] mt-1">{vacationRequests.length} total</p>
            </div>

            <div className="stat-card" onClick={() => router.push("/admin/vehicles")}>
              <div className="text-[12px] font-bold text-[#9b3ed5] mb-2">🚙 Gestion Flotte</div>
              <div style={{ fontSize: "28px", fontWeight: 800, color: "#1f0a2a" }}>
                Ouvrir
              </div>
              <p className="text-[12px] text-[#6a3a78] mt-1">Véhicules & Maintenance</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="a2 glass mb-6">
            <div className="glass-inner">
              <div className="flex gap-2 flex-wrap overflow-x-auto pb-2">
                {[
                  { id: "overview", label: "📊 Vue générale" },
                  { id: "tracking", label: "📍 Suivi GPS" },
                  { id: "fuel", label: "⛽ Essence" },
                  { id: "issues", label: "🚗 Signalements" },
                  { id: "vacation", label: "🏖️ Congés" },
                  { id: "employees", label: "👥 Employés" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`tab-button whitespace-nowrap ${activeTab === tab.id ? "active" : ""}`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Overview Tab */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              <div className="a3 glass mb-8">
                <div className="glass-inner">
                  <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#1f0a2a", marginBottom: "24px" }}>
                    🎯 Sections principales
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Employees Card */}
                    <div className="feature-card" onClick={() => setActiveTab("employees")}>
                      <div className="feature-card-icon">👥</div>
                      <div className="feature-card-title">Employés</div>
                      <div className="feature-card-desc">
                        Gestion des {employees.length} employés CXP
                      </div>
                      <button className="btn-primary">Voir →</button>
                    </div>

                    {/* Fleet Management Card */}
                    <div className="feature-card" onClick={() => router.push("/admin/vehicles")}>
                      <div className="feature-card-icon">🚗</div>
                      <div className="feature-card-title">Gestion Flotte</div>
                      <div className="feature-card-desc">
                        Véhicules et maintenance
                      </div>
                      <button className="btn-primary">Ouvrir →</button>
                    </div>

                    {/* Requests Card */}
                    <div className="feature-card" onClick={() => setActiveTab("fuel")}>
                      <div className="feature-card-icon">📋</div>
                      <div className="feature-card-title">Demandes</div>
                      <div className="feature-card-desc">
                        Essence, congés, et signalements
                      </div>
                      <button className="btn-primary">Voir →</button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="a3 glass">
                <div className="glass-inner">
                  <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#1f0a2a", marginBottom: "16px" }}>
                    📋 Résumé des notifications
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-orange-50 border border-orange-200 rounded-12">
                      <p className="text-[13px] font-bold text-orange-700 mb-2">⛽ Demandes d'essence en attente</p>
                      <p className="text-[20px] font-bold text-orange-800">{pendingFuelCount}</p>
                      <button onClick={() => setActiveTab("fuel")} className="text-[12px] text-orange-600 hover:text-orange-700 mt-2">
                        Voir les demandes →
                      </button>
                    </div>
                    <div className="p-4 bg-red-50 border border-red-200 rounded-12">
                      <p className="text-[13px] font-bold text-red-700 mb-2">🚗 Problèmes urgents</p>
                      <p className="text-[20px] font-bold text-red-800">{pendingIssuesCount}</p>
                      <button onClick={() => setActiveTab("issues")} className="text-[12px] text-red-600 hover:text-red-700 mt-2">
                        Voir les signalements →
                      </button>
                    </div>
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-12">
                      <p className="text-[13px] font-bold text-blue-700 mb-2">🏖️ Congés en attente</p>
                      <p className="text-[20px] font-bold text-blue-800">{pendingVacationCount}</p>
                      <button onClick={() => setActiveTab("vacation")} className="text-[12px] text-blue-600 hover:text-blue-700 mt-2">
                        Voir les demandes →
                      </button>
                    </div>
                    <div className="p-4 bg-purple-50 border border-purple-200 rounded-12">
                      <p className="text-[13px] font-bold text-purple-700 mb-2">🚙 Gestion Flotte</p>
                      <p className="text-[20px] font-bold text-purple-800">Nouveau</p>
                      <button onClick={() => router.push("/admin/vehicles")} className="text-[12px] text-purple-600 hover:text-purple-700 mt-2">
                        Ouvrir la page →
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Fuel Requests Tab */}
          {activeTab === "fuel" && (
            <div className="a3 glass">
              <div className="glass-inner">
                <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#1f0a2a", marginBottom: "20px" }}>
                  ⛽ Demandes d'essence
                </h2>

                {fuelRequests.length === 0 ? (
                  <p className="text-[14px] text-[#6a3a78]">Aucune demande d'essence</p>
                ) : (
                  <div>
                    {fuelRequests.map((request) => (
                      <div key={request.id} className="request-item">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <p className="text-[14px] font-bold text-[#1f0a2a]">{request.employeeName}</p>
                            <p className="text-[12px] text-[#6a3a78]">{request.vehicleInfo}</p>
                          </div>
                          <span className={`status-badge status-${request.status}`}>
                            {request.status === "pending" ? "⏳ En attente" : request.status === "approved" ? "✓ Approuvée" : "✕ Rejetée"}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#6a3a78] mb-3">
                          Demandé: {new Date(request.createdAt).toLocaleString("fr-FR")}
                        </p>
                        {request.status === "pending" && (
                          <div className="flex gap-2">
                            <button onClick={() => approveFuelRequest(request.id)} className="btn-success">
                              ✓ Approuver
                            </button>
                            <button onClick={() => rejectFuelRequest(request.id)} className="btn-danger">
                              ✕ Rejeter
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Issues Tab */}
          {activeTab === "issues" && (
            <div className="a3 glass">
              <div className="glass-inner">
                <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#1f0a2a", marginBottom: "20px" }}>
                  🚗 Signalements de problèmes
                </h2>

                {issueReports.length === 0 ? (
                  <p className="text-[14px] text-[#6a3a78]">Aucun signalement</p>
                ) : (
                  <div>
                    {issueReports.map((issue) => (
                      <div key={issue.id} className={`request-item urgency-${issue.urgency === "high" ? "high" : "low"}`}>
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="text-[14px] font-bold text-[#1f0a2a]">{issue.employeeName}</p>
                              <span style={{
                                background: "#ef527b",
                                color: "white",
                                padding: "2px 8px",
                                borderRadius: "4px",
                                fontSize: "11px",
                                fontWeight: 700,
                              }}>
                                {issue.problemType}
                              </span>
                            </div>
                            <p className="text-[12px] text-[#6a3a78]">Véhicule: {issue.vehicleInfo}</p>
                          </div>
                          <span className={`status-badge status-${issue.status}`}>
                            {issue.status === "reported" ? "🔴 Nouveau" : issue.status === "acknowledged" ? "🟡 Reconnu" : "🟢 Résolu"}
                          </span>
                        </div>
                        <p className="text-[13px] text-[#1f0a2a] mb-2 p-2 bg-white/40 rounded-8">
                          {issue.description}
                        </p>
                        <p className="text-[11px] text-[#6a3a78] mb-3">
                          Signalé: {new Date(issue.createdAt).toLocaleString("fr-FR")}
                        </p>
                        <div className="flex gap-2">
                          {issue.status === "reported" && (
                            <button onClick={() => acknowledgeIssue(issue.id)} className="btn-warning">
                              Reconnaître
                            </button>
                          )}
                          {issue.status !== "resolved" && (
                            <button onClick={() => resolveIssue(issue.id)} className="btn-success">
                              Marquer comme résolu
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Vacation Tab */}
          {activeTab === "vacation" && (
            <div className="a3 glass">
              <div className="glass-inner">
                <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#1f0a2a", marginBottom: "20px" }}>
                  🏖️ Demandes de congé
                </h2>

                {vacationRequests.length === 0 ? (
                  <p className="text-[14px] text-[#6a3a78]">Aucune demande de congé</p>
                ) : (
                  <div>
                    {vacationRequests.map((vacation) => (
                      <div key={vacation.id} className="request-item">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <p className="text-[14px] font-bold text-[#1f0a2a]">{vacation.employeeName}</p>
                            <p className="text-[12px] text-[#6a3a78]">
                              Du {new Date(vacation.startDate).toLocaleDateString("fr-FR")} au {new Date(vacation.endDate).toLocaleDateString("fr-FR")}
                            </p>
                          </div>
                          <span className={`status-badge status-${vacation.status}`}>
                            {vacation.status === "pending" ? "⏳ En attente" : vacation.status === "approved" ? "✓ Approuvée" : "✕ Rejetée"}
                          </span>
                        </div>
                        <p className="text-[13px] text-[#1f0a2a] mb-2 p-2 bg-white/40 rounded-8">
                          <strong>Raison:</strong> {vacation.reason}
                        </p>
                        <p className="text-[11px] text-[#6a3a78] mb-3">
                          Demandé: {new Date(vacation.createdAt).toLocaleString("fr-FR")}
                        </p>
                        {vacation.status === "pending" && (
                          <div className="flex gap-2">
                            <button onClick={() => approveVacation(vacation.id)} className="btn-success">
                              ✓ Approuver
                            </button>
                            <button onClick={() => rejectVacation(vacation.id)} className="btn-danger">
                              ✕ Rejeter
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* GPS Tracking Tab */}
          {activeTab === "tracking" && (
            <div className="a3 glass">
              <div className="glass-inner">
                <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#1f0a2a", marginBottom: "20px" }}>
                  📍 Suivi GPS des véhicules
                </h2>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Map */}
                  <div className="lg:col-span-2">
                    <div id="map" style={{
                      width: "100%",
                      height: "500px",
                      borderRadius: "12px",
                      background: "#e5e3ff",
                      border: "1px solid rgba(200,140,240,0.2)",
                      overflow: "hidden",
                    }}>
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
                    </div>
                  </div>

                  {/* Vehicle List */}
                  <div>
                    <h3 style={{ fontSize: "14px", fontWeight: 700, color: "#1f0a2a", marginBottom: "12px" }}>
                      Véhicules ({vehicleLocations.length})
                    </h3>
                    <div className="space-y-2 max-h-[600px] overflow-y-auto">
                      {vehicleLocations.length === 0 ? (
                        <p className="text-[12px] text-[#6a3a78]">Aucune localisation</p>
                      ) : (
                        vehicleLocations.map((loc) => (
                          <div
                            key={loc.vehicleId}
                            onClick={() => setSelectedEmployee(loc as any)}
                            style={{
                              background: selectedEmployee?.id === loc.vehicleId ? "rgba(155,62,213,0.15)" : "rgba(255,255,255,0.4)",
                              border: selectedEmployee?.id === loc.vehicleId ? "1.5px solid rgba(155,62,213,0.5)" : "1px solid rgba(200,140,240,0.2)",
                              borderRadius: "12px",
                              padding: "12px",
                              cursor: "pointer",
                              transition: "all 0.2s",
                            }}
                          >
                            <p style={{ fontWeight: 700, color: "#1f0a2a", fontSize: "13px" }}>
                              {loc.immatriculation}
                            </p>
                            <p style={{ fontSize: "11px", color: "#6a3a78", marginTop: "2px" }}>
                              {loc.marque} {loc.modele}
                            </p>
                            <p style={{ fontSize: "10px", color: "#9b3ed5", marginTop: "4px" }}>
                              ⚡ {(loc.speed || 0).toFixed(1)} km/h
                            </p>
                            <p style={{ fontSize: "10px", color: loc.isTracking ? "#15803d" : "#6b7280", marginTop: "2px" }}>
                              {loc.isTracking ? "🟢 En ligne" : "⚫ Hors ligne"}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                {/* Details Panel */}
                {selectedEmployee && vehicleLocations.find((l) => l.vehicleId === (selectedEmployee as any).id) && (
                  <div style={{ marginTop: "20px", paddingTop: "20px", borderTop: "1px solid rgba(200,140,240,0.2)" }}>
                    <h3 style={{ fontSize: "16px", fontWeight: 700, color: "#1f0a2a", marginBottom: "16px" }}>
                      📍 {(selectedEmployee as any).immatriculation}
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-[11px] font-bold text-[#9b3ed5] mb-2">Latitude</p>
                        <p style={{ fontFamily: "monospace", color: "#1f0a2a", fontWeight: 600, fontSize: "12px" }}>
                          {(selectedEmployee as any).latitude?.toFixed(6)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] font-bold text-[#9b3ed5] mb-2">Longitude</p>
                        <p style={{ fontFamily: "monospace", color: "#1f0a2a", fontWeight: 600, fontSize: "12px" }}>
                          {(selectedEmployee as any).longitude?.toFixed(6)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] font-bold text-[#9b3ed5] mb-2">Vitesse</p>
                        <p style={{ color: "#1f0a2a", fontWeight: 600, fontSize: "12px" }}>
                          {((selectedEmployee as any).speed || 0).toFixed(1)} km/h
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] font-bold text-[#9b3ed5] mb-2">Précision</p>
                        <p style={{ color: "#1f0a2a", fontWeight: 600, fontSize: "12px" }}>
                          ±{(selectedEmployee as any).accuracy?.toFixed(0)}m
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Employees Tab */}
          {activeTab === "employees" && (
            <div className="a3 glass">
              <div className="glass-inner">
                <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#1f0a2a", marginBottom: "20px" }}>
                  👥 Liste des employés
                </h2>

                <button
                  onClick={() => setShowCreateEmployee(true)}
                  className="btn-primary mb-6"
                  style={{ padding: "10px 20px" }}
                >
                  + Créer un employé
                </button>

                {employees.length === 0 ? (
                  <p className="text-[14px] text-[#6a3a78]">Aucun employé</p>
                ) : (
                  <div className="table-container">
                    <table>
                      <thead>
                        <tr>
                          <th>Nom</th>
                          <th>Email</th>
                          <th>Rôle</th>
                          <th>Depuis</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {employees.map((emp) => (
                          <tr key={emp.id} onClick={() => handleEmployeeClick(emp)} style={{ cursor: "pointer" }}>
                            <td>
                              <strong>{emp.firstName} {emp.lastName}</strong>
                            </td>
                            <td>{emp.email}</td>
                            <td>
                              <span style={{
                                background: emp.role === "admin" ? "rgba(155,62,213,0.1)" : "rgba(34,197,94,0.1)",
                                color: emp.role === "admin" ? "#6a1ea3" : "#15803d",
                                padding: "4px 12px",
                                borderRadius: "6px",
                                fontSize: "12px",
                                fontWeight: 600,
                              }}>
                                {emp.role === "admin" ? "Admin" : "Employé"}
                              </span>
                            </td>
                            <td className="text-[12px]">
                              {new Date(emp.createdAt).toLocaleDateString("fr-FR")}
                            </td>
                            <td onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={() => deleteEmployee(emp.id, emp.email)}
                                className="btn-danger"
                                style={{ fontSize: "11px", padding: "4px 10px" }}
                              >
                                🗑️ Supprimer
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Employee Details Modal */}
      {selectedEmployee && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 100,
          backdropFilter: "blur(4px)",
        }} onClick={() => setSelectedEmployee(null)}>
          <div style={{
            background: "white",
            borderRadius: "20px",
            padding: "32px",
            maxWidth: "600px",
            width: "90%",
            maxHeight: "90vh",
            overflowY: "auto",
            boxShadow: "0 30px 60px rgba(0,0,0,0.3)",
          }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#1f0a2a" }}>
                👤 {selectedEmployee.firstName} {selectedEmployee.lastName}
              </h2>
              <button onClick={() => setSelectedEmployee(null)} style={{
                background: "none",
                border: "none",
                fontSize: "24px",
                cursor: "pointer",
                color: "#9b3ed5",
              }}>
                ✕
              </button>
            </div>

            {/* Employee Info */}
            <div style={{
              background: "rgba(155,62,213,0.05)",
              border: "1px solid rgba(155,62,213,0.2)",
              borderRadius: "12px",
              padding: "16px",
              marginBottom: "20px",
            }}>
              <div className="grid grid-cols-2 gap-4 text-[13px]">
                <div>
                  <p className="text-[11px] font-bold text-[#9b3ed5] mb-1">Email</p>
                  <p style={{ color: "#1f0a2a" }}>{selectedEmployee.email}</p>
                </div>
                <div>
                  <p className="text-[11px] font-bold text-[#9b3ed5] mb-1">Rôle</p>
                  <p style={{ color: "#1f0a2a" }}>{selectedEmployee.role === "admin" ? "Administrateur" : "Employé"}</p>
                </div>
                <div>
                  <p className="text-[11px] font-bold text-[#9b3ed5] mb-1">Depuis</p>
                  <p style={{ color: "#1f0a2a" }}>{new Date(selectedEmployee.createdAt).toLocaleDateString("fr-FR")}</p>
                </div>
              </div>
            </div>

            {/* Vehicle Location */}
            {selectedEmployeeVehicle ? (
              <div>
                <h3 style={{ fontSize: "16px", fontWeight: 700, color: "#1f0a2a", marginBottom: "12px" }}>
                  🚗 Véhicule assigné
                </h3>

                <div style={{
                  background: "rgba(155,62,213,0.05)",
                  border: "1px solid rgba(155,62,213,0.2)",
                  borderRadius: "12px",
                  padding: "16px",
                  marginBottom: "20px",
                }}>
                  <p className="text-[13px] font-bold text-[#1f0a2a]">{selectedEmployeeVehicle.immatriculation}</p>
                  <p className="text-[12px] text-[#6a3a78] mt-1">{selectedEmployeeVehicle.marque} {selectedEmployeeVehicle.modele}</p>
                </div>

                {selectedEmployeeLocation ? (
                  <div>
                    <h3 style={{ fontSize: "16px", fontWeight: 700, color: "#1f0a2a", marginBottom: "12px" }}>
                      📍 Localisation en temps réel
                    </h3>

                    <div style={{
                      background: selectedEmployeeLocation.isTracking ? "rgba(34,197,94,0.05)" : "rgba(107,114,128,0.05)",
                      border: selectedEmployeeLocation.isTracking ? "1px solid rgba(34,197,94,0.2)" : "1px solid rgba(107,114,128,0.2)",
                      borderRadius: "12px",
                      padding: "16px",
                    }}>
                      <div style={{ marginBottom: "12px" }}>
                        <span style={{
                          background: selectedEmployeeLocation.isTracking ? "rgba(34,197,94,0.15)" : "rgba(107,114,128,0.15)",
                          color: selectedEmployeeLocation.isTracking ? "#15803d" : "#6b7280",
                          padding: "6px 14px",
                          borderRadius: "8px",
                          fontSize: "12px",
                          fontWeight: 600,
                        }}>
                          {selectedEmployeeLocation.isTracking ? "🟢 EN LIGNE" : "⚫ HORS LIGNE"}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-[13px]">
                        <div>
                          <p className="text-[11px] font-bold text-[#9b3ed5] mb-1">Latitude</p>
                          <p style={{ color: "#1f0a2a", fontFamily: "monospace" }}>
                            {selectedEmployeeLocation.latitude.toFixed(6)}
                          </p>
                        </div>
                        <div>
                          <p className="text-[11px] font-bold text-[#9b3ed5] mb-1">Longitude</p>
                          <p style={{ color: "#1f0a2a", fontFamily: "monospace" }}>
                            {selectedEmployeeLocation.longitude.toFixed(6)}
                          </p>
                        </div>
                        <div>
                          <p className="text-[11px] font-bold text-[#9b3ed5] mb-1">Vitesse</p>
                          <p style={{ color: "#1f0a2a" }}>{(selectedEmployeeLocation.speed || 0).toFixed(1)} km/h</p>
                        </div>
                        <div>
                          <p className="text-[11px] font-bold text-[#9b3ed5] mb-1">Précision GPS</p>
                          <p style={{ color: "#1f0a2a" }}>±{selectedEmployeeLocation.accuracy.toFixed(0)}m</p>
                        </div>
                        <div className="col-span-2">
                          <p className="text-[11px] font-bold text-[#9b3ed5] mb-1">Dernière mise à jour</p>
                          <p style={{ color: "#1f0a2a", fontSize: "12px" }}>
                            {new Date(selectedEmployeeLocation.timestamp).toLocaleString("fr-FR")}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{
                    background: "rgba(107,114,128,0.1)",
                    border: "1px solid rgba(107,114,128,0.2)",
                    borderRadius: "12px",
                    padding: "16px",
                    textAlign: "center",
                    color: "#6b7280",
                    fontSize: "13px",
                  }}>
                    📍 Aucune localisation disponible
                  </div>
                )}
              </div>
            ) : (
              <div style={{
                background: "rgba(107,114,128,0.1)",
                border: "1px solid rgba(107,114,128,0.2)",
                borderRadius: "12px",
                padding: "16px",
                textAlign: "center",
                color: "#6b7280",
                fontSize: "13px",
              }}>
                🚗 Aucun véhicule assigné
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create Employee Modal */}
      {showCreateEmployee && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 100,
          backdropFilter: "blur(4px)",
        }} onClick={() => setShowCreateEmployee(false)}>
          <div style={{
            background: "white",
            borderRadius: "20px",
            padding: "32px",
            maxWidth: "500px",
            width: "90%",
            boxShadow: "0 30px 60px rgba(0,0,0,0.3)",
          }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#1f0a2a", marginBottom: "24px" }}>
              👤 Créer un employé
            </h2>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px" }}>
              <div>
                <label className="text-[12px] font-bold text-[#9b3ed5] mb-2 block">Prénom</label>
                <input
                  type="text"
                  value={newEmpFirstName}
                  onChange={(e) => setNewEmpFirstName(e.target.value)}
                  className="input-field"
                  placeholder="John"
                />
              </div>
              <div>
                <label className="text-[12px] font-bold text-[#9b3ed5] mb-2 block">Nom</label>
                <input
                  type="text"
                  value={newEmpLastName}
                  onChange={(e) => setNewEmpLastName(e.target.value)}
                  className="input-field"
                  placeholder="Doe"
                />
              </div>
            </div>

            <div style={{ marginBottom: "16px" }}>
              <label className="text-[12px] font-bold text-[#9b3ed5] mb-2 block">Email</label>
              <input
                type="email"
                value={newEmpEmail}
                onChange={(e) => setNewEmpEmail(e.target.value)}
                className="input-field"
                placeholder="john@example.com"
              />
            </div>

            <div style={{ marginBottom: "16px" }}>
              <label className="text-[12px] font-bold text-[#9b3ed5] mb-2 block">Mot de passe</label>
              <input
                type="password"
                value={newEmpPassword}
                onChange={(e) => setNewEmpPassword(e.target.value)}
                className="input-field"
                placeholder="••••••••"
              />
            </div>

            <div style={{ marginBottom: "20px" }}>
              <label className="text-[12px] font-bold text-[#9b3ed5] mb-2 block">Rôle</label>
              <select
                value={newEmpRole}
                onChange={(e) => setNewEmpRole(e.target.value)}
                className="input-field"
              >
                <option value="worker">Employé</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowCreateEmployee(false)}
                className="btn-danger flex-1"
              >
                Annuler
              </button>
              <button
                onClick={createEmployee}
                className="btn-primary flex-1"
              >
                ✓ Créer
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
