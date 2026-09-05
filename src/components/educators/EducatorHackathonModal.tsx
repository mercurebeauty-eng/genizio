import { useState } from "react";
import { X, Users, Sparkles, Trophy, Download, CheckCircle2 } from "lucide-react";
import {
  buildHackathonTeams,
  type MobilizationAwareTeamMember,
  getPrimaryTalent,
} from "@/lib/guild-team-generator";
import { TALENT_KEY_LABELS } from "@/lib/talent-buckets";
import { toast } from "sonner";

export interface EducatorHackathonModalProps {
  open: boolean;
  onClose: () => void;
  students: Array<{
    id: string;
    name: string;
    talents?: Record<string, number>;
  }>;
  schoolName?: string;
}

export function EducatorHackathonModal({
  open,
  onClose,
  students,
  schoolName = "Établissement",
}: EducatorHackathonModalProps) {
  const [teamSize, setTeamSize] = useState(4);
  const [teams, setTeams] = useState<
    Array<{ teamName: string; members: any[] }> | null
  >(null);

  if (!open) return null;

  const handleGenerateTeams = () => {
    if (students.length < 2) {
      toast.error("Il faut au moins 2 élèves pour former des équipes.");
      return;
    }

    const members: MobilizationAwareTeamMember[] = students.map((s) => ({
      id: s.id,
      name: s.name,
      talents: s.talents || {},
      primaryTalentKey: getPrimaryTalent(s.talents || {}),
    }));

    try {
      const generated = buildHackathonTeams(members, {
        teamSize: Math.min(teamSize, students.length),
        seed: Date.now(),
        teamNames: [
          "Équipe Alpha (Inventeurs)",
          "Équipe Bêta (Explorateurs)",
          "Équipe Gamma (Bâtisseurs)",
          "Équipe Delta (Stratèges)",
          "Équipe Oméga (Pionniers)",
          "Équipe Sirius (Créateurs)",
          "Équipe Phoenix (Makers)",
          "Équipe Titan (Artisans)",
        ],
      });
      setTeams(generated);
      toast.success(`${generated.length} équipes équilibrées et synergiques générées !`);
    } catch (err: any) {
      toast.error(`Erreur : ${err.message}`);
    }
  };

  const handleExportText = () => {
    if (!teams) return;
    let txt = `🏆 HACKATHON & PROJETS COLLECTIFS — ${schoolName.toUpperCase()}\n`;
    txt += `Date : ${new Date().toLocaleDateString("fr-FR")}\n`;
    txt += `Total élèves : ${students.length} | Taille d'équipe : ${teamSize}\n\n`;

    teams.forEach((t, i) => {
      txt += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
      txt += `📌 ${t.teamName} (${t.members.length} membres)\n`;
      t.members.forEach((m: any, j: number) => {
        const talentLabel =
          TALENT_KEY_LABELS[m.primaryTalentKey as keyof typeof TALENT_KEY_LABELS] ||
          m.primaryTalentKey;
        txt += `  ${j + 1}. ${m.name} — Talent clé : ${talentLabel}\n`;
      });
      txt += `\n`;
    });

    const blob = new Blob([txt], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `hackathon-equipes-${schoolName.toLowerCase().replace(/\s+/g, "-")}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Feuille d'équipes exportée avec succès !");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="relative max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-ink/10 bg-white p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-ink/5 pb-4">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-xs">
              <Trophy className="size-5" />
            </div>
            <div>
              <h3 className="font-display font-black text-base text-ink flex items-center gap-2">
                <span>Générateur d'Équipes de Hackathon & FabLab</span>
                <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-black text-purple-800 uppercase tracking-wider">
                  Phase 4
                </span>
              </h3>
              <p className="text-xs text-ink/60">
                Composition synergique sans "groupes d'élites" basée sur les intelligences multiples.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-ink/40 hover:bg-surface hover:text-ink transition-colors cursor-pointer"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Configuration */}
        <div className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <p className="text-xs font-bold text-ink">Bassin de participants</p>
            <p className="text-[11px] text-ink/60">
              {students.length} élève(s) disponible(s) dans la classe / l'établissement.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-ink/70">Taille :</label>
              <select
                value={teamSize}
                onChange={(e) => setTeamSize(Number(e.target.value))}
                className="rounded-xl border border-ink/10 bg-white px-2.5 py-1.5 text-xs font-bold text-ink"
              >
                <option value={3}>3 élèves / équipe</option>
                <option value={4}>4 élèves / équipe (Recommandé)</option>
                <option value={5}>5 élèves / équipe</option>
                <option value={6}>6 élèves / équipe</option>
              </select>
            </div>

            <button
              type="button"
              onClick={handleGenerateTeams}
              className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-indigo-700 transition-colors cursor-pointer"
            >
              <Sparkles className="size-3.5" />
              <span>Générer le tirage</span>
            </button>
          </div>
        </div>

        {/* Rendu des équipes */}
        {teams ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-black text-ink uppercase tracking-wider">
                {teams.length} Équipes générées (Snake Draft Équilibré)
              </p>
              <button
                type="button"
                onClick={handleExportText}
                className="inline-flex items-center gap-1.5 rounded-xl border border-ink/10 bg-white px-3 py-1.5 text-xs font-bold text-ink/80 hover:bg-surface transition-colors cursor-pointer shadow-2xs"
              >
                <Download className="size-3.5 text-indigo-600" />
                <span>Exporter la liste (.txt)</span>
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {teams.map((team, idx) => (
                <div
                  key={idx}
                  className="rounded-2xl border border-ink/10 bg-white p-4 space-y-3 shadow-2xs"
                >
                  <div className="flex items-center justify-between border-b border-ink/5 pb-2">
                    <p className="text-xs font-black text-indigo-950 flex items-center gap-1.5">
                      <Users className="size-3.5 text-indigo-600" />
                      <span>{team.teamName}</span>
                    </p>
                    <span className="rounded-full bg-emerald-50 text-emerald-800 text-[10px] font-bold px-2 py-0.5 border border-emerald-200 flex items-center gap-1">
                      <CheckCircle2 className="size-3 text-emerald-600" /> {team.members.length} membres
                    </span>
                  </div>

                  <ul className="divide-y divide-ink/5 text-xs">
                    {team.members.map((m: any, mIdx: number) => {
                      const talentLabel =
                        TALENT_KEY_LABELS[m.primaryTalentKey as keyof typeof TALENT_KEY_LABELS] ||
                        m.primaryTalentKey;
                      return (
                        <li key={mIdx} className="py-1.5 first:pt-0 last:pb-0 flex items-center justify-between">
                          <span className="font-semibold text-ink">{m.name}</span>
                          <span className="text-[10px] font-medium text-ink/55 bg-surface px-2 py-0.5 rounded-lg border border-ink/5">
                            {talentLabel}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-ink/15 bg-surface/50 p-8 text-center space-y-2">
            <p className="text-xs font-bold text-ink/70">Aucune équipe générée pour le moment</p>
            <p className="text-[11px] text-ink/50 max-w-md mx-auto">
              Cliquez sur "Générer le tirage" pour appliquer l'algorithme snake-draft qui équilibre
              la rareté des talents et évite l'accumulation d'élites dans un seul groupe.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
