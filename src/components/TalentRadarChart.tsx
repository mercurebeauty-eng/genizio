import { TALENT_KEY_LABELS } from "@/lib/talent-buckets";

const TALENT_KEYS = Object.entries(TALENT_KEY_LABELS).map(([key, subject]) => ({ key, subject }));

type TalentRadarChartProps = {
  talents: Record<string, number> | null | undefined;
  name?: string;
  className?: string;
  age?: number;
  /** Pass true when the chart sits on a dark background (bg-ink). */
  dark?: boolean;
};

export function TalentRadarChart({
  talents,
  className = "h-48 w-full",
  age,
  dark = false,
}: TalentRadarChartProps) {
  const raw = talents ?? {};

  // Color mapping based on child age typology
  let chartColor = "#6366f1"; // default Indigo
  if (age !== undefined) {
    if (age >= 12) {
      chartColor = "#f59e0b"; // amber for Maîtrise
    } else if (age >= 7) {
      chartColor = "#0ea5e9"; // sky blue for Exploration
    } else {
      chartColor = "#10b981"; // emerald green for Éveil
    }
  }

  // Palette depends on background
  const labelColor = dark ? "#FFFFFF" : "#1A1A1A";
  const gridColor = dark ? "#FFFFFF" : "#1A1A1A";
  const gridOpacity = dark ? 0.2 : 0.15;

  const numAxes = TALENT_KEYS.length;
  const cx = 150;
  const cy = 150;
  const maxRadius = 90;

  // Calcul des coordonnées pour chaque axe
  const axisAngles = TALENT_KEYS.map((_, i) => -Math.PI / 2 + (2 * Math.PI * i) / numAxes);

  // Polygones de la grille concentrique (25%, 50%, 75%, 100%)
  const gridLevels = [0.25, 0.5, 0.75, 1.0];
  const gridPolygons = gridLevels.map((level) => {
    return axisAngles
      .map((angle) => {
        const x = cx + maxRadius * level * Math.cos(angle);
        const y = cy + maxRadius * level * Math.sin(angle);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");
  });

  // Polygone des données réelles
  const dataPoints = TALENT_KEYS.map(({ key }, i) => {
    const val = Math.max(0, Math.min(100, raw[key] || 0));
    const radius = maxRadius * (val / 100);
    const angle = axisAngles[i];
    const x = cx + radius * Math.cos(angle);
    const y = cy + radius * Math.sin(angle);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");

  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      <svg
        viewBox="0 0 300 300"
        className="h-full w-full max-w-full overflow-visible"
        aria-hidden="true"
      >
        {/* Niveaux de grille concentriques */}
        {gridPolygons.map((points, idx) => (
          <polygon
            key={idx}
            points={points}
            fill="none"
            stroke={gridColor}
            strokeOpacity={gridOpacity}
            strokeWidth={1}
          />
        ))}

        {/* Lignes d'axes radiaux */}
        {axisAngles.map((angle, idx) => {
          const x2 = cx + maxRadius * Math.cos(angle);
          const y2 = cy + maxRadius * Math.sin(angle);
          return (
            <line
              key={idx}
              x1={cx}
              y1={cy}
              x2={x2}
              y2={y2}
              stroke={gridColor}
              strokeOpacity={gridOpacity}
              strokeWidth={1}
            />
          );
        })}

        {/* Forme des talents de l'enfant */}
        <polygon
          points={dataPoints}
          fill={chartColor}
          fillOpacity={0.4}
          stroke={chartColor}
          strokeWidth={2.5}
          className="transition-all duration-500 ease-out"
        />

        {/* Points sur chaque sommet */}
        {TALENT_KEYS.map(({ key }, i) => {
          const val = Math.max(0, Math.min(100, raw[key] || 0));
          const radius = maxRadius * (val / 100);
          const angle = axisAngles[i];
          const x = cx + radius * Math.cos(angle);
          const y = cy + radius * Math.sin(angle);
          return (
            <circle
              key={key}
              cx={x}
              cy={y}
              r={3}
              fill={chartColor}
              className="transition-all duration-500 ease-out"
            />
          );
        })}

        {/* Libellés des 9 intelligences */}
        {TALENT_KEYS.map(({ subject }, i) => {
          const angle = axisAngles[i];
          const labelDist = maxRadius + 18;
          const lx = cx + labelDist * Math.cos(angle);
          const ly = cy + labelDist * Math.sin(angle);

          const cos = Math.cos(angle);
          const sin = Math.sin(angle);

          let textAnchor: "start" | "end" | "middle" = "middle";
          if (cos > 0.3) textAnchor = "start";
          else if (cos < -0.3) textAnchor = "end";

          let dominantBaseline: "hanging" | "baseline" | "central" = "central";
          if (sin > 0.4) dominantBaseline = "hanging";
          else if (sin < -0.4) dominantBaseline = "baseline";

          return (
            <text
              key={subject}
              x={lx}
              y={ly}
              textAnchor={textAnchor}
              dominantBaseline={dominantBaseline}
              fill={labelColor}
              fontSize={9.5}
              fontWeight={800}
              fontFamily="Fredoka, sans-serif"
              className="select-none"
            >
              {subject}
            </text>
          );
        })}
      </svg>
    </div>
  );
}
