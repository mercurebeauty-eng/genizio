import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

// D-04 (audit fonctionnel transversal, 2026-07-26) : admin-route.test.ts ne vérifiait que des
// libellés et la présence de routes dans routeTree.gen.ts — jamais le vrai comportement
// d'authentification. Résultat : 4 écrans admin (AdminSeasonsTab, AdminSupervisorsTab,
// AdminProductsTab, CreateSeasonModal) ont perdu leur en-tête Authorization sans qu'aucun test
// ne s'en aperçoive, malgré "227/227 tests verts" — requireAdmin retombait alors sur le seul
// repli cookie, qui échoue silencieusement dans certains contextes (ex: "Historique des
// Parrainages" figé sur "Aucun parrainage" malgré 101 lignes réelles en base).
//
// Ce test verrouille structurellement la règle : tout composant admin qui lit une session
// (useSession) ET appelle des fonctions serveur (useServerFn) doit explicitement construire et
// transmettre un en-tête Authorization Bearer. Il aurait échoué sur les 4 fichiers ci-dessus
// avant leur correction — c'est un test de régression réel, pas un test qui se contente de
// documenter l'état actuel.
describe("Composants admin : en-tête Authorization explicite obligatoire", () => {
  const adminDir = path.resolve(__dirname, "../components/admin");
  const files = fs.readdirSync(adminDir).filter((f) => f.endsWith(".tsx"));

  for (const file of files) {
    const content = fs.readFileSync(path.join(adminDir, file), "utf-8");
    const usesSession = content.includes("useSession(");
    const usesServerFn = content.includes("useServerFn(");

    // Seuls les composants qui lisent la session ET appellent des fonctions serveur sont
    // concernés — les onglets à fetch centralisé (Executive/Talents/Naya/Commerce) reçoivent
    // leurs données en props depuis admin.index.tsx et n'ont ni l'un ni l'autre.
    if (!usesSession || !usesServerFn) continue;

    it(`${file} construit et transmet un en-tête Authorization Bearer`, () => {
      expect(content).toContain("access_token");
      expect(content).toMatch(/Authorization:\s*`Bearer \$\{session/);
    });
  }

  it("a bien trouvé au moins les composants admin connus pour dépendre de la session", () => {
    // Garde-fou : si le dossier admin/ était vide ou mal résolu, la boucle ci-dessus ne
    // produirait silencieusement aucun test — ce test échoue explicitement dans ce cas.
    const knownDependents = [
      "AdminSeasonsTab.tsx",
      "AdminSupervisorsTab.tsx",
      "AdminProductsTab.tsx",
      "AdminCampaignsTab.tsx",
      "CreateSeasonModal.tsx",
      "AdminSeasonEnrollmentModal.tsx",
    ];
    for (const name of knownDependents) {
      expect(files).toContain(name);
    }
  });
});
