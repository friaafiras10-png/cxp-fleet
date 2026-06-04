"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, collection, addDoc, getDocs, query, where, updateDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

interface UserData {
  firstName: string;
  lastName: string;
  email: string;
  role: string;
}

interface WorkSession {
  id: string;
  employeeId: string;
  startTime: string;
  endTime: string | null;
  startKm: number;
  endKm: number | null;
  status: "active" | "completed";
}

interface FuelRequest {
  id: string;
  employeeId: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
}

interface IssueReport {
  id: string;
  employeeId: string;
  problemType: string;
  description: string;
  status: "reported" | "acknowledged" | "resolved";
  createdAt: string;
}

interface VacationRequest {
  id: string;
  employeeId: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
}

interface Vehicle {
  id: string;
  immatriculation: string;
  marque: string;
  modele: string;
  chauffeurAssigne: string;
}

export default function EmployeeDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [authChecking, setAuthChecking] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [workSession, setWorkSession] = useState<WorkSession | null>(null);
  const [message, setMessage] = useState("");

  // Fuel request state
  const [showFuelRequest, setShowFuelRequest] = useState(false);

  // Issue report state
  const [showIssueReport, setShowIssueReport] = useState(false);
  const [problemType, setProblemType] = useState("Bruit");
  const [issueDescription, setIssueDescription] = useState("");

  // Vacation request state
  const [showVacationRequest, setShowVacationRequest] = useState(false);
  const [vacationStart, setVacationStart] = useState("");
  const [vacationEnd, setVacationEnd] = useState("");
  const [vacationReason, setVacationReason] = useState("");

  // Work tracking state
  const [startKm, setStartKm] = useState("");
  const [endKm, setEndKm] = useState("");

  // GPS tracking state
  const [assignedVehicle, setAssignedVehicle] = useState<Vehicle | null>(null);
  const [allVehicles, setAllVehicles] = useState<Vehicle[]>([]);
  const [gpsTracking, setGpsTracking] = useState(false);
  const [showGpsModal, setShowGpsModal] = useState(false);
  const watchIdRef = useState<number | null>(null)[1];

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
        if (!userDoc.exists() || userDoc.data().role !== "worker") {
          router.push("/");
          setAuthChecking(false);
          return;
        }

        setUser(userDoc.data() as UserData);
        
        // Load active work session
        const sessionsQuery = query(
          collection(db, "workSessions"),
          where("employeeId", "==", firebaseUser.uid),
          where("status", "==", "active")
        );
        const sessionsSnap = await getDocs(sessionsQuery);
        if (!sessionsSnap.empty) {
          setWorkSession({ id: sessionsSnap.docs[0].id, ...sessionsSnap.docs[0].data() } as WorkSession);
        }

        // Load all vehicles
        const vehiclesSnap = await getDocs(collection(db, "vehicles"));
        const vehiclesData = vehiclesSnap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Vehicle[];
        setAllVehicles(vehiclesData);

        // Show vehicle selection modal
        setShowGpsModal(true);

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

  // GPS Tracking function
  const startGPSTracking = async (vehicleId: string, vehicleData: any) => {
    if (!navigator.geolocation) {
      console.log("Geolocation not supported");
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      async (position) => {
        try {
          const { latitude, longitude, accuracy } = position.coords;
          const speed = position.coords.speed || 0;

          // Save to Firebase
          await updateDoc(doc(db, "vehicleLocations", vehicleId), {
            vehicleId,
            immatriculation: vehicleData.immatriculation,
            marque: vehicleData.marque,
            modele: vehicleData.modele,
            latitude,
            longitude,
            accuracy,
            speed,
            timestamp: new Date().toISOString(),
            isTracking: true,
          }).catch(async () => {
            // Create if doesn't exist
            await addDoc(collection(db, "vehicleLocations"), {
              vehicleId,
              immatriculation: vehicleData.immatriculation,
              marque: vehicleData.marque,
              modele: vehicleData.modele,
              latitude,
              longitude,
              accuracy,
              speed,
              timestamp: new Date().toISOString(),
              isTracking: true,
            });
          });

          setGpsTracking(true);
        } catch (error) {
          console.error("Error sending GPS:", error);
        }
      },
      (error) => {
        console.log("GPS error:", error);
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 }
    );
  };

  // Request fuel
  const requestFuel = async () => {
    if (!user) return;
    try {
      await addDoc(collection(db, "fuelRequests"), {
        employeeId: auth.currentUser?.uid,
        employeeName: `${user.firstName} ${user.lastName}`,
        status: "pending",
        createdAt: new Date().toISOString(),
      });
      setMessage("✓ Demande d'essence envoyée à l'admin");
      setShowFuelRequest(false);
      setTimeout(() => setMessage(""), 3000);
    } catch (error) {
      console.error("Error:", error);
      setMessage("Erreur lors de la demande");
    }
  };

  // Report issue
  const reportIssue = async () => {
    if (!user || !problemType || !issueDescription) {
      setMessage("Veuillez remplir tous les champs");
      return;
    }
    try {
      await addDoc(collection(db, "issueReports"), {
        employeeId: auth.currentUser?.uid,
        employeeName: `${user.firstName} ${user.lastName}`,
        problemType,
        description: issueDescription,
        status: "reported",
        createdAt: new Date().toISOString(),
      });
      setMessage("✓ Signalement envoyé à l'admin");
      setShowIssueReport(false);
      setProblemType("Bruit");
      setIssueDescription("");
      setTimeout(() => setMessage(""), 3000);
    } catch (error) {
      console.error("Error:", error);
      setMessage("Erreur lors du signalement");
    }
  };

  // Request vacation
  const requestVacation = async () => {
    if (!user || !vacationStart || !vacationEnd || !vacationReason) {
      setMessage("Veuillez remplir tous les champs");
      return;
    }
    try {
      await addDoc(collection(db, "vacationRequests"), {
        employeeId: auth.currentUser?.uid,
        employeeName: `${user.firstName} ${user.lastName}`,
        startDate: vacationStart,
        endDate: vacationEnd,
        reason: vacationReason,
        status: "pending",
        createdAt: new Date().toISOString(),
      });
      setMessage("✓ Demande de congé envoyée à l'admin");
      setShowVacationRequest(false);
      setVacationStart("");
      setVacationEnd("");
      setVacationReason("");
      setTimeout(() => setMessage(""), 3000);
    } catch (error) {
      console.error("Error:", error);
      setMessage("Erreur lors de la demande");
    }
  };

  // Start work session
  const startWorkSession = async () => {
    if (!startKm) {
      setMessage("Entrez le kilométrage initial");
      return;
    }
    try {
      const docRef = await addDoc(collection(db, "workSessions"), {
        employeeId: auth.currentUser?.uid,
        employeeName: `${user?.firstName} ${user?.lastName}`,
        startTime: new Date().toISOString(),
        endTime: null,
        startKm: Number(startKm),
        endKm: null,
        status: "active",
      });
      setWorkSession({
        id: docRef.id,
        employeeId: auth.currentUser?.uid || "",
        startTime: new Date().toISOString(),
        endTime: null,
        startKm: Number(startKm),
        endKm: null,
        status: "active",
      });
      setMessage("✓ Session de travail commencée");
      setStartKm("");
      setTimeout(() => setMessage(""), 3000);
    } catch (error) {
      console.error("Error:", error);
      setMessage("Erreur lors du démarrage");
    }
  };

  // End work session
  const endWorkSession = async () => {
    if (!endKm || !workSession) {
      setMessage("Entrez le kilométrage final");
      return;
    }
    try {
      await updateDoc(doc(db, "workSessions", workSession.id), {
        endTime: new Date().toISOString(),
        endKm: Number(endKm),
        status: "completed",
      });
      setMessage("✓ Session de travail terminée");
      setWorkSession(null);
      setEndKm("");
      setTimeout(() => setMessage(""), 3000);
    } catch (error) {
      console.error("Error:", error);
      setMessage("Erreur lors de la fin");
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
          <div style={{ fontSize: "24px", fontWeight: 700, marginBottom: "12px" }}>
            Vérification...
          </div>
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
        @keyframes float1 {
          0%,100% { transform: translate(0,0) scale(1); }
          50%     { transform: translate(25px,-20px) scale(1.06); }
        }
        @keyframes float2 {
          0%,100% { transform: translate(0,0) scale(1); }
          50%     { transform: translate(-30px,22px) scale(0.94); }
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
        }

        .stat-card:hover {
          border-color: rgba(155,62,213,0.5);
          background: rgba(255,255,255,0.8);
          box-shadow: 0 12px 30px rgba(155,62,213,0.1);
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

        .btn-danger {
          background: rgba(239,82,123,0.1);
          color: #ef527b;
          border: 1px solid rgba(239,82,123,0.3);
          border-radius: 8px;
          padding: 8px 16px;
          font-weight: 600;
          font-size: 13px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-danger:hover {
          background: rgba(239,82,123,0.2);
          border-color: rgba(239,82,123,0.5);
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

        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 100;
          backdrop-filter: blur(4px);
        }

        .modal-content {
          background: white;
          border-radius: 20px;
          padding: 32px;
          max-width: 500px;
          width: 90%;
          box-shadow: 0 30px 60px rgba(0,0,0,0.3);
        }

        .select-field {
          width: 100%;
          padding: 10px 14px;
          border: 1.5px solid rgba(200,140,240,0.3);
          border-radius: 10px;
          font-size: 14px;
          background: rgba(255,255,255,0.6);
          backdrop-filter: blur(8px);
          font-family: 'Inter', sans-serif;
          color: #6a3a78;
          cursor: pointer;
        }

        .select-field:focus {
          outline: none;
          border-color: #9b3ed5;
          background: rgba(255,255,255,0.85);
          box-shadow: 0 0 0 3px rgba(155,62,213,0.1);
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
                    Bienvenue, {user?.firstName} 👋
                  </h1>
                  <p className="text-[13.5px] text-[#6a3a78]">
                    Gérez vos demandes et vos sessions de travail
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

          {/* Tabs */}
          <div className="a2 glass mb-6">
            <div className="glass-inner">
              <div className="flex gap-2 flex-wrap">
                {[
                  { id: "overview", label: "📊 Vue générale" },
                  { id: "work", label: "⏱️ Session travail" },
                  { id: "requests", label: "📋 Demandes" },
                  { id: "reports", label: "🚗 Signalements" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`tab-button ${activeTab === tab.id ? "active" : ""}`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Overview Tab */}
          {activeTab === "overview" && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="a3 stat-card">
                <div className="text-[12px] font-bold uppercase tracking-wide text-[#9b3ed5] mb-2">
                  👤 Identité
                </div>
                <div style={{ fontSize: "18px", fontWeight: 700, color: "#1f0a2a", marginBottom: "8px" }}>
                  {user?.firstName} {user?.lastName}
                </div>
                <p className="text-[12px] text-[#6a3a78]">
                  {user?.email}
                </p>
              </div>

              <div className="a3 stat-card">
                <div className="text-[12px] font-bold uppercase tracking-wide text-[#9b3ed5] mb-2">
                  ⏱️ Session active
                </div>
                <div style={{ fontSize: "18px", fontWeight: 700, color: workSession ? "#15803d" : "#6a3a78" }}>
                  {workSession ? "En cours" : "Arrêtée"}
                </div>
                <p className="text-[12px] text-[#6a3a78]">
                  {workSession ? "Allez à l'onglet Session travail" : "Commencez votre journée"}
                </p>
              </div>

              <div className="a3 stat-card">
                <div className="text-[12px] font-bold uppercase tracking-wide text-[#9b3ed5] mb-2">
                  🔧 Actions rapides
                </div>
                <div className="flex flex-col gap-2">
                  <button onClick={() => setShowFuelRequest(true)} className="btn-primary" style={{ fontSize: "12px", padding: "6px 12px" }}>
                    Demander essence
                  </button>
                  <button onClick={() => setShowIssueReport(true)} className="btn-primary" style={{ fontSize: "12px", padding: "6px 12px" }}>
                    Signaler problème
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Work Session Tab */}
          {activeTab === "work" && (
            <div className="a3 glass">
              <div className="glass-inner">
                <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#1f0a2a", marginBottom: "20px" }}>
                  ⏱️ Gestion de la session de travail
                </h2>

                {!workSession ? (
                  <div className="space-y-4">
                    <p className="text-[14px] text-[#6a3a78] mb-4">
                      Démarrez votre session de travail en entrant le kilométrage initial du véhicule.
                    </p>
                    <div>
                      <label className="text-[12px] font-bold text-[#9b3ed5] mb-2 block">
                        Kilométrage initial (km)
                      </label>
                      <input
                        type="number"
                        placeholder="Ex: 45230"
                        value={startKm}
                        onChange={(e) => setStartKm(e.target.value)}
                        className="input-field"
                      />
                    </div>
                    <button onClick={startWorkSession} className="btn-primary w-full">
                      ▶️ Démarrer la session
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div style={{
                      background: "rgba(34,197,94,0.1)",
                      border: "1px solid rgba(34,197,94,0.3)",
                      borderRadius: "10px",
                      padding: "16px",
                      marginBottom: "20px",
                    }}>
                      <p className="text-[12px] font-bold text-green-700 mb-2">SESSION ACTIVE</p>
                      <p className="text-[13px] text-[#6a3a78]">
                        Démarrage: {new Date(workSession.startTime).toLocaleTimeString("fr-FR")}
                      </p>
                      <p className="text-[13px] text-[#6a3a78]">
                        Kilométrage au démarrage: {workSession.startKm} km
                      </p>
                    </div>

                    <p className="text-[14px] text-[#6a3a78] mb-4">
                      Terminez votre session en entrant le kilométrage final.
                    </p>
                    <div>
                      <label className="text-[12px] font-bold text-[#9b3ed5] mb-2 block">
                        Kilométrage final (km)
                      </label>
                      <input
                        type="number"
                        placeholder="Ex: 45280"
                        value={endKm}
                        onChange={(e) => setEndKm(e.target.value)}
                        className="input-field"
                      />
                    </div>
                    <button onClick={endWorkSession} className="btn-primary w-full">
                      ⏹️ Terminer la session
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Requests Tab */}
          {activeTab === "requests" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="a3 glass">
                <div className="glass-inner">
                  <h3 style={{ fontSize: "18px", fontWeight: 700, color: "#1f0a2a", marginBottom: "16px" }}>
                    ⛽ Demande d'essence
                  </h3>
                  <p className="text-[13px] text-[#6a3a78] mb-4">
                    Demandez du carburant pour votre véhicule. L'admin sera notifié et approuvera votre demande.
                  </p>
                  <button onClick={() => setShowFuelRequest(true)} className="btn-primary w-full">
                    + Demander de l'essence
                  </button>
                </div>
              </div>

              <div className="a3 glass">
                <div className="glass-inner">
                  <h3 style={{ fontSize: "18px", fontWeight: 700, color: "#1f0a2a", marginBottom: "16px" }}>
                    🏖️ Demande de congé
                  </h3>
                  <p className="text-[13px] text-[#6a3a78] mb-4">
                    Demandez un congé ou des vacances. Spécifiez les dates et la raison.
                  </p>
                  <button onClick={() => setShowVacationRequest(true)} className="btn-primary w-full">
                    + Demander un congé
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Reports Tab */}
          {activeTab === "reports" && (
            <div className="a3 glass">
              <div className="glass-inner">
                <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#1f0a2a", marginBottom: "20px" }}>
                  🚗 Signaler un problème avec le véhicule
                </h2>
                <p className="text-[14px] text-[#6a3a78] mb-6">
                  Signalez tout problème détecté avec le véhicule. L'admin sera notifié immédiatement.
                </p>
                <button onClick={() => setShowIssueReport(true)} className="btn-primary">
                  + Signaler un problème
                </button>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Fuel Request Modal */}
      {showFuelRequest && (
        <div className="modal-overlay" onClick={() => setShowFuelRequest(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#1f0a2a", marginBottom: "16px" }}>
              ⛽ Demande d'essence
            </h2>
            <p className="text-[14px] text-[#6a3a78] mb-6">
              Vous demandez du carburant. L'admin sera notifié et approuvera votre demande dès que possible.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowFuelRequest(false)} className="btn-danger flex-1">
                Annuler
              </button>
              <button onClick={requestFuel} className="btn-primary flex-1">
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Issue Report Modal */}
      {showIssueReport && (
        <div className="modal-overlay" onClick={() => setShowIssueReport(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#1f0a2a", marginBottom: "16px" }}>
              🚗 Signaler un problème
            </h2>
            <div className="space-y-4">
              <div>
                <label className="text-[12px] font-bold text-[#9b3ed5] mb-2 block">
                  Type de problème
                </label>
                <select
                  value={problemType}
                  onChange={(e) => setProblemType(e.target.value)}
                  className="select-field"
                >
                  <option value="Bruit">Bruit</option>
                  <option value="Fuite">Fuite</option>
                  <option value="Pneu">Pneu</option>
                  <option value="Freins">Freins</option>
                  <option value="Moteur">Moteur</option>
                  <option value="Autre">Autre</option>
                </select>
              </div>

              <div>
                <label className="text-[12px] font-bold text-[#9b3ed5] mb-2 block">
                  Description
                </label>
                <textarea
                  placeholder="Décrivez le problème en détail..."
                  value={issueDescription}
                  onChange={(e) => setIssueDescription(e.target.value)}
                  className="input-field"
                  rows={4}
                  style={{ resize: "vertical" }}
                />
              </div>

              <div className="flex gap-3">
                <button onClick={() => setShowIssueReport(false)} className="btn-danger flex-1">
                  Annuler
                </button>
                <button onClick={reportIssue} className="btn-primary flex-1">
                  Signaler
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Vacation Request Modal */}
      {showVacationRequest && (
        <div className="modal-overlay" onClick={() => setShowVacationRequest(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#1f0a2a", marginBottom: "16px" }}>
              🏖️ Demande de congé
            </h2>
            <div className="space-y-4">
              <div>
                <label className="text-[12px] font-bold text-[#9b3ed5] mb-2 block">
                  Date de début
                </label>
                <input
                  type="date"
                  value={vacationStart}
                  onChange={(e) => setVacationStart(e.target.value)}
                  className="input-field"
                />
              </div>

              <div>
                <label className="text-[12px] font-bold text-[#9b3ed5] mb-2 block">
                  Date de fin
                </label>
                <input
                  type="date"
                  value={vacationEnd}
                  onChange={(e) => setVacationEnd(e.target.value)}
                  className="input-field"
                />
              </div>

              <div>
                <label className="text-[12px] font-bold text-[#9b3ed5] mb-2 block">
                  Raison
                </label>
                <textarea
                  placeholder="Raison de votre congé..."
                  value={vacationReason}
                  onChange={(e) => setVacationReason(e.target.value)}
                  className="input-field"
                  rows={3}
                  style={{ resize: "vertical" }}
                />
              </div>

              <div className="flex gap-3">
                <button onClick={() => setShowVacationRequest(false)} className="btn-danger flex-1">
                  Annuler
                </button>
                <button onClick={requestVacation} className="btn-primary flex-1">
                  Envoyer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Vehicle Selection Modal */}
      {showGpsModal && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 100,
          backdropFilter: "blur(4px)",
        }}>
          <div style={{
            background: "white",
            borderRadius: "20px",
            padding: "32px",
            maxWidth: "600px",
            width: "90%",
            maxHeight: "80vh",
            overflowY: "auto",
            boxShadow: "0 30px 60px rgba(0,0,0,0.3)",
          }}>
            <h2 style={{ fontSize: "22px", fontWeight: 700, color: "#1f0a2a", marginBottom: "12px", textAlign: "center" }}>
              🚗 Sélectionnez votre véhicule
            </h2>
            
            <p style={{ fontSize: "14px", color: "#6a3a78", marginBottom: "24px", textAlign: "center" }}>
              Choisissez le véhicule que vous allez conduire aujourd'hui
            </p>

            {allVehicles.length === 0 ? (
              <p style={{ textAlign: "center", color: "#6a3a78", fontSize: "14px" }}>
                Aucun véhicule disponible
              </p>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "20px" }}>
                {allVehicles.map((vehicle) => (
                  <div
                    key={vehicle.id}
                    onClick={() => {
                      setAssignedVehicle(vehicle);
                      setShowGpsModal(false);
                      startGPSTracking(vehicle.id, vehicle);
                    }}
                    style={{
                      background: "rgba(155,62,213,0.05)",
                      border: "2px solid rgba(155,62,213,0.2)",
                      borderRadius: "12px",
                      padding: "16px",
                      cursor: "pointer",
                      transition: "all 0.25s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "rgba(155,62,213,0.15)";
                      e.currentTarget.style.borderColor = "rgba(155,62,213,0.5)";
                      e.currentTarget.style.transform = "translateY(-4px)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "rgba(155,62,213,0.05)";
                      e.currentTarget.style.borderColor = "rgba(155,62,213,0.2)";
                      e.currentTarget.style.transform = "translateY(0)";
                    }}
                  >
                    <p style={{ fontSize: "16px", fontWeight: 700, color: "#9b3ed5", marginBottom: "6px" }}>
                      {vehicle.immatriculation}
                    </p>
                    <p style={{ fontSize: "13px", color: "#1f0a2a" }}>
                      {vehicle.marque} {vehicle.modele}
                    </p>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={() => setShowGpsModal(false)}
              style={{
                width: "100%",
                padding: "12px",
                background: "rgba(200,140,240,0.15)",
                border: "1px solid rgba(200,140,240,0.3)",
                color: "#9b3ed5",
                borderRadius: "10px",
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.25s",
              }}
            >
              Plus tard
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
