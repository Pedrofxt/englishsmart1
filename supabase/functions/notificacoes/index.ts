// Edge Function "notificacoes" — lembrete diário de estudo por notificação (Web Push)
//
// Quem chama:
//   • o agendamento do banco (pg_cron) todo dia às 10h de Brasília (13h UTC), com o cabeçalho x-cron
//     → envia para TODOS os alunos que ativaram as notificações;
//   • qualquer aluno logado com { "teste": true } → envia uma notificação de teste só para os aparelhos dele;
//   • o professor (admin) com { "todos": true } → dispara o envio geral na hora.
//
// As chaves VAPID ficam na tabela config_privada (vapid_publica / vapid_privada), que só o servidor lê.

import { createClient } from 'npm:@supabase/supabase-js@2.45.4';
import webpush from 'npm:web-push@3.6.7';

const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '', { auth: { persistSession: false } });
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const json = (d: unknown, status = 200) => new Response(JSON.stringify(d), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
const diaBR = (d: Date | string) => new Date(d).toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' }); // AAAA-MM-DD

type Insc = { endpoint: string; aluno_id: string; p256dh: string; auth: string; falhas: number };

async function config(chave: string) {
  const { data } = await db.from('config_privada').select('valor').eq('chave', chave).maybeSingle();
  return data?.valor || '';
}

// Quem está chamando: 'cron', 'admin', 'aluno' (com o id) ou null
async function quem(req: Request): Promise<{ tipo: string; id?: string } | null> {
  const cron = req.headers.get('x-cron');
  if (cron) return cron === (await config('cron_segredo')) ? { tipo: 'cron' } : null;
  const jwt = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
  const { data: u } = await db.auth.getUser(jwt);
  if (!u?.user) return null;
  const email = (u.user.email || '').toLowerCase();
  const { data: adm } = email ? await db.from('admins').select('email').eq('email', email).maybeSingle() : { data: null };
  return { tipo: adm ? 'admin' : 'aluno', id: u.user.id };
}

// Dias seguidos de estudo até ontem (ou até hoje, se já estudou hoje)
function sequencia(dias: Set<string>) {
  const hoje = diaBR(new Date());
  const um = 864e5;
  let d = new Date(hoje + 'T12:00:00Z');
  if (!dias.has(hoje)) d = new Date(d.getTime() - um);
  let n = 0;
  while (dias.has(d.toISOString().slice(0, 10))) { n++; d = new Date(d.getTime() - um); }
  return n;
}

const FRASES = [
  ['Hora do inglês! ☕', 'Só 10 minutinhos hoje já fazem diferença. Bora para a próxima lição?'],
  ['Good morning! 🇬🇧', 'Sua lição de hoje está esperando. Que tal praticar agora?'],
  ['Inglês do dia 🚀', 'Pratique um pouco hoje e chegue mais perto da fluência.'],
  ['Let\'s practice! 🎧', 'Ouça, fale e revise: sua aula de hoje leva poucos minutos.'],
];

function mensagem(nome: string, seq: number, estudouHoje: boolean, diasSemEstudar: number) {
  const p = (String(nome || '').trim().split(/\s+/)[0] || '').slice(0, 20);
  const oi = p ? `${p}, ` : '';
  if (estudouHoje) return { title: 'Você já estudou hoje! 🎉', body: `${oi}que tal uma revisão rápida para fixar o que aprendeu?` };
  if (seq >= 2) return { title: `🔥 ${seq} dias seguidos!`, body: `${oi}estude hoje para não perder sua sequência.` };
  if (diasSemEstudar >= 3 && diasSemEstudar < 999) return { title: 'Sentimos sua falta! 💙', body: `${oi}seu progresso está guardado. Volte hoje com uma lição rapidinha.` };
  const [t, b] = FRASES[new Date().getUTCDate() % FRASES.length];
  return { title: t, body: p ? `${p}, ${b.charAt(0).toLowerCase()}${b.slice(1)}` : b };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ ok: true, servico: 'English Smart · notificações' });
  const q = await quem(req);
  if (!q) return json({ erro: 'Não autorizado.' }, 401);
  const corpo = await req.json().catch(() => ({}));

  const pub = await config('vapid_publica'), priv = await config('vapid_privada');
  if (!pub || !priv) return json({ erro: 'Chaves VAPID não configuradas.' }, 500);
  webpush.setVapidDetails('https://englishsmart.app.br', pub, priv);

  // quem recebe
  const teste = q.tipo !== 'cron' && !(q.tipo === 'admin' && corpo.todos);
  let sel = db.from('push_inscricoes').select('endpoint, aluno_id, p256dh, auth, falhas');
  if (teste) sel = sel.eq('aluno_id', q.id!);
  const { data: inscs, error } = await sel.limit(20000);
  if (error) return json({ erro: error.message }, 500);
  const lista = (inscs || []) as Insc[];
  if (!lista.length) return json({ ok: true, enviados: 0, aviso: teste ? 'Nenhum aparelho seu está com as notificações ativadas.' : 'Ninguém ativou as notificações ainda.' });

  // dados para personalizar (nome, sequência, se já estudou hoje)
  const ids = [...new Set(lista.map((i) => i.aluno_id))];
  const desde = new Date(Date.now() - 60 * 864e5).toISOString();
  const nomes = new Map<string, string>(), dias = new Map<string, Set<string>>();
  const ultimo = new Map<string, string>();
  for (let i = 0; i < ids.length; i += 200) {
    const parte = ids.slice(i, i + 200);
    const [a, p, r, d] = await Promise.all([
      db.from('alunos').select('id, nome').in('id', parte),
      db.from('progresso').select('aluno_id, atualizada_em').in('aluno_id', parte).gte('atualizada_em', desde),
      db.from('sessoes_revisao').select('aluno_id, feita_em').in('aluno_id', parte).gte('feita_em', desde),
      db.from('dias_protegidos').select('aluno_id, dia').in('aluno_id', parte),
    ]);
    for (const x of a.data || []) nomes.set(x.id, x.nome);
    const marca = (id: string, dt: string, real = true) => {
      const s = dias.get(id) || new Set<string>(); const k = dt.length === 10 ? dt : diaBR(dt); s.add(k); dias.set(id, s);
      if (real && (!ultimo.get(id) || k > ultimo.get(id)!)) ultimo.set(id, k);
    };
    for (const x of p.data || []) if (x.atualizada_em) marca(x.aluno_id, x.atualizada_em);
    for (const x of r.data || []) if (x.feita_em) marca(x.aluno_id, x.feita_em);
    for (const x of d.data || []) if (x.dia) marca(x.aluno_id, String(x.dia), false);
  }

  const hoje = diaBR(new Date());
  let enviados = 0, removidos = 0;
  const falhas: string[] = [];
  const envia = async (i: Insc) => {
    const ds = dias.get(i.aluno_id) || new Set<string>();
    const ult = ultimo.get(i.aluno_id);
    const semEstudar = ult ? Math.round((new Date(hoje).getTime() - new Date(ult).getTime()) / 864e5) : 999;
    const m = teste
      ? { title: 'Notificações ativadas ✅', body: 'Pronto! Todo dia às 10h você recebe um lembrete para estudar inglês.' }
      : mensagem(nomes.get(i.aluno_id) || '', sequencia(ds), ds.has(hoje) && ult === hoje, semEstudar);
    const payload = JSON.stringify({ ...m, url: './#/curso', tag: 'lembrete-diario' });
    try {
      await webpush.sendNotification({ endpoint: i.endpoint, keys: { p256dh: i.p256dh, auth: i.auth } }, payload, { TTL: 8 * 3600, urgency: 'normal', topic: 'lembrete' });
      enviados++;
      if (i.falhas) await db.from('push_inscricoes').update({ falhas: 0 }).eq('endpoint', i.endpoint);
    } catch (e) {
      const st = (e as { statusCode?: number }).statusCode || 0;
      if (st === 404 || st === 410 || i.falhas >= 4) { await db.from('push_inscricoes').delete().eq('endpoint', i.endpoint); removidos++; }
      else await db.from('push_inscricoes').update({ falhas: i.falhas + 1 }).eq('endpoint', i.endpoint);
      if (falhas.length < 20) falhas.push(`${st || (e as Error).message}`);
    }
  };
  for (let i = 0; i < lista.length; i += 50) await Promise.all(lista.slice(i, i + 50).map(envia));
  return json({ ok: true, enviados, removidos, falhas });
});
