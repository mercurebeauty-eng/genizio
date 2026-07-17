import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-session";
import { getChildAISynthesis } from "@/lib/challenges.functions";
import { getChildGuild } from "@/lib/guilds";
import { TalentRadarChart } from "@/components/TalentRadarChart";
import { MarkdownContent } from "@/components/ui/markdown-content";
import { Award, Sparkles, BookOpen, ShieldCheck, Printer, CheckCircle, ChevronLeft } from "lucide-react";

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
      supabase.from("child_profiles").select("id, name, age, talents, interests").eq("id", profileId).eq("user_id", session!.user.id).maybeSingle(),
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
      <div className="grid min-h-screen place-items-center bg-stone-50 text-ink">
        <div className="text-center font-bold">
          <div className="size-8 rounded-full border-4 border-t-brand border-brand/20 animate-spin mx-auto mb-3"></div>
          <p>Préparation du Passeport d'Excellence...</p>
        </div>
      </div>
    );
  }

  if (!child) {
    return (
      <div className="grid min-h-screen place-items-center bg-stone-50 text-ink">
        <div className="text-center p-6 border-2 border-ink bg-white rounded-3xl max-w-sm">
          <p className="font-bold text-red-500 mb-2">Accès refusé ou profil introuvable.</p>
          <p className="text-xs text-ink/60 mb-4">Ce document est sécurisé et réservé au compte parent propriétaire.</p>
          <Link to="/profiles" className="text-xs font-bold text-brand hover:underline">Retour</Link>
        </div>
      </div>
    );
  }

  const isUnlocked = (child.talents as any)?.pdf_unlocked === true;
  if (!isUnlocked) {
    return (
      <div className="grid min-h-screen place-items-center bg-stone-50 text-ink">
        <div className="text-center p-8 border-3 border-ink bg-white rounded-3xl max-w-md shadow-brutal">
          <h2 className="font-display text-xl font-black text-brand mb-2">Passeport d'Excellence Verrouillé</h2>
          <p className="text-sm font-semibold text-ink/75 leading-relaxed mb-6">
            Le Passeport d'Excellence pour {child.name} n'a pas encore été débloqué par l'administration. Veuillez procéder à son activation ou contacter le support.
          </p>
          <Link to={`/profiles/${child.id}/portfolio`} className="rounded-xl border-2 border-ink bg-brand px-5 py-2 text-xs font-bold text-white shadow-brutal-sm hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer">
            Retour au Portfolio
          </Link>
        </div>
      </div>
    );
  }

  const guild = getChildGuild(child.talents);
  const level = Math.max(1, Math.min(10, Math.floor(challenges.length / 4) + 1));
  const suffixes = ["Novice", "Apprenti", "Émergent", "Compagnon", "Initié", "Confirmé", "Aventurier", "Maître", "Champion", "Légende"];
  const rank = `${guild.name.replace("Les ", "").slice(0, -1)} ${suffixes[level - 1] || "Expert"}`;

  return (
    <div className="min-h-screen bg-stone-100 py-10 print:py-0 print:bg-white text-ink">
      
      {/* Print Controls / Alert for Screen View */}
      <div className="max-w-[21cm] mx-auto mb-8 px-6 py-4 bg-white border-[3px] border-ink rounded-2xl flex items-center justify-between shadow-brutal-sm print:hidden">
        <div className="flex items-center gap-3">
          <Link to={`/profiles/${child.id}/portfolio`} className="rounded-xl border-2 border-ink p-2 hover:bg-stone-100 transition-all">
            <ChevronLeft className="size-4" />
          </Link>
          <div>
            <h1 className="font-bold text-sm">Passeport d'Excellence • {child.name}</h1>
            <p className="text-xs text-ink/50 font-semibold">Le dialogue d'impression va s'ouvrir automatiquement.</p>
          </div>
        </div>
        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 rounded-xl border-2 border-ink bg-brand px-4 py-2 text-xs font-bold text-white shadow-brutal-sm hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer"
        >
          <Printer className="size-4" />
          Imprimer / Enregistrer en PDF
        </button>
      </div>

      {/* 📄 PDF CONTENT PAGE CONTAINER */}
      <div className="max-w-[21cm] mx-auto bg-white border-[3px] border-ink print:border-0 shadow-2xl print:shadow-none p-[1.5cm] min-h-[29.7cm] flex flex-col justify-between relative overflow-hidden">
        
        {/* Style block for print-specific tweaks */}
        <style dangerouslySetInnerHTML={{ __html: `
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
        ` }} />

        {/* ── PAGE 1: COVER ── */}
        <div className="flex-1 flex flex-col justify-between min-h-[26cm]">
          {/* Header Cover */}
          <div className="flex justify-between items-center border-b-[3px] border-ink pb-6">
            <div className="flex items-center gap-2 font-display text-xl font-black text-brand">
              <img src="/favicon-96x96.png" alt="" className="size-8" />
              <span>GÉNIZIO</span>
            </div>
            <span className="rounded-full border-2 border-ink bg-stone-50 px-3 py-1 text-[10px] font-black uppercase tracking-wider">
              Document Officiel Certifié
            </span>
          </div>

          {/* Title block Cover */}
          <div className="my-auto py-12 text-center space-y-6">
            <div className="inline-flex items-center justify-center size-20 rounded-3xl bg-brand/10 border-[3px] border-ink text-brand shadow-brutal mb-4">
              <Award className="size-10" />
            </div>
            <h1 className="font-display text-4xl md:text-5xl font-black uppercase tracking-tight text-ink">
              Passeport d'Excellence
            </h1>
            <p className="text-sm font-bold text-ink/50 uppercase tracking-widest max-w-md mx-auto leading-relaxed border-t-2 border-b-2 border-ink py-2">
              Dossier de valorisation des talents et compétences par projet
            </p>
            
            <div className="pt-8 space-y-2">
              <p className="text-3xl font-display font-extrabold text-brand">{child.name}</p>
              <p className="text-sm font-bold text-ink/70">Âge : {child.age} ans</p>
              <p className="text-sm font-bold text-ink/75">Statut de Guilde : <strong className="text-ink font-black">{rank}</strong> ({guild.name})</p>
            </div>
          </div>

          {/* Footer Cover */}
          <div className="border-t-[3px] border-ink pt-6 flex justify-between items-end">
            <div className="space-y-1">
              <p className="text-[10px] font-black text-ink/40 uppercase tracking-wider">Délivré par</p>
              <p className="text-xs font-bold text-ink/80">Laboratoire d'Innovation Pédagogique Génizio</p>
              <p className="text-[10px] font-medium text-ink/50">Dakar · Abidjan · Yaoundé</p>
            </div>

            <div className="flex items-center gap-2 border-2 border-emerald-500 bg-emerald-50 text-emerald-800 rounded-xl px-3 py-2 text-xs font-bold shadow-brutal-sm">
              <ShieldCheck className="size-4 shrink-0 text-emerald-600" />
              <div>
                <p className="text-[8px] font-black uppercase tracking-wider leading-none">Certifié Authentique</p>
                <p className="text-[10px] leading-tight mt-0.5 font-bold">Identifiant : {child.id.slice(0, 8).toUpperCase()}</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── PAGE 2: TALENT MAP & NAYA SYNTHESIS ── */}
        <div className="page-break flex-1 flex flex-col justify-between min-h-[26cm] pt-8">
          <div>
            <div className="border-b-[3px] border-ink pb-4 mb-8">
              <h2 className="font-display text-xl font-black text-ink uppercase tracking-tight flex items-center gap-2">
                <Sparkles className="size-5 text-brand" />
                I. Cartographie des intelligences multiples
              </h2>
            </div>

            <div className="grid gap-8 md:grid-cols-2 items-center">
              <div className="border-[3px] border-ink rounded-3xl p-4 bg-white shadow-brutal-sm flex flex-col items-center">
                <h3 className="text-xs font-black uppercase tracking-wider text-ink/40 mb-2 self-start">Carte Radar</h3>
                <TalentRadarChart talents={child.talents} name={child.name} className="h-64 w-full" age={child.age} />
              </div>

              <div className="space-y-4">
                <h3 className="text-xs font-black uppercase tracking-wider text-ink/40 border-b border-ink/10 pb-1">Forces identifiées</h3>
                <ul className="space-y-3">
                  {Object.entries(child.talents || {})
                    .filter(([_, val]) => val > 0)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 4)
                    .map(([key, val]) => {
                      let label = key;
                      const card = getTalentCardInfo(child.age, val);
                      if (key === "spatial") label = "Spatiale & Visuelle";
                      else if (key === "corporelle") label = "Corporelle & Mouvement";
                      else if (key === "sociale") label = "Sociale & Relations";
                      else if (key === "entrepreneuriale") label = "Entreprendre & Projets";
                      else if (key === "creative") label = "Créative & Artistique";
                      else if (key === "artisanale") label = "Artisanale & Manuelle";
                      else if (key === "emotionnelle") label = "Émotionnelle & Soi";
                      else if (key === "logico_mathematique") label = "Logique & Sciences";
                      else if (key === "linguistique") label = "Linguistique & Mots";

                      return (
                        <li key={key} className="flex justify-between items-center py-1.5 border-b border-stone-100 last:border-b-0 text-xs font-bold">
                          <div>
                            <span className="text-ink">{label}</span>
                            <span className={`ml-2 rounded border px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider ${card.tagClass}`}>
                              {card.typeLabel}
                            </span>
                          </div>
                          <span className="font-extrabold text-ink/70">
                            {card.levelLabel} ({val}%)
                          </span>
                        </li>
                      );
                    })}
                </ul>
              </div>
            </div>

            {/* AI Synthesis Statement */}
            {synthesis && (
              <div className="mt-10 rounded-2xl border-[3px] border-ink bg-brand/5 p-6 shadow-brutal-sm">
                <h3 className="text-xs font-black uppercase tracking-wider text-brand mb-2 flex items-center gap-1.5">
                  <BookOpen className="size-4" />
                  Rapport de synthèse pédagogique (Co-pilote Naya)
                </h3>
                <div className="text-xs text-ink/80 leading-relaxed font-semibold italic">
                  <MarkdownContent content={synthesis} />
                </div>
              </div>
            )}
          </div>

          {/* Page Footer */}
          <div className="border-t border-ink/10 pt-4 flex justify-between text-[9px] font-bold text-ink/40 uppercase tracking-wider">
            <span>Passeport d'Excellence • {child.name}</span>
            <span>Page 2 / {Math.min(6, 2 + Math.ceil(challenges.length / 2))}</span>
          </div>
        </div>

        {/* ── PAGES 3+: DETAILED LOG OF COMPLETED CHALLENGES ── */}
        {challenges.length > 0 && (() => {
          // Group challenges by 2 per page for compact and clean printing
          const chunks: Challenge[][] = [];
          for (let i = 0; i < challenges.length; i += 2) {
            chunks.push(challenges.slice(i, i + 2));
          }

          return chunks.map((chunk, chunkIdx) => (
            <div key={chunkIdx} className="page-break flex-1 flex flex-col justify-between min-h-[26cm] pt-8">
              <div>
                <div className="border-b-[3px] border-ink pb-4 mb-8">
                  <h2 className="font-display text-xl font-black text-ink uppercase tracking-tight">
                    II. Réalisations Pratiques & Épreuves ({chunkIdx * 2 + 1} - {Math.min(challenges.length, chunkIdx * 2 + 2)})
                  </h2>
                </div>

                <div className="space-y-10">
                  {chunk.map((c) => (
                    <div key={c.id} className="no-print-break border-2 border-ink rounded-3xl p-6 bg-white shadow-brutal-sm space-y-4">
                      {/* Challenge header */}
                      <div className="flex justify-between items-start gap-4">
                        <div>
                          <span className="rounded-full border-2 border-ink bg-brand/10 text-brand px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider">
                            {c.domain}
                          </span>
                          <h3 className="font-display text-base font-extrabold text-ink mt-1.5 leading-tight">{c.title}</h3>
                        </div>
                        {c.completed_at && (
                          <span className="text-[10px] font-bold text-ink/40 uppercase tracking-wider shrink-0 mt-0.5">
                            Validé le {new Date(c.completed_at).toLocaleDateString("fr-FR")}
                          </span>
                        )}
                      </div>

                      {/* Description */}
                      <div className="text-xs text-ink/70 leading-relaxed font-semibold">
                        <p className="text-[9px] font-black uppercase tracking-wider text-ink/40 mb-1">Description de la mission</p>
                        <MarkdownContent content={c.description} />
                      </div>

                      {/* Split photo and observations if photo exists */}
                      <div className="grid gap-4 md:grid-cols-2">
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
              <div className="border-t border-ink/10 pt-4 flex justify-between text-[9px] font-bold text-ink/40 uppercase tracking-wider">
                <span>Passeport d'Excellence • {child.name}</span>
                <span>Page {3 + chunkIdx} / {2 + chunks.length}</span>
              </div>
            </div>
          ));
        })()}

      </div>
    </div>
  );
}
