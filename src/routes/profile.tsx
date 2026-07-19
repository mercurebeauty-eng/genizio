import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-session";
import { AppHeader } from "@/components/AppHeader";
import { toast } from "sonner";
import { User, Phone, ArrowLeft, Check, Loader2, Users, Calendar, Shield } from "lucide-react";
import { ConsentLedger } from "@/components/settings/ConsentLedger";
import { ExportDataButton } from "@/components/settings/ExportDataButton";
import { DeleteAccountDialog } from "@/components/settings/DeleteAccountDialog";
import { COUNTRIES } from "@/lib/countries";
import { GenizioLoader } from "@/components/GenizioLoader";

export const Route = createFileRoute("/profile")({
  component: ProfilePage,
});

function ProfilePage() {
  const { session, loading } = useSession();
  const navigate = useNavigate();

  const [phoneNumber, setPhoneNumber] = useState("");
  const [selectedCountry, setSelectedCountry] = useState(COUNTRIES[0]);
  const [savingPhone, setSavingPhone] = useState(false);

  // Parent Stats
  const [childCount, setChildCount] = useState(0);
  const [challengeStats, setChallengeStats] = useState({ total: 0, completed: 0 });
  const [mentorCount, setMentorCount] = useState(0);
  const [artifactsCount, setArtifactsCount] = useState(0);
  const [consentEventsCount, setConsentEventsCount] = useState(0);

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
      supabase.from("child_profiles").select("id", { count: "exact" }).eq("user_id", session.user.id).then(({ count }) => {
        setChildCount(count || 0);
      });
      supabase.from("child_mentors").select("id", { count: "exact" }).then(({ count }) => {
        setMentorCount(count || 0);
      });
      supabase.from("consent_events").select("id", { count: "exact" }).then(({ count }) => {
        setConsentEventsCount(count || 0);
      });
      supabase.from("challenges").select("status, proof_image_url").eq("user_id", session.user.id).then(({ data }) => {
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

  if (loading || !session) {
    return (
      <div className="grid min-h-screen place-items-center bg-surface">
        <GenizioLoader label="Chargement…" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-surface via-surface to-brand/5 p-6 font-sans text-ink">
      <AppHeader />

      <div className="pt-6"></div>

      <div className="mx-auto max-w-4xl grid gap-8 md:grid-cols-3">
        {/* Left Column: Summary Card */}
        <div className="md:col-span-1 space-y-6">
          <div className="rounded-3xl border-[3px] border-ink bg-white p-6 shadow-brutal text-center">
            <div className="mx-auto grid size-16 place-items-center rounded-2xl border-2 border-ink bg-brand/10 text-brand text-2xl font-bold">
              <User className="size-8" />
            </div>
            <h2 className="mt-4 font-display text-xl font-bold truncate">
              {session.user.user_metadata?.full_name || session.user.user_metadata?.name || session.user.email}
            </h2>
            <p className="text-xs text-ink/60 font-semibold mt-1">Compte Parent</p>
            <div className="mt-6 border-t border-ink/5 pt-6 text-left space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-ink/60 flex items-center gap-2">
                  <Users className="size-4 text-brand" /> Enfants
                </span>
                <span className="font-bold">{childCount}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-ink/60 flex items-center gap-2">
                  <Check className="size-4 text-emerald-600" /> Défis complétés
                </span>
                <span className="font-bold text-emerald-600">{challengeStats.completed} / {challengeStats.total}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-ink/60 flex items-center gap-2">
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
          <div className="rounded-3xl border-[3px] border-ink bg-white p-6 shadow-brutal md:p-8">
            <h3 className="font-display text-lg font-bold flex items-center gap-2 mb-2">
              <Phone className="size-5 text-brand" />
              Numéro de téléphone
            </h3>
            <p className="text-xs text-ink/60 leading-relaxed mb-6">
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
                  className="rounded-xl border-[3px] border-ink bg-white px-3 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-brand cursor-pointer shadow-brutal-sm"
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
                    className="w-full rounded-xl border-[3px] border-ink px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-brand shadow-brutal-sm"
                    required
                  />
                </div>
              </div>
              <div className="flex items-center justify-between text-xs text-ink/60 font-medium">
                <span>Pays actuel : {selectedCountry.name}</span>
                <span>{phoneNumber.length} / {selectedCountry.limit} chiffres</span>
              </div>
              <button
                type="submit"
                disabled={savingPhone || !phoneNumber}
                className="rounded-xl border-[3px] border-ink bg-brand px-6 py-2.5 text-sm font-bold text-white shadow-brutal hover:-translate-y-0.5 active:translate-y-0 active:shadow-none transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {savingPhone ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                <span>Enregistrer le numéro</span>
              </button>
            </form>
          </div>

          {/* Privacy & Consent Settings */}
          <div className="rounded-3xl border-[3px] border-ink bg-white p-6 shadow-brutal md:p-8 space-y-6 animate-in slide-in-from-bottom-4 duration-700">
            <div>
              <h3 className="font-display text-lg font-bold flex items-center gap-2 mb-2">
                <Shield className="size-5 text-brand" />
                Confidentialité & Consentement
              </h3>
              <p className="text-xs text-ink/60 leading-relaxed">
                Consultez l'historique d'accès à vos données, exportez vos informations ou supprimez définitivement votre compte.
              </p>
            </div>

            {/* Privacy Dashboard from Wireframe 1n */}
            <div className="space-y-3">
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-ink/60">Vos données en un coup d'œil</p>
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-2xl border-2 border-ink bg-surface p-4 text-center">
                  <p className="text-2xl font-black text-ink">{mentorCount}</p>
                  <p className="mt-1 text-[9px] font-bold text-ink/60 uppercase leading-snug">Mentors connectés</p>
                </div>
                <div className="rounded-2xl border-2 border-ink bg-surface p-4 text-center">
                  <p className="text-2xl font-black text-brand">{artifactsCount}</p>
                  <p className="mt-1 text-[9px] font-bold text-ink/60 uppercase leading-snug">Réalisations privées</p>
                </div>
                <div className="rounded-2xl border-2 border-ink bg-surface p-4 text-center">
                  <p className="text-2xl font-black text-emerald-600">{consentEventsCount}</p>
                  <p className="mt-1 text-[9px] font-bold text-ink/60 uppercase leading-snug">Événements enregistrés</p>
                </div>
              </div>
            </div>
            
            <ConsentLedger />
            
            <div className="pt-4 border-t-[3px] border-ink space-y-4">
              <ExportDataButton />
              <DeleteAccountDialog />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
