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
import { useSession } from "../hooks/use-session";
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
import { PushNotificationsSetup } from "../hooks/use-push-notifications";
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
      // viewport-fit=cover est requis pour que env(safe-area-inset-*) soit non nul
      // sur iOS (Safari et PWA standalone) : sans lui, la tab bar et les bannières
      // fixes passent sous l'encoche / le home indicator.
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
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
      {
        property: "og:image:alt",
        content: "Génizio — Découvrez qui est votre enfant, développez ce qu'il peut devenir",
      },
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
        <noscript>
          <link
            rel="stylesheet"
            href="https://fonts.googleapis.com/css2?family=Fredoka:wght@400;500;600;700&family=Inter:wght@400;500;600&display=swap"
          />
        </noscript>
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

// Toutes les routes sont rendues pleine largeur. Le « cadre-téléphone » de 414px
// qui enveloppait l'app parent a été supprimé (2026-08-16) : il n'apportait rien
// sur mobile (le cadre était déjà pleine largeur) et, sur desktop, il réduisait
// l'app à une maquette de téléphone — le même constat qui avait déjà conduit à
// sortir les pages vitrine du cadre. Les pages parent sont désormais pleine
// largeur et se placent elles-mêmes (conteneurs max-w-*, grilles md/lg).
//
// Outils internes : pas de bouton WhatsApp flottant (le support public n'a rien
// à faire sur un tableau de bord admin), contrairement aux pages vitrine où il
// reste le canal de contact principal.
const INTERNAL_TOOL_PREFIXES = ["/admin", "/mentor", "/organisation"];

function isInternalTool(pathname: string): boolean {
  return INTERNAL_TOOL_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const internal = isInternalTool(pathname);

  // Univers Mentor (décision #81) : data-mode sur <html> → le bloc
  // :root[data-mode="mentor"] de styles.css rethème l'app (palette indigo/violet +
  // fond de page). Client-only : le mode vit dans la session.
  // Scoppé à la ROUTE (deux-modèles, 2026-09-06) : le violet n'habille que le
  // portail /mentor — l'admin et le reste de l'app gardent la palette parent
  // même quand le compte est en mode mentor (le mode session reste le pilote
  // fonctionnel : onglets, accès, bascules).
  const { session } = useSession();
  const mentorMode = session?.user.user_metadata?.mode === "mentor";
  const mentorTheme = mentorMode && pathname === "/mentor";
  useEffect(() => {
    document.documentElement.dataset.mode = mentorTheme ? "mentor" : "parent";
  }, [mentorTheme]);

  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-dvh bg-[var(--page-bg)] font-body">
        <Outlet />
      </div>
      <Toaster />
      {!internal && <WhatsAppFAB />}
      <ConfirmDialogHost />
      <PwaInstallPrompt />
      <PwaUpdateBanner />
      <PushNotificationsSetup />
    </QueryClientProvider>
  );
}
