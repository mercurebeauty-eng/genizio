import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer } from "recharts";
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

export function TalentRadarChart({ talents, name, className = "h-48 w-full", age, dark = false }: TalentRadarChartProps) {
  const raw = talents ?? {};
  const data = TALENT_KEYS.map(({ key, subject }) => ({ subject, A: raw[key] || 0, fullMark: 100 }));

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
  const labelColor  = dark ? "#FFFFFF" : "#1A1A1A";
  const gridColor   = dark ? "#FFFFFF" : "#1A1A1A";
  const gridOpacity = dark ? 0.20     : 0.15;

  return (
    <div className={className}>
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
          <PolarGrid stroke={gridColor} strokeOpacity={gridOpacity} />
          <PolarAngleAxis
            dataKey="subject"
            tick={{
              fill: labelColor,
              fontSize: 10,
              fontWeight: 800,
              fontFamily: "Fredoka, sans-serif",
            }}
          />
          <Radar
            name={name}
            dataKey="A"
            stroke={chartColor}
            fill={chartColor}
            fillOpacity={0.40}
            strokeWidth={3}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
