// Prepara o Supabase LOCAL para a demonstração do painel administrativo.
// Uso: npm run demo:preparar
//
// Cria 4 contas (Gestor, 2 Manutentores e 1 Cliente) e 6 solicitações em estados diferentes.
// Só funciona no ambiente local: a chave administrativa é lida do "supabase status" da sua máquina.
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { getLocalDemoConfig } from './demo-config.mjs';
import { createClient } from '@supabase/supabase-js';

// 1) Configuração do Supabase local
const env = parseEnv(readFileSync('.env.supabase.local', 'utf8'));
const status = execSync('npx supabase status -o env', { encoding: 'utf8' });
const { url, publishableKey: chavePublica, adminKey: chaveAdmin } = getLocalDemoConfig(env, status);
const admin = createClient(url, chaveAdmin, { auth: { persistSession: false } });

// 2) Contas da demonstração
const contas = [
  { nome: 'Gabriela Gestora', email: 'gestor@fixit.local', senha: 'gestor123', papel: 'gestor' },
  { nome: 'Marcos Manutentor', email: 'manutentor@fixit.local', senha: 'manut123', papel: 'manutentor' },
  { nome: 'Nina Manutentora', email: 'manutentor2@fixit.local', senha: 'manut123', papel: 'manutentor' },
  { nome: 'Carla Cliente', email: 'cliente@fixit.local', senha: 'cliente123', papel: 'cliente' },
];

for (const conta of contas) {
  const { error } = await admin.auth.admin.createUser({
    email: conta.email,
    password: conta.senha,
    email_confirm: true,
    user_metadata: { nome: conta.nome },
    // O papel vem do app_metadata (só o admin consegue definir). Sem ele, a conta vira Cliente.
    app_metadata: conta.papel === 'cliente' ? {} : { fixit_papel: conta.papel },
  });
  if (error && error.code !== 'email_exists') throw error;
  console.log(error ? `Já existia: ${conta.email}` : `Conta criada: ${conta.email} (${conta.papel})`);
}

// Faz login como uma pessoa e devolve o cliente Supabase dela (as RPCs usam essa sessão)
async function entrarComo(email, senha) {
  const supabase = createClient(url, chavePublica, { auth: { persistSession: false } });
  const { data, error } = await supabase.auth.signInWithPassword({ email, password: senha });
  if (error) throw error;
  return { supabase, id: data.user.id };
}

async function rpc(pessoa, nome, parametros) {
  const { data, error } = await pessoa.supabase.rpc(nome, parametros);
  if (error) throw new Error(`${nome}: ${error.message}`);
  return data;
}

const cliente = await entrarComo('cliente@fixit.local', 'cliente123');
const gestor = await entrarComo('gestor@fixit.local', 'gestor123');
const marcos = await entrarComo('manutentor@fixit.local', 'manut123');
const nina = await entrarComo('manutentor2@fixit.local', 'manut123');

// 3) Solicitações (só cria se a Cliente ainda não tiver nenhuma, para não duplicar)
const { count } = await cliente.supabase.from('solicitacoes').select('id', { count: 'exact', head: true });
if (count > 0) {
  console.log('Solicitações da demonstração já existem. Para recomeçar do zero: npm run demo:resetar');
  process.exit(0);
}

const abrir = (titulo, descricao, local) =>
  rpc(cliente, 'abrir_solicitacao', { p_titulo: titulo, p_descricao: descricao, p_local: local });

// Concluída: passou pelo fluxo inteiro
const s1 = await abrir('Lâmpada queimada', 'A lâmpada do corredor não acende desde ontem.', 'Bloco C - Corredor 2');
await rpc(gestor, 'transicionar_solicitacao', { p_id: s1.id, p_status: 'aprovada' });
await rpc(gestor, 'organizar_solicitacao', { p_id: s1.id, p_prioridade: 'baixa', p_responsavel_id: marcos.id });
await rpc(marcos, 'transicionar_solicitacao', { p_id: s1.id, p_status: 'em_atendimento' });
await rpc(marcos, 'adicionar_observacao', { p_id: s1.id, p_observacao: 'Lâmpada trocada por uma de LED.' });
await rpc(marcos, 'transicionar_solicitacao', { p_id: s1.id, p_status: 'concluida' });

// Em atendimento com a Nina
const s2 = await abrir('Ar-condicionado pingando', 'Água escorrendo na parede da sala.', 'Sala 104');
await rpc(gestor, 'transicionar_solicitacao', { p_id: s2.id, p_status: 'aprovada' });
await rpc(gestor, 'organizar_solicitacao', { p_id: s2.id, p_prioridade: 'media', p_responsavel_id: nina.id });
await rpc(nina, 'transicionar_solicitacao', { p_id: s2.id, p_status: 'em_atendimento' });

// Descartada
const s3 = await abrir('Cadeira com cor feia', 'Gostaria de trocar a cor da cadeira.', 'Sala 210');
await rpc(gestor, 'transicionar_solicitacao', { p_id: s3.id, p_status: 'descartada' });

// Pendentes: usadas ao vivo na demonstração
await abrir('Vazamento na pia', 'A pia da copa está vazando sem parar.', 'Copa - 2º andar');
await abrir('Porta emperrada', 'A porta do laboratório não fecha.', 'Laboratório 3');
await abrir('Tomada solta', 'A tomada está se soltando da parede.', 'Sala 305');

console.log('Pronto! 6 solicitações criadas. Rode "npm run dev" e abra http://127.0.0.1:3000/painel/entrar');
