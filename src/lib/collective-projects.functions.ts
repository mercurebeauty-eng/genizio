import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

/**
 * Ce fichier implémente l'Invariant d'Architecture #2 de Génizio :
 * "1 projet collectif = 1 entité physique unique reliée à N participants".
 * Aucune duplication de données n'est permise.
 */

const ParticipantSchema = z.object({
  childId: z.string().uuid(),
  teamRole: z.string(), // ex: 'coordinateur', 'programmeur'
  implicationLevel: z.string() // ex: 'pilier', 'apprenti'
});

const CreateCollectiveProjectInput = z.object({
  title: z.string().min(3),
  domain: z.string(),
  contextType: z.enum(["guild_challenge", "discovery_free", "fablab_marathon"]),
  guildId: z.string().optional(),
  participants: z.array(ParticipantSchema).min(1),
  sharedProofUrl: z.string().optional(),
});

export const createCollectiveProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => CreateCollectiveProjectInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // 1. Création de l'entité unique de projet (pas de duplication)
    const { data: project, error: projectErr } = await supabase
      .from("collective_projects" as any)
      .insert({
        title: data.title,
        domain: data.domain,
        context_type: data.contextType,
        guild_id: data.guildId,
        shared_proof_url: data.sharedProofUrl,
        outcome_status: "completed"
      })
      .select()
      .single();

    if (projectErr || !project) {
      throw new Error("Impossible de créer le projet collectif.");
    }

    // 2. Création des relations (rôles individuels rattachés au projet unique)
    const participantRows = data.participants.map(p => ({
      project_id: project.id,
      child_id: p.childId,
      team_role: p.teamRole,
      implication_level: p.implicationLevel,
      supervisor_tags: [] // par défaut vide, rempli par le superviseur
    }));

    const { error: partErr } = await supabase
      .from("collective_project_participants" as any)
      .insert(participantRows);

    if (partErr) {
      // Rollback (idéalement fait via RPC ou transaction Supabase, 
      // ici on simplifie en laissant le projet orphelin si erreur)
      throw new Error("Erreur lors de l'enregistrement des participants.");
    }

    return { success: true, projectId: project.id };
  });

const AddObservationInput = z.object({
  projectId: z.string().uuid(),
  childId: z.string().uuid(),
  supervisorTags: z.array(z.string()),
  individualNotes: z.string()
});

export const attachCollectiveObservation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => AddObservationInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    
    const { error } = await supabase
      .from("collective_project_participants" as any)
      .update({
        supervisor_tags: data.supervisorTags,
        individual_notes: data.individualNotes
      })
      .eq("project_id", data.projectId)
      .eq("child_id", data.childId);

    if (error) {
      throw new Error("Erreur lors de l'ajout de l'observation.");
    }

    return { success: true };
  });
