"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { addDoc, collection } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function Page() {
  const [marque, setMarque] = useState("");
  const [modele, setModele] = useState("");
  const [immatriculation, setImmatriculation] = useState("");
  const [annee, setAnnee] = useState("");
  const [couleur, setCouleur] = useState("");
  const [carburant, setCarburant] = useState("Diesel");
  const [boite, setBoite] = useState("Manuelle");
  const [kilometrage, setKilometrage] = useState("");
  const [statut, setStatut] = useState("Actif");
  const [chauffeurAssigne, setChauffeurAssigne] = useState("");
  const [dateAchat, setDateAchat] = useState("");
  const [assuranceExpiration, setAssuranceExpiration] = useState("");
  const [controleTechniqueExpiration, setControleTechniqueExpiration] =
    useState("");
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage("");

    if (
      !marque ||
      !modele ||
      !immatriculation ||
      !annee ||
      !couleur ||
      !carburant ||
      !boite ||
      !kilometrage ||
      !statut
    ) {
      setMessage("Veuillez remplir tous les champs obligatoires.");
      return;
    }

    try {
      setLoading(true);

      await addDoc(collection(db, "vehicles"), {
        marque,
        modele,
        immatriculation,
        annee: Number(annee),
        couleur,
        carburant,
        boite,
        kilometrageActuel: Number(kilometrage),
        statut,
        chauffeurAssigne,
        dateAchat,
        assuranceExpiration,
        controleTechniqueExpiration,
        notes,
        createdAt: new Date().toISOString(),
      });

      setMessage("Véhicule ajouté avec succès.");

      setMarque("");
      setModele("");
      setImmatriculation("");
      setAnnee("");
      setCouleur("");
      setCarburant("Diesel");
      setBoite("Manuelle");
      setKilometrage("");
      setStatut("Actif");
      setChauffeurAssigne("");
      setDateAchat("");
      setAssuranceExpiration("");
      setControleTechniqueExpiration("");
      setNotes("");
    } catch (error) {
      console.error(error);
      setMessage("Erreur lors de l’ajout du véhicule.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fff8fb_0%,#f8eff5_48%,#f4edf2_100%)] px-4 py-6 md:px-8 md:py-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#c54581]">
              Administration CXP
            </p>
            <h1 className="mt-2 text-4xl font-black tracking-[-0.03em] text-[#21131a]">
              Ajouter un véhicule
            </h1>
            <p className="mt-2 text-sm text-[#6c5761]">
              Ajoutez un véhicule complet à votre flotte CXP.
            </p>
          </div>

          <Link
            href="/admin"
            className="rounded-full border border-[#efcfdd] bg-white px-5 py-3 text-sm font-semibold text-[#8e3f67] shadow-sm"
          >
            Retour
          </Link>
        </div>

        <div className="rounded-[32px] border border-white/70 bg-white/80 p-6 shadow-[0_20px_50px_rgba(0,0,0,0.05)] backdrop-blur-xl md:p-8">
          <form onSubmit={handleSubmit} className="space-y-8">
            <div>
              <h2 className="text-xl font-bold text-[#21131a]">
                Informations générales
              </h2>
              <div className="mt-4 grid gap-5 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-[#8e3f67]">
                    Marque
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Renault"
                    value={marque}
                    onChange={(e) => setMarque(e.target.value)}
                    className="w-full rounded-2xl border border-[#f0d8e4] bg-white px-4 py-3 outline-none"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-[#8e3f67]">
                    Modèle
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Kangoo"
                    value={modele}
                    onChange={(e) => setModele(e.target.value)}
                    className="w-full rounded-2xl border border-[#f0d8e4] bg-white px-4 py-3 outline-none"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-[#8e3f67]">
                    Immatriculation
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: 123-ABC"
                    value={immatriculation}
                    onChange={(e) => setImmatriculation(e.target.value)}
                    className="w-full rounded-2xl border border-[#f0d8e4] bg-white px-4 py-3 outline-none"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-[#8e3f67]">
                    Année
                  </label>
                  <input
                    type="number"
                    placeholder="Ex: 2021"
                    value={annee}
                    onChange={(e) => setAnnee(e.target.value)}
                    className="w-full rounded-2xl border border-[#f0d8e4] bg-white px-4 py-3 outline-none"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-[#8e3f67]">
                    Couleur
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Blanc"
                    value={couleur}
                    onChange={(e) => setCouleur(e.target.value)}
                    className="w-full rounded-2xl border border-[#f0d8e4] bg-white px-4 py-3 outline-none"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-[#8e3f67]">
                    Carburant
                  </label>
                  <select
                    value={carburant}
                    onChange={(e) => setCarburant(e.target.value)}
                    className="w-full rounded-2xl border border-[#f0d8e4] bg-white px-4 py-3 outline-none"
                  >
                    <option value="Diesel">Diesel</option>
                    <option value="Essence">Essence</option>
                    <option value="Électrique">Électrique</option>
                    <option value="Hybride">Hybride</option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-[#8e3f67]">
                    Boîte de vitesse
                  </label>
                  <select
                    value={boite}
                    onChange={(e) => setBoite(e.target.value)}
                    className="w-full rounded-2xl border border-[#f0d8e4] bg-white px-4 py-3 outline-none"
                  >
                    <option value="Manuelle">Manuelle</option>
                    <option value="Automatique">Automatique</option>
                  </select>
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-xl font-bold text-[#21131a]">
                Suivi d’exploitation
              </h2>
              <div className="mt-4 grid gap-5 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-[#8e3f67]">
                    Kilométrage actuel
                  </label>
                  <input
                    type="number"
                    placeholder="Ex: 120000"
                    value={kilometrage}
                    onChange={(e) => setKilometrage(e.target.value)}
                    className="w-full rounded-2xl border border-[#f0d8e4] bg-white px-4 py-3 outline-none"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-[#8e3f67]">
                    Statut
                  </label>
                  <select
                    value={statut}
                    onChange={(e) => setStatut(e.target.value)}
                    className="w-full rounded-2xl border border-[#f0d8e4] bg-white px-4 py-3 outline-none"
                  >
                    <option value="Actif">Actif</option>
                    <option value="Entretien bientôt">Entretien bientôt</option>
                    <option value="En entretien">En entretien</option>
                    <option value="Hors service">Hors service</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-semibold text-[#8e3f67]">
                    Chauffeur assigné
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Yassine"
                    value={chauffeurAssigne}
                    onChange={(e) => setChauffeurAssigne(e.target.value)}
                    className="w-full rounded-2xl border border-[#f0d8e4] bg-white px-4 py-3 outline-none"
                  />
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-xl font-bold text-[#21131a]">
                Documents et échéances
              </h2>
              <div className="mt-4 grid gap-5 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-[#8e3f67]">
                    Date d’achat
                  </label>
                  <input
                    type="date"
                    value={dateAchat}
                    onChange={(e) => setDateAchat(e.target.value)}
                    className="w-full rounded-2xl border border-[#f0d8e4] bg-white px-4 py-3 outline-none"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-[#8e3f67]">
                    Expiration assurance
                  </label>
                  <input
                    type="date"
                    value={assuranceExpiration}
                    onChange={(e) => setAssuranceExpiration(e.target.value)}
                    className="w-full rounded-2xl border border-[#f0d8e4] bg-white px-4 py-3 outline-none"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-[#8e3f67]">
                    Expiration contrôle technique
                  </label>
                  <input
                    type="date"
                    value={controleTechniqueExpiration}
                    onChange={(e) =>
                      setControleTechniqueExpiration(e.target.value)
                    }
                    className="w-full rounded-2xl border border-[#f0d8e4] bg-white px-4 py-3 outline-none"
                  />
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-xl font-bold text-[#21131a]">Notes</h2>
              <div className="mt-4">
                <label className="mb-2 block text-sm font-semibold text-[#8e3f67]">
                  Remarques
                </label>
                <textarea
                  placeholder="Ajoutez des remarques utiles sur le véhicule"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                  className="w-full rounded-2xl border border-[#f0d8e4] bg-white px-4 py-3 outline-none"
                />
              </div>
            </div>

            {message && (
              <p className="rounded-2xl bg-[#fff1f7] px-4 py-3 text-sm text-[#8e3f67]">
                {message}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-full bg-[linear-gradient(90deg,#ff2f78_0%,#ff5f9e_100%)] px-5 py-3 text-sm font-semibold text-white shadow-[0_16px_30px_rgba(255,47,120,0.28)] disabled:opacity-70"
            >
              {loading ? "Enregistrement..." : "Enregistrer le véhicule"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}