-- RPCs already serialize each request with a row lock (or own the new row).
-- Wall clocks can move backwards; assign strictly increasing dates per request
-- so the documented created_at/id ordering follows the committed operations.
-- This guarantee covers application RPCs, not direct administrative SQL.
create function private.proxima_data_historico(p_id uuid) returns timestamptz
language sql volatile security invoker set search_path = '' as $$
  select greatest(
    clock_timestamp(),
    s.created_at,
    (select max(h.created_at) + interval '1 microsecond'
     from public.historico h where h.solicitacao_id = s.id)
  ) from public.solicitacoes s where s.id = p_id
$$;
revoke all on function private.proxima_data_historico(uuid) from public, anon, authenticated;

create or replace function private.abrir_solicitacao(p_titulo text, p_descricao text, p_local text)
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
  values (criada.id, operador.id, 'abertura', private.proxima_data_historico(criada.id));
  return criada;
end $$;

create or replace function private.transicionar_solicitacao(p_id uuid, p_status public.status_solicitacao)
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
  values (p_id,operador.id,'alteracao_status',anterior.status,atual.status,private.proxima_data_historico(p_id));
  return atual;
end $$;

create or replace function private.organizar_solicitacao(p_id uuid, p_prioridade public.prioridade_solicitacao, p_responsavel_id uuid)
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
    values (p_id,operador.id,'alteracao_prioridade',anterior.prioridade,atual.prioridade,private.proxima_data_historico(p_id));
  end if;
  if anterior.responsavel_id is distinct from atual.responsavel_id then
    insert into public.historico(solicitacao_id,autor_id,tipo,responsavel_anterior,responsavel_novo,created_at)
    values (p_id,operador.id,'alteracao_responsavel',anterior.responsavel_id,atual.responsavel_id,private.proxima_data_historico(p_id));
  end if;
  return atual;
end $$;

create or replace function private.adicionar_observacao(p_id uuid, p_observacao text)
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
  values (p_id,operador.id,'observacao',p_observacao,private.proxima_data_historico(p_id)) returning * into evento;
  return evento;
end $$;
