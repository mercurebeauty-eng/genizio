ALTER TABLE public.challenges
ADD COLUMN requires_supervision BOOLEAN DEFAULT false,
ADD COLUMN supervision_warning TEXT;
