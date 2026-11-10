// Edge Function "mercadopago" — assinatura mensal do English Smart
//
// Chamadas do site (com o login do aluno no cabeçalho Authorization):
//   { acao: 'criar', email?, voltar? }  → cria a assinatura no Mercado Pago e devolve o link de pagamento
//   { acao: 'sincronizar' }             → consulta o Mercado Pago e atualiza o acesso do aluno
//   { acao: 'cancelar' }                → cancela a renovação (o acesso continua até o fim do mês pago)
//   { acao: 'pix', email? }             → gera um Pix (QR Code + copia e cola) que libera 30 dias de Premium
//   { acao: 'pix_status', id }          → confere se o Pix foi pago
//
// Avisos do Mercado Pago (webhook): subscription_preapproval, subscription_authorized_payment e payment (Pix).
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

const DIAS_PIX = Number(Deno.env.get('PIX_DIAS') || '30');
const MINUTOS_PIX = 30; // validade do QR Code
const URL_FUNCAO = `${Deno.env.get('SUPABASE_URL')}/functions/v1/mercadopago`;
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
    ultimo_metodo: pre.status === 'authorized' ? 'cartao' : atual?.ultimo_metodo ?? null,
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

// ---------- PIX ----------
// Data no formato que o Mercado Pago pede (yyyy-MM-ddTHH:mm:ss.000-03:00), no horário de Brasília
function dataMP(d: Date) {
  const br = new Date(d.getTime() - 3 * 3600e3);
  return br.toISOString().replace('Z', '-03:00');
}
const STATUS_PIX: Record<string, string> = {
  approved: 'aprovado', pending: 'pendente', in_process: 'pendente', authorized: 'pendente',
  cancelled: 'expirado', rejected: 'recusado', refunded: 'estornado', charged_back: 'estornado',
};

// Aplica um pagamento Pix vindo da API: aprovado → +30 dias; estornado → tira os 30 dias
async function aplicarPix(pay: any) {
  const ref = String(pay.external_reference || '');
  if (!ref.startsWith('pix:')) return null;
  const aluno = ref.slice(4);
  if (!UUID.test(aluno)) return null;
  const id = String(pay.id);
  const status = STATUS_PIX[pay.status] || 'pendente';
  const dias = Number(pay.metadata?.dias || DIAS_PIX);
  // garante a linha do pagamento (sem sobrescrever)
  await db.from('pagamentos').upsert({ id, aluno_id: aluno, valor: pay.transaction_amount ?? VALOR, status: 'pendente', metodo: 'pix', dias }, { onConflict: 'id', ignoreDuplicates: true });

  const ajustarAcesso = async (sinal: 1 | -1) => {
    const { data: a } = await db.from('assinaturas').select('*').eq('aluno_id', aluno).maybeSingle();
    const agora = Date.now();
    const base = sinal > 0 ? Math.max(agora, a?.pago_ate ? new Date(a.pago_ate).getTime() : 0) : (a?.pago_ate ? new Date(a.pago_ate).getTime() : agora);
    const novo = new Date(base + sinal * dias * 864e5).toISOString();
    await db.from('assinaturas').upsert({
      aluno_id: aluno, pago_ate: novo, ultimo_metodo: sinal > 0 ? 'pix' : a?.ultimo_metodo ?? null,
      status: a?.status || 'pendente', valor: a?.valor ?? VALOR, atualizada_em: new Date().toISOString(),
    }, { onConflict: 'aluno_id' });
  };

  if (status === 'aprovado') {
    // só quem "vira" o status para aprovado soma os dias (o aviso e a conferência podem chegar juntos)
    const { data: virou } = await db.from('pagamentos')
      .update({ status: 'aprovado', pago_em: pay.date_approved || new Date().toISOString(), qr_code: null, qr_base64: null })
      .eq('id', id).neq('status', 'aprovado').neq('status', 'estornado').select('id');
    if (virou?.length) await ajustarAcesso(1);
  } else if (status === 'estornado') {
    const { data: virou } = await db.from('pagamentos').update({ status: 'estornado' }).eq('id', id).eq('status', 'aprovado').select('id');
    if (virou?.length) await ajustarAcesso(-1);
    else await db.from('pagamentos').update({ status: 'estornado' }).eq('id', id).neq('status', 'estornado');
  } else {
    await db.from('pagamentos').update({ status }).eq('id', id).eq('status', 'pendente');
  }
  const { data } = await db.from('pagamentos').select('id, status').eq('id', id).maybeSingle();
  return data;
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
    else if (tipo === 'payment' || String(corpo?.action || '').startsWith('payment.')) await aplicarPix(await mp(`/v1/payments/${id}`));
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

  if (corpo.acao === 'pix') {
    const email = String(corpo.email || user.email || '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ erro: 'Informe um e-mail válido.' }, 400);
    // reaproveita um QR Code ainda válido (evita gerar vários)
    const { data: pendentes } = await db.from('pagamentos').select('*').eq('aluno_id', user.id).eq('metodo', 'pix').eq('status', 'pendente');
    const valido = (pendentes || []).find((x: any) => x.qr_code && x.expira_em && new Date(x.expira_em).getTime() - Date.now() > 5 * 60e3);
    if (valido) return json({ id: valido.id, qr_code: valido.qr_code, qr_base64: valido.qr_base64, link: valido.link, expira_em: valido.expira_em, valor: Number(valido.valor), dias: valido.dias });

    const expira = new Date(Date.now() + MINUTOS_PIX * 60e3);
    const pay = await mp('/v1/payments', {
      method: 'POST',
      headers: { 'X-Idempotency-Key': crypto.randomUUID() },
      body: JSON.stringify({
        transaction_amount: VALOR,
        description: `English Smart Premium - ${DIAS_PIX} dias`,
        payment_method_id: 'pix',
        payer: { email, first_name: String(aluno.nome || '').split(' ')[0] || undefined },
        external_reference: `pix:${user.id}`,
        notification_url: URL_FUNCAO,
        date_of_expiration: dataMP(expira),
        metadata: { dias: DIAS_PIX },
      }),
    });
    const t = pay.point_of_interaction?.transaction_data || {};
    if (!t.qr_code) return json({ erro: 'O Mercado Pago não gerou o QR Code. Confira se a sua conta tem uma chave Pix cadastrada.' }, 502);
    await db.from('pagamentos').upsert({
      id: String(pay.id), aluno_id: user.id, valor: pay.transaction_amount ?? VALOR, status: 'pendente', metodo: 'pix', dias: DIAS_PIX,
      qr_code: t.qr_code, qr_base64: t.qr_code_base64, link: t.ticket_url || null, expira_em: expira.toISOString(),
    }, { onConflict: 'id' });
    return json({ id: String(pay.id), qr_code: t.qr_code, qr_base64: t.qr_code_base64, link: t.ticket_url || null, expira_em: expira.toISOString(), valor: VALOR, dias: DIAS_PIX });
  }

  if (corpo.acao === 'pix_status') {
    const id = String(corpo.id || '');
    const { data: meu } = await db.from('pagamentos').select('id').eq('id', id).eq('aluno_id', user.id).maybeSingle();
    if (!meu) return json({ erro: 'Pagamento não encontrado.' }, 404);
    const r = await aplicarPix(await mp(`/v1/payments/${id}`));
    const { data: assinatura } = await db.from('assinaturas').select('*').eq('aluno_id', user.id).maybeSingle();
    return json({ status: r?.status || 'pendente', assinatura });
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
