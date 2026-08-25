import React, { useState, useRef } from "react";
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
} from "@/lib/discovery.functions";
import { NayaAvatar } from "@/components/NayaAvatar";
import {
  Sparkles,
  Compass,
  Lightbulb,
  Beaker,
  CheckCircle2,
  Loader2,
  ArrowRight,
  ArrowLeft,
  Camera,
  Image as ImageIcon,
  HelpCircle,
  UploadCloud,
  X,
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
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [domain, setDomain] = useState<DiscoveryDomain>("logique");
  const [perceivedDifficulty, setPerceivedDifficulty] = useState<DiscoveryPerceivedDifficulty>("moyen");
  const [attemptsCount, setAttemptsCount] = useState<number>(1);
  const [durationMinutes, setDurationMinutes] = useState<number>(30);
  const [autonomyLevel, setAutonomyLevel] = useState<DiscoveryAutonomyLevel>("totalement_seul");
  const [helpContext, setHelpContext] = useState("");
  const [strategyUsed, setStrategyUsed] = useState("");
  const [outcomeStatus, setOutcomeStatus] = useState<DiscoveryOutcomeStatus>("fonctionnel");
  const [proofImageUrl, setProofImageUrl] = useState("");
  const [isCompressingImg, setIsCompressingImg] = useState(false);

  // Questions métacognitives Naya spécialisées par source
  const [q1, setQ1] = useState("");
  const [q2, setQ2] = useState("");
  const [q3, setQ3] = useState("");
  const [q4, setQ4] = useState("");

  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Réinitialiser la source si initialSource change à l'ouverture
  React.useEffect(() => {
    if (open) {
      setSourceType(initialSource);
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
    setHelpContext("");
    setStrategyUsed("");
    setOutcomeStatus("fonctionnel");
    setProofImageUrl("");
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

  const getSourceConfig = (src: DiscoverySourceType) => {
    switch (src) {
      case "self_chosen":
        return {
          title: "🚀 Je choisis — Initiative & Création",
          badgeText: "Initiative personnelle",
          desc: `Racontez le projet ou la création que ${childName} a inventé de son propre élan.`,
          titlePlaceholder: "Ex: Maquette de catapulte en bois, conte illustré, circuit à billes géant...",
          descPlaceholder: "Décrivez ce qu'il/elle a imaginé et comment il/elle s'y est pris(e)...",
          q1Label: "1. D'où t'est venue cette idée originale ?",
          q1Placeholder: "Ex: J'ai pensé à ça en observant les oiseaux / en voulant régler un problème...",
          q2Label: "2. Par quoi as-tu commencé pour fabriquer / créer ?",
          q2Placeholder: "Ex: J'ai d'abord fait un croquis sur papier / trié mes pièces...",
          q3Label: "3. Où as-tu rencontré le plus grand obstacle et comment as-tu insisté ?",
          q3Placeholder: "Ex: Le bras cassait à chaque tir, alors j'ai renforcé la base avec un double nœud...",
          q4Label: "4. De quoi es-tu le plus fier dans ce résultat ?",
          q4Placeholder: "Ex: Le fait que ça fonctionne sans s'écrouler / les détails que j'ai ajoutés...",
        };
      case "found_external":
        return {
          title: "🔍 Je trouve — Curiosité & Défi Externe",
          badgeText: "Défi trouvé ailleurs",
          desc: `Racontez le problème ou l'expérience que ${childName} a découvert ailleurs (livre, web, école...) et a voulu explorer.`,
          titlePlaceholder: "Ex: Énigme des 9 points reliés, casse-tête de maths vu en vidéo, illusion d'optique...",
          descPlaceholder: "Expliquez quel était le défi et pourquoi il a captivé son attention...",
          q1Label: "1. Où as-tu découvert ce défi et qu'est-ce qui t'a donné envie d'essayer ?",
          q1Placeholder: "Ex: Vu dans un livre de sciences à la bibliothèque / proposé par un ami...",
          q2Label: "2. Qu'est-ce qui te paraissait difficile ou mystérieux au premier abord ?",
          q2Placeholder: "Ex: Je ne voyais pas du tout comment relier les points sans lever le crayon...",
          q3Label: "3. À quel endroit as-tu bloqué et comment as-tu trouvé l'astuce ?",
          q3Placeholder: "Ex: J'ai compris qu'il fallait dépasser le carré imaginaire pour trouver l'angle...",
          q4Label: "4. As-tu réussi à aller plus loin ou à résoudre le problème différemment ?",
          q4Placeholder: "Ex: J'ai ensuite testé avec 16 points pour voir si la règle marchait encore...",
        };
      case "open_sandbox":
      default:
        return {
          title: "🧪 Je tente — Laboratoire & Expérimentation Libre",
          badgeText: "Laboratoire libre",
          desc: `Racontez l'expérience spontanée ou le test libre que ${childName} a mené sans consigne imposée.`,
          titlePlaceholder: "Ex: Test de flottabilité avec des objets insolites, construction de la plus haute tour en cartes...",
          descPlaceholder: "Décrivez ce qu'il/elle a cherché à tester ou vérifier par lui/elle-même...",
          q1Label: "1. Quelle était ton intuition ou ton hypothèse au départ ?",
          q1Placeholder: "Ex: Je pensais qu'un objet lourd coulerait toujours plus vite qu'un léger...",
          q2Label: "2. Comment t'y es-tu pris concrètement pour tester ?",
          q2Placeholder: "Ex: J'ai rempli la baignoire et préparé un chronomètre et 6 objets différents...",
          q3Label: "3. Y a-t-il eu une surprise ou une erreur qui t'a appris quelque chose ?",
          q3Placeholder: "Ex: La pâte à modeler coulait en boule, mais flottait quand je l'aplatissais en barque !",
          q4Label: "4. Qu'as-tu appris ou conclu de cette expérience ?",
          q4Placeholder: "Ex: Que la forme de l'objet est aussi importante que son poids...",
        };
    }
  };

  const config = getSourceConfig(sourceType);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      toast.error("Veuillez renseigner au moins un titre et une description.");
      return;
    }

    setLoading(true);
    try {
      const { createDiscoveryTrace } = await import("@/lib/discovery.functions");

      const nayaDialogue = [];
      if (q1.trim()) nayaDialogue.push({ question: config.q1Label, answer: q1.trim() });
      if (q2.trim()) nayaDialogue.push({ question: config.q2Label, answer: q2.trim() });
      if (q3.trim()) nayaDialogue.push({ question: config.q3Label, answer: q3.trim() });
      if (q4.trim()) nayaDialogue.push({ question: config.q4Label, answer: q4.trim() });

      const res = await createDiscoveryTrace({
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
          helpContext: helpContext.trim() || null,
          strategyUsed: strategyUsed.trim() || null,
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl p-6 sm:p-8 bg-white border border-ink/10 shadow-2xl">
        <DialogHeader className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="size-11 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-800 shadow-sm shrink-0">
              {sourceType === "self_chosen" && <Sparkles className="size-6 text-amber-700" />}
              {sourceType === "found_external" && <Lightbulb className="size-6 text-sky-700" />}
              {sourceType === "open_sandbox" && <Beaker className="size-6 text-emerald-700" />}
            </div>
            <div>
              <DialogTitle className="text-xl sm:text-2xl font-black text-ink">
                {config.title}
              </DialogTitle>
              <DialogDescription className="text-xs sm:text-sm text-ink/70 font-medium mt-0.5">
                {config.desc}
              </DialogDescription>
            </div>
          </div>

          {/* Stepper Indicator */}
          <div className="flex items-center gap-2 pt-2 border-b border-ink/10 pb-3">
            <div
              className={`flex-1 h-1.5 rounded-full transition-all ${
                step === 1 ? "bg-amber-600" : "bg-emerald-600"
              }`}
            />
            <div
              className={`flex-1 h-1.5 rounded-full transition-all ${
                step === 2 ? "bg-amber-600" : "bg-stone-200"
              }`}
            />
            <span className="text-[11px] font-black uppercase text-ink/50 pl-1">
              Étape {step}/2 : {step === 1 ? "L'Activité" : "Dialogue & Preuve"}
            </span>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 pt-2">
          {step === 1 && (
            <div className="space-y-5">
              {/* Sélecteur de Source (permet de basculer si besoin) */}
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-wider text-ink/60">
                  Type d'exploration
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {DISCOVERY_SOURCES.map((src) => {
                    const isSelected = sourceType === src;
                    const meta = DISCOVERY_SOURCE_LABELS[src];
                    return (
                      <button
                        key={src}
                        type="button"
                        onClick={() => setSourceType(src)}
                        className={`p-3 rounded-2xl text-left border-2 transition-all cursor-pointer flex flex-col justify-between gap-1 ${
                          isSelected
                            ? "border-amber-600 bg-amber-500/10 shadow-sm ring-2 ring-amber-500/20"
                            : "border-ink/10 hover:border-ink/20 bg-stone-50"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-ink">{meta.label}</span>
                          {src === "self_chosen" && <Sparkles className="size-3.5 text-amber-600" />}
                          {src === "found_external" && <Lightbulb className="size-3.5 text-sky-600" />}
                          {src === "open_sandbox" && <Beaker className="size-3.5 text-emerald-600" />}
                        </div>
                        <span className="text-[10px] text-ink/60 font-medium">
                          {meta.badge}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Titre & Domaine */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2 space-y-1.5">
                  <label className="text-xs font-bold text-ink flex items-center gap-1.5">
                    <span>Titre de l'exploration</span>
                    <span className="text-rose-500 font-bold">*</span>
                  </label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder={config.titlePlaceholder}
                    className="rounded-xl border-ink/20 focus-visible:ring-amber-500"
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
                  className="rounded-xl border-ink/20 focus-visible:ring-amber-500 resize-none"
                  required
                />
              </div>

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
                          {DISCOVERY_OUTCOME_LABELS[o]}
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
                      <SelectItem value="tres_difficile">Très difficile (défi corsé)</SelectItem>
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
                  className="rounded-xl px-6 py-2.5 bg-amber-700 hover:bg-amber-800 text-white font-bold text-sm inline-flex items-center gap-2 cursor-pointer shadow-md"
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
              <div className="p-4 sm:p-5 rounded-2xl bg-amber-50/80 border border-amber-200/80 space-y-4">
                <div className="flex items-center gap-2.5">
                  <NayaAvatar size="sm" />
                  <div>
                    <h4 className="text-sm font-black text-amber-950">
                      Dialogue Métacognitif — L'Observateur Naya
                    </h4>
                    <p className="text-[11px] text-amber-900/80 font-medium">
                      Remplissez avec les propres mots de {childName} pour révéler ses mécanismes d'apprentissage.
                    </p>
                  </div>
                </div>

                <div className="space-y-3.5">
                  <div className="space-y-1">
                    <label className="text-xs font-black text-amber-950 block">
                      {config.q1Label}
                    </label>
                    <Textarea
                      value={q1}
                      onChange={(e) => setQ1(e.target.value)}
                      placeholder={config.q1Placeholder}
                      rows={2}
                      className="rounded-xl border-amber-200 bg-white text-xs text-ink focus-visible:ring-amber-500 resize-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-black text-amber-950 block">
                      {config.q2Label}
                    </label>
                    <Textarea
                      value={q2}
                      onChange={(e) => setQ2(e.target.value)}
                      placeholder={config.q2Placeholder}
                      rows={2}
                      className="rounded-xl border-amber-200 bg-white text-xs text-ink focus-visible:ring-amber-500 resize-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-black text-amber-950 block">
                      {config.q3Label}
                    </label>
                    <Textarea
                      value={q3}
                      onChange={(e) => setQ3(e.target.value)}
                      placeholder={config.q3Placeholder}
                      rows={2}
                      className="rounded-xl border-amber-200 bg-white text-xs text-ink focus-visible:ring-amber-500 resize-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-black text-amber-950 block">
                      {config.q4Label}
                    </label>
                    <Textarea
                      value={q4}
                      onChange={(e) => setQ4(e.target.value)}
                      placeholder={config.q4Placeholder}
                      rows={2}
                      className="rounded-xl border-amber-200 bg-white text-xs text-ink focus-visible:ring-amber-500 resize-none"
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
                          JPG, PNG, HEIC (iPhone) — optimisé automatiquement
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
                  className="rounded-xl px-6 py-2.5 bg-amber-700 hover:bg-amber-800 text-white font-bold text-sm inline-flex items-center gap-2 cursor-pointer shadow-md"
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
