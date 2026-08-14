import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getFamilySubscriptionStatus } from "@/lib/subscriptions.functions";

export type FamilyCoverageInfo = {
  /** La famille est couverte (abonnement actif/past_due ou crédit de parrainage valide). */
  covered: boolean;
  /** Couverture CAMPAGNE (2026-08-14) : un enfant du compte est inscrit à une campagne
   *  active → l'institution soutient la famille, la création de profils n'exige pas
   *  d'abonnement (miroir du trigger check_child_profile_quota, migration 20260814160000). */
  campaignCovered: boolean;
  /** Date maximale de couverture effective, si couverte. */
  coveredUntil: string | null;
  /** Limite de CRÉATION de profils (V4, Vague A) : calculée côté serveur depuis
   *  family_coverages (computeAppQuota — miroir du trigger V10, migration 20260814200000).
   *  L'UI affiche la jauge X/N avec cette valeur. */
  creationLimit: number;
  loading: boolean;
  refresh: () => Promise<void>;
};

// Couverture FAMILLE côté client — miroir de getFamilyCoverage (child-access.ts) : un
// abonnement 'active' ou 'past_due' couvre jusqu'à la fin de période payée, un crédit de
// parrainage jusqu'à ends_at, le tout prend la valeur la plus tardive. Utilisé par les
// écrans de quota (profiles.index / profiles.manage / ProfileDialog) pour permettre la
// création de profils jusqu'au plafond de 5 dès que la famille est couverte (même logique
// que le trigger check_child_profile_quota, migration 20260809120000).
export function useFamilyCoverage(): FamilyCoverageInfo {
  const getStatusFn = useServerFn(getFamilySubscriptionStatus);
  const [covered, setCovered] = useState(false);
  const [campaignCovered, setCampaignCovered] = useState(false);
  const [coveredUntil, setCoveredUntil] = useState<string | null>(null);
  const [creationLimit, setCreationLimit] = useState(5);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await getStatusFn();
      const now = Date.now();
      const subCovers =
        (res.status === "active" || res.status === "past_due") &&
        !!res.currentPeriodEnd &&
        new Date(res.currentPeriodEnd).getTime() > now;
      const creditCovers = !!res.sponsoredUntil && new Date(res.sponsoredUntil).getTime() > now;

      const endTimes = [
        subCovers ? new Date(res.currentPeriodEnd as string).getTime() : null,
        creditCovers ? new Date(res.sponsoredUntil as string).getTime() : null,
      ].filter((t): t is number => t !== null);

      setCovered(endTimes.length > 0);
      setCampaignCovered(!!res.campaignCovered);
      setCoveredUntil(endTimes.length > 0 ? new Date(Math.max(...endTimes)).toISOString() : null);
      setCreationLimit(res.creationLimit);
    } catch {
      // Tables d'abonnement absentes (migration pas encore appliquée) ou session absente :
      // défaut = non couverte, le comportement legacy prévaut.
      setCovered(false);
      setCampaignCovered(false);
      setCoveredUntil(null);
      setCreationLimit(5);
    } finally {
      setLoading(false);
    }
  }, [getStatusFn]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { covered, campaignCovered, coveredUntil, creationLimit, loading, refresh };
}
