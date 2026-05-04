CREATE POLICY "bazar_insert_own" ON public.bazar FOR INSERT TO authenticated WITH CHECK (buyer_id = auth.uid());
CREATE POLICY "bazar_update_own" ON public.bazar FOR UPDATE TO authenticated USING (buyer_id = auth.uid());
CREATE POLICY "bazar_delete_own" ON public.bazar FOR DELETE TO authenticated USING (buyer_id = auth.uid());