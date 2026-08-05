import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Heart, Sparkles, CheckCircle, ArrowRight, ShieldCheck, Copy, Check, Award, Users, Phone, CalendarRange } from "lucide-react";
import { createSponsorshipToken, type SponsorshipToken } from "@/lib/seasons.functions";
import { PROMO_PRICE_XOF, PROMO_PRICE_EUR, STANDARD_PRICE_XOF, STANDARD_PRICE_EUR } from "@/lib/pricing";
import { toast } from "sonner";
import { pageMeta } from "@/lib/seo";

export const Route = createFileRoute("/parrainage")({
  head: () =>
    pageMeta({
      title: "Parrainage Diaspora & RSE — Génizio",
      description:
        "Offrez 1 à 6 mois d'aventure Génizio à un enfant en Côte d'Ivoire, depuis la diaspora ou via le mécénat de votre entreprise (RSE), pour révéler ses talents.",
      path: "/parrainage",
    }),
  component: ParrainagePage,
});

function ParrainagePage() {
  const createTokenFn = useServerFn(createSponsorshipToken);

  const [sponsorName, setSponsorName] = useState("");
  const [sponsorEmail, setSponsorEmail] = useState("");
  const [targetChildName, setTargetChildName] = useState("");
  const [sponsorMessage, setSponsorMessage] = useState("");
  const [currency, setCurrency] = useState<"EUR" | "XOF">("EUR");
  // Décision utilisateur (2026-08-05) : le parrain choisit 1 à 6 mois ; le code vaut
  // exactement ces mois d'accès à la rédemption. Prix = barème famille (pricing.ts) :
  // 5 000 F/mois (prix de bienvenue des 3 premiers mois du compte) puis 15 000 F/mois —
  // montant recalculé côté serveur, cette valeur n'est que l'affichage.
  const [months, setMonths] = useState(3);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdToken, setCreatedToken] = useState<SponsorshipToken | null>(null);
  const [copied, setCopied] = useState(false);

  const monthlyPrice = currency === "EUR" ? PROMO_PRICE_EUR : PROMO_PRICE_XOF;
  const standardMonthly = currency === "EUR" ? STANDARD_PRICE_EUR : STANDARD_PRICE_XOF;
  const totalPrice = months * monthlyPrice;
  const priceLabel =
    currency === "EUR" ? `${totalPrice.toLocaleString("fr-FR")} €` : `${totalPrice.toLocaleString("fr-FR")} FCFA`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sponsorName.trim() || !sponsorEmail.trim()) {
      toast.error("Veuillez remplir votre nom et votre adresse email.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await createTokenFn({
        data: {
          sponsorName: sponsorName.trim(),
          sponsorEmail: sponsorEmail.trim(),
          targetChildName: targetChildName.trim() || undefined,
          sponsorMessage: sponsorMessage.trim() || undefined,
          currency,
          months,
        },
      });
      setCreatedToken(res);
      toast.success("Demande de parrainage enregistrée ! Finalisez le paiement via WhatsApp pour l'activer.");
    } catch (err: any) {
      toast.error(err?.message || "Erreur lors de la création du parrainage.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyCode = () => {
    if (!createdToken) return;
    navigator.clipboard.writeText(createdToken.code);
    setCopied(true);
    toast.success("Code de parrainage copié !");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-surface text-ink antialiased">
      {/* Header Navigation */}
      <header className="border-b border-ink/10 bg-white/80 backdrop-blur-md sticky top-0 z-40">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2 font-display text-2xl font-extrabold text-brand">
            <img src="/favicon-96x96.png" alt="" className="h-8 w-8" />
            GÉNIZIO
          </Link>
          <Link
            to="/profiles"
            className="rounded-full bg-brand px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-brand/90 transition-all"
          >
            Accéder à l'Espace Parent →
          </Link>
        </div>
      </header>

      {/* Hero Header */}
      <section className="relative overflow-hidden bg-gradient-to-b from-brand/10 via-surface to-surface py-16 px-6 text-center">
        <div className="mx-auto max-w-3xl">
          <span className="inline-flex items-center gap-2 rounded-full bg-brand/15 px-4 py-1.5 text-xs font-black uppercase tracking-widest text-brand border border-brand/20 mb-6">
            <Heart className="size-4 fill-current" />
            Génizio Parrainage • Diaspora & RSE
          </span>
          <h1 className="font-display text-balance text-4xl sm:text-5xl font-black tracking-tight text-ink mb-4 leading-tight">
            Offrez une <span className="text-brand">Saison d'Élite</span> à un enfant au pays
          </h1>
          <p className="text-lg text-ink/75 font-medium leading-relaxed max-w-2xl mx-auto mb-8">
            Financez 3 mois d'apprentissage immersif par la pratique pour un enfant nommé. À la fin de la saison, recevez son **Portfolio d'Impact** certifié.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-left max-w-2xl mx-auto mb-8">
            <div className="rounded-2xl bg-white p-4 border border-ink/10 shadow-xs flex items-start gap-3">
              <div className="rounded-xl bg-amber-100 p-2 text-amber-800 shrink-0">
                <CalendarRange className="size-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-ink">1 à 6 Mois au choix</h4>
                <p className="text-xs text-ink/60">Défis d'élite, devoirs et suivi ZPA</p>
              </div>
            </div>

            <div className="rounded-2xl bg-white p-4 border border-ink/10 shadow-xs flex items-start gap-3">
              <div className="rounded-xl bg-sky-100 p-2 text-sky-800 shrink-0">
                <Award className="size-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-ink">Zero Pay-to-Win</h4>
                <p className="text-xs text-ink/60">Seule l'action réelle de l'enfant donne des XP</p>
              </div>
            </div>

            <div className="rounded-2xl bg-white p-4 border border-ink/10 shadow-xs flex items-start gap-3">
              <div className="rounded-xl bg-emerald-100 p-2 text-emerald-800 shrink-0">
                <Users className="size-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-ink">Preuve d'Impact</h4>
                <p className="text-xs text-ink/60">Recevez le passeport certifié du fioul</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <main className="mx-auto max-w-4xl px-6 pb-24">
        {createdToken ? (
          <div className="rounded-3xl border-2 border-brand bg-white p-8 shadow-xl text-center animate-in fade-in zoom-in duration-300">
            <div className="mx-auto mb-4 grid size-16 place-items-center rounded-full bg-emerald-100 text-emerald-600">
              <CheckCircle className="size-10" />
            </div>
            <h2 className="font-display text-3xl font-black text-ink mb-2">
              Merci pour votre générosité, {createdToken.sponsor_name} ! 🎉
            </h2>
            <p className="text-ink/70 font-medium mb-6 max-w-md mx-auto">
              Votre demande de parrainage de <strong>{createdToken.months_count ?? 3} mois</strong> est enregistrée. Finalisez le paiement ({priceLabel}) via WhatsApp pour l'activer — le code ci-dessous ne sera utilisable qu'une fois le paiement confirmé par notre équipe.
            </p>

            <div className="mx-auto max-w-md rounded-2xl bg-surface p-6 border border-ink/10 mb-6 relative">
              <span className="text-xs font-bold uppercase tracking-wider text-ink/60 block mb-2">
                Code de Parrainage Unique <span className="text-amber-600">(en attente de paiement)</span>
              </span>
              <div className="font-mono text-2xl font-black text-brand tracking-widest selection:bg-brand selection:text-white mb-4">
                {createdToken.code}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <a
                  href={`https://wa.me/${import.meta.env.VITE_WHATSAPP_NUMBER || "33606433148"}?text=${encodeURIComponent(
                    `Bonjour, je viens de faire une demande de parrainage Génizio (code ${createdToken.code}, ${createdToken.months_count ?? 3} mois, ${priceLabel}). Je souhaite finaliser le paiement.`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full rounded-xl bg-[#25D366] px-4 py-3 text-sm font-bold text-white shadow-md hover:brightness-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Phone className="size-4 fill-current" />
                  Payer via WhatsApp
                </a>
                <button
                  onClick={copyCode}
                  className="w-full rounded-xl bg-ink px-4 py-3 text-sm font-bold text-white shadow-md hover:bg-ink/90 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {copied ? <Check className="size-4 text-emerald-400" /> : <Copy className="size-4" />}
                  {copied ? "Code copié !" : "Copier le code"}
                </button>
              </div>
            </div>

            {createdToken.sponsor_message && (
              <div className="mx-auto max-w-md rounded-xl bg-amber-50 p-4 border border-amber-200 text-left mb-6 text-xs text-amber-950">
                <span className="font-bold block mb-1">💌 Votre message au fioul :</span>
                <p className="italic">"{createdToken.sponsor_message}"</p>
              </div>
            )}

            <div className="flex flex-wrap justify-center gap-4">
              <button
                onClick={() => setCreatedToken(null)}
                className="rounded-2xl border border-ink/10 bg-surface px-6 py-3 text-sm font-bold text-ink hover:bg-white transition-all cursor-pointer"
              >
                Parrainer un autre enfant
              </button>
              <Link
                to="/profiles"
                className="rounded-2xl bg-brand px-6 py-3 text-sm font-bold text-white shadow-lg hover:bg-brand/90 transition-all flex items-center gap-2"
              >
                Accéder aux Profils →
              </Link>
            </div>
          </div>
        ) : (
          <div className="rounded-3xl border border-ink/10 bg-white p-8 shadow-xl">
            <h2 className="font-display text-2xl font-bold text-ink mb-6 flex items-center gap-2">
              <Sparkles className="size-6 text-brand" />
              Formulaire de Parrainage
            </h2>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-ink mb-2">
                    Votre Nom / Entreprise *
                  </label>
                  <input
                    type="text"
                    required
                    value={sponsorName}
                    onChange={(e) => setSponsorName(e.target.value)}
                    placeholder="Ex: Oncle Marc / Cabinet RSE"
                    className="w-full rounded-2xl border border-ink/10 bg-surface px-4 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-brand"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-ink mb-2">
                    Votre Email (Pour recevoir le Portfolio) *
                  </label>
                  <input
                    type="email"
                    required
                    value={sponsorEmail}
                    onChange={(e) => setSponsorEmail(e.target.value)}
                    placeholder="ex: marc@diaspora.org"
                    className="w-full rounded-2xl border border-ink/10 bg-surface px-4 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-brand"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-ink mb-2">
                    Prénom du Filleul / Enfant (Optionnel)
                  </label>
                  <input
                    type="text"
                    value={targetChildName}
                    onChange={(e) => setTargetChildName(e.target.value)}
                    placeholder="Ex: Mohleven / Kadi"
                    className="w-full rounded-2xl border border-ink/10 bg-surface px-4 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-brand"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-ink mb-2">
                    Durée du parrainage
                  </label>
                  <div className="grid grid-cols-6 gap-2">
                    {[1, 2, 3, 4, 5, 6].map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setMonths(m)}
                        className={`rounded-2xl border px-2 py-3 text-sm font-black transition-all cursor-pointer ${
                          months === m ? "border-brand bg-brand text-white shadow-xs" : "border-ink/10 bg-surface text-ink/70"
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                  <p className="mt-2 text-xs text-ink/55">
                    {months} mois × {currency === "EUR" ? `${monthlyPrice.toLocaleString("fr-FR")} €` : `${monthlyPrice.toLocaleString("fr-FR")} FCFA`}/mois ={" "}
                    <strong className="text-brand">{priceLabel}</strong>
                  </p>
                  <p className="mt-1 text-[11px] text-ink/45">
                    Prix de bienvenue : {currency === "EUR" ? `${monthlyPrice.toLocaleString("fr-FR")} €` : `${monthlyPrice.toLocaleString("fr-FR")} FCFA`}/mois les 3
                    premiers mois du compte, puis {currency === "EUR" ? `${standardMonthly.toLocaleString("fr-FR")} €` : `${standardMonthly.toLocaleString("fr-FR")} FCFA`}/mois.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-ink mb-2">
                    Devise de paiement
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setCurrency("EUR")}
                      className={`rounded-2xl border px-4 py-3 text-xs font-bold transition-all cursor-pointer ${
                        currency === "EUR" ? "border-brand bg-brand-50 text-brand shadow-xs" : "border-ink/10 bg-surface text-ink/65"
                      }`}
                    >
                      {PROMO_PRICE_EUR.toLocaleString("fr-FR")} € / mois (Diaspora)
                    </button>
                    <button
                      type="button"
                      onClick={() => setCurrency("XOF")}
                      className={`rounded-2xl border px-4 py-3 text-xs font-bold transition-all cursor-pointer ${
                        currency === "XOF" ? "border-brand bg-brand-50 text-brand shadow-xs" : "border-ink/10 bg-surface text-ink/65"
                      }`}
                    >
                      {PROMO_PRICE_XOF.toLocaleString("fr-FR")} FCFA / mois (Local)
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-ink mb-2">
                  Message d'encouragement pour l'enfant (Optionnel)
                </label>
                <textarea
                  rows={3}
                  value={sponsorMessage}
                  onChange={(e) => setSponsorMessage(e.target.value)}
                  placeholder="Ex: Bravo Mohleven ! Donne le meilleur de toi-même durant cette saison !"
                  className="w-full rounded-2xl border border-ink/10 bg-surface px-4 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-brand resize-none"
                />
              </div>

              <div className="rounded-2xl bg-amber-50 p-4 border border-amber-200 text-xs text-amber-950 flex items-center gap-3">
                <ShieldCheck className="size-5 shrink-0 text-amber-600" />
                <span>
                  **Garantie Impact Éducatif** : 100 % du parrainage est attribué au parcours de l'enfant. Aucune compétence ni point XP ne s'achète. Seule l'action réelle de l'enfant valorise son passeport.
                </span>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-2xl bg-brand px-6 py-4 text-base font-black text-white shadow-xl hover:bg-brand/90 transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
              >
                {isSubmitting ? (
                  "Génération du code..."
                ) : (
                  <>
                    <span>Valider le Parrainage ({priceLabel})</span>
                    <ArrowRight className="size-5" />
                  </>
                )}
              </button>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}
