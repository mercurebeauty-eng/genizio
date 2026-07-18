// WhatsAppFAB — Bouton d'aide contextuel flottant (Floating Action Button)
// Génère automatiquement un message WhatsApp pré-rempli avec le contexte
// de l'enfant sélectionné si disponible.
//
// Monté une fois globalement dans __root.tsx (pas de prop passée à l'usage) :
// il détecte lui-même l'enfant courant via le paramètre de route `profileId`
// quand il est présent (routes /profiles/$profileId/*), et va chercher son
// nom/âge/guilde/nb de défis complétés pour contextualiser le message.

import { useEffect, useState } from "react";
import { useParams } from "@tanstack/react-router";
import { MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-session";
import { getChildGuild } from "@/lib/guilds";

type ChildContext = {
  name: string;
  age: number;
  guild: string;
  completedCount: number;
};

type WhatsAppFABProps = {
  /** Numéro WhatsApp sans le + (ex: "33606433148") */
  phoneNumber?: string;
};

const DEFAULT_PHONE = import.meta.env.VITE_WHATSAPP_NUMBER?.replace(/\D/g, "") ?? "33606433148";

function buildWhatsAppUrl(phone: string, context: ChildContext | null): string {
  const text = context
    ? `Bonjour, je suis le parent de ${context.name} (${context.age} ans, Guilde : ${context.guild}). Il/Elle a réalisé ${context.completedCount} défi(s). J'aimerais discuter de son parcours sur Génizio.`
    : "Bonjour, j'ai besoin d'aide concernant l'application Génizio.";

  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
}

export function WhatsAppFAB({ phoneNumber }: WhatsAppFABProps) {
  const phone = phoneNumber ?? DEFAULT_PHONE;
  const { session } = useSession();
  const { profileId } = useParams({ strict: false }) as { profileId?: string };
  const [context, setContext] = useState<ChildContext | null>(null);
  const [visible, setVisible] = useState(true);

  // The FAB is fixed on screen, so on long pages it can end up sitting on top
  // of whatever full-width button happens to scroll under it (e.g. a
  // challenge card's "Afficher les détails" toggle), silently stealing the
  // tap. Fading it out while the user is actively scrolling — and bringing
  // it back once they settle — keeps it out of the way without removing it.
  useEffect(() => {
    let hideTimeout: ReturnType<typeof setTimeout>;
    const handleScroll = () => {
      setVisible(false);
      clearTimeout(hideTimeout);
      hideTimeout = setTimeout(() => setVisible(true), 400);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      clearTimeout(hideTimeout);
    };
  }, []);

  useEffect(() => {
    if (!session || !profileId) {
      setContext(null);
      return;
    }
    let cancelled = false;
    Promise.all([
      supabase
        .from("child_profiles")
        .select("name, age, talents")
        .eq("id", profileId)
        .eq("user_id", session.user.id)
        .maybeSingle(),
      supabase
        .from("challenges")
        .select("id", { count: "exact", head: true })
        .eq("child_id", profileId)
        .eq("status", "completed"),
    ]).then(([childRes, countRes]) => {
      if (cancelled) return;
      if (!childRes.data) {
        setContext(null);
        return;
      }
      setContext({
        name: childRes.data.name,
        age: childRes.data.age,
        guild: getChildGuild(childRes.data.talents as Record<string, number>).name,
        completedCount: countRes.count ?? 0,
      });
    });
    return () => {
      cancelled = true;
    };
  }, [session, profileId]);

  const url = buildWhatsAppUrl(phone, context);

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Besoin d'aide ? Discuter sur WhatsApp"
      className={`fixed bottom-24 right-5 z-50 flex items-center gap-2 rounded-full border-[3px] border-ink bg-[#0B7A5A] px-4 py-3 text-sm font-bold text-white shadow-brutal transition-all hover:-translate-y-1 hover:shadow-brutal-lg active:translate-y-0 md:bottom-8 ${
        visible ? "opacity-100 scale-100" : "opacity-0 scale-90 pointer-events-none"
      }`}
    >
      <MessageCircle className="size-5 fill-white stroke-none" />
      <span className="hidden sm:inline">Aide</span>
    </a>
  );
}
