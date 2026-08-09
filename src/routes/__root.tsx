import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import {
  SITE_NAME_LONG,
  SITE_DESCRIPTION,
  SITE_URL,
  OG_IMAGE_PATH,
  ORGANIZATION_JSONLD,
  WEBSITE_JSONLD,
} from "../lib/seo";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { Toaster } from "../components/ui/sonner";
import { WhatsAppFAB } from "../components/WhatsAppFAB";
import { ConfirmDialogHost } from "../components/ui/confirm-dialog";
import { PwaInstallPrompt } from "../components/PwaInstallPrompt";
import { PwaUpdateBanner } from "../components/PwaUpdateBanner";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";


function NotFoundComponent() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: SITE_NAME_LONG },
      { name: "description", content: SITE_DESCRIPTION },
      { name: "author", content: "Génizio" },
      { name: "apple-mobile-web-app-title", content: "Génizio" },
      // Le site est intégralement en français : sans ces signaux (+ <html lang="fr">, corrigé
      // dans RootShell), Google le classait comme anglophone et le desservait sur les requêtes
      // francophones — la totalité de l'audience visée.
      { httpEquiv: "content-language", content: "fr-FR" },
      { property: "og:locale", content: "fr_FR" },
      { property: "og:site_name", content: "Génizio" },
      { property: "og:title", content: SITE_NAME_LONG },
      { property: "og:description", content: SITE_DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: SITE_URL },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: SITE_NAME_LONG },
      { name: "twitter:description", content: SITE_DESCRIPTION },
      // Image auto-hébergée : l'ancienne pointait vers storage.googleapis.com/gpt-engineer-file-uploads
      // (résidu d'échafaudage), hors de notre contrôle et susceptible de disparaître.
      { property: "og:image", content: `${SITE_URL}${OG_IMAGE_PATH}` },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { property: "og:image:alt", content: "Génizio — révéler les talents naturels des enfants" },
      { name: "twitter:image", content: `${SITE_URL}${OG_IMAGE_PATH}` },
      { name: "theme-color", content: "#ffffff" },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify(ORGANIZATION_JSONLD),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify(WEBSITE_JSONLD),
      },
    ],
    links: [
      { rel: "icon", type: "image/png", href: "/favicon-96x96.png", sizes: "96x96" },
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "shortcut icon", href: "/favicon.ico" },
      { rel: "apple-touch-icon", sizes: "180x180", href: "/apple-touch-icon.png" },
      { rel: "manifest", href: "/site.webmanifest" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Fredoka:wght@400;500;600;700&family=Inter:wght@400;500;600&display=swap",
      },
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Analytics />
        <SpeedInsights />
        <Scripts />
      </body>
    </html>
  );
}

// Routes rendues pleine largeur, hors du cadre-téléphone de 414px.
//
// Deux familles distinctes, même besoin :
//  1. Outils internes (Admin OS, superviseur, espace organisation) — mises en
//     page multi-colonnes conçues pour un écran d'ordinateur.
//  2. Pages publiques (accueil, mentions légales, parrainage, contenus, page
//     d'inscription à une campagne) — ce sont des pages vitrine. Les afficher
//     dans une maquette de téléphone sur un écran d'ordinateur donnait
//     l'impression d'une démo/prototype plutôt que d'un produit réel, et
//     écrasait des mises en page pourtant écrites pour du plein écran
//     (conteneurs max-w-6xl inutilisables dans une colonne de 414px).
//
// Le cadre-téléphone reste pour l'application parent elle-même, où il sert
// vraiment : /profiles, /profile, /boutique, /laboratory, /auth.
const FULL_BLEED_PREFIXES = [
  "/admin",
  "/supervisor",
  "/organisation",
  "/rejoindre",
  "/guides",
];

const FULL_BLEED_EXACT = new Set([
  "/",
  "/parrainage",
  "/terms",
  "/privacy",
  "/mentions-legales",
  "/a-propos",
]);

function isFullBleedRoute(pathname: string): boolean {
  if (FULL_BLEED_EXACT.has(pathname)) return true;
  return FULL_BLEED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

// Outils internes : pas de bouton WhatsApp flottant (le support public n'a rien
// à faire sur un tableau de bord admin), contrairement aux pages vitrine où il
// reste le canal de contact principal.
const INTERNAL_TOOL_PREFIXES = ["/admin", "/supervisor", "/organisation"];

function isInternalTool(pathname: string): boolean {
  return INTERNAL_TOOL_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const fullBleed = isFullBleedRoute(pathname);

  if (fullBleed) {
    const internal = isInternalTool(pathname);
    return (
      <QueryClientProvider client={queryClient}>
        <div className="min-h-dvh bg-[radial-gradient(120%_90%_at_15%_0%,#f4eee1,#e7ddca)] font-body">
          <Outlet />
        </div>
        <Toaster />
        {!internal && <WhatsAppFAB />}
        <ConfirmDialogHost />
        <Analytics />
        <SpeedInsights />
      </QueryClientProvider>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-dvh bg-[radial-gradient(120%_90%_at_15%_0%,#f4eee1,#e7ddca)] flex justify-center items-center py-0 md:py-8 px-0 md:px-4 relative overflow-x-hidden font-body">
        {/* Ambient background glowing blur circles */}
        <div className="hidden md:block absolute -top-24 -left-20 size-[520px] bg-brand-glow/20 blur-3xl pointer-events-none rounded-full" />
        <div className="hidden md:block absolute -bottom-32 -right-24 size-[560px] bg-sky/20 blur-3xl pointer-events-none rounded-full" />
        <div className="hidden md:block absolute bottom-10 -left-20 size-[360px] bg-leaf/20 blur-3xl pointer-events-none rounded-full" />

        {/* Device Shell Frame */}
        <div className="w-full max-w-[414px] min-h-dvh md:min-h-[868px] md:h-[868px] bg-surface md:bg-[#15130f] md:rounded-[56px] md:p-2.5 md:shadow-2xl md:ring-1 md:ring-black/20 relative flex flex-col overflow-hidden">
          {/* Inner Mobile Screen Content */}
          <div className="w-full h-full bg-surface md:rounded-[44px] overflow-y-auto flex flex-col relative scrollbar-none">
            <Outlet />
          </div>
        </div>
      </div>
      <Toaster />
      <WhatsAppFAB />
      <ConfirmDialogHost />
      <PwaInstallPrompt />
      <PwaUpdateBanner />
      <Analytics />
      <SpeedInsights />
    </QueryClientProvider>
  );
}
