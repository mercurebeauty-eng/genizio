// Vue Escouade du Samedi (Phase 3) — interface mobile-first du mentor de soutien.
// Un seul flux du matin : escouade + rôles → atelier du jour + timeline
// chronométrée → pointage 1 tap → capture photo → verdict en direct
// (empreinte anti-doublon → Naya Vision → arbitrage) → payout affiché.
// Cibles tactiles ≥ 44 px, états verbeux (le mentor est debout, une main prise).

import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  AlertTriangle,
  Camera,
  Check,
  CheckCircle2,
  Clock,
  Flag,
  Loader2,
  RefreshCw,
  Timer,
  Users,
  XCircle,
} from "lucide-react";
import {
  declareClubSession,
  getMySquad,
  submitClubSessionProof,
  type ClubSessionResult,
  type SquadView,
} from "@/lib/saturday-clubs.functions";
import { fileToCompressedProof } from "@/lib/image-proof";

interface SaturdayClubSquadViewProps {
  onBack: () => void;
}

const STATUS_STYLES: Record<string, { label: string; cls: string }> = {
  validated: { label: "Validée", cls: "bg-emerald-100 text-emerald-700" },
  flagged: { label: "En revue", cls: "bg-amber-100 text-amber-700" },
  rejected: { label: "Rejetée", cls: "bg-red-100 text-red-700" },
  submitted: { label: "En traitement", cls: "bg-indigo-100 text-indigo-700" },
  draft: { label: "Brouillon", cls: "bg-stone-100 text-stone-600" },
};

function DecisionBanner({ result }: { result: ClubSessionResult }) {
  if (result.decision === "validated") {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
        <p className="flex items-center gap-2 text-sm font-black text-emerald-700">
          <CheckCircle2 className="size-5" /> Séance validée — débriefing envoyé aux parents.
        </p>
        {result.payoutXof != null && (
          <p className="mt-1 text-xs font-bold text-emerald-800/80">
            Quote-part mentor enregistrée : {result.payoutXof.toLocaleString("fr-FR")} FCFA.
          </p>
        )}
      </div>
    );
  }
  if (result.decision === "flagged") {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
        <p className="flex items-center gap-2 text-sm font-black text-amber-700">
          <Flag className="size-5" /> Séance en revue humaine (Admin OS).
        </p>
        {result.reasons.map((r, i) => (
          <p key={i} className="mt-1 text-xs font-semibold text-amber-800/90">{r}</p>
        ))}
      </div>
    );
  }
  return (
    <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
      <p className="flex items-center gap-2 text-sm font-black text-red-700">
        <XCircle className="size-5" /> Séance rejetée.
      </p>
      {result.reasons.map((r, i) => (
        <p key={i} className="mt-1 text-xs font-semibold text-red-800/90">{r}</p>
      ))}
      <p className="mt-1.5 text-[11px] font-bold text-red-800/70">
        Règle zéro écran : seule la photo d'un objet fabriqué/manipulé par les enfants est acceptée.
      </p>
    </div>
  );
}

export function SaturdayClubSquadView({ onBack }: SaturdayClubSquadViewProps) {
  const getSquadFn = useServerFn(getMySquad);
  const declareFn = useServerFn(declareClubSession);
  const submitProofFn = useServerFn(submitClubSessionProof);

  const [squad, setSquad] = useState<SquadView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [present, setPresent] = useState<Set<string>>(new Set());
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [declaring, setDeclaring] = useState(false);
  const [photo, setPhoto] = useState<{ base64: string; mediaType: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<ClubSessionResult | null>(null);
  const [debriefNote, setDebriefNote] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadSquad = () => {
    setLoading(true);
    setError(null);
    getSquadFn()
      .then((s) => {
        setSquad(s);
        setPresent(new Set((s?.members ?? []).map((m) => m.childProfileId)));
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Chargement impossible."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadSquad();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const togglePresence = (childId: string) => {
    setPresent((prev) => {
      const next = new Set(prev);
      if (next.has(childId)) next.delete(childId);
      else next.add(childId);
      return next;
    });
  };

  const handleDeclare = async () => {
    if (!squad) return;
    const attendance = squad.members.map((m) => ({
      childProfileId: m.childProfileId,
      present: present.has(m.childProfileId),
    }));
    setDeclaring(true);
    try {
      const res = await declareFn({
        data: {
          squadId: squad.squadId,
          occurredAt: new Date().toISOString().slice(0, 10),
          attendance,
        },
      });
      setSessionId(res.sessionId);
      toast.success("Pointage enregistré — bonne séance !");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Pointage impossible.");
    } finally {
      setDeclaring(false);
    }
  };

  const handlePhoto = async (file: File | null) => {
    if (!file) return;
    try {
      const compressed = await fileToCompressedProof(file);
      setPhoto({ base64: compressed.base64, mediaType: compressed.mediaType });
      setResult(null);
    } catch {
      toast.error("Image illisible — retentez une photo.");
    }
  };

  const handleSubmitProof = async () => {
    if (!sessionId || !photo) {
      toast.error("Pointez les présences puis photographiez l'objet fabriqué.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await submitProofFn({
        data: {
          sessionId,
          imageBase64: photo.base64,
          mediaType: photo.mediaType,
          debriefNote: debriefNote.trim() || undefined,
        },
      });
      setResult(res);
      if (res.decision === "validated") {
        toast.success("Séance validée !");
        setPhoto(null);
        setDebriefNote("");
      } else {
        toast.warning("Séance en revue — l'Admin OS va vérifier.");
      }
      // Rafraîchir l'historique des séances récentes.
      getSquadFn().then(setSquad).catch(() => {});
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Envoi impossible.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="size-8 animate-spin text-brand" />
      </div>
    );
  }

  if (error || !squad) {
    return (
      <div className="rounded-3xl border border-dashed border-ink/20 bg-white p-10 text-center shadow-xs space-y-4">
        <div className="grid size-14 place-items-center rounded-2xl bg-indigo-50 text-indigo-600 mx-auto">
          <Users className="size-7" />
        </div>
        <h3 className="font-display font-black text-xl text-ink">Aucune escouade du samedi</h3>
        <p className="text-sm text-ink/60 font-semibold">
          {error ?? "Créez votre escouade (6 à 8 enfants) pour animer un Club Périscolaire du Samedi."}
        </p>
        <button
          type="button"
          onClick={onBack}
          className="rounded-2xl border border-ink/10 px-4 py-2 text-xs font-black text-ink/70 hover:bg-stone-50"
        >
          Retour à l'espace mentor
        </button>
      </div>
    );
  }

  const presentCount = present.size;
  const quorumOk = presentCount >= 6 && presentCount <= 8;
  const alreadyValidatedToday = squad.recentSessions.some(
    (s) => s.status === "validated" && s.occurredAt === new Date().toISOString().slice(0, 10),
  );

  return (
    <div className="space-y-5">
      {/* En-tête escouade */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-black text-ink">{squad.name}</h2>
          <p className="text-xs font-semibold text-ink/50">
            {squad.members.length} enfants · atelier du jour : {squad.todayAtelier.label}
          </p>
        </div>
        <button
          type="button"
          onClick={loadSquad}
          className="grid size-10 place-items-center rounded-xl border border-ink/10 text-ink/60 hover:bg-stone-50"
          aria-label="Rafraîchir"
        >
          <RefreshCw className="size-4" />
        </button>
      </div>

      {alreadyValidatedToday && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3.5">
          <p className="text-sm font-black text-emerald-700">
            ✅ Séance du jour déjà validée. Rendez-vous samedi prochain !
          </p>
        </div>
      )}

      {/* Rôles naturels de la semaine */}
      <div className="rounded-3xl border border-ink/10 bg-white p-4 shadow-sm">
        <p className="text-[10px] font-black uppercase tracking-wider text-ink/50">
          Écrouade du jour — rôles naturels
        </p>
        <div className="mt-2 space-y-2">
          {squad.members.map((m) => (
            <button
              key={m.childProfileId}
              type="button"
              onClick={() => togglePresence(m.childProfileId)}
              disabled={alreadyValidatedToday || Boolean(sessionId)}
              className={`flex w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left transition-all min-h-[48px] ${
                present.has(m.childProfileId)
                  ? "border-emerald-200 bg-emerald-50"
                  : "border-ink/10 bg-white opacity-70"
              } disabled:opacity-90`}
            >
              <span className="flex items-center gap-2.5 min-w-0">
                <span
                  className={`grid size-6 shrink-0 place-items-center rounded-full border-2 ${
                    present.has(m.childProfileId)
                      ? "border-emerald-500 bg-emerald-500 text-white"
                      : "border-ink/20 text-transparent"
                  }`}
                >
                  <Check className="size-3.5" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-black text-ink">{m.childName}</span>
                  {m.roleLabel && (
                    <span className="block text-[11px] font-bold text-indigo-600">{m.roleLabel}</span>
                  )}
                </span>
              </span>
            </button>
          ))}
        </div>

        {!sessionId && !alreadyValidatedToday && (
          <button
            type="button"
            onClick={() => void handleDeclare()}
            disabled={declaring || !quorumOk}
            className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-4 py-3 text-sm font-black text-white shadow-md transition-all hover:bg-indigo-700 disabled:opacity-50 min-h-[48px]"
          >
            {declaring ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
            Enregistrer le pointage ({presentCount} présents)
          </button>
        )}
        {!quorumOk && !sessionId && !alreadyValidatedToday && (
          <p className="mt-2 flex items-center gap-1.5 text-[11px] font-bold text-amber-700">
            <AlertTriangle className="size-3.5" /> Le quorum de 6 à 8 présents est requis pour valider la séance.
          </p>
        )}
      </div>

      {/* Atelier du jour + timeline */}
      <div className="rounded-3xl border border-ink/10 bg-white p-4 shadow-sm">
        <p className="text-[10px] font-black uppercase tracking-wider text-ink/50">Défi matériel du jour</p>
        <p className="mt-1 text-sm font-black text-ink">{squad.todayAtelier.label}</p>
        <p className="mt-1.5 text-xs font-semibold text-ink/80 leading-relaxed">{squad.todayAtelier.brief}</p>
        <p className="mt-2 text-[11px] font-bold text-ink/50">
          Matériel : {squad.todayAtelier.materials.join(" · ")}
        </p>
        <div className="mt-3 space-y-1.5 border-t border-ink/5 pt-3">
          {squad.timeline.map((p) => (
            <div key={p.phase} className="flex items-start gap-2">
              <span className="mt-0.5 inline-flex items-center gap-1 rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-black text-ink/70 shrink-0">
                <Timer className="size-3" /> {p.minutes} min
              </span>
              <span className="text-[11px] font-semibold text-ink/70">
                <span className="font-black text-ink">{p.phase}</span> — {p.guidance}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Preuve photo + verdict */}
      {!alreadyValidatedToday && (
        <div className="rounded-3xl border border-ink/10 bg-white p-4 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-wider text-ink/50">
            Preuve matérielle (zéro écran)
          </p>
          {!sessionId ? (
            <p className="mt-2 text-xs font-semibold text-ink/60">
              Enregistrez d'abord le pointage pour débloquer la capture.
            </p>
          ) : (
            <div className="mt-2 space-y-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.heic"
                capture="environment"
                className="hidden"
                onChange={(e) => void handlePhoto(e.target.files?.[0] ?? null)}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className={`inline-flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-4 py-5 text-sm font-black transition-all min-h-[56px] ${
                  photo ? "border-emerald-300 bg-emerald-50 text-emerald-700" : "border-ink/20 text-ink/60 hover:border-indigo-300"
                }`}
              >
                {photo ? (
                  <>
                    <Check className="size-5" /> Photo prête — vérification en cours à l'envoi
                  </>
                ) : (
                  <>
                    <Camera className="size-5" /> Photographier l'objet fabriqué
                  </>
                )}
              </button>
              <textarea
                value={debriefNote}
                onChange={(e) => setDebriefNote(e.target.value)}
                rows={2}
                placeholder="Note de débriefing pour les familles (optionnel) : ce que les enfants ont fabriqué…"
                className="w-full rounded-xl border border-ink/10 px-3 py-2 text-sm font-semibold outline-none focus:border-indigo-400"
              />
              <button
                type="button"
                onClick={() => void handleSubmitProof()}
                disabled={submitting || !photo}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-brand px-4 py-3 text-sm font-black text-white shadow-md transition-all hover:opacity-90 disabled:opacity-50 min-h-[48px]"
              >
                {submitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" /> Vérification anti-doublon + Naya Vision…
                  </>
                ) : (
                  <>
                    <Camera className="size-4" /> Envoyer la preuve de séance
                  </>
                )}
              </button>
              {result && <DecisionBanner result={result} />}
            </div>
          )}
        </div>
      )}

      {/* Historique récent */}
      {squad.recentSessions.length > 0 && (
        <div className="rounded-3xl border border-ink/10 bg-white p-4 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-wider text-ink/50">Séances récentes</p>
          <div className="mt-2 space-y-1.5">
            {squad.recentSessions.map((s) => {
              const st = STATUS_STYLES[s.status] ?? STATUS_STYLES.draft;
              return (
                <div key={s.id} className="flex items-center justify-between gap-2 rounded-xl border border-ink/10 px-3 py-2">
                  <div className="min-w-0">
                    <p className="text-xs font-black text-ink">
                      {new Date(s.occurredAt).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
                    </p>
                    {s.rejectionReason && (
                      <p className="truncate text-[10px] font-semibold text-red-600">{s.rejectionReason}</p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {s.payoutXof != null && (
                      <span className="text-[11px] font-black text-emerald-700">
                        +{s.payoutXof.toLocaleString("fr-FR")} F
                      </span>
                    )}
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${st.cls}`}>{st.label}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Aucune séance enregistrée */}
      {squad.recentSessions.length === 0 && (
        <p className="flex items-center justify-center gap-1.5 text-[11px] font-semibold text-ink/40">
          <Clock className="size-3" /> Aucune séance enregistrée pour le moment.
        </p>
      )}
    </div>
  );
}
