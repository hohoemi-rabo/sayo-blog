-- Harden reactions table: remove direct INSERT/UPDATE access
-- Force all mutations through RPC functions (increment/decrement_reaction_count)

DROP POLICY IF EXISTS "reactions_insert" ON reactions;
DROP POLICY IF EXISTS "reactions_update" ON reactions;

-- Keep reactions_select (read counts is safe)
-- Add authenticated-only full access for admin
CREATE POLICY "Authenticated users can manage reactions" ON reactions
  FOR ALL USING ((select auth.role()) = 'authenticated')
  WITH CHECK ((select auth.role()) = 'authenticated');
