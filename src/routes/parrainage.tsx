import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  Heart,
  Sparkles,
  CheckCircle,
  ArrowRight,
  ShieldCheck,
  Copy,
  Check,
  Award,
  Users,
  CalendarRange,
  Gift,
  Loader2,
} from "lucide-react";
import { initializeSponsorshipPayment } from "@/lib/payments.functions";
import type { SponsorshipToken } from "@/lib/seasons.functions";
import { resolveSponsorshipPrice, STANDARD_PRICE_XOF, formatXofAmount } from "@/lib/pricing";
import { toast } from "sonner";
import { pageMeta } from "@/lib/seo";

export const Route = createFileRoute("/parrainage")({
  head: () =>
    pageMeta({
      title: "Parrainage Diaspora & RSE — Génizio",
      description:
        "Offrez de 1 à 12 mois d'aventure Génizio à un enfant en Côte d'Ivoire, depuis la diaspora ou via le mécénat de votre entreprise (RSE). Les 3 premiers mois sont offerts.",
      path: "/parrainage",
    }),
  component: ParrainagePage,
});

function ParrainagePage() {
  const initSponsorshipFn = useServerFn(initializeSponsorshipPayment);

  const [sponsorName, setSponsorName] = useState("");
  const [sponsorEmail, setSponsorEmail] = useState("");
  const [targetChildName, setTargetChildName] = useState("");
  const [sponsorMessage, setSponsorMessage] = useState("");
  // Décision utilisateur (2026-08-08) : 1 à 12 mois ; les 3 premiers sont OFFERTS, au-delà
  // 15 000 F/mois (resolveSponsorshipPrice). Paiement en ligne Paystack en FCFA (devise de
  // charge du compte) — l'équivalent EUR n'est qu'un repère d'affichage pour la diaspora.
  const [months, setMonths] = useState(3);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdToken, setCreatedToken] = useState<SponsorshipToken | null>(null);
  const [copied, setCopied] = useState(false);

  const pricing = resolveSponsorshipPrice(months, "XOF");
  const isFree = pricing.amountPaid <= 0;
  const eurHint = Math.round(pricing.paidMonths * 22.5); // équivalent EUR repère (15 000 F ≈ 22,50 €)
  const totalLabel = isFree
    ? "Offert — 3 premiers mois"
    : `${formatXofAmount(pricing.amountPaid)} FCFA${eurHint > 0 ? ` (≈ ${eurHint} €)` : ""}`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sponsorName.trim() || !sponsorEmail.trim()) {
      toast.error("Veuillez remplir votre nom et votre adresse email.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await initSponsorshipFn({
        data: {
          sponsorName: sponsorName.trim(),
          sponsorEmail: sponsorEmail.trim(),
          targetChildName: targetChildName.trim() || undefined,
          sponsorMessage: sponsorMessage.trim() || undefined,
          months,
          callbackUrl: `${window.location.origin}/paiement-retour`,
        },
      });

      if (res.token) {
        // 3 premiers mois offerts : le code est actif d'office, aucun paiement.
        setCreatedToken(res.token as SponsorshipToken);
        toast.success("Code de parrainage généré ! Transmettez-le à la famille de l'enfant.");
      } else if (res.authorizationUrl) {
        // Paiement en ligne : Paystack crée le code automatiquement après le règlement,
        // le parrain le retrouve sur la page de retour.
        window.location.href = res.authorizationUrl;
      }
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
          <Link
            to="/"
            className="flex items-center gap-2 font-display text-2xl font-extrabold text-brand"
          >
            <img
              src="/favicon-96x96.png"
              alt="Logo Génizio"
              width="32"
              height="32"
              className="h-8 w-8"
            />
            GÉNIZIO
          </Link>
          <Link
            to="/profiles"
            className="press-brand rounded-full bg-brand px-5 py-2.5 text-xs font-bold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 cursor-pointer"
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
            Financez jusqu'à 12 mois d'apprentissage immersif pour un enfant nommé — les{" "}
            <strong>3 premiers mois sont offerts</strong>. Recevez à la fin le Portfolio d'Impact
            certifié de l'enfant.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-left max-w-2xl mx-auto mb-8">
            <div className="rounded-2xl bg-white p-4 border border-ink/10 shadow-xs flex items-start gap-3">
              <div className="rounded-xl bg-amber-100 p-2 text-amber-800 shrink-0">
                <Gift className="size-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-ink">3 Mois Offerts</h4>
                <p className="text-xs text-ink/60">Puis 15 000 F/mois, 1 à 12 mois au choix</p>
              </div>
            </div>

            <div className="rounded-2xl bg-white p-4 border border-ink/10 shadow-xs flex items-start gap-3">
              <div className="rounded-xl bg-sky-100 p-2 text-sky-800 shrink-0">
                <Award className="size-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-ink">Zero Pay-to-Win</h4>
                <p className="text-xs text-ink/60">
                  Seule l'action réelle de l'enfant donne des XP
                </p>
              </div>
            </div>

            <div className="rounded-2xl bg-white p-4 border border-ink/10 shadow-xs flex items-start gap-3">
              <div className="rounded-xl bg-emerald-100 p-2 text-emerald-800 shrink-0">
                <Users className="size-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-ink">Preuve d'Impact</h4>
                <p className="text-xs text-ink/60">Recevez le Portfolio certifié de l'enfant</p>
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
              Votre parrainage de <strong>{createdToken.months_count ?? 3} mois</strong> est actif.
              Transmettez ce code à la famille de l'enfant : elle l'activera dans Paramètres →
              Abonnement famille.
            </p>

            <div className="mx-auto max-w-md rounded-2xl bg-surface p-6 border border-ink/10 mb-6 relative">
              <span className="text-xs font-bold uppercase tracking-wider text-ink/60 block mb-2">
                Code de Parrainage Unique <span className="text-emerald-600">(actif)</span>
              </span>
              <div className="font-mono text-2xl font-black text-brand tracking-widest selection:bg-brand selection:text-white mb-4 break-all">
                {createdToken.code}
              </div>
              <button
                onClick={copyCode}
                className="press-ink w-full rounded-xl bg-ink px-4 py-3 text-sm font-bold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 flex items-center justify-center gap-2 cursor-pointer"
              >
                {copied ? (
                  <Check className="size-4 text-emerald-400" />
                ) : (
                  <Copy className="size-4" />
                )}
                {copied ? "Code copié !" : "Copier le code"}
              </button>
            </div>

            {createdToken.sponsor_message && (
              <div className="mx-auto max-w-md rounded-xl bg-amber-50 p-4 border border-amber-200 text-left mb-6 text-xs text-amber-950">
                <span className="font-bold block mb-1">💌 Votre message à l'enfant :</span>
                <p className="italic">"{createdToken.sponsor_message}"</p>
              </div>
            )}

            <div className="flex flex-wrap justify-center gap-4">
              <button
                onClick={() => setCreatedToken(null)}
                className="press-white rounded-2xl border border-ink/10 bg-white px-6 py-3 text-sm font-bold text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-glow focus-visible:ring-offset-2 cursor-pointer"
              >
                Parrainer un autre enfant
              </button>
              <Link
                to="/profiles"
                className="press-brand rounded-2xl bg-brand px-6 py-3 text-sm font-bold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-glow focus-visible:ring-offset-2 flex items-center gap-2"
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
                    Durée du parrainage (1 à 12 mois)
                  </label>
                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5 sm:gap-2">
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setMonths(m)}
                        className={`rounded-2xl border px-1.5 sm:px-2 py-2.5 sm:py-3 text-sm font-black transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-glow focus-visible:ring-offset-2 ${
                          months === m
                            ? "press-brand border-brand bg-brand text-white"
                            : "press-white border-ink/10 bg-white text-ink/70"
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                  <p className="mt-2 text-xs text-ink/55">
                    {isFree ? (
                      <>
                        <Gift className="size-3.5 inline-block text-emerald-600 -mt-0.5" />{" "}
                        <strong className="text-emerald-600">3 premiers mois offerts</strong> —{" "}
                        {months} mois, rien à payer
                      </>
                    ) : (
                      <>
                        {pricing.paidMonths} mois × {formatXofAmount(STANDARD_PRICE_XOF)} FCFA/mois
                        ={" "}
                        <strong className="text-brand">
                          {formatXofAmount(pricing.amountPaid)} FCFA
                        </strong>
                        {eurHint > 0 && <> (≈ {eurHint} €)</>}
                      </>
                    )}
                  </p>
                  <p className="mt-1 text-[11px] text-ink/45">
                    Tarif : {formatXofAmount(STANDARD_PRICE_XOF)} FCFA/mois. Paiement sécurisé en ligne
                    via Paystack, le code de parrainage est généré immédiatement.
                  </p>
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
                  Garantie Impact Éducatif : 100 % du parrainage est attribué au parcours de
                  l'enfant. Aucune compétence ni point XP ne s'achète. Seule l'action réelle de
                  l'enfant valorise son passeport.
                </span>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="press-brand w-full rounded-2xl bg-brand px-8 py-4 text-base font-bold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-glow focus-visible:ring-offset-2 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="size-5 animate-spin" />
                    {isFree ? "Génération du code…" : "Redirection vers le paiement…"}
                  </>
                ) : (
                  <>
                    <span>
                      {isFree ? "Générer mon code (Offert)" : `Payer le parrainage (${totalLabel})`}
                    </span>
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
