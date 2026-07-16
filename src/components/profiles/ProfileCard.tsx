import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { TalentRadarChart } from "@/components/TalentRadarChart";
import { AVATAR_COLORS, type ChildProfile } from "./shared";

export function ProfileCard({
  profile,
  onEdit,
  onDelete,
}: {
  profile: ChildProfile;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [showPortfolio, setShowPortfolio] = useState(false);
  const color = AVATAR_COLORS.find((c) => c.key === profile.avatar_color)?.cls ?? "bg-brand";

  return (
    <div className="rounded-3xl bg-white p-6 shadow-soft ring-1 ring-ink/5">
      <div className="mb-4 flex items-center gap-4">
        <div className={`grid size-14 place-items-center rounded-full font-display text-xl font-bold text-white ${color}`}>
          {profile.name.charAt(0).toUpperCase()}
        </div>
        <div>
          <h3 className="font-display text-xl font-bold">{profile.name}</h3>
          <p className="text-xs text-ink/50">
            {profile.age} ans
            {profile.city ? ` · ${profile.city}` : ""}
            {profile.country ? `, ${profile.country}` : ""}
          </p>
        </div>
      </div>
      <div className="mb-4 flex flex-wrap gap-1.5">
        {profile.interests.slice(0, 6).map((i) => (
          <span key={i} className="rounded-full bg-brand/10 px-2.5 py-0.5 text-[11px] font-medium text-brand">
            {i}
          </span>
        ))}
        {profile.interests.length === 0 && (
          <span className="text-xs text-ink/40">Aucun centre d'intérêt</span>
        )}
      </div>
      <div className="mb-4 flex gap-4 text-xs text-ink/50">
        <span>★ {profile.favorite_challenges.length} favoris</span>
        <span>✓ {profile.completed_challenges.length} complétés</span>
      </div>
      <Link
        to="/profiles/$profileId/challenges"
        params={{ profileId: profile.id }}
        className="mb-2 block w-full rounded-xl bg-brand px-3 py-2 text-center text-xs font-bold text-white shadow-brand hover:bg-brand-dark"
      >
        ✨ Défis en cours →
      </Link>
      <button
        onClick={() => setShowPortfolio(!showPortfolio)}
        className="mb-4 block w-full rounded-xl border border-brand/20 bg-brand/5 px-3 py-2 text-center text-xs font-bold text-brand hover:bg-brand/10 transition-colors"
      >
        {showPortfolio ? "Masquer le Portfolio" : "📊 Voir le Portfolio (Carte des Talents)"}
      </button>

      {showPortfolio && <TalentRadarChart talents={profile.talents} name={profile.name} className="mb-4 h-48 w-full" />}

      <div className="flex gap-2">
        <button
          onClick={onEdit}
          className="flex-1 rounded-xl border-2 border-ink/5 px-3 py-2 text-xs font-bold hover:bg-stone-50"
        >
          Modifier
        </button>
        <button
          onClick={onDelete}
          className="rounded-xl border-2 border-red-100 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50"
        >
          Supprimer
        </button>
      </div>
    </div>
  );
}
