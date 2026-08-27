import { createFileRoute, redirect } from "@tanstack/react-router";

// Alias permanent de la page /remboursements : « remboursement » au singulier est l'orthographe
// que beaucoup de visiteurs tapent d'instinct. Sans cet alias, l'URL tombait sur la page
// « non trouvée » (404) — mauvaise expérience et signal négatif si le lien est partagé.
// La redirection se fait côté serveur (SSR) et renvoie un HTTP 301 (Permanent), transmettant
// l'autorité SEO et le PageRank à l'URL canonique /remboursements.
export const Route = createFileRoute("/remboursement")({
  beforeLoad: () => {
    throw redirect({ to: "/remboursements", statusCode: 301 });
  },
  component: () => null,
});
