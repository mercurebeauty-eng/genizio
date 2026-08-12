import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { recordChallengeTimeOver } from "@/lib/challenges.functions";

// Temps adaptatif (2026-08-12, analyse « Évolution de Génizio » §5) — chrono doux,
// jamais punitif : le compte à rebours démarre à started_at + time_limit_minutes,
// et à l'expiration l'enfant peut continuer (bannière). L'événement TIME_OVER est
// journalisé UNE seule fois par défi (idempotent, côté serveur) pour nourrir le
// driver time_awareness du Jumeau Pédagogique.
export function ChallengeCountdown({
  challengeId,
  startedAt,
  timeLimitMinutes,
}: {
  challengeId: string;
  startedAt: string | null;
  timeLimitMinutes: number | null;
}) {
  const record = useServerFn(recordChallengeTimeOver);
  const recordedRef = useRef(false);
  const [now, setNow] = useState(() => Date.now());

  const expiresAt =
    startedAt && timeLimitMinutes
      ? new Date(startedAt).getTime() + timeLimitMinutes * 60_000
      : null;
  const expired = expiresAt !== null && now >= expiresAt;

  useEffect(() => {
    if (!expiresAt) return;
    const tick = () => setNow(Date.now());
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [expiresAt]);

  useEffect(() => {
    if (expired && !recordedRef.current) {
      recordedRef.current = true;
      void record({ data: { challengeId } }).catch(() => {});
    }
  }, [expired, challengeId, record]);

  if (expiresAt === null) return null;

  if (expired) {
    return (
      <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">
        <span className="text-sm leading-5">⏳</span>
        <p className="text-xs font-bold leading-5 text-amber-800">
          Le temps est écoulé — Naya te laisse continuer si tu veux, prends ton temps.
        </p>
      </div>
    );
  }

  const remainMs = Math.max(0, expiresAt - now);
  const minutes = Math.floor(remainMs / 60_000);
  const seconds = Math.floor((remainMs % 60_000) / 1000);
  const label = minutes > 0 ? `${minutes} min ${String(seconds).padStart(2, "0")}` : `${seconds} s`;

  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-[11px] font-black text-sky-700">
      ⏳ {label}
    </span>
  );
}
