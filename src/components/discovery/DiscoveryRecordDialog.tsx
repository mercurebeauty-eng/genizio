import React, { useState, useRef, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useServerFn } from "@tanstack/react-start";
import {
  DISCOVERY_SOURCES,
  DISCOVERY_SOURCE_LABELS,
  DISCOVERY_DOMAINS,
  DISCOVERY_DOMAIN_LABELS,
  DISCOVERY_AUTONOMY_LEVELS,
  DISCOVERY_AUTONOMY_LABELS,
  DISCOVERY_OUTCOMES,
  DISCOVERY_OUTCOME_LABELS,
  type DiscoverySourceType,
  type DiscoveryDomain,
  type DiscoveryAutonomyLevel,
  type DiscoveryOutcomeStatus,
  type DiscoveryPerceivedDifficulty,
  createDiscoveryTrace,
} from "@/lib/discovery.functions";
import { NayaAvatar } from "@/components/NayaAvatar";
import {
  Sparkles,
  Lightbulb,
  Beaker,
  Hammer,
  Users,
  CheckCircle2,
  Loader2,
  ArrowRight,
  ArrowLeft,
  Camera,
  UploadCloud,
  X,
  Wrench,
  HelpCircle,
  Puzzle,
  Target,
  FlaskConical,
  Award,
} from "lucide-react";
import { toast } from "sonner";
import { fileToCompressedProof } from "@/lib/image-proof";

type DiscoveryRecordDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  childId: string;
  childName: string;
  onTraceCreated: (trace: any) => void;
  initialSource?: DiscoverySourceType;
};

// ── Thème visuel et identité selon l'archétype ───────────────────────────────

function getArchetypeTheme(src: DiscoverySourceType) {
  switch (src) {
    case "self_chosen":
      return {
        icon: Sparkles,
        iconBg: "bg-amber-100 text-amber-800 border-amber-300",
        badgeBg: "bg-amber-100 text-amber-900 border-amber-200",
        accentText: "text-amber-700",
        stepperActive: "bg-amber-600",
        focusRing: "focus-visible:ring-amber-500",
        buttonBg: "bg-amber-700 hover:bg-amber-800",
        dialogueBox: "bg-amber-50/80 border-amber-200/80",
        heading: "text-amber-950",
      };
    case "found_external":
      return {
        icon: Lightbulb,
        iconBg: "bg-sky-100 text-sky-800 border-sky-300",
        badgeBg: "bg-sky-100 text-sky-900 border-sky-200",
        accentText: "text-sky-700",
        stepperActive: "bg-sky-600",
        focusRing: "focus-visible:ring-sky-500",
        buttonBg: "bg-sky-700 hover:bg-sky-800",
        dialogueBox: "bg-sky-50/80 border-sky-200/80",
        heading: "text-sky-950",
      };
    case "open_sandbox":
      return {
        icon: Beaker,
        iconBg: "bg-emerald-100 text-emerald-800 border-emerald-300",
        badgeBg: "bg-emerald-100 text-emerald-900 border-emerald-200",
        accentText: "text-emerald-700",
        stepperActive: "bg-emerald-600",
        focusRing: "focus-visible:ring-emerald-500",
        buttonBg: "bg-emerald-700 hover:bg-emerald-800",
        dialogueBox: "bg-emerald-50/80 border-emerald-200/80",
        heading: "text-emerald-950",
      };
    case "fablab_marathon":
      return {
        icon: Hammer,
        iconBg: "bg-indigo-100 text-indigo-800 border-indigo-300",
        badgeBg: "bg-indigo-100 text-indigo-900 border-indigo-200",
        accentText: "text-indigo-700",
        stepperActive: "bg-indigo-600",
        focusRing: "focus-visible:ring-indigo-500",
        buttonBg: "bg-indigo-700 hover:bg-indigo-800",
        dialogueBox: "bg-indigo-50/80 border-indigo-200/80",
        heading: "text-indigo-950",
      };
    case "projet_collectif":
    default:
      return {
        icon: Users,
        iconBg: "bg-rose-100 text-rose-800 border-rose-300",
        badgeBg: "bg-rose-100 text-rose-900 border-rose-200",
        accentText: "text-rose-700",
        stepperActive: "bg-rose-600",
        focusRing: "focus-visible:ring-rose-500",
        buttonBg: "bg-rose-700 hover:bg-rose-800",
        dialogueBox: "bg-rose-50/80 border-rose-200/80",
        heading: "text-rose-950",
      };
  }
}

export function DiscoveryRecordDialog({
  open,
  onOpenChange,
  childId,
  childName,
  onTraceCreated,
  initialSource = "self_chosen",
}: DiscoveryRecordDialogProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [sourceType, setSourceType] = useState<DiscoverySourceType>(initialSource);

  // Champs de base communs
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [domain, setDomain] = useState<DiscoveryDomain>("logique");
  const [perceivedDifficulty, setPerceivedDifficulty] = useState<DiscoveryPerceivedDifficulty>("moyen");
  const [attemptsCount, setAttemptsCount] = useState<number>(1);
  const [durationMinutes, setDurationMinutes] = useState<number>(30);
  const [autonomyLevel, setAutonomyLevel] = useState<DiscoveryAutonomyLevel>("totalement_seul");
  const [outcomeStatus, setOutcomeStatus] = useState<DiscoveryOutcomeStatus>("fonctionnel");
  const [proofImageUrl, setProofImageUrl] = useState("");
  const [isCompressingImg, setIsCompressingImg] = useState(false);

  // Champs spécifiques 1. Je choisis
  const [sparkOrigin, setSparkOrigin] = useState("Inspiration du quotidien");
  const [materialsUsed, setMaterialsUsed] = useState("Objets recyclés & Récup");

  // Champs spécifiques 2. Je trouve
  const [discoveryOrigin, setDiscoveryOrigin] = useState("Livre ou revue");
  const [investigationMethod, setInvestigationMethod] = useState("Schémas & Croquis");

  // Champs spécifiques 3. Je tente
  const [initialHypothesis, setInitialHypothesis] = useState("");
  const [variableModified, setVariableModified] = useState("Forme et taille");

  // Champs spécifiques 4. Fab Lab
  const [workshopLocation, setWorkshopLocation] = useState("Fab Lab / Tiers-lieu");
  const [toolsUsed, setToolsUsed] = useState("Carton, colle & ciseaux");
  const [supervisionLevel, setSupervisionLevel] = useState("Guidé sur les gestes délicats");

  // Champs spécifiques 5. Projet d'Équipe
  const [teamHandles, setTeamHandles] = useState("");
  const [teamSize, setTeamSize] = useState("Petit groupe (3-4)");
  const [childRole, setChildRole] = useState("💡 Idéateur / Concepteur");
  const [groupDynamic, setGroupDynamic] = useState("Partage équitable et fluide");

  // Questions métacognitives Naya spécialisées (Étape 2)
  const [q1, setQ1] = useState("");
  const [q2, setQ2] = useState("");
  const [q3, setQ3] = useState("");
  const [q4, setQ4] = useState("");

  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const createDiscoveryTraceFn = useServerFn(createDiscoveryTrace);

  // Réinitialiser la source si initialSource change à l'ouverture
  useEffect(() => {
    if (open) {
      setSourceType(initialSource);
      setStep(1);
    }
  }, [open, initialSource]);

  const resetForm = () => {
    setStep(1);
    setTitle("");
    setDescription("");
    setDomain("logique");
    setPerceivedDifficulty("moyen");
    setAttemptsCount(1);
    setDurationMinutes(30);
    setAutonomyLevel("totalement_seul");
    setOutcomeStatus("fonctionnel");
    setProofImageUrl("");
    setSparkOrigin("Inspiration du quotidien");
    setMaterialsUsed("Objets recyclés & Récup");
    setDiscoveryOrigin("Livre ou revue");
    setInvestigationMethod("Schémas & Croquis");
    setInitialHypothesis("");
    setVariableModified("Forme et taille");
    setWorkshopLocation("Fab Lab / Tiers-lieu");
    setToolsUsed("Carton, colle & ciseaux");
    setSupervisionLevel("Guidé sur les gestes délicats");
    setTeamHandles("");
    setTeamSize("Petit groupe (3-4)");
    setChildRole("💡 Idéateur / Concepteur");
    setGroupDynamic("Partage équitable et fluide");
    setQ1("");
    setQ2("");
    setQ3("");
    setQ4("");
  };

  const handleImageSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsCompressingImg(true);
    try {
      const compressed = await fileToCompressedProof(file);
      setProofImageUrl(compressed.base64);
      toast.success("Photo prête ! Elle sera synchronisée dans la galerie du portfolio.");
    } catch (err: any) {
      console.error("Erreur compression image :", err);
      toast.error(err?.message || "Impossible de charger cette image.");
    } finally {
      setIsCompressingImg(false);
    }
  };

  // Configurations complètes et riches par source
  const getSourceConfig = (src: DiscoverySourceType) => {
    switch (src) {
      case "self_chosen":
        return {
          title: "🚀 Je choisis — Initiative & Création",
          badgeText: "Initiative personnelle",
          desc: `Racontez le projet, le bricolage ou l'histoire que ${childName} a imaginé et créé de son propre élan.`,
          titlePlaceholder: "Ex: Maquette de catapulte en bois, conte illustré de 6 pages, circuit à billes...",
          descPlaceholder: "Décrivez ce qu'il/elle a imaginé, comment il/elle s'y est pris(e) et le résultat obtenu...",
          q1Label: "1. D'où t'est venue cette idée originale ?",
          q1Placeholder: "Ex: J'ai pensé à ça en observant les oiseaux / en voulant créer un jeu pour ma sœur...",
          q2Label: "2. Par quoi as-tu commencé pour fabriquer ou créer ?",
          q2Placeholder: "Ex: J'ai d'abord fait un plan sur papier, puis rassemblé les pièces en carton...",
          q3Label: "3. Où as-tu rencontré le plus grand obstacle et comment as-tu insisté ?",
          q3Placeholder: "Ex: Le mécanisme se bloquait, alors j'ai changé l'élastique et poncé les bords...",
          q4Label: "4. De quoi es-tu le plus fier et que sais-tu faire maintenant ?",
          q4Placeholder: "Ex: Le fait que ça tire droit et fonctionne tout seul !",
        };
      case "found_external":
        return {
          title: "🔍 Je trouve — Curiosité & Défi Externe",
          badgeText: "Curiosité externe",
          desc: `Racontez l'énigme, le casse-tête ou le défi ardu que ${childName} a découvert ailleurs et a voulu résoudre.`,
          titlePlaceholder: "Ex: Énigme des 9 points reliés, casse-tête des allumettes, puzzle logique des vases...",
          descPlaceholder: "Expliquez quel était l'énoncé du problème et comment il a réussi à le décortiquer...",
          q1Label: "1. Où as-tu découvert ce défi et pourquoi t'a-t-il intrigué ?",
          q1Placeholder: "Ex: Vu dans un livre de maths amusantes / proposé par un camarade de classe...",
          q2Label: "2. Qu'est-ce qui te paraissait impossible ou mystérieux au tout début ?",
          q2Placeholder: "Ex: Je ne voyais pas comment relier tous les points sans lever le crayon...",
          q3Label: "3. À quel moment as-tu eu le déclic pour progresser ?",
          q3Placeholder: "Ex: En essayant de sortir du cadre imaginaire du carré tracé...",
          q4Label: "4. Quel conseil donnerais-tu à quelqu'un qui veut résoudre cette même énigme ?",
          q4Placeholder: "Ex: Ne pas rester bloqué dans les lignes et tester des directions inattendues !",
        };
      case "open_sandbox":
        return {
          title: "🧪 Je tente — Laboratoire Libre & Essais-Erreurs",
          badgeText: "Laboratoire libre",
          desc: `Racontez l'expérience libre, le test spontané d'hypothèses et les essais de ${childName}.`,
          titlePlaceholder: "Ex: Test de flottabilité avec des objets insolites, hauteur max d'une tour en spaghettis...",
          descPlaceholder: "Décrivez ce qu'il/elle a cherché à tester, les manipulations faites et ce qui s'est produit...",
          q1Label: "1. Quelle était ton intuition ou ton hypothèse au départ ?",
          q1Placeholder: "Ex: Je pensais qu'un objet lourd coulerait toujours plus vite qu'un objet léger...",
          q2Label: "2. Comment t'y es-tu pris concrètement pour tester et mesurer ?",
          q2Placeholder: "Ex: J'ai rempli la bassine d'eau et préparé 6 objets de tailles différentes...",
          q3Label: "3. Y a-t-il eu une surprise ou une erreur qui t'a appris quelque chose ?",
          q3Placeholder: "Ex: La boule de pâte coulait, mais quand je l'ai aplatie en barque, elle flottait !",
          q4Label: "4. Qu'as-tu appris que tu n'aurais pas deviné sans faire le test ?",
          q4Placeholder: "Ex: Que la forme et la surface de contact comptent autant que le poids !",
        };
      case "fablab_marathon":
        return {
          title: "⚙️ Fab Lab & Atelier — Immersion Outils & Matériaux",
          badgeText: "Atelier & Fabrication",
          desc: `Racontez l'activité de fabrication concrète avec outils réels menée par ${childName} en atelier ou maker space.`,
          titlePlaceholder: "Ex: Horloge en contreplaqué assemblée, voiturette solaire, sculpture articulée...",
          descPlaceholder: "Décrivez les étapes de fabrication, les matériaux transformés et les gestes techniques appris...",
          q1Label: "1. Quel était le cadre de cet atelier et quel outil t'a le plus marqué ?",
          q1Placeholder: "Ex: À l'atelier de bricolage du quartier, j'ai manipulé la scie à chantourner...",
          q2Label: "2. Quel geste technique ou règle de sécurité as-tu appris à maîtriser ?",
          q2Placeholder: "Ex: Porter les lunettes de protection et tenir la planche fermement avec le serre-joint...",
          q3Label: "3. Comment as-tu géré les imprévus de fabrication ou de matière ?",
          q3Placeholder: "Ex: Une pièce s'est fendue au perçage, alors j'ai recalculé la distance du bord...",
          q4Label: "4. Comment pourrais-tu réutiliser cette technique pour fabriquer un autre objet ?",
          q4Placeholder: "Ex: Je pourrais fabriquer un nichoir pour oiseaux avec les mêmes assemblages !",
        };
      case "projet_collectif":
      default:
        return {
          title: "👥 Projet d'Équipe — Coopération & Guilde",
          badgeText: "Coopération & Escouade",
          desc: `Racontez le projet collectif mené à plusieurs, mettant en valeur l'entraide et les talents partagés.`,
          titlePlaceholder: "Ex: Décor et pièce de théâtre de marionnettes à 3, base lunaire géante...",
          descPlaceholder: "Décrivez le projet commun, l'organisation de l'équipe et la répartition des missions...",
          q1Label: "1. Comment votre équipe s'est-elle formée et quel était votre but commun ?",
          q1Placeholder: "Ex: Avec Sarah et Léo, on voulait construire un pont capable de supporter nos livres...",
          q2Label: "2. Quel rôle as-tu pris naturellement et comment tes talents ont complété l'équipe ?",
          q2Placeholder: "Ex: J'ai dessiné les plans et calculé les poutres pendant que Sarah découpait...",
          q3Label: "3. S'il y a eu un désaccord, comment avez-vous trouvé un compromis ?",
          q3Placeholder: "Ex: On hésitait entre deux formes d'arches, on a testé les deux sur une maquette...",
          q4Label: "4. Qu'avez-vous réussi ensemble qu'aucun de vous n'aurait pu faire tout seul ?",
          q4Placeholder: "Ex: Le projet était trop grand pour un seul après-midi, à 3 on a fini en 1h !",
        };
    }
  };

  const config = getSourceConfig(sourceType);
  const theme = getArchetypeTheme(sourceType);
  const ArchetypeIcon = theme.icon;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      toast.error("Veuillez renseigner au moins un titre et une description.");
      return;
    }

    setLoading(true);
    try {
      // Construction du dialogue métacognitif
      const nayaDialogue = [];
      if (q1.trim()) nayaDialogue.push({ question: config.q1Label, answer: q1.trim() });
      if (q2.trim()) nayaDialogue.push({ question: config.q2Label, answer: q2.trim() });
      if (q3.trim()) nayaDialogue.push({ question: config.q3Label, answer: q3.trim() });
      if (q4.trim()) nayaDialogue.push({ question: config.q4Label, answer: q4.trim() });

      // Enrichissement des contextes selon l'archétype
      let contextualHelp = "";
      let contextualStrategy = "";

      if (sourceType === "self_chosen") {
        contextualHelp = `Matériaux: ${materialsUsed}`;
        contextualStrategy = `Étincelle: ${sparkOrigin}`;
      } else if (sourceType === "found_external") {
        contextualHelp = `Origine: ${discoveryOrigin}`;
        contextualStrategy = `Méthode: ${investigationMethod}`;
      } else if (sourceType === "open_sandbox") {
        contextualHelp = initialHypothesis.trim() ? `Hypothèse: ${initialHypothesis.trim()}` : "Hypothèse spontanée";
        contextualStrategy = `Variables testées: ${variableModified}`;
      } else if (sourceType === "fablab_marathon") {
        contextualHelp = `Lieu: ${workshopLocation} | Encadrement: ${supervisionLevel}`;
        contextualStrategy = `Outils: ${toolsUsed}`;
      } else if (sourceType === "projet_collectif") {
        contextualHelp = `Équipe (${teamSize}): ${teamHandles.trim() || "Pairs"}`;
        contextualStrategy = `Rôle: ${childRole} | Dynamique: ${groupDynamic}`;
      }

      const res = await createDiscoveryTraceFn({
        data: {
          childId,
          sourceType,
          title: title.trim(),
          description: description.trim(),
          domain,
          perceivedDifficulty,
          attemptsCount: Number(attemptsCount) || 1,
          durationMinutes: Number(durationMinutes) || null,
          autonomyLevel,
          helpContext: contextualHelp || null,
          strategyUsed: contextualStrategy || null,
          outcomeStatus,
          proofImageUrl: proofImageUrl.trim() || null,
          nayaDialogue,
        },
      });

      if (res.success && res.trace) {
        toast.success(
          proofImageUrl
            ? "Exploration enregistrée ! Photo ajoutée au Portfolio et soumise à Naya."
            : "Exploration enregistrée ! Naya analyse l'initiative...",
        );
        onTraceCreated(res.trace);
        resetForm();
        onOpenChange(false);
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Erreur lors de l'enregistrement de l'exploration.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto rounded-3xl p-6 sm:p-8 bg-white border border-ink/10 shadow-2xl">
        <DialogHeader className="space-y-3">
          <div className="flex items-start gap-3.5">
            <div className={`size-12 rounded-2xl flex items-center justify-center shadow-sm shrink-0 border ${theme.iconBg}`}>
              <ArchetypeIcon className="size-6 stroke-[2.3]" />
            </div>
            <div className="space-y-0.5 flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${theme.badgeBg}`}>
                  {config.badgeText}
                </span>
                <span className="text-[11px] font-bold text-ink/40 uppercase">
                  Espace Découverte
                </span>
              </div>
              <DialogTitle className={`text-xl sm:text-2xl font-black text-ink leading-tight`}>
                {config.title}
              </DialogTitle>
              <DialogDescription className="text-xs sm:text-sm text-ink/70 font-medium leading-snug pt-0.5">
                {config.desc}
              </DialogDescription>
            </div>
          </div>

          {/* Stepper Indicator */}
          <div className="flex items-center gap-2 pt-2 border-b border-ink/10 pb-3">
            <div
              className={`flex-1 h-1.5 rounded-full transition-all ${
                step === 1 ? theme.stepperActive : "bg-emerald-600"
              }`}
            />
            <div
              className={`flex-1 h-1.5 rounded-full transition-all ${
                step === 2 ? theme.stepperActive : "bg-stone-200"
              }`}
            />
            <span className="text-[11px] font-black uppercase text-ink/50 pl-1">
              Étape {step}/2 : {step === 1 ? "L'Activité & Le Contexte" : "Dialogue Naya & Preuve"}
            </span>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 pt-1">
          {step === 1 && (
            <div className="space-y-5">
              {/* Titre & Domaine */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2 space-y-1.5">
                  <label className="text-xs font-bold text-ink flex items-center gap-1.5">
                    <span>Titre de la réalisation</span>
                    <span className="text-rose-500 font-bold">*</span>
                  </label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder={config.titlePlaceholder}
                    className={`rounded-xl border-ink/20 ${theme.focusRing}`}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-ink">Domaine principal</label>
                  <Select value={domain} onValueChange={(val: any) => setDomain(val)}>
                    <SelectTrigger className="rounded-xl border-ink/20">
                      <SelectValue placeholder="Choisir un domaine" />
                    </SelectTrigger>
                    <SelectContent>
                      {DISCOVERY_DOMAINS.map((d) => (
                        <SelectItem key={d} value={d}>
                          {DISCOVERY_DOMAIN_LABELS[d]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-ink flex items-center gap-1.5">
                  <span>Que s'est-il passé concrètement ?</span>
                  <span className="text-rose-500 font-bold">*</span>
                </label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={config.descPlaceholder}
                  rows={3}
                  className={`rounded-xl border-ink/20 ${theme.focusRing} resize-none`}
                  required
                />
              </div>

              {/* ── CHAMPS CONTEXTUALISÉS PAR ARCHÉTYPE ────────────────────── */}

              {/* 1. Spécifique : Je choisis */}
              {sourceType === "self_chosen" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-2xl bg-amber-50/60 border border-amber-200/70">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-amber-950 flex items-center gap-1.5">
                      <Sparkles className="size-3 text-amber-700" />
                      <span>Origine de l'étincelle</span>
                    </label>
                    <Select value={sparkOrigin} onValueChange={setSparkOrigin}>
                      <SelectTrigger className="h-9 rounded-xl border-amber-200 bg-white text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Inspiration du quotidien">Inspiration du quotidien / Nature</SelectItem>
                        <SelectItem value="Rêve / Histoire imaginaire">Rêve / Conte / Univers inventé</SelectItem>
                        <SelectItem value="Résolution d'un problème">Envie de résoudre un problème pratique</SelectItem>
                        <SelectItem value="Curiosité d'un objet">Attrait pour un objet ou matériau insolite</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-amber-950 flex items-center gap-1.5">
                      <Puzzle className="size-3 text-amber-700" />
                      <span>Ressources mobilisées</span>
                    </label>
                    <Select value={materialsUsed} onValueChange={setMaterialsUsed}>
                      <SelectTrigger className="h-9 rounded-xl border-amber-200 bg-white text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Objets recyclés & Récup">Carton, bouteilles & objets recyclés</SelectItem>
                        <SelectItem value="Dessin & Peinture">Feuilles, feutres, peinture & croquis</SelectItem>
                        <SelectItem value="Lego & Briques">Briques de construction / Lego</SelectItem>
                        <SelectItem value="Numérique & Code">Tablette, logiciel ou code créatif</SelectItem>
                        <SelectItem value="Objets de la maison">Éléments du quotidien & maison</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {/* 2. Spécifique : Je trouve */}
              {sourceType === "found_external" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-2xl bg-sky-50/60 border border-sky-200/70">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-sky-950 flex items-center gap-1.5">
                      <Lightbulb className="size-3 text-sky-700" />
                      <span>Origine de la découverte</span>
                    </label>
                    <Select value={discoveryOrigin} onValueChange={setDiscoveryOrigin}>
                      <SelectTrigger className="h-9 rounded-xl border-sky-200 bg-white text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Livre ou revue">Livre de sciences / Revue illustrée</SelectItem>
                        <SelectItem value="Défi scolaire ardu">Défi scolaire ardu ou énigme de classe</SelectItem>
                        <SelectItem value="Vidéo ou Web">Vidéo éducative / Défi sur Internet</SelectItem>
                        <SelectItem value="Ami ou proche">Proposé par un camarade ou un proche</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-sky-950 flex items-center gap-1.5">
                      <Target className="size-3 text-sky-700" />
                      <span>Stratégie d'investigation</span>
                    </label>
                    <Select value={investigationMethod} onValueChange={setInvestigationMethod}>
                      <SelectTrigger className="h-9 rounded-xl border-sky-200 bg-white text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Schémas & Croquis">Tracer des schémas & dessins</SelectItem>
                        <SelectItem value="Décomposition en étapes">Décomposer le problème en petites étapes</SelectItem>
                        <SelectItem value="Essais par élimination">Tester des hypothèses par élimination</SelectItem>
                        <SelectItem value="Inversion du problème">Prendre le problème à l'envers</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {/* 3. Spécifique : Je tente */}
              {sourceType === "open_sandbox" && (
                <div className="space-y-3 p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200/70">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-emerald-950 flex items-center gap-1.5">
                      <FlaskConical className="size-3.5 text-emerald-700" />
                      <span>Hypothèse ou intuition de départ</span>
                    </label>
                    <Input
                      value={initialHypothesis}
                      onChange={(e) => setInitialHypothesis(e.target.value)}
                      placeholder="Ex: Je pensais que l'objet lourd coulerait toujours plus vite..."
                      className="h-9 rounded-xl border-emerald-200 bg-white text-xs focus-visible:ring-emerald-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-emerald-950">
                      Variable(s) modifiée(s) au fil des essais
                    </label>
                    <Select value={variableModified} onValueChange={setVariableModified}>
                      <SelectTrigger className="h-9 rounded-xl border-emerald-200 bg-white text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Forme et surface">Forme, contour et surface de contact</SelectItem>
                        <SelectItem value="Masse et poids">Masse, poids et équilibrage</SelectItem>
                        <SelectItem value="Vitesse et inclinaison">Vitesse, angle d'inclinaison et distance</SelectItem>
                        <SelectItem value="Dosage et mélange">Dosage des ingrédients / matières</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {/* 4. Spécifique : Fab Lab */}
              {sourceType === "fablab_marathon" && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-2xl bg-indigo-50/60 border border-indigo-200/70">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-indigo-950 flex items-center gap-1">
                      <Hammer className="size-3 text-indigo-700" />
                      <span>Cadre de l'atelier</span>
                    </label>
                    <Select value={workshopLocation} onValueChange={setWorkshopLocation}>
                      <SelectTrigger className="h-9 rounded-xl border-indigo-200 bg-white text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Fab Lab / Tiers-lieu">Fab Lab / Tiers-lieu</SelectItem>
                        <SelectItem value="Maison / Garage">Maison / Atelier familial</SelectItem>
                        <SelectItem value="École / Club">École / Club sciences</SelectItem>
                        <SelectItem value="Événement / Marathon">Événement / Marathon Maker</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-indigo-950 flex items-center gap-1">
                      <Wrench className="size-3 text-indigo-700" />
                      <span>Outils manipulés</span>
                    </label>
                    <Input
                      value={toolsUsed}
                      onChange={(e) => setToolsUsed(e.target.value)}
                      placeholder="Ex: Ciseaux, pistolet colle, carton..."
                      className="h-9 rounded-xl border-indigo-200 bg-white text-xs focus-visible:ring-indigo-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-indigo-950">Encadrement</label>
                    <Select value={supervisionLevel} onValueChange={setSupervisionLevel}>
                      <SelectTrigger className="h-9 rounded-xl border-indigo-200 bg-white text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Totalement autonome">Totalement autonome sur l'outil</SelectItem>
                        <SelectItem value="Guidé sur les gestes délicats">Guidé sur gestes délicats</SelectItem>
                        <SelectItem value="Supervisé pour sécurité">Supervisé pour sécurité</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {/* 5. Spécifique : Projet d'Équipe */}
              {sourceType === "projet_collectif" && (
                <div className="space-y-3 p-4 rounded-2xl bg-rose-50/60 border border-rose-200/70">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2 space-y-1">
                      <label className="text-[11px] font-bold text-rose-950 flex items-center gap-1.5">
                        <Users className="size-3.5 text-rose-700" />
                        <span>Équipiers (@handles ou prénoms)</span>
                      </label>
                      <Input
                        value={teamHandles}
                        onChange={(e) => setTeamHandles(e.target.value)}
                        placeholder="Ex: @sarah_9, @leo_42, Malik..."
                        className="h-9 rounded-xl border-rose-200 bg-white text-xs placeholder:text-rose-300 focus-visible:ring-rose-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-rose-950">Taille du groupe</label>
                      <Select value={teamSize} onValueChange={setTeamSize}>
                        <SelectTrigger className="h-9 rounded-xl border-rose-200 bg-white text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Binôme (2)">Binôme (2 personnes)</SelectItem>
                          <SelectItem value="Petit groupe (3-4)">Petit groupe (3 à 4)</SelectItem>
                          <SelectItem value="Grande équipe (5+)">Grande équipe (5+)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-rose-950 flex items-center gap-1">
                        <Award className="size-3 text-rose-700" />
                        <span>Rôle naturel tenu par {childName}</span>
                      </label>
                      <Select value={childRole} onValueChange={setChildRole}>
                        <SelectTrigger className="h-9 rounded-xl border-rose-200 bg-white text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="💡 Idéateur / Concepteur">💡 Idéateur (apporte les idées)</SelectItem>
                          <SelectItem value="🔨 Bâtisseur / Artisan">🔨 Bâtisseur (fabrique et assemble)</SelectItem>
                          <SelectItem value="⏱️ Organisateur / Coordinateur">⏱️ Coordinateur (structure le temps)</SelectItem>
                          <SelectItem value="🤝 Médiateur / Rassembleur">🤝 Médiateur (harmonise le groupe)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-rose-950">Dynamique relationnelle</label>
                      <Select value={groupDynamic} onValueChange={setGroupDynamic}>
                        <SelectTrigger className="h-9 rounded-xl border-rose-200 bg-white text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Partage équitable et fluide">Partage équitable et fluide</SelectItem>
                          <SelectItem value="Rôles clairement définis">Rôles clairement définis</SelectItem>
                          <SelectItem value="Entraide spontanée continue">Entraide spontanée continue</SelectItem>
                          <SelectItem value="Concertation après désaccord">Concertation après désaccord</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              )}

              {/* Métriques d'Effort & Autonomie */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-2xl bg-stone-50 border border-ink/10">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-ink/70">Temps passé</label>
                  <Select
                    value={durationMinutes.toString()}
                    onValueChange={(val) => setDurationMinutes(Number(val))}
                  >
                    <SelectTrigger className="h-9 rounded-xl border-ink/20 text-xs bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="15">~15 minutes</SelectItem>
                      <SelectItem value="30">~30 minutes</SelectItem>
                      <SelectItem value="45">~45 minutes</SelectItem>
                      <SelectItem value="60">1 heure</SelectItem>
                      <SelectItem value="90">1h30</SelectItem>
                      <SelectItem value="120">2 heures ou +</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-ink/70">Nombre d'essais</label>
                  <Select
                    value={attemptsCount.toString()}
                    onValueChange={(val) => setAttemptsCount(Number(val))}
                  >
                    <SelectTrigger className="h-9 rounded-xl border-ink/20 text-xs bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 essai direct</SelectItem>
                      <SelectItem value="2">2 à 3 essais</SelectItem>
                      <SelectItem value="4">4 à 5 essais</SelectItem>
                      <SelectItem value="6">Beaucoup d'essais (6+)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-ink/70">Autonomie observée</label>
                  <Select
                    value={autonomyLevel}
                    onValueChange={(val: any) => setAutonomyLevel(val)}
                  >
                    <SelectTrigger className="h-9 rounded-xl border-ink/20 text-xs bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DISCOVERY_AUTONOMY_LEVELS.map((lvl) => (
                        <SelectItem key={lvl} value={lvl}>
                          {DISCOVERY_AUTONOMY_LABELS[lvl]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Résultat obtenu */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-ink">Résultat de l'activité</label>
                  <Select value={outcomeStatus} onValueChange={(val: any) => setOutcomeStatus(val)}>
                    <SelectTrigger className="rounded-xl border-ink/20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DISCOVERY_OUTCOMES.map((o) => (
                        <SelectItem key={o} value={o}>
                          {DISCOVERY_OUTCOME_LABELS[o].label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-ink">Difficulté ressentie</label>
                  <Select
                    value={perceivedDifficulty}
                    onValueChange={(val: any) => setPerceivedDifficulty(val)}
                  >
                    <SelectTrigger className="rounded-xl border-ink/20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="facile">Facile (très fluide)</SelectItem>
                      <SelectItem value="moyen">Moyen (adapté)</SelectItem>
                      <SelectItem value="difficile">Difficile (a demandé des efforts)</SelectItem>
                      <SelectItem value="eleve">Très difficile (défi corsé)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Bouton Suivant */}
              <div className="pt-2 flex justify-end">
                <Button
                  type="button"
                  onClick={() => {
                    if (!title.trim() || !description.trim()) {
                      toast.error("Veuillez renseigner le titre et la description avant de continuer.");
                      return;
                    }
                    setStep(2);
                  }}
                  className={`rounded-xl px-6 py-2.5 ${theme.buttonBg} text-white font-bold text-sm inline-flex items-center gap-2 cursor-pointer shadow-md transition-all`}
                >
                  <span>Passer au dialogue avec Naya</span>
                  <ArrowRight className="size-4" />
                </Button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              {/* Dialogue Pédagogique Spécifique */}
              <div className={`p-4 sm:p-5 rounded-2xl ${theme.dialogueBox} border space-y-4`}>
                <div className="flex items-center gap-2.5">
                  <NayaAvatar size="sm" />
                  <div>
                    <h4 className={`text-sm font-black ${theme.heading}`}>
                      Dialogue Métacognitif — L'Observateur Naya
                    </h4>
                    <p className="text-[11px] text-ink/75 font-medium">
                      Remplissez avec les propres mots de {childName} pour révéler ses mécanismes d'apprentissage.
                    </p>
                  </div>
                </div>

                <div className="space-y-3.5">
                  <div className="space-y-1">
                    <label className={`text-xs font-black ${theme.heading} block`}>
                      {config.q1Label}
                    </label>
                    <Textarea
                      value={q1}
                      onChange={(e) => setQ1(e.target.value)}
                      placeholder={config.q1Placeholder}
                      rows={2}
                      className={`rounded-xl border-ink/15 bg-white text-xs text-ink ${theme.focusRing} resize-none`}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className={`text-xs font-black ${theme.heading} block`}>
                      {config.q2Label}
                    </label>
                    <Textarea
                      value={q2}
                      onChange={(e) => setQ2(e.target.value)}
                      placeholder={config.q2Placeholder}
                      rows={2}
                      className={`rounded-xl border-ink/15 bg-white text-xs text-ink ${theme.focusRing} resize-none`}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className={`text-xs font-black ${theme.heading} block`}>
                      {config.q3Label}
                    </label>
                    <Textarea
                      value={q3}
                      onChange={(e) => setQ3(e.target.value)}
                      placeholder={config.q3Placeholder}
                      rows={2}
                      className={`rounded-xl border-ink/15 bg-white text-xs text-ink ${theme.focusRing} resize-none`}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className={`text-xs font-black ${theme.heading} block`}>
                      {config.q4Label}
                    </label>
                    <Textarea
                      value={q4}
                      onChange={(e) => setQ4(e.target.value)}
                      placeholder={config.q4Placeholder}
                      rows={2}
                      className={`rounded-xl border-ink/15 bg-white text-xs text-ink ${theme.focusRing} resize-none`}
                    />
                  </div>
                </div>
              </div>

              {/* Preuve Photo & Synchronisation Portfolio */}
              <div className="p-4 rounded-2xl bg-stone-50 border border-ink/10 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Camera className="size-4 text-brand" />
                    <label className="text-xs font-black uppercase text-ink">
                      Photo de la réalisation (Optionnelle)
                    </label>
                  </div>
                  <span className="text-[10px] font-bold text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded-full">
                    Galerie Portfolio
                  </span>
                </div>
                <p className="text-[11px] text-ink/60 font-medium">
                  Ajoutez une photo du résultat ou du matériel. Naya analysera sa cohérence avec la description et l'ajoutera directement aux artefacts du portfolio de {childName}.
                </p>

                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handleImageSelected}
                  className="hidden"
                />

                {proofImageUrl ? (
                  <div className="relative rounded-2xl border border-ink/15 overflow-hidden bg-surface max-h-48 flex items-center justify-center">
                    <img
                      src={proofImageUrl}
                      alt="Aperçu preuve"
                      className="w-full h-48 object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setProofImageUrl("")}
                      className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white hover:bg-black/80 transition-all cursor-pointer"
                      title="Supprimer la photo"
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-ink/20 hover:border-brand rounded-2xl p-4 text-center cursor-pointer transition-all bg-white hover:bg-stone-50/80 flex flex-col items-center justify-center gap-1.5"
                  >
                    {isCompressingImg ? (
                      <div className="flex items-center gap-2 text-xs font-bold text-brand">
                        <Loader2 className="size-4 animate-spin" />
                        <span>Optimisation de la photo...</span>
                      </div>
                    ) : (
                      <>
                        <UploadCloud className="size-6 text-ink/40" />
                        <span className="text-xs font-bold text-ink">
                          Prendre ou importer une photo
                        </span>
                        <span className="text-[10px] text-ink/50">
                          JPG, PNG, HEIC (iPhone) — compressé automatiquement
                        </span>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Boutons d'Action */}
              <div className="flex items-center justify-between pt-2 border-t border-ink/10">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(1)}
                  disabled={loading}
                  className="rounded-xl px-4 py-2 text-xs font-bold text-ink/70 inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft className="size-3.5" />
                  <span>Retour aux détails</span>
                </Button>

                <Button
                  type="submit"
                  disabled={loading || isCompressingImg}
                  className={`rounded-xl px-6 py-2.5 ${theme.buttonBg} text-white font-bold text-sm inline-flex items-center gap-2 cursor-pointer shadow-md transition-all`}
                >
                  {loading ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      <span>Transmission à Naya...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="size-4" />
                      <span>Enregistrer et Calibrer</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}
