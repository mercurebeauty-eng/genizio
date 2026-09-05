import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export interface EducatorLookupResult {
  id?: string;
  handle: string | null;
  fullName: string;
  organizationName: string | null;
  professionalRole: "teacher" | "counselor" | "psychologist" | "other";
  classCode: string | null;
  isVerified: boolean;
  email?: string;
  schoolId?: string | null;
  schoolCode?: string | null;
  schoolStatus?: string | null;
  schoolCity?: string | null;
}

const LookupQuerySchema = z.string().min(2).max(100);

/**
 * Résout un professionnel de l'éducation par son @handle, son #CodeClasse, son #CodeEtablissement ou son email.
 * Protège la vie privée : ne renvoie que l'identité professionnelle de validation.
 */
export const lookupEducator = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((query: string) => LookupQuerySchema.parse(query))
  .handler(async ({ data: rawQuery }): Promise<EducatorLookupResult | null> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;
    const query = rawQuery.trim();

    // Normalisation : enlever le préfixe @ ou #
    const cleanQuery = query.startsWith("@") || query.startsWith("#") ? query.slice(1) : query;
    const lowerQuery = cleanQuery.toLowerCase();
    const upperQuery = cleanQuery.toUpperCase();

    // 1. Recherche directe dans educator_profiles par handle ou code classe
    const { data: profile } = await db
      .from("educator_profiles")
      .select("*")
      .or(`handle.ilike.${lowerQuery},class_code.ilike.${upperQuery}`)
      .limit(1)
      .maybeSingle();

    if (profile) {
      let educatorEmail: string | undefined = undefined;
      if (profile.user_id) {
        const { data: u } = await supabaseAdmin.auth.admin.getUserById(profile.user_id);
        educatorEmail = u.user?.email;
      }

      let schoolCode: string | null = null;
      let schoolStatus: string | null = null;
      let schoolCity: string | null = null;

      if (profile.school_id) {
        const { data: school } = await db
          .from("schools")
          .select("code, status, city")
          .eq("id", profile.school_id)
          .maybeSingle();
        if (school) {
          schoolCode = school.code.startsWith("#") ? school.code : `#${school.code}`;
          schoolStatus = school.status;
          schoolCity = school.city;
        }
      }

      return {
        id: profile.id,
        handle: profile.handle ? `@${profile.handle}` : null,
        fullName: profile.full_name,
        organizationName: profile.organization_name,
        professionalRole: profile.professional_role as any,
        classCode: profile.class_code ? `#${profile.class_code}` : null,
        isVerified: profile.is_verified,
        email: educatorEmail,
        schoolId: profile.school_id || null,
        schoolCode,
        schoolStatus,
        schoolCity,
      };
    }

    // 2. Recherche par #Code d'établissement scolaire (ex: #CSV-OUAGA)
    if (query.startsWith("#") || query.includes("-")) {
      const { data: school } = await db
        .from("schools")
        .select("*")
        .or(`code.ilike.${upperQuery},code.ilike.#${upperQuery},slug.ilike.${lowerQuery}`)
        .maybeSingle();

      if (school) {
        // Trouver le premier éducateur ou le leader rattaché à cet établissement
        const { data: schoolEducators } = await db
          .from("educator_profiles")
          .select("*")
          .eq("school_id", school.id)
          .order("is_verified", { ascending: false })
          .limit(1);

        const leaderEdu = schoolEducators?.[0];
        if (leaderEdu) {
          let educatorEmail: string | undefined = undefined;
          if (leaderEdu.user_id) {
            const { data: u } = await supabaseAdmin.auth.admin.getUserById(leaderEdu.user_id);
            educatorEmail = u.user?.email;
          }

          return {
            id: leaderEdu.id,
            handle: leaderEdu.handle ? `@${leaderEdu.handle}` : null,
            fullName: leaderEdu.full_name,
            organizationName: school.name,
            professionalRole: leaderEdu.professional_role as any,
            classCode: leaderEdu.class_code ? `#${leaderEdu.class_code}` : null,
            isVerified: leaderEdu.is_verified || school.status === "verified" || school.status === "partner_campus",
            email: educatorEmail,
            schoolId: school.id,
            schoolCode: school.code.startsWith("#") ? school.code : `#${school.code}`,
            schoolStatus: school.status,
            schoolCity: school.city,
          };
        }

        // Si l'école est enregistrée mais n'a pas encore de profil rattaché
        return {
          id: undefined,
          handle: null,
          fullName: `Équipe Pédagogique - ${school.name}`,
          organizationName: school.name,
          professionalRole: "other",
          classCode: null,
          isVerified: school.status === "verified" || school.status === "partner_campus",
          email: school.contact_email || undefined,
          schoolId: school.id,
          schoolCode: school.code.startsWith("#") ? school.code : `#${school.code}`,
          schoolStatus: school.status,
          schoolCity: school.city,
        };
      }
    }

    // 3. Si c'est un format email, recherche dans auth.users
    if (query.includes("@") && query.includes(".")) {
      const { data: userList } = await supabaseAdmin.auth.admin.listUsers();
      const user = userList?.users?.find((u) => u.email?.toLowerCase() === lowerQuery);
      if (user) {
        return {
          handle: null,
          fullName: (user.user_metadata?.full_name as string) || user.email?.split("@")[0] || "Enseignant",
          organizationName: (user.user_metadata?.organization_name as string) || null,
          professionalRole: (user.user_metadata?.role as any) || "teacher",
          classCode: null,
          isVerified: false,
          email: user.email,
        };
      }
    }

    return null;
  });

const SaveEducatorProfileSchema = z.object({
  handle: z
    .string()
    .min(3, "L'identifiant doit comporter au moins 3 caractères")
    .max(30)
    .regex(/^[a-zA-Z0-9._-]+$/, "Caractères autorisés : lettres, chiffres, tirets, points")
    .optional(),
  fullName: z.string().min(2, "Nom requis"),
  professionalRole: z.enum(["teacher", "counselor", "psychologist", "other"]),
  organizationName: z.string().optional(),
  schoolId: z.string().uuid().optional().nullable(),
  classCode: z
    .string()
    .max(20)
    .regex(/^[a-zA-Z0-9_-]*$/, "Caractères autorisés pour le code classe : lettres, chiffres, tirets")
    .optional(),
  whatsappPhone: z.string().optional(),
});

/**
 * Permet à un éducateur de configurer son profil, son @handle, son école et son #CodeClasse.
 */
export const saveMyEducatorProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => SaveEducatorProfileSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;
    const userId = (context as any).userId || (context as any).claims?.sub || (context as any).user?.id;

    const normalizedHandle = data.handle?.toLowerCase().trim() || null;
    const normalizedClassCode = data.classCode?.toUpperCase().trim() || null;

    // Vérification d'unicité du handle si fourni
    if (normalizedHandle) {
      const { data: existing } = await db
        .from("educator_profiles")
        .select("id, user_id")
        .eq("handle", normalizedHandle)
        .maybeSingle();

      if (existing && existing.user_id !== userId) {
        throw new Error(`L'identifiant @${normalizedHandle} est déjà utilisé par un autre professionnel.`);
      }
    }

    let orgName = data.organizationName?.trim() || null;

    // Si schoolId est fourni mais sans nom textuel, récupérer le nom officiel de l'école
    if (data.schoolId) {
      const { data: school } = await db
        .from("schools")
        .select("name")
        .eq("id", data.schoolId)
        .maybeSingle();
      if (school) {
        orgName = school.name;
      }
    }

    const { data: profile, error } = await db
      .from("educator_profiles")
      .upsert(
        {
          user_id: userId,
          handle: normalizedHandle,
          full_name: data.fullName.trim(),
          professional_role: data.professionalRole,
          organization_name: orgName,
          school_id: data.schoolId || null,
          class_code: normalizedClassCode,
          whatsapp_phone: data.whatsappPhone?.trim() || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      )
      .select("*")
      .single();

    if (error) {
      console.error("Erreur saveMyEducatorProfile:", error);
      throw new Error(`Impossible d'enregistrer le profil : ${error.message}`);
    }

    // Mettre à jour les métadonnées de l'utilisateur
    const { data: userData } = await supabaseAdmin.auth.admin.getUserById(userId);
    await supabaseAdmin.auth.admin.updateUserById(userId, {
      user_metadata: {
        ...(userData?.user?.user_metadata ?? {}),
        has_educator_profile: true,
        educator_handle: normalizedHandle,
      },
    });

    return profile;
  });

/**
 * Récupère le profil éducateur de l'utilisateur actuellement connecté.
 */
export const getMyEducatorProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;
    const userId = (context as any).userId || (context as any).claims?.sub || (context as any).user?.id;

    const { data: profile } = await db
      .from("educator_profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    return profile;
  });

export interface EstablishmentColleague {
  id: string;
  fullName: string;
  handle: string | null;
  classCode: string | null;
  professionalRole: "teacher" | "counselor" | "psychologist" | "other";
  isVerified: boolean;
  whatsappPhone: string | null;
  createdAt: string;
}

export interface EstablishmentOverview {
  hasEstablishment: boolean;
  organizationName: string | null;
  schoolId?: string | null;
  schoolCode?: string | null;
  schoolStatus?: string | null;
  schoolCity?: string | null;
  pricingTier?: string | null;
  licensedQuota?: number;
  isLeader?: boolean;
  totalColleagues: number;
  totalClasses: number;
  colleagues: EstablishmentColleague[];
}

/**
 * Vue Établissement / Équipe pédagogique :
 * Permet à un enseignant ou conseiller de voir l'ensemble de ses collègues enregistrés
 * au sein du même établissement scolaire ou centre d'orientation.
 */
export const getMyEstablishmentOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<EstablishmentOverview> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;
    const userId = (context as any).userId || (context as any).claims?.sub || (context as any).user?.id;

    const { data: myProfile } = await db
      .from("educator_profiles")
      .select("school_id, organization_name")
      .eq("user_id", userId)
      .maybeSingle();

    if (!myProfile || (!myProfile.school_id && !myProfile.organization_name)) {
      return {
        hasEstablishment: false,
        organizationName: null,
        totalColleagues: 0,
        totalClasses: 0,
        colleagues: [],
      };
    }

    let school: any = null;
    if (myProfile.school_id) {
      const { data: s } = await db
        .from("schools")
        .select("*")
        .eq("id", myProfile.school_id)
        .maybeSingle();
      school = s;
    } else if (myProfile.organization_name) {
      const { data: s } = await db
        .from("schools")
        .select("*")
        .ilike("name", myProfile.organization_name.trim())
        .maybeSingle();
      school = s;
    }

    const orgName = school?.name || myProfile.organization_name?.trim();

    let queryBuilder = db
      .from("educator_profiles")
      .select("id, full_name, handle, class_code, professional_role, is_verified, whatsapp_phone, created_at, school_id, organization_name");

    if (school?.id) {
      queryBuilder = queryBuilder.or(`school_id.eq.${school.id},organization_name.ilike.${orgName}`);
    } else {
      queryBuilder = queryBuilder.ilike("organization_name", orgName);
    }

    const { data: rows, error } = await queryBuilder.order("created_at", { ascending: true });

    if (error || !rows) {
      console.error("Erreur getMyEstablishmentOverview:", error);
      return {
        hasEstablishment: true,
        organizationName: orgName,
        schoolId: school?.id || null,
        schoolCode: school?.code || null,
        schoolStatus: school?.status || null,
        schoolCity: school?.city || null,
        pricingTier: school?.pricing_tier || null,
        licensedQuota: school?.licensed_students_quota ?? 0,
        isLeader: school?.leader_user_id === userId,
        totalColleagues: 0,
        totalClasses: 0,
        colleagues: [],
      };
    }

    const uniqueClasses = new Set<string>();
    const colleagues: EstablishmentColleague[] = rows.map((r: any) => {
      if (r.class_code) uniqueClasses.add(r.class_code.toUpperCase());
      return {
        id: r.id,
        fullName: r.full_name,
        handle: r.handle ? (r.handle.startsWith("@") ? r.handle : `@${r.handle}`) : null,
        classCode: r.class_code ? (r.class_code.startsWith("#") ? r.class_code : `#${r.class_code}`) : null,
        professionalRole: r.professional_role,
        isVerified: Boolean(r.is_verified),
        whatsappPhone: r.whatsapp_phone || null,
        createdAt: r.created_at,
      };
    });

    return {
      hasEstablishment: true,
      organizationName: orgName,
      schoolId: school?.id || null,
      schoolCode: school?.code ? (school.code.startsWith("#") ? school.code : `#${school.code}`) : null,
      schoolStatus: school?.status || null,
      schoolCity: school?.city || null,
      pricingTier: school?.pricing_tier || null,
      licensedQuota: school?.licensed_students_quota ?? 0,
      isLeader: school?.leader_user_id === userId,
      totalColleagues: colleagues.length,
      totalClasses: uniqueClasses.size,
      colleagues,
    };
  });
