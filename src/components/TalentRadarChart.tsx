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
};

export function TalentRadarChart({ talents, name, className = "h-48 w-full" }: TalentRadarChartProps) {
  const raw = talents ?? {};
  const data = TALENT_KEYS.map(({ key, subject }) => ({ subject, A: raw[key] || 0, fullMark: 100 }));

  return (
    <div className={className}>
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
          <PolarGrid stroke="#e2e8f0" />
          <PolarAngleAxis dataKey="subject" tick={{ fill: "#64748b", fontSize: 10, fontWeight: 600 }} />
          <Radar name={name} dataKey="A" stroke="#6366f1" fill="#6366f1" fillOpacity={0.4} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
