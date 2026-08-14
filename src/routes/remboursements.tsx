import { createFileRoute, Link } from "@tanstack/react-router";
import { pageMeta, jsonLdScript, breadcrumbJsonLd } from "@/lib/seo";
import { Mail, MessageCircle } from "lucide-react";

export const Route = createFileRoute("/remboursements")({
  head: () => {
    const meta = pageMeta({
      title: "Remboursements et annulations — Génizio",
      description:
        "Politique de remboursement et d'annulation de Génizio : rétractation 14 jours, kits physiques, abonnement famille annulable à tout moment, délais de remboursement.",
      path: "/remboursements",
    });
    return {
      ...meta,
      scripts: [
        jsonLdScript(
          breadcrumbJsonLd([
            { name: "Accueil", path: "/" },
            { name: "Remboursements et annulations", path: "/remboursements" },
          ]),
        ),
      ],
    };
  },
  component: RemboursementsPage,
});

function RemboursementsPage() {
  return (
    <div className="min-h-dvh bg-surface text-ink antialiased">
      <header className="border-b border-ink/10 bg-surface/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link
            to="/"
            className="flex items-center gap-2 font-display text-xl font-extrabold tracking-tight text-brand"
          >
            <img src="/favicon-96x96.png" alt="Logo Génizio" className="h-7 w-7" />
            GÉNIZIO
          </Link>
          <Link
            to="/auth"
            className="press-brand rounded-full bg-brand px-5 py-2.5 text-xs font-bold text-white"
          >
            Créer un compte
          </Link>
        </div>
      </header>

      <article className="mx-auto max-w-3xl px-6 py-12 md:py-20">
        <nav
          aria-label="Fil d'Ariane"
          className="mb-8 flex items-center gap-1.5 text-xs font-bold text-ink/50"
        >
          <Link to="/" className="hover:text-brand">
            Accueil
          </Link>
          <span aria-hidden>/</span>
          <span className="text-ink/70">Remboursements et annulations</span>
        </nav>

        <p className="mb-3 text-xs font-black uppercase tracking-widest text-brand">
          Remboursements & annulations
        </p>
        <h1 className="font-display text-balance text-3xl font-extrabold leading-[1.1] md:text-5xl">
          Remboursements et annulations
        </h1>
        <p className="mt-4 text-sm font-semibold text-ink/60">
          Dernière mise à jour : 14 août 2026
        </p>

        <div className="not-prose my-8 rounded-2xl border-l-4 border-amber-500 bg-amber-50 p-5">
          <p className="text-sm font-semibold leading-relaxed text-amber-900">
            <strong>Note :</strong> cette politique a été rédigée avec l'assistance d'une IA à
            partir du fonctionnement réel de l'application. Elle constitue une base de bonne foi
            mais n'a pas été relue par un professionnel du droit. Elle ne prive jamais un
            utilisateur des protections impératives du droit de la consommation applicable dans son
            pays de résidence.
          </p>
        </div>

        <div className="prose-genizio">
          <h2>1. Produits et services concernés</h2>
          <p>
            Cette politique couvre tous les achats réalisés sur Génizio via Paystack : abonnement
            famille (« Génizio Bienvenue » puis « Génizio Standard »), accès enfant supplémentaire,
            Passeport d'Excellence, Pack Accompagnement, parrainage, et kits pédagogiques de la
            boutique.
          </p>

          <h2>2. Services numériques : rétractation de 14 jours</h2>
          <p>
            Vous disposez d'un délai de <strong>14 jours</strong> à compter du paiement pour vous
            rétracter et obtenir le remboursement d'un service numérique{" "}
            <strong>tant qu'il n'a pas été utilisé ni activé</strong> (par exemple : abonnement sans
            profil actif, Passeport non débloqué, code de parrainage non remis). Passé ce délai, ou
            dès lors que le service a été utilisé ou activé, le montant est définitivement acquis —
            sauf erreur technique ou fraude constatée de notre côté, qui entraîne un remboursement
            intégral.
          </p>

          <h2>3. Kits pédagogiques (produits physiques)</h2>
          <p>
            Les kits commandés dans la boutique peuvent être retournés sous{" "}
            <strong>14 jours</strong> à compter de leur réception, dans leur emballage d'origine et
            en état neuf. Les frais de retour sont à la charge de l'acheteur. Le remboursement est
            effectué dès réception et contrôle du colis retourné. Les kits ne peuvent pas être
            retournés s'ils ont été ouverts et utilisés, sauf défaut de conformité.
          </p>

          <h2>4. Annulation de l'abonnement famille</h2>
          <p>
            L'abonnement famille peut être <strong>annulé à tout moment</strong> depuis le compte
            parent (Réglages → Abonnement famille). L'annulation prend effet à la fin de la période
            déjà payée : vous conservez l'accès jusqu'à cette date, puis aucun prélèvement
            supplémentaire n'est effectué. Il n'y a pas de frais d'annulation.
          </p>

          <h2>5. Parrainage</h2>
          <p>
            Un parrainage est remboursé si le code généré n'a pas encore été transmis ni activé par
            la famille bénéficiaire. Dès que le code est activé dans l'application, le montant est
            définitivement acquis (le service a commencé à être rendu).
          </p>

          <h2>6. Délai et modalités de remboursement</h2>
          <p>
            Les remboursements acceptés sont effectués <strong>sous 10 jours ouvrés</strong> après
            validation de la demande, vers le moyen de paiement d'origine via Paystack (carte
            bancaire ou Mobile Money). Vous recevez une confirmation par email, avec la référence de
            la transaction remboursée.
          </p>

          <h2>7. Comment demander un remboursement</h2>
          <p>
            Écrivez au service client à{" "}
            <a href="mailto:serviceclient@genizio.com" className="text-brand underline">
              serviceclient@genizio.com
            </a>{" "}
            ou via WhatsApp, en précisant : le produit concerné, la référence de paiement (affichée
            sur le reçu Paystack) et la date de la transaction. Nous accusons réception de chaque
            demande sous 48 h ouvrées.
          </p>

          <div className="not-prose flex flex-col gap-3 sm:flex-row">
            <a
              href="mailto:serviceclient@genizio.com"
              className="press-brand inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-5 py-3 text-xs font-bold text-white"
            >
              <Mail className="size-4" aria-hidden />
              Contacter par email
            </a>
            <a
              href="https://wa.me/33606433148?text=Bonjour%2C%20j%27ai%20une%20question%20sur%20un%20remboursement%20G%C3%A9nizio."
              target="_blank"
              rel="noopener noreferrer"
              className="press-ink inline-flex items-center justify-center gap-2 rounded-xl bg-ink px-5 py-3 text-xs font-bold text-white"
            >
              <MessageCircle className="size-4" aria-hidden />
              Contacter sur WhatsApp
            </a>
          </div>

          <div className="not-prose border-t-2 border-ink/10 pt-4">
            <p className="text-xs font-semibold text-ink/60">
              Voir aussi :{" "}
              <Link to="/tarifs" className="text-brand underline">
                Tarifs
              </Link>{" "}
              ·{" "}
              <Link to="/terms" className="text-brand underline">
                Conditions d'utilisation
              </Link>{" "}
              ·{" "}
              <Link to="/mentions-legales" className="text-brand underline">
                Mentions légales
              </Link>
            </p>
          </div>
        </div>
      </article>

      <footer className="border-t border-ink/10 bg-white/30 px-6 py-10">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 text-xs font-bold text-ink/50 md:flex-row">
          <span>© {new Date().getFullYear()} Génizio — Abidjan, Côte d'Ivoire</span>
          <div className="flex flex-wrap justify-center gap-5 uppercase tracking-wider">
            <Link to="/tarifs" className="hover:text-brand">
              Tarifs
            </Link>
            <Link to="/remboursements" className="hover:text-brand">
              Remboursements
            </Link>
            <Link to="/guides" className="hover:text-brand">
              Guides
            </Link>
            <Link to="/a-propos" className="hover:text-brand">
              À propos
            </Link>
            <Link to="/privacy" className="hover:text-brand">
              Confidentialité
            </Link>
            <Link to="/terms" className="hover:text-brand">
              CGU
            </Link>
            <Link to="/mentions-legales" className="hover:text-brand">
              Mentions légales
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
