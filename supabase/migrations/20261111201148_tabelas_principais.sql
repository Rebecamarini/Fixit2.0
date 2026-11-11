create type public.papel_perfil as enum ('cliente', 'gestor', 'manutentor');
create table public.profiles (
  id uuid primary key references auth.users(id) on delete restrict,
  nome text not null check (char_length(nome) <= 120 and nome ~ '[^[:space:]]'),
  papel public.papel_perfil not null,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
revoke all on public.profiles from public, anon, authenticated;

-- Funções de integridade não são endpoints da Data API.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
create function private.proteger_profile() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if new.id is distinct from old.id or new.papel is distinct from old.papel
     or new.created_at is distinct from old.created_at then
    raise exception 'Identidade, papel e data de criação do perfil são imutáveis' using errcode = '23514';
  end if;
  return new;
end $$;
revoke all on function private.proteger_profile() from public, anon, authenticated;
create trigger proteger_profile before update on public.profiles
for each row execute function private.proteger_profile();

create type public.status_solicitacao as enum ('pendente','aprovada','em_atendimento','concluida','descartada');
create type public.prioridade_solicitacao as enum ('baixa','media','alta');
create table public.solicitacoes (
  id uuid primary key default gen_random_uuid(),
  numero bigint generated always as identity unique,
  solicitante_id uuid not null references public.profiles(id) on delete restrict,
  titulo text not null check (char_length(titulo) <= 150 and titulo ~ '[^[:space:]]'),
  descricao text not null check (char_length(descricao) <= 5000 and descricao ~ '[^[:space:]]'),
  local text not null check (char_length(local) <= 200 and local ~ '[^[:space:]]'),
  status public.status_solicitacao not null default 'pendente',
  prioridade public.prioridade_solicitacao,
  responsavel_id uuid references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint atendimento_completo check (status not in ('em_atendimento','concluida') or (prioridade is not null and responsavel_id is not null))
);
create index solicitacoes_solicitante_idx on public.solicitacoes(solicitante_id);
create index solicitacoes_responsavel_idx on public.solicitacoes(responsavel_id);
alter table public.solicitacoes enable row level security;
revoke all on public.solicitacoes from public, anon, authenticated;
revoke all on sequence public.solicitacoes_numero_seq from public, anon, authenticated;

create function private.validar_solicitacao() returns trigger
language plpgsql security invoker set search_path = '' as $$
declare perfil public.profiles;
begin
  if tg_op = 'UPDATE' then
    if new.id is distinct from old.id or new.numero is distinct from old.numero
       or new.solicitante_id is distinct from old.solicitante_id
       or new.created_at is distinct from old.created_at then
      raise exception 'Identidade e autoria da solicitação são imutáveis' using errcode='23514';
    end if;
  else
    select * into perfil from public.profiles where id=new.solicitante_id for share;
    if not found then
      raise exception 'Solicitante inexistente' using errcode='23503';
    end if;
    if perfil.papel <> 'cliente' or not perfil.ativo then
      raise exception 'Solicitante deve ser Cliente ativo' using errcode='23514';
    end if;
  end if;
  if new.responsavel_id is not null and (tg_op='INSERT' or new.responsavel_id is distinct from old.responsavel_id) then
    select * into perfil from public.profiles where id=new.responsavel_id for share;
    if not found then
      raise exception 'Responsável inexistente' using errcode='23503';
    end if;
    if perfil.papel <> 'manutentor' or not perfil.ativo then
      raise exception 'Responsável deve ser Manutentor ativo' using errcode='23514';
    end if;
  end if;
  return new;
end $$;
revoke all on function private.validar_solicitacao() from public, anon, authenticated;
create trigger validar_solicitacao before insert or update on public.solicitacoes
for each row execute function private.validar_solicitacao();

create type public.tipo_evento as enum ('abertura','alteracao_status','alteracao_prioridade','alteracao_responsavel','observacao');
create table public.historico (
  id uuid primary key default gen_random_uuid(),
  solicitacao_id uuid not null references public.solicitacoes(id) on delete restrict,
  autor_id uuid not null references public.profiles(id) on delete restrict,
  tipo public.tipo_evento not null,
  created_at timestamptz not null default now(),
  observacao text check (char_length(observacao)<=5000 and observacao ~ '[^[:space:]]'),
  status_anterior public.status_solicitacao,
  status_novo public.status_solicitacao,
  prioridade_anterior public.prioridade_solicitacao,
  prioridade_nova public.prioridade_solicitacao,
  responsavel_anterior uuid references public.profiles(id) on delete restrict,
  responsavel_novo uuid references public.profiles(id) on delete restrict,
  constraint evento_coerente check (
    case tipo
      when 'abertura' then
        num_nonnulls(status_anterior,status_novo,prioridade_anterior,prioridade_nova,responsavel_anterior,responsavel_novo)=0
      when 'observacao' then
        observacao is not null and num_nonnulls(status_anterior,status_novo,prioridade_anterior,prioridade_nova,responsavel_anterior,responsavel_novo)=0
      when 'alteracao_status' then
        status_anterior is not null and status_novo is not null and status_anterior<>status_novo
        and num_nonnulls(prioridade_anterior,prioridade_nova,responsavel_anterior,responsavel_novo)=0
      when 'alteracao_prioridade' then
        prioridade_anterior is distinct from prioridade_nova
        and num_nonnulls(status_anterior,status_novo,responsavel_anterior,responsavel_novo)=0
      when 'alteracao_responsavel' then
        responsavel_anterior is distinct from responsavel_novo
        and num_nonnulls(status_anterior,status_novo,prioridade_anterior,prioridade_nova)=0
      else false
    end
  )
);
create index historico_solicitacao_data_idx on public.historico(solicitacao_id,created_at,id);
create index historico_autor_idx on public.historico(autor_id);
create index historico_responsavel_anterior_idx on public.historico(responsavel_anterior);
create index historico_responsavel_novo_idx on public.historico(responsavel_novo);
alter table public.historico enable row level security;
revoke all on public.historico from public, anon, authenticated;

create function private.proteger_historico() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
  raise exception 'Histórico é imutável; acrescente um novo registro' using errcode='23514';
end $$;
revoke all on function private.proteger_historico() from public, anon, authenticated;
create trigger proteger_historico before update or delete on public.historico
for each row execute function private.proteger_historico();
create trigger proteger_historico_truncate before truncate on public.historico
for each statement execute function private.proteger_historico();
