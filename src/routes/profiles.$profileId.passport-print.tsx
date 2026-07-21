import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-session";
import { getChildAISynthesis } from "@/lib/challenges.functions";
import { getChildGuild } from "@/lib/guilds";
import { TalentRadarChart } from "@/components/TalentRadarChart";
import { MarkdownContent } from "@/components/ui/markdown-content";
import {
  Award,
  Sparkles,
  BookOpen,
  ShieldCheck,
  Printer,
  CheckCircle,
  ChevronLeft,
  Zap,
  MapPin,
  Compass,
  Target,
} from "lucide-react";
import { GenizioLoader } from "@/components/GenizioLoader";
import { TALENT_KEY_LABELS } from "@/lib/talent-buckets";

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
  const [fetching, setFetching] = useState(true);
  const [synthesis, setSynthesis] = useState("");
  const [fetchingSynthesis, setFetchingSynthesis] = useState(false);

  const fetchSynthesis = useServerFn(getChildAISynthesis);

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
        .select("id, title, domain, status, completed_at, proof_image_url, description, ai_observations, notes, difficulty")
        .eq("child_id", profileId)
        .eq("status", "completed")
        .order("completed_at", { ascending: false }),
    ]).then(([c, ch]) => {
      setChild((c.data as Child) ?? null);
      setChallenges((ch.data ?? []) as Challenge[]);
      setFetching(false);
    });
  }, [session, profileId]);

  useEffect(() => {
    if (!session) return;
    setFetchingSynthesis(true);
    fetchSynthesis({ data: { childId: profileId } })
      .then((resp) => setSynthesis(resp || ""))
      .catch(() => setSynthesis(""))
      .finally(() => setFetchingSynthesis(false));
  }, [session, profileId]);

  // Automatically trigger print dialog when data is loaded
  useEffect(() => {
    if (!fetching && child && challenges.length > 0 && synthesis) {
      const timer = setTimeout(() => {
        window.print();
      }, 1500); // Allow charts and fonts to fully render
      return () => clearTimeout(timer);
    }
  }, [fetching, child, challenges, synthesis]);

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
          <p className="text-xs text-ink/60 mb-4">Ce document est sécurisé et réservé au compte parent propriétaire.</p>
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
            Le Passeport d'Excellence pour {child.name} n'a pas encore été débloqué par l'administration. Veuillez procéder à son activation ou contacter le support.
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
  const locationStr = [child.city, child.country].filter(Boolean).join(", ") || "Abidjan, Côte d'Ivoire";

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
      <div className="max-w-[21cm] mx-auto mb-8 px-6 py-4 bg-white border border-ink/10 rounded-2xl flex items-center justify-between shadow-md print:hidden">
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
            <p className="text-xs text-ink/60 font-semibold">Le dialogue d'impression va s'ouvrir automatiquement.</p>
          </div>
        </div>
        <button
          onClick={() => window.print()}
          className="press-brand inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2 text-xs font-bold text-white cursor-pointer"
        >
          <Printer className="size-4" />
          Imprimer / Enregistrer en PDF
        </button>
      </div>

      {/* 📄 PDF CONTENT PAGE CONTAINER */}
      <div className="max-w-[21cm] mx-auto bg-white border border-ink/10 print:border-0 shadow-2xl print:shadow-none p-[1.5cm] min-h-[29.7cm] flex flex-col justify-between relative overflow-hidden">
        {/* Style block for print-specific tweaks */}
        <style
          dangerouslySetInnerHTML={{
            __html: `
          @media print {
            body {
              background-color: white !important;
              color: black !important;
            }
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
              Document Officiel Certifié
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
              <p className="text-3xl font-display text-balance font-extrabold text-brand">{child.name}</p>
              <div className="flex items-center justify-center gap-3 text-xs font-bold text-ink/75 flex-wrap">
                <span>Âge : {child.age} ans</span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <MapPin className="size-3 text-brand" /> {locationStr}
                </span>
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
              <p className="text-[10px] font-black text-ink/60 uppercase tracking-wider">Délivré par</p>
              <p className="text-xs font-bold text-ink/80">Laboratoire d'Innovation Pédagogique Génizio</p>
              <p className="text-[10px] font-medium text-ink/60">Dakar · Abidjan · Yaoundé</p>
            </div>

            <div className="flex items-center gap-2 border border-emerald-300 bg-emerald-50 text-emerald-800 rounded-xl px-3 py-2 text-xs font-bold shadow-sm">
              <ShieldCheck className="size-4 shrink-0 text-emerald-600" />
              <div>
                <p className="text-[8px] font-black uppercase tracking-wider leading-none">Certifié Authentique</p>
                <p className="text-[10px] leading-tight mt-0.5 font-bold">Identifiant : {child.id.slice(0, 8).toUpperCase()}</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── PAGE 2: TALENT MAP & BEHAVIORAL DRIVERS ── */}
        <div className="page-break flex-1 flex flex-col justify-between min-h-[26cm] pt-8">
          <div>
            <div className="border-b-[3px] border-ink pb-4 mb-6">
              <h2 className="font-display text-balance text-xl font-black text-ink uppercase tracking-tight flex items-center gap-2">
                <Sparkles className="size-5 text-brand" />
                I. Cartographie des intelligences & leviers d'action
              </h2>
            </div>

            <div className="grid grid-cols-1 gap-6 items-center">
              {/* Radar chart */}
              <div className="border border-ink/10 rounded-3xl p-4 bg-white shadow-md flex flex-col items-center">
                <h3 className="text-xs font-black uppercase tracking-wider text-ink/60 mb-2 self-start">
                  Radar des 9 Intelligences (Howard Gardner)
                </h3>
                <TalentRadarChart talents={child.talents} name={child.name} className="h-60 w-full" age={child.age} />
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
            {child.interests && child.interests.length > 0 && (
              <div className="mt-6 rounded-2xl border border-ink/10 bg-amber-50/60 p-4 shadow-sm">
                <h3 className="text-xs font-black uppercase tracking-wider text-amber-900 mb-2 flex items-center gap-1.5">
                  <Compass className="size-4 text-amber-700" />
                  Moteurs comportementaux & leviers d'action (Observés)
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {child.interests.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-amber-300 bg-white px-2.5 py-1 text-[11px] font-bold text-amber-900 shadow-2xs"
                    >
                      ✦ {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

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
          </div>

          {/* Page Footer */}
          <div className="border-t border-ink/10 pt-4 flex justify-between text-[9px] font-bold text-ink/60 uppercase tracking-wider">
            <span>Passeport d'Excellence • {child.name}</span>
            <span>Page 2 / {Math.min(6, 3 + Math.ceil(challenges.length / 2))}</span>
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

              <div className="rounded-3xl border-2 border-brand/20 bg-brand/5 p-8 shadow-md">
                <p className="text-xs font-black uppercase tracking-widest text-brand mb-4">
                  Rapport de bilan personnalisé
                </p>
                <div className="text-xs text-ink/85 leading-relaxed font-medium space-y-4">
                  <MarkdownContent content={synthesis} />
                </div>
              </div>
            </div>

            {/* Page Footer */}
            <div className="border-t border-ink/10 pt-4 flex justify-between text-[9px] font-bold text-ink/60 uppercase tracking-wider">
              <span>Passeport d'Excellence • {child.name}</span>
              <span>Page 3 / {Math.min(6, 3 + Math.ceil(challenges.length / 2))}</span>
            </div>
          </div>
        )}

        {/* ── PAGES 4+: DETAILED LOG OF COMPLETED CHALLENGES ── */}
        {challenges.length > 0 && (() => {
          const chunks: Challenge[][] = [];
          for (let i = 0; i < challenges.length; i += 2) {
            chunks.push(challenges.slice(i, i + 2));
          }

          const startPage = synthesis ? 4 : 3;

          return chunks.map((chunk, chunkIdx) => (
            <div key={chunkIdx} className="page-break flex-1 flex flex-col justify-between min-h-[26cm] pt-8">
              <div>
                <div className="border-b-[3px] border-ink pb-4 mb-8">
                  <h2 className="font-display text-balance text-xl font-black text-ink uppercase tracking-tight">
                    {synthesis ? "III" : "II"}. Réalisations Pratiques & Épreuves ({chunkIdx * 2 + 1} - {Math.min(challenges.length, chunkIdx * 2 + 2)})
                  </h2>
                </div>

                <div className="space-y-10">
                  {chunk.map((c) => (
                    <div key={c.id} className="no-print-break border border-ink/10 rounded-3xl p-6 bg-white shadow-md space-y-4">
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
                            <img src={c.proof_image_url} alt={c.title} className="max-h-full max-w-full object-contain" />
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
                              <p className="italic font-semibold text-emerald-950">"{c.ai_observations}"</p>
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
                  Page {startPage + chunkIdx} / {startPage + chunks.length - 1}
                </span>
              </div>
            </div>
          ));
        })()}
      </div>
    </div>
  );
}
