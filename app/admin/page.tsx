"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, collection, getDocs, query, where, updateDoc, deleteDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

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

interface WorkSession {
  id: string;
  employeeId: string;
  employeeName: string;
  vehicleInfo: string;
  startTime: string;
  endTime: string | null;
  startKm: number;
  endKm: number | null;
  status: "active" | "completed";
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
  const [workSessions, setWorkSessions] = useState<WorkSession[]>([]);

  // Stats
  const [pendingFuelCount, setPendingFuelCount] = useState(0);
  const [pendingIssuesCount, setPendingIssuesCount] = useState(0);
  const [pendingVacationCount, setPendingVacationCount] = useState(0);
  const [activeSessionsCount, setActiveSessionsCount] = useState(0);

  // Filters
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

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

  // Load all data
  const loadAllData = async () => {
    try {
      // Load employees
      const empSnap = await getDocs(collection(db, "users"));
      const empData = empSnap.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .filter((e: any) => e.role === "worker" || e.role === "admin") as Employee[];
      setEmployees(empData);

      // Load fuel requests
      const fuelSnap = await getDocs(collection(db, "fuelRequests"));
      const fuelData = fuelSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as FuelRequest[];
      setFuelRequests(fuelData);
      setPendingFuelCount(fuelData.filter((f) => f.status === "pending").length);

      // Load issue reports
      const issueSnap = await getDocs(collection(db, "issueReports"));
      const issueData = issueSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as IssueReport[];
      setIssueReports(issueData);
      setPendingIssuesCount(issueData.filter((i) => i.status === "reported").length);

      // Load vacation requests
      const vacationSnap = await getDocs(collection(db, "vacationRequests"));
      const vacationData = vacationSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as VacationRequest[];
      setVacationRequests(vacationData);
      setPendingVacationCount(vacationData.filter((v) => v.status === "pending").length);

      // Load work sessions
      const sessionsSnap = await getDocs(collection(db, "workSessions"));
      const sessionsData = sessionsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as WorkSession[];
      setWorkSessions(sessionsData);
      setActiveSessionsCount(sessionsData.filter((s) => s.status === "active").length);
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
        @keyframes float1 {
          0%,100% { transform: translate(0,0) scale(1); }
          50%     { transform: translate(25px,-20px) scale(1.06); }
        }
        @keyframes float2 {
          0%,100% { transform: translate(0,0) scale(1); }
          50%     { transform: translate(-30px,22px) scale(0.94); }
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
        }

        .stat-card:hover {
          border-color: rgba(155,62,213,0.5);
          background: rgba(255,255,255,0.8);
          box-shadow: 0 12px 30px rgba(155,62,213,0.1);
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

        .status-resolved {
          background: rgba(34,197,94,0.15);
          color: #15803d;
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
                    Gestion centralisée de tous les employés et demandes
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
            <div className="stat-card">
              {pendingFuelCount > 0 && <div className="stat-badge">{pendingFuelCount}</div>}
              <div className="text-[12px] font-bold text-[#9b3ed5] mb-2">⛽ Essence en attente</div>
              <div style={{ fontSize: "28px", fontWeight: 800, color: "#1f0a2a" }}>
                {pendingFuelCount}
              </div>
              <p className="text-[12px] text-[#6a3a78] mt-1">{fuelRequests.length} total</p>
            </div>

            <div className="stat-card">
              {pendingIssuesCount > 0 && <div className="stat-badge">{pendingIssuesCount}</div>}
              <div className="text-[12px] font-bold text-[#9b3ed5] mb-2">🚗 Problèmes signalés</div>
              <div style={{ fontSize: "28px", fontWeight: 800, color: "#1f0a2a" }}>
                {pendingIssuesCount}
              </div>
              <p className="text-[12px] text-[#6a3a78] mt-1">{issueReports.length} total</p>
            </div>

            <div className="stat-card">
              {pendingVacationCount > 0 && <div className="stat-badge">{pendingVacationCount}</div>}
              <div className="text-[12px] font-bold text-[#9b3ed5] mb-2">🏖️ Congés en attente</div>
              <div style={{ fontSize: "28px", fontWeight: 800, color: "#1f0a2a" }}>
                {pendingVacationCount}
              </div>
              <p className="text-[12px] text-[#6a3a78] mt-1">{vacationRequests.length} total</p>
            </div>

            <div className="stat-card">
              {activeSessionsCount > 0 && <div className="stat-badge">{activeSessionsCount}</div>}
              <div className="text-[12px] font-bold text-[#9b3ed5] mb-2">⏱️ Sessions actives</div>
              <div style={{ fontSize: "28px", fontWeight: 800, color: "#15803d" }}>
                {activeSessionsCount}
              </div>
              <p className="text-[12px] text-[#6a3a78] mt-1">En ce moment</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="a2 glass mb-6">
            <div className="glass-inner">
              <div className="flex gap-2 flex-wrap overflow-x-auto pb-2">
                {[
                  { id: "overview", label: "📊 Vue générale" },
                  { id: "fuel", label: "⛽ Essence" },
                  { id: "issues", label: "🚗 Signalements" },
                  { id: "vacation", label: "🏖️ Congés" },
                  { id: "employees", label: "👥 Employés" },
                  { id: "sessions", label: "⏱️ Sessions" },
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
                    <div className="p-4 bg-green-50 border border-green-200 rounded-12">
                      <p className="text-[13px] font-bold text-green-700 mb-2">⏱️ Sessions actives</p>
                      <p className="text-[20px] font-bold text-green-800">{activeSessionsCount}</p>
                      <button onClick={() => setActiveTab("sessions")} className="text-[12px] text-green-600 hover:text-green-700 mt-2">
                        Voir les sessions →
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

          {/* Employees Tab */}
          {activeTab === "employees" && (
            <div className="a3 glass">
              <div className="glass-inner">
                <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#1f0a2a", marginBottom: "20px" }}>
                  👥 Liste des employés
                </h2>

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
                        </tr>
                      </thead>
                      <tbody>
                        {employees.map((emp) => (
                          <tr key={emp.id}>
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
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Sessions Tab */}
          {activeTab === "sessions" && (
            <div className="a3 glass">
              <div className="glass-inner">
                <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#1f0a2a", marginBottom: "20px" }}>
                  ⏱️ Sessions de travail
                </h2>

                {workSessions.length === 0 ? (
                  <p className="text-[14px] text-[#6a3a78]">Aucune session</p>
                ) : (
                  <div className="table-container">
                    <table>
                      <thead>
                        <tr>
                          <th>Employé</th>
                          <th>Véhicule</th>
                          <th>Début</th>
                          <th>Fin</th>
                          <th>Km</th>
                          <th>Statut</th>
                        </tr>
                      </thead>
                      <tbody>
                        {workSessions.map((session) => (
                          <tr key={session.id}>
                            <td><strong>{session.employeeName}</strong></td>
                            <td>{session.vehicleInfo}</td>
                            <td className="text-[12px]">
                              {new Date(session.startTime).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                            </td>
                            <td className="text-[12px]">
                              {session.endTime ? new Date(session.endTime).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) : "—"}
                            </td>
                            <td className="text-[12px]">
                              {session.startKm} → {session.endKm || "—"}
                              {session.endKm && <strong style={{ color: "#9b3ed5", marginLeft: "4px" }}>({session.endKm - session.startKm})</strong>}
                            </td>
                            <td>
                              <span style={{
                                background: session.status === "active" ? "rgba(34,197,94,0.1)" : "rgba(107,114,128,0.1)",
                                color: session.status === "active" ? "#15803d" : "#374151",
                                padding: "4px 12px",
                                borderRadius: "6px",
                                fontSize: "11px",
                                fontWeight: 600,
                              }}>
                                {session.status === "active" ? "🟢 Active" : "✓ Complétée"}
                              </span>
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
    </main>
  );
}
