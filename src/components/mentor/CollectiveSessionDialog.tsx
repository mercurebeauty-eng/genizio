import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  TeamRole,
  ImplicationLevel,
  SupervisorObservableTag,
} from "@/lib/collective-capability";
import { DISCOVERY_DOMAINS } from "@/lib/discovery.functions";
import { Check, X, Plus } from "lucide-react";

interface ChildParticipant {
  id: string;
  name: string;
}

interface CollectiveSessionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  childrenList: ChildParticipant[];
  onSave: (sessionData: any) => Promise<void>;
}

const PRESET_TAGS: Array<{
  tag: string;
  dimension: SupervisorObservableTag["dimension"];
  impact: "positive" | "negative";
}> = [
  { tag: "+Initiative", dimension: "autonomie", impact: "positive" },
  { tag: "+Entraide", dimension: "collaboration", impact: "positive" },
  { tag: "+Ténacité", dimension: "perseverance", impact: "positive" },
  { tag: "+Créativité", dimension: "technique", impact: "positive" },
  { tag: "-Décrochage", dimension: "perseverance", impact: "negative" },
  { tag: "-Retrait", dimension: "collaboration", impact: "negative" },
];

export function CollectiveSessionDialog({
  open,
  onOpenChange,
  childrenList,
  onSave,
}: CollectiveSessionDialogProps) {
  const [domain, setDomain] = useState<string>(DISCOVERY_DOMAINS[0]);
  const [levelAge, setLevelAge] = useState<number>(8);
  const [participants, setParticipants] = useState<
    Record<string, { role: TeamRole; implication: ImplicationLevel; tags: string[] }>
  >({});

  const handleToggleTag = (childId: string, tag: string) => {
    setParticipants((prev) => {
      const current = prev[childId] || {
        role: "programmation",
        implication: "contributeur_actif",
        tags: [],
      };
      const newTags = current.tags.includes(tag)
        ? current.tags.filter((t) => t !== tag)
        : [...current.tags, tag];
      return { ...prev, [childId]: { ...current, tags: newTags } };
    });
  };

  const handleSetRole = (childId: string, role: TeamRole, implication: ImplicationLevel) => {
    setParticipants((prev) => {
      const current = prev[childId] || { tags: [] };
      return { ...prev, [childId]: { ...current, role, implication } };
    });
  };

  const handleSave = async () => {
    // Transformer l'état local en payload attendu par le backend ou les hooks
    const contributions = Object.entries(participants).map(([childId, data]) => {
      const supervisorTags = data.tags.map((tStr) => {
        const preset = PRESET_TAGS.find((p) => p.tag === tStr);
        return {
          tag: tStr,
          impact: preset?.impact || "neutral",
          dimension: preset?.dimension || "collaboration",
        } as SupervisorObservableTag;
      });

      return {
        childId,
        role: data.role,
        implication: data.implication,
        supervisorTags,
      };
    });

    await onSave({
      domain,
      targetLevelAge: levelAge,
      contributions,
    });

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Évaluer une session Fab Lab / Projet Collectif</DialogTitle>
          <DialogDescription>
            Saisissez en 1-clic l'implication et les micro-observables de chaque enfant pour affiner
            leur profil.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 my-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium mb-1 block">Domaine du projet</label>
              <Select value={domain} onValueChange={setDomain}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DISCOVERY_DOMAINS.map((d) => (
                    <SelectItem key={d} value={d}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <label className="text-sm font-medium mb-1 block">
                Niveau de difficulté cible (Âge)
              </label>
              <Select value={levelAge.toString()} onValueChange={(v) => setLevelAge(Number(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15].map((v) => (
                    <SelectItem key={v} value={v.toString()}>
                      {v} ans
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-6 mt-6">
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Participants
            </h4>
            {childrenList.map((child) => {
              const state = participants[child.id] || {
                role: "programmation",
                implication: "contributeur_actif",
                tags: [],
              };

              return (
                <div key={child.id} className="p-4 border rounded-lg bg-card">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-medium text-lg">{child.name}</span>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant={state.implication === "pilier" ? "brand" : "outline"}
                        onClick={() => handleSetRole(child.id, state.role, "pilier")}
                      >
                        Pilier
                      </Button>
                      <Button
                        size="sm"
                        variant={state.implication === "contributeur_actif" ? "brand" : "outline"}
                        onClick={() => handleSetRole(child.id, state.role, "contributeur_actif")}
                      >
                        Actif
                      </Button>
                      <Button
                        size="sm"
                        variant={state.implication === "apprenti" ? "brand" : "outline"}
                        onClick={() => handleSetRole(child.id, state.role, "apprenti")}
                      >
                        Apprenti
                      </Button>
                      <Button
                        size="sm"
                        variant={state.implication === "observateur" ? "brand" : "outline"}
                        onClick={() => handleSetRole(child.id, state.role, "observateur")}
                      >
                        Observateur
                      </Button>
                    </div>
                  </div>

                  <div className="flex gap-2 mb-3">
                    <Select
                      value={state.role}
                      onValueChange={(v) =>
                        handleSetRole(child.id, v as TeamRole, state.implication)
                      }
                    >
                      <SelectTrigger className="w-[180px] h-8 text-xs">
                        <SelectValue placeholder="Rôle endossé" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="conception">Conception</SelectItem>
                        <SelectItem value="programmation">Programmation</SelectItem>
                        <SelectItem value="fabrication">Fabrication</SelectItem>
                        <SelectItem value="coordination">Coordination</SelectItem>
                        <SelectItem value="communication">Communication</SelectItem>
                        <SelectItem value="mediation">Médiation</SelectItem>
                        <SelectItem value="recherche">Recherche</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {PRESET_TAGS.map((t) => {
                      const isActive = state.tags.includes(t.tag);
                      return (
                        <Badge
                          key={t.tag}
                          variant={isActive ? "default" : "secondary"}
                          className={`cursor-pointer hover:bg-primary/80 transition-colors ${isActive ? (t.impact === "positive" ? "bg-green-600 text-white hover:bg-green-700" : "bg-destructive text-white hover:bg-destructive/90") : ""}`}
                          onClick={() => handleToggleTag(child.id, t.tag)}
                        >
                          {isActive && <Check className="w-3 h-3 mr-1" />}
                          {!isActive && <Plus className="w-3 h-3 mr-1 opacity-50" />}
                          {t.tag}
                        </Badge>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={handleSave}>Enregistrer la session</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
