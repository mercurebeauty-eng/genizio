// Superviseur Copilote (décision #74, 2026-08-15) — machine à états du bilan de fin.
//
// Le « bilan inclus » du pack est la SEULE pièce à validation explicite du parent :
//   draft → submitted → validated | rejected → (retour éditable →) submitted
//
//   • draft     : le superviseur rédige (brouillon, modifiable) ;
//   • submitted : envoyé au parent, EN ATTENTE de validation — plus modifiable ;
//   • validated : le parent a validé — c'est le livrable officiel de la période
//     (exportable) et la condition de paiement de la dernière séance (Phase 6) ;
//   • rejected  : le parent demande des modifications (feedback enregistré) — le
//     superviseur repasse en draft, édite et re-soumet.
//
// Fonction PURE (testable) — les server functions font les lectures puis appliquent
// la transition.

export type SupervisorReportStatus = "draft" | "submitted" | "validated" | "rejected";

export type ReportAction = "submit" | "validate" | "reject";

export function nextReportStatus(
  current: SupervisorReportStatus,
  action: ReportAction,
): SupervisorReportStatus {
  switch (action) {
    case "submit":
      if (current === "draft" || current === "rejected") return "submitted";
      throw new Error("Seul un brouillon (ou un bilan rejeté) peut être soumis pour validation.");
    case "validate":
      if (current === "submitted") return "validated";
      throw new Error("Seul un bilan soumis peut être validé par le parent.");
    case "reject":
      if (current === "submitted") return "rejected";
      throw new Error("Seul un bilan soumis peut être rejeté (demande de modifications).");
  }
}

// Un bilan est-il « ouvert » (le superviseur travaille dessus, une seule ligne par enfant
// garantie par l'index partiel de la migration) ?
export function isOpenReport(status: SupervisorReportStatus): boolean {
  return status === "draft" || status === "submitted";
}
