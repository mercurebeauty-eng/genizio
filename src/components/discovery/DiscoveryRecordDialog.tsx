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
import { searchChildProfilesFn } from "@/lib/child-username.functions";
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

// â”€â”€ ThÃ¨me visuel et identitÃ© selon l'archÃ©type â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

  // Champs spÃ©cifiques 1. Je choisis
  const [sparkOrigin, setSparkOrigin] = useState("Inspiration du quotidien");
  const [materialsUsed, setMaterialsUsed] = useState("Objets recyclÃ©s & RÃ©cup");

  // Champs spÃ©cifiques 2. Je trouve
  const [discoveryOrigin, setDiscoveryOrigin] = useState("Livre ou revue");
  const [investigationMethod, setInvestigationMethod] = useState("SchÃ©mas & Croquis");

  // Champs spÃ©cifiques 3. Je tente
  const [initialHypothesis, setInitialHypothesis] = useState("");
  const [variableModified, setVariableModified] = useState("Forme et taille");

  // Champs spÃ©cifiques 4. Fab Lab
  const [workshopLocation, setWorkshopLocation] = useState("Fab Lab / Tiers-lieu");
  const [toolsUsed, setToolsUsed] = useState("Carton, colle & ciseaux");
  const [supervisionLevel, setSupervisionLevel] = useState("GuidÃ© sur les gestes dÃ©licats");

  // Champs spÃ©cifiques 5. Projet d'Ã‰quipe
  const [teamHandles, setTeamHandles] = useState("");
  const searchChildProfiles = useServerFn(searchChildProfilesFn);
  const [handleSearchResults, setHandleSearchResults] = useState<any[]>([]);
  const [showHandleSuggestions, setShowHandleSuggestions] = useState(false);
  const [teamSize, setTeamSize] = useState("Petit groupe (3-4)");
  const [childRole, setChildRole] = useState("ðŸ’¡ IdÃ©ateur / Concepteur");
  const [groupDynamic, setGroupDynamic] = useState("Partage Ã©quitable et fluide");

  // Questions mÃ©tacognitives Naya spÃ©cialisÃ©es (Ã‰tape 2)
  const [q1, setQ1] = useState("");
  const [q2, setQ2] = useState("");
  const [q3, setQ3] = useState("");
  const [q4, setQ4] = useState("");

  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const createDiscoveryTraceFn = useServerFn(createDiscoveryTrace);

  // RÃ©initialiser la source si initialSource change Ã  l'ouverture
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
    setMaterialsUsed("Objets recyclÃ©s & RÃ©cup");
    setDiscoveryOrigin("Livre ou revue");
    setInvestigationMethod("SchÃ©mas & Croquis");
    setInitialHypothesis("");
    setVariableModified("Forme et taille");
    setWorkshopLocation("Fab Lab / Tiers-lieu");
    setToolsUsed("Carton, colle & ciseaux");
    setSupervisionLevel("GuidÃ© sur les gestes dÃ©licats");
    setTeamHandles("");
    setTeamSize("Petit groupe (3-4)");
    setChildRole("ðŸ’¡ IdÃ©ateur / Concepteur");
    setGroupDynamic("Partage Ã©quitable et fluide");
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
      toast.success("Photo prÃªte ! Elle sera synchronisÃ©e dans la galerie du portfolio.");
    } catch (err: any) {
      console.error("Erreur compression image :", err);
      toast.error(err?.message || "Impossible de charger cette image.");
    } finally {
      setIsCompressingImg(false);
    }
  };

  // Configurations complÃ¨tes et riches par source
  const getSourceConfig = (src: DiscoverySourceType) => {
    switch (src) {
      case "self_chosen":
        return {
          title: "ðŸš€ Je choisis â€” Initiative & CrÃ©ation",
          badgeText: "Initiative personnelle",
          desc: `Racontez le projet, le bricolage ou l'histoire que ${childName} a imaginÃ© et crÃ©Ã© de son propre Ã©lan.`,
          titlePlaceholder: "Ex: Maquette de catapulte en bois, conte illustrÃ© de 6 pages, circuit Ã  billes...",
          descPlaceholder: "DÃ©crivez ce qu'il/elle a imaginÃ©, comment il/elle s'y est pris(e) et le rÃ©sultat obtenu...",
          q1Label: "1. D'oÃ¹ t'est venue cette idÃ©e originale ?",
          q1Placeholder: "Ex: J'ai pensÃ© Ã  Ã§a en observant les oiseaux / en voulant crÃ©er un jeu pour ma sÅ“ur...",
          q2Label: "2. Par quoi as-tu commencÃ© pour fabriquer ou crÃ©er ?",
          q2Placeholder: "Ex: J'ai d'abord fait un plan sur papier, puis rassemblÃ© les piÃ¨ces en carton...",
          q3Label: "3. OÃ¹ as-tu rencontrÃ© le plus grand obstacle et comment as-tu insistÃ© ?",
          q3Placeholder: "Ex: Le mÃ©canisme se bloquait, alors j'ai changÃ© l'Ã©lastique et poncÃ© les bords...",
          q4Label: "4. De quoi es-tu le plus fier et que sais-tu faire maintenant ?",
          q4Placeholder: "Ex: Le fait que Ã§a tire droit et fonctionne tout seul !",
        };
      case "found_external":
        return {
          title: "ðŸ” Je trouve â€” CuriositÃ© & DÃ©fi Externe",
          badgeText: "CuriositÃ© externe",
          desc: `Racontez l'Ã©nigme, le casse-tÃªte ou le dÃ©fi ardu que ${childName} a dÃ©couvert ailleurs et a voulu rÃ©soudre.`,
          titlePlaceholder: "Ex: Ã‰nigme des 9 points reliÃ©s, casse-tÃªte des allumettes, puzzle logique des vases...",
          descPlaceholder: "Expliquez quel Ã©tait l'Ã©noncÃ© du problÃ¨me et comment il a rÃ©ussi Ã  le dÃ©cortiquer...",
          q1Label: "1. OÃ¹ as-tu dÃ©couvert ce dÃ©fi et pourquoi t'a-t-il intriguÃ© ?",
          q1Placeholder: "Ex: Vu dans un livre de maths amusantes / proposÃ© par un camarade de classe...",
          q2Label: "2. Qu'est-ce qui te paraissait impossible ou mystÃ©rieux au tout dÃ©but ?",
          q2Placeholder: "Ex: Je ne voyais pas comment relier tous les points sans lever le crayon...",
          q3Label: "3. Ã€ quel moment as-tu eu le dÃ©clic pour progresser ?",
          q3Placeholder: "Ex: En essayant de sortir du cadre imaginaire du carrÃ© tracÃ©...",
          q4Label: "4. Quel conseil donnerais-tu Ã  quelqu'un qui veut rÃ©soudre cette mÃªme Ã©nigme ?",
          q4Placeholder: "Ex: Ne pas rester bloquÃ© dans les lignes et tester des directions inattendues !",
        };
      case "open_sandbox":
        return {
          title: "ðŸ§ª Je tente â€” Laboratoire Libre & Essais-Erreurs",
          badgeText: "Laboratoire libre",
          desc: `Racontez l'expÃ©rience libre, le test spontanÃ© d'hypothÃ¨ses et les essais de ${childName}.`,
          titlePlaceholder: "Ex: Test de flottabilitÃ© avec des objets insolites, hauteur max d'une tour en spaghettis...",
          descPlaceholder: "DÃ©crivez ce qu'il/elle a cherchÃ© Ã  tester, les manipulations faites et ce qui s'est produit...",
          q1Label: "1. Quelle Ã©tait ton intuition ou ton hypothÃ¨se au dÃ©part ?",
          q1Placeholder: "Ex: Je pensais qu'un objet lourd coulerait toujours plus vite qu'un objet lÃ©ger...",
          q2Label: "2. Comment t'y es-tu pris concrÃ¨tement pour tester et mesurer ?",
          q2Placeholder: "Ex: J'ai rempli la bassine d'eau et prÃ©parÃ© 6 objets de tailles diffÃ©rentes...",
          q3Label: "3. Y a-t-il eu une surprise ou une erreur qui t'a appris quelque chose ?",
          q3Placeholder: "Ex: La boule de pÃ¢te coulait, mais quand je l'ai aplatie en barque, elle flottait !",
          q4Label: "4. Qu'as-tu appris que tu n'aurais pas devinÃ© sans faire le test ?",
          q4Placeholder: "Ex: Que la forme et la surface de contact comptent autant que le poids !",
        };
      case "fablab_marathon":
        return {
          title: "âš™ï¸ Fab Lab & Atelier â€” Immersion Outils & MatÃ©riaux",
          badgeText: "Atelier & Fabrication",
          desc: `Racontez l'activitÃ© de fabrication concrÃ¨te avec outils rÃ©els menÃ©e par ${childName} en atelier ou maker space.`,
          titlePlaceholder: "Ex: Horloge en contreplaquÃ© assemblÃ©e, voiturette solaire, sculpture articulÃ©e...",
          descPlaceholder: "DÃ©crivez les Ã©tapes de fabrication, les matÃ©riaux transformÃ©s et les gestes techniques appris...",
          q1Label: "1. Quel Ã©tait le cadre de cet atelier et quel outil t'a le plus marquÃ© ?",
          q1Placeholder: "Ex: Ã€ l'atelier de bricolage du quartier, j'ai manipulÃ© la scie Ã  chantourner...",
          q2Label: "2. Quel geste technique ou rÃ¨gle de sÃ©curitÃ© as-tu appris Ã  maÃ®triser ?",
          q2Placeholder: "Ex: Porter les lunettes de protection et tenir la planche fermement avec le serre-joint...",
          q3Label: "3. Comment as-tu gÃ©rÃ© les imprÃ©vus de fabrication ou de matiÃ¨re ?",
          q3Placeholder: "Ex: Une piÃ¨ce s'est fendue au perÃ§age, alors j'ai recalculÃ© la distance du bord...",
          q4Label: "4. Comment pourrais-tu rÃ©utiliser cette technique pour fabriquer un autre objet ?",
          q4Placeholder: "Ex: Je pourrais fabriquer un nichoir pour oiseaux avec les mÃªmes assemblages !",
        };
      case "projet_collectif":
      default:
        return {
          title: "ðŸ‘¥ Projet d'Ã‰quipe â€” CoopÃ©ration & Guilde",
          badgeText: "CoopÃ©ration & Escouade",
          desc: `Racontez le projet collectif menÃ© Ã  plusieurs, mettant en valeur l'entraide et les talents partagÃ©s.`,
          titlePlaceholder: "Ex: DÃ©cor et piÃ¨ce de thÃ©Ã¢tre de marionnettes Ã  3, base lunaire gÃ©ante...",
          descPlaceholder: "DÃ©crivez le projet commun, l'organisation de l'Ã©quipe et la rÃ©partition des missions...",
          q1Label: "1. Comment votre Ã©quipe s'est-elle formÃ©e et quel Ã©tait votre but commun ?",
          q1Placeholder: "Ex: Avec Sarah et LÃ©o, on voulait construire un pont capable de supporter nos livres...",
          q2Label: "2. Quel rÃ´le as-tu pris naturellement et comment tes talents ont complÃ©tÃ© l'Ã©quipe ?",
          q2Placeholder: "Ex: J'ai dessinÃ© les plans et calculÃ© les poutres pendant que Sarah dÃ©coupait...",
          q3Label: "3. S'il y a eu un dÃ©saccord, comment avez-vous trouvÃ© un compromis ?",
          q3Placeholder: "Ex: On hÃ©sitait entre deux formes d'arches, on a testÃ© les deux sur une maquette...",
          q4Label: "4. Qu'avez-vous rÃ©ussi ensemble qu'aucun de vous n'aurait pu faire tout seul ?",
          q4Placeholder: "Ex: Le projet Ã©tait trop grand pour un seul aprÃ¨s-midi, Ã  3 on a fini en 1h !",
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
      // Construction du dialogue mÃ©tacognitif
      const nayaDialogue = [];
      if (q1.trim()) nayaDialogue.push({ question: config.q1Label, answer: q1.trim() });
      if (q2.trim()) nayaDialogue.push({ question: config.q2Label, answer: q2.trim() });
      if (q3.trim()) nayaDialogue.push({ question: config.q3Label, answer: q3.trim() });
      if (q4.trim()) nayaDialogue.push({ question: config.q4Label, answer: q4.trim() });

      // Enrichissement des contextes selon l'archÃ©type
      let contextualHelp = "";
      let contextualStrategy = "";

      if (sourceType === "self_chosen") {
        contextualHelp = `MatÃ©riaux: ${materialsUsed}`;
        contextualStrategy = `Ã‰tincelle: ${sparkOrigin}`;
      } else if (sourceType === "found_external") {
        contextualHelp = `Origine: ${discoveryOrigin}`;
        contextualStrategy = `MÃ©thode: ${investigationMethod}`;
      } else if (sourceType === "open_sandbox") {
        contextualHelp = initialHypothesis.trim() ? `HypothÃ¨se: ${initialHypothesis.trim()}` : "HypothÃ¨se spontanÃ©e";
        contextualStrategy = `Variables testÃ©es: ${variableModified}`;
      } else if (sourceType === "fablab_marathon") {
        contextualHelp = `Lieu: ${workshopLocation} | Encadrement: ${supervisionLevel}`;
        contextualStrategy = `Outils: ${toolsUsed}`;
      } else if (sourceType === "projet_collectif") {
        contextualHelp = `Ã‰quipe (${teamSize}): ${teamHandles.trim() || "Pairs"}`;
        contextualStrategy = `RÃ´le: ${childRole} | Dynamique: ${groupDynamic}`;
      }

            const extractedHandles = teamHandles.match(/@[\w]+/g) || [];

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
          taggedHandles: extractedHandles,
        },
      });

      if (res.success && res.trace) {
        toast.success(
          proofImageUrl
            ? "Exploration enregistrÃ©e ! Photo ajoutÃ©e au Portfolio et soumise Ã  Naya."
            : "Exploration enregistrÃ©e ! Naya analyse l'initiative...",
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
                  Espace DÃ©couverte
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
              Ã‰tape {step}/2 : {step === 1 ? "L'ActivitÃ© & Le Contexte" : "Dialogue Naya & Preuve"}
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
                    <span>Titre de la rÃ©alisation</span>
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
                  <span>Que s'est-il passÃ© concrÃ¨tement ?</span>
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

              {/* â”€â”€ CHAMPS CONTEXTUALISÃ‰S PAR ARCHÃ‰TYPE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}

              {/* 1. SpÃ©cifique : Je choisis */}
              {sourceType === "self_chosen" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-2xl bg-amber-50/60 border border-amber-200/70">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-amber-950 flex items-center gap-1.5">
                      <Sparkles className="size-3 text-amber-700" />
                      <span>Origine de l'Ã©tincelle</span>
                    </label>
                    <Select value={sparkOrigin} onValueChange={setSparkOrigin}>
                      <SelectTrigger className="h-9 rounded-xl border-amber-200 bg-white text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Inspiration du quotidien">Inspiration du quotidien / Nature</SelectItem>
                        <SelectItem value="RÃªve / Histoire imaginaire">RÃªve / Conte / Univers inventÃ©</SelectItem>
                        <SelectItem value="RÃ©solution d'un problÃ¨me">Envie de rÃ©soudre un problÃ¨me pratique</SelectItem>
                        <SelectItem value="CuriositÃ© d'un objet">Attrait pour un objet ou matÃ©riau insolite</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-amber-950 flex items-center gap-1.5">
                      <Puzzle className="size-3 text-amber-700" />
                      <span>Ressources mobilisÃ©es</span>
                    </label>
                    <Select value={materialsUsed} onValueChange={setMaterialsUsed}>
                      <SelectTrigger className="h-9 rounded-xl border-amber-200 bg-white text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Objets recyclÃ©s & RÃ©cup">Carton, bouteilles & objets recyclÃ©s</SelectItem>
                        <SelectItem value="Dessin & Peinture">Feuilles, feutres, peinture & croquis</SelectItem>
                        <SelectItem value="Lego & Briques">Briques de construction / Lego</SelectItem>
                        <SelectItem value="NumÃ©rique & Code">Tablette, logiciel ou code crÃ©atif</SelectItem>
                        <SelectItem value="Objets de la maison">Ã‰lÃ©ments du quotidien & maison</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {/* 2. SpÃ©cifique : Je trouve */}
              {sourceType === "found_external" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-2xl bg-sky-50/60 border border-sky-200/70">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-sky-950 flex items-center gap-1.5">
                      <Lightbulb className="size-3 text-sky-700" />
                      <span>Origine de la dÃ©couverte</span>
                    </label>
                    <Select value={discoveryOrigin} onValueChange={setDiscoveryOrigin}>
                      <SelectTrigger className="h-9 rounded-xl border-sky-200 bg-white text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Livre ou revue">Livre de sciences / Revue illustrÃ©e</SelectItem>
                        <SelectItem value="DÃ©fi scolaire ardu">DÃ©fi scolaire ardu ou Ã©nigme de classe</SelectItem>
                        <SelectItem value="VidÃ©o ou Web">VidÃ©o Ã©ducative / DÃ©fi sur Internet</SelectItem>
                        <SelectItem value="Ami ou proche">ProposÃ© par un camarade ou un proche</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-sky-950 flex items-center gap-1.5">
                      <Target className="size-3 text-sky-700" />
                      <span>StratÃ©gie d'investigation</span>
                    </label>
                    <Select value={investigationMethod} onValueChange={setInvestigationMethod}>
                      <SelectTrigger className="h-9 rounded-xl border-sky-200 bg-white text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SchÃ©mas & Croquis">Tracer des schÃ©mas & dessins</SelectItem>
                        <SelectItem value="DÃ©composition en Ã©tapes">DÃ©composer le problÃ¨me en petites Ã©tapes</SelectItem>
                        <SelectItem value="Essais par Ã©limination">Tester des hypothÃ¨ses par Ã©limination</SelectItem>
                        <SelectItem value="Inversion du problÃ¨me">Prendre le problÃ¨me Ã  l'envers</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {/* 3. SpÃ©cifique : Je tente */}
              {sourceType === "open_sandbox" && (
                <div className="space-y-3 p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200/70">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-emerald-950 flex items-center gap-1.5">
                      <FlaskConical className="size-3.5 text-emerald-700" />
                      <span>HypothÃ¨se ou intuition de dÃ©part</span>
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
                      Variable(s) modifiÃ©e(s) au fil des essais
                    </label>
                    <Select value={variableModified} onValueChange={setVariableModified}>
                      <SelectTrigger className="h-9 rounded-xl border-emerald-200 bg-white text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Forme et surface">Forme, contour et surface de contact</SelectItem>
                        <SelectItem value="Masse et poids">Masse, poids et Ã©quilibrage</SelectItem>
                        <SelectItem value="Vitesse et inclinaison">Vitesse, angle d'inclinaison et distance</SelectItem>
                        <SelectItem value="Dosage et mÃ©lange">Dosage des ingrÃ©dients / matiÃ¨res</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {/* 4. SpÃ©cifique : Fab Lab */}
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
                        <SelectItem value="Ã‰cole / Club">Ã‰cole / Club sciences</SelectItem>
                        <SelectItem value="Ã‰vÃ©nement / Marathon">Ã‰vÃ©nement / Marathon Maker</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-indigo-950 flex items-center gap-1">
                      <Wrench className="size-3 text-indigo-700" />
                      <span>Outils manipulÃ©s</span>
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
                        <SelectItem value="GuidÃ© sur les gestes dÃ©licats">GuidÃ© sur gestes dÃ©licats</SelectItem>
                        <SelectItem value="SupervisÃ© pour sÃ©curitÃ©">SupervisÃ© pour sÃ©curitÃ©</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {/* 5. SpÃ©cifique : Projet d'Ã‰quipe */}
              {sourceType === "projet_collectif" && (
                <div className="space-y-3 p-4 rounded-2xl bg-rose-50/60 border border-rose-200/70">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2 space-y-1">
                      <label className="text-[11px] font-bold text-rose-950 flex items-center gap-1.5">
                        <Users className="size-3.5 text-rose-700" />
                        <span>Ã‰quipiers (@handles ou prÃ©noms)</span>
                      </label>
                      <div className="relative">
                        <Input
                          value={teamHandles}
                          onChange={(e) => {
                            const val = e.target.value;
                            setTeamHandles(val);
                            const match = val.match(/@([\w]+)$/);
                            if (match) {
                              setShowHandleSuggestions(true);
                              searchChildProfiles({ data: match[0] }).then(res => setHandleSearchResults(Array.isArray(res) ? res : [])).catch(e => { console.error(e); setHandleSearchResults([]); });
                            } else {
                              setShowHandleSuggestions(false);
                            }
                          }}
                          placeholder="Ex: @sarah_9, @leo_42, Malik..."
                          className="h-9 rounded-xl border-rose-200 bg-white text-xs placeholder:text-rose-300 focus-visible:ring-rose-500"
                        />
                        {showHandleSuggestions && handleSearchResults.length > 0 && (
                          <div className="absolute z-10 mt-1 w-full rounded-xl border border-rose-100 bg-white shadow-lg overflow-hidden">
                            {handleSearchResults.map((profile) => (
                              <button
                                key={profile.id}
                                type="button"
                                className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-rose-50"
                                onClick={() => {
                                  const val = teamHandles.replace(/@([\w]+)$/, `@${profile.username} `);
                                  setTeamHandles(val);
                                  setShowHandleSuggestions(false);
                                }}
                              >
                                <div className={`size-5 rounded-full flex items-center justify-center ${profile.avatar_color === "brand" ? "bg-brand" : profile.avatar_color === "leaf" ? "bg-leaf" : profile.avatar_color === "sky" ? "bg-sky" : "bg-ink"}`}>
                                  <span className="text-[9px] font-bold text-white">{profile.name[0]?.toUpperCase()}</span>
                                </div>
                                <div className="flex flex-col">
                                  <span className="text-xs font-bold text-rose-950">{profile.name}</span>
                                  <span className="text-[10px] text-rose-600">@{profile.username}</span>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-rose-950">Taille du groupe</label>
                      <Select value={teamSize} onValueChange={setTeamSize}>
                        <SelectTrigger className="h-9 rounded-xl border-rose-200 bg-white text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="BinÃ´me (2)">BinÃ´me (2 personnes)</SelectItem>
                          <SelectItem value="Petit groupe (3-4)">Petit groupe (3 Ã  4)</SelectItem>
                          <SelectItem value="Grande Ã©quipe (5+)">Grande Ã©quipe (5+)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-rose-950 flex items-center gap-1">
                        <Award className="size-3 text-rose-700" />
                        <span>RÃ´le naturel tenu par {childName}</span>
                      </label>
                      <Select value={childRole} onValueChange={setChildRole}>
                        <SelectTrigger className="h-9 rounded-xl border-rose-200 bg-white text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ðŸ’¡ IdÃ©ateur / Concepteur">ðŸ’¡ IdÃ©ateur (apporte les idÃ©es)</SelectItem>
                          <SelectItem value="ðŸ”¨ BÃ¢tisseur / Artisan">ðŸ”¨ BÃ¢tisseur (fabrique et assemble)</SelectItem>
                          <SelectItem value="â±ï¸ Organisateur / Coordinateur">â±ï¸ Coordinateur (structure le temps)</SelectItem>
                          <SelectItem value="ðŸ¤ MÃ©diateur / Rassembleur">ðŸ¤ MÃ©diateur (harmonise le groupe)</SelectItem>
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
                          <SelectItem value="Partage Ã©quitable et fluide">Partage Ã©quitable et fluide</SelectItem>
                          <SelectItem value="RÃ´les clairement dÃ©finis">RÃ´les clairement dÃ©finis</SelectItem>
                          <SelectItem value="Entraide spontanÃ©e continue">Entraide spontanÃ©e continue</SelectItem>
                          <SelectItem value="Concertation aprÃ¨s dÃ©saccord">Concertation aprÃ¨s dÃ©saccord</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              )}

              {/* MÃ©triques d'Effort & Autonomie */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-2xl bg-stone-50 border border-ink/10">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-ink/70">Temps passÃ©</label>
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
                      <SelectItem value="2">2 Ã  3 essais</SelectItem>
                      <SelectItem value="4">4 Ã  5 essais</SelectItem>
                      <SelectItem value="6">Beaucoup d'essais (6+)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-ink/70">Autonomie observÃ©e</label>
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

              {/* RÃ©sultat obtenu */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-ink">RÃ©sultat de l'activitÃ©</label>
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
                  <label className="text-xs font-bold text-ink">DifficultÃ© ressentie</label>
                  <Select
                    value={perceivedDifficulty}
                    onValueChange={(val: any) => setPerceivedDifficulty(val)}
                  >
                    <SelectTrigger className="rounded-xl border-ink/20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="facile">Facile (trÃ¨s fluide)</SelectItem>
                      <SelectItem value="moyen">Moyen (adaptÃ©)</SelectItem>
                      <SelectItem value="difficile">Difficile (a demandÃ© des efforts)</SelectItem>
                      <SelectItem value="eleve">TrÃ¨s difficile (dÃ©fi corsÃ©)</SelectItem>
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
              {/* Dialogue PÃ©dagogique SpÃ©cifique */}
              <div className={`p-4 sm:p-5 rounded-2xl ${theme.dialogueBox} border space-y-4`}>
                <div className="flex items-center gap-2.5">
                  <NayaAvatar size="sm" />
                  <div>
                    <h4 className={`text-sm font-black ${theme.heading}`}>
                      Dialogue MÃ©tacognitif â€” L'Observateur Naya
                    </h4>
                    <p className="text-[11px] text-ink/75 font-medium">
                      Remplissez avec les propres mots de {childName} pour rÃ©vÃ©ler ses mÃ©canismes d'apprentissage.
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
                      Photo de la rÃ©alisation (Optionnelle)
                    </label>
                  </div>
                  <span className="text-[10px] font-bold text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded-full">
                    Galerie Portfolio
                  </span>
                </div>
                <p className="text-[11px] text-ink/60 font-medium">
                  Ajoutez une photo du rÃ©sultat ou du matÃ©riel. Naya analysera sa cohÃ©rence avec la description et l'ajoutera directement aux artefacts du portfolio de {childName}.
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
                      alt="AperÃ§u preuve"
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
                          JPG, PNG, HEIC (iPhone) â€” compressÃ© automatiquement
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
                  <span>Retour aux dÃ©tails</span>
                </Button>

                <Button
                  type="submit"
                  disabled={loading || isCompressingImg}
                  className={`rounded-xl px-6 py-2.5 ${theme.buttonBg} text-white font-bold text-sm inline-flex items-center gap-2 cursor-pointer shadow-md transition-all`}
                >
                  {loading ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      <span>Transmission Ã  Naya...</span>
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

