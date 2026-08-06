import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-session";
import { getChildAISynthesis, getPassportLetter, BADGE_CATALOG } from "@/lib/challenges.functions";
import { getChildGuild, getTalentAffinities } from "@/lib/guilds";
import { TalentRadarChart } from "@/components/TalentRadarChart";
import { MarkdownContent } from "@/components/ui/markdown-content";
import { pdf } from "@react-pdf/renderer";
import { PassportPdf } from "@/components/passport/PassportPdf";
import { passportFileName } from "@/lib/passport-pdf";
import { toast } from "sonner";
import {
  Award,
  BrainCircuit,
  BookOpen,
  ShieldCheck,
  Printer,
  CheckCircle,
  ChevronLeft,
  Zap,
  MapPin,
  Compass,
  Target,
  Medal,
  Rocket,
  Download,
} from "lucide-react";
import { GenizioLoader } from "@/components/GenizioLoader";
import { TALENT_KEY_LABELS } from "@/lib/talent-buckets";
import { normalizeChildInterests } from "@/lib/interest-migration";

function getTalentCardInfo(age: number, score: number) {
  let typeLabel = "Carte Éveil";
  let tagClass = "bg-emerald-100 text-emerald-800 border-emerald-400";

  if (age >= 12) {
    typeLabel = "Carte Maîtrise";
    tagClass = "bg-amber-100 text-amber-800 border-amber-400";
  } else if (age >= 7) {
    typeLabel = "Carte Exploration";
    tagClass = "bg-sky-100 text-sky-800 border-sky-400";
  }

  let level = 1;
  let levelLabel = "Niveau I";
  if (score >= 70) {
    level = 3;
    levelLabel = "Niveau III";
  } else if (score >= 40) {
    level = 2;
    levelLabel = "Niveau II";
  }

  return {
    typeLabel,
    tagClass,
    level,
    levelLabel,
  };
}

export const Route = createFileRoute("/profiles/$profileId/passport-print")({
  component: PassportPrintPage,
});

type Child = {
  id: string;
  name: string;
  age: number;
  talents: Record<string, number>;
  interests: string[];
  city: string | null;
  country: string | null;
  xp: number | null;
  pdf_unlocked: boolean;
};

type Challenge = {
  id: string;
  title: string;
  domain: string;
  status: "todo" | "in_progress" | "completed";
  completed_at: string | null;
  proof_image_url: string | null;
  description: string;
  ai_observations: string | null;
  notes: string | null;
  difficulty: string | null;
};

function PassportPrintPage() {
  const { profileId } = Route.useParams();
  const { session, loading } = useSession();
  const navigate = useNavigate();

  const [child, setChild] = useState<Child | null>(null);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [earnedBadges, setEarnedBadges] = useState<string[]>([]);
  const [fetching, setFetching] = useState(true);
  const [synthesis, setSynthesis] = useState("");
  const [fetchingSynthesis, setFetchingSynthesis] = useState(false);
  const [letter, setLetter] = useState("");
  const [fetchingLetter, setFetchingLetter] = useState(false);
  const [downloading, setDownloading] = useState(false);
  // Préparation de l'impression : le dialogue ne doit s'ouvrir qu'une fois par chargement de
  // page, que ce soit via le déclenchement automatique ou le bouton manuel.
  const [preparingPrint, setPreparingPrint] = useState(false);
  const printFiredRef = useRef(false);

  const fetchSynthesis = useServerFn(getChildAISynthesis);
  const fetchLetter = useServerFn(getPassportLetter);

  useEffect(() => {
    if (!loading && !session) navigate({ to: "/auth", replace: true });
  }, [session, loading, navigate]);

  useEffect(() => {
    if (!session) return;
    setFetching(true);
    Promise.all([
      supabase
        .from("child_profiles")
        .select("id, name, age, talents, interests, city, country, xp, pdf_unlocked")
        .eq("id", profileId)
        .eq("user_id", session!.user.id)
        .maybeSingle(),
      supabase
        .from("challenges")
        .select(
          "id, title, domain, status, completed_at, proof_image_url, description, ai_observations, notes, difficulty",
        )
        .eq("child_id", profileId)
        .eq("status", "completed")
        .order("completed_at", { ascending: false }),
      supabase
        .from("child_badges")
        .select("badge_slug")
        .eq("child_id", profileId)
        .order("earned_at", { ascending: true }),
    ]).then(([c, ch, b]) => {
      setChild((c.data as Child) ?? null);
      setChallenges((ch.data ?? []) as Challenge[]);
      setEarnedBadges((b.data ?? []).map((row) => row.badge_slug));
      setFetching(false);
    });
  }, [session, profileId]);

  useEffect(() => {
    if (!session) return;
    setFetchingSynthesis(true);
    fetchSynthesis({ data: { childId: profileId } })
      .then((resp) => setSynthesis(resp || ""))
      .catch((err) => {
        console.error("Erreur récupération synthèse passeport:", err);
        setSynthesis("");
      })
      .finally(() => setFetchingSynthesis(false));
  }, [session, profileId]);

  // Lettre d'orientation IA — uniquement pour un Passeport déjà débloqué (gate
  // côté serveur aussi, cf. getPassportLetter) : pas d'appel avant que le
  // parent ait payé/activé le document.
  useEffect(() => {
    if (!session || !child?.pdf_unlocked) return;
    setFetchingLetter(true);
    fetchLetter({ data: { childId: profileId } })
      .then((resp) => setLetter(resp || ""))
      .catch((err) => {
        console.error("Erreur récupération lettre passeport:", err);
        setLetter("");
      })
      .finally(() => setFetchingLetter(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, profileId, child?.pdf_unlocked]);

  // Téléchargement natif : le Passeport est généré en vrai PDF vectoriel A4 par
  // @react-pdf/renderer (texte réel, pas un scan navigateur), puis téléchargé
  // directement — même rendu sur mobile et desktop. Les photos de preuve sont
  // converties en data-URL d'abord pour éviter tout souci CORS au moteur PDF.
  const handleDownloadPdf = async () => {
    if (!child) return;
    setDownloading(true);
    try {
      const proofImages: Record<string, string> = {};
      await Promise.all(
        challenges.map(async (c) => {
          if (!c.proof_image_url) return;
          try {
            const res = await fetch(c.proof_image_url);
            if (!res.ok) return;
            const blob = await res.blob();
            proofImages[c.id] = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result as string);
              reader.onerror = reject;
              reader.readAsDataURL(blob);
            });
          } catch {
            // Une photo illisible ne bloque pas le téléchargement du document.
          }
        }),
      );

      const blob = await pdf(
        <PassportPdf
          data={{
            child,
            challenges,
            earnedBadges,
            synthesis,
            letter,
            proofImages,
          }}
        />,
      ).toBlob();

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = passportFileName(child.name);
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success(`Passeport d'Excellence téléchargé pour ${child.name}.`);
    } catch (err) {
      console.error("Erreur génération du PDF:", err);
      toast.error("Impossible de générer le PDF. Réessayez dans un instant.");
    } finally {
      setDownloading(false);
    }
  };

  // Ouverture automatique du dialogue d'impression (secours navigateur) une fois le
  // document réellement prêt : polices chargées (document.fonts.ready) et photos de preuve
  // décodées (img.decode()). Un timer fixe de 1,5 s sortait des PDF aux cadres photo vides
  // sur les appareils Android d'entrée de gamme (images Storage encore en cours de
  // chargement), et l'ancienne condition (challenges.length > 0 && synthesis) empêchait
  // l'ouverture pour un Passeport sans défi terminé alors que l'UI l'annonçait. Filet de
  // sécurité : 8 s max avant ouverture.
  useEffect(() => {
    if (
      !child?.pdf_unlocked ||
      fetching ||
      fetchingSynthesis ||
      fetchingLetter ||
      printFiredRef.current
    ) {
      return;
    }
    setPreparingPrint(true);

    let cancelled = false;
    const fire = () => {
      if (cancelled || printFiredRef.current) return;
      printFiredRef.current = true;
      window.print();
      setPreparingPrint(false);
    };

    const waitForReadiness = async () => {
      try {
        await Promise.race([
          (async () => {
            await document.fonts.ready;
            await Promise.all(
              Array.from(document.images).map((img) => img.decode().catch(() => undefined)),
            );
          })(),
          new Promise((resolve) => setTimeout(resolve, 8000)),
        ]);
      } catch {
        // Fontes ou images non décodables : on imprime quand même plutôt que de bloquer.
      }
      if (!cancelled) fire();
    };

    void waitForReadiness();
    return () => {
      cancelled = true;
    };
  }, [child, fetching, fetchingSynthesis, fetchingLetter]);

  if (loading || !session || fetching) {
    return (
      <div className="grid min-h-dvh place-items-center bg-stone-50">
        <GenizioLoader label="Préparation du Passeport d'Excellence…" />
      </div>
    );
  }

  if (!child) {
    return (
      <div className="grid min-h-dvh place-items-center bg-stone-50 text-ink">
        <div className="text-center p-6 border-2 border-ink bg-white rounded-3xl max-w-sm">
          <p className="font-bold text-red-500 mb-2">Accès refusé ou profil introuvable.</p>
          <p className="text-xs text-ink/60 mb-4">
            Ce document est sécurisé et réservé au compte parent propriétaire.
          </p>
          <Link to="/profiles" className="text-xs font-bold text-brand hover:underline">
            Retour
          </Link>
        </div>
      </div>
    );
  }

  const isUnlocked = child.pdf_unlocked === true;
  if (!isUnlocked) {
    return (
      <div className="grid min-h-dvh place-items-center bg-stone-50 text-ink">
        <div className="text-center p-8 border border-ink/10 bg-white rounded-3xl max-w-md shadow-xl">
          <h2 className="font-display text-balance text-xl font-black text-brand mb-2">
            Passeport d'Excellence Verrouillé
          </h2>
          <p className="text-sm font-semibold text-ink/75 leading-relaxed mb-6">
            Le Passeport d'Excellence pour {child.name} n'a pas encore été débloqué par
            l'administration. Veuillez procéder à son activation ou contacter le support.
          </p>
          <Link
            to="/profiles/$profileId/portfolio"
            params={{ profileId: child.id }}
            className="press-brand rounded-xl bg-brand px-5 py-2 text-xs font-bold text-white cursor-pointer"
          >
            Retour au Portfolio
          </Link>
        </div>
      </div>
    );
  }

  const guild = getChildGuild(child.talents);
  const totalXP = child.xp || 0;
  const level = Math.floor(totalXP / 500) + 1;

  const hasSynthesis = Boolean(synthesis);
  const challengePagesCount = challenges.length > 0 ? Math.ceil(challenges.length / 2) : 0;
  const totalPages = 2 + (hasSynthesis ? 1 : 0) + challengePagesCount;
  // Jamais de ville/pays par défaut : un enfant sans localisation renseignée ne doit
  // pas se voir attribuer une ville qui n'est pas la sienne sur un document destiné à
  // représenter sa famille auprès de tiers.
  const locationStr = [child.city, child.country].filter(Boolean).join(", ");

  // Top domains based on completed challenges
  const domainCounts: Record<string, number> = {};
  for (const c of challenges) {
    domainCounts[c.domain] = (domainCounts[c.domain] ?? 0) + 1;
  }
  const topDomains = Object.entries(domainCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  return (
    <div className="min-h-dvh bg-stone-100 py-10 print:py-0 print:bg-white text-ink">
      {/* Print Controls / Alert for Screen View */}
      <div className="w-full mx-auto mb-8 px-6 py-4 bg-white border border-ink/10 rounded-2xl flex flex-wrap items-center justify-between gap-4 shadow-md print:hidden max-w-full lg:max-w-[21cm]">
        <div className="flex items-center gap-3">
          <Link
            to="/profiles/$profileId/portfolio"
            params={{ profileId: child.id }}
            className="rounded-xl border border-ink/10 p-2 hover:bg-stone-100 transition-all"
          >
            <ChevronLeft className="size-4" />
          </Link>
          <div>
            <h1 className="font-bold text-sm">Passeport d'Excellence • {child.name}</h1>
            <p className="text-xs text-ink/60 font-semibold">
              {preparingPrint
                ? "Préparation du document (photos, polices)…"
                : "Le document se télécharge en PDF A4, directement depuis votre appareil."}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleDownloadPdf}
            disabled={downloading}
            className="press-brand inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2 text-xs font-bold text-white cursor-pointer disabled:opacity-60"
          >
            <Download className="size-4" />
            {downloading ? "Génération…" : "Télécharger le PDF"}
          </button>
          <button
            onClick={() => {
              printFiredRef.current = true;
              setPreparingPrint(false);
              window.print();
            }}
            className="hidden sm:inline-flex items-center gap-2 rounded-xl border border-ink/10 px-4 py-2 text-xs font-bold text-ink/70 hover:bg-stone-100 transition-all cursor-pointer"
            aria-label="Imprimer (secours)"
          >
            <Printer className="size-4" />
            Imprimer
          </button>
        </div>
      </div>

      {/* 📄 PDF CONTENT PAGE CONTAINER
          En vue écran : plein largeur (aucun débordement horizontal sur mobile).
          Les dimensions A4 (21 cm / 29,7 cm, marges 1,5 cm) ne s'appliquent que
          sous @media print — l'export PDF professionnel passe par @react-pdf. */}
      <div className="passport-document w-full mx-auto bg-white border border-ink/10 print:border-0 shadow-2xl print:shadow-none px-4 py-8 sm:px-8 print:p-[1.5cm] min-h-dvh print:min-h-[29.7cm] flex flex-col print:justify-between relative overflow-hidden max-w-full lg:max-w-[21cm] print:max-w-[21cm]">
        {/* Style block for print-specific tweaks */}
        <style
          dangerouslySetInnerHTML={{
            __html: `
          @media print {
            body {
              background-color: white !important;
              color: black !important;
            }
            /* Immunité contre la règle d'isolation d'impression globale de styles.css
               (body:has(.print-report) * { visibility: hidden }) : le Passeport n'utilise
               pas .print-report, mais on rétablit explicitement la visibilité pour ne
               plus jamais dépendre de cette règle (cf. audit 2026-08-05, PDF blanc). */
            .passport-document, .passport-document * { visibility: visible; }
            .page-break {
              page-break-before: always;
              break-before: page;
            }
            img {
              max-height: 12cm !important;
              page-break-inside: avoid;
            }
            .no-print-break {
              page-break-inside: avoid;
              break-inside: avoid;
            }
          }
          @page {
            size: A4 portrait;
            margin: 1.5cm;
          }
        `,
          }}
        />

        {/* ── PAGE 1: COVER ── */}
        <div className="flex-1 flex flex-col justify-between min-h-[26cm]">
          {/* Header Cover */}
          <div className="flex justify-between items-center border-b-[3px] border-ink pb-6">
            <div className="flex items-center gap-2 font-display text-balance text-xl font-black text-brand">
              <img src="/favicon-96x96.png" alt="" className="size-8" />
              <span>GÉNIZIO</span>
            </div>
            <span className="rounded-full border-2 border-ink bg-stone-50 px-3 py-1 text-[10px] font-black uppercase tracking-wider">
              Dossier de Valorisation Génizio
            </span>
          </div>

          {/* Title block Cover */}
          <div className="my-auto py-10 text-center space-y-5">
            <div className="inline-flex items-center justify-center size-20 rounded-3xl bg-brand/10 border border-ink/10 text-brand shadow-lg mb-2">
              <Award className="size-10" />
            </div>
            <h1 className="font-display text-balance text-4xl md:text-5xl font-black uppercase tracking-tight text-ink">
              Passeport d'Excellence
            </h1>
            <p className="text-xs font-bold text-ink/60 uppercase tracking-widest max-w-md mx-auto leading-relaxed border-t-2 border-b-2 border-ink py-2">
              Dossier de valorisation des talents, compétences et moteurs d'engagement
            </p>

            <div className="pt-6 space-y-3">
              <p className="text-3xl font-display text-balance font-extrabold text-brand">
                {child.name}
              </p>
              <div className="flex items-center justify-center gap-3 text-xs font-bold text-ink/75 flex-wrap">
                <span>Âge : {child.age} ans</span>
                {locationStr && (
                  <>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <MapPin className="size-3 text-brand" /> {locationStr}
                    </span>
                  </>
                )}
              </div>

              {/* Guilde & XP badge */}
              <div className="inline-flex items-center gap-2.5 rounded-2xl border-2 border-ink/15 bg-surface px-4 py-2 mt-2 shadow-sm">
                <span className="text-2xl">{guild.emoji}</span>
                <div className="text-left">
                  <p className="text-xs font-extrabold text-ink">{guild.name}</p>
                  <p className="text-[10px] font-bold text-brand flex items-center gap-1">
                    <Zap className="size-3" /> Niveau {level} · {totalXP} XP cumulés
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Cover */}
          <div className="border-t-[3px] border-ink pt-6 flex justify-between items-end">
            <div className="space-y-1">
              <p className="text-[10px] font-black text-ink/60 uppercase tracking-wider">
                Délivré par
              </p>
              <p className="text-xs font-bold text-ink/80">
                Laboratoire d'Innovation Pédagogique Génizio
              </p>
              <p className="text-[10px] font-medium text-ink/60">Dakar · Abidjan · Yaoundé</p>
            </div>

            <div className="flex items-center gap-2 border border-emerald-300 bg-emerald-50 text-emerald-800 rounded-xl px-3 py-2 text-xs font-bold shadow-sm">
              <ShieldCheck className="size-4 shrink-0 text-emerald-600" />
              <div>
                <p className="text-[8px] font-black uppercase tracking-wider leading-none">
                  Généré par l'IA Naya
                </p>
                <p className="text-[10px] leading-tight mt-0.5 font-bold">
                  Référence : {child.id.slice(0, 8).toUpperCase()}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ── PAGE 2: TALENT MAP & BEHAVIORAL DRIVERS ── */}
        <div className="page-break flex-1 flex flex-col justify-between min-h-[26cm] pt-8">
          <div>
            <div className="border-b-[3px] border-ink pb-4 mb-6">
              <h2 className="font-display text-balance text-xl font-black text-ink uppercase tracking-tight flex items-center gap-2">
                <BrainCircuit className="size-5 text-brand" />
                I. Cartographie des intelligences & leviers d'action
              </h2>
            </div>

            <div className="grid grid-cols-1 gap-6 items-center">
              {/* Radar chart */}
              <div className="border border-ink/10 rounded-3xl p-4 bg-white shadow-md flex flex-col items-center">
                <h3 className="text-xs font-black uppercase tracking-wider text-ink/60 mb-2 self-start">
                  Radar des 9 Intelligences (Howard Gardner)
                </h3>
                <TalentRadarChart
                  talents={child.talents}
                  name={child.name}
                  className="h-60 w-full"
                  age={child.age}
                />
              </div>

              {/* Forces majeures */}
              <div className="space-y-3">
                <h3 className="text-xs font-black uppercase tracking-wider text-ink/60 border-b border-ink/10 pb-1">
                  Forces dominantes identifiées
                </h3>
                <ul className="grid grid-cols-2 gap-2">
                  {Object.entries(child.talents || {})
                    .filter(([_, val]) => val > 0)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 4)
                    .map(([key, val]) => {
                      const label = TALENT_KEY_LABELS[key] || key;
                      const card = getTalentCardInfo(child.age, val);

                      return (
                        <li
                          key={key}
                          className="flex flex-col justify-between rounded-xl border border-ink/10 bg-stone-50 p-2.5 text-xs font-bold"
                        >
                          <span className="text-ink text-xs">{label}</span>
                          <div className="mt-1 flex items-center justify-between">
                            <span
                              className={`rounded border px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider ${card.tagClass}`}
                            >
                              {card.typeLabel}
                            </span>
                            <span className="font-extrabold text-ink/70 text-[10px]">
                              {card.levelLabel} ({val}%)
                            </span>
                          </div>
                        </li>
                      );
                    })}
                </ul>
              </div>
            </div>

            {/* Moteurs comportementaux observables */}
            {(() => {
              const behavioralDrivers = normalizeChildInterests(child.interests);
              if (behavioralDrivers.length === 0) return null;
              return (
                <div className="mt-6 rounded-2xl border border-ink/10 bg-amber-50/60 p-4 shadow-sm">
                  <h3 className="text-xs font-black uppercase tracking-wider text-amber-900 mb-2 flex items-center gap-1.5">
                    <Compass className="size-4 text-amber-700" />
                    Moteurs comportementaux & leviers d'action (Observés)
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {behavioralDrivers.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full border border-amber-300 bg-white px-2.5 py-1 text-[11px] font-bold text-amber-900 shadow-2xs"
                      >
                        ✦ {tag}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Top Domaines */}
            {topDomains.length > 0 && (
              <div className="mt-4 rounded-2xl border border-ink/10 bg-purple-50/60 p-4 shadow-sm">
                <h3 className="text-xs font-black uppercase tracking-wider text-purple-900 mb-2 flex items-center gap-1.5">
                  <Target className="size-4 text-purple-700" />
                  Terrains d'excellence privilégiés
                </h3>
                <div className="flex flex-wrap gap-2">
                  {topDomains.map(([domain, count]) => (
                    <span
                      key={domain}
                      className="rounded-xl border border-purple-200 bg-white px-3 py-1 text-xs font-bold text-purple-950 shadow-2xs flex items-center gap-1.5"
                    >
                      <span className="size-1.5 rounded-full bg-purple-600" />
                      {domain} ({count} défi{count > 1 ? "s" : ""})
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Affinités de parcours — même source réelle (getTalentAffinities) que la
                section "Là où ses talents pourraient l'emmener" du Portfolio, pas de
                donnée inventée pour ce document payant. */}
            {(() => {
              const affinities = getTalentAffinities(child.talents).filter((a) => a.pct > 0);
              if (affinities.length === 0) return null;
              return (
                <div className="mt-4 rounded-2xl border border-ink/10 bg-sky-50/60 p-4 shadow-sm no-print-break">
                  <h3 className="text-xs font-black uppercase tracking-wider text-sky-900 mb-3 flex items-center gap-1.5">
                    <Rocket className="size-4 text-sky-700" />
                    Voies d'orientation suggérées par ses talents
                  </h3>
                  <div className="space-y-2">
                    {affinities.map((a) => (
                      <div key={a.key} className="flex items-center gap-3">
                        <span className="w-40 shrink-0 text-[11px] font-bold text-ink/80">
                          {a.label}
                        </span>
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-white border border-ink/10">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${a.pct}%`, background: `var(--guild-${a.key})` }}
                          />
                        </div>
                        <span className="w-8 shrink-0 text-right text-[10px] font-black text-sky-800">
                          {a.pct}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Badges — uniquement ceux réellement gagnés (child_badges), aucun badge
                fictif affiché. */}
            {earnedBadges.length > 0 && (
              <div className="mt-4 rounded-2xl border border-ink/10 bg-amber-50/60 p-4 shadow-sm no-print-break">
                <h3 className="text-xs font-black uppercase tracking-wider text-amber-900 mb-3 flex items-center gap-1.5">
                  <Medal className="size-4 text-amber-700" />
                  Distinctions obtenues
                </h3>
                <div className="grid grid-cols-2 gap-2.5">
                  {earnedBadges.map((slug) => {
                    const badge = BADGE_CATALOG[slug];
                    if (!badge) return null;
                    return (
                      <div key={slug} className="rounded-xl border border-amber-200 bg-white p-2.5">
                        <p className="text-[11px] font-black text-amber-900">{badge.title}</p>
                        <p className="text-[9px] text-ink/60 leading-snug mt-0.5">
                          {badge.description}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Page Footer */}
          <div className="border-t border-ink/10 pt-4 flex justify-between text-[9px] font-bold text-ink/60 uppercase tracking-wider">
            <span>Passeport d'Excellence • {child.name}</span>
            <span>Page 2 / {totalPages}</span>
          </div>
        </div>

        {/* ── PAGE 3: NAYA SYNTHESIS STATEMENT ── */}
        {synthesis && (
          <div className="page-break flex-1 flex flex-col justify-between min-h-[26cm] pt-8">
            <div>
              <div className="border-b-[3px] border-ink pb-4 mb-6">
                <h2 className="font-display text-balance text-xl font-black text-ink uppercase tracking-tight flex items-center gap-2">
                  <BookOpen className="size-5 text-brand" />
                  II. Synthèse pédagogique du Co-pilote Naya
                </h2>
              </div>

              <div className="no-print-break rounded-3xl border-2 border-brand/20 bg-brand/5 p-8 shadow-md">
                <p className="text-xs font-black uppercase tracking-widest text-brand mb-4">
                  Rapport de bilan personnalisé
                </p>
                <div className="text-xs text-ink/85 leading-relaxed font-medium space-y-4">
                  <MarkdownContent content={synthesis} />
                </div>
              </div>

              {/* Lettre d'orientation — cf. getPassportLetter, distincte de la synthèse
                  comportementale ci-dessus, tournée vers l'avenir plutôt que l'observation. */}
              {letter && (
                <div className="mt-6 rounded-3xl border-2 border-emerald-200 bg-emerald-50/60 p-8 shadow-md no-print-break">
                  <p className="text-xs font-black uppercase tracking-widest text-emerald-800 mb-4">
                    Mot de Naya sur son avenir
                  </p>
                  <div className="text-xs text-ink/85 leading-relaxed font-medium">
                    <MarkdownContent content={letter} />
                  </div>
                </div>
              )}
            </div>

            {/* Page Footer */}
            <div className="border-t border-ink/10 pt-4 flex justify-between text-[9px] font-bold text-ink/60 uppercase tracking-wider">
              <span>Passeport d'Excellence • {child.name}</span>
              <span>Page 3 / {totalPages}</span>
            </div>
          </div>
        )}

        {/* ── PAGES 4+: DETAILED LOG OF COMPLETED CHALLENGES ── */}
        {challenges.length > 0 &&
          (() => {
            const chunks: Challenge[][] = [];
            for (let i = 0; i < challenges.length; i += 2) {
              chunks.push(challenges.slice(i, i + 2));
            }

            const startPage = synthesis ? 4 : 3;

            return chunks.map((chunk, chunkIdx) => (
              <div
                key={chunkIdx}
                className="page-break flex-1 flex flex-col justify-between min-h-[26cm] pt-8"
              >
                <div>
                  <div className="border-b-[3px] border-ink pb-4 mb-8">
                    <h2 className="font-display text-balance text-xl font-black text-ink uppercase tracking-tight">
                      {synthesis ? "III" : "II"}. Réalisations Pratiques & Épreuves (
                      {chunkIdx * 2 + 1} - {Math.min(challenges.length, chunkIdx * 2 + 2)})
                    </h2>
                  </div>

                  <div className="space-y-10">
                    {chunk.map((c) => (
                      <div
                        key={c.id}
                        className="no-print-break border border-ink/10 rounded-3xl p-6 bg-white shadow-md space-y-4"
                      >
                        {/* Challenge header */}
                        <div className="flex justify-between items-start gap-4">
                          <div>
                            <span className="rounded-full border-2 border-ink bg-brand/10 text-brand px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider">
                              {c.domain}
                            </span>
                            <h3 className="font-display text-balance text-base font-extrabold text-ink mt-1.5 leading-tight">
                              {c.title}
                            </h3>
                          </div>
                          {c.completed_at && (
                            <span className="text-[10px] font-bold text-ink/60 uppercase tracking-wider shrink-0 mt-0.5">
                              Validé le {new Date(c.completed_at).toLocaleDateString("fr-FR")}
                            </span>
                          )}
                        </div>

                        {/* Description */}
                        <div className="text-xs text-ink/70 leading-relaxed font-semibold">
                          <p className="text-[9px] font-black uppercase tracking-wider text-ink/60 mb-1">
                            Description de la mission
                          </p>
                          <MarkdownContent content={c.description} />
                        </div>

                        {/* Split photo and observations if photo exists */}
                        <div className="grid gap-4">
                          {/* Proof image */}
                          {c.proof_image_url && (
                            <div className="rounded-xl overflow-hidden border-2 border-ink bg-stone-50 aspect-[4/3] flex items-center justify-center">
                              <img
                                src={c.proof_image_url}
                                alt={c.title}
                                className="max-h-full max-w-full object-contain"
                              />
                            </div>
                          )}

                          {/* Naya & Parent Notes */}
                          <div className="space-y-3 flex flex-col justify-between">
                            {c.ai_observations && (
                              <div className="rounded-xl border border-ink/20 bg-emerald-50/50 p-3 text-xs leading-relaxed">
                                <p className="text-[8px] font-black uppercase tracking-wider text-emerald-800 mb-0.5 flex items-center gap-1">
                                  <CheckCircle className="size-3 text-emerald-600" />
                                  Observation pédagogique
                                </p>
                                <p className="italic font-semibold text-emerald-950">
                                  "{c.ai_observations}"
                                </p>
                              </div>
                            )}

                            {c.notes && (
                              <div className="rounded-xl border border-ink/20 bg-sky-50/50 p-3 text-xs leading-relaxed">
                                <p className="text-[8px] font-black uppercase tracking-wider text-sky-850 mb-0.5">
                                  Note de réalisation
                                </p>
                                <p className="font-semibold text-sky-950">{c.notes}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Page Footer */}
                <div className="border-t border-ink/10 pt-4 flex justify-between text-[9px] font-bold text-ink/60 uppercase tracking-wider">
                  <span>Passeport d'Excellence • {child.name}</span>
                  <span>
                    Page {startPage + chunkIdx} / {totalPages}
                  </span>
                </div>
              </div>
            ));
          })()}
      </div>
    </div>
  );
}
