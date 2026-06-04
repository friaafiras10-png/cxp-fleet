"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, collection, getDocs, addDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

interface Vehicle {
  id: string;
  marque: string;
  modele: string;
  immatriculation: string;
  annee: number;
  couleur: string;
  carburant: string;
  boite: string;
  kilometrageActuel: number;
  statut: string;
  chauffeurAssigne: string;
  dateAchat: string;
  assuranceExpiration: string;
  controleTechniqueExpiration: string;
  notes: string;
  numeroVIN: string;
  puissanceCV: number;
  poids: number;
  capaciteReservoir: number;
  typeCarrosserie: string;
  nombrePlaces: number;
  conducteurPrincipal: string;
}

interface MaintenanceTask {
  id: string;
  vehicleId: string;
  vehicleInfo: string;
  taskType: string;
  description: string;
  nextDueDate: string;
  nextDueKm: number;
  status: "pending" | "done";
  lastCompletedDate: string | null;
  createdAt: string;
}

export default function VehicleManagement() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [authChecking, setAuthChecking] = useState(true);
  const [message, setMessage] = useState("");

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [maintenanceTasks, setMaintenanceTasks] = useState<MaintenanceTask[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [showAddVehicle, setShowAddVehicle] = useState(false);
  const [showAddMaintenance, setShowAddMaintenance] = useState(false);
  const [searchVehicle, setSearchVehicle] = useState("");

  // New vehicle form
  const [formData, setFormData] = useState({
    marque: "",
    modele: "",
    immatriculation: "",
    annee: new Date().getFullYear(),
    couleur: "",
    carburant: "Diesel",
    boite: "Manuelle",
    kilometrageActuel: 0,
    statut: "Actif",
    chauffeurAssigne: "",
    dateAchat: "",
    assuranceExpiration: "",
    controleTechniqueExpiration: "",
    notes: "",
    numeroVIN: "",
    puissanceCV: 0,
    poids: 0,
    capaciteReservoir: 0,
    typeCarrosserie: "Fourgon",
    nombrePlaces: 2,
    conducteurPrincipal: "",
  });

  // Maintenance form
  const [maintenanceForm, setMaintenanceForm] = useState({
    taskType: "Révision",
    description: "",
    nextDueDate: "",
    nextDueKm: 0,
  });

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
        await loadData();
        
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

  const loadData = async () => {
    try {
      const vehiclesSnap = await getDocs(collection(db, "vehicles"));
      const vehiclesData = vehiclesSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as Vehicle[];
      setVehicles(vehiclesData);

      const maintenanceSnap = await getDocs(collection(db, "maintenanceTasks"));
      const maintenanceData = maintenanceSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as MaintenanceTask[];
      setMaintenanceTasks(maintenanceData);
    } catch (error) {
      console.error("Error loading data:", error);
    }
  };

  // Get reminder status
  const getReminderStatus = (dueDate: string) => {
    const due = new Date(dueDate);
    const today = new Date();
    const daysUntilDue = Math.ceil((due.getTime() - today.getTime()) / (1000 * 3600 * 24));

    if (daysUntilDue <= 0) return { status: "overdue", message: "🔴 RETARD", color: "#ef527b" };
    if (daysUntilDue === 1) return { status: "tomorrow", message: "🟡 DEMAIN", color: "#f59e0b" };
    if (daysUntilDue <= 7) return { status: "week", message: "🟡 CETTE SEMAINE", color: "#f59e0b" };
    return { status: "ok", message: "✓ OK", color: "#15803d" };
  };

  const handleAddVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.marque || !formData.immatriculation) {
      setMessage("Marque et immatriculation requis");
      return;
    }

    try {
      await addDoc(collection(db, "vehicles"), {
        ...formData,
        annee: Number(formData.annee),
        kilometrageActuel: Number(formData.kilometrageActuel),
        puissanceCV: Number(formData.puissanceCV),
        poids: Number(formData.poids),
        capaciteReservoir: Number(formData.capaciteReservoir),
        nombrePlaces: Number(formData.nombrePlaces),
        createdAt: new Date().toISOString(),
      });

      setMessage("✓ Véhicule ajouté");
      setShowAddVehicle(false);
      setFormData({
        marque: "", modele: "", immatriculation: "", annee: new Date().getFullYear(),
        couleur: "", carburant: "Diesel", boite: "Manuelle", kilometrageActuel: 0,
        statut: "Actif", chauffeurAssigne: "", dateAchat: "", assuranceExpiration: "",
        controleTechniqueExpiration: "", notes: "", numeroVIN: "", puissanceCV: 0,
        poids: 0, capaciteReservoir: 0, typeCarrosserie: "Fourgon", nombrePlaces: 2,
        conducteurPrincipal: "",
      });
      await loadData();
      setTimeout(() => setMessage(""), 3000);
    } catch (error) {
      setMessage("Erreur lors de l'ajout");
    }
  };

  const handleAddMaintenance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVehicle || !maintenanceForm.taskType) {
      setMessage("Sélectionnez un véhicule et un type");
      return;
    }

    try {
      await addDoc(collection(db, "maintenanceTasks"), {
        vehicleId: selectedVehicle.id,
        vehicleInfo: `${selectedVehicle.immatriculation} - ${selectedVehicle.marque} ${selectedVehicle.modele}`,
        taskType: maintenanceForm.taskType,
        description: maintenanceForm.description,
        nextDueDate: maintenanceForm.nextDueDate,
        nextDueKm: Number(maintenanceForm.nextDueKm),
        status: "pending",
        lastCompletedDate: null,
        createdAt: new Date().toISOString(),
      });

      setMessage("✓ Tâche ajoutée");
      setMaintenanceForm({ taskType: "Révision", description: "", nextDueDate: "", nextDueKm: 0 });
      await loadData();
      setTimeout(() => setMessage(""), 3000);
    } catch (error) {
      setMessage("Erreur");
    }
  };

  const markMaintenanceComplete = async (id: string) => {
    try {
      await updateDoc(doc(db, "maintenanceTasks", id), {
        status: "done",
        lastCompletedDate: new Date().toISOString(),
      });
      await loadData();
      setMessage("✓ Complétée");
      setTimeout(() => setMessage(""), 3000);
    } catch (error) {
      setMessage("Erreur");
    }
  };

  const deleteVehicle = async (id: string) => {
    if (!confirm("Êtes-vous sûr?")) return;
    try {
      await deleteDoc(doc(db, "vehicles", id));
      setMessage("✓ Véhicule supprimé");
      await loadData();
      setSelectedVehicle(null);
      setTimeout(() => setMessage(""), 3000);
    } catch (error) {
      setMessage("Erreur");
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
      }}>
        <div style={{ textAlign: "center", color: "#6a1ea3" }}>Vérification...</div>
      </main>
    );
  }

  const filteredVehicles = vehicles.filter((v) =>
    v.immatriculation.toLowerCase().includes(searchVehicle.toLowerCase()) ||
    v.marque.toLowerCase().includes(searchVehicle.toLowerCase())
  );

  const vehicleMaintenance = selectedVehicle
    ? maintenanceTasks.filter((t) => t.vehicleId === selectedVehicle.id)
    : [];

  return (
    <main className="relative min-h-screen overflow-hidden" style={{ fontFamily: "'Inter', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .a1 { animation: fadeUp 0.55s cubic-bezier(.22,1,.36,1) 0.00s both; }
        .a2 { animation: fadeUp 0.55s cubic-bezier(.22,1,.36,1) 0.06s both; }
        .a3 { animation: fadeUp 0.55s cubic-bezier(.22,1,.36,1) 0.12s both; }

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

        .stat-card {
          background: rgba(255,255,255,0.6);
          border: 1.5px solid rgba(200,140,240,0.3);
          border-radius: 16px;
          padding: 16px;
          transition: all 0.3s;
          cursor: pointer;
        }

        .stat-card:hover {
          border-color: rgba(155,62,213,0.5);
          background: rgba(255,255,255,0.8);
          box-shadow: 0 12px 30px rgba(155,62,213,0.1);
          transform: translateY(-4px);
        }

        .stat-card.active {
          background: rgba(155,62,213,0.1);
          border-color: rgba(155,62,213,0.5);
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
          transition: all 0.25s;
        }

        .btn-secondary:hover {
          background: rgba(200,140,240,0.25);
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
        }

        .input-field {
          width: 100%;
          padding: 10px 14px;
          border: 1.5px solid rgba(200,140,240,0.3);
          border-radius: 10px;
          font-size: 14px;
          background: rgba(255,255,255,0.6);
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
          max-width: 600px;
          width: 90%;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 30px 60px rgba(0,0,0,0.3);
        }

        .maintenance-item {
          background: rgba(255,255,255,0.4);
          border: 1px solid rgba(200,140,240,0.2);
          border-radius: 12px;
          padding: 14px;
          margin-bottom: 8px;
          transition: all 0.2s;
        }

        .maintenance-item:hover {
          background: rgba(255,255,255,0.6);
          border-color: rgba(155,62,213,0.3);
        }

        .reminder-badge {
          display: inline-block;
          padding: 4px 12px;
          border-radius: 6px;
          font-size: 11px;
          font-weight: 700;
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
                    🚗 Gestion Flotte
                  </h1>
                  <p className="text-[13.5px] text-[#6a3a78]">
                    Véhicules et maintenance
                  </p>
                </div>
                {/* Back Button */}
                <button
                  onClick={() => router.push("/admin")}
                  className="btn-secondary"
                  style={{ padding: "10px 20px", fontSize: "13px" }}
                >
                  ← Retour à Admin
                </button>
              </div>
            </div>
          </div>

          {/* Message */}
          {message && <div className="a2 msg-success mb-6">{message}</div>}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Vehicle List */}
            <div className="a2 glass">
              <div className="glass-inner">
                <h2 style={{ fontSize: "18px", fontWeight: 700, color: "#1f0a2a", marginBottom: "16px" }}>
                  Véhicules
                </h2>

                <input
                  type="text"
                  placeholder="Rechercher..."
                  value={searchVehicle}
                  onChange={(e) => setSearchVehicle(e.target.value)}
                  className="input-field mb-4"
                />

                <button onClick={() => setShowAddVehicle(true)} className="btn-primary w-full mb-4">
                  + Ajouter véhicule
                </button>

                <div className="space-y-2 max-h-[600px] overflow-y-auto">
                  {filteredVehicles.map((v) => (
                    <div
                      key={v.id}
                      onClick={() => setSelectedVehicle(v)}
                      className={`stat-card ${selectedVehicle?.id === v.id ? "active" : ""}`}
                    >
                      <p style={{ fontWeight: 700, color: "#1f0a2a", fontSize: "14px" }}>
                        {v.immatriculation}
                      </p>
                      <p style={{ fontSize: "12px", color: "#6a3a78", marginTop: "4px" }}>
                        {v.marque} {v.modele}
                      </p>
                      <p style={{ fontSize: "11px", color: "#9b3ed5", marginTop: "4px" }}>
                        {v.kilometrageActuel} km
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right: Vehicle Details + Maintenance */}
            {selectedVehicle && (
              <div className="a2 lg:col-span-2 space-y-6">
                {/* Vehicle Details */}
                <div className="glass">
                  <div className="glass-inner">
                    <h2 style={{ fontSize: "18px", fontWeight: 700, color: "#1f0a2a", marginBottom: "16px" }}>
                      Détails du véhicule
                    </h2>

                    <div className="grid grid-cols-2 gap-4 text-[13px]">
                      <div>
                        <p className="text-[11px] font-bold text-[#9b3ed5]">Immatriculation</p>
                        <p className="text-[#1f0a2a]" style={{ fontWeight: 600 }}>{selectedVehicle.immatriculation}</p>
                      </div>
                      <div>
                        <p className="text-[11px] font-bold text-[#9b3ed5]">Marque</p>
                        <p className="text-[#1f0a2a]">{selectedVehicle.marque}</p>
                      </div>
                      <div>
                        <p className="text-[11px] font-bold text-[#9b3ed5]">Modèle</p>
                        <p className="text-[#1f0a2a]">{selectedVehicle.modele}</p>
                      </div>
                      <div>
                        <p className="text-[11px] font-bold text-[#9b3ed5]">Année</p>
                        <p className="text-[#1f0a2a]">{selectedVehicle.annee}</p>
                      </div>
                      <div>
                        <p className="text-[11px] font-bold text-[#9b3ed5]">VIN</p>
                        <p className="text-[#1f0a2a]">{selectedVehicle.numeroVIN || "—"}</p>
                      </div>
                      <div>
                        <p className="text-[11px] font-bold text-[#9b3ed5]">Kilométrage</p>
                        <p className="text-[#1f0a2a]">{selectedVehicle.kilometrageActuel} km</p>
                      </div>
                      <div>
                        <p className="text-[11px] font-bold text-[#9b3ed5]">Statut</p>
                        <p style={{
                          color: selectedVehicle.statut === "Actif" ? "#15803d" : "#6a3a78",
                          fontWeight: 600,
                        }}>
                          {selectedVehicle.statut}
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] font-bold text-[#9b3ed5]">Chauffeur</p>
                        <p className="text-[#1f0a2a]">{selectedVehicle.chauffeurAssigne || "—"}</p>
                      </div>
                    </div>

                    <button onClick={() => deleteVehicle(selectedVehicle.id)} className="btn-danger mt-4">
                      Supprimer ce véhicule
                    </button>
                  </div>
                </div>

                {/* Maintenance */}
                <div className="glass">
                  <div className="glass-inner">
                    <div className="flex items-center justify-between mb-4">
                      <h2 style={{ fontSize: "18px", fontWeight: 700, color: "#1f0a2a" }}>
                        ⚙️ Maintenance
                      </h2>
                      <button onClick={() => setShowAddMaintenance(true)} className="btn-primary">
                        + Ajouter
                      </button>
                    </div>

                    {vehicleMaintenance.length === 0 ? (
                      <p className="text-[13px] text-[#6a3a78]">Aucune maintenance</p>
                    ) : (
                      <div className="space-y-2">
                        {vehicleMaintenance.map((task) => {
                          const reminder = getReminderStatus(task.nextDueDate);
                          return (
                            <div key={task.id} className="maintenance-item">
                              <div className="flex items-start justify-between mb-2">
                                <div>
                                  <p style={{ fontWeight: 700, color: "#1f0a2a", fontSize: "13px" }}>
                                    {task.taskType}
                                  </p>
                                  <p style={{ fontSize: "12px", color: "#6a3a78", marginTop: "2px" }}>
                                    {task.description}
                                  </p>
                                </div>
                                <span className="reminder-badge" style={{ background: reminder.color + "25", color: reminder.color }}>
                                  {reminder.message}
                                </span>
                              </div>
                              <p style={{ fontSize: "11px", color: "#6a3a78", marginBottom: "8px" }}>
                                📅 {new Date(task.nextDueDate).toLocaleDateString("fr-FR")} | 🚗 {task.nextDueKm} km
                              </p>
                              {task.status === "pending" && (
                                <button
                                  onClick={() => markMaintenanceComplete(task.id)}
                                  className="btn-success"
                                >
                                  ✓ Complétée
                                </button>
                              )}
                              {task.status === "done" && (
                                <p style={{ fontSize: "11px", color: "#15803d", fontWeight: 600 }}>
                                  ✓ Faite
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Add Vehicle Modal */}
      {showAddVehicle && (
        <div className="modal-overlay" onClick={() => setShowAddVehicle(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#1f0a2a", marginBottom: "20px" }}>
              🚗 Ajouter véhicule
            </h2>

            <form onSubmit={handleAddVehicle} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[12px] font-bold text-[#9b3ed5] mb-1 block">Marque</label>
                  <input
                    type="text"
                    value={formData.marque}
                    onChange={(e) => setFormData({ ...formData, marque: e.target.value })}
                    className="input-field"
                    placeholder="Renault"
                  />
                </div>
                <div>
                  <label className="text-[12px] font-bold text-[#9b3ed5] mb-1 block">Modèle</label>
                  <input
                    type="text"
                    value={formData.modele}
                    onChange={(e) => setFormData({ ...formData, modele: e.target.value })}
                    className="input-field"
                    placeholder="Master"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[12px] font-bold text-[#9b3ed5] mb-1 block">Immatriculation</label>
                  <input
                    type="text"
                    value={formData.immatriculation}
                    onChange={(e) => setFormData({ ...formData, immatriculation: e.target.value })}
                    className="input-field"
                    placeholder="ABC-123"
                  />
                </div>
                <div>
                  <label className="text-[12px] font-bold text-[#9b3ed5] mb-1 block">VIN</label>
                  <input
                    type="text"
                    value={formData.numeroVIN}
                    onChange={(e) => setFormData({ ...formData, numeroVIN: e.target.value })}
                    className="input-field"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[12px] font-bold text-[#9b3ed5] mb-1 block">Année</label>
                  <input
                    type="number"
                    value={formData.annee}
                    onChange={(e) => setFormData({ ...formData, annee: Number(e.target.value) })}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="text-[12px] font-bold text-[#9b3ed5] mb-1 block">Kilométrage</label>
                  <input
                    type="number"
                    value={formData.kilometrageActuel}
                    onChange={(e) => setFormData({ ...formData, kilometrageActuel: Number(e.target.value) })}
                    className="input-field"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button type="button" onClick={() => setShowAddVehicle(false)} className="btn-danger flex-1">
                  Annuler
                </button>
                <button type="submit" className="btn-primary flex-1">
                  Ajouter
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Maintenance Modal */}
      {showAddMaintenance && selectedVehicle && (
        <div className="modal-overlay" onClick={() => setShowAddMaintenance(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#1f0a2a", marginBottom: "20px" }}>
              ⚙️ Ajouter maintenance
            </h2>

            <form onSubmit={handleAddMaintenance} className="space-y-4">
              <div>
                <label className="text-[12px] font-bold text-[#9b3ed5] mb-1 block">Type de tâche</label>
                <select
                  value={maintenanceForm.taskType}
                  onChange={(e) => setMaintenanceForm({ ...maintenanceForm, taskType: e.target.value })}
                  className="input-field"
                >
                  <option>Révision</option>
                  <option>Changement huile</option>
                  <option>Changement pneus</option>
                  <option>Freins</option>
                  <option>Batterie</option>
                  <option>Contrôle technique</option>
                  <option>Assurance</option>
                  <option>Autre</option>
                </select>
              </div>

              <div>
                <label className="text-[12px] font-bold text-[#9b3ed5] mb-1 block">Description</label>
                <textarea
                  value={maintenanceForm.description}
                  onChange={(e) => setMaintenanceForm({ ...maintenanceForm, description: e.target.value })}
                  className="input-field"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[12px] font-bold text-[#9b3ed5] mb-1 block">Date limite</label>
                  <input
                    type="date"
                    value={maintenanceForm.nextDueDate}
                    onChange={(e) => setMaintenanceForm({ ...maintenanceForm, nextDueDate: e.target.value })}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="text-[12px] font-bold text-[#9b3ed5] mb-1 block">Km limite</label>
                  <input
                    type="number"
                    value={maintenanceForm.nextDueKm}
                    onChange={(e) => setMaintenanceForm({ ...maintenanceForm, nextDueKm: Number(e.target.value) })}
                    className="input-field"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button type="button" onClick={() => setShowAddMaintenance(false)} className="btn-danger flex-1">
                  Annuler
                </button>
                <button type="submit" className="btn-primary flex-1">
                  Ajouter
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
