"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import Link from "next/link";

export default function NewEmployeePage() {
  const router = useRouter();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("worker");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage("");

    if (!firstName || !lastName || !email || !password) {
      setMessage("Tous les champs sont requis.");
      return;
    }

    if (password.length < 6) {
      setMessage("Le mot de passe doit contenir au moins 6 caractères.");
      return;
    }

    try {
      setLoading(true);

      // Create Firebase Auth account
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const uid = userCredential.user.uid;

      // Create Firestore document
      await setDoc(doc(db, "users", uid), {
        firstName,
        lastName,
        email,
        role,
        createdAt: new Date().toISOString(),
      });

      setMessage("✓ Employé créé avec succès !");
      
      // Reset form
      setTimeout(() => {
        router.push("/admin");
      }, 1500);

    } catch (error: any) {
      console.error("Erreur création employé:", error);
      if (error.code === "auth/email-already-in-use") {
        setMessage("Cet email est déjà utilisé.");
      } else if (error.code === "auth/invalid-email") {
        setMessage("Adresse email invalide.");
      } else if (error.code === "auth/weak-password") {
        setMessage("Mot de passe trop faible.");
      } else {
        setMessage(`Erreur : ${error.message}`);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Instrument+Serif:ital@0;1&display=swap');

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
            radial-gradient(ellipse at top left, rgba(170,80,220,0.4) 0%, transparent 50%),
            radial-gradient(ellipse at top right, rgba(255,150,190,0.35) 0%, transparent 50%),
            radial-gradient(ellipse at bottom right, rgba(255,80,150,0.3) 0%, transparent 55%),
            linear-gradient(160deg, #f5ecff 0%, #fbe8f4 35%, #ffdce8 70%, #ffcfe1 100%);
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
          border-radius: 26px;
          padding: 1.5px;
          background: linear-gradient(135deg,
            rgba(170,80,220,0.5) 0%,
            rgba(255,180,210,0.4) 50%,
            rgba(255,80,150,0.5) 100%);
          box-shadow:
            0 22px 56px rgba(120,30,140,0.18),
            0 6px 18px rgba(0,0,0,0.06);
        }
        .glass-inner {
          position: relative;
          border-radius: 25px;
          background:
            radial-gradient(ellipse at top left, rgba(200,140,240,0.25) 0%, transparent 55%),
            radial-gradient(ellipse at bottom right, rgba(255,150,190,0.3) 0%, transparent 55%),
            linear-gradient(165deg, rgba(255,250,253,0.88) 0%, rgba(252,238,250,0.82) 100%);
          backdrop-filter: blur(34px) saturate(180%);
          -webkit-backdrop-filter: blur(34px) saturate(180%);
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

        .back-link {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          font-weight: 600;
          color: #9b3ed5;
          text-decoration: none;
          transition: all 0.2s;
        }
        .back-link:hover { color: #6a1ea3; gap: 8px; }

        .field-label {
          font-size: 11px;
          font-weight: 700;
          color: #6a1ea3;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          margin-bottom: 8px;
          display: block;
        }

        .field-input, .field-select {
          width: 100%;
          height: 48px;
          background: rgba(255,255,255,0.6);
          border: 1.5px solid rgba(200,140,240,0.4);
          border-radius: 12px;
          padding: 0 16px;
          font-family: 'Inter', sans-serif;
          font-size: 14px;
          font-weight: 500;
          color: #1f0a2a;
          transition: all 0.2s;
          backdrop-filter: blur(8px);
        }
        .field-input::placeholder { color: #c8a4d6; }
        .field-input:focus, .field-select:focus {
          outline: none;
          background: rgba(255,255,255,0.85);
          border-color: #9b3ed5;
          box-shadow: 0 0 0 3px rgba(155,62,213,0.12);
        }

        .btn-submit {
          width: 100%;
          height: 52px;
          background: linear-gradient(135deg, #8e2bd1 0%, #c534b5 40%, #ec1a6c 80%, #ff4d8d 100%);
          border: none;
          border-radius: 14px;
          color: #fff;
          font-weight: 700;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.25s;
          box-shadow:
            0 12px 28px rgba(180,40,160,0.4),
            inset 0 1px 0 rgba(255,255,255,0.25);
        }
        .btn-submit:hover {
          transform: translateY(-2px);
          box-shadow: 0 18px 36px rgba(180,40,160,0.5);
        }
        .btn-submit:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        .msg-box {
          padding: 12px 16px;
          border-radius: 12px;
          font-size: 13px;
          font-weight: 500;
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .msg-error {
          background: linear-gradient(135deg, rgba(155,62,213,0.1), rgba(155,62,213,0.04));
          border: 1px solid rgba(155,62,213,0.28);
          color: #6a1ea3;
        }
        .msg-success {
          background: linear-gradient(135deg, rgba(34,197,94,0.15), rgba(34,197,94,0.05));
          border: 1px solid rgba(34,197,94,0.35);
          color: #15803d;
        }
      `}</style>

      <div className="page-bg" />
      <div className="atmo" style={{
        width: 460, height: 460,
        top: "5%", left: "-5%",
        background: "radial-gradient(circle, rgba(170,80,220,0.3), transparent 60%)",
        animation: "float1 14s ease-in-out infinite",
      }} />
      <div className="atmo" style={{
        width: 400, height: 400,
        bottom: "5%", right: "-5%",
        background: "radial-gradient(circle, rgba(255,180,210,0.4), transparent 60%)",
        animation: "float2 16s ease-in-out infinite",
      }} />

      <div className="relative z-10 px-4 py-8">
        <div className="mx-auto max-w-2xl">

          <div className="a1 glass mb-6">
            <div className="glass-inner">
              <Link href="/admin" className="back-link">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="19" y1="12" x2="5" y2="12" />
                  <polyline points="12 19 5 12 12 5" />
                </svg>
                Retour au tableau de bord
              </Link>

              <h1 style={{
                fontFamily: "'Instrument Serif', serif",
                fontSize: "38px",
                fontWeight: 400,
                color: "#1f0a2a",
                letterSpacing: "-0.025em",
                lineHeight: 1.1,
                marginTop: "20px",
              }}>
                Créer un <span style={{
                  fontStyle: "italic",
                  background: "linear-gradient(135deg, #8e2bd1, #ec1a6c)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}>nouvel employé</span>
              </h1>
              <p className="text-[13.5px] text-[#6a3a78] mt-2">
                Remplissez les informations pour créer un compte employé.
              </p>
            </div>
          </div>

          <div className="a2 glass">
            <div className="glass-inner">
              <form onSubmit={handleSubmit} className="space-y-5">

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="field-label">Prénom</label>
                    <input
                      type="text"
                      placeholder="Jean"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="field-input"
                    />
                  </div>
                  <div>
                    <label className="field-label">Nom</label>
                    <input
                      type="text"
                      placeholder="Dupont"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="field-input"
                    />
                  </div>
                </div>

                <div>
                  <label className="field-label">Adresse email</label>
                  <input
                    type="email"
                    placeholder="jean.dupont@cxp.fr"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="field-input"
                  />
                </div>

                <div>
                  <label className="field-label">Mot de passe</label>
                  <input
                    type="password"
                    placeholder="Min. 6 caractères"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="field-input"
                  />
                  <p className="text-[11px] text-[#a070bf] mt-1.5">
                    L'employé pourra changer son mot de passe après la première connexion.
                  </p>
                </div>

                <div>
                  <label className="field-label">Rôle</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="field-select"
                  >
                    <option value="worker">Employé (Accès terrain)</option>
                    <option value="admin">Administrateur (Accès complet)</option>
                  </select>
                </div>

                {message && (
                  <div className={message.startsWith("✓") ? "msg-box msg-success" : "msg-box msg-error"}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      {message.startsWith("✓") ? (
                        <>
                          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                          <polyline points="22 4 12 14.01 9 11.01" />
                        </>
                      ) : (
                        <>
                          <circle cx="12" cy="12" r="10" />
                          <line x1="12" y1="8" x2="12" y2="12" />
                          <line x1="12" y1="16" x2="12.01" y2="16" />
                        </>
                      )}
                    </svg>
                    {message}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-submit"
                >
                  {loading ? "Création en cours..." : "Créer le compte"}
                </button>

              </form>
            </div>
          </div>

        </div>
      </div>
    </main>
  );
}
