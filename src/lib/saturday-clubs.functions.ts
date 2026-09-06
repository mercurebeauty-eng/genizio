// Server functions des Clubs Périscolaires du Samedi (Phase 3).
//
// Pipeline de validation d'une séance (le cœur anti-fraude) :
//   1. Quorum 6–8 présents (checkSquadQuorum, catégorie support).
//   2. Upload preuve → bucket privé 'educator-copilot' non : bucket 'proofs'
//      (convention validateChallengeProofCore, chemin signé 1 h à l'affichage).
//   3. EMPREINTE SERVEUR (dHash) sur les octets uploadés — le mentor est la
//      partie adverse : comparaison Hamming contre l'historique du mentor
//      (90 j) puis global. Doublon certain → flagged SANS appel IA (gratuit).
//   4. Naya Vision (Claude Sonnet 5, chemin callClaude existant) sur les photos
//      non-doublons : artefact matériel détecté, écran détecté, confiance.
//   5. Arbitrage evaluateSessionFraud → validated / flagged / rejected.
//   6. Validation → débriefing aux parents (notifyUser) + quote-part snapshot.
//
// Catégorie du mentor : le club du samedi est l'apanage des mentors de soutien
// (« support ») ; un mentor « pro » reste sur son rôle de superviseur clinique.

import { z } from "zod";
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireAdmin } from "@/integrations/supabase/admin-middleware";
import { requireRateLimit } from "@/lib/rate-limit.middleware";
import {
  ATELIER_KEYS,
  checkSquadQuorum,
  computeSessionPayoutXof,
  evaluateSessionFraud,
  getAtelierForDate,
  SATURDAY_ATELIERS,
  SQUAD_ROLE_LABEL,
  WORKSHOP_TIMELINE,
  type AtelierKey,
  type SquadNaturalRole,
} from "@/lib/saturday-clubs";
import { MENTOR_CATEGORY_QUOTAS, resolveMentorCategory } from "@/lib/mentor-safeguards";
import { fingerprintProofImage, isComparableFingerprint } from "@/lib/image-fingerprint.server";
import { hammingDistance } from "@/lib/image-hash";
import { notifyUser } from "@/lib/app-notifications";

// ── Schémas d'entrée ────────────────────────────────────────────────────────

const UpsertSquadInput = z.object({
  name: z.string().min(1).max(80).default("Escouade du Samedi"),
  childProfileIds: z.array(z.string().uuid()).min(1).max(16),
});

// Constitution d'escouade PAR L'ADMIN (deux-modèles) : réservée aux mentors de
// soutien, 6 à 8 enfants (min = quorum de séance, max = capacité), max 2 escouades.
// Le mentor consulte la sienne dans /mentor (SaturdayClubSquadView) et déclare les
// séances — il ne choisit jamais ses membres lui-même.
const UpsertSquadAdminInput = z.object({
  mentorUserId: z.string().uuid(),
  name: z.string().min(1).max(80).default("Escouade du Samedi"),
  childProfileIds: z.array(z.string().uuid()).min(6, "Une escouade compte au moins 6 enfants.").max(8, "Une escouade est limitée à 8 enfants."),
  squadId: z.string().uuid().optional(),
});

export const upsertSquadAdmin = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((input: unknown) => UpsertSquadAdminInput.parse(input))
  .handler(async ({ data }): Promise<{ squadId: string; memberCount: number }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;
    const category = await loadMentorCategory(db, data.mentorUserId);
    if (category !== "support") {
      throw new Error(
        "Les escouades sont réservées aux mentors de Soutien (Club du Samedi) — ce compte est un mentor Pro (Superviseur Clinique).",
      );
    }
    const quota = MENTOR_CATEGORY_QUOTAS.support;
    if (data.childProfileIds.length > quota.maxChildrenPerSquad) {
      throw new Error(
        `Une escouade est limitée à ${quota.maxChildrenPerSquad} enfants (reçu : ${data.childProfileIds.length}).`,
      );
    }

    // Vérifier l'existence des enfants (FK échouerait sinon avec un message brut).
    const { data: children } = await db
      .from("child_profiles")
      .select("id")
      .in("id", data.childProfileIds);
    if ((children ?? []).length !== new Set(data.childProfileIds).size) {
      throw new Error("Un ou plusieurs enfants sont introuvables.");
    }

    // Mise à jour d'une escouade existante, sinon création — jamais au-delà de 2
    // escouades actives (MENTOR_CATEGORY_QUOTAS.support.maxSquads).
    const { data: activeSquads } = await db
      .from("mentor_squads")
      .select("id")
      .eq("mentor_user_id", data.mentorUserId)
      .eq("status", "active");
    const existingSquadId = data.squadId;
    const activeSquadIds = new Set((activeSquads ?? []).map((s: any) => s.id as string));
    let squadId: string;
    if (existingSquadId) {
      if (!activeSquadIds.has(existingSquadId)) {
        throw new Error("Escouade introuvable pour ce mentor.");
      }
      squadId = existingSquadId;
      await db.from("mentor_squads").update({ name: data.name }).eq("id", squadId);
    } else {
      if ((activeSquads ?? []).length >= quota.maxSquads) {
        throw new Error(
          `Ce mentor anime déjà ${quota.maxSquads} escouades (le maximum) — ajustez une escouade existante.`,
        );
      }
      const { data: created, error } = await db
        .from("mentor_squads")
        .insert({ mentor_user_id: data.mentorUserId, name: data.name })
        .select("id")
        .single();
      if (error) throw new Error(`Création de l'escouade impossible : ${error.message}`);
      squadId = created.id;
    }

    // Remplacement complet des membres actifs (idempotent, comme upsertMySquad).
    await db.from("mentor_squad_members").delete().eq("squad_id", squadId).is("removed_at", null);
    await db.from("mentor_squad_members").insert(
      data.childProfileIds.map((childProfileId) => ({
        squad_id: squadId,
        child_profile_id: childProfileId,
      })),
    );

    return { squadId, memberCount: data.childProfileIds.length };
  });

// Escouade alimentée depuis une campagne (deux-modèles) : une campagne ONG peut
// financer des Clubs du Samedi — l'admin sélectionne 6 à 8 enfants de la cohorte
// et les confie à un mentor de Soutien. Mêmes bornes que upsertSquadAdmin, avec en
// plus : les enfants doivent appartenir à la cohorte de la campagne et ne pas être
// déjà pris en 1-on-1 (un enfant = un accompagnement).
const AssignSquadFromCampaignInput = z.object({
  campaignId: z.string().uuid(),
  mentorUserId: z.string().uuid(),
  childProfileIds: z
    .array(z.string().uuid())
    .min(6, "Une escouade compte au moins 6 enfants.")
    .max(8, "Une escouade est limitée à 8 enfants."),
  squadId: z.string().uuid().optional(),
});

export const assignSquadFromCampaignAdmin = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((input: unknown) => AssignSquadFromCampaignInput.parse(input))
  .handler(async ({ data }): Promise<{ squadId: string; memberCount: number }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;

    const category = await loadMentorCategory(db, data.mentorUserId);
    if (category !== "support") {
      throw new Error(
        "Les escouades sont réservées aux mentors de Soutien (Club du Samedi) — ce compte est un mentor Pro.",
      );
    }

    // Cohorte de la campagne : chaque enfant choisi doit y figurer.
    const { data: enrollments } = await db
      .from("season_enrollments")
      .select("child_id")
      .eq("campaign_id", data.campaignId);
    const cohortChildIds = new Set((enrollments ?? []).map((e: any) => e.child_id as string));
    const outside = data.childProfileIds.filter((id) => !cohortChildIds.has(id));
    if (outside.length > 0) {
      throw new Error(
        `${outside.length} enfant(s) sélectionné(s) ne sont pas inscrits dans cette campagne.`,
      );
    }

    // Un enfant déjà suivi 1-on-1 ne peut pas rejoindre une escouade.
    const { data: activeOnes } = await db
      .from("mentors")
      .select("child_profile_id")
      .in("child_profile_id", data.childProfileIds)
      .is("removed_at", null);
    if ((activeOnes ?? []).length > 0) {
      throw new Error(
        `${(activeOnes ?? []).length} enfant(s) ont déjà un mentor 1-on-1 — retirez-les de la sélection.`,
      );
    }

    // Même logique d'écriture que upsertSquadAdmin (max 2 escouades, membres remplacés).
    const quota = MENTOR_CATEGORY_QUOTAS.support;
    const { data: activeSquads } = await db
      .from("mentor_squads")
      .select("id")
      .eq("mentor_user_id", data.mentorUserId)
      .eq("status", "active");
    let squadId: string;
    if (data.squadId) {
      if (!(activeSquads ?? []).some((s: any) => s.id === data.squadId)) {
        throw new Error("Escouade introuvable pour ce mentor.");
      }
      squadId = data.squadId;
    } else {
      if ((activeSquads ?? []).length >= quota.maxSquads) {
        throw new Error(
          `Ce mentor anime déjà ${quota.maxSquads} escouades (le maximum) — ajustez une escouade existante.`,
        );
      }
      const { data: created, error } = await db
        .from("mentor_squads")
        .insert({ mentor_user_id: data.mentorUserId, name: "Escouade du Samedi" })
        .select("id")
        .single();
      if (error) throw new Error(`Création de l'escouade impossible : ${error.message}`);
      squadId = created.id;
    }

    await db.from("mentor_squad_members").delete().eq("squad_id", squadId).is("removed_at", null);
    await db.from("mentor_squad_members").insert(
      data.childProfileIds.map((childProfileId) => ({
        squad_id: squadId,
        child_profile_id: childProfileId,
      })),
    );

    return { squadId, memberCount: data.childProfileIds.length };
  });

const MemberAttendance = z.object({
  childProfileId: z.string().uuid(),
  present: z.boolean(),
});

const DeclareSessionInput = z.object({
  squadId: z.string().uuid(),
  occurredAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date attendue YYYY-MM-DD"),
  attendance: z.array(MemberAttendance).min(1).max(16),
});

const SubmitProofInput = z.object({
  sessionId: z.string().uuid(),
  imageBase64: z.string().min(50).max(8_000_000),
  mediaType: z.enum(["image/webp", "image/jpeg", "image/png"]),
  debriefNote: z.string().max(2000).optional(),
});

// ── Interfaces de sortie ────────────────────────────────────────────────────

export interface SquadMemberView {
  childProfileId: string;
  childName: string;
  role: SquadNaturalRole | null;
  roleLabel: string | null;
}

export interface SquadView {
  squadId: string;
  name: string;
  schoolId: string | null;
  members: SquadMemberView[];
  todayAtelier: { key: AtelierKey; label: string; materials: string[]; brief: string };
  timeline: typeof WORKSHOP_TIMELINE;
  recentSessions: Array<{
    id: string;
    occurredAt: string;
    status: string;
    presentCount: number;
    payoutXof: number | null;
    rejectionReason: string | null;
  }>;
}

export interface ClubSessionResult {
  sessionId: string;
  decision: "validated" | "flagged" | "rejected" | "draft";
  reasons: string[];
  fingerprintMethod: string;
  visionRan: boolean;
  payoutXof: number | null;
  matchedSessionId: string | null;
}

// ── Helpers internes ────────────────────────────────────────────────────────

async function loadMentorCategory(db: any, userId: string): Promise<"support" | "pro"> {
  // mentor_profiles.category (colonne ajoutée en 20260906120000) ; défaut pro
  // (historique clinique). Un mentor support crée ses escouades avec les quotas
  // support, un mentor pro qui tente une escouade verra ses quotas pro (max 5).
  const { data: profile } = await db
    .from("mentor_profiles")
    .select("*")
    .eq("mentor_user_id", userId)
    .maybeSingle();
  return resolveMentorCategory(profile?.category);
}

async function loadSquad(db: any, squadId: string, userId: string) {
  const { data: squad, error } = await db
    .from("mentor_squads")
    .select("*")
    .eq("id", squadId)
    .eq("mentor_user_id", userId)
    .eq("status", "active")
    .maybeSingle();
  if (error || !squad) throw new Error("Escouade introuvable ou non autorisée.");
  return squad;
}

/**
 * Vérifie que le mentor APPELANT est bien assigné à CHACUN des enfants donnés
 * (assignation active, non retirée). Sans ce garde, upsertMySquad permettait
 * à n'importe quel mentor d'ajouter n'importe quel enfant à son escouade —
 * exposition des noms + notifications aux parents (IDOR, audit backend vague A).
 */
async function assertMentorAssignedChildren(
  db: any,
  mentorUserId: string,
  childProfileIds: string[],
): Promise<void> {
  if (childProfileIds.length === 0) return;
  const { data: assigned, error } = await db
    .from("mentors")
    .select("child_profile_id")
    .eq("mentor_user_id", mentorUserId)
    .in("child_profile_id", childProfileIds)
    .is("removed_at", null);
  if (error) throw new Error("Vérification des assignations impossible.");
  const assignedSet = new Set((assigned ?? []).map((a: any) => a.child_profile_id as string));
  const missing = childProfileIds.filter((id) => !assignedSet.has(id));
  if (missing.length > 0) {
    throw new Error(
      `Ces enfants ne vous sont pas assignés : ${missing.length} profil(s) hors de votre suivi.`,
    );
  }
}

interface SquadMemberRow {
  childProfileId: string;
  childName: string;
}

async function loadActiveMembers(db: any, squadId: string): Promise<SquadMemberRow[]> {
  const { data: members, error } = await db
    .from("mentor_squad_members")
    .select("child_profile_id, child_profiles(name)")
    .eq("squad_id", squadId)
    .is("removed_at", null);
  if (error) throw new Error("Lecture des membres impossible.");
  return (members ?? []).map((m: any) => ({
    childProfileId: m.child_profile_id as string,
    childName: (m.child_profiles?.name as string) ?? "Enfant",
  }));
}

/** Comparaison Hamming contre l'historique des preuves (mentor d'abord, puis global). */
async function findClosestFingerprintMatch(
  db: any,
  mentorUserId: string,
  fingerprint: string,
): Promise<{ sameMentor: number | null; global: number | null; matchedSessionId: string | null }> {
  const { data: rows } = await db
    .from("mentor_club_sessions")
    .select("id, mentor_user_id, proof_image_fingerprint")
    .not("proof_image_fingerprint", "is", null)
    .gte("occurred_at", new Date(Date.now() - 90 * 86400_000).toISOString().slice(0, 10))
    .limit(500);

  let sameMentor: number | null = null;
  let global: number | null = null;
  let matchedSessionId: string | null = null;
  for (const row of rows ?? []) {
    const fp = row.proof_image_fingerprint as string;
    if (!isComparableFingerprint(fp) || !isComparableFingerprint(fingerprint)) continue;
    const d = hammingDistance(fingerprint, fp);
    if (row.mentor_user_id === mentorUserId && (sameMentor === null || d < sameMentor)) {
      sameMentor = d;
      if (d <= 4) matchedSessionId = row.id;
    }
    if (global === null || d < global) global = d;
  }
  return { sameMentor, global, matchedSessionId };
}

/** Appel Naya Vision via la passerelle existante (Claude Sonnet 5). */
async function callClubSessionVision(
  imageBase64: string,
  mediaType: string,
  atelier: AtelierDefinitionLike,
): Promise<{ materialArtifactDetected: boolean; confidence: number; screenContentDetected: boolean; sceneDescription: string }> {
  const { callClaude, extractJsonFromLLMResponse, safeJsonParse } = await import(
    "@/lib/challenges.functions"
  );
  const prompt = `Tu es Naya Vision, contrôle qualité des Clubs Périscolaires du Samedi Génizio. Un mentor de soutien vient de photographier la production de son escouade (ateliers matériels, ZÉRO écran pour les enfants).

Attendu pour l'atelier du jour (${atelier.label}) : ${atelier.visionExpectation}.

Analyse la photo et réponds UNIQUEMENT en JSON :
{
  "material_artifact_detected": <true si un objet physique tangible construit/manipulé est visible>,
  "confidence": <0.00 à 1.00>,
  "screen_content_detected": <true si la photo montre un écran allumé (téléphone/tablette/ordinateur) au lieu d'un objet>,
  "scene_description": "<1 phrase factuelle>"
}
Ne recompense pas un simple dessin plat ou une page de cahier : l'atelier produit des OBJETS.`;
  const raw = await callClaude(
    prompt,
    true,
    undefined,
    1000,
    2,
    { base64: imageBase64, mediaType },
  );
  const parsed = safeJsonParse(extractJsonFromLLMResponse(raw));
  return {
    materialArtifactDetected: parsed?.material_artifact_detected === true,
    confidence: typeof parsed?.confidence === "number" ? Math.min(1, Math.max(0, parsed.confidence)) : 0.5,
    screenContentDetected: parsed?.screen_content_detected === true,
    sceneDescription: String(parsed?.scene_description ?? ""),
  };
}

interface AtelierDefinitionLike {
  label: string;
  visionExpectation: string;
}

// ── Escouade ────────────────────────────────────────────────────────────────

export const upsertMySquad = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth, requireRateLimit])
  .validator((input: unknown) => UpsertSquadInput.parse(input))
  .handler(async ({ data, context }): Promise<SquadView> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;
    const userId = (context as any).claims?.sub as string;
    const category = await loadMentorCategory(db, userId);
    const quota = MENTOR_CATEGORY_QUOTAS[category];

    if (data.childProfileIds.length > quota.maxChildrenPerSquad) {
      throw new Error(
        `Une escouade ${category} est limitée à ${quota.maxChildrenPerSquad} enfants (reçu : ${data.childProfileIds.length}).`,
      );
    }

    // Vérifier l'existence des enfants (FK échouerait sinon avec un message brut).
    const { data: children } = await db
      .from("child_profiles")
      .select("id, name")
      .in("id", data.childProfileIds);
    const found = new Map((children ?? []).map((c: any) => [c.id, c.name]));
    if (found.size !== new Set(data.childProfileIds).size) {
      throw new Error("Un ou plusieurs enfants sont introuvables.");
    }
    // Garde IDOR (audit vague A) : le mentor ne peut composer une escouade
    // qu'avec des enfants qui lui sont assignés.
    await assertMentorAssignedChildren(db, userId, [...new Set(data.childProfileIds)]);

    // Création ou mise à jour de l'escouade active unique du mentor.
    const { data: existing } = await db
      .from("mentor_squads")
      .select("id")
      .eq("mentor_user_id", userId)
      .eq("status", "active")
      .limit(1)
      .maybeSingle();

    let squadId: string;
    if (existing) {
      squadId = existing.id;
      await db.from("mentor_squads").update({ name: data.name }).eq("id", squadId);
    } else {
      const { data: created, error } = await db
        .from("mentor_squads")
        .insert({ mentor_user_id: userId, name: data.name })
        .select("id")
        .single();
      if (error) throw new Error(`Création de l'escouade impossible : ${error.message}`);
      squadId = created.id;
    }

    // Remplacement complet des membres actifs (simple et idempotent).
    await db.from("mentor_squad_members").delete().eq("squad_id", squadId).is("removed_at", null);
    await db.from("mentor_squad_members").insert(
      data.childProfileIds.map((childProfileId) => ({ squad_id: squadId, child_profile_id: childProfileId })),
    );

    return buildSquadView(db, squadId, userId);
  });

async function buildSquadView(db: any, squadId: string, userId: string): Promise<SquadView> {
  const squad = await loadSquad(db, squadId, userId);
  const members = await loadActiveMembers(db, squadId);

  // Rôles naturels : historique des rôles passés pour la rotation équitable.
  const { data: sessions } = await db
    .from("mentor_club_sessions")
    .select("occurred_at, attendance")
    .eq("squad_id", squadId)
    .order("occurred_at", { ascending: false })
    .limit(12);

  const pastRolesByChild: Record<string, SquadNaturalRole[]> = {};
  // L'historique des rôles n'est pas encore persisté par séance : la rotation
  // s'appuie sur les semaines (seed) ; les rôles passés seront enrichis en M4
  // via le rapport trimestriel. On passe un objet vide ici (défaut déterministe).
  void pastRolesByChild;
  void sessions;

  const today = new Date().toISOString().slice(0, 10);
  const { data: lastSession } = await db
    .from("mentor_club_sessions")
    .select("atelier_key")
    .eq("squad_id", squadId)
    .order("occurred_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const atelierKey = getAtelierForDate(
    squadId,
    today,
    (lastSession?.atelier_key as AtelierKey) ?? null,
  );
  const atelier = SATURDAY_ATELIERS[atelierKey];

  // Rôles pour la semaine (déterministes, reproductibles à l'affichage).
  const { assignNaturalRoles } = await import("@/lib/saturday-clubs");
  const weekSeed = `${squadId}:${today.slice(0, 7)}`;
  const roleAssignment = assignNaturalRoles(members.map((m) => m.childProfileId), weekSeed);

  const { data: recent } = await db
    .from("mentor_club_sessions")
    .select("id, occurred_at, status, attendance, rejection_reason, vision_verdict")
    .eq("squad_id", squadId)
    .order("occurred_at", { ascending: false })
    .limit(6);

  return {
    squadId,
    name: squad.name,
    schoolId: squad.school_id ?? null,
    members: members.map((m) => ({
      ...m,
      role: roleAssignment[m.childProfileId] ?? null,
      roleLabel: roleAssignment[m.childProfileId] ? SQUAD_ROLE_LABEL[roleAssignment[m.childProfileId]] : null,
    })),
    todayAtelier: {
      key: atelierKey,
      label: atelier.label,
      materials: atelier.materials,
      brief: atelier.briefTemplate,
    },
    timeline: WORKSHOP_TIMELINE,
    recentSessions: (recent ?? []).map((s: any) => ({
      id: s.id,
      occurredAt: s.occurred_at,
      status: s.status,
      presentCount: Array.isArray(s.attendance) ? s.attendance.filter((a: any) => a.present).length : 0,
      payoutXof: s.vision_verdict?.payoutXof ?? null,
      rejectionReason: s.rejection_reason ?? null,
    })),
  };
}

export const getMySquad = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<SquadView | null> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;
    const userId = (context as any).claims?.sub as string;

    const { data: existing } = await db
      .from("mentor_squads")
      .select("id")
      .eq("mentor_user_id", userId)
      .eq("status", "active")
      .limit(1)
      .maybeSingle();
    if (!existing) return null;
    return buildSquadView(db, existing.id, userId);
  });

// Escouades actives d'un mentor — vue admin (annuaire Soutien + modale escouade).
export const listSquadsAdmin = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .validator((input: unknown) => z.object({ mentorUserId: z.string().uuid() }).parse(input))
  .handler(
    async ({
      data,
    }): Promise<
      Array<{ id: string; name: string; members: Array<{ id: string; name: string }> }>
    > => {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const db = supabaseAdmin as any;
      const { data: squads } = await db
        .from("mentor_squads")
        .select("id, name")
        .eq("mentor_user_id", data.mentorUserId)
        .eq("status", "active");
      const squadIds = (squads ?? []).map((s: any) => s.id as string);
      if (squadIds.length === 0) return [];
      const { data: members } = await db
        .from("mentor_squad_members")
        .select("squad_id, child_profile_id")
        .in("squad_id", squadIds)
        .is("removed_at", null);
      const childIds = [...new Set((members ?? []).map((m: any) => m.child_profile_id as string))];
      const { data: childRows } = childIds.length
        ? await db.from("child_profiles").select("id, name").in("id", childIds)
        : { data: [] };
      const nameById = new Map((childRows ?? []).map((c: any) => [c.id, c.name as string]));
      return (squads ?? []).map((s: any) => ({
        id: s.id,
        name: s.name,
        members: (members ?? [])
          .filter((m: any) => m.squad_id === s.id)
          .map((m: any) => ({
            id: m.child_profile_id as string,
            name: nameById.get(m.child_profile_id) ?? "Enfant",
          })),
      }));
    },
  );

// ── Séances ─────────────────────────────────────────────────────────────────

export const declareClubSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth, requireRateLimit])
  .validator((input: unknown) => DeclareSessionInput.parse(input))
  .handler(async ({ data, context }): Promise<{ sessionId: string; atelierKey: AtelierKey }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;
    const userId = (context as any).claims?.sub as string;

    const squad = await loadSquad(db, data.squadId, userId);
    const members = await loadActiveMembers(db, squad.id);
    const memberIds = new Set(members.map((m) => m.childProfileId));
    const presentCount = data.attendance.filter((a) => a.present).length;

    // Quorum à la déclaration : les absents sont notés, mais la séance doit
    // réunir une escouade valide pour être soumise (contrôle bis à la preuve).
    const category = await loadMentorCategory(db, userId);
    const quorum = checkSquadQuorum({ category, presentCount });
    if (!quorum.ok) {
      throw new Error(quorum.reason ?? "Quorum non atteint.");
    }
    for (const a of data.attendance) {
      if (!memberIds.has(a.childProfileId)) {
        throw new Error("Un enfant pointé n'appartient pas à cette escouade.");
      }
    }

    // Atelier du jour (rotation anti-répétition).
    const { data: lastSession } = await db
      .from("mentor_club_sessions")
      .select("atelier_key")
      .eq("squad_id", squad.id)
      .order("occurred_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const atelierKey = getAtelierForDate(squad.id, data.occurredAt, (lastSession?.atelier_key as AtelierKey) ?? null);

    // Anti-ferme (audit vague B) : redéclarer une journée dont la séance est
    // VALIDÉE ne doit pas la remettre en brouillon ni écraser les présences —
    // c'était le multiplicateur du payout contrôlé par le mentor.
    const { data: existing } = await db
      .from("mentor_club_sessions")
      .select("id, status")
      .eq("squad_id", squad.id)
      .eq("occurred_at", data.occurredAt)
      .maybeSingle();
    if (existing?.status === "validated") {
      throw new Error("La séance de ce jour est déjà validée — impossible de la redéclarer.");
    }

    const { data: created, error } = await db
      .from("mentor_club_sessions")
      .upsert(
        {
          squad_id: squad.id,
          mentor_user_id: userId,
          occurred_at: data.occurredAt,
          atelier_key: atelierKey,
          status: "draft",
          attendance: data.attendance,
        },
        { onConflict: "squad_id,occurred_at" },
      )
      .select("id")
      .single();
    if (error) throw new Error("Déclaration de séance impossible.");
    return { sessionId: created.id, atelierKey };
  });

export const submitClubSessionProof = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth, requireRateLimit])
  .validator((input: unknown) => SubmitProofInput.parse(input))
  .handler(async ({ data, context }): Promise<ClubSessionResult> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;
    const userId = (context as any).claims?.sub as string;

    // 0. Séance + escouade du mentor, en statut soumissible.
    const { data: session } = await db
      .from("mentor_club_sessions")
      .select("*")
      .eq("id", data.sessionId)
      .eq("mentor_user_id", userId)
      .in("status", ["draft", "rejected", "flagged"])
      .maybeSingle();
    if (!session) throw new Error("Séance introuvable ou déjà validée.");
    const squad = await loadSquad(db, session.squad_id, userId);

    const presentCount = Array.isArray(session.attendance)
      ? session.attendance.filter((a: any) => a.present).length
      : 0;
    const category = await loadMentorCategory(db, userId);
    const quorum = checkSquadQuorum({ category, presentCount });
    if (!quorum.ok) {
      throw new Error(quorum.reason ?? "Quorum non atteint.");
    }

    // 1. Empreinte SERVEUR sur les octets reçus (gratuit, avant tout appel IA).
    // CAS : le passage submitted n'écrase pas une séance déjà traitée
    // (double-soumission concurrente = un seul coureur).
    const { data: submittedRow } = await db
      .from("mentor_club_sessions")
      .update({ status: "submitted" })
      .eq("id", data.sessionId)
      .in("status", ["draft", "rejected", "flagged"])
      .select("id")
      .maybeSingle();
    if (!submittedRow) throw new Error("Séance déjà en cours de traitement ou validée.");
    const fp = await fingerprintProofImage(data.imageBase64, data.mediaType);

    let sameMentor: number | null = null;
    let global: number | null = null;
    let matchedSessionId: string | null = null;
    if (isComparableFingerprint(fp.fingerprint)) {
      const match = await findClosestFingerprintMatch(db, userId, fp.fingerprint);
      sameMentor = match.sameMentor;
      global = match.global;
      matchedSessionId = match.matchedSessionId;
    }

    // 2. Doublon CERTAIN du même mentor → rejet immédiat, PAS d'appel vision.
    if (sameMentor !== null && sameMentor <= 4) {
      await db
        .from("mentor_club_sessions")
        .update({
          status: "flagged",
          proof_image_fingerprint: fp.fingerprint || null,
          fingerprint_matched_session_id: matchedSessionId,
          rejection_reason: `Doublon de preuve détecté (distance ${sameMentor}/64 avec une séance antérieure). Revue Admin OS requise.`,
        })
        .eq("id", data.sessionId);
      return {
        sessionId: data.sessionId,
        decision: "flagged",
        reasons: [`Preuve quasi identique à une séance antérieure (distance ${sameMentor}/64).`],
        fingerprintMethod: fp.method,
        visionRan: false,
        payoutXof: null,
        matchedSessionId,
      };
    }

    // 3. Naya Vision (Claude Sonnet 5) sur les photos non-doublons.
    const atelier = SATURDAY_ATELIERS[(session.atelier_key as AtelierKey) in SATURDAY_ATELIERS ? (session.atelier_key as AtelierKey) : "fablab"];
    let vision: Awaited<ReturnType<typeof callClubSessionVision>> | null = null;
    try {
      vision = await callClubSessionVision(data.imageBase64, data.mediaType, atelier);
    } catch (err) {
      // Panne IA : la séance part en revue humaine avec l'empreinte seule —
      // le mentor n'est pas bloqué, l'admin tranche.
      console.error("Naya Vision indisponible :", err);
    }

    // 4. Arbitrage déterministe.
    const arbitrage = evaluateSessionFraud({
      hammingSameMentor: sameMentor,
      hammingGlobal: global,
      vision: vision
        ? {
            materialArtifactDetected: vision.materialArtifactDetected,
            confidence: vision.confidence,
            screenContentDetected: vision.screenContentDetected,
          }
        : null,
      presentCount,
    });

    // 5. Upload de la preuve (bucket 'proofs', convention validateChallengeProofCore).
    let proofPath: string | null = null;
    try {
      const ext = data.mediaType === "image/jpeg" ? "jpg" : data.mediaType.split("/")[1];
      proofPath = `club-sessions/${session.squad_id}/${data.sessionId}-${Date.now()}.${ext}`;
      await db.storage
        .from("proofs")
        .upload(proofPath, Buffer.from(data.imageBase64, "base64"), { contentType: data.mediaType });
    } catch (uploadErr) {
      console.error("Upload preuve club (non bloquant pour la décision) :", uploadErr);
    }

    // 6. Statut final + payout si validé.
    const { data: mentorProfile } = await db
      .from("mentor_profiles")
      .select("status")
      .eq("mentor_user_id", userId)
      .maybeSingle();
    const standing =
      mentorProfile?.status === "suspended"
        ? "frozen_suspended"
        : mentorProfile?.status === "banned"
          ? "banned"
          : "good_standing";
    const payout = computeSessionPayoutXof({ presentCount, category, standing });

    const finalStatus =
      arbitrage.decision === "validate" ? "validated" : arbitrage.decision === "flag" ? "flagged" : "rejected";
    const visionVerdict = {
      ...(vision ?? {}),
      arbitrageReasons: arbitrage.reasons,
      fingerprintMethod: fp.method,
      atelierKey: session.atelier_key,
    };

    // CAS : l'écriture finale ne touche que la séance encore au stade submitted
    // (un flag admin concurrent gagne, et le payout n'est jamais écrit deux fois).
    await db
      .from("mentor_club_sessions")
      .update({
        status: finalStatus,
        proof_image_path: proofPath,
        proof_image_fingerprint: fp.fingerprint || null,
        fingerprint_matched_session_id: matchedSessionId,
        naya_vision_confidence: vision ? vision.confidence : null,
        vision_verdict: visionVerdict,
        debrief_note: data.debriefNote ?? null,
        rejection_reason: arbitrage.decision === "reject" ? arbitrage.reasons.join(" ") : null,
        validated_at: finalStatus === "validated" ? new Date().toISOString() : null,
        // Ledger payout en COLONNE (audit vague B) : le jsonb garde l'arbitrage,
        // le montant dû est filtrable/sommable ici.
        payout_xof: finalStatus === "validated" ? payout.amountXof : null,
        payout_status: finalStatus === "validated" ? (payout.payable ? "pending" : "frozen") : "pending",
      })
      .eq("id", data.sessionId)
      .eq("status", "submitted");

    // 7. Validation → débriefing automatique aux parents des enfants présents.
    if (finalStatus === "validated") {
      const present = (session.attendance ?? []).filter((a: any) => a.present) as Array<{ childProfileId: string }>;
      for (const p of present) {
        const { data: child } = await db
          .from("child_profiles")
          .select("user_id")
          .eq("id", p.childProfileId)
          .maybeSingle();
        if (child?.user_id) {
          await notifyUser({
            userId: child.user_id,
            type: "club_session_debrief",
            childId: p.childProfileId,
            payload: {
              title: "Séance du Club du Samedi validée ✅",
              body: `L'atelier ${atelier.label} a été validé. Débriefing disponible dans l'espace parent.`,
              sessionId: data.sessionId,
              squadName: squad.name,
            },
          }).catch(() => {});
        }
      }
    }

    return {
      sessionId: data.sessionId,
      decision: finalStatus as ClubSessionResult["decision"],
      reasons: arbitrage.reasons,
      fingerprintMethod: fp.method,
      visionRan: vision !== null,
      payoutXof: finalStatus === "validated" ? payout.amountXof : null,
      matchedSessionId,
    };
  });

export const listMyClubSessions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;
    const userId = (context as any).claims?.sub as string;

    const { data: sessions } = await db
      .from("mentor_club_sessions")
      .select("id, occurred_at, atelier_key, status, attendance, rejection_reason, vision_verdict, validated_at")
      .eq("mentor_user_id", userId)
      .order("occurred_at", { ascending: false })
      .limit(30);
    return (sessions ?? []).map((s: any) => ({
      id: s.id,
      occurredAt: s.occurred_at,
      atelierKey: s.atelier_key,
      status: s.status,
      presentCount: Array.isArray(s.attendance) ? s.attendance.filter((a: any) => a.present).length : 0,
      rejectionReason: s.rejection_reason,
      payoutXof: s.vision_verdict?.payoutXof ?? null,
      validatedAt: s.validated_at,
    }));
  });

export { ATELIER_KEYS };

// ── Ledger admin : marquer les séances de club payées (audit vague B) ────────

const MarkClubSessionsPaidInput = z.object({
  mentorUserId: z.string().uuid(),
  /** Référence de virement/retrait (Mobile Money, banque) — traçabilité du paiement. */
  reference: z.string().min(3).max(120),
  /** Séances précises ; à défaut, toutes les pending du mentor. */
  sessionIds: z.array(z.string().uuid()).max(200).optional(),
});

export const markClubSessionsPaidAdmin = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((input: unknown) => MarkClubSessionsPaidInput.parse(input))
  .handler(async ({ data, context }): Promise<{ marked: number; totalXof: number }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;
    const adminUserId = (context as any).claims?.sub as string;

    let query = db
      .from("mentor_club_sessions")
      .select("id, payout_xof")
      .eq("mentor_user_id", data.mentorUserId)
      .eq("payout_status", "pending")
      .eq("status", "validated");
    if (data.sessionIds?.length) query = query.in("id", data.sessionIds);
    const { data: pending, error } = await query;
    if (error) throw new Error("Lecture des séances pending impossible.");
    if (!pending?.length) return { marked: 0, totalXof: 0 };

    const ids = pending.map((p: any) => p.id as string);
    const totalXof = pending.reduce((sum: number, p: any) => sum + (p.payout_xof ?? 0), 0);

    // CAS : pending → paid seulement (jamais double-paiement d'une ligne déjà soldée).
    const { error: updErr } = await db
      .from("mentor_club_sessions")
      .update({
        payout_status: "paid",
        paid_at: new Date().toISOString(),
        paid_reference: data.reference,
      })
      .in("id", ids)
      .eq("payout_status", "pending");
    if (updErr) throw new Error("Marquage du paiement impossible.");

    console.log(
      `[club-payout] ${ids.length} séance(s) marquées payées pour mentor ${data.mentorUserId.slice(0, 8)}… ` +
        `(${totalXof} FCFA, réf ${data.reference}, par admin ${adminUserId.slice(0, 8)}…)`,
    );
    return { marked: ids.length, totalXof };
  });
