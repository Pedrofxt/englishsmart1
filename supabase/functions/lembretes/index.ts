// Edge Function "lembretes" — e-mails de vencimento do acesso (roda uma vez por dia)
//
// Quem recebe: alunos sem renovação automática (Pix, cortesia ou cartão cancelado) cujo acesso
// vence em 3 dias, em 1 dia, ou que venceu nas últimas 24 horas. Cada lembrete é enviado uma vez só.
//
// Quem chama: o agendamento diário do banco (pg_cron) com o cabeçalho x-cron, ou o professor
// pelo portal ("Enviar lembretes agora"), com o login dele.
//
// Segredos (Supabase → Edge Functions → Secrets):
//   RESEND_API_KEY    chave do Resend (https://resend.com) para enviar e-mails (obrigatório para enviar)
//   EMAIL_REMETENTE   ex.: "English Smart <contato@englishsmart.app.br>" (domínio verificado no Resend)
//   SITE_URL          endereço do site, padrão https://englishsmart.app.br

import { createClient } from 'npm:@supabase/supabase-js@2.45.4';

const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '', { auth: { persistSession: false } });
const RESEND = Deno.env.get('RESEND_API_KEY') || '';
const REMETENTE = Deno.env.get('EMAIL_REMETENTE') || 'English Smart <onboarding@resend.dev>';
const SITE = (Deno.env.get('SITE_URL') || 'https://englishsmart.app.br').replace(/\/$/, '');
const TOLERANCIA = 3 * 864e5; // pago_ate guarda o vencimento + 3 dias de tolerância

const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const json = (d: unknown, status = 200) => new Response(JSON.stringify(d), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
const esc = (t: string) => String(t || '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
const dataBR = (d: Date) => d.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: 'long' });

function mensagem(tipo: string, nome: string, vence: Date, nivel: number | null) {
  const primeiro = esc(String(nome || '').split(' ')[0] || 'aluno');
  const link = `${SITE}/#/planos?metodo=pix`;
  const nivelTxt = nivel ? ` no nível ${nivel}` : '';
  const textos: Record<string, [string, string]> = {
    '3d': [`Seu acesso ao English Smart vence em 3 dias`, `Seu acesso vence em <b>${dataBR(vence)}</b>. Renove agora para continuar estudando${nivelTxt} sem interrupção. Os dias novos somam aos que ainda faltam.`],
    '1d': [`Último dia: seu acesso ao English Smart vence amanhã`, `Seu acesso vence <b>amanhã (${dataBR(vence)})</b>. Renove com Pix em menos de um minuto e mantenha sua sequência de estudos.`],
    venceu: [`Seu acesso ao English Smart venceu`, `Seu acesso venceu em <b>${dataBR(vence)}</b>. Seu nível, seu progresso e seus certificados continuam guardados: é só renovar para voltar de onde parou${nivelTxt}. Você ainda tem 3 dias de tolerância.`],
  };
  const [assunto, corpo] = textos[tipo];
  const html = `<div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:auto;color:#334155">
  <div style="background:#00174F;color:#fff;padding:20px 24px;border-radius:16px 16px 0 0;font-size:20px;font-weight:bold">English <span style="color:#EB1F3B">Smart</span></div>
  <div style="border:1px solid #e2e8f0;border-top:0;padding:24px;border-radius:0 0 16px 16px">
    <p>Olá, ${primeiro}!</p><p>${corpo}</p>
    <p style="margin:28px 0"><a href="${link}" style="background:#EB1F3B;color:#fff;text-decoration:none;padding:14px 24px;border-radius:12px;font-weight:bold">Renovar meu acesso</a></p>
    <p style="font-size:12px;color:#94a3b8">Você recebeu este e-mail porque tem uma conta no English Smart. Pagamentos no cartão renovam sozinhos e não recebem este aviso.</p>
  </div></div>`;
  return { assunto, html };
}

async function autorizado(req: Request) {
  const cron = req.headers.get('x-cron');
  if (cron) {
    const { data } = await db.from('config_privada').select('valor').eq('chave', 'cron_segredo').maybeSingle();
    return !!data && data.valor === cron;
  }
  const jwt = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
  const { data: u } = await db.auth.getUser(jwt);
  if (!u?.user?.email) return false;
  const { data: adm } = await db.from('admins').select('email').eq('email', u.user.email.toLowerCase()).maybeSingle();
  return !!adm;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ ok: true, servico: 'English Smart · lembretes' });
  if (!(await autorizado(req))) return json({ erro: 'Não autorizado.' }, 401);
  if (!RESEND) return json({ ok: true, enviados: 0, aviso: 'RESEND_API_KEY não configurado: nenhum e-mail enviado.' });

  const agora = Date.now();
  // vencimento = pago_ate - tolerância; janela: venceu nas últimas 24 h até vencer em ~3 dias
  const { data: lista, error } = await db.from('assinaturas')
    .select('aluno_id, pago_ate, status')
    .gte('pago_ate', new Date(agora + TOLERANCIA - 864e5).toISOString())
    .lte('pago_ate', new Date(agora + TOLERANCIA + 3.5 * 864e5).toISOString());
  if (error) return json({ erro: error.message }, 500);

  let enviados = 0;
  const falhas: string[] = [];
  for (const a of lista || []) {
    if (a.status === 'ativa') continue; // cartão renova sozinho
    const vence = new Date(new Date(a.pago_ate).getTime() - TOLERANCIA);
    const horas = (vence.getTime() - agora) / 3600e3;
    const tipo = horas <= 0 ? 'venceu' : horas <= 36 ? '1d' : horas <= 84 ? '3d' : null;
    if (!tipo) continue;
    const ref = vence.toISOString().slice(0, 10);
    // registra antes de enviar: se outro agendamento rodar junto, só um envia
    const { data: novo } = await db.from('lembretes_enviados').upsert({ aluno_id: a.aluno_id, tipo, ref }, { onConflict: 'aluno_id,tipo,ref', ignoreDuplicates: true }).select('aluno_id');
    if (!novo?.length) continue;
    const { data: aluno } = await db.from('alunos').select('nome, email, nivel_num').eq('id', a.aluno_id).maybeSingle();
    if (!aluno?.email) continue;
    const { assunto, html } = mensagem(tipo, aluno.nome, vence, aluno.nivel_num);
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: REMETENTE, to: [aluno.email], subject: assunto, html }),
    });
    if (r.ok) enviados++;
    else {
      falhas.push(`${aluno.email}: ${r.status}`);
      await db.from('lembretes_enviados').delete().eq('aluno_id', a.aluno_id).eq('tipo', tipo).eq('ref', ref); // tenta de novo amanhã
    }
  }
  return json({ ok: true, enviados, falhas });
});
