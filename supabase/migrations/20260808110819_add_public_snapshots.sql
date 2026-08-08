-- Stöd för öppna referensprofiler (t.ex. framtida kändisprofiler) som vem
-- som helst inloggad kan jämföra sig mot, utan att behöva en accepterad
-- vänskap. Opt-in per användare/rad – ingen är publik som standard.

ALTER TABLE public.player_snapshots ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT false;

CREATE POLICY "Public snapshots are viewable by anyone signed in" ON public.player_snapshots
  FOR SELECT TO authenticated
  USING (is_public = true);

CREATE INDEX player_snapshots_public_idx ON public.player_snapshots (is_public) WHERE is_public = true;
