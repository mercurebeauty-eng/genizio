import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Workflow, Star, CheckCircle2 } from "lucide-react";
import type { LongitudinalGraph } from "@/lib/longitudinal-evidence";

interface CollectiveExperiencesSectionProps {
  graph: LongitudinalGraph;
}

export function CollectiveExperiencesSection({ graph }: CollectiveExperiencesSectionProps) {
  if (graph.experiences.length === 0) {
    return null; // Ne rien afficher s'il n'y a pas d'expérience collective
  }

  // Trier les tags par occurrence
  const sortedTags = Object.entries(graph.behavioralSummary.tagsFrequency)
    .sort((a, b) => b[1].count - a[1].count);

  return (
    <div className="space-y-6 mt-12 mb-12">
      <div className="flex items-center gap-2 mb-4">
        <Users className="w-6 h-6 text-indigo-600" />
        <h2 className="text-2xl font-display font-bold text-ink">
          Projets d'Équipe & Coopération
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Compétences Démontrées */}
        <Card className="border-indigo-100 bg-indigo-50/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Star className="w-5 h-5 text-indigo-500" />
              Compétences Démontrées
            </CardTitle>
            <CardDescription>
              Preuves comportementales issues de {graph.behavioralSummary.totalProjects} projets collectifs
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {sortedTags.length > 0 ? (
                sortedTags.map(([tag, data]) => (
                  <Badge 
                    key={tag} 
                    variant={data.impact === "positive" ? "default" : "secondary"}
                    className={data.impact === "positive" ? "bg-indigo-600 hover:bg-indigo-700" : "opacity-80"}
                  >
                    {tag} ({data.count} observation{data.count > 1 ? "s" : ""})
                  </Badge>
                ))
              ) : (
                <p className="text-sm text-ink-muted">Aucune observation détaillée enregistrée.</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Plasticité & Rôles */}
        <Card className="border-indigo-100 bg-indigo-50/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Workflow className="w-5 h-5 text-indigo-500" />
              Rôles & Plasticité
            </CardTitle>
            <CardDescription>
              Indice d'adaptabilité : {Math.round(graph.roleSummary.plasticityScore * 100)}%
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {Object.entries(graph.roleSummary.rolesFrequency).map(([role, count]) => (
                <div key={role} className="flex items-center gap-1.5 px-3 py-1 bg-white border border-indigo-100 rounded-full text-sm">
                  <span className="font-medium capitalize text-indigo-900">{role}</span>
                  <span className="text-indigo-400 bg-indigo-50 px-1.5 py-0.5 rounded-full text-xs">{count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {graph.triangulatedCompetencies && graph.triangulatedCompetencies.length > 0 && (
        <Card className="border-emerald-200 bg-emerald-50/40">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              Compétences Triangulées (Multi-Contextes)
            </CardTitle>
            <CardDescription>
              Capacités démontrées avec succès dans plusieurs contextes (individuel, équipe, tutorat, etc.)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {graph.triangulatedCompetencies.map(hyp => {
                const uniqueContexts = Array.from(new Set(hyp.evidence.filter(e => e.success).map(e => e.context)));
                
                return (
                  <div key={hyp.id} className="p-3 bg-white rounded-lg border border-emerald-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <h4 className="font-bold text-emerald-900 capitalize">{hyp.competenceKey.replace(/_/g, " ")}</h4>
                      <p className="text-sm text-emerald-700/80 mt-1">
                        Solidité : <strong className="text-emerald-800">{Math.round(hyp.confidence * 100)}%</strong> 
                        {" "} • Confirmée dans {uniqueContexts.length}/4 contextes
                      </p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      {uniqueContexts.map(ctx => (
                        <Badge key={ctx} variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                          {ctx.split('_').pop()}
                        </Badge>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Chronique des Projets */}
      <div>
        <h3 className="text-lg font-bold text-ink mb-4 mt-8 flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          Registre des Expériences Vécues
        </h3>
        <div className="space-y-4">
          {graph.experiences.map((exp) => (
            <div key={exp.id} className="flex flex-col sm:flex-row gap-4 p-4 rounded-xl border border-divider-soft bg-surface">
              {exp.proofImageUrl && (
                <div className="w-full sm:w-32 h-24 shrink-0 rounded-lg overflow-hidden bg-divider-subtle">
                  <img src={exp.proofImageUrl} alt={exp.title} className="w-full h-full object-cover" />
                </div>
              )}
              <div className="flex-1">
                <div className="flex justify-between items-start mb-1">
                  <h4 className="font-bold text-ink">{exp.title}</h4>
                  <span className="text-xs text-ink-muted">
                    {new Date(exp.occurredAt).toLocaleDateString("fr-FR", { year: "numeric", month: "long" })}
                  </span>
                </div>
                <div className="text-sm text-ink-muted mb-2">
                  <span className="capitalize">{exp.domain}</span>
                  <span className="mx-2">•</span>
                  Rôle : <strong className="capitalize text-ink">{exp.role}</strong>
                  {exp.implication !== "non_specifie" && (
                     <span className="ml-1 text-xs px-1.5 py-0.5 rounded-sm bg-indigo-50 text-indigo-700 capitalize">
                       ({exp.implication.replace("_", " ")})
                     </span>
                  )}
                </div>
                {exp.supervisorTags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {exp.supervisorTags.map((tag, i) => (
                      <span key={i} className={`text-[11px] px-2 py-0.5 rounded-full border ${
                        tag.impact === 'positive' 
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-700' 
                          : 'border-rose-200 bg-rose-50 text-rose-700'
                      }`}>
                        {tag.tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
