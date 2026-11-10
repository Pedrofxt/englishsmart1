// Edge Function "mercadopago" — assinatura mensal do English Smart
//
// Chamadas do site (com o login do aluno no cabeçalho Authorization):
//   { acao: 'criar', email?, voltar? }  → cria a assinatura no Mercado Pago e devolve o link de pagamento
//   { acao: 'sincronizar' }             → consulta o Mercado Pago e atualiza o acesso do aluno
//   { acao: 'cancelar' }                → cancela a renovação (o acesso continua até o fim do mês pago)
//
// Avisos do Mercado Pago (webhook): tópicos subscription_preapproval e subscription_authorized_payment.
// Nunca confiamos no conteúdo do aviso: sempre buscamos os dados direto na API do Mercado Pago.
//
// Segredos (Supabase → Edge Functions → Secrets):
//   MP_ACCESS_TOKEN    Access Token da sua aplicação no Mercado Pago (obrigatório)
//   MP_WEBHOOK_SECRET  Assinatura secreta dos webhooks (recomendado)
//   PLANO_VALOR        opcional, padrão 29.99

import { createClient } from 'npm:@supabase/supabase-js@2.45.4';

const MP = 'https://api.mercadopago.com';
const VALOR = Number(Deno.env.get('PLANO_VALOR') || '29.99');
const TOKEN = Deno.env.get('MP_ACCESS_TOKEN') || '';
const SEGREDO_WEBHOOK = Deno.env.get('MP_WEBHOOK_SECRET') || '';
const CHAVE_SERVICO = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const db = createClient(Deno.env.get('SUPABASE_URL')!, CHAVE_SERVICO, { auth: { persistSession: false } });

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (dados: unknown, status = 200) =>
  new Response(JSON.stringify(dados), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

async function mp(caminho: string, init: RequestInit = {}) {
  const r = await fetch(MP + caminho, {
    ...init,
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json', ...(init.headers || {}) },
  });
  const corpo = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`Mercado Pago ${r.status}: ${corpo?.message || JSON.stringify(corpo).slice(0, 200)}`);
  return corpo;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const STATUS: Record<string, string> = { authorized: 'ativa', paused: 'pausada', cancelled: 'cancelada', pending: 'pendente' };
const maisUmMes = (d: string | Date) => { const x = new Date(d); x.setMonth(x.getMonth() + 1); x.setDate(x.getDate() + 3); return x; }; // +3 dias de tolerância
const maior = (a?: string | null, b?: Date | null) => (!a ? b : !b ? new Date(a) : new Date(Math.max(new Date(a).getTime(), b.getTime())));

// Grava no banco o estado de uma assinatura (preapproval) vinda da API do Mercado Pago
async function aplicarAssinatura(pre: any) {
  const aluno = String(pre.external_reference || '');
  if (!UUID.test(aluno)) return null;
  const { data: atual } = await db.from('assinaturas').select('*').eq('aluno_id', aluno).maybeSingle();
  // ignora avisos de uma assinatura antiga que já foi trocada por outra
  if (atual?.mp_id && atual.mp_id !== pre.id && pre.status !== 'authorized') return atual;

  let pagoAte: Date | null = null;
  const ultima = pre.summarized?.last_charged_date;
  if (ultima) pagoAte = maisUmMes(ultima);
  else if (pre.status === 'authorized') { pagoAte = new Date(); pagoAte.setDate(pagoAte.getDate() + 2); } // cartão aprovado, 1ª cobrança a caminho

  const linha = {
    aluno_id: aluno,
    mp_id: pre.id,
    status: STATUS[pre.status] || 'pendente',
    valor: pre.auto_recurring?.transaction_amount ?? VALOR,
    email_pagador: pre.payer_email || atual?.email_pagador || null,
    proxima_cobranca: pre.next_payment_date || null,
    pago_ate: maior(atual?.pago_ate, pagoAte)?.toISOString() ?? null,
    atualizada_em: new Date().toISOString(),
  };
  const { data, error } = await db.from('assinaturas').upsert(linha, { onConflict: 'aluno_id' }).select().single();
  if (error) throw error;
  return data;
}

// Grava uma cobrança mensal (authorized_payment)
async function aplicarCobranca(cob: any) {
  const pre = await mp(`/preapproval/${cob.preapproval_id}`);
  const aluno = String(pre.external_reference || '');
  if (!UUID.test(aluno)) return;
  const aprovado = cob.payment?.status === 'approved' || cob.status === 'processed' && cob.payment?.status !== 'rejected' && !!cob.payment?.id;
  await db.from('pagamentos').upsert({
    id: String(cob.id),
    aluno_id: aluno,
    valor: cob.transaction_amount ?? VALOR,
    status: aprovado ? 'aprovado' : (cob.payment?.status || cob.status || 'pendente'),
    pago_em: aprovado ? (cob.date_created || cob.debit_date || new Date().toISOString()) : null,
  }, { onConflict: 'id' });
  await aplicarAssinatura(pre);
  if (aprovado) {
    const { data: atual } = await db.from('assinaturas').select('pago_ate').eq('aluno_id', aluno).maybeSingle();
    const ate = maior(atual?.pago_ate, maisUmMes(cob.debit_date || cob.date_created || new Date()));
    await db.from('assinaturas').update({ pago_ate: ate?.toISOString(), atualizada_em: new Date().toISOString() }).eq('aluno_id', aluno);
  }
}

// Confere a assinatura secreta do webhook (x-signature: ts=...,v1=...)
async function assinaturaValida(req: Request, idDado: string) {
  if (!SEGREDO_WEBHOOK) return true; // sem segredo configurado: segue, pois os dados são sempre buscados na API
  const cab = req.headers.get('x-signature') || '';
  const partes = Object.fromEntries(cab.split(',').map((p) => p.trim().split('=')));
  if (!partes.ts || !partes.v1) return false;
  const id = /^[a-z0-9]+$/i.test(idDado) ? idDado.toLowerCase() : idDado;
  const manifesto = `id:${id};request-id:${req.headers.get('x-request-id') || ''};ts:${partes.ts};`;
  const chave = await crypto.subtle.importKey('raw', new TextEncoder().encode(SEGREDO_WEBHOOK), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const assin = await crypto.subtle.sign('HMAC', chave, new TextEncoder().encode(manifesto));
  const hex = [...new Uint8Array(assin)].map((b) => b.toString(16).padStart(2, '0')).join('');
  return hex === partes.v1;
}

async function webhook(req: Request, url: URL, corpo: any) {
  const tipo = corpo?.type || corpo?.topic || url.searchParams.get('type') || url.searchParams.get('topic') || '';
  const id = String(url.searchParams.get('data.id') || corpo?.data?.id || corpo?.id || '');
  if (!id) return json({ ok: true, ignorado: 'sem id' });
  if (!(await assinaturaValida(req, id))) return json({ erro: 'assinatura inválida' }, 401);
  if (!TOKEN) return json({ ok: true, ignorado: 'MP_ACCESS_TOKEN não configurado' });
  try {
    if (tipo === 'subscription_preapproval' || tipo === 'preapproval') await aplicarAssinatura(await mp(`/preapproval/${id}`));
    else if (tipo === 'subscription_authorized_payment' || tipo === 'authorized_payment') await aplicarCobranca(await mp(`/authorized_payments/${id}`));
    return json({ ok: true });
  } catch (e) {
    console.error('[webhook]', tipo, id, String(e));
    return json({ erro: String(e) }, 500); // o Mercado Pago tenta de novo mais tarde
  }
}

async function acaoDoAluno(req: Request, corpo: any) {
  const jwt = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
  const { data: u } = await db.auth.getUser(jwt);
  const user = u?.user;
  if (!user) return json({ erro: 'Entre na sua conta para assinar.' }, 401);
  const { data: aluno } = await db.from('alunos').select('id, nome, email').eq('id', user.id).maybeSingle();
  if (!aluno) return json({ erro: 'Apenas alunos podem assinar.' }, 403);
  if (!TOKEN) return json({ erro: 'Pagamentos ainda não configurados. Avise o responsável pela plataforma.' }, 503);
  const { data: atual } = await db.from('assinaturas').select('*').eq('aluno_id', user.id).maybeSingle();

  if (corpo.acao === 'criar') {
    if (atual?.status === 'ativa' && atual.mp_id) return json({ erro: 'Sua assinatura já está ativa.' }, 409);
    const email = String(corpo.email || user.email || '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ erro: 'Informe um e-mail válido.' }, 400);
    const voltar = /^https:\/\//.test(corpo.voltar || '') ? corpo.voltar : 'https://www.mercadopago.com.br';
    // assinatura pendente antiga: cancela para não ficar duplicada
    if (atual?.mp_id && atual.status === 'pendente') await mp(`/preapproval/${atual.mp_id}`, { method: 'PUT', body: JSON.stringify({ status: 'cancelled' }) }).catch(() => {});
    const pre = await mp('/preapproval', {
      method: 'POST',
      body: JSON.stringify({
        reason: 'English Smart Premium (mensal)',
        external_reference: user.id,
        payer_email: email,
        back_url: voltar,
        status: 'pending',
        auto_recurring: { frequency: 1, frequency_type: 'months', transaction_amount: VALOR, currency_id: 'BRL' },
      }),
    });
    await db.from('assinaturas').upsert({
      aluno_id: user.id, mp_id: pre.id, status: 'pendente', valor: VALOR, email_pagador: email,
      atualizada_em: new Date().toISOString(),
    }, { onConflict: 'aluno_id' });
    return json({ link: pre.init_point || pre.sandbox_init_point, id: pre.id });
  }

  if (corpo.acao === 'sincronizar') {
    if (!atual?.mp_id) return json({ assinatura: atual || null });
    return json({ assinatura: await aplicarAssinatura(await mp(`/preapproval/${atual.mp_id}`)) });
  }

  if (corpo.acao === 'cancelar') {
    if (!atual?.mp_id || atual.status === 'cancelada') return json({ erro: 'Não há assinatura ativa para cancelar.' }, 400);
    const pre = await mp(`/preapproval/${atual.mp_id}`, { method: 'PUT', body: JSON.stringify({ status: 'cancelled' }) });
    return json({ assinatura: await aplicarAssinatura(pre) });
  }

  return json({ erro: 'Ação inválida.' }, 400);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ ok: true, servico: 'English Smart · Mercado Pago' });
  const url = new URL(req.url);
  const corpo = await req.json().catch(() => ({}));
  try {
    if (corpo?.acao) return await acaoDoAluno(req, corpo);
    return await webhook(req, url, corpo);
  } catch (e) {
    console.error('[mercadopago]', String(e));
    return json({ erro: 'Não foi possível falar com o Mercado Pago agora. Tente de novo em instantes.', detalhe: String(e) }, 502);
  }
});
