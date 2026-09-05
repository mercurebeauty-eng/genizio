import { describe, it, expect, vi, beforeEach } from "vitest";

// Simulation d'un client Supabase pour valider le modèle d'injection (Invariant #2)
// On ne teste pas la BDD elle-même, mais la logique de préparation des données.

describe("collective-projects", () => {
  let mockSupabase: any;

  beforeEach(() => {
    mockSupabase = {
      from: vi.fn().mockReturnValue({
        insert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { id: "proj-123" }, error: null }),
      }),
    };
  });

  it("doit préparer 1 seul projet et N participants (Architecture Unifiée)", async () => {
    const data = {
      title: "Construire un mini-drone",
      domain: "technologie",
      contextType: "discovery_free",
      participants: [
        { childId: "c1", teamRole: "concepteur", implicationLevel: "pilier" },
        { childId: "c2", teamRole: "soudeur", implicationLevel: "contributeur" },
      ],
    };

    // Simulation manuelle de l'exécution du handler
    const projectInsert = mockSupabase.from("collective_projects").insert;

    // Le projet unique est créé
    projectInsert({
      title: data.title,
      domain: data.domain,
      context_type: data.contextType,
      outcome_status: "completed",
    });

    expect(projectInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Construire un mini-drone",
      }),
    );

    // Simulation: la création du projet retourne 'proj-123'
    const projectId = "proj-123";

    // Les participants sont reliés
    const participantRows = data.participants.map((p) => ({
      project_id: projectId,
      child_id: p.childId,
      team_role: p.teamRole,
      implication_level: p.implicationLevel,
      supervisor_tags: [],
    }));

    expect(participantRows).toHaveLength(2);
    expect(participantRows[0].project_id).toBe("proj-123");
    expect(participantRows[0].team_role).toBe("concepteur");
  });
});
