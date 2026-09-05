import { describe, it, expect } from "vitest";
import {
  computeSupportMentorMonthlyPayout,
  detectMentorEvaluationFraud,
  evaluateSquadProgression,
  computeMentorImpactIndex,
  evaluateMentorSafeguardDecision,
  SATURDAY_CLUB_SPLIT,
  SATURDAY_CLUB_CHILD_PRICE_XOF,
  type PhysicalArtifactSubmission,
  type ChildTripartiteEvaluation,
} from "./mentor-safeguards";

describe("mentor-safeguards — Modèle Économique Club Périscolaire", () => {
  it("calcule la répartition 70% mentor / 30% Génizio / 0% École pour une escouade de 8 enfants", () => {
    const payout = computeSupportMentorMonthlyPayout({
      enrolledChildrenCount: 8,
      standing: "good_standing",
    });

    expect(payout.grossTotalXof).toBe(80000); // 8 * 10 000 FCFA
    expect(payout.mentorPayoutXof).toBe(56000); // 70 %
    expect(payout.genizioMarginXof).toBe(24000); // 30 %
    expect(payout.schoolPayoutXof).toBe(0); // 0 % (pas de rétrocession directe)
    expect(payout.payoutStatus).toBe("payable");
  });

  it("gèle le payout d'un mentor en suspension ou en probation", () => {
    const suspended = computeSupportMentorMonthlyPayout({
      enrolledChildrenCount: 8,
      standing: "frozen_suspended",
    });
    expect(suspended.mentorPayoutXof).toBe(0);
    expect(suspended.payoutStatus).toBe("frozen_under_audit");

    const banned = computeSupportMentorMonthlyPayout({
      enrolledChildrenCount: 8,
      standing: "banned",
    });
    expect(banned.mentorPayoutXof).toBe(0);
    expect(banned.payoutStatus).toBe("revoked");
  });
});

describe("mentor-safeguards — Détection Anti-Fraude", () => {
  it("identifie des photos dupliquées (même fingerprint) soumises pour différents défis", () => {
    const submissions: PhysicalArtifactSubmission[] = [
      {
        challengeId: "c1",
        childId: "child-1",
        photoUrl: "https://example.com/p1.jpg",
        imageFingerprint: "duplicate-hash-12345",
        nayaVisionConfidence: 0.9,
        isMaterialArtifactDetected: true,
        submissionTimestamp: "2026-09-01T10:00:00Z",
      },
      {
        challengeId: "c2",
        childId: "child-2",
        photoUrl: "https://example.com/p2.jpg",
        imageFingerprint: "duplicate-hash-12345", // DUPLICATE
        nayaVisionConfidence: 0.9,
        isMaterialArtifactDetected: true,
        submissionTimestamp: "2026-09-01T10:05:00Z",
      },
      {
        challengeId: "c3",
        childId: "child-3",
        photoUrl: "https://example.com/p3.jpg",
        imageFingerprint: "duplicate-hash-12345", // DUPLICATE
        nayaVisionConfidence: 0.9,
        isMaterialArtifactDetected: true,
        submissionTimestamp: "2026-09-01T10:10:00Z",
      },
    ];

    const report = detectMentorEvaluationFraud(submissions);
    expect(report.isFraudDetected).toBe(true);
    expect(report.duplicatePhotoCount).toBe(2);
    expect(report.reasons.length).toBeGreaterThan(0);
  });

  it("identifie un taux anormal de défis sans artefact physique tangible", () => {
    const submissions: PhysicalArtifactSubmission[] = Array.from({ length: 8 }, (_, i) => ({
      challengeId: `c-${i}`,
      childId: `child-${i}`,
      photoUrl: `https://example.com/p${i}.jpg`,
      imageFingerprint: `unique-hash-${i}`,
      nayaVisionConfidence: 0.2,
      isMaterialArtifactDetected: false, // Pas d'artefact détecté
      submissionTimestamp: "2026-09-01T10:00:00Z",
    }));

    const report = detectMentorEvaluationFraud(submissions);
    expect(report.isFraudDetected).toBe(true);
    expect(report.zeroArtifactCompletionRate).toBe(100);
  });
});

describe("mentor-safeguards — Détection de Régression d'Escouade", () => {
  it("détecte une régression critique si ≥ 50 % des enfants chutent en notes et autonomie", () => {
    const evaluations: ChildTripartiteEvaluation[] = [
      {
        childId: "child-1",
        academicObservation: {
          childId: "child-1",
          term: 2,
          previousAverage: 12.0,
          currentAverage: 9.5, // -2.5 pts
        },
        autonomyProbes: [
          {
            childId: "child-1",
            periodTimestamp: "2026-01-10T10:00:00Z",
            doorExplorationAutonomyIndex: 75,
            perseveranceUnderFrictionIndex: 80,
            frictionRecoverySuccess: true,
          },
          {
            childId: "child-1",
            periodTimestamp: "2026-03-10T10:00:00Z",
            doorExplorationAutonomyIndex: 45, // -30 pts
            perseveranceUnderFrictionIndex: 40,
            frictionRecoverySuccess: false,
          },
        ],
        artifactSubmissions: [],
      },
      {
        childId: "child-2",
        academicObservation: {
          childId: "child-2",
          term: 2,
          previousAverage: 14.0,
          currentAverage: 11.0, // -3.0 pts
        },
        autonomyProbes: [],
        artifactSubmissions: [],
      },
      {
        childId: "child-3",
        academicObservation: {
          childId: "child-3",
          term: 2,
          previousAverage: 10.0,
          currentAverage: 8.0, // -2.0 pts
        },
        autonomyProbes: [],
        artifactSubmissions: [],
      },
      {
        childId: "child-4",
        academicObservation: {
          childId: "child-4",
          term: 2,
          previousAverage: 13.0,
          currentAverage: 13.5, // +0.5 pts (progrès)
        },
        autonomyProbes: [],
        artifactSubmissions: [],
      },
    ];

    const report = evaluateSquadProgression(evaluations);
    expect(report.isCriticalRegression).toBe(true);
    expect(report.regressingChildrenCount).toBe(3); // 3 sur 4 = 75 %
    expect(report.totalSquadChildren).toBe(4);
  });
});

describe("mentor-safeguards — Décision d'Arbitrage et Protocole de Sanction", () => {
  it("déclenche la suspension et la réassignation de l'escouade en cas de fraude", () => {
    const decision = evaluateMentorSafeguardDecision({
      mentorUserId: "mentor-fraud-1",
      mentorCategory: "support",
      currentStanding: "good_standing",
      evaluations: [
        {
          childId: "child-1",
          artifactSubmissions: [
            {
              challengeId: "c1",
              childId: "child-1",
              photoUrl: "https://example.com/p1.jpg",
              imageFingerprint: "fake-same-hash",
              nayaVisionConfidence: 0.9,
              isMaterialArtifactDetected: true,
              submissionTimestamp: "2026-09-01T10:00:00Z",
            },
            {
              challengeId: "c2",
              childId: "child-1",
              photoUrl: "https://example.com/p2.jpg",
              imageFingerprint: "fake-same-hash",
              nayaVisionConfidence: 0.9,
              isMaterialArtifactDetected: true,
              submissionTimestamp: "2026-09-01T10:05:00Z",
            },
            {
              challengeId: "c3",
              childId: "child-1",
              photoUrl: "https://example.com/p3.jpg",
              imageFingerprint: "fake-same-hash",
              nayaVisionConfidence: 0.9,
              isMaterialArtifactDetected: true,
              submissionTimestamp: "2026-09-01T10:10:00Z",
            },
          ],
          autonomyProbes: [],
        },
      ],
    });

    expect(decision.standing).toBe("frozen_suspended");
    expect(decision.payoutStatus).toBe("frozen_under_audit");
    expect(decision.autoReassignSquad).toBe(true);
    expect(decision.fraudReport.isFraudDetected).toBe(true);
  });

  it("déclenche un avertissement (warning) au 1er trimestre de régression puis révocation au 2nd", () => {
    // 1er cycle de régression
    const cycle1 = evaluateMentorSafeguardDecision({
      mentorUserId: "mentor-regress-1",
      mentorCategory: "support",
      currentStanding: "good_standing",
      historicalCriticalRegressionCycles: 0,
      evaluations: [
        {
          childId: "c1",
          academicObservation: { childId: "c1", term: 1, previousAverage: 12, currentAverage: 9 },
          artifactSubmissions: [],
          autonomyProbes: [],
        },
        {
          childId: "c2",
          academicObservation: { childId: "c2", term: 1, previousAverage: 13, currentAverage: 10 },
          artifactSubmissions: [],
          autonomyProbes: [],
        },
        {
          childId: "c3",
          academicObservation: { childId: "c3", term: 1, previousAverage: 11, currentAverage: 8 },
          artifactSubmissions: [],
          autonomyProbes: [],
        },
        {
          childId: "c4",
          academicObservation: { childId: "c4", term: 1, previousAverage: 10, currentAverage: 10 },
          artifactSubmissions: [],
          autonomyProbes: [],
        },
      ],
    });

    expect(cycle1.standing).toBe("warning");
    expect(cycle1.payoutStatus).toBe("payable");
    expect(cycle1.autoReassignSquad).toBe(false);

    // 2nd cycle consécutif de régression
    const cycle2 = evaluateMentorSafeguardDecision({
      mentorUserId: "mentor-regress-1",
      mentorCategory: "support",
      currentStanding: "warning",
      historicalCriticalRegressionCycles: 1, // Déjà 1 cycle
      evaluations: cycle1.regressionReport.isCriticalRegression
        ? [
            {
              childId: "c1",
              academicObservation: { childId: "c1", term: 2, previousAverage: 9, currentAverage: 7 },
              artifactSubmissions: [],
              autonomyProbes: [],
            },
            {
              childId: "c2",
              academicObservation: { childId: "c2", term: 2, previousAverage: 10, currentAverage: 8 },
              artifactSubmissions: [],
              autonomyProbes: [],
            },
            {
              childId: "c3",
              academicObservation: { childId: "c3", term: 2, previousAverage: 8, currentAverage: 6 },
              artifactSubmissions: [],
              autonomyProbes: [],
            },
            {
              childId: "c4",
              academicObservation: { childId: "c4", term: 2, previousAverage: 10, currentAverage: 9 },
              artifactSubmissions: [],
              autonomyProbes: [],
            },
          ]
        : [],
    });

    expect(cycle2.standing).toBe("frozen_suspended");
    expect(cycle2.payoutStatus).toBe("frozen_under_audit");
    expect(cycle2.autoReassignSquad).toBe(true);
  });
});
