-- Reads are RLS-filtered. All application writes go through narrow operations:
-- callers cannot supply identity, author, timestamp or arbitrary audit events.
-- Definer implementations live outside exposed schemas and authorize each call;
-- public wrappers retain invoker security. No application role gets table DML.
grant usage on schema private to authenticated;
grant select on public.solicitacoes, public.historico to authenticated;
drop policy ler_proprio_profile on public.profiles;

create function private.meu_papel_ativo() returns public.papel_perfil
language sql stable security definer set search_path = '' as $$
  select p.papel from public.profiles p where p.id = (select auth.uid()) and p.ativo
$$;
revoke all on function private.meu_papel_ativo() from public, anon, authenticated;
grant execute on function private.meu_papel_ativo() to authenticated;

create function private.pode_ler_solicitacao(p_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.solicitacoes s
    where s.id = p_id and case private.meu_papel_ativo()
      when 'gestor' then true
      when 'cliente' then s.solicitante_id = (select auth.uid())
      when 'manutentor' then s.responsavel_id = (select auth.uid())
      else false end
  )
$$;
revoke all on function private.pode_ler_solicitacao(uuid) from public, anon, authenticated;
grant execute on function private.pode_ler_solicitacao(uuid) to authenticated;

create function private.pode_ler_profile(p_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select private.meu_papel_ativo() is not null and (
    p_id = (select auth.uid())
    or (private.meu_papel_ativo() = 'gestor' and exists (
      select 1 from public.profiles p where p.id = p_id and p.papel = 'manutentor' and p.ativo
    ))
    or exists (
      select 1 from public.solicitacoes s where private.pode_ler_solicitacao(s.id)
      and (s.solicitante_id = p_id or s.responsavel_id = p_id or exists (
        select 1 from public.historico h where h.solicitacao_id = s.id
        and p_id in (h.autor_id, h.responsavel_anterior, h.responsavel_novo)
      ))
    )
  )
$$;
revoke all on function private.pode_ler_profile(uuid) from public, anon, authenticated;
grant execute on function private.pode_ler_profile(uuid) to authenticated;

create policy ler_solicitacoes on public.solicitacoes for select to authenticated
using (private.pode_ler_solicitacao(id));
create policy ler_historico on public.historico for select to authenticated
using (private.pode_ler_solicitacao(solicitacao_id));
create policy ler_profiles_necessarios on public.profiles for select to authenticated
using (private.pode_ler_profile(id));

-- Internal only. A SHARE lock conflicts with profile deactivation, including
-- non-key updates; FOR KEY SHARE would not protect the active check.
create function private.operador_ativo() returns public.profiles
language plpgsql security definer set search_path = '' as $$
declare operador public.profiles;
begin
  select * into operador from public.profiles where id = (select auth.uid()) for share;
  if not found or not operador.ativo then
    raise exception 'Acesso não autorizado' using errcode = '42501';
  end if;
  return operador;
end $$;
revoke all on function private.operador_ativo() from public, anon, authenticated;

create function private.abrir_solicitacao(p_titulo text, p_descricao text, p_local text)
returns public.solicitacoes language plpgsql security definer set search_path = '' as $$
declare operador public.profiles; criada public.solicitacoes;
begin
  operador := private.operador_ativo();
  if operador.papel <> 'cliente' then
    raise exception 'Acesso não autorizado' using errcode = '42501';
  end if;
  insert into public.solicitacoes(solicitante_id, titulo, descricao, local)
  values (operador.id, p_titulo, p_descricao, p_local) returning * into criada;
  insert into public.historico(solicitacao_id, autor_id, tipo, created_at)
  values (criada.id, operador.id, 'abertura', clock_timestamp());
  return criada;
end $$;
revoke all on function private.abrir_solicitacao(text,text,text) from public, anon, authenticated;
grant execute on function private.abrir_solicitacao(text,text,text) to authenticated;
create function public.abrir_solicitacao(p_titulo text, p_descricao text, p_local text)
returns public.solicitacoes language sql security invoker set search_path = '' as $$
  select private.abrir_solicitacao(p_titulo, p_descricao, p_local)
$$;
revoke all on function public.abrir_solicitacao(text,text,text) from public, anon, authenticated;
grant execute on function public.abrir_solicitacao(text,text,text) to authenticated;

-- Event timestamps use the clock after lock acquisition, not transaction-start
-- time, so a waiting operation cannot appear before the operation it waited for.
-- Re-read state and responsibility after obtaining the same row lock used by
-- organization and observations. An old owner cannot act on a stale snapshot.
create function private.transicionar_solicitacao(p_id uuid, p_status public.status_solicitacao)
returns public.solicitacoes language plpgsql security definer set search_path = '' as $$
declare operador public.profiles; anterior public.solicitacoes; atual public.solicitacoes;
begin
  operador := private.operador_ativo();
  select * into anterior from public.solicitacoes where id = p_id for update;
  if not found then
    raise exception 'Acesso não autorizado' using errcode = '42501';
  end if;
  if not coalesce(
    (operador.papel = 'gestor' and anterior.status = 'pendente' and p_status in ('aprovada','descartada'))
    or (operador.papel = 'manutentor' and anterior.responsavel_id = operador.id and (
      (anterior.status = 'aprovada' and p_status = 'em_atendimento')
      or (anterior.status = 'em_atendimento' and p_status = 'concluida')
    )), false) then
    raise exception 'Acesso não autorizado' using errcode = '42501';
  end if;
  update public.solicitacoes set status = p_status where id = p_id returning * into atual;
  insert into public.historico(solicitacao_id,autor_id,tipo,status_anterior,status_novo,created_at)
  values (p_id,operador.id,'alteracao_status',anterior.status,atual.status,clock_timestamp());
  return atual;
end $$;
revoke all on function private.transicionar_solicitacao(uuid,public.status_solicitacao) from public, anon, authenticated;
grant execute on function private.transicionar_solicitacao(uuid,public.status_solicitacao) to authenticated;
create function public.transicionar_solicitacao(p_id uuid, p_status public.status_solicitacao)
returns public.solicitacoes language sql security invoker set search_path = '' as $$
  select private.transicionar_solicitacao(p_id, p_status)
$$;
revoke all on function public.transicionar_solicitacao(uuid,public.status_solicitacao) from public, anon, authenticated;
grant execute on function public.transicionar_solicitacao(uuid,public.status_solicitacao) to authenticated;

-- Both organization fields are a complete desired pair, not an ambiguous patch.
-- Null removes a value only while the existing state permits the resulting row.
create function private.organizar_solicitacao(p_id uuid, p_prioridade public.prioridade_solicitacao, p_responsavel_id uuid)
returns public.solicitacoes language plpgsql security definer set search_path = '' as $$
declare operador public.profiles; anterior public.solicitacoes; atual public.solicitacoes;
begin
  operador := private.operador_ativo();
  if operador.papel <> 'gestor' then
    raise exception 'Acesso não autorizado' using errcode = '42501';
  end if;
  select * into anterior from public.solicitacoes where id = p_id for update;
  if not found or anterior.status not in ('aprovada','em_atendimento') then
    raise exception 'Acesso não autorizado' using errcode = '42501';
  end if;
  update public.solicitacoes set prioridade = p_prioridade, responsavel_id = p_responsavel_id
  where id = p_id returning * into atual;
  if anterior.prioridade is distinct from atual.prioridade then
    insert into public.historico(solicitacao_id,autor_id,tipo,prioridade_anterior,prioridade_nova,created_at)
    values (p_id,operador.id,'alteracao_prioridade',anterior.prioridade,atual.prioridade,clock_timestamp());
  end if;
  if anterior.responsavel_id is distinct from atual.responsavel_id then
    insert into public.historico(solicitacao_id,autor_id,tipo,responsavel_anterior,responsavel_novo,created_at)
    values (p_id,operador.id,'alteracao_responsavel',anterior.responsavel_id,atual.responsavel_id,clock_timestamp());
  end if;
  return atual;
end $$;
revoke all on function private.organizar_solicitacao(uuid,public.prioridade_solicitacao,uuid) from public, anon, authenticated;
grant execute on function private.organizar_solicitacao(uuid,public.prioridade_solicitacao,uuid) to authenticated;
create function public.organizar_solicitacao(p_id uuid, p_prioridade public.prioridade_solicitacao, p_responsavel_id uuid)
returns public.solicitacoes language sql security invoker set search_path = '' as $$
  select private.organizar_solicitacao(p_id, p_prioridade, p_responsavel_id)
$$;
revoke all on function public.organizar_solicitacao(uuid,public.prioridade_solicitacao,uuid) from public, anon, authenticated;
grant execute on function public.organizar_solicitacao(uuid,public.prioridade_solicitacao,uuid) to authenticated;

create function private.adicionar_observacao(p_id uuid, p_observacao text)
returns public.historico language plpgsql security definer set search_path = '' as $$
declare operador public.profiles; solicitacao public.solicitacoes; evento public.historico;
begin
  operador := private.operador_ativo();
  select * into solicitacao from public.solicitacoes where id = p_id for update;
  if not found or solicitacao.status in ('concluida','descartada') or not coalesce(
    operador.papel = 'gestor' or (operador.papel = 'manutentor' and solicitacao.responsavel_id = operador.id), false
  ) then
    raise exception 'Acesso não autorizado' using errcode = '42501';
  end if;
  insert into public.historico(solicitacao_id,autor_id,tipo,observacao,created_at)
  values (p_id,operador.id,'observacao',p_observacao,clock_timestamp()) returning * into evento;
  return evento;
end $$;
revoke all on function private.adicionar_observacao(uuid,text) from public, anon, authenticated;
grant execute on function private.adicionar_observacao(uuid,text) to authenticated;
create function public.adicionar_observacao(p_id uuid, p_observacao text)
returns public.historico language sql security invoker set search_path = '' as $$
  select private.adicionar_observacao(p_id, p_observacao)
$$;
revoke all on function public.adicionar_observacao(uuid,text) from public, anon, authenticated;
grant execute on function public.adicionar_observacao(uuid,text) to authenticated;

notify pgrst, 'reload schema';
