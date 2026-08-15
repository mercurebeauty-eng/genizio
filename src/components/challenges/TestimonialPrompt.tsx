import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { submitParentTestimonial } from "@/lib/testimonials.functions";
import { Loader2, Star, Check, MessageSquareHeart } from "lucide-react";
import { toast } from "sonner";

// Collecte de témoignages parents DANS l'app (chantier « Preuve sociale réelle »,
// 2026-08-15). Affiché dans l'espace parent après un défi validé : le parent écrit
// son retour en quelques secondes, coche son consentement, et le témoignage devient
// public sur la landing. Jamais de contenu rédigé par l'équipe — uniquement ce que
// les parents donnent réellement, avec leurs métadonnées factuelles (nb d'enfants,
// défis complétés) ajoutées côté serveur.

type TestimonialPromptProps = {
  childId: string;
  childName: string;
  challengeTitle: string;
  /** Ville de l'enfant (pré-remplie, modifiable) — sert de ville du parent. */
  defaultCity?: string | null;
};

const STORAGE_KEY = (childId: string) => `genizio:testimonial:${childId}`;

export function TestimonialPrompt({
  childId,
  childName,
  challengeTitle,
  defaultCity,
}: TestimonialPromptProps) {
  const submitFn = useServerFn(submitParentTestimonial);

  const [open, setOpen] = useState(false);
  const [reviewBody, setReviewBody] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [authorCity, setAuthorCity] = useState(defaultCity ?? "");
  const [headline, setHeadline] = useState("");
  const [rating, setRating] = useState(5);
  const [consent, setConsent] = useState(false);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  // Une seule fois par enfant : une fois soumis (ou décliné), on ne redemande pas.
  const [dismissed, setDismissed] = useState(
    () => typeof window !== "undefined" && localStorage.getItem(STORAGE_KEY(childId)) === "1",
  );

  if (dismissed) return null;

  const handleSubmit = async () => {
    if (!reviewBody.trim() || !authorName.trim() || !consent || saving) return;
    setSaving(true);
    try {
      await submitFn({
        data: {
          childId,
          authorName: authorName.trim(),
          authorCity: authorCity.trim(),
          headline: headline.trim() || `Un retour après le défi « ${challengeTitle} »`,
          reviewBody: reviewBody.trim(),
          rating,
          consentPublish: true,
        },
      });
      setDone(true);
      try {
        localStorage.setItem(STORAGE_KEY(childId), "1");
      } catch {
        /* stockage indisponible — jamais bloquant */
      }
      toast.success("Merci pour votre retour ! Il est maintenant visible sur le site. 💛");
    } catch (err) {
      console.error("TestimonialPrompt:", err);
      toast.error(err instanceof Error ? err.message : "Impossible d'envoyer votre retour.");
    } finally {
      setSaving(false);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(STORAGE_KEY(childId), "1");
    } catch {
      /* jamais bloquant */
    }
  };

  if (done) {
    return (
      <div className="mb-6 rounded-[1rem] border border-leaf/30 bg-leaf-50 p-5">
        <p className="flex items-center gap-2 text-[14px] font-bold text-leaf-dark">
          <Check className="size-4" /> Merci {authorName.trim()} ! Votre témoignage est en ligne sur
          la page d'accueil.
        </p>
        <p className="mt-1 text-[12px] font-semibold text-ink/60">
          Il aidera d'autres familles à faire confiance à Génizio. 🙏
        </p>
      </div>
    );
  }

  return (
    <div className="mb-6 rounded-[1rem] border border-amber-200 bg-amber-50/70 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-amber-500 text-white shadow-sm">
            <MessageSquareHeart className="size-4" />
          </span>
          <div>
            <p className="text-[13px] font-extrabold text-ink">Partagez votre expérience</p>
            <p className="text-[12px] font-semibold text-ink/60">
              Après le défi « {challengeTitle} », qu'est-ce que ça a changé pour {childName} ? Votre
              retour peut aider d'autres familles.
            </p>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="text-[11px] font-bold text-ink/40 hover:text-ink/70 transition-colors cursor-pointer shrink-0"
        >
          Plus tard
        </button>
      </div>

      {open ? (
        <div className="mt-4 space-y-3">
          <textarea
            value={reviewBody}
            onChange={(e) => setReviewBody(e.target.value.slice(0, 1000))}
            rows={3}
            placeholder={`Ex. : « ${childName} ne tenait jamais en place. Depuis les défis Génizio, je vois enfin ce qui l'absorbe vraiment… »`}
            className="w-full rounded-xl border border-border bg-white px-3 py-2.5 text-[13px] outline-none focus:ring-2 focus:ring-amber-400 transition-all resize-none shadow-sm"
          />

          <div className="grid gap-2 sm:grid-cols-2">
            <input
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value.slice(0, 60))}
              placeholder="Votre prénom (ex. Aïcha)"
              className="w-full rounded-xl border border-border bg-white px-3 py-2.5 text-[13px] outline-none focus:ring-2 focus:ring-amber-400 transition-all shadow-sm"
            />
            <input
              value={authorCity}
              onChange={(e) => setAuthorCity(e.target.value.slice(0, 80))}
              placeholder="Votre ville (ex. Abidjan)"
              className="w-full rounded-xl border border-border bg-white px-3 py-2.5 text-[13px] outline-none focus:ring-2 focus:ring-amber-400 transition-all shadow-sm"
            />
          </div>

          <input
            value={headline}
            onChange={(e) => setHeadline(e.target.value.slice(0, 120))}
            placeholder="Titre court (optionnel — ex. « Un vrai changement »)"
            className="w-full rounded-xl border border-border bg-white px-3 py-2.5 text-[13px] outline-none focus:ring-2 focus:ring-amber-400 transition-all shadow-sm"
          />

          <div className="flex items-center gap-1.5">
            <span className="text-[12px] font-bold text-ink/70 mr-1">Votre note :</span>
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setRating(n)}
                aria-label={`${n} étoile${n > 1 ? "s" : ""}`}
                className="cursor-pointer transition-transform hover:scale-110"
              >
                <Star
                  className={`size-5 ${n <= rating ? "fill-amber-500 text-amber-500" : "text-ink/20"}`}
                />
              </button>
            ))}
          </div>

          <label className="flex items-start gap-2 rounded-xl border border-border bg-white p-3 cursor-pointer">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-0.5 size-4 accent-amber-500 cursor-pointer"
            />
            <span className="text-[12px] font-semibold text-ink/70 leading-snug">
              J'accepte que mon retour (prénom + ville uniquement) soit affiché sur le site Génizio
              pour aider d'autres familles.
            </span>
          </label>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSubmit}
              disabled={saving || !reviewBody.trim() || !authorName.trim() || !consent}
              className="inline-flex items-center gap-2 rounded-full bg-amber-500 px-5 py-2.5 text-[13px] font-bold text-white shadow-sm hover:bg-amber-600 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? <Loader2 className="size-4 animate-spin" /> : null}
              Publier mon témoignage
            </button>
            <button
              onClick={() => setOpen(false)}
              className="text-[12px] font-bold text-ink/50 hover:text-ink/80 transition-colors cursor-pointer"
            >
              Annuler
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-ink px-4 py-2 text-[12px] font-bold text-white shadow-sm hover:bg-ink/80 transition-all cursor-pointer"
        >
          Écrire mon témoignage
        </button>
      )}
    </div>
  );
}
