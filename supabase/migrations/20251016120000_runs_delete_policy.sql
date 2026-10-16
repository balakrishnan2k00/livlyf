create policy "runs_delete_own" on public.ai_runs
  for delete
  using (auth.uid() = user_id);
