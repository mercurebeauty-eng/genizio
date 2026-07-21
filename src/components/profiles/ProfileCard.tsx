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
    <div className="rounded-3xl border border-ink/10 bg-white p-6 shadow-md">
      <div className="mb-4 flex items-center gap-4">
        <div className={`grid size-14 place-items-center rounded-full font-display text-balance text-xl font-bold text-white ${color}`}>
          {profile.name.charAt(0).toUpperCase()}
        </div>
        <div>
          <h3 className="font-display text-balance text-xl font-bold">{profile.name}</h3>
          <p className="text-xs text-ink/60">
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
          <span className="text-xs text-ink/60">Aucun centre d'intérêt</span>
        )}
      </div>
      <div className="mb-4 flex gap-4 text-xs text-ink/60">
        <span>★ {profile.favorite_challenges.length} favoris</span>
        <span>✓ {profile.completed_challenges.length} complétés</span>
      </div>
      <Link
        to="/profiles/$profileId/challenges"
        params={{ profileId: profile.id }}
        className="press-brand mb-2 block w-full rounded-xl px-3 py-2 text-center text-xs font-bold text-white"
      >
        ✨ Défis en cours →
      </Link>
      <button
        onClick={() => setShowPortfolio(!showPortfolio)}
        className="press-sky mb-4 block w-full rounded-xl bg-sky px-3 py-2 text-center text-xs font-bold text-ink"
      >
        {showPortfolio ? "Masquer le Portfolio" : "📊 Voir le Portfolio (Carte des Talents)"}
      </button>

      {showPortfolio && <TalentRadarChart talents={profile.talents} name={profile.name} className="mb-4 h-48 w-full" />}

      <div className="flex gap-2">
        <button
          onClick={onEdit}
          className="press-white flex-1 rounded-xl border border-ink/10 bg-white px-3 py-2 text-xs font-bold"
        >
          Modifier
        </button>
        <button
          onClick={onDelete}
          className="press-white rounded-xl border border-ink/10 bg-white px-3 py-2 text-xs font-bold text-red-600"
        >
          Supprimer
        </button>
      </div>
    </div>
  );
}
