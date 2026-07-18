-- pdf_unlocked (Passeport d'Excellence access flag) was stored inside the
-- child_profiles.talents JSONB alongside the 9 Gardner talent scores. Since
-- talents is typed/consumed everywhere as Record<string, number>, this
-- boolean got silently coerced to a number wherever it was summed or
-- counted: the portfolio page's "Talents cartographiés" counter
-- (`Object.values(child.talents).filter(v => v > 0).length`) counted
-- pdf_unlocked as a 10th talent once unlocked (true > 0 is true), and
-- getEcosystemStats' talentTotals aggregation added a bogus "pdf_unlocked"
-- key to the guild-distribution totals. Moving it to its own column fixes
-- both by construction — talents can no longer contain anything but scores.

ALTER TABLE public.child_profiles
ADD COLUMN pdf_unlocked boolean NOT NULL DEFAULT false;

UPDATE public.child_profiles
SET pdf_unlocked = true
WHERE (talents ->> 'pdf_unlocked') = 'true';

UPDATE public.child_profiles
SET talents = talents - 'pdf_unlocked'
WHERE talents ? 'pdf_unlocked';
