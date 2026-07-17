-- Visible difficulty rating for each challenge (🟢 facile / 🟡 moyen / 🔴 difficile),
-- assigned by Naya at generation time based on time required, autonomy required,
-- cognitive complexity, quantity of materials, and creativity/analysis demanded.
-- Nullable: legacy challenges generated before this column existed simply show
-- no badge rather than a fabricated guess.

ALTER TABLE public.challenges
ADD COLUMN difficulty text CHECK (difficulty IN ('facile', 'moyen', 'difficile'));
