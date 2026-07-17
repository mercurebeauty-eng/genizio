import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer } from "recharts";

const TALENT_KEYS = [
  { key: "spatial", subject: "Spatiale" },
  { key: "corporelle", subject: "Corporelle" },
  { key: "sociale", subject: "Sociale" },
  { key: "entrepreneuriale", subject: "Entreprendre" },
  { key: "creative", subject: "Créative" },
  { key: "artisanale", subject: "Artisanale" },
  { key: "emotionnelle", subject: "Émotionnelle" },
  { key: "logico_mathematique", subject: "Logique" },
  { key: "linguistique", subject: "Linguistique" },
] as const;

type TalentRadarChartProps = {
  talents: Record<string, number> | null | undefined;
  name?: string;
  className?: string;
  age?: number;
};

export function TalentRadarChart({ talents, name, className = "h-48 w-full", age }: TalentRadarChartProps) {
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

  return (
    <div className={className}>
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
          <PolarGrid stroke="#1A1A1A" strokeOpacity={0.15} />
          <PolarAngleAxis
            dataKey="subject"
            tick={{
              fill: "#1A1A1A",
              fontSize: 10,
              fontWeight: 800,
              fontFamily: "Fredoka, sans-serif"
            }}
          />
          <Radar
            name={name}
            dataKey="A"
            stroke={chartColor}
            fill={chartColor}
            fillOpacity={0.35}
            strokeWidth={3}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
