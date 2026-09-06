// Erreurs serveur standardisées (audit backend, vague D).
//
// Convention : un échec de base/API ne remonte JAMAIS son message brut au
// client (PostgREST y expose tables, colonnes, contraintes — fuite de schéma
// et aide à l'attaquant). Le détail complet est journalisé côté serveur ;
// l'utilisateur ne voit qu'un message français générique et actionnable.

export function serverError(action: string, err: unknown, userMessage?: string): Error {
  console.error(`[${action}]`, err);
  return new Error(userMessage ?? `${action} : une erreur est survenue. Réessayez.`);
}
