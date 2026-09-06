import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireAdmin } from "@/integrations/supabase/admin-middleware";
import { z } from "zod";
import type { EstablishmentColleague } from "./educators-lookup.functions";

export type SchoolType =
  "public" | "private_secular" | "private_religious" | "international" | "other";

export type SchoolStatus = "community" | "verified" | "partner_campus" | "archived";

export type SchoolPricingTier = "free" | "pilot" | "standard_campus" | "sponsored";

export interface SchoolItem {
  id: string;
  name: string;
  slug: string;
  code: string;
  countryCode: string;
  city: string;
  address: string | null;
  type: SchoolType;
  status: SchoolStatus;
  leaderUserId: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  websiteUrl: string | null;
  pricingTier: SchoolPricingTier;
  licensedStudentsQuota: number;
  licenseValidUntil: string | null;
  licensePaid: boolean;
  sponsorCampaignId: string | null;
  createdAt: string;
  updatedAt: string;
  educatorsCount?: number;
  classesCount?: number;
  activeStudentsCount?: number;
}

export interface MySchoolOverview {
  hasSchool: boolean;
  school: SchoolItem | null;
  isLeader: boolean;
  colleagues: EstablishmentColleague[];
  totalColleagues: number;
  totalClasses: number;
}

/**
 * Normalise une chaîne pour créer un slug URL-friendly sans accents
 */
export function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Génère un code d'établissement unique et mémorisable (ex: "#CSV-OUAGA", "#LCA-ABIDJAN")
 */
export function generateSchoolCode(name: string, city: string): string {
  const cleanCity = city
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z]/g, "");

  const cityTag = cleanCity.length > 5 ? cleanCity.slice(0, 5) : cleanCity || "CAMPUS";

  const stopWords = new Set([
    "DE",
    "DU",
    "LA",
    "LE",
    "LES",
    "DES",
    "D",
    "L",
    "ET",
    "AU",
    "AUX",
    "ECOLE",
    "LYCEE",
    "COLLEGE",
    "COMPLEXE",
    "GROUPE",
    "SCOLAIRE",
    "INSTITUT",
    "ETABLISSEMENT",
    "CENTRE",
  ]);

  const words = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);

  const significant = words.filter((w) => !stopWords.has(w));
  let initials = "";

  if (significant.length >= 2) {
    initials = significant
      .map((w) => w[0])
      .join("")
      .slice(0, 4);
  } else if (significant.length === 1) {
    initials = significant[0].slice(0, 4);
  } else {
    initials =
      words
        .map((w) => w[0])
        .join("")
        .slice(0, 3) || "GEN";
  }

  return `#${initials}-${cityTag}`;
}

export function formatSchoolCode(code: string): string {
  const trimmed = code.trim().toUpperCase();
  return trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
}

/**
 * Désaccentue une chaîne (miroir JS de genizio_unaccent en base). Sert à
 * normaliser la requête avant filtrage sur schools.search_text (colonne
 * générée désaccentuée, indexée trigram).
 */
export function stripAccents(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/œ/gi, "o")
    .replace(/æ/gi, "a");
}

/**
 * Règle métier : calcul de conformité des quotas d'un établissement
 * (previously defined only in schools.test.ts — never enforced).
 */
export function evaluateCampusLicense(school: {
  status: string;
  pricingTier: string;
  licensedStudentsQuota: number;
  licenseValidUntil?: string | null;
  activeStudentsCount: number;
}): {
  isOverQuota: boolean;
  remainingSlots: number;
  hasActiveCampusPass: boolean;
} {
  const isExpired = school.licenseValidUntil
    ? new Date(school.licenseValidUntil).getTime() < Date.now()
    : false;

  const hasActiveCampusPass =
    (school.status === "partner_campus" || school.pricingTier !== "free") && !isExpired;

  const quota = school.licensedStudentsQuota ?? 0;
  const remainingSlots = Math.max(0, quota - school.activeStudentsCount);
  const isOverQuota = quota > 0 && school.activeStudentsCount > quota;

  return {
    isOverQuota,
    remainingSlots,
    hasActiveCampusPass,
  };
}

const SearchSchoolsInputSchema = z.object({
  query: z.string().optional().default(""),
  limit: z.number().optional().default(20),
});

/**
 * Autocomplete & Recherche d'établissements scolaires (insensible à la casse
 * ET aux accents — filtre sur schools.search_text, colonne générée
 * désaccentuée + index trigram).
 */
export const searchSchools = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => SearchSchoolsInputSchema.parse(data ?? {}))
  .handler(async ({ data }): Promise<SchoolItem[]> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;
    const rawQuery = (data?.query || "").trim();
    const cleanQuery = rawQuery.startsWith("#") ? rawQuery.slice(1) : rawQuery;
    const limit = Math.min(Math.max(data?.limit || 20, 1), 50);

    let queryBuilder = db.from("schools").select("*").neq("status", "archived").limit(limit);

    if (cleanQuery.length >= 2) {
      // La requête passe par la même désaccentuation que la colonne : « Ecole »
      // trouve « École ». Le upper() du code ne sert plus (search_text est
      // lower()) ; on matche aussi sans le '#'.
      const normalized = stripAccents(cleanQuery).toLowerCase();
      const noHash = normalized.replace(/#/g, "");
      queryBuilder = queryBuilder.or(
        `search_text.ilike.%${normalized}%,search_text.ilike.%${noHash}%`,
      );
    } else {
      queryBuilder = queryBuilder
        .order("status", { ascending: false })
        .order("name", { ascending: true });
    }

    const { data: rows, error } = await queryBuilder;

    if (error || !rows) {
      console.error("Erreur searchSchools:", error);
      return [];
    }

    return rows.map((r: any) => ({
      id: r.id,
      name: r.name,
      slug: r.slug,
      code: formatSchoolCode(r.code),
      countryCode: r.country_code,
      city: r.city,
      address: r.address,
      type: r.type,
      status: r.status,
      leaderUserId: r.leader_user_id,
      contactEmail: r.contact_email,
      contactPhone: r.contact_phone,
      websiteUrl: r.website_url,
      pricingTier: r.pricing_tier,
      licensedStudentsQuota: r.licensed_students_quota ?? 0,
      licenseValidUntil: r.license_valid_until,
      sponsorCampaignId: r.sponsor_campaign_id,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
  });

const SuggestSchoolInputSchema = z.object({
  name: z
    .string()
    .min(2, "Le nom de l'établissement doit comporter au moins 2 caractères")
    .max(120),
  city: z.string().min(2, "La ville est requise").max(80),
  countryCode: z.string().length(2).default("BF"),
  type: z
    .enum(["public", "private_secular", "private_religious", "international", "other"])
    .default("public"),
  address: z.string().max(200).optional(),
  isLeader: z.boolean().optional().default(false),
});

/**
 * Crée une demande de rôle « Chef d'établissement » en attente de validation
 * admin. Idempotent : l'index unique partiel (user_id) WHERE status='pending'
 * absorbe les doublons — une erreur ici n'empêche jamais la sélection de
 * l'établissement (la demande de direction est secondaire).
 */
async function maybeCreateLeaderRequest(
  db: any,
  userId: string,
  schoolId: string,
  isLeader: boolean,
): Promise<void> {
  if (!isLeader) return;
  try {
    const { error } = await db.from("school_leader_requests").insert({
      school_id: schoolId,
      user_id: userId,
      note: "Demande émise à la déclaration de l'établissement.",
    });
    if (error) console.warn("Demande de direction non créée (déjà en attente ?) :", error.message);
  } catch (err) {
    console.warn("maybeCreateLeaderRequest échec :", err);
  }
}

/**
 * Permet à un enseignant ou conseiller d'enregistrer son établissement
 * s'il n'existe pas encore (statut "community" par défaut, déduplication automatique).
 */
export const suggestSchool = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => SuggestSchoolInputSchema.parse(data))
  .handler(async ({ data, context }): Promise<SchoolItem> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;
    const userId =
      (context as any).userId || (context as any).claims?.sub || (context as any).user?.id;

    const trimmedName = data.name.trim();
    const trimmedCity = data.city.trim();

    // 1. Déduplication : vérifier si une école avec un nom et une ville similaires existe déjà
    const baseSlug = slugify(`${trimmedName}-${trimmedCity}`);
    const { data: existing } = await db
      .from("schools")
      .select("*")
      .or(`slug.eq.${baseSlug},name.ilike.${trimmedName}`)
      .ilike("city", trimmedCity)
      .maybeSingle();

    if (existing) {
      // Souveraineté : l'auto-proclamation de direction ne confère plus
      // leader_user_id — elle crée une demande à valider par l'admin.
      await maybeCreateLeaderRequest(db, userId, existing.id, data.isLeader);
      return {
        id: existing.id,
        name: existing.name,
        slug: existing.slug,
        code: formatSchoolCode(existing.code),
        countryCode: existing.country_code,
        city: existing.city,
        address: existing.address,
        type: existing.type,
        status: existing.status,
        leaderUserId: existing.leader_user_id,
        contactEmail: existing.contact_email,
        contactPhone: existing.contact_phone,
        websiteUrl: existing.website_url,
        pricingTier: existing.pricing_tier,
        licensedStudentsQuota: existing.licensed_students_quota ?? 0,
        licenseValidUntil: existing.license_valid_until,
        licensePaid: existing.license_paid ?? false,
        sponsorCampaignId: existing.sponsor_campaign_id,
        createdAt: existing.created_at,
        updatedAt: existing.updated_at,
      };
    }

    // 2. Génération du code unique de ralliement (#CODE-CITY)
    let candidateCode = generateSchoolCode(trimmedName, trimmedCity);
    const { data: codeConflict } = await db
      .from("schools")
      .select("id")
      .eq("code", candidateCode)
      .maybeSingle();

    if (codeConflict) {
      candidateCode = `${candidateCode}-${Math.floor(10 + Math.random() * 90)}`;
    }

    // 3. Insertion de l'établissement communautaire
    // (leader_user_id jamais posé ici : la direction passe par validation.)
    const { data: created, error } = await db
      .from("schools")
      .insert({
        name: trimmedName,
        slug: baseSlug,
        code: candidateCode,
        country_code: data.countryCode.toUpperCase(),
        city: trimmedCity,
        address: data.address?.trim() || null,
        type: data.type,
        status: "community",
        pricing_tier: "free",
        licensed_students_quota: 0,
        leader_user_id: null,
      })
      .select("*")
      .single();

    if (error || !created) {
      console.error("Erreur suggestSchool:", error);
      throw new Error(
        `Impossible d'enregistrer l'établissement : ${error?.message || "Erreur serveur"}`,
      );
    }

    await maybeCreateLeaderRequest(db, userId, created.id, data.isLeader);

    return {
      id: created.id,
      name: created.name,
      slug: created.slug,
      code: formatSchoolCode(created.code),
      countryCode: created.country_code,
      city: created.city,
      address: created.address,
      type: created.type,
      status: created.status,
      leaderUserId: created.leader_user_id,
      contactEmail: created.contact_email,
      contactPhone: created.contact_phone,
      websiteUrl: created.website_url,
      pricingTier: created.pricing_tier,
      licensedStudentsQuota: created.licensed_students_quota ?? 0,
      licenseValidUntil: created.license_valid_until,
      licensePaid: created.license_paid ?? false,
      sponsorCampaignId: created.sponsor_campaign_id,
      createdAt: created.created_at,
      updatedAt: created.updated_at,
    };
  });

/**
 * Récupère les données consolidées de l'établissement de l'utilisateur connecté
 * et de l'ensemble de ses collègues d'école.
 */
export const getMySchoolOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<MySchoolOverview> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;
    const userId =
      (context as any).userId || (context as any).claims?.sub || (context as any).user?.id;

    const { data: myProfile } = await db
      .from("educator_profiles")
      .select("school_id, organization_name")
      .eq("user_id", userId)
      .maybeSingle();

    if (!myProfile || (!myProfile.school_id && !myProfile.organization_name)) {
      return {
        hasSchool: false,
        school: null,
        isLeader: false,
        colleagues: [],
        totalColleagues: 0,
        totalClasses: 0,
      };
    }

    let schoolRow: any = null;
    if (myProfile.school_id) {
      const { data: s } = await db
        .from("schools")
        .select("*")
        .eq("id", myProfile.school_id)
        .maybeSingle();
      schoolRow = s;
    } else if (myProfile.organization_name) {
      const { data: s } = await db
        .from("schools")
        .select("*")
        .ilike("name", myProfile.organization_name.trim())
        .maybeSingle();
      schoolRow = s;
    }

    let colleaguesQuery = db
      .from("educator_profiles")
      .select(
        "id, full_name, handle, class_code, professional_role, is_verified, whatsapp_phone, created_at, school_id, organization_name",
      );

    if (schoolRow?.id) {
      colleaguesQuery = colleaguesQuery.or(
        `school_id.eq.${schoolRow.id},organization_name.ilike.${schoolRow.name}`,
      );
    } else if (myProfile.organization_name) {
      colleaguesQuery = colleaguesQuery.ilike(
        "organization_name",
        myProfile.organization_name.trim(),
      );
    }

    const { data: rows } = await colleaguesQuery.order("created_at", { ascending: true });

    const uniqueClasses = new Set<string>();
    const colleagues: EstablishmentColleague[] = (rows ?? []).map((r: any) => {
      if (r.class_code) uniqueClasses.add(r.class_code.toUpperCase());
      return {
        id: r.id,
        fullName: r.full_name,
        handle: r.handle ? (r.handle.startsWith("@") ? r.handle : `@${r.handle}`) : null,
        classCode: r.class_code
          ? r.class_code.startsWith("#")
            ? r.class_code
            : `#${r.class_code}`
          : null,
        professionalRole: r.professional_role,
        isVerified: Boolean(r.is_verified),
        whatsappPhone: r.whatsapp_phone || null,
        createdAt: r.created_at,
      };
    });

    const schoolItem: SchoolItem | null = schoolRow
      ? {
          id: schoolRow.id,
          name: schoolRow.name,
          slug: schoolRow.slug,
          code: formatSchoolCode(schoolRow.code),
          countryCode: schoolRow.country_code,
          city: schoolRow.city,
          address: schoolRow.address,
          type: schoolRow.type,
          status: schoolRow.status,
          leaderUserId: schoolRow.leader_user_id,
          contactEmail: schoolRow.contact_email,
          contactPhone: schoolRow.contact_phone,
          websiteUrl: schoolRow.website_url,
          pricingTier: schoolRow.pricing_tier,
          licensedStudentsQuota: schoolRow.licensed_students_quota ?? 0,
          licenseValidUntil: schoolRow.license_valid_until,
          licensePaid: schoolRow.license_paid ?? false,
          sponsorCampaignId: schoolRow.sponsor_campaign_id,
          createdAt: schoolRow.created_at,
          updatedAt: schoolRow.updated_at,
        }
      : null;

    return {
      hasSchool: !!schoolItem || !!myProfile.organization_name,
      school: schoolItem,
      isLeader: schoolItem?.leaderUserId === userId,
      colleagues,
      totalColleagues: colleagues.length,
      totalClasses: uniqueClasses.size,
    };
  });

/**
 * Super Admin : Liste régalienne de tous les établissements avec compteurs et quotas
 */
export const listSchoolsAdmin = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async (): Promise<SchoolItem[]> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;

    const { data: schools, error } = await db
      .from("schools")
      .select("*")
      .order("created_at", { ascending: false });

    if (error || !schools) {
      console.error("Erreur listSchoolsAdmin:", error);
      return [];
    }

    const { data: educators } = await db.from("educator_profiles").select("school_id, class_code");
    const { data: childSchools } = await db
      .from("child_schools")
      .select("school_id")
      .eq("status", "active");

    const educatorCountMap = new Map<string, number>();
    const classesCountMap = new Map<string, Set<string>>();
    const studentsCountMap = new Map<string, number>();

    for (const edu of educators ?? []) {
      if (edu.school_id) {
        educatorCountMap.set(edu.school_id, (educatorCountMap.get(edu.school_id) ?? 0) + 1);
        if (edu.class_code) {
          if (!classesCountMap.has(edu.school_id)) {
            classesCountMap.set(edu.school_id, new Set());
          }
          classesCountMap.get(edu.school_id)!.add(edu.class_code.toUpperCase());
        }
      }
    }
    for (const cs of childSchools ?? []) {
      studentsCountMap.set(cs.school_id, (studentsCountMap.get(cs.school_id) ?? 0) + 1);
    }

    return schools.map((s: any) => ({
      id: s.id,
      name: s.name,
      slug: s.slug,
      code: formatSchoolCode(s.code),
      countryCode: s.country_code,
      city: s.city,
      address: s.address,
      type: s.type,
      status: s.status,
      leaderUserId: s.leader_user_id,
      contactEmail: s.contact_email,
      contactPhone: s.contact_phone,
      websiteUrl: s.website_url,
      pricingTier: s.pricing_tier,
      licensedStudentsQuota: s.licensed_students_quota ?? 0,
      licenseValidUntil: s.license_valid_until,
      licensePaid: s.license_paid ?? false,
      sponsorCampaignId: s.sponsor_campaign_id,
      createdAt: s.created_at,
      updatedAt: s.updated_at,
      educatorsCount: educatorCountMap.get(s.id) ?? 0,
      classesCount: classesCountMap.get(s.id)?.size ?? 0,
      activeStudentsCount: studentsCountMap.get(s.id) ?? 0,
    }));
  });

const CreateSchoolAdminSchema = z.object({
  name: z.string().min(2),
  city: z.string().min(2),
  countryCode: z.string().default("BF"),
  type: z.enum(["public", "private_secular", "private_religious", "international", "other"]),
  status: z.enum(["community", "verified", "partner_campus", "archived"]).default("verified"),
  pricingTier: z.enum(["free", "pilot", "standard_campus", "sponsored"]).default("free"),
  licensedStudentsQuota: z.number().min(0).default(0),
  licensePaid: z.boolean().optional().default(false),
  address: z.string().optional(),
  contactEmail: z.string().email().optional().or(z.literal("")),
  contactPhone: z.string().optional(),
  websiteUrl: z.string().url().optional().or(z.literal("")),
  leaderUserId: z.string().uuid().optional().nullable(),
  sponsorCampaignId: z.string().uuid().optional().nullable(),
});

/**
 * Super Admin : Création manuelle d'un établissement certifié ou partenaire
 */
export const createSchoolAdmin = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((data: unknown) => CreateSchoolAdminSchema.parse(data))
  .handler(async ({ data }): Promise<SchoolItem> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;
    const trimmedName = data.name.trim();
    const trimmedCity = data.city.trim();
    const baseSlug = slugify(`${trimmedName}-${trimmedCity}`);
    const code = generateSchoolCode(trimmedName, trimmedCity);

    const { data: created, error } = await db
      .from("schools")
      .insert({
        name: trimmedName,
        slug: baseSlug,
        code,
        country_code: data.countryCode.toUpperCase(),
        city: trimmedCity,
        type: data.type,
        status: data.status,
        pricing_tier: data.pricingTier,
        licensed_students_quota: data.licensedStudentsQuota,
        license_paid: data.licensePaid,
        address: data.address?.trim() || null,
        contact_email: data.contactEmail?.trim() || null,
        contact_phone: data.contactPhone?.trim() || null,
        website_url: data.websiteUrl?.trim() || null,
        leader_user_id: data.leaderUserId || null,
        sponsor_campaign_id: data.sponsorCampaignId || null,
      })
      .select("*")
      .single();

    if (error || !created) {
      console.error("Erreur createSchoolAdmin:", error);
      throw new Error(`Impossible de créer l'établissement : ${error?.message}`);
    }

    return {
      id: created.id,
      name: created.name,
      slug: created.slug,
      code: formatSchoolCode(created.code),
      countryCode: created.country_code,
      city: created.city,
      address: created.address,
      type: created.type,
      status: created.status,
      leaderUserId: created.leader_user_id,
      contactEmail: created.contact_email,
      contactPhone: created.contact_phone,
      websiteUrl: created.website_url,
      pricingTier: created.pricing_tier,
      licensedStudentsQuota: created.licensed_students_quota ?? 0,
      licenseValidUntil: created.license_valid_until,
      licensePaid: created.license_paid ?? false,
      sponsorCampaignId: created.sponsor_campaign_id,
      createdAt: created.created_at,
      updatedAt: created.updated_at,
    };
  });

const UpdateSchoolAdminSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(2).optional(),
  city: z.string().min(2).optional(),
  type: z
    .enum(["public", "private_secular", "private_religious", "international", "other"])
    .optional(),
  status: z.enum(["community", "verified", "partner_campus", "archived"]).optional(),
  pricingTier: z.enum(["free", "pilot", "standard_campus", "sponsored"]).optional(),
  licensedStudentsQuota: z.number().min(0).optional(),
  licensePaid: z.boolean().optional(),
  // Date simple « YYYY-MM-DD » (input type=date) normalisée en ISO côté handler.
  licenseValidUntil: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
  address: z.string().optional().nullable(),
  contactEmail: z.string().optional().nullable(),
  contactPhone: z.string().optional().nullable(),
  websiteUrl: z.string().optional().nullable(),
  leaderUserId: z.string().uuid().optional().nullable(),
  leaderEmail: z.string().email().optional().nullable(),
  sponsorCampaignId: z.string().uuid().optional().nullable(),
  code: z.string().optional(),
});

/**
 * Super Admin : Mise à jour des attributs, quotas et statut d'un établissement
 */
export const updateSchoolAdmin = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((data: unknown) => UpdateSchoolAdminSchema.parse(data))
  .handler(async ({ data }): Promise<SchoolItem> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;

    const updatePayload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (data.name !== undefined) updatePayload.name = data.name.trim();
    if (data.city !== undefined) updatePayload.city = data.city.trim();
    if (data.type !== undefined) updatePayload.type = data.type;
    if (data.status !== undefined) updatePayload.status = data.status;
    if (data.pricingTier !== undefined) updatePayload.pricing_tier = data.pricingTier;
    if (data.licensedStudentsQuota !== undefined)
      updatePayload.licensed_students_quota = data.licensedStudentsQuota;
    if (data.licensePaid !== undefined) {
      updatePayload.license_paid = data.licensePaid;
      // Traçabilité de l'encaissement : la pose manuelle de « payée » date la
      // licence ; la remise en « impayée » conserve l'historique (license_paid_at).
      if (data.licensePaid) updatePayload.license_paid_at = new Date().toISOString();
    }
    if (data.licenseValidUntil !== undefined) {
      updatePayload.license_valid_until = data.licenseValidUntil
        ? new Date(`${data.licenseValidUntil}T23:59:59.999Z`).toISOString()
        : null;
    }
    if (data.address !== undefined) updatePayload.address = data.address?.trim() || null;
    if (data.contactEmail !== undefined)
      updatePayload.contact_email = data.contactEmail?.trim() || null;
    if (data.contactPhone !== undefined)
      updatePayload.contact_phone = data.contactPhone?.trim() || null;
    if (data.websiteUrl !== undefined) updatePayload.website_url = data.websiteUrl?.trim() || null;
    if (data.leaderUserId !== undefined) updatePayload.leader_user_id = data.leaderUserId;
    if (data.sponsorCampaignId !== undefined)
      updatePayload.sponsor_campaign_id = data.sponsorCampaignId;
    if (data.code !== undefined) updatePayload.code = formatSchoolCode(data.code);

    // Si l'admin fournit un leaderEmail, on cherche son ID dans l'auth
    if (data.leaderEmail) {
      const { data: usersData, error: usersErr } = await db.auth.admin.listUsers();
      if (!usersErr && usersData?.users) {
        const found = usersData.users.find((u: any) => u.email === data.leaderEmail);
        if (found) {
          updatePayload.leader_user_id = found.id;
        } else {
          throw new Error(`Aucun utilisateur trouvé avec l'email ${data.leaderEmail}`);
        }
      }
    }

    const { data: updated, error } = await db
      .from("schools")
      .update(updatePayload)
      .eq("id", data.id)
      .select("*")
      .single();

    if (error || !updated) {
      console.error("Erreur updateSchoolAdmin:", error);
      throw new Error(`Impossible de mettre à jour l'établissement : ${error?.message}`);
    }

    return {
      id: updated.id,
      name: updated.name,
      slug: updated.slug,
      code: formatSchoolCode(updated.code),
      countryCode: updated.country_code,
      city: updated.city,
      address: updated.address,
      type: updated.type,
      status: updated.status,
      leaderUserId: updated.leader_user_id,
      contactEmail: updated.contact_email,
      contactPhone: updated.contact_phone,
      websiteUrl: updated.website_url,
      pricingTier: updated.pricing_tier,
      licensedStudentsQuota: updated.licensed_students_quota ?? 0,
      licenseValidUntil: updated.license_valid_until,
      licensePaid: updated.license_paid ?? false,
      sponsorCampaignId: updated.sponsor_campaign_id,
      createdAt: updated.created_at,
      updatedAt: updated.updated_at,
    };
  });
