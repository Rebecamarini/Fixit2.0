-- Executar com ON_ERROR_STOP. Todas as fixtures são revertidas.
begin;
set constraints auth.criar_profile_auth immediate;
set local statement_timeout = '20s';
create function pg_temp.rejects(command text, expected_state text) returns void language plpgsql as $f$
begin
  begin
    execute command;
  exception when others then
    if sqlstate = expected_state then return; end if;
    raise;
  end;
  raise exception 'Comando deveria falhar com %: %', expected_state, command;
end $f$;
do $$
declare
  cliente uuid := gen_random_uuid();
  perfil public.profiles;
begin
  insert into auth.users(id,raw_user_meta_data) values (cliente, '{"nome":"Cliente de teste"}');
  select * into perfil from public.profiles where id=cliente;
  perform pg_temp.rejects(format('insert into public.profiles(id,nome,papel) values (%L,%L,%L)', gen_random_uuid(), 'Nome', 'cliente'), '23503');
  perform pg_temp.rejects(format('update public.profiles set nome=%L where id=%L', E' \t\n', cliente), '23514');
  perform pg_temp.rejects(format('update public.profiles set nome=%L where id=%L', repeat('a',121), cliente), '23514');
  perform pg_temp.rejects(format('update public.profiles set papel=%L where id=%L', 'gestor', cliente), '23514');
  update public.profiles set nome=repeat('a',120) where id=cliente;
  perform pg_temp.rejects(format('insert into public.profiles(id,nome,papel) values(%L,%L,%L)',cliente,'Duplicado','cliente'),'23505');
  perform pg_temp.rejects(format('update public.profiles set papel=%L where id=%L','invalido',cliente),'22P02');
  perform pg_temp.rejects(format('update public.profiles set id=%L where id=%L',gen_random_uuid(),cliente),'23514');
  assert perfil.ativo and perfil.created_at is not null, 'Perfil deve receber ativo e data';
end $$;
do $$
declare
  cliente uuid := gen_random_uuid(); gestor uuid := gen_random_uuid(); manutentor uuid := gen_random_uuid();
  pedido public.solicitacoes; segundo public.solicitacoes; campo text; limite int; estado text;
begin
  insert into auth.users(id,raw_user_meta_data,raw_app_meta_data) values
    (cliente,'{"nome":"Cliente"}','{}'),
    (gestor,'{"nome":"Gestor"}','{"fixit_papel":"gestor"}'),
    (manutentor,'{"nome":"Manutentor"}','{"fixit_papel":"manutentor"}');
  insert into public.solicitacoes(solicitante_id,titulo,descricao,local) values(cliente,'Título','Descrição','Sala') returning * into pedido;
  insert into public.solicitacoes(solicitante_id,titulo,descricao,local) values(cliente,repeat('a',150),repeat('a',5000),repeat('a',200)) returning * into segundo;
  assert pedido.id is not null and pedido.numero <> segundo.numero and pedido.created_at is not null;
  assert pedido.status = 'pendente' and pedido.prioridade is null and pedido.responsavel_id is null;
  perform pg_temp.rejects(format('insert into public.solicitacoes(solicitante_id,titulo,descricao,local) values(%L,%L,%L,%L)',gestor,'t','d','l'),'23514');
  perform pg_temp.rejects(format('update public.solicitacoes set status=%L where id=%L','em_atendimento',pedido.id),'23514');
  perform pg_temp.rejects(format('update public.solicitacoes set responsavel_id=%L where id=%L',gestor,pedido.id),'23514');
  foreach campo in array array['titulo','descricao','local'] loop
    limite := case campo when 'titulo' then 150 when 'local' then 200 else 5000 end;
    perform pg_temp.rejects(format('update public.solicitacoes set %I=%L where id=%L',campo,E' \t\n',pedido.id),'23514');
    perform pg_temp.rejects(format('update public.solicitacoes set %I=%L where id=%L',campo,repeat('a',limite+1),pedido.id),'23514');
    perform pg_temp.rejects(format('update public.solicitacoes set %I=null where id=%L',campo,pedido.id),'23502');
  end loop;
  perform pg_temp.rejects(format('update public.solicitacoes set status=%L where id=%L','invalido',pedido.id),'22P02');
  perform pg_temp.rejects(format('update public.solicitacoes set prioridade=%L where id=%L','invalida',pedido.id),'22P02');
  perform pg_temp.rejects(format('update public.solicitacoes set responsavel_id=%L where id=%L',gen_random_uuid(),pedido.id),'23503');
  perform pg_temp.rejects(format('update public.solicitacoes set id=%L where id=%L',gen_random_uuid(),pedido.id),'23514');
  foreach estado in array array['em_atendimento','concluida'] loop
    perform pg_temp.rejects(format('update public.solicitacoes set status=%L,prioridade=%L where id=%L',estado,'alta',pedido.id),'23514');
    perform pg_temp.rejects(format('update public.solicitacoes set status=%L,responsavel_id=%L where id=%L',estado,manutentor,pedido.id),'23514');
  end loop;
  update public.solicitacoes set status='descartada' where id=pedido.id;
  update public.solicitacoes set status='aprovada'  where id=pedido.id;
  update public.solicitacoes set prioridade='alta',responsavel_id=manutentor,status='em_atendimento' where id=pedido.id;
  update public.profiles set ativo=false where id in (cliente,manutentor);
  update public.solicitacoes set status='concluida' where id=pedido.id;
  assert (select responsavel_id=manutentor from public.solicitacoes where id=pedido.id);
  perform pg_temp.rejects(format('update public.solicitacoes set responsavel_id=%L where id=%L',manutentor,segundo.id),'23514');
  perform pg_temp.rejects(format('insert into public.solicitacoes(solicitante_id,titulo,descricao,local) values(%L,%L,%L,%L)',cliente,'t','d','l'),'23514');
  perform pg_temp.rejects(format('update public.solicitacoes set solicitante_id=%L where id=%L',gestor,pedido.id),'23514');
  perform pg_temp.rejects(format('delete from public.profiles where id=%L',cliente),'23503');
  perform pg_temp.rejects(format('delete from auth.users where id=%L',cliente),'23503');
end $$;
do $$
declare cliente uuid:=gen_random_uuid(); manutentor uuid:=gen_random_uuid(); pedido uuid; evento uuid;
begin
  insert into auth.users(id,raw_user_meta_data,raw_app_meta_data) values
    (cliente,'{"nome":"Cliente"}','{}'),
    (manutentor,'{"nome":"Manutentor"}','{"fixit_papel":"manutentor"}');
  insert into public.solicitacoes(solicitante_id,titulo,descricao,local) values(cliente,'t','d','l') returning id into pedido;
  insert into public.historico(solicitacao_id,autor_id,tipo) values(pedido,cliente,'abertura') returning id into evento;
  insert into public.historico(solicitacao_id,autor_id,tipo,status_anterior,status_novo) values(pedido,cliente,'alteracao_status','pendente','aprovada');
  insert into public.historico(solicitacao_id,autor_id,tipo,prioridade_nova) values(pedido,cliente,'alteracao_prioridade','alta');
  insert into public.historico(solicitacao_id,autor_id,tipo,responsavel_novo) values(pedido,cliente,'alteracao_responsavel',manutentor);
  insert into public.historico(solicitacao_id,autor_id,tipo,observacao) values(pedido,cliente,'observacao',repeat('a',5000));
  assert (select count(*)=5 and bool_and(created_at is not null) from public.historico where solicitacao_id=pedido);
  perform pg_temp.rejects(format('insert into public.historico(solicitacao_id,autor_id,tipo) values(%L,%L,%L)',pedido,cliente,'observacao'),'23514');
  perform pg_temp.rejects(format('insert into public.historico(solicitacao_id,autor_id,tipo,status_anterior,status_novo) values(%L,%L,%L,%L,%L)',pedido,cliente,'alteracao_status','pendente','pendente'),'23514');
  perform pg_temp.rejects(format('insert into public.historico(solicitacao_id,autor_id,tipo,prioridade_nova) values(%L,%L,%L,%L)',pedido,cliente,'abertura','alta'),'23514');
  perform pg_temp.rejects(format('update public.historico set observacao=%L where id=%L','correção',evento),'23514');
  perform pg_temp.rejects(format('delete from public.historico where id=%L',evento),'23514');
  perform pg_temp.rejects(format('delete from public.solicitacoes where id=%L',pedido),'23503');
  perform pg_temp.rejects(format('insert into public.historico(solicitacao_id,autor_id,tipo,observacao) values(%L,%L,%L,%L)',pedido,cliente,'observacao',E' \t\n'),'23514');
  perform pg_temp.rejects(format('insert into public.historico(solicitacao_id,autor_id,tipo,observacao) values(%L,%L,%L,%L)',pedido,cliente,'observacao',repeat('a',5001)),'23514');
  perform pg_temp.rejects(format('insert into public.historico(solicitacao_id,autor_id,tipo) values(%L,%L,%L)',gen_random_uuid(),cliente,'abertura'),'23503');
  perform pg_temp.rejects(format('insert into public.historico(solicitacao_id,autor_id,tipo) values(%L,%L,%L)',pedido,gen_random_uuid(),'abertura'),'23503');
  perform pg_temp.rejects(format('insert into public.historico(solicitacao_id,autor_id,tipo) values(%L,%L,%L)',pedido,cliente,'invalido'),'22P02');
  perform pg_temp.rejects(format('insert into public.historico(solicitacao_id,autor_id,tipo) values(%L,%L,%L)',pedido,cliente,'alteracao_prioridade'),'23514');
  perform pg_temp.rejects(format('insert into public.historico(solicitacao_id,autor_id,tipo) values(%L,%L,%L)',pedido,cliente,'alteracao_responsavel'),'23514');
  perform pg_temp.rejects('truncate public.historico','23514');
  update public.profiles set ativo=false where id=manutentor;
  insert into public.historico(solicitacao_id,autor_id,tipo,responsavel_anterior) values(pedido,cliente,'alteracao_responsavel',manutentor);
end $$;
-- Um papel comum com acesso de manutenção ainda não pode reescrever histórico.
-- Grants e a troca de papel abaixo são fixtures revertidas no rollback.
grant usage on schema public to service_role;
grant select,update,delete on public.historico to service_role;
set local role service_role;
do $$
begin
  begin
    update public.historico set observacao='reescrita';
    raise exception 'Histórico deveria ser imutável para service_role';
  exception when check_violation then null;
  end;
  begin
    delete from public.historico;
    raise exception 'Histórico deveria preservar registros para service_role';
  exception when check_violation then null;
  end;
end $$;
reset role;
rollback;
