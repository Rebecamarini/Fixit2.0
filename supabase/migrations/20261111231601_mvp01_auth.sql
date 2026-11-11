-- Auth insere a conta e o perfil na mesma transação. Esta função só é
-- executável pelo trigger; não é um endpoint e não aceita identidade do cliente.
create function private.criar_profile_auth() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, nome, papel, ativo)
  values (
    new.id,
    new.raw_user_meta_data ->> 'nome',
    coalesce((select u.raw_app_meta_data ->> 'fixit_papel' from auth.users u where u.id = new.id), 'cliente')::public.papel_perfil,
    true
  );
  return new;
end $$;
revoke all on function private.criar_profile_auth() from public, anon, authenticated;
create constraint trigger criar_profile_auth after insert on auth.users
deferrable initially deferred for each row execute function private.criar_profile_auth();

-- Somente o contexto da própria pessoa. Escritas e as demais tabelas
-- continuam fechadas até as políticas específicas do MVP-02.
grant select on public.profiles to authenticated;
create policy ler_proprio_profile on public.profiles for select to authenticated
using (id = (select auth.uid()));
