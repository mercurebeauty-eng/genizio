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
}

const LookupQuerySchema = z.string().min(2).max(100);

/**
 * Résout un professionnel de l'éducation par son @handle, son #CodeClasse ou son email.
 * Protège la vie privée : ne renvoie que l'identité professionnelle de validation.
 */
export const lookupEducator = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((query: string) => LookupQuerySchema.parse(query))
  .handler(async ({ data: rawQuery }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const query = rawQuery.trim();

    // Normalisation : enlever le préfixe @ ou #
    const cleanQuery = query.startsWith("@") || query.startsWith("#") ? query.slice(1) : query;
    const lowerQuery = cleanQuery.toLowerCase();
    const upperQuery = cleanQuery.toUpperCase();

    // 1. Recherche dans educator_profiles
    const { data: profile } = await supabaseAdmin
      .from("educator_profiles")
      .select("*")
      .or(`handle.ilike.${lowerQuery},class_code.ilike.${upperQuery}`)
      .limit(1)
      .maybeSingle();

    if (profile) {
      // Récupérer l'email de liaison si disponible
      let educatorEmail: string | undefined = undefined;
      if (profile.user_id) {
        const { data: u } = await supabaseAdmin.auth.admin.getUserById(profile.user_id);
        educatorEmail = u.user?.email;
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
      } as EducatorLookupResult;
    }

    // 2. Si c'est un format email, recherche dans auth.users
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
        } as EducatorLookupResult;
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
  classCode: z
    .string()
    .max(20)
    .regex(/^[a-zA-Z0-9_-]*$/, "Caractères autorisés pour le code classe : lettres, chiffres, tirets")
    .optional(),
  whatsappPhone: z.string().optional(),
});

/**
 * Permet à un éducateur de configurer son profil, son @handle et son #CodeClasse.
 */
export const saveMyEducatorProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => SaveEducatorProfileSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const user = context.user;

    const normalizedHandle = data.handle?.toLowerCase().trim() || null;
    const normalizedClassCode = data.classCode?.toUpperCase().trim() || null;

    // Vérification d'unicité du handle si fourni
    if (normalizedHandle) {
      const { data: existing } = await supabaseAdmin
        .from("educator_profiles")
        .select("id, user_id")
        .eq("handle", normalizedHandle)
        .maybeSingle();

      if (existing && existing.user_id !== user.id) {
        throw new Error(`L'identifiant @${normalizedHandle} est déjà utilisé par un autre professionnel.`);
      }
    }

    const { data: profile, error } = await supabaseAdmin
      .from("educator_profiles")
      .upsert(
        {
          user_id: user.id,
          handle: normalizedHandle,
          full_name: data.fullName.trim(),
          professional_role: data.professionalRole,
          organization_name: data.organizationName?.trim() || null,
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

    // Mettre à jour les métadonnées de l'utilisateur pour indiquer qu'il possède une casquette éducateur
    await supabaseAdmin.auth.admin.updateUserById(user.id, {
      user_metadata: {
        ...user.user_metadata,
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
    const user = context.user;

    const { data: profile } = await supabaseAdmin
      .from("educator_profiles")
      .select("*")
      .eq("user_id", user.id)
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
    const user = context.user;

    const { data: myProfile } = await supabaseAdmin
      .from("educator_profiles")
      .select("organization_name")
      .eq("user_id", user.id)
      .maybeSingle();

    const rawOrg = myProfile?.organization_name?.trim();
    if (!rawOrg) {
      return {
        hasEstablishment: false,
        organizationName: null,
        totalColleagues: 0,
        totalClasses: 0,
        colleagues: [],
      };
    }

    const { data: rows, error } = await supabaseAdmin
      .from("educator_profiles")
      .select("id, full_name, handle, class_code, professional_role, is_verified, whatsapp_phone, created_at")
      .ilike("organization_name", rawOrg)
      .order("created_at", { ascending: true });

    if (error || !rows) {
      console.error("Erreur getMyEstablishmentOverview:", error);
      return {
        hasEstablishment: true,
        organizationName: rawOrg,
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
      organizationName: rawOrg,
      totalColleagues: colleagues.length,
      totalClasses: uniqueClasses.size,
      colleagues,
    };
  });

