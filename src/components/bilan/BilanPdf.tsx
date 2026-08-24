// Mentor Copilote (décision #74) — PDF du « Bilan du mentor ».
//
// Export officiel du bilan de fin validé par le parent (@react-pdf/renderer, même
// infra que le Passeport : polices Fredoka/Inter de la marque, hex OKLCH → sRGB).
// Texte réel vectoriel A4, pas un scan navigateur — même rendu mobile/desktop.

import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import {
  PASSPORT_FONT_DISPLAY,
  PASSPORT_FONT_BODY,
  registerPassportFonts,
  PDF_COLORS,
} from "@/lib/passport-pdf";

registerPassportFonts();

const styles = StyleSheet.create({
  page: {
    padding: "1.4cm",
    fontFamily: PASSPORT_FONT_BODY,
    fontSize: 11,
    color: PDF_COLORS.ink,
  },
  header: {
    borderBottomWidth: 2,
    borderBottomColor: PDF_COLORS.brand,
    paddingBottom: 10,
    marginBottom: 16,
  },
  title: {
    fontFamily: PASSPORT_FONT_DISPLAY,
    fontSize: 20,
    fontWeight: 700,
    color: PDF_COLORS.brandDark,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 10,
    color: PDF_COLORS.inkMuted,
    marginBottom: 2,
  },
  sectionTitle: {
    fontFamily: PASSPORT_FONT_DISPLAY,
    fontSize: 13,
    fontWeight: 700,
    color: PDF_COLORS.ink,
    marginTop: 14,
    marginBottom: 4,
  },
  body: {
    fontSize: 11,
    lineHeight: 1.55,
    color: PDF_COLORS.inkSoft,
  },
  footer: {
    position: "absolute",
    bottom: 24,
    left: "1.4cm",
    right: "1.4cm",
    fontSize: 8,
    color: PDF_COLORS.inkMuted,
    borderTopWidth: 1,
    borderTopColor: PDF_COLORS.inkSoft,
    paddingTop: 6,
    textAlign: "center",
  },
});

export function BilanPdf({
  data,
}: {
  data: {
    childName: string;
    childAge: number;
    periodStart: string;
    periodEnd: string;
    mentorEmail: string;
    realisations: string;
    competencesObservees: string;
    recommandations: string;
  };
}) {
  const sections: Array<[string, string]> = [
    ["Réalisations de la période", data.realisations],
    ["Compétences observées", data.competencesObservees],
    ["Recommandations pour la suite", data.recommandations],
  ];

  return (
    <Document
      title={`Bilan de fin — ${data.childName}`}
      author="Génizio"
      subject="Bilan de fin du mentor"
    >
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>Bilan de fin — {data.childName}</Text>
          <Text style={styles.subtitle}>
            {data.childAge} ans · Période du{" "}
            {new Date(data.periodStart).toLocaleDateString("fr-FR")} au{" "}
            {new Date(data.periodEnd).toLocaleDateString("fr-FR")}
          </Text>
          <Text style={styles.subtitle}>Mentor : {data.mentorEmail} · Validé par le parent</Text>
        </View>

        {sections.map(([label, content]) =>
          content ? (
            <View key={label} wrap={false}>
              <Text style={styles.sectionTitle}>{label}</Text>
              <Text style={styles.body}>{content}</Text>
            </View>
          ) : null,
        )}

        <Text style={styles.footer}>
          Génizio — le laboratoire de découverte des talents · Révélé par le mentor, validé par la
          famille.
        </Text>
      </Page>
    </Document>
  );
}
