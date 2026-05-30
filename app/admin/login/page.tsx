"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { FirebaseError } from "firebase/app";
import { auth, db } from "@/lib/firebase";
import Link from "next/link";

export default function AdminLoginPage() {
  const router = useRouter();

  const [utilisateur, setUtilisateur] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage("");
    if (!utilisateur || !motDePasse) { setMessage("Quelques champs attendent vos informations."); return; }
    try {
      setLoading(true);
      setMessage("⏳ Étape 1 : Connexion Firebase Auth...");
      const userCredential = await signInWithEmailAndPassword(auth, utilisateur, motDePasse);
      const uid = userCredential.user.uid;
      setMessage(`⏳ Étape 2 : Auth OK. UID = ${uid}. Chargement Firestore...`);
      const userSnap = await getDoc(doc(db, "users", uid));
      if (!userSnap.exists()) { 
        setMessage("❌ Étape 3 : Profil introuvable dans Firestore. Allez sur /setup pour recréer le compte."); 
        return; 
      }
      const userData = userSnap.data();
      setMessage(`⏳ Étape 3 : Firestore OK. Rôle = "${userData.role}". Redirection...`);
      if (userData.role !== "admin") { 
        setMessage(`❌ Étape 4 : Rôle incorrect "${userData.role}". Ce compte n'est pas admin.`); 
        return; 
      }
      setMessage("✅ Étape 4 : Tout est OK ! Redirection vers /admin...");
      await router.push("/admin");
    } catch (error) {
      if (error instanceof FirebaseError) {
        switch (error.code) {
          case "auth/invalid-email": setMessage("❌ Email invalide."); break;
          case "auth/user-not-found":
          case "auth/wrong-password":
          case "auth/invalid-credential": setMessage("❌ Email ou mot de passe incorrect."); break;
          default: setMessage(`❌ Erreur Firebase : ${error.code}`);
        }
      } else { 
        setMessage(`❌ Erreur inconnue : ${String(error)}`); 
      }
    } finally { setLoading(false); }
  }

  return (
    <main className="relative min-h-screen overflow-hidden">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Instrument+Serif:ital@0;1&display=swap');

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); filter: blur(6px); }
          to   { opacity: 1; transform: translateY(0); filter: blur(0); }
        }
        @keyframes shineSweep {
          0%   { transform: translateX(-150%) skewX(-25deg); }
          60%  { transform: translateX(250%) skewX(-25deg); }
          100% { transform: translateX(250%) skewX(-25deg); }
        }
        @keyframes float1 {
          0%,100% { transform: translate(0,0) scale(1); }
          50%     { transform: translate(20px,-15px) scale(1.05); }
        }
        @keyframes float2 {
          0%,100% { transform: translate(0,0) scale(1); }
          50%     { transform: translate(-25px,18px) scale(0.96); }
        }
        @keyframes float3 {
          0%,100% { transform: translate(0,0); }
          50%     { transform: translate(12px,12px); }
        }

        .a1 { animation: fadeUp 0.7s cubic-bezier(.22,1,.36,1) 0.00s both; }
        .a2 { animation: fadeUp 0.7s cubic-bezier(.22,1,.36,1) 0.08s both; }
        .a3 { animation: fadeUp 0.7s cubic-bezier(.22,1,.36,1) 0.16s both; }
        .a4 { animation: fadeUp 0.7s cubic-bezier(.22,1,.36,1) 0.24s both; }
        .a5 { animation: fadeUp 0.7s cubic-bezier(.22,1,.36,1) 0.32s both; }
        .a6 { animation: fadeUp 0.7s cubic-bezier(.22,1,.36,1) 0.40s both; }

        body { font-family: 'Inter', sans-serif; }

        .atmo {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          pointer-events: none;
          z-index: 2;
        }

        .login-card {
          position: relative;
          width: 100%;
          max-width: 440px;
          z-index: 5;
        }

        .glass-shell {
          position: relative;
          border-radius: 32px;
          padding: 1.5px;
          background: linear-gradient(135deg,
            rgba(170,80,220,0.65) 0%,
            rgba(200,140,240,0.45) 30%,
            rgba(220,80,180,0.55) 65%,
            rgba(255,120,160,0.5) 100%);
          box-shadow:
            0 40px 100px rgba(120,30,160,0.4),
            0 12px 30px rgba(80,20,120,0.18),
            0 0 0 1px rgba(255,255,255,0.1);
        }

        .glass-inner {
          position: relative;
          border-radius: 30.5px;
          background:
            radial-gradient(ellipse at top right, rgba(200,140,240,0.45) 0%, transparent 55%),
            radial-gradient(ellipse at bottom left, rgba(255,150,200,0.4) 0%, transparent 55%),
            linear-gradient(165deg, rgba(248,240,255,0.88) 0%, rgba(245,225,250,0.82) 50%, rgba(252,210,232,0.85) 100%);
          backdrop-filter: blur(40px) saturate(180%);
          -webkit-backdrop-filter: blur(40px) saturate(180%);
          padding: 36px;
          overflow: hidden;
        }
        .glass-inner::before {
          content: '';
          position: absolute;
          top: 0; left: 8%; right: 8%;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,1), transparent);
        }
        .glass-inner::after {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 80px;
          background: linear-gradient(180deg, rgba(255,255,255,0.4), transparent);
          pointer-events: none;
        }

        .deco {
          position: absolute;
          border-radius: 50%;
          pointer-events: none;
        }

        .logo-tile {
          position: relative;
          width: 46px; height: 46px;
          border-radius: 14px;
          background: linear-gradient(135deg, #9b3ed5 0%, #c534b5 50%, #ff5697 100%);
          display: flex; align-items: center; justify-content: center;
          color: #fff;
          font-weight: 800;
          font-size: 18px;
          letter-spacing: -0.02em;
          box-shadow:
            0 12px 28px rgba(155,62,213,0.5),
            0 4px 10px rgba(120,30,140,0.3),
            inset 0 2px 0 rgba(255,255,255,0.5),
            inset 0 -10px 18px rgba(100,20,120,0.3);
          overflow: hidden;
        }
        .logo-tile::after {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 50%;
          background: linear-gradient(180deg, rgba(255,255,255,0.3), transparent);
          border-radius: 14px 14px 0 0;
        }

        .field-wrap {
          position: relative;
          height: 54px;
          background: rgba(255,255,255,0.5);
          border: 1.5px solid rgba(200,140,240,0.45);
          border-radius: 14px;
          transition: all 0.25s;
          backdrop-filter: blur(12px);
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.7),
            inset 0 -1px 0 rgba(200,140,240,0.1),
            0 2px 8px rgba(120,30,140,0.05);
          overflow: hidden;
        }
        .field-wrap::before {
          content: '';
          position: absolute;
          top: 0; left: 10%; right: 10%;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.8), transparent);
          opacity: 0.6;
        }
        .field-wrap:focus-within {
          background: rgba(255,255,255,0.88);
          border-color: #9b3ed5;
          box-shadow:
            0 0 0 4px rgba(155,62,213,0.15),
            inset 0 1px 0 rgba(255,255,255,0.9),
            0 8px 24px rgba(155,62,213,0.18);
        }
        .field-input {
          width: 100%;
          height: 100%;
          background: transparent;
          border: none;
          outline: none;
          padding: 0 18px 0 46px;
          font-family: 'Inter', sans-serif;
          font-size: 14.5px;
          font-weight: 500;
          color: #1f0a2a;
        }
        .field-input::placeholder { color: #c8a4d6; font-weight: 400; }
        .field-icon {
          position: absolute;
          left: 17px; top: 50%;
          transform: translateY(-50%);
          color: #a070bf;
          pointer-events: none;
          transition: color 0.2s, transform 0.2s;
        }
        .field-wrap:focus-within .field-icon {
          color: #9b3ed5;
          transform: translateY(-50%) scale(1.08);
        }
        .pwd-toggle {
          position: absolute;
          right: 8px; top: 50%;
          transform: translateY(-50%);
          background: transparent;
          border: none;
          cursor: pointer;
          color: #a070bf;
          padding: 9px;
          border-radius: 9px;
          transition: all 0.15s;
        }
        .pwd-toggle:hover { color: #9b3ed5; background: rgba(155,62,213,0.08); }

        .px-check {
          appearance: none;
          width: 18px; height: 18px;
          border: 1.5px solid rgba(170,80,220,0.45);
          background: rgba(255,255,255,0.7);
          border-radius: 5px;
          cursor: pointer;
          position: relative;
          transition: all 0.18s;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.6);
        }
        .px-check:hover { border-color: rgba(155,62,213,0.7); }
        .px-check:checked {
          background: linear-gradient(135deg, #9b3ed5, #c534b5);
          border-color: transparent;
          box-shadow:
            0 4px 12px rgba(155,62,213,0.4),
            inset 0 1px 0 rgba(255,255,255,0.3);
        }
        .px-check:checked::after {
          content: '';
          position: absolute;
          left: 5px; top: 2px;
          width: 6px; height: 10px;
          border: solid white;
          border-width: 0 2.5px 2.5px 0;
          transform: rotate(45deg);
        }

        .btn-cxp {
          position: relative;
          width: 100%;
          height: 56px;
          background: linear-gradient(135deg, #7a1ea8 0%, #9b3ed5 30%, #c534b5 60%, #ec1a6c 100%);
          border: none;
          border-radius: 16px;
          color: #fff;
          font-family: 'Inter', sans-serif;
          font-size: 14.5px;
          font-weight: 700;
          letter-spacing: 0.015em;
          cursor: pointer;
          overflow: hidden;
          transition: transform 0.25s, box-shadow 0.25s;
          box-shadow:
            0 16px 36px rgba(155,62,213,0.5),
            0 6px 14px rgba(120,30,160,0.3),
            inset 0 1.5px 0 rgba(255,255,255,0.3),
            inset 0 -2px 0 rgba(80,10,100,0.4);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
        }
        .btn-cxp:hover {
          transform: translateY(-2px);
          box-shadow:
            0 24px 50px rgba(155,62,213,0.6),
            0 8px 18px rgba(120,30,160,0.3),
            inset 0 1.5px 0 rgba(255,255,255,0.3),
            inset 0 -2px 0 rgba(80,10,100,0.4);
        }
        .btn-cxp:active { transform: translateY(0); }
        .btn-cxp:disabled { opacity: 0.7; cursor: not-allowed; }
        .btn-shine {
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          overflow: hidden;
          pointer-events: none;
          border-radius: 16px;
        }
        .btn-shine::after {
          content: '';
          position: absolute;
          top: -50%; left: -150%;
          width: 60%; height: 200%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent);
          transform: skewX(-25deg);
        }
        .btn-cxp:hover .btn-shine::after { animation: shineSweep 0.8s ease forwards; }
        .arrow-svg { transition: transform 0.25s; }
        .btn-cxp:hover .arrow-svg { transform: translateX(5px); }

        .err-box {
          padding: 12px 14px;
          background: linear-gradient(135deg, rgba(155,62,213,0.1), rgba(155,62,213,0.04));
          border: 1px solid rgba(155,62,213,0.28);
          border-radius: 12px;
          font-size: 13px;
          font-weight: 500;
          color: #6a1ea3;
          display: flex;
          align-items: center;
          gap: 10px;
          backdrop-filter: blur(8px);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.4);
        }

        .field-label {
          font-size: 11px;
          font-weight: 700;
          color: #6a1ea3;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }

        .back-link {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          font-weight: 600;
          color: #9b3ed5;
          text-decoration: none;
          transition: all 0.2s;
        }
        .back-link:hover {
          color: #6a1ea3;
          gap: 8px;
        }
      `}</style>

      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url('/login-bg.png')" }}
      />
      <div className="absolute inset-0" style={{
        background: "linear-gradient(135deg, rgba(140,40,180,0.22) 0%, rgba(200,140,240,0.18) 50%, rgba(255,80,150,0.22) 100%)",
      }} />

      <div className="atmo" style={{
        width: 380, height: 380,
        top: "8%", left: "8%",
        background: "radial-gradient(circle, rgba(170,80,220,0.45), transparent 60%)",
        animation: "float1 11s ease-in-out infinite",
      }} />
      <div className="atmo" style={{
        width: 320, height: 320,
        bottom: "5%", right: "10%",
        background: "radial-gradient(circle, rgba(220,140,200,0.4), transparent 60%)",
        animation: "float2 13s ease-in-out infinite",
      }} />
      <div className="atmo" style={{
        width: 200, height: 200,
        top: "50%", right: "30%",
        background: "radial-gradient(circle, rgba(200,100,220,0.3), transparent 60%)",
        animation: "float3 16s ease-in-out infinite",
      }} />

      <div className="relative z-10 flex min-h-screen items-center justify-center px-5 py-10">
        <div className="login-card a1">
          <div className="glass-shell">
            <div className="glass-inner">

              <div className="deco" style={{ width: 180, height: 180, top: -40, right: -50, background: "radial-gradient(circle, rgba(170,80,220,0.35), transparent 65%)" }} />
              <div className="deco" style={{ width: 140, height: 140, bottom: 80, left: -45, background: "radial-gradient(circle, rgba(220,80,170,0.2), transparent 65%)" }} />

              <div className="a2 mb-7">
                <Link href="/" className="back-link">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="19" y1="12" x2="5" y2="12" />
                    <polyline points="12 19 5 12 12 5" />
                  </svg>
                  Retour
                </Link>
              </div>

              <div className="a2 mb-9 relative">
                <div className="flex items-center gap-3">
                  <div className="logo-tile">C</div>
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span style={{
                      fontFamily: "'Inter', sans-serif",
                      fontSize: "26px",
                      fontWeight: 900,
                      letterSpacing: "-0.05em",
                      background: "linear-gradient(135deg, #7a1ea8 0%, #9b3ed5 40%, #c534b5 70%, #ff5697 100%)",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                      backgroundClip: "text",
                      lineHeight: 1,
                    }}>
                      CXP
                    </span>
                    <span style={{ color: "#c098d9", fontSize: "16px", lineHeight: 1 }}>·</span>
                    <span style={{
                      fontFamily: "'Instrument Serif', serif",
                      fontSize: "15px",
                      fontStyle: "italic",
                      color: "#a02a92",
                      lineHeight: 1.1,
                      fontWeight: 500,
                    }}>
                      Administrateur
                    </span>
                  </div>
                </div>
              </div>

              <div className="a3 mb-3 relative">
                <h1 className="text-[30px] font-bold text-[#1f0a2a] tracking-[-0.025em] leading-[1.08]">
                  Ravi de vous{" "}
                  <span style={{
                    fontFamily: "'Instrument Serif', serif",
                    fontStyle: "italic",
                    fontWeight: 400,
                    fontSize: "38px",
                    background: "linear-gradient(135deg, #7a1ea8 0%, #9b3ed5 40%, #c534b5 70%, #ec1a6c 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                    letterSpacing: "-0.01em",
                  }}>
                    revoir
                  </span>
                  <br />
                  sur la <span style={{ color: "#9b3ed5", fontWeight: 800 }}>route.</span>
                </h1>
              </div>

              <p className="a3 text-[13.5px] text-[#6a3a78] leading-[1.6] mb-7 relative">
                Connectez-vous à votre poste de pilotage pour suivre la flotte, vos équipes et vos tournées.
              </p>

              <form onSubmit={handleLogin} className="space-y-3.5 relative">

                <div className="a4">
                  <label className="field-label block mb-1.5">Adresse email</label>
                  <div className="field-wrap">
                    <svg className="field-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="5" width="18" height="14" rx="2" />
                      <path d="m3 7 9 6 9-6" />
                    </svg>
                    <input
                      type="email"
                      placeholder="vous@cxp.fr"
                      value={utilisateur}
                      onChange={(e) => setUtilisateur(e.target.value)}
                      className="field-input"
                    />
                  </div>
                </div>

                <div className="a5">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="field-label">Mot de passe</label>
                    <a href="#" onClick={(e) => e.preventDefault()} className="text-[11.5px] font-semibold text-[#9b3ed5] hover:text-[#6a1ea3] transition">
                      Mot de passe oublié ?
                    </a>
                  </div>
                  <div className="field-wrap">
                    <svg className="field-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="11" width="18" height="11" rx="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                    <input
                      type={showPwd ? "text" : "password"}
                      placeholder="••••••••"
                      value={motDePasse}
                      onChange={(e) => setMotDePasse(e.target.value)}
                      className="field-input"
                      style={{ paddingRight: "48px" }}
                    />
                    <button type="button" className="pwd-toggle" onClick={() => setShowPwd(!showPwd)} aria-label="Toggle">
                      {showPwd ? (
                        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                          <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                          <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
                          <line x1="2" y1="2" x2="22" y2="22" />
                        </svg>
                      ) : (
                        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                <div className="a5 flex items-center gap-2 pt-1">
                  <input type="checkbox" id="remember" className="px-check" />
                  <label htmlFor="remember" className="text-[12.5px] font-medium text-[#6a3a78] cursor-pointer select-none">
                    Me reconnaître sur cet appareil
                  </label>
                </div>

                {message && (
                  <div className="a6 err-box">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    {message}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="a6 btn-cxp"
                  style={{ marginTop: "12px" }}
                >
                  <span className="btn-shine" />
                  {loading ? "Un instant…" : (
                    <>
                      Prendre le volant
                      <svg className="arrow-svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="5" y1="12" x2="19" y2="12" />
                        <polyline points="12 5 19 12 12 19" />
                      </svg>
                    </>
                  )}
                </button>

              </form>

            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
