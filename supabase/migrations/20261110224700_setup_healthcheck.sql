-- Consulta técnica sem dados de negócio, disponível pelo SDK/Data API.
create or replace function public.setup_healthcheck()
returns text
language sql
stable
security invoker
set search_path = ''
as $$
  select 'fixit-v2:ok'::text;
$$;

revoke all on function public.setup_healthcheck() from public;
grant execute on function public.setup_healthcheck() to anon, authenticated;

comment on function public.setup_healthcheck() is
  'Verificação técnica do setup FixIt v2; não consulta nem altera dados.';
