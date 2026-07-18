-- Remove the legacy overloaded completion RPC.
--
-- The previous four-argument function has defaults for its invoice arguments,
-- so a PostgREST call containing only p_spk_id matches both this legacy
-- overload and the current one-argument complete_spk_workflow(uuid) function.
-- Keeping only the one-argument completion RPC removes the ambiguity and
-- preserves the separated invoice flow through submit_spk_invoice(...).

begin;

-- Legacy behavior combined invoice submission and completion. Invoice
-- submission is now handled separately by submit_spk_invoice(...).
drop function if exists public.complete_spk_workflow(uuid, text, date, numeric);

-- Keep the current completion RPC available only to authenticated users.
revoke execute on function public.complete_spk_workflow(uuid) from public;
revoke execute on function public.complete_spk_workflow(uuid) from anon;
grant execute on function public.complete_spk_workflow(uuid) to authenticated;

-- Force PostgREST to refresh its function signature cache immediately.
notify pgrst, 'reload schema';

commit;
