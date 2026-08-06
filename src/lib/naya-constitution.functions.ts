// ============================================================================
// Naya 3.0 « Le Loup » — Chantier 3 (C3.1/C3.2) + Décision #56 : le Loup qui
// apprend
// ----------------------------------------------------------------------------
// Agrége les audits journalisés par le chantier 2 (generation_audits) en
// suggestions d'évolution de constitution : une violation qui revient (≥ N fois,
// chez ≥ M enfants distincts) devient une « règle apprise » numérotée, proposée
// à validation humaine via l'admin — le même pattern que genizio_decisions.md
// (décision humaine, trace écrite), appliqué aux recadrages du Loup.
//
// Décision #56 — validation hybride, tout dans l'admin (aucun doc à lire) :
//   - auto-acquittement paresseux par seuil de confiance élevé (endpoint POST
//     idempotent, déclenché à la consultation du panneau ; PAS de pg_cron,
//     cf. décisions #3 et #54 du projet) : les règles qui franchissent le seuil
//     auto (≥ N occ., ≥ M enfants, par défaut 5/3) sont marquées processed=true
//     + decision='auto' sans aucun clic.
//   - décisions humaines à 3 états via l'admin : valide (Intégrer), a_revoir
//     (À revoir), rejete (Rejeter) — tracées par email admin + date.
//   - journal des décisions (auto + humaines) regroupé par règle, exposé dans
//     le même écran.
// La promotion finale d'une règle dans la constitution (system prompt) reste
// volontaire : copier le bloc LEARNED_RULES, puis tracer dans genizio_decisions.md.
//
// Les fonctions d'agrégation sont PURES et testables sans base ni IA ; les
// endpoints admin ne font que lire les audits, appliquer les seuils et marquer
// les audits décidés (processed + decision).
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

/**
 * Décision portée par un audit une fois qu'il n'est plus en attente (Décision
 * #56). 'en_attente' n'est pas ici : c'est l'état par défaut (audit encore en
 * observation, proposé en suggestion).
 */
export type LoupDecision = "auto" | "valide" | "a_revoir" | "rejete";

/** État complet de la colonne `decision` de generation_audits. */
export type AuditDecision = LoupDecision | "en_attente";

/** Libellés courts affichés dans le journal du panneau admin. */
export const LOUP_DECISION_LABELS: Record<LoupDecision, string> = {
  auto: "Auto-acquittée (seuil)",
  valide: "Intégrée",
  a_revoir: "À revoir",
  rejete: "Rejetée",
};

/** État du Loup exposé au panneau (variables d'environnement, lecture live). */
export interface WolfState {
  /** Vérification active (kill-switch NAYA_VERIFY_ENABLED). */
  enabled: boolean;
  /** Mode enforce (NAYA_VERIFY_ENFORCE) : recadrage + régénération. */
  enforce: boolean;
  /** Taux d'échantillonnage de la vérification sémantique, en % (0-100). */
  semanticRatePct: number;
  /** Seuils pour proposer une suggestion (défaut 3 occurrences / 2 enfants). */
  suggestThresholds: RecurrenceThresholds;
  /** Seuils d'auto-acquittement (confiance élevée, défaut 5/3). */
  autoAckThresholds: RecurrenceThresholds;
}

/** Une ligne d'audit déjà décidée, pour la construction du journal. */
export interface DecidedAuditRow {
  id: string;
  kind: string;
  child_id: string | null;
  violations: AuditRow["violations"];
  context: AuditRow["context"];
  created_at: string;
  decision: AuditDecision;
  decision_at: string | null;
  decision_by: string | null;
  decision_note?: string | null;
}

/** Entrée du journal des décisions (une par règle, décision la plus récente). */
export interface RuleDecision {
  ruleKey: string;
  rule: string;
  kind: string;
  domain: string;
  decision: LoupDecision;
  count: number;
  childCount: number;
  decidedAt: string | null;
  decidedBy: string | null;
  note?: string | null;
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
      const key = ruleKeyOf(row.kind, domain, v.rule);
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
 * Clé composite canonique d'une violation : `kind|domaine|règle`. C'est elle qui
 * relie les suggestions aux audits et au journal des décisions.
 */
export function ruleKeyOf(kind: string, domain: string, rule: string): string {
  return `${kind}|${domain}|${rule}`;
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

/**
 * Seuils d'auto-acquittement bornés pour ne jamais être PLUS bas que les seuils
 * de suggestion : on n'auto-acquitte que ce qui serait de toute façon proposé.
 */
export function clampAutoAckThresholds(
  suggest: RecurrenceThresholds,
  autoAck: RecurrenceThresholds
): RecurrenceThresholds {
  return {
    minCount: Math.max(suggest.minCount, autoAck.minCount),
    minChildren: Math.max(suggest.minChildren, autoAck.minChildren),
  };
}

/**
 * Règles qui franchissent le seuil d'auto-acquittement (Décision #56) : elles
 * sont assez massives (occurrences × enfants distincts) pour ne pas mériter un
 * clic humain — le panneau les marque decision='auto' et les range au journal.
 */
export function computeAutoAckRules(
  aggregates: ViolationAggregate[],
  thresholds: RecurrenceThresholds
): ViolationAggregate[] {
  return computeRecurringRules(aggregates, thresholds);
}

/**
 * Construit le journal des décisions depuis les audits déjà décidés (auto +
 * humains). Une entrée par règle, comptée sur TOUS les audits concernés ; si
 * une règle a connu plusieurs décisions, c'est la plus récente qui prime.
 */
export function buildRuleJournal(rows: DecidedAuditRow[]): RuleDecision[] {
  interface Acc {
    ruleKey: string;
    rule: string;
    kind: string;
    domain: string;
    decision: LoupDecision;
    childIds: Set<string>;
    count: number;
    decidedAt: string | null;
    decidedBy: string | null;
    note?: string | null;
  }
  const map = new Map<string, Acc>();

  for (const row of rows) {
    if (row.decision === "en_attente") continue;
    const violations = Array.isArray(row.violations) ? row.violations : [];
    const domain = extractDomain(row.context);
    for (const v of violations) {
      if (typeof v !== "object" || v === null || Array.isArray(v)) continue;
      const rule = (v as Record<string, unknown>).rule;
      if (typeof rule !== "string") continue;
      const key = ruleKeyOf(row.kind, domain, rule);
      const existing = map.get(key);
      if (existing) {
        existing.count += 1;
        if (row.child_id) existing.childIds.add(row.child_id);
        if (row.decision_at && (!existing.decidedAt || row.decision_at > existing.decidedAt)) {
          existing.decision = row.decision;
          existing.decidedAt = row.decision_at;
          existing.decidedBy = row.decision_by;
          existing.note = row.decision_note;
        }
      } else {
        map.set(key, {
          ruleKey: key,
          rule,
          kind: row.kind,
          domain,
          decision: row.decision,
          childIds: new Set(row.child_id ? [row.child_id] : []),
          count: 1,
          decidedAt: row.decision_at,
          decidedBy: row.decision_by,
          note: row.decision_note,
        });
      }
    }
  }

  return [...map.values()]
    .map((a) => ({
      ruleKey: a.ruleKey,
      rule: a.rule,
      kind: a.kind,
      domain: a.domain,
      decision: a.decision,
      count: a.count,
      childCount: a.childIds.size,
      decidedAt: a.decidedAt,
      decidedBy: a.decidedBy,
      note: a.note ?? null,
    }))
    .sort((a, b) => (b.decidedAt ?? "").localeCompare(a.decidedAt ?? ""));
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
    "**Verdict** : validée / rejetée — (à trancher dans le panneau admin, Décision #56).",
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

// ── Lecture de l'environnement (seuils & état du Loup) ───────────────────────

function defaultThresholds(): RecurrenceThresholds {
  const minCount = Number.parseInt(process.env.NAYA_CONSTITUTION_MIN_COUNT ?? "3", 10);
  const minChildren = Number.parseInt(process.env.NAYA_CONSTITUTION_MIN_CHILDREN ?? "2", 10);
  return {
    minCount: Number.isFinite(minCount) && minCount > 0 ? minCount : 3,
    minChildren: Number.isFinite(minChildren) && minChildren > 0 ? minChildren : 2,
  };
}

function defaultAutoAckThresholds(suggest: RecurrenceThresholds): RecurrenceThresholds {
  const count = Number.parseInt(process.env.NAYA_CONSTITUTION_AUTO_ACK_COUNT ?? "5", 10);
  const children = Number.parseInt(process.env.NAYA_CONSTITUTION_AUTO_ACK_CHILDREN ?? "3", 10);
  return clampAutoAckThresholds(suggest, {
    minCount: Number.isFinite(count) && count > 0 ? count : 5,
    minChildren: Number.isFinite(children) && children > 0 ? children : 3,
  });
}

function defaultWolfState(suggest: RecurrenceThresholds): WolfState {
  const enabled = process.env.NAYA_VERIFY_ENABLED !== "false";
  const enforce = process.env.NAYA_VERIFY_ENFORCE === "true";
  const rawRate = Number.parseFloat(process.env.NAYA_VERIFY_SEMANTIC_RATE ?? "0.1");
  const rate = Number.isFinite(rawRate) ? Math.max(0, Math.min(1, rawRate)) : 0.1;
  return {
    enabled,
    enforce,
    semanticRatePct: Math.round(rate * 100),
    suggestThresholds: suggest,
    autoAckThresholds: defaultAutoAckThresholds(suggest),
  };
}

// ── Endpoints admin (lecture + auto-acquittement + décisions humaines) ──────

function toAuditRow(r: {
  kind: string;
  child_id: string | null;
  violations: unknown;
  context: unknown;
  created_at: string;
}): AuditRow {
  return {
    kind: r.kind,
    child_id: r.child_id,
    violations: (Array.isArray(r.violations) ? r.violations : []) as AuditRow["violations"],
    context: (r.context ?? null) as AuditRow["context"],
    created_at: r.created_at,
  };
}

function violationsContain(violations: unknown, kind: string, context: unknown, key: string): boolean {
  const list = Array.isArray(violations) ? violations : [];
  const domain = extractDomain((context ?? null) as AuditRow["context"]);
  return list.some((v) => {
    if (typeof v !== "object" || v === null || Array.isArray(v)) return false;
    const rule = (v as Record<string, unknown>).rule;
    return typeof rule === "string" && ruleKeyOf(kind, domain, rule) === key;
  });
}

export interface ConstitutionSuggestionsResponse {
  /** Nombre d'audits non traités examinés. */
  auditsConsidered: number;
  /** État du Loup (mode, échantillonnage, seuils) affiché au panneau. */
  wolfState: WolfState;
  /** Règles apprises proposées (audits en attente, au-dessus des seuils). */
  suggestions: RecurringRule[];
  /** Journal des décisions déjà posées (auto + humaines). */
  journal: RuleDecision[];
  learnedRulesBlock: string;
  decisionDrafts: string;
}

/**
 * Tableau de bord « le Loup qui apprend » : suggestions en attente + journal
 * des décisions + état du Loup. Lecture seule — l'auto-acquittement se fait par
 * l'endpoint POST dédié, les décisions humaines par decideLoupSuggestionsAdmin.
 */
export const getConstitutionSuggestionsAdmin = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async (): Promise<ConstitutionSuggestionsResponse> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [pendingRes, decidedRes] = await Promise.all([
      supabaseAdmin
        .from("generation_audits")
        .select("kind, child_id, violations, context, created_at")
        .eq("processed", false),
      supabaseAdmin
        .from("generation_audits")
        .select("id, kind, child_id, violations, context, created_at, decision, decision_at, decision_by, decision_note")
        .neq("decision", "en_attente")
        .order("decision_at", { ascending: false })
        .limit(2000),
    ]);
    if (pendingRes.error) throw new Error(pendingRes.error.message);
    if (decidedRes.error) throw new Error(decidedRes.error.message);

    const suggest = defaultThresholds();
    const rows = (pendingRes.data ?? []).map(toAuditRow);
    const aggregates = aggregateAuditViolations(rows);
    const recurring = computeRecurringRules(aggregates, suggest);
    const { recurringRules, learnedRulesBlock, decisionDrafts } = buildLearnings(recurring, suggest);

    const journal = buildRuleJournal(
      (decidedRes.data ?? []).map((r) => ({
        id: r.id,
        kind: r.kind,
        child_id: r.child_id,
        violations: (Array.isArray(r.violations) ? r.violations : []) as AuditRow["violations"],
        context: (r.context ?? null) as AuditRow["context"],
        created_at: r.created_at,
        decision: r.decision as AuditDecision,
        decision_at: r.decision_at,
        decision_by: r.decision_by,
        decision_note: r.decision_note,
      }))
    );

    return {
      auditsConsidered: rows.length,
      wolfState: defaultWolfState(suggest),
      suggestions: recurringRules,
      journal,
      learnedRulesBlock,
      decisionDrafts,
    };
  });

/**
 * Auto-acquittement paresseux (Décision #56) : marque processed=true +
 * decision='auto' les audits non traités qui relèvent d'une règle franchissant
 * le seuil de confiance élevé. Idempotent — une seconde exécution ne retrouve
 * aucun audit concerné. Déclenché à la consultation du panneau (pas de pg_cron,
 * cf. décisions #3 et #54).
 */
export const runLoupAutoAcknowledgementAdmin = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .handler(async (): Promise<{ autoAcknowledged: number; appliedRules: ViolationAggregate[] }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const suggest = defaultThresholds();
    const autoAck = defaultAutoAckThresholds(suggest);

    const { data: audits, error } = await supabaseAdmin
      .from("generation_audits")
      .select("id, kind, child_id, violations, context, created_at")
      .eq("processed", false);
    if (error) throw new Error(error.message);

    const rows = (audits ?? []).map(toAuditRow);
    const aggregates = aggregateAuditViolations(rows);
    const rules = computeAutoAckRules(aggregates, autoAck);
    if (rules.length === 0) return { autoAcknowledged: 0, appliedRules: [] };

    const keys = new Set(rules.map((r) => ruleKeyOf(r.kind, r.domain, r.rule)));
    const ids = (audits ?? [])
      .filter((r) => {
        const list = Array.isArray(r.violations) ? r.violations : [];
        const domain = extractDomain((r.context ?? null) as AuditRow["context"]);
        return list.some((v) => {
          if (typeof v !== "object" || v === null || Array.isArray(v)) return false;
          const rule = (v as Record<string, unknown>).rule;
          return typeof rule === "string" && keys.has(ruleKeyOf(r.kind, domain, rule));
        });
      })
      .map((r) => r.id);
    if (ids.length === 0) return { autoAcknowledged: 0, appliedRules: rules };

    const now = new Date().toISOString();
    const { error: updateError } = await supabaseAdmin
      .from("generation_audits")
      .update({ processed: true, decision: "auto", decision_at: now, decision_by: "système" })
      .in("id", ids);
    if (updateError) throw new Error(updateError.message);
    return { autoAcknowledged: ids.length, appliedRules: rules };
  });

const DecideInput = z.object({
  /** Décisions humaines par clé `kind|domaine|règle` (≤ 50 par appel). */
  decisions: z
    .array(
      z.object({
        ruleKey: z.string().min(1),
        decision: z.enum(["valide", "a_revoir", "rejete"]),
        /** Commentaire optionnel (≤ 500 caractères). */
        note: z.string().max(500).optional(),
      })
    )
    .min(1)
    .max(50),
});

/**
 * Décisions humaines (Décision #56) : Intégrer / À revoir / Rejeter. Marque les
 * audits non traités correspondant à chaque règle avec la décision, l'email de
 * l'admin et un commentaire optionnel. Un audit touché par plusieurs décisions
 * du même appel est décidé par la première clé qui le matche.
 */
export const decideLoupSuggestionsAdmin = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((input: unknown) => DecideInput.parse(input))
  .handler(async ({ data, context }): Promise<{ decided: number }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: audits, error } = await supabaseAdmin
      .from("generation_audits")
      .select("id, kind, child_id, violations, context")
      .eq("processed", false);
    if (error) throw new Error(error.message);

    const email = (context.claims?.email as string | undefined) ?? "admin";
    const now = new Date().toISOString();
    const decidedIds = new Set<string>();
    let decided = 0;

    for (const d of data.decisions) {
      const idsFor = (audits ?? [])
        .filter((r) => !decidedIds.has(r.id) && violationsContain(r.violations, r.kind, r.context, d.ruleKey))
        .map((r) => r.id);
      if (idsFor.length === 0) continue;

      const { error: updateError } = await supabaseAdmin
        .from("generation_audits")
        .update({
          processed: true,
          decision: d.decision,
          decision_at: now,
          decision_by: email,
          decision_note: d.note ?? null,
        })
        .in("id", idsFor);
      if (updateError) throw new Error(updateError.message);
      idsFor.forEach((id) => decidedIds.add(id));
      decided += idsFor.length;
    }
    return { decided };
  });
