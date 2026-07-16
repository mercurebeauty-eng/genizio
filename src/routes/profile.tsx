import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-session";
import { AppHeader } from "@/components/AppHeader";
import { toast } from "sonner";
import { User, Phone, Lock, ArrowLeft, Check, Loader2, Users, Calendar, Shield } from "lucide-react";
import { ConsentLedger } from "@/components/settings/ConsentLedger";
import { ExportDataButton } from "@/components/settings/ExportDataButton";
import { DeleteAccountDialog } from "@/components/settings/DeleteAccountDialog";

export const Route = createFileRoute("/profile")({
  component: ProfilePage,
});

const COUNTRIES = [
  { code: "+225", flag: "🇨🇮", name: "Côte d'Ivoire", limit: 10 },
  { code: "+221", flag: "🇸🇳", name: "Sénégal", limit: 9 },
  { code: "+237", flag: "🇨🇲", name: "Cameroun", limit: 9 },
  { code: "+223", flag: "🇲🇱", name: "Mali", limit: 8 },
  { code: "+224", flag: "🇬🇳", name: "Guinée", limit: 9 },
  { code: "+226", flag: "🇧🇫", name: "Burkina Faso", limit: 8 },
  { code: "+228", flag: "🇹🇬", name: "Togo", limit: 8 },
  { code: "+229", flag: "🇧🇯", name: "Bénin", limit: 8 },
  { code: "+242", flag: "🇨🇬", name: "Congo", limit: 9 },
  { code: "+243", flag: "🇨🇩", name: "RDC", limit: 9 },
  { code: "+212", flag: "🇲🇦", name: "Maroc", limit: 9 },
  { code: "+33", flag: "🇫🇷", name: "France", limit: 9 },
];

function ProfilePage() {
  const { session, loading } = useSession();
  const navigate = useNavigate();

  const [phoneNumber, setPhoneNumber] = useState("");
  const [selectedCountry, setSelectedCountry] = useState(COUNTRIES[0]);
  const [savingPhone, setSavingPhone] = useState(false);

  // Password reset states
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [updatingPassword, setUpdatingPassword] = useState(false);

  // Parent Stats
  const [childCount, setChildCount] = useState(0);
  const [challengeStats, setChallengeStats] = useState({ total: 0, completed: 0 });
  const [mentorCount, setMentorCount] = useState(0);
  const [artifactsCount, setArtifactsCount] = useState(0);

  useEffect(() => {
    if (!loading && !session) navigate({ to: "/auth", replace: true });
    if (session) {
      // Load saved phone
      const savedPhone = session.user.user_metadata?.phone;
      if (savedPhone) {
        const foundCountry = COUNTRIES.find((c) => savedPhone.startsWith(c.code));
        if (foundCountry) {
          setSelectedCountry(foundCountry);
          setPhoneNumber(savedPhone.replace(foundCountry.code, ""));
        }
      }

      // Fetch stats
      supabase.from("child_profiles").select("id", { count: "exact" }).then(({ count }) => {
        setChildCount(count || 0);
      });
      supabase.from("child_mentors").select("id", { count: "exact" }).then(({ count }) => {
        setMentorCount(count || 0);
      });
      supabase.from("challenges").select("status, proof_image_url").then(({ data }) => {
        if (data) {
          setChallengeStats({
            total: data.length,
            completed: data.filter((c) => c.status === "completed").length,
          });
          setArtifactsCount(data.filter((c) => c.status === "completed" && c.proof_image_url).length);
        }
      });
    }
  }, [session, loading, navigate]);

  const handleSavePhone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (phoneNumber.length < selectedCountry.limit - 2) {
      toast.error(`Le numéro de téléphone doit contenir au moins ${selectedCountry.limit - 2} chiffres.`);
      return;
    }
    setSavingPhone(true);
    try {
      const fullPhone = `${selectedCountry.code}${phoneNumber}`;
      const { error } = await supabase.auth.updateUser({
        data: { phone: fullPhone },
      });
      if (error) throw error;
      toast.success("Numéro de téléphone mis à jour avec succès !");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur d'enregistrement.");
    } finally {
      setSavingPhone(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("Les mots de passe ne correspondent pas.");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("Le mot de passe doit contenir au moins 6 caractères.");
      return;
    }
    setUpdatingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (error) throw error;
      toast.success("Mot de passe mis à jour !");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur.");
    } finally {
      setUpdatingPassword(false);
    }
  };

  if (loading || !session) {
    return <div className="grid min-h-screen place-items-center bg-surface">Chargement...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-surface via-surface to-brand/5 p-6 font-sans text-ink">
      <AppHeader />

      <div className="pt-6"></div>

      <div className="mx-auto max-w-4xl grid gap-8 md:grid-cols-3">
        {/* Left Column: Summary Card */}
        <div className="md:col-span-1 space-y-6">
          <div className="rounded-3xl border border-ink/5 bg-white p-6 shadow-soft text-center">
            <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-brand/10 text-brand text-2xl font-bold">
              <User className="size-8" />
            </div>
            <h2 className="mt-4 font-display text-xl font-bold truncate">{session.user.email}</h2>
            <p className="text-xs text-ink/40 font-semibold mt-1">Compte Parent</p>
            <div className="mt-6 border-t border-ink/5 pt-6 text-left space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-ink/50 flex items-center gap-2">
                  <Users className="size-4 text-brand" /> Enfants
                </span>
                <span className="font-bold">{childCount}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-ink/50 flex items-center gap-2">
                  <Check className="size-4 text-emerald-600" /> Défis complétés
                </span>
                <span className="font-bold text-emerald-600">{challengeStats.completed} / {challengeStats.total}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-ink/50 flex items-center gap-2">
                  <Calendar className="size-4 text-amber-600" /> Créé le
                </span>
                <span className="font-bold text-xs">{new Date(session.user.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Settings Sections */}
        <div className="md:col-span-2 space-y-6">
          {/* Phone Settings */}
          <div className="rounded-3xl border border-ink/5 bg-white p-6 shadow-soft md:p-8">
            <h3 className="font-display text-lg font-bold flex items-center gap-2 mb-2">
              <Phone className="size-5 text-brand" />
              Numéro de téléphone
            </h3>
            <p className="text-xs text-ink/50 leading-relaxed mb-6">
              Renseignez votre numéro pour recevoir des synthèses personnalisées et des notifications sur le potentiel de vos enfants.
            </p>
            <form onSubmit={handleSavePhone} className="space-y-4">
              <div className="flex gap-2">
                <select
                  value={selectedCountry.code}
                  onChange={(e) => {
                    const found = COUNTRIES.find((c) => c.code === e.target.value);
                    if (found) {
                      setSelectedCountry(found);
                      setPhoneNumber("");
                    }
                  }}
                  className="rounded-xl border border-ink/10 bg-stone-50 px-3 py-3 text-sm font-bold outline-none focus:border-brand cursor-pointer"
                >
                  {COUNTRIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.flag} {c.code}
                    </option>
                  ))}
                </select>

                <div className="relative flex-1">
                  <input
                    type="tel"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={selectedCountry.limit}
                    value={phoneNumber}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "");
                      setPhoneNumber(val);
                    }}
                    placeholder="Numéro sans l'indicatif"
                    className="w-full rounded-xl border border-ink/10 px-4 py-3 text-sm font-bold outline-none focus:border-brand"
                    required
                  />
                </div>
              </div>
              <div className="flex items-center justify-between text-xs text-ink/40 font-medium">
                <span>Pays actuel : {selectedCountry.name}</span>
                <span>{phoneNumber.length} / {selectedCountry.limit} chiffres</span>
              </div>
              <button
                type="submit"
                disabled={savingPhone || !phoneNumber}
                className="rounded-xl bg-brand px-6 py-2.5 text-sm font-bold text-white shadow-md shadow-brand/10 hover:bg-brand-dark transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {savingPhone ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                <span>Enregistrer le numéro</span>
              </button>
            </form>
          </div>

          {/* Password Settings */}
          <div className="rounded-3xl border border-ink/5 bg-white p-6 shadow-soft md:p-8">
            <h3 className="font-display text-lg font-bold flex items-center gap-2 mb-2">
              <Lock className="size-5 text-amber-500" />
              Modifier le mot de passe
            </h3>
            <p className="text-xs text-ink/50 leading-relaxed mb-6">
              Assurez la sécurité de votre compte parent en modifiant régulièrement votre clé d'accès.
            </p>
            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-ink/50">
                    Nouveau mot de passe
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min. 6 caractères"
                    className="w-full rounded-xl border border-ink/10 px-4 py-3 text-sm outline-none focus:border-brand"
                    required
                  />
                </div>
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-ink/50">
                    Confirmer le mot de passe
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirmez"
                    className="w-full rounded-xl border border-ink/10 px-4 py-3 text-sm outline-none focus:border-brand"
                    required
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={updatingPassword || !newPassword}
                className="rounded-xl bg-ink px-6 py-2.5 text-sm font-bold text-white hover:bg-brand transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {updatingPassword ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                <span>Modifier le mot de passe</span>
              </button>
            </form>
          </div>

          {/* Privacy & Consent Settings */}
          <div className="rounded-3xl border border-ink/5 bg-white p-6 shadow-soft md:p-8 space-y-6 animate-in slide-in-from-bottom-4 duration-700">
            <div>
              <h3 className="font-display text-lg font-bold flex items-center gap-2 mb-2">
                <Shield className="size-5 text-brand" />
                Confidentialité & Consentement
              </h3>
              <p className="text-xs text-ink/50 leading-relaxed">
                Consultez l'historique d'accès à vos données, exportez vos informations ou supprimez définitivement votre compte.
              </p>
            </div>

            {/* Privacy Dashboard from Wireframe 1n */}
            <div className="space-y-3">
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-ink/40">Vos données en un coup d'œil</p>
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-2xl border border-ink/5 bg-surface/50 p-4 text-center">
                  <p className="text-2xl font-black text-ink">{mentorCount}</p>
                  <p className="mt-1 text-[9px] font-bold text-ink/50 uppercase leading-snug">Mentors connectés</p>
                </div>
                <div className="rounded-2xl border border-ink/5 bg-surface/50 p-4 text-center">
                  <p className="text-2xl font-black text-brand">{artifactsCount}</p>
                  <p className="mt-1 text-[9px] font-bold text-ink/50 uppercase leading-snug">Réalisations privées</p>
                </div>
                <div className="rounded-2xl border border-ink/5 bg-surface/50 p-4 text-center">
                  <p className="text-2xl font-black text-emerald-600">Actif</p>
                  <p className="mt-1 text-[9px] font-bold text-ink/50 uppercase leading-snug">Consentement</p>
                </div>
              </div>
            </div>
            
            <ConsentLedger />
            
            <div className="pt-4 border-t border-ink/5 space-y-4">
              <ExportDataButton />
              <DeleteAccountDialog />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
