// ============================================================================
// Naya 3.0 « Le Loup » — Chantier 3 (C3.1/C3.2) : le Loup qui apprend
// ----------------------------------------------------------------------------
// Agrége les audits journalisés par le chantier 2 (generation_audits) en
// suggestions d'évolution de constitution : une violation qui revient (≥ N fois,
// chez ≥ M enfants distincts) devient une « règle apprise » numérotée, proposée
// à validation humaine via l'admin — le même pattern que genizio_decisions.md
// (décision humaine, trace écrite), appliqué aux recadrages du Loup.
//
// Les fonctions d'agrégation sont PURES et testables sans base ni IA ; les
// endpoints admin ne font que lire les audits, appliquer les seuils et marquer
// les audits traités une fois la suggestion prise en compte.
// ============================================================================

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAdmin } from "@/integrations/supabase/admin-middleware";
import type { ViolationSeverity } from "@/lib/naya-verifier.functions";

// ── Types ───────────────────────────────────────────────────────────────────

/** Une ligne d'audit telle qu'insérée par verifyAndLog (chantier 2). */
export interface AuditRow {
  kind: string;
  child_id: string | null;
  violations: Array<{ rule: string; severity: ViolationSeverity; detail: string; suggestion?: string }> | null;
  created_at: string;
  source_function?: string;
  context?: Record<string, unknown> | null;
  verdict?: string | null;
}

/** Une violation agrégée par (règle, type de génération, domaine). */
export interface ViolationAggregate {
  rule: string;
  kind: string;
  /** Domaine Gardner / matière académique extraite du contexte d'audit. */
  domain: string;
  /** Sévérité la plus forte observée (majeur prime). */
  severity: ViolationSeverity;
  count: number;
  childCount: number;
  /** Extraits des détails factuels (dédupliqués, bornés) pour la rédaction. */
  sampleDetails: string[];
  sampleSuggestions: string[];
}

export interface RecurrenceThresholds {
  /** Nombre minimal d'occurrences de la règle pour être proposée. */
  minCount: number;
  /** Nombre minimal d'enfants distincts touchés. */
  minChildren: number;
}

export interface RecurringRule extends ViolationAggregate {
  /** Texte numéroté à ajouter au bloc LEARNED_RULES de la constitution. */
  learnedRuleText: string;
  /** Brouillon de l'entrée genizio_decisions.md correspondante. */
  decisionDraft: string;
}

// ── Agrégation pure (C3.1) ───────────────────────────────────────────────────

function extractDomain(context: AuditRow["context"]): string {
  const d = context?.domain ?? context?.subject;
  return typeof d === "string" && d.trim() ? d : "general";
}

/**
 * Agrège les violations ligne à ligne en compteurs par (règle, type, domaine).
 * Le domaine est dérivé du contexte d'audit (champ Gardner pour les défis,
 * matière pour les devoirs) afin d'apprendre « quelle règle échoue où ».
 * childCount compte les enfants DISTINCTS touchés (un Set par agrégat), pour
 * que le seuil « ≥ M enfants » du chantier 3 ne soit pas gonflé par un seul
 * enfant très générateur.
 */
export function aggregateAuditViolations(rows: AuditRow[]): ViolationAggregate[] {
  interface Acc extends ViolationAggregate {
    childIds: Set<string>;
  }
  const map = new Map<string, Acc>();

  for (const row of rows) {
    if (!Array.isArray(row.violations) || row.violations.length === 0) continue;
    const domain = extractDomain(row.context);
    for (const v of row.violations) {
      if (!v || typeof v.rule !== "string") continue;
      const key = `${row.kind}|${domain}|${v.rule}`;
      const existing = map.get(key);
      if (existing) {
        existing.count += 1;
        if (row.child_id) existing.childIds.add(row.child_id);
        if (v.severity === "majeur") existing.severity = "majeur";
        if (v.detail && !existing.sampleDetails.includes(v.detail)) {
          existing.sampleDetails.push(v.detail);
        }
        if (v.suggestion && !existing.sampleSuggestions.includes(v.suggestion)) {
          existing.sampleSuggestions.push(v.suggestion);
        }
      } else {
        map.set(key, {
          rule: v.rule,
          kind: row.kind,
          domain,
          severity: v.severity,
          count: 1,
          childCount: row.child_id ? 1 : 0,
          childIds: new Set(row.child_id ? [row.child_id] : []),
          sampleDetails: v.detail ? [v.detail] : [],
          sampleSuggestions: v.suggestion ? [v.suggestion] : [],
        });
      }
    }
  }

  return [...map.values()]
    .map((acc) => ({ ...acc, childCount: acc.childIds.size }))
    .sort((a, b) => b.count - a.count || (b.severity === "majeur" ? 1 : 0) - (a.severity === "majeur" ? 1 : 0));
}

/**
 * Filtre les agrégats qui franchissent les seuils de récurrence : une règle
 * n'est proposée que si elle revient assez souvent ET touche assez d'enfants
 * distincts (évite qu'un enfant très générateur noie à lui seul le signal).
 */
export function computeRecurringRules(
  aggregates: ViolationAggregate[],
  thresholds: RecurrenceThresholds = { minCount: 3, minChildren: 2 }
): ViolationAggregate[] {
  return aggregates.filter((a) => a.count >= thresholds.minCount && a.childCount >= thresholds.minChildren);
}

// ── Rédaction des suggestions (C3.2) ────────────────────────────────────────

/**
 * Construit le texte de la « règle apprise » numérotée, à recopier dans la
 * constitution (bloc LEARNED_RULES) après validation humaine.
 */
export function buildLearnedRuleText(index: number, aggregate: ViolationAggregate): string {
  const evidence = aggregate.count === aggregate.childCount
    ? `${aggregate.count} occurrence(s), chez ${aggregate.childCount} enfant(s) distinct(s)`
    : `${aggregate.count} occurrence(s) chez ${aggregate.childCount} enfant(s) distinct(s)`;
  const suggestion = aggregate.sampleSuggestions[0] ?? "Reformuler pour éliminer cette violation.";
  const detail = aggregate.sampleDetails[0];
  return [
    `LEARNED_RULE ${index}. « ${aggregate.rule} » (${aggregate.kind}${aggregate.domain !== "general" ? `, ${aggregate.domain}` : ""})`,
    `Observée ${evidence}.`,
    detail ? `Constat : ${detail}` : null,
    `Correctif à imposer : ${suggestion}`,
  ]
    .filter((l): l is string => l !== null)
    .join(" — ");
}

/**
 * Brouillon prêt à coller dans genizio_decisions.md pour une suggestion donnée.
 */
export function buildDecisionDraft(aggregate: ViolationAggregate): string {
  const domainPart = aggregate.domain !== "general" ? ` sur ${aggregate.domain}` : "";
  return [
    `### Règle apprise du Loup — « ${aggregate.rule} » (${aggregate.kind}${domainPart})`,
    `${aggregate.count} occurrence(s) chez ${aggregate.childCount} enfant(s) distinct(s).`,
    ...aggregate.sampleDetails.slice(0, 2).map((d) => `- Constat : ${d}`),
    aggregate.sampleSuggestions[0] ? `- Correctif proposé : ${aggregate.sampleSuggestions[0]}` : null,
    "**Verdict** : validée / rejetée — (à trancher manuellement, pattern genizio_decisions.md).",
  ]
    .filter((l): l is string => l !== null)
    .join("\n");
}

/**
 * Assemble le bloc LEARNED_RULES complet (numérotation continue) destiné à la
 * constitution, puis les brouillons de décision associés.
 */
export function buildLearnings(
  recurring: ViolationAggregate[],
  thresholds: RecurrenceThresholds
): { recurringRules: RecurringRule[]; learnedRulesBlock: string; decisionDrafts: string } {
  const recurringRules = recurring.map((aggregate, i) => ({
    ...aggregate,
    learnedRuleText: buildLearnedRuleText(i + 1, aggregate),
    decisionDraft: buildDecisionDraft(aggregate),
  }));
  const learnedRulesBlock = [
    `## LEARNED_RULES (règles apprises par le Loup — ${new Date().toISOString().slice(0, 10)})`,
    `Seuils : ≥ ${thresholds.minCount} occurrences et ≥ ${thresholds.minChildren} enfants distincts.`,
    ...recurringRules.map((r) => r.learnedRuleText),
  ].join("\n");
  const decisionDrafts = recurringRules.map((r) => r.decisionDraft).join("\n\n");
  return { recurringRules, learnedRulesBlock, decisionDrafts };
}

function defaultThresholds(): RecurrenceThresholds {
  const minCount = Number.parseInt(process.env.NAYA_CONSTITUTION_MIN_COUNT ?? "3", 10);
  const minChildren = Number.parseInt(process.env.NAYA_CONSTITUTION_MIN_CHILDREN ?? "2", 10);
  return {
    minCount: Number.isFinite(minCount) && minCount > 0 ? minCount : 3,
    minChildren: Number.isFinite(minChildren) && minChildren > 0 ? minChildren : 2,
  };
}

// ── Endpoints admin (lecture + acquittement) ────────────────────────────────

export interface ConstitutionSuggestionsResponse {
  auditsConsidered: number;
  thresholds: RecurrenceThresholds;
  aggregates: ViolationAggregate[];
  recurringRules: RecurringRule[];
  learnedRulesBlock: string;
  decisionDrafts: string;
}

/**
 * Tableau de bord « le Loup qui apprend » : aggrège les audits non traités,
 * applique les seuils et propose les règles apprises. Lecture seule — ne marque
 * rien processé tant que la décision humaine n'est pas actée (endpoint d'acquit-
 * tement ci-dessous).
 */
export const getConstitutionSuggestionsAdmin = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async (): Promise<ConstitutionSuggestionsResponse> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: audits } = await supabaseAdmin
      .from("generation_audits")
      .select("kind, child_id, violations, context, created_at")
      .eq("processed", false);

    const thresholds = defaultThresholds();
    const rows = (audits ?? []).map((r) => ({
      kind: r.kind,
      child_id: r.child_id,
      violations: (Array.isArray(r.violations) ? r.violations : []) as AuditRow["violations"],
      context: (r.context ?? null) as AuditRow["context"],
      created_at: r.created_at,
    }));
    const aggregates = aggregateAuditViolations(rows);
    const recurring = computeRecurringRules(aggregates, thresholds);
    const { recurringRules, learnedRulesBlock, decisionDrafts } = buildLearnings(recurring, thresholds);

    return {
      auditsConsidered: rows.length,
      thresholds,
      aggregates,
      recurringRules,
      learnedRulesBlock,
      decisionDrafts,
    };
  });

const AcknowledgeInput = z.object({
  /** Clés `kind|domain|rule` des agrégats à considérer comme traités. */
  ruleKeys: z.array(z.string().min(1)).min(1).max(100),
});

/**
 * Marque `processed = true` les audits non traités dont les violations
 * correspondent aux règles apprises validées. Action admin explicite : le bloc
 * LEARNED_RULES a été recopié dans la constitution (genizio_decisions.md) et le
 * signal ne doit plus ressurgir dans les prochaines suggestions.
 */
export const acknowledgeConstitutionSuggestionsAdmin = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((input: unknown) => AcknowledgeInput.parse(input))
  .handler(async ({ data }): Promise<{ acknowledged: number }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: audits } = await supabaseAdmin
      .from("generation_audits")
      .select("id, kind, child_id, violations, context")
      .eq("processed", false);

    const keys = new Set(data.ruleKeys);
    const idsToAck: string[] = [];
    for (const r of audits ?? []) {
      const violations = Array.isArray(r.violations) ? r.violations : [];
      const domain = extractDomain((r.context ?? null) as AuditRow["context"]);
      const matches = violations.some((v) => {
        if (typeof v !== "object" || v === null || Array.isArray(v)) return false;
        const rule = (v as Record<string, unknown>).rule;
        return typeof rule === "string" && keys.has(`${r.kind}|${domain}|${rule}`);
      });
      if (matches) idsToAck.push(r.id);
    }
    if (idsToAck.length === 0) return { acknowledged: 0 };

    const { error } = await supabaseAdmin
      .from("generation_audits")
      .update({ processed: true })
      .in("id", idsToAck);
    if (error) throw new Error(error.message);
    return { acknowledged: idsToAck.length };
  });
