import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';
import { parseEnv } from 'node:util';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseConfig } from '../src/lib/supabase/config.ts';

// Privileged fixture access is supplied explicitly by the operator; the tested
// operations use only public keys and real authenticated sessions.
async function sql(query) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.env.FIXIT_AUTH_SQL_COMMAND, { shell: true, stdio: ['pipe', 'pipe', 'pipe'] });
    let output = '';
    child.stdout.on('data', value => { output += value; });
    child.stderr.resume();
    child.on('error', () => reject(new Error('SQL helper indisponível.')));
    child.on('close', code => {
      if (code) return reject(new Error('Falha no SQL helper.'));
      try { resolve(JSON.parse(output)); } catch { reject(new Error('SQL helper deve retornar um array JSON.')); }
    });
    child.stdin.end(query);
  });
}
const quote = value => `'${value.replaceAll("'", "''")}'`;
const environment = process.argv[2];
const fixtures = [];
const constraints = [];
let checks = 0;
function check(condition, message) { assert(condition, message); checks++; }
async function ok(operation, message) {
  const result = await operation.abortSignal(AbortSignal.timeout(15_000));
  check(!result.error, `${message}: ${result.error?.code ?? ''}`);
  return result.data;
}
try {
  assert(process.argv.length === 3 && ['local', 'cloud'].includes(environment), 'Uso: npm run rls:check -- <local|cloud>');
  assert(process.env.FIXIT_AUTH_SQL_COMMAND, 'Configure FIXIT_AUTH_SQL_COMMAND por meio seguro.');
  const config = getSupabaseConfig(parseEnv(await readFile(`.env.supabase.${environment}`, 'utf8')));
  assert.equal(config.environment, environment);
  const options = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } };
  const prefix = `fixit-rls-${randomUUID()}`;
  for (const [name, papel] of [['cliente', 'cliente'], ['outro', 'cliente'], ['gestor', 'gestor'], ['manutentor', 'manutentor'], ['substituto', 'manutentor']]) {
    const id = randomUUID();
    const email = `${name}-${prefix}@example.com`;
    const password = `Fixit-${randomUUID()}-Aa1!`;
    fixtures.push({ id, email, papel });
    await sql(`begin;
      insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at,confirmation_token,recovery_token,email_change_token_new,email_change)
      values ('00000000-0000-0000-0000-000000000000','${id}','authenticated','authenticated',${quote(email)},extensions.crypt(${quote(password)},extensions.gen_salt('bf')),now(),jsonb_build_object('provider','email','providers',jsonb_build_array('email'),'fixit_papel','${papel}'),jsonb_build_object('nome','${name}'),now(),now(),'','','','');
      insert into auth.identities(id,provider_id,user_id,identity_data,provider,created_at,updated_at)
      values (gen_random_uuid(),'${id}','${id}',jsonb_build_object('sub','${id}','email',${quote(email)}),'email',now(),now()); commit;`);
    const client = createClient(config.url, config.publishableKey, options);
    const login = await client.auth.signInWithPassword({ email, password });
    check(!login.error, 'Fixture entra pela autenticação pública real.');
    fixtures.at(-1).client = client;
  }
  const [cliente, outro, gestor, manutentor, substituto] = fixtures;
  const anonymous = createClient(config.url, config.publishableKey, options);
  async function denied(operation, message, codes = ['42501']) {
    const result = await operation.abortSignal(AbortSignal.timeout(15_000));
    check(codes.includes(result.error?.code), `${message}: ${result.error?.code ?? 'sucesso indevido'}`);
  }
  async function rows(client, table, id) {
    return ok(client.from(table).select('*').eq('id', id), `Consulta filtrada de ${table}`);
  }
  async function history(client, id) {
    return ok(client.from('historico').select('*').eq('solicitacao_id', id).order('created_at').order('id'), 'Histórico autorizado');
  }
  const opened = await ok(cliente.client.rpc('abrir_solicitacao', { p_titulo: 'Lâmpada', p_descricao: 'Não acende', p_local: 'Sala 1' }), 'Cliente abre solicitação');
  check(opened.solicitante_id === cliente.id && opened.status === 'pendente' && opened.prioridade === null && opened.responsavel_id === null, 'Abertura define identidade e estado confiáveis.');
  const session = await cliente.client.auth.getSession();
  const smoke = spawnSync(process.execPath, ['scripts/check-db-api.mjs', environment], {
    env: { ...process.env, SUPABASE_TEST_ACCESS_TOKEN: session.data.session.access_token }, encoding: 'utf8',
  });
  check(smoke.status === 0, 'Smoke existente da API permanece compatível com a matriz RLS.');
  check((await rows(cliente.client, 'solicitacoes', opened.id)).length === 1, 'Cliente vê a própria solicitação.');
  check((await rows(outro.client, 'solicitacoes', opened.id)).length === 0, 'Outro Cliente não vê solicitação por ID conhecido.');
  check((await rows(gestor.client, 'solicitacoes', opened.id)).length === 1, 'Gestor vê todas as solicitações.');
  check((await rows(manutentor.client, 'solicitacoes', opened.id)).length === 0, 'Manutentor sem atribuição não vê solicitação.');
  const initial = await history(cliente.client, opened.id);
  check(initial.length === 1 && initial[0].tipo === 'abertura' && initial[0].autor_id === cliente.id, 'Abertura e autor são gravados automaticamente.');
  await denied(gestor.client.rpc('transicionar_solicitacao', { p_id: opened.id, p_status: 'invalido' }), 'Status fora do domínio é recusado', ['22P02']);
  check((await rows(cliente.client, 'solicitacoes', opened.id))[0].status === 'pendente' && (await history(cliente.client, opened.id)).length === 1, 'Status inválido não altera solicitação nem histórico.');
  check((await history(outro.client, opened.id)).length === 0, 'Histórico de outra pessoa não é exposto.');
  check((await rows(cliente.client, 'profiles', outro.id)).length === 0, 'Não há diretório geral de pessoas.');
  check((await rows(gestor.client, 'profiles', manutentor.id)).length === 1, 'Gestor lista Manutentor ativo ainda sem atribuição.');
  for (const table of ['profiles', 'solicitacoes', 'historico']) {
    await denied(anonymous.from(table).select('*'), 'Visitante não lê dados de negócio');
    for (const identity of [anonymous, cliente.client, gestor.client, manutentor.client]) {
      await denied(identity.from(table).insert(table === 'profiles' ? { id: randomUUID(), nome: 'Forjado', papel: 'gestor' } : { id: randomUUID() }), 'INSERT direto recusado');
      await denied(identity.from(table).update({ id: randomUUID() }).eq('id', opened.id), 'UPDATE direto recusado');
      await denied(identity.from(table).delete().eq('id', opened.id), 'DELETE direto recusado');
    }
  }
  await denied(anonymous.rpc('abrir_solicitacao', { p_titulo: 't', p_descricao: 'd', p_local: 'l' }), 'Visitante não abre');
  for (const identity of [gestor.client, manutentor.client]) {
    await denied(identity.rpc('abrir_solicitacao', { p_titulo: 't', p_descricao: 'd', p_local: 'l' }), 'Equipe não abre solicitação');
  }
  await denied(cliente.client.rpc('abrir_solicitacao', { p_titulo: 't', p_descricao: 'd', p_local: 'l', solicitante_id: outro.id }), 'RPC não aceita solicitante forjado', ['PGRST202']);
  const approved = await ok(gestor.client.rpc('transicionar_solicitacao', { p_id: opened.id, p_status: 'aprovada' }), 'Gestor aprova Pendente');
  check(approved.status === 'aprovada', 'Aprovação altera estado.');
  await denied(cliente.client.rpc('transicionar_solicitacao', { p_id: opened.id, p_status: 'em_atendimento' }), 'Cliente não altera estado');
  await denied(gestor.client.rpc('transicionar_solicitacao', { p_id: opened.id, p_status: 'descartada' }), 'Gestor não descarta Aprovada');
  const organized = await ok(gestor.client.rpc('organizar_solicitacao', { p_id: opened.id, p_prioridade: 'alta', p_responsavel_id: manutentor.id }), 'Gestor organiza Aprovada');
  check(organized.prioridade === 'alta' && organized.responsavel_id === manutentor.id, 'Prioridade e responsável atribuídos.');
  check((await rows(manutentor.client, 'solicitacoes', opened.id)).length === 1, 'Responsável consulta a solicitação atribuída.');
  check((await rows(cliente.client, 'profiles', manutentor.id)).length === 1, 'Cliente identifica responsável.');
  check((await rows(manutentor.client, 'profiles', cliente.id)).length === 1, 'Responsável identifica solicitante.');
  check((await rows(cliente.client, 'profiles', gestor.id)).length === 1, 'Cliente identifica autor histórico.');
  check((await rows(cliente.client, 'profiles', substituto.id)).length === 0, 'Cliente não consulta Manutentor sem vínculo.');
  const beforeNoop = await history(cliente.client, opened.id);
  await ok(gestor.client.rpc('organizar_solicitacao', { p_id: opened.id, p_prioridade: 'alta', p_responsavel_id: manutentor.id }), 'Repetir organização é seguro');
  check((await history(cliente.client, opened.id)).length === beforeNoop.length, 'Sem mudança efetiva não gera evento falso.');
  const note = await ok(manutentor.client.rpc('adicionar_observacao', { p_id: opened.id, p_observacao: 'Material necessário.' }), 'Responsável acrescenta observação');
  check(note.autor_id === manutentor.id && note.tipo === 'observacao' && note.observacao === 'Material necessário.', 'Observação tem conteúdo e autoria corretos.');
  await denied(cliente.client.rpc('adicionar_observacao', { p_id: opened.id, p_observacao: 'Não permitido' }), 'Cliente não comenta');
  await denied(substituto.client.rpc('adicionar_observacao', { p_id: opened.id, p_observacao: 'Não permitido' }), 'Outro Manutentor não comenta');
  await denied(manutentor.client.rpc('organizar_solicitacao', { p_id: opened.id, p_prioridade: 'baixa', p_responsavel_id: substituto.id }), 'Manutentor não se reatribui');
  await denied(gestor.client.rpc('transicionar_solicitacao', { p_id: opened.id, p_status: 'em_atendimento' }), 'Gestor não inicia atendimento');
  for (const observation of ['', '   ', 'a'.repeat(5001), null]) {
    await denied(gestor.client.rpc('adicionar_observacao', { p_id: opened.id, p_observacao: observation }), 'Observação inválida recusada', ['23514']);
  }
  for (const input of [
    { p_titulo: '', p_descricao: 'd', p_local: 'l' },
    { p_titulo: 'a'.repeat(151), p_descricao: 'd', p_local: 'l' },
    { p_titulo: 't', p_descricao: ' '.repeat(3), p_local: 'l' },
    { p_titulo: 't', p_descricao: 'a'.repeat(5001), p_local: 'l' },
    { p_titulo: 't', p_descricao: 'd', p_local: 'a'.repeat(201) },
  ]) await denied(cliente.client.rpc('abrir_solicitacao', input), 'Conteúdo inválido recusado', ['23514']);
  await denied(gestor.client.rpc('organizar_solicitacao', { p_id: opened.id, p_prioridade: 'urgente', p_responsavel_id: manutentor.id }), 'Prioridade inválida recusada', ['22P02']);
  await denied(gestor.client.rpc('organizar_solicitacao', { p_id: opened.id, p_prioridade: 'alta', p_responsavel_id: cliente.id }), 'Responsável deve ser Manutentor', ['23514']);
  const started = await ok(manutentor.client.rpc('transicionar_solicitacao', { p_id: opened.id, p_status: 'em_atendimento' }), 'Responsável inicia atendimento');
  check(started.status === 'em_atendimento', 'Início tem estado correto.');
  await denied(gestor.client.rpc('organizar_solicitacao', { p_id: opened.id, p_prioridade: null, p_responsavel_id: manutentor.id }), 'Não remove prioridade durante atendimento', ['23514']);
  await denied(gestor.client.rpc('organizar_solicitacao', { p_id: opened.id, p_prioridade: 'alta', p_responsavel_id: null }), 'Não remove responsável durante atendimento', ['23514']);
  await ok(gestor.client.rpc('organizar_solicitacao', { p_id: opened.id, p_prioridade: 'media', p_responsavel_id: substituto.id }), 'Reatribuir durante atendimento');
  check((await rows(manutentor.client, 'solicitacoes', opened.id)).length === 0, 'Antigo responsável perde acesso à solicitação.');
  check((await history(manutentor.client, opened.id)).length === 0, 'Antigo responsável perde acesso ao histórico.');
  await denied(manutentor.client.rpc('transicionar_solicitacao', { p_id: opened.id, p_status: 'concluida' }), 'Antigo responsável não conclui');
  const completeHistory = await history(substituto.client, opened.id);
  check(completeHistory.some(event => event.id === note.id), 'Novo responsável vê observações anteriores.');
  check((await rows(substituto.client, 'profiles', manutentor.id)).length === 1, 'Novo responsável identifica autor e responsável histórico.');
  await ok(substituto.client.rpc('transicionar_solicitacao', { p_id: opened.id, p_status: 'concluida' }), 'Novo responsável conclui atendimento');
  const finalHistory = await history(cliente.client, opened.id);
  const payloadFields = ['tipo', 'autor_id', 'status_anterior', 'status_novo', 'prioridade_anterior', 'prioridade_nova', 'responsavel_anterior', 'responsavel_novo', 'observacao'];
  const expectedEvents = [
    { tipo: 'abertura', autor_id: cliente.id },
    { tipo: 'alteracao_status', autor_id: gestor.id, status_anterior: 'pendente', status_novo: 'aprovada' },
    { tipo: 'alteracao_prioridade', autor_id: gestor.id, prioridade_nova: 'alta' },
    { tipo: 'alteracao_responsavel', autor_id: gestor.id, responsavel_novo: manutentor.id },
    { tipo: 'observacao', autor_id: manutentor.id, observacao: 'Material necessário.' },
    { tipo: 'alteracao_status', autor_id: manutentor.id, status_anterior: 'aprovada', status_novo: 'em_atendimento' },
    { tipo: 'alteracao_prioridade', autor_id: gestor.id, prioridade_anterior: 'alta', prioridade_nova: 'media' },
    { tipo: 'alteracao_responsavel', autor_id: gestor.id, responsavel_anterior: manutentor.id, responsavel_novo: substituto.id },
    { tipo: 'alteracao_status', autor_id: substituto.id, status_anterior: 'em_atendimento', status_novo: 'concluida' },
  ];
  assert.deepEqual(finalHistory.map(event => Object.fromEntries(payloadFields.map(field => [field, event[field]]))),
    expectedEvents.map(event => Object.fromEntries(payloadFields.map(field => [field, event[field] ?? null]))));
  checks++;
  check(finalHistory.every(event => event.solicitacao_id === opened.id && Number.isFinite(Date.parse(event.created_at)) && Date.parse(event.created_at) >= Date.parse(opened.created_at) && Date.parse(event.created_at) <= Date.now() + 60_000), 'Todos os eventos têm vínculo e data atuais gerados pelo banco.');

  // A clock that moves backwards must not reorder this request's history.
  // Privileged setup moves only this fixture's previous event into the future;
  // the changes under test still use the same public RPCs as the frontends.
  const skewed = await ok(cliente.client.rpc('abrir_solicitacao', { p_titulo: 'Relógio', p_descricao: 'd', p_local: 'l' }), 'Preparar regressão de relógio');
  const [skewedOpening] = await history(cliente.client, skewed.id);
  await sql(`begin; set local session_replication_role=replica;
    update public.historico set created_at=clock_timestamp()+interval '1 hour' where id='${skewedOpening.id}';
    set local session_replication_role=origin; commit;`);
  const [futureOpening] = await history(cliente.client, skewed.id);
  await ok(gestor.client.rpc('transicionar_solicitacao', { p_id: skewed.id, p_status: 'aprovada' }), 'Transição após recuo do relógio');
  await ok(gestor.client.rpc('organizar_solicitacao', { p_id: skewed.id, p_prioridade: 'alta', p_responsavel_id: manutentor.id }), 'Organização após recuo do relógio');
  const skewedHistory = await history(cliente.client, skewed.id);
  assert.deepEqual(skewedHistory.map(event => event.tipo), ['abertura', 'alteracao_status', 'alteracao_prioridade', 'alteracao_responsavel']);
  checks++;
  check(skewedHistory[0].id === skewedOpening.id && new Set(skewedHistory.map(event => event.created_at)).size === 4, 'Eventos preservam ordem estrita mesmo com relógio anterior ao último evento.');
  check(skewedHistory.slice(1).every(event => event.created_at > futureOpening.created_at), 'Novas datas UTC são posteriores à referência futura, preservando microssegundos.');
  await denied(gestor.client.from('historico').update({ observacao: 'Reescrita' }).eq('id', note.id), 'Evento existente não pode ser editado');
  await denied(gestor.client.from('historico').delete().eq('id', note.id), 'Evento existente não pode ser apagado');
  check((await history(cliente.client, opened.id)).find(event => event.id === note.id)?.observacao === 'Material necessário.', 'Tentativas de reescrita preservam a observação original.');
  for (const identity of [gestor.client, substituto.client]) {
    await denied(identity.rpc('adicionar_observacao', { p_id: opened.id, p_observacao: 'Tardia' }), 'Concluída não aceita observação');
    await denied(identity.rpc('transicionar_solicitacao', { p_id: opened.id, p_status: 'aprovada' }), 'Não há reabertura');
    await denied(identity.rpc('organizar_solicitacao', { p_id: opened.id, p_prioridade: 'alta', p_responsavel_id: manutentor.id }), 'Concluída não aceita organização');
  }
  const pending = await ok(cliente.client.rpc('abrir_solicitacao', { p_titulo: 'Outra', p_descricao: 'd', p_local: 'l' }), 'Nova Pendente');
  await denied(gestor.client.rpc('organizar_solicitacao', { p_id: pending.id, p_prioridade: 'alta', p_responsavel_id: manutentor.id }), 'Pendente não aceita organização');
  await ok(gestor.client.rpc('adicionar_observacao', { p_id: pending.id, p_observacao: 'Triagem' }), 'Gestor observa antes do encerramento');
  await ok(gestor.client.rpc('transicionar_solicitacao', { p_id: pending.id, p_status: 'descartada' }), 'Gestor descarta Pendente');
  await denied(gestor.client.rpc('adicionar_observacao', { p_id: pending.id, p_observacao: 'Tardia' }), 'Descartada não aceita observação');
  const incomplete = await ok(cliente.client.rpc('abrir_solicitacao', { p_titulo: 'Incompleta', p_descricao: 'd', p_local: 'l' }), 'Abertura sem atribuição');
  await ok(gestor.client.rpc('transicionar_solicitacao', { p_id: incomplete.id, p_status: 'aprovada' }), 'Aprovação dispensa atribuição');
  await ok(gestor.client.rpc('organizar_solicitacao', { p_id: incomplete.id, p_prioridade: null, p_responsavel_id: manutentor.id }), 'Aprovada admite prioridade vazia');
  await denied(manutentor.client.rpc('transicionar_solicitacao', { p_id: incomplete.id, p_status: 'em_atendimento' }), 'Não inicia sem prioridade', ['23514']);
  await ok(gestor.client.rpc('organizar_solicitacao', { p_id: incomplete.id, p_prioridade: null, p_responsavel_id: null }), 'Aprovada admite remoção de atribuição');
  // Frontend list queries must preserve RLS even with filters, counts and
  // pagination; scope to fixture IDs so existing cloud data cannot affect it.
  const listedIds = [opened.id, pending.id, incomplete.id];
  for (const [identity, expectedIds] of [
    [cliente.client, listedIds], [gestor.client, listedIds], [outro.client, []],
    [manutentor.client, []], [substituto.client, [opened.id]],
  ]) {
    const listing = await identity.from('solicitacoes').select('id,status', { count: 'exact' })
      .in('id', listedIds).order('created_at').order('id').range(0, 1).abortSignal(AbortSignal.timeout(15_000));
    check(!listing.error && listing.count === expectedIds.length, 'Contagem de listagem respeita acesso por papel.');
    assert.deepEqual(listing.data.map(row => row.id), expectedIds.slice(0, 2));
    checks++;
    const nextPage = await ok(identity.from('solicitacoes').select('id').in('id', listedIds)
      .order('created_at').order('id').range(2, 3), 'Página seguinte autorizada');
    assert.deepEqual(nextPage.map(row => row.id), expectedIds.slice(2, 4));
    checks++;
    const recent = await ok(identity.from('solicitacoes').select('id').in('id', listedIds)
      .order('created_at', { ascending: false }).order('id', { ascending: false }).range(0, 1), 'Solicitações mais recentes primeiro');
    assert.deepEqual(recent.map(row => row.id), [...expectedIds].reverse().slice(0, 2));
    checks++;
    const filtered = await ok(identity.from('solicitacoes').select('id').in('id', listedIds)
      .eq('status', 'aprovada').order('created_at').order('id'), 'Filtro de status autorizado');
    assert.deepEqual(filtered.map(row => row.id), expectedIds.filter(id => id === incomplete.id));
    checks++;
  }
  const activeMaintainers = await ok(gestor.client.from('profiles').select('id').in('id', fixtures.map(row => row.id))
    .eq('papel', 'manutentor').eq('ativo', true).order('id'), 'Seleção de Manutentores ativos');
  assert.deepEqual(activeMaintainers.map(row => row.id), [manutentor.id, substituto.id].sort());
  checks++;
  for (const identity of [cliente.client, gestor.client, manutentor.client]) {
    await denied(identity.rpc('transicionar_solicitacao', { p_id: randomUUID(), p_status: 'aprovada' }), 'ID inexistente não concede operação');
  }
  await denied(cliente.client.rpc('adicionar_observacao', { p_id: opened.id, p_observacao: 'Forjada', autor_id: gestor.id, created_at: '2000-01-01' }), 'Observação não aceita autor/data forjados', ['PGRST202']);
  await denied(cliente.client.schema('private').rpc('operador_ativo'), 'Helper interno não é endpoint', ['PGRST106']);
  const metadata = await cliente.client.auth.updateUser({ data: { papel: 'gestor', ativo: true } });
  check(!metadata.error, 'Metadados editáveis exercitados.');
  await denied(cliente.client.rpc('transicionar_solicitacao', { p_id: incomplete.id, p_status: 'descartada' }), 'Metadados não concedem papel de Gestor');

  // Concurrent operations cross the same public seam as frontends. Either
  // ordering is legal, but stale responsibility must never authorize a write.
  for (let attempt = 0; attempt < 3; attempt++) {
    const race = await ok(cliente.client.rpc('abrir_solicitacao', { p_titulo: 'Concorrência', p_descricao: 'd', p_local: 'l' }), 'Preparar concorrência');
    await ok(gestor.client.rpc('transicionar_solicitacao', { p_id: race.id, p_status: 'aprovada' }), 'Aprovar concorrência');
    await ok(gestor.client.rpc('organizar_solicitacao', { p_id: race.id, p_prioridade: 'alta', p_responsavel_id: manutentor.id }), 'Atribuir concorrência');
    const [reassigned, racedStart] = await Promise.all([
      gestor.client.rpc('organizar_solicitacao', { p_id: race.id, p_prioridade: 'alta', p_responsavel_id: substituto.id }),
      manutentor.client.rpc('transicionar_solicitacao', { p_id: race.id, p_status: 'em_atendimento' }),
    ]);
    check(!reassigned.error && (!racedStart.error || racedStart.error.code === '42501'), 'Reatribuição e início têm resultado serializável.');
    const [raceState] = await rows(gestor.client, 'solicitacoes', race.id);
    check(raceState.responsavel_id === substituto.id && raceState.status === (racedStart.error ? 'aprovada' : 'em_atendimento'), 'Estado final corresponde às operações autorizadas.');
    await denied(manutentor.client.rpc('adicionar_observacao', { p_id: race.id, p_observacao: 'Obsoleta' }), 'Antigo responsável não age após concorrência');
    if (raceState.status === 'aprovada') await ok(substituto.client.rpc('transicionar_solicitacao', { p_id: race.id, p_status: 'em_atendimento' }), 'Novo responsável inicia');
    const [finished, racedNote] = await Promise.all([
      substituto.client.rpc('transicionar_solicitacao', { p_id: race.id, p_status: 'concluida' }),
      gestor.client.rpc('adicionar_observacao', { p_id: race.id, p_observacao: 'Concorrente' }),
    ]);
    check(!finished.error && (!racedNote.error || racedNote.error.code === '42501'), 'Encerramento e observação têm resultado serializável.');
    const raceHistory = await history(cliente.client, race.id);
    const finishIndex = raceHistory.findIndex(event => event.status_novo === 'concluida');
    const noteIndex = raceHistory.findIndex(event => event.observacao === 'Concorrente');
    check(finishIndex >= 0 && (racedNote.error ? noteIndex === -1 : noteIndex >= 0 && noteIndex < finishIndex), 'Nenhuma observação fica posterior ao encerramento.');
  }

  // A fixture-scoped constraint causes a real event write failure. It cannot
  // affect non-fixture requests and is always removed, including on failure.
  const constraint = `rls_fixture_${randomUUID().replaceAll('-', '')}`;
  constraints.push(constraint);
  const beforeFailure = await history(cliente.client, incomplete.id);
  const rollbackRequest = await ok(cliente.client.rpc('abrir_solicitacao', { p_titulo: 'Atomicidade', p_descricao: 'd', p_local: 'l' }), 'Preparar atomicidade');
  await sql(`alter table public.historico add constraint ${constraint} check (not (solicitacao_id='${rollbackRequest.id}' and tipo='alteracao_status')) not valid`);
  await denied(gestor.client.rpc('transicionar_solicitacao', { p_id: rollbackRequest.id, p_status: 'aprovada' }), 'Falha real de evento aborta alteração', ['23514']);
  const [rolledBack] = await rows(cliente.client, 'solicitacoes', rollbackRequest.id);
  check(rolledBack.status === 'pendente' && (await history(cliente.client, rollbackRequest.id)).length === 1, 'Estado e histórico preservados após rollback.');
  check((await history(cliente.client, incomplete.id)).length === beforeFailure.length, 'Falha isolada não altera outro histórico.');
  await sql(`alter table public.historico drop constraint ${constraint}`);
  constraints.pop();

  // Failure of the second event must also roll back the first event and both
  // organization fields, rather than leaving a partially audited operation.
  const organizationConstraint = `rls_fixture_${randomUUID().replaceAll('-', '')}`;
  constraints.push(organizationConstraint);
  await sql(`alter table public.historico add constraint ${organizationConstraint} check (not (solicitacao_id='${incomplete.id}' and tipo='alteracao_responsavel')) not valid`);
  const beforeOrganizationFailure = await history(cliente.client, incomplete.id);
  await denied(gestor.client.rpc('organizar_solicitacao', { p_id: incomplete.id, p_prioridade: 'alta', p_responsavel_id: manutentor.id }), 'Falha do segundo evento desfaz organização inteira', ['23514']);
  const [unchangedOrganization] = await rows(cliente.client, 'solicitacoes', incomplete.id);
  check(unchangedOrganization.prioridade === null && unchangedOrganization.responsavel_id === null, 'Ambos os campos preservados após falha do segundo evento.');
  assert.deepEqual(await history(cliente.client, incomplete.id), beforeOrganizationFailure);
  checks++;
  await sql(`alter table public.historico drop constraint ${organizationConstraint}`);
  constraints.pop();

  await ok(gestor.client.rpc('organizar_solicitacao', { p_id: incomplete.id, p_prioridade: 'alta', p_responsavel_id: manutentor.id }), 'Atribuição para testar inativação');
  for (const fixture of [cliente, gestor, manutentor]) {
    await sql(`update public.profiles set ativo=false where id='${fixture.id}'`);
    for (const table of ['profiles', 'solicitacoes', 'historico']) {
      const result = await ok(fixture.client.from(table).select('id'), 'Consulta de perfil inativo');
      check(result.length === 0, 'Sessão válida inativa não obtém dados.');
    }
    for (const [rpc, args] of [
      ['abrir_solicitacao', { p_titulo: 't', p_descricao: 'd', p_local: 'l' }],
      ['transicionar_solicitacao', { p_id: incomplete.id, p_status: 'em_atendimento' }],
      ['organizar_solicitacao', { p_id: incomplete.id, p_prioridade: 'alta', p_responsavel_id: substituto.id }],
      ['adicionar_observacao', { p_id: incomplete.id, p_observacao: 'Não permitido' }],
    ]) await denied(fixture.client.rpc(rpc, args), 'Inativação bloqueia todas as escritas');
    if (fixture === manutentor) {
      const [preserved] = await rows(gestor.client, 'solicitacoes', incomplete.id);
      check(preserved.responsavel_id === manutentor.id, 'Inativação preserva atribuição existente.');
      await denied(gestor.client.rpc('organizar_solicitacao', { p_id: rollbackRequest.id, p_prioridade: 'alta', p_responsavel_id: manutentor.id }), 'Pendente não aceita nova atribuição a inativo');
      await ok(gestor.client.rpc('transicionar_solicitacao', { p_id: rollbackRequest.id, p_status: 'aprovada' }), 'Preparar atribuição inválida');
      await denied(gestor.client.rpc('organizar_solicitacao', { p_id: rollbackRequest.id, p_prioridade: 'alta', p_responsavel_id: manutentor.id }), 'Não atribui Manutentor inativo', ['23514']);
      check((await rows(cliente.client, 'profiles', manutentor.id)).length === 1, 'Referência histórica de pessoa inativa permanece visível.');
    }
    await sql(`update public.profiles set ativo=true where id='${fixture.id}'`);
  }
  await sql(`delete from public.profiles where id='${outro.id}'`);
  for (const table of ['profiles', 'solicitacoes', 'historico']) {
    check((await ok(outro.client.from(table).select('id'), 'Perfil ausente não acessa')).length === 0, 'Perfil ausente tem leitura vazia.');
  }
  await denied(outro.client.rpc('abrir_solicitacao', { p_titulo: 't', p_descricao: 'd', p_local: 'l' }), 'Perfil ausente não escreve');
  console.log(`${environment}: ${checks} verificações reais de RLS aprovadas.`);
} catch (error) {
  console.error(error instanceof assert.AssertionError ? error.message : 'Falha na integração RLS; confira ambiente e conectividade.');
  process.exitCode = 1;
} finally {
  if (fixtures.length) {
    try {
      const ids = fixtures.map(({ id }) => `'${id}'`).join(',');
      for (const constraint of constraints) await sql(`alter table public.historico drop constraint if exists ${constraint}`);
      await sql(`begin; set local session_replication_role=replica;
        delete from public.historico where solicitacao_id in (select id from public.solicitacoes where solicitante_id in (${ids}));
        set local session_replication_role=origin;
        delete from public.solicitacoes where solicitante_id in (${ids});
        delete from auth.sessions where user_id in (${ids});
        delete from public.profiles where id in (${ids});
        delete from auth.users where id in (${ids}); commit;`);
      const remaining = await sql(`select count(*)::int as count from auth.users where id in (${ids})`);
      assert.equal(remaining[0].count, 0);
      const orphans = await sql(`select
        (select count(*) from auth.identities where user_id in (${ids}))::int as identities,
        (select count(*) from auth.refresh_tokens where user_id in (${ids}))::int as refresh_tokens,
        (select count(*) from auth.sessions where user_id in (${ids}))::int as sessions,
        (select count(*) from public.profiles where id in (${ids}))::int as profiles`);
      assert(Object.values(orphans[0]).every(count => count === 0));
      console.log(`${environment}: fixtures RLS removidas.`);
    } catch {
      console.error('Limpeza incompleta das fixtures RLS; revisar antes de prosseguir.');
      process.exitCode = 1;
    }
  }
}
