// ────────────────────────────────────────────────────────────
// GÉNIZIO — Document PDF du Passeport d'Excellence
//
// Généré 100% côté navigateur avec @react-pdf/renderer : le résultat est un
// vrai PDF vectoriel (texte réel, pas un scan), paginé en A4, identique sur
// mobile et desktop. Les polices Fredoka/Inter sont servies depuis
// /public/fonts (fichiers TTF complets, couverture latin + latin-ext pour les
// accents français dont œ/Œ). Les images de preuve sont passées en data-URL
// (pré-téléchargées par l'appelant) pour éviter tout problème CORS.
// ────────────────────────────────────────────────────────────
import {
  Document,
  Page,
  Text,
  View,
  Image,
  Svg,
  Polygon,
  Line,
  Circle,
  StyleSheet,
} from "@react-pdf/renderer";
import type { Style } from "@react-pdf/stylesheet";
import type { ReactNode } from "react";
import { getChildGuild, getTalentAffinities } from "@/lib/guilds";
import { GARDNER_TAXONOMY, type GardnerKey } from "@/lib/gardner";
import { BADGE_CATALOG } from "@/lib/badge-catalog";
import { normalizeChildInterests } from "@/lib/interest-migration";
import {
  registerPassportFonts,
  PDF_COLORS,
  PASSPORT_FONT_DISPLAY,
  PASSPORT_FONT_BODY,
  paginateChallenges,
  GUILD_BAR_COLORS,
} from "@/lib/passport-pdf";

registerPassportFonts();

const MARGIN = 46;
const CONTENT_WIDTH = 595.28 - MARGIN * 2; // A4 - marges latérales

// ── StyleSheet global ────────────────────────────────────────
const styles = StyleSheet.create({
  page: {
    fontFamily: PASSPORT_FONT_BODY,
    fontSize: 8.5,
    lineHeight: 1.5,
    color: PDF_COLORS.ink,
    backgroundColor: PDF_COLORS.white,
    paddingTop: MARGIN,
    paddingHorizontal: MARGIN,
    paddingBottom: 60, // place pour le footer de page
  },
  footer: {
    position: "absolute",
    bottom: 24,
    left: MARGIN,
    right: MARGIN,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: PDF_COLORS.dividerSoft,
    paddingTop: 6,
  },
  footerText: {
    fontSize: 6.5,
    fontFamily: PASSPORT_FONT_BODY,
    fontWeight: 600,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: PDF_COLORS.inkMuted,
  },
});

// ── Helpers de mise en page ──────────────────────────────────
const sectionHeading = {
  fontFamily: PASSPORT_FONT_DISPLAY,
  fontWeight: 700,
  fontSize: 13,
  color: PDF_COLORS.ink,
  textTransform: "uppercase" as const,
  letterSpacing: 0.3,
};

const cardBase = {
  borderWidth: 1,
  borderColor: PDF_COLORS.dividerSoft,
  borderRadius: 8,
  padding: 10,
};

/** Type de carte (« Éveil », « Exploration », « Maîtrise ») selon l'âge. */
function talentTypeLabel(age: number) {
  if (age >= 12) return "Carte Maîtrise";
  if (age >= 7) return "Carte Exploration";
  return "Carte Éveil";
}

function talentLevel(score: number) {
  if (score >= 70) return { level: 3, label: "Niveau III" };
  if (score >= 40) return { level: 2, label: "Niveau II" };
  return { level: 1, label: "Niveau I" };
}

function formatDate(iso: string | null) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

// ── Markdown → éléments PDF ──────────────────────────────────
type MdBlock =
  | { type: "p"; text: string }
  | { type: "h"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] }
  | { type: "quote"; text: string };

function parseMarkdown(md: string): MdBlock[] {
  const blocks: MdBlock[] = [];
  const lines = md.split("\n");
  let listType: "ul" | "ol" | null = null;
  let items: string[] = [];

  const flushList = () => {
    if (listType && items.length > 0) {
      blocks.push({ type: listType, items: [...items] });
      items = [];
    }
    listType = null;
  };

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    if (!line.trim()) {
      flushList();
      continue;
    }
    const h = line.match(/^(#{1,3})\s+(.*)$/);
    if (h) {
      flushList();
      blocks.push({ type: "h", text: h[2] });
      continue;
    }
    const bullet = line.match(/^[-*•]\s+(.*)$/);
    if (bullet) {
      if (listType !== "ul") {
        flushList();
        listType = "ul";
      }
      items.push(bullet[1]);
      continue;
    }
    const num = line.match(/^\d+[.)]\s+(.*)$/);
    if (num) {
      if (listType !== "ol") {
        flushList();
        listType = "ol";
      }
      items.push(num[1]);
      continue;
    }
    const quote = line.match(/^>\s?(.*)$/);
    if (quote) {
      flushList();
      blocks.push({ type: "quote", text: quote[1] });
      continue;
    }
    flushList();
    blocks.push({ type: "p", text: line });
  }
  flushList();
  return blocks;
}

/** Découpe le gras `**texte**` et le code `` `code` `` en segments stylisés.
 *  L'italique `*…*` n'est pas reproduit (pas de fonte italique enregistrée). */
function renderInline(text: string, baseStyle: Style): ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).filter(Boolean);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <Text key={i} style={{ ...baseStyle, fontFamily: PASSPORT_FONT_DISPLAY, fontWeight: 600 }}>
          {part.slice(2, -2)}
        </Text>
      );
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <Text
          key={i}
          style={{
            ...baseStyle,
            fontFamily: "Courier",
            fontSize: (baseStyle.fontSize as number | undefined) ?? 8 * 0.92,
          }}
        >
          {part.slice(1, -1)}
        </Text>
      );
    }
    return (
      <Text key={i} style={baseStyle}>
        {part}
      </Text>
    );
  });
}

function MdContent({ md, baseStyle }: { md: string; baseStyle: Style }) {
  const blocks = parseMarkdown(md);
  return (
    <>
      {blocks.map((block, i) => {
        switch (block.type) {
          case "h":
            return (
              <Text
                key={i}
                style={{
                  fontFamily: PASSPORT_FONT_DISPLAY,
                  fontWeight: 700,
                  fontSize: 10.5,
                  marginBottom: 3,
                  marginTop: 2,
                  color: PDF_COLORS.ink,
                }}
              >
                {block.text}
              </Text>
            );
          case "p":
            return (
              <Text key={i} style={{ ...baseStyle, marginBottom: 4 }}>
                {renderInline(block.text, baseStyle)}
              </Text>
            );
          case "quote":
            return (
              <View
                key={i}
                style={{
                  borderLeftWidth: 2,
                  borderLeftColor: PDF_COLORS.brand,
                  paddingLeft: 8,
                  marginBottom: 4,
                }}
              >
                <Text style={{ ...baseStyle, color: PDF_COLORS.inkMuted }}>{block.text}</Text>
              </View>
            );
          case "ul":
          case "ol":
            return (
              <View key={i} style={{ marginBottom: 4 }}>
                {block.items.map((item, j) => (
                  <View key={j} style={{ flexDirection: "row", marginBottom: 1.5 }}>
                    <Text
                      style={{ ...baseStyle, width: 10, color: PDF_COLORS.brand, fontWeight: 600 }}
                    >
                      {block.type === "ul" ? "•" : `${j + 1}.`}
                    </Text>
                    <Text style={{ ...baseStyle, flex: 1 }}>{renderInline(item, baseStyle)}</Text>
                  </View>
                ))}
              </View>
            );
        }
      })}
    </>
  );
}

// ── Radar des 9 intelligences en SVG vectoriel ───────────────
const RADAR = { w: 400, h: 330, cx: 200, cy: 168, r: 102 };
const RADAR_KEYS = Object.keys(GARDNER_TAXONOMY) as GardnerKey[];

// Les types de react-pdf ne couvrent pas fontSize/fontFamily sur le <Text> SVG
// (pourtant lus à l'exécution — cf. renderSvgText) : on re-type en props libres.
const SvgText = Text as unknown as React.ComponentType<Record<string, unknown>>;

function radarPoint(index: number, radius: number) {
  const angle = ((-90 + index * (360 / RADAR_KEYS.length)) * Math.PI) / 180;
  return {
    x: RADAR.cx + radius * Math.cos(angle),
    y: RADAR.cy + radius * Math.sin(angle),
  };
}

function ringPoints(fraction: number) {
  return RADAR_KEYS.map((_, i) => {
    const p = radarPoint(i, RADAR.r * fraction);
    return `${p.x.toFixed(2)},${p.y.toFixed(2)}`;
  }).join(" ");
}

function TalentRadarSvg({ talents, color }: { talents: Record<string, number>; color: string }) {
  const dataPoints = RADAR_KEYS.map((key, i) => {
    const value = Math.max(0, Math.min(100, talents[key] ?? 0));
    return radarPoint(i, (RADAR.r * value) / 100);
  });

  // Box ajustée au ratio du viewBox (400:330) : l'échelle reste uniforme, le
  // radar conserve ses proportions et ne laisse pas de vide horizontal.
  return (
    <Svg viewBox={`0 0 ${RADAR.w} ${RADAR.h}`} style={{ width: 300, height: 218 }}>
      {[0.25, 0.5, 0.75, 1].map((f) => (
        <Polygon
          key={f}
          points={ringPoints(f)}
          fill="none"
          stroke={PDF_COLORS.ink}
          strokeOpacity={0.14}
          strokeWidth={1}
        />
      ))}
      {RADAR_KEYS.map((_, i) => {
        const p = radarPoint(i, RADAR.r);
        return (
          <Line
            key={i}
            x1={RADAR.cx}
            y1={RADAR.cy}
            x2={p.x}
            y2={p.y}
            stroke={PDF_COLORS.ink}
            strokeOpacity={0.12}
            strokeWidth={1}
          />
        );
      })}
      <Polygon
        points={dataPoints.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(" ")}
        fill={color}
        fillOpacity={0.28}
        stroke={color}
        strokeWidth={2}
      />
      {RADAR_KEYS.map((key, i) => {
        const p = radarPoint(i, RADAR.r + 16);
        const value = talents[key] ?? 0;
        return (
          <SvgText
            key={key}
            x={p.x}
            y={p.y}
            fontSize={7}
            fill={PDF_COLORS.ink}
            textAnchor="middle"
            dominantBaseline="middle"
            fontFamily={PASSPORT_FONT_BODY}
            fontWeight={600}
          >
            {GARDNER_TAXONOMY[key].name}
            {value > 0 ? ` (${value}%)` : ""}
          </SvgText>
        );
      })}
      {dataPoints.map((p, i) => (
        <Circle key={i} cx={p.x} cy={p.y} r={2} fill={color} />
      ))}
    </Svg>
  );
}

// ── Pied de page avec numérotation ───────────────────────────
function PageFooter({
  childName,
  pageNumber,
  totalPages,
}: {
  childName: string;
  pageNumber: number;
  totalPages: number;
}) {
  return (
    <View style={styles.footer} fixed>
      <Text style={styles.footerText}>Passeport d'Excellence • {childName}</Text>
      <Text style={styles.footerText}>
        Page {pageNumber} / {totalPages}
      </Text>
    </View>
  );
}

// ── Types des données reçues ─────────────────────────────────
export type PassportPdfChallenge = {
  id: string;
  title: string;
  domain: string;
  completed_at: string | null;
  proof_image_url: string | null;
  description: string;
  ai_observations: string | null;
  notes: string | null;
};

export type PassportPdfData = {
  child: {
    id: string;
    name: string;
    age: number;
    talents: Record<string, number>;
    interests: string[];
    city: string | null;
    country: string | null;
    xp: number | null;
  };
  challenges: PassportPdfChallenge[];
  earnedBadges: string[];
  synthesis: string;
  letter: string;
  /** data-URL des photos de preuve, indexées par id de défi. */
  proofImages: Record<string, string>;
  longitudinalGraph?: any; // The full LongitudinalGraph calculated from discovery traces
};

export function PassportPdf({ data }: { data: PassportPdfData }) {
  const { child, challenges, earnedBadges, synthesis, letter, longitudinalGraph } = data;
  const guild = getChildGuild(child.talents);
  const totalXP = child.xp || 0;
  const level = Math.floor(totalXP / 500) + 1;
  const locationStr = [child.city, child.country].filter(Boolean).join(", ");
  const hasSynthesis = Boolean(synthesis.trim());

  // Terrains d'excellence = top 3 domaines des défis réussis.
  const domainCounts: Record<string, number> = {};
  for (const c of challenges) domainCounts[c.domain] = (domainCounts[c.domain] ?? 0) + 1;
  const topDomains = Object.entries(domainCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  const drivers = normalizeChildInterests(child.interests);
  const affinities = getTalentAffinities(child.talents).filter((a) => a.pct > 0);

  const topTalents = Object.entries(child.talents || {})
    .filter(([, val]) => val > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);

  const challengePages = paginateChallenges(challenges);
  const hasLongitudinal = longitudinalGraph && longitudinalGraph.experiences.length > 0;
  const startPage = hasSynthesis ? 4 : 3;
  const challengeStartPage = startPage + (hasLongitudinal ? 1 : 0);
  const totalPages = 2 + (hasSynthesis ? 1 : 0) + (hasLongitudinal ? 1 : 0) + challengePages.length;

  const radarColor =
    child.age >= 12 ? PDF_COLORS.amber : child.age >= 7 ? PDF_COLORS.skyDark : PDF_COLORS.leaf;

  return (
    <Document
      title={`Passeport d'Excellence — ${child.name}`}
      author="Génizio — Laboratoire d'Innovation Pédagogique"
      subject={`Dossier de valorisation des talents de ${child.name}`}
      producer="Génizio"
    >
      {/* ══ PAGE 1 : COUVERTURE ══ */}
      <Page size="A4" style={styles.page}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottomWidth: 2.5,
            borderBottomColor: PDF_COLORS.ink,
            paddingBottom: 14,
          }}
        >
          <Text
            style={{
              fontFamily: PASSPORT_FONT_DISPLAY,
              fontWeight: 700,
              fontSize: 17,
              color: PDF_COLORS.brand,
              letterSpacing: 0.5,
            }}
          >
            GÉNIZIO
          </Text>
          <Text
            style={{
              fontFamily: PASSPORT_FONT_BODY,
              fontWeight: 700,
              fontSize: 6,
              letterSpacing: 1,
              textTransform: "uppercase",
              borderWidth: 1.2,
              borderColor: PDF_COLORS.ink,
              borderRadius: 999,
              paddingVertical: 3,
              paddingHorizontal: 8,
              color: PDF_COLORS.ink,
              backgroundColor: PDF_COLORS.surface,
            }}
          >
            Dossier de Valorisation Génizio
          </Text>
        </View>

        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center", paddingVertical: 40 }}
        >
          <View
            style={{
              width: 56,
              height: 56,
              borderRadius: 18,
              backgroundColor: "#f7ece3",
              borderWidth: 1,
              borderColor: PDF_COLORS.dividerSoft,
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 16,
            }}
          >
            <Text style={{ fontFamily: PASSPORT_FONT_BODY, fontSize: 24, color: PDF_COLORS.brand }}>
              ★
            </Text>
          </View>
          <Text
            style={{
              fontFamily: PASSPORT_FONT_DISPLAY,
              fontWeight: 700,
              fontSize: 30,
              textTransform: "uppercase",
              color: PDF_COLORS.ink,
              textAlign: "center",
              letterSpacing: 0.5,
            }}
          >
            Passeport d'Excellence
          </Text>
          <Text
            style={{
              fontFamily: PASSPORT_FONT_BODY,
              fontWeight: 500,
              fontSize: 6.5,
              letterSpacing: 1.6,
              textTransform: "uppercase",
              color: PDF_COLORS.ink,
              textAlign: "center",
              marginTop: 10,
              borderTopWidth: 1,
              borderBottomWidth: 1,
              borderColor: PDF_COLORS.ink,
              paddingVertical: 5,
              paddingHorizontal: 24,
              maxWidth: 340,
            }}
          >
            Dossier de valorisation des talents, compétences et moteurs d'engagement
          </Text>

          <Text
            style={{
              fontFamily: PASSPORT_FONT_DISPLAY,
              fontWeight: 700,
              fontSize: 26,
              color: PDF_COLORS.brand,
              marginTop: 26,
              textAlign: "center",
            }}
          >
            {child.name}
          </Text>
          <Text
            style={{
              fontFamily: PASSPORT_FONT_BODY,
              fontWeight: 600,
              fontSize: 8.5,
              color: PDF_COLORS.inkMuted,
              marginTop: 6,
              textAlign: "center",
            }}
          >
            Âge : {child.age} ans{locationStr ? `  •  ${locationStr}` : ""}
          </Text>

          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginTop: 16,
              borderWidth: 1.2,
              borderColor: PDF_COLORS.dividerSoft,
              borderRadius: 12,
              backgroundColor: PDF_COLORS.surface,
              paddingVertical: 8,
              paddingHorizontal: 16,
            }}
          >
            <Text style={{ fontFamily: PASSPORT_FONT_BODY, fontSize: 14, marginRight: 8 }}>◉</Text>
            <View>
              <Text
                style={{
                  fontFamily: PASSPORT_FONT_DISPLAY,
                  fontWeight: 700,
                  fontSize: 10,
                  color: PDF_COLORS.ink,
                }}
              >
                {guild.name}
              </Text>
              <Text
                style={{
                  fontFamily: PASSPORT_FONT_BODY,
                  fontWeight: 600,
                  fontSize: 7,
                  color: PDF_COLORS.brand,
                  marginTop: 1,
                }}
              >
                Niveau {level} · {totalXP} XP cumulés
              </Text>
            </View>
          </View>
        </View>

        <View
          style={{
            flexDirection: "row",
            alignItems: "flex-end",
            justifyContent: "space-between",
            borderTopWidth: 2.5,
            borderTopColor: PDF_COLORS.ink,
            paddingTop: 14,
          }}
        >
          <View>
            <Text
              style={{
                fontFamily: PASSPORT_FONT_BODY,
                fontWeight: 700,
                fontSize: 6,
                letterSpacing: 1,
                textTransform: "uppercase",
                color: PDF_COLORS.inkMuted,
              }}
            >
              Délivré par
            </Text>
            <Text
              style={{
                fontFamily: PASSPORT_FONT_BODY,
                fontWeight: 600,
                fontSize: 8,
                color: PDF_COLORS.ink,
                marginTop: 2,
              }}
            >
              Laboratoire d'Innovation Pédagogique Génizio
            </Text>
            <Text
              style={{
                fontFamily: PASSPORT_FONT_BODY,
                fontWeight: 500,
                fontSize: 6.5,
                color: PDF_COLORS.inkMuted,
                marginTop: 1,
              }}
            >
              Dakar · Abidjan · Yaoundé
            </Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text
              style={{
                fontFamily: PASSPORT_FONT_BODY,
                fontWeight: 700,
                fontSize: 5.5,
                letterSpacing: 0.8,
                textTransform: "uppercase",
                color: PDF_COLORS.inkMuted,
              }}
            >
              Généré par l'IA Naya
            </Text>
            <Text
              style={{
                fontFamily: PASSPORT_FONT_BODY,
                fontWeight: 600,
                fontSize: 7,
                color: PDF_COLORS.emerald,
                marginTop: 2,
              }}
            >
              Référence : {child.id.slice(0, 8).toUpperCase()}
            </Text>
          </View>
        </View>

        <PageFooter childName={child.name} pageNumber={1} totalPages={totalPages} />
      </Page>

      {/* ══ PAGE 2 : CARTE DES TALENTS ══ */}
      <Page size="A4" style={styles.page}>
        <View
          style={{
            borderBottomWidth: 2.5,
            borderBottomColor: PDF_COLORS.ink,
            paddingBottom: 8,
            marginBottom: 12,
          }}
        >
          <Text style={sectionHeading}>
            I. Cartographie des intelligences &amp; leviers d'action
          </Text>
        </View>

        <View
          style={{
            alignItems: "center",
            borderWidth: 1,
            borderColor: PDF_COLORS.dividerSoft,
            borderRadius: 10,
            paddingVertical: 6,
          }}
        >
          <Text
            style={{
              fontFamily: PASSPORT_FONT_BODY,
              fontWeight: 700,
              fontSize: 6.5,
              letterSpacing: 1,
              textTransform: "uppercase",
              color: PDF_COLORS.inkMuted,
              alignSelf: "flex-start",
              marginLeft: 12,
              marginBottom: 2,
            }}
          >
            Radar des 9 Intelligences (Howard Gardner)
          </Text>
          <TalentRadarSvg talents={child.talents} color={radarColor} />
        </View>

        {/* Forces dominantes */}
        {topTalents.length > 0 && (
          <View style={{ marginTop: 9 }}>
            <Text
              style={{
                fontFamily: PASSPORT_FONT_BODY,
                fontWeight: 700,
                fontSize: 6.5,
                letterSpacing: 1,
                textTransform: "uppercase",
                color: PDF_COLORS.inkMuted,
                borderBottomWidth: 1,
                borderBottomColor: PDF_COLORS.dividerSoft,
                paddingBottom: 3,
                marginBottom: 6,
              }}
            >
              Forces dominantes identifiées
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
              {topTalents.map(([key, val]) => {
                const label = GARDNER_TAXONOMY[key as GardnerKey]?.name ?? key;
                const lvl = talentLevel(val);
                return (
                  <View
                    key={key}
                    style={{
                      flexGrow: 1,
                      flexBasis: "23%",
                      borderWidth: 1,
                      borderColor: PDF_COLORS.dividerSoft,
                      borderRadius: 8,
                      backgroundColor: PDF_COLORS.surface,
                      paddingVertical: 4.5,
                      paddingHorizontal: 6,
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: PASSPORT_FONT_DISPLAY,
                        fontWeight: 600,
                        fontSize: 7.6,
                        color: PDF_COLORS.ink,
                      }}
                    >
                      {label}
                    </Text>
                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginTop: 2,
                      }}
                    >
                      <Text
                        style={{
                          fontFamily: PASSPORT_FONT_BODY,
                          fontWeight: 700,
                          fontSize: 5.2,
                          letterSpacing: 0.4,
                          textTransform: "uppercase",
                          color: PDF_COLORS.brand,
                        }}
                      >
                        {talentTypeLabel(child.age).replace("Carte ", "")}
                      </Text>
                      <Text
                        style={{
                          fontFamily: PASSPORT_FONT_BODY,
                          fontWeight: 700,
                          fontSize: 6.2,
                          color: PDF_COLORS.inkMuted,
                        }}
                      >
                        {lvl.label.replace("Niveau ", "N")} ({val}%)
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Moteurs comportementaux + Terrains d'excellence (côte à côte pour
            tenir dans une page A4, même avec toutes les sections remplies) */}
        {(drivers.length > 0 || topDomains.length > 0) && (
          <View style={{ flexDirection: "row", gap: 7, marginTop: 7 }}>
            {drivers.length > 0 && (
              <View
                style={{ ...cardBase, flex: 1, backgroundColor: "#fffbeb", borderColor: "#fde68a" }}
              >
                <Text
                  style={{
                    fontFamily: PASSPORT_FONT_BODY,
                    fontWeight: 700,
                    fontSize: 6.2,
                    letterSpacing: 0.8,
                    textTransform: "uppercase",
                    color: PDF_COLORS.amber,
                    marginBottom: 4,
                  }}
                >
                  Moteurs comportementaux &amp; leviers d'action (Observés)
                </Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4 }}>
                  {drivers.map((tag) => (
                    <Text
                      key={tag}
                      style={{
                        fontFamily: PASSPORT_FONT_BODY,
                        fontWeight: 600,
                        fontSize: 6.3,
                        color: PDF_COLORS.amber,
                        borderWidth: 1,
                        borderColor: "#fde68a",
                        borderRadius: 999,
                        paddingVertical: 2,
                        paddingHorizontal: 6,
                        backgroundColor: PDF_COLORS.white,
                      }}
                    >
                      {tag}
                    </Text>
                  ))}
                </View>
              </View>
            )}

            {topDomains.length > 0 && (
              <View
                style={{
                  ...cardBase,
                  flex: 1,
                  backgroundColor: PDF_COLORS.purpleSoft,
                  borderColor: "#ddd6fe",
                }}
              >
                <Text
                  style={{
                    fontFamily: PASSPORT_FONT_BODY,
                    fontWeight: 700,
                    fontSize: 6.2,
                    letterSpacing: 0.8,
                    textTransform: "uppercase",
                    color: PDF_COLORS.purple,
                    marginBottom: 4,
                  }}
                >
                  Terrains d'excellence privilégiés
                </Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4 }}>
                  {topDomains.map(([domain, count]) => (
                    <Text
                      key={domain}
                      style={{
                        fontFamily: PASSPORT_FONT_BODY,
                        fontWeight: 600,
                        fontSize: 6.6,
                        color: PDF_COLORS.ink,
                        borderWidth: 1,
                        borderColor: "#ddd6fe",
                        borderRadius: 6,
                        paddingVertical: 3,
                        paddingHorizontal: 7,
                        backgroundColor: PDF_COLORS.white,
                      }}
                    >
                      {domain} ({count} défi{count > 1 ? "s" : ""})
                    </Text>
                  ))}
                </View>
              </View>
            )}
          </View>
        )}

        {/* Voies d'orientation */}
        {affinities.length > 0 && (
          <View
            style={{
              ...cardBase,
              marginTop: 7,
              backgroundColor: PDF_COLORS.skySoft,
              borderColor: "#bae6fd",
            }}
          >
            <Text
              style={{
                fontFamily: PASSPORT_FONT_BODY,
                fontWeight: 700,
                fontSize: 6.2,
                letterSpacing: 0.8,
                textTransform: "uppercase",
                color: PDF_COLORS.skyDark,
                marginBottom: 5,
              }}
            >
              Voies d'orientation suggérées par ses talents
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", rowGap: 3, columnGap: 10 }}>
              {affinities.slice(0, 5).map((a) => (
                <View
                  key={a.key}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    flexBasis: "46%",
                    flexGrow: 1,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: PASSPORT_FONT_BODY,
                      fontWeight: 600,
                      fontSize: 6.8,
                      color: PDF_COLORS.inkSoft,
                      width: 92,
                    }}
                  >
                    {a.label}
                  </Text>
                  <View
                    style={{
                      flex: 1,
                      height: 5,
                      borderRadius: 999,
                      backgroundColor: PDF_COLORS.white,
                      borderWidth: 1,
                      borderColor: PDF_COLORS.dividerSoft,
                      overflow: "hidden",
                      marginHorizontal: 6,
                    }}
                  >
                    <View
                      style={{
                        width: `${a.pct}%`,
                        height: "100%",
                        borderRadius: 999,
                        backgroundColor: GUILD_BAR_COLORS[a.key] ?? PDF_COLORS.brand,
                      }}
                    />
                  </View>
                  <Text
                    style={{
                      fontFamily: PASSPORT_FONT_BODY,
                      fontWeight: 700,
                      fontSize: 6.8,
                      color: PDF_COLORS.skyDark,
                      width: 22,
                      textAlign: "right",
                    }}
                  >
                    {a.pct}%
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Distinctions */}
        {earnedBadges.length > 0 && (
          <View
            style={{
              ...cardBase,
              marginTop: 7,
              backgroundColor: "#fffbeb",
              borderColor: "#fde68a",
            }}
          >
            <Text
              style={{
                fontFamily: PASSPORT_FONT_BODY,
                fontWeight: 700,
                fontSize: 6.2,
                letterSpacing: 0.8,
                textTransform: "uppercase",
                color: PDF_COLORS.amber,
                marginBottom: 5,
              }}
            >
              Distinctions obtenues
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 5 }}>
              {earnedBadges.map((slug) => {
                const badge = BADGE_CATALOG[slug];
                if (!badge) return null;
                return (
                  <View
                    key={slug}
                    style={{
                      flexBasis: "47%",
                      flexGrow: 1,
                      borderWidth: 1,
                      borderColor: "#fde68a",
                      borderRadius: 8,
                      backgroundColor: PDF_COLORS.white,
                      paddingVertical: 4,
                      paddingHorizontal: 7,
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: PASSPORT_FONT_DISPLAY,
                        fontWeight: 700,
                        fontSize: 7.2,
                        color: "#92400e",
                      }}
                    >
                      {badge.title}
                    </Text>
                    <Text
                      style={{
                        fontFamily: PASSPORT_FONT_BODY,
                        fontWeight: 500,
                        fontSize: 5.6,
                        color: PDF_COLORS.inkMuted,
                        marginTop: 1,
                      }}
                    >
                      {badge.description}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        <PageFooter childName={child.name} pageNumber={2} totalPages={totalPages} />
      </Page>

      {/* ══ PAGE 3 : SYNTHÈSE NAYA ══ */}
      {hasSynthesis && (
        <Page size="A4" style={styles.page}>
          <View
            style={{
              borderBottomWidth: 2.5,
              borderBottomColor: PDF_COLORS.ink,
              paddingBottom: 8,
              marginBottom: 12,
            }}
          >
            <Text style={sectionHeading}>II. Synthèse pédagogique du Co-pilote Naya</Text>
          </View>

          <View
            style={{
              borderWidth: 1.5,
              borderColor: "#fbd7ae",
              borderRadius: 10,
              backgroundColor: "#fdf3ea",
              padding: 14,
            }}
          >
            <Text
              style={{
                fontFamily: PASSPORT_FONT_BODY,
                fontWeight: 700,
                fontSize: 6,
                letterSpacing: 1.4,
                textTransform: "uppercase",
                color: PDF_COLORS.brand,
                marginBottom: 8,
              }}
            >
              Rapport de bilan personnalisé
            </Text>
            <MdContent
              md={synthesis}
              baseStyle={{
                fontFamily: PASSPORT_FONT_BODY,
                fontSize: 8,
                lineHeight: 1.55,
                color: PDF_COLORS.ink,
                fontWeight: 500,
              }}
            />
          </View>

          {letter && (
            <View
              style={{
                borderWidth: 1.5,
                borderColor: "#a7f3d0",
                borderRadius: 10,
                backgroundColor: PDF_COLORS.emeraldSoft,
                padding: 14,
                marginTop: 12,
              }}
            >
              <Text
                style={{
                  fontFamily: PASSPORT_FONT_BODY,
                  fontWeight: 700,
                  fontSize: 6,
                  letterSpacing: 1.4,
                  textTransform: "uppercase",
                  color: PDF_COLORS.emerald,
                  marginBottom: 8,
                }}
              >
                Mot de Naya sur son avenir
              </Text>
              <MdContent
                md={letter}
                baseStyle={{
                  fontFamily: PASSPORT_FONT_BODY,
                  fontSize: 8,
                  lineHeight: 1.55,
                  color: PDF_COLORS.ink,
                  fontWeight: 500,
                }}
              />
            </View>
          )}

          <PageFooter childName={child.name} pageNumber={3} totalPages={totalPages} />
        </Page>
      )}

      {/* ══ PAGE OPTIONNELLE : COMPÉTENCES & PROJETS COLLECTIFS ══ */}
      {hasLongitudinal && (
        <Page size="A4" style={styles.page}>
          <View
            style={{
              borderBottomWidth: 2.5,
              borderBottomColor: PDF_COLORS.ink,
              paddingBottom: 8,
              marginBottom: 16,
            }}
          >
            <Text
              style={{
                fontFamily: PASSPORT_FONT_DISPLAY,
                fontSize: 10,
                color: PDF_COLORS.inkMuted,
                fontWeight: 600,
                marginBottom: 3,
                textTransform: "uppercase",
                letterSpacing: 0.5,
              }}
            >
              Chapitre Spécial
            </Text>
            <Text style={{ ...sectionHeading, fontSize: 18, color: PDF_COLORS.ink }}>
              Projets Collectifs & Coopération
            </Text>
          </View>

          <View style={{ marginBottom: 12 }}>
            <Text
              style={{
                fontFamily: PASSPORT_FONT_BODY,
                fontSize: 8.5,
                lineHeight: 1.5,
                color: PDF_COLORS.ink,
              }}
            >
              Génizio documente la trajectoire collaborative de l'enfant à travers des projets réels
              (Fab Labs, Marathons). Ce registre compile les rôles endossés et les constats factuels
              des superviseurs (micro-observables), formant un dossier de preuves de la capacité
              d'action en groupe.
            </Text>
          </View>

          <View style={{ flexDirection: "row", gap: 12, marginBottom: 16 }}>
            <View style={{ ...cardBase, flex: 1, backgroundColor: "#fdf3ea" }}>
              <Text
                style={{
                  fontFamily: PASSPORT_FONT_DISPLAY,
                  fontWeight: 700,
                  fontSize: 10,
                  color: PDF_COLORS.ink,
                  marginBottom: 4,
                }}
              >
                Compétences Démontrées
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4 }}>
                {Object.entries(longitudinalGraph.behavioralSummary.tagsFrequency)
                  .sort((a, b) => (b[1] as any).count - (a[1] as any).count)
                  .map(([tag, data]) => (
                    <Text
                      key={tag}
                      style={{
                        fontFamily: PASSPORT_FONT_BODY,
                        fontSize: 7.5,
                        fontWeight: 600,
                        backgroundColor: PDF_COLORS.white,
                        borderWidth: 1,
                        borderColor:
                          (data as any).impact === "positive"
                            ? PDF_COLORS.emerald
                            : PDF_COLORS.dividerSoft,
                        color:
                          (data as any).impact === "positive"
                            ? PDF_COLORS.emerald
                            : PDF_COLORS.inkMuted,
                        paddingHorizontal: 6,
                        paddingVertical: 3,
                        borderRadius: 12,
                      }}
                    >
                      {tag} ({(data as any).count})
                    </Text>
                  ))}
              </View>
            </View>
            <View style={{ ...cardBase, flex: 1, backgroundColor: "#f0f9ff" }}>
              <Text
                style={{
                  fontFamily: PASSPORT_FONT_DISPLAY,
                  fontWeight: 700,
                  fontSize: 10,
                  color: PDF_COLORS.ink,
                  marginBottom: 4,
                }}
              >
                Rôles & Plasticité
              </Text>
              <Text
                style={{
                  fontFamily: PASSPORT_FONT_BODY,
                  fontSize: 7.5,
                  color: PDF_COLORS.inkMuted,
                  marginBottom: 6,
                }}
              >
                Indice d'adaptabilité :{" "}
                {Math.round(longitudinalGraph.roleSummary.plasticityScore * 100)}%
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4 }}>
                {Object.entries(longitudinalGraph.roleSummary.rolesFrequency).map(
                  ([role, count]) => (
                    <Text
                      key={role}
                      style={{
                        fontFamily: PASSPORT_FONT_BODY,
                        fontSize: 7.5,
                        fontWeight: 600,
                        backgroundColor: PDF_COLORS.white,
                        borderWidth: 1,
                        borderColor: PDF_COLORS.brand,
                        color: PDF_COLORS.brand,
                        paddingHorizontal: 6,
                        paddingVertical: 3,
                        borderRadius: 12,
                        textTransform: "capitalize",
                      }}
                    >
                      {role} ({count as number})
                    </Text>
                  ),
                )}
              </View>
            </View>
          </View>

          {longitudinalGraph.triangulatedCompetencies &&
            longitudinalGraph.triangulatedCompetencies.length > 0 && (
              <View
                style={{
                  ...cardBase,
                  backgroundColor: "#ecfdf5",
                  marginBottom: 16,
                  borderColor: PDF_COLORS.emerald,
                  borderWidth: 1,
                }}
              >
                <Text
                  style={{
                    fontFamily: PASSPORT_FONT_DISPLAY,
                    fontWeight: 700,
                    fontSize: 10,
                    color: PDF_COLORS.emerald,
                    marginBottom: 4,
                  }}
                >
                  Compétences Triangulées (Multi-Contextes)
                </Text>
                <Text
                  style={{
                    fontFamily: PASSPORT_FONT_BODY,
                    fontSize: 8.5,
                    lineHeight: 1.5,
                    color: PDF_COLORS.ink,
                    marginBottom: 8,
                  }}
                >
                  Capacités démontrées avec succès dans plusieurs contextes (individuel, équipe,
                  tutorat, etc.)
                </Text>
                <View style={{ flexDirection: "column", gap: 6 }}>
                  {longitudinalGraph.triangulatedCompetencies.map((hyp: any) => {
                    const uniqueContexts = Array.from(
                      new Set(
                        hyp.evidence.filter((e: any) => e.success).map((e: any) => e.context),
                      ),
                    );
                    return (
                      <View
                        key={hyp.id}
                        style={{
                          flexDirection: "row",
                          justifyContent: "space-between",
                          alignItems: "center",
                          borderTopWidth: 1,
                          borderTopColor: "#d1fae5",
                          paddingTop: 4,
                        }}
                      >
                        <View>
                          <Text
                            style={{
                              fontFamily: PASSPORT_FONT_BODY,
                              fontWeight: 700,
                              fontSize: 9,
                              color: PDF_COLORS.ink,
                              textTransform: "capitalize",
                            }}
                          >
                            {hyp.competenceKey.replace(/_/g, " ")}
                          </Text>
                          <Text
                            style={{
                              fontFamily: PASSPORT_FONT_BODY,
                              fontSize: 8,
                              color: PDF_COLORS.inkMuted,
                            }}
                          >
                            Solidité : {Math.round(hyp.confidence * 100)}% • Confirmée dans{" "}
                            {uniqueContexts.length}/4 contextes
                          </Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}

          <Text
            style={{
              ...sectionHeading,
              fontSize: 12,
              color: PDF_COLORS.ink,
              marginBottom: 8,
              marginTop: 4,
            }}
          >
            Registre des Expériences Vécues
          </Text>

          {longitudinalGraph.experiences.slice(0, 4).map((exp: any) => (
            <View
              key={exp.id}
              style={{ ...cardBase, marginBottom: 8, flexDirection: "row", gap: 10 }}
            >
              <View style={{ flex: 1 }}>
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    marginBottom: 3,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: PASSPORT_FONT_DISPLAY,
                      fontWeight: 700,
                      fontSize: 9.5,
                      color: PDF_COLORS.ink,
                    }}
                  >
                    {exp.title}
                  </Text>
                  <Text
                    style={{
                      fontFamily: PASSPORT_FONT_BODY,
                      fontSize: 7,
                      color: PDF_COLORS.inkMuted,
                    }}
                  >
                    {new Date(exp.occurredAt).toLocaleDateString("fr-FR", {
                      year: "numeric",
                      month: "long",
                    })}
                  </Text>
                </View>
                <Text
                  style={{
                    fontFamily: PASSPORT_FONT_BODY,
                    fontSize: 7.5,
                    color: PDF_COLORS.ink,
                    marginBottom: 4,
                  }}
                >
                  <Text style={{ color: PDF_COLORS.inkMuted }}>Rôle assumé : </Text>
                  <Text style={{ fontWeight: 700, textTransform: "capitalize" }}>{exp.role}</Text>
                  {exp.implication !== "non_specifie" && (
                    <Text style={{ color: PDF_COLORS.brand }}>
                      {" "}
                      ({exp.implication.replace("_", " ")})
                    </Text>
                  )}
                </Text>
                {exp.supervisorTags.length > 0 && (
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4 }}>
                    {exp.supervisorTags.map((t: any, i: number) => (
                      <Text
                        key={i}
                        style={{
                          fontFamily: PASSPORT_FONT_BODY,
                          fontSize: 6.5,
                          fontWeight: 600,
                          backgroundColor: "#f3f4f6",
                          color: "#374151",
                          paddingHorizontal: 4,
                          paddingVertical: 2,
                          borderRadius: 4,
                        }}
                      >
                        {t.tag}
                      </Text>
                    ))}
                  </View>
                )}
              </View>
            </View>
          ))}

          <PageFooter childName={child.name} pageNumber={startPage} totalPages={totalPages} />
        </Page>
      )}

      {/* ══ PAGES 4/5+ : RÉALISATIONS & ÉPREUVES ══ */}
      {challengePages.map((chunk, chunkIdx) => {
        const roman = hasSynthesis ? "III" : "II";
        const from = chunkIdx * 2 + 1;
        const to = Math.min(challenges.length, chunkIdx * 2 + 2);
        return (
          <Page key={chunkIdx} size="A4" style={styles.page}>
            <View
              style={{
                borderBottomWidth: 2.5,
                borderBottomColor: PDF_COLORS.ink,
                paddingBottom: 8,
                marginBottom: 12,
              }}
            >
              <Text style={sectionHeading}>
                {roman}. Réalisations Pratiques &amp; Épreuves ({from} - {to})
              </Text>
            </View>

            {chunk.map((c) => {
              // Preuves privées : les data-URL pré-résolues font foi ; le fallback ne
              // vaut que pour les anciennes URLs publiques (un path stocké n'est pas
              // fetchable par le moteur PDF).
              const imgSrc =
                data.proofImages[c.id] ??
                (c.proof_image_url?.startsWith("http") ? c.proof_image_url : null) ??
                null;
              return (
                <View
                  key={c.id}
                  style={{ ...cardBase, marginBottom: 10, backgroundColor: PDF_COLORS.white }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          fontFamily: PASSPORT_FONT_BODY,
                          fontWeight: 700,
                          fontSize: 5.5,
                          letterSpacing: 1,
                          textTransform: "uppercase",
                          color: PDF_COLORS.brand,
                          borderWidth: 1,
                          borderColor: "#fbd7ae",
                          borderRadius: 999,
                          paddingVertical: 2,
                          paddingHorizontal: 7,
                          alignSelf: "flex-start",
                          backgroundColor: "#fdf3ea",
                        }}
                      >
                        {c.domain}
                      </Text>
                      <Text
                        style={{
                          fontFamily: PASSPORT_FONT_DISPLAY,
                          fontWeight: 600,
                          fontSize: 10.5,
                          color: PDF_COLORS.ink,
                          marginTop: 5,
                        }}
                      >
                        {c.title}
                      </Text>
                    </View>
                    {formatDate(c.completed_at) && (
                      <Text
                        style={{
                          fontFamily: PASSPORT_FONT_BODY,
                          fontWeight: 600,
                          fontSize: 6.2,
                          letterSpacing: 0.4,
                          textTransform: "uppercase",
                          color: PDF_COLORS.inkMuted,
                          marginLeft: 8,
                        }}
                      >
                        Validé le {formatDate(c.completed_at)}
                      </Text>
                    )}
                  </View>

                  {c.description && (
                    <View style={{ marginTop: 7 }}>
                      <Text
                        style={{
                          fontFamily: PASSPORT_FONT_BODY,
                          fontWeight: 700,
                          fontSize: 5.8,
                          letterSpacing: 0.8,
                          textTransform: "uppercase",
                          color: PDF_COLORS.inkMuted,
                          marginBottom: 2,
                        }}
                      >
                        Description de la mission
                      </Text>
                      <MdContent
                        md={c.description}
                        baseStyle={{
                          fontFamily: PASSPORT_FONT_BODY,
                          fontSize: 7.4,
                          lineHeight: 1.5,
                          color: PDF_COLORS.inkSoft,
                          fontWeight: 500,
                        }}
                      />
                    </View>
                  )}

                  {imgSrc && (
                    <View
                      style={{
                        borderWidth: 1,
                        borderColor: PDF_COLORS.dividerSoft,
                        borderRadius: 6,
                        marginTop: 7,
                        backgroundColor: PDF_COLORS.surface,
                        padding: 4,
                        alignItems: "center",
                      }}
                    >
                      <Image
                        src={imgSrc}
                        style={{ maxWidth: "100%", maxHeight: 130, objectFit: "contain" }}
                      />
                    </View>
                  )}

                  <View style={{ flexDirection: "row", gap: 8, marginTop: 7 }}>
                    {c.ai_observations && (
                      <View
                        style={{
                          flex: 1,
                          borderWidth: 1,
                          borderColor: "#a7f3d0",
                          borderRadius: 8,
                          backgroundColor: PDF_COLORS.emeraldSoft,
                          paddingVertical: 6,
                          paddingHorizontal: 8,
                        }}
                      >
                        <Text
                          style={{
                            fontFamily: PASSPORT_FONT_BODY,
                            fontWeight: 700,
                            fontSize: 5.6,
                            letterSpacing: 0.6,
                            textTransform: "uppercase",
                            color: PDF_COLORS.emerald,
                            marginBottom: 2,
                          }}
                        >
                          Observation pédagogique
                        </Text>
                        <Text
                          style={{
                            fontFamily: PASSPORT_FONT_BODY,
                            fontStyle: "italic",
                            fontSize: 7,
                            color: PDF_COLORS.ink,
                          }}
                        >
                          {c.ai_observations}
                        </Text>
                      </View>
                    )}
                    {c.notes && (
                      <View
                        style={{
                          flex: 1,
                          borderWidth: 1,
                          borderColor: "#bae6fd",
                          borderRadius: 8,
                          backgroundColor: PDF_COLORS.skySoft,
                          paddingVertical: 6,
                          paddingHorizontal: 8,
                        }}
                      >
                        <Text
                          style={{
                            fontFamily: PASSPORT_FONT_BODY,
                            fontWeight: 700,
                            fontSize: 5.6,
                            letterSpacing: 0.6,
                            textTransform: "uppercase",
                            color: PDF_COLORS.skyDark,
                            marginBottom: 2,
                          }}
                        >
                          Note de réalisation
                        </Text>
                        <Text
                          style={{
                            fontFamily: PASSPORT_FONT_BODY,
                            fontWeight: 500,
                            fontSize: 7,
                            color: PDF_COLORS.ink,
                          }}
                        >
                          {c.notes}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              );
            })}

            <PageFooter
              childName={child.name}
              pageNumber={challengeStartPage + chunkIdx}
              totalPages={totalPages}
            />
          </Page>
        );
      })}
    </Document>
  );
}
