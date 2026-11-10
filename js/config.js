// config.js — Conexão com o Supabase do English Smart
// Esta chave é PÚBLICA (publishable) e pode ficar no navegador:
// quem protege os dados são as regras de segurança (RLS) do banco.

const SUPABASE_URL = 'https://wfxqxvlcrqbwvcvqslzi.supabase.co';
const SUPABASE_KEY = 'sb_publishable_h8Q6bRAXa3v5V2WOCcS1Bw_nsInORiJ';

const sb = window.supabase?.createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, storageKey: 'english-smart-auth' },
});

// Se a biblioteca do Supabase não carregou (internet instável ou bloqueador de anúncios), avisa na tela
if (!window.supabase) {
  document.addEventListener('DOMContentLoaded', () => {
    const aviso = document.createElement('div');
    aviso.style.cssText = 'position:fixed;inset:auto 16px 16px 16px;z-index:9999;background:#EB1F3B;color:#fff;padding:14px 18px;border-radius:12px;font:600 14px Inter,sans-serif;text-align:center';
    aviso.textContent = 'Não foi possível carregar os componentes do site. Verifique a internet ou desative o bloqueador de anúncios e recarregue (F5).';
    document.body.appendChild(aviso);
  });
}

// ---------- Dados do responsável pela plataforma (aparecem nos Termos e na Política de Privacidade) ----------
// Preencha antes de divulgar o site. O e-mail é o canal para pedidos sobre dados pessoais (LGPD).
const RESPONSAVEL_NOME = 'Pedro de Farias Xavier Toledo';   // ex.: 'Fulano de Tal' ou a razão social, se tiver empresa
const RESPONSAVEL_DOC = '';    // CPF ou CNPJ (opcional, mas recomendado)
const CONTATO_EMAIL = 'pedro.farias.toledo@gmail.com';      // ex.: 'contato@seudominio.com.br'
const VERSAO_TERMOS = '2026-11-10.2';

// Google Analytics 4 (opcional): cole o ID "G-XXXXXXX" para medir visitas.
// Só é carregado para quem aceitar os cookies de estatística no aviso de cookies.
const ANALYTICS_ID = '';

// Assinatura (o valor cobrado de verdade fica na função do servidor: segredo PLANO_VALOR, padrão 29.99)
// Cadastro e prova de nivelamento são grátis; para estudar, é preciso assinar.
const PLANO = { nome: 'Assinatura English Smart', preco: 29.99 };
const precoBR = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

// Identificação deste aparelho (limite de 4 aparelhos por conta).
// id: aleatório, guardado no navegador · digital: resumo do navegador/tela, para reconhecer o mesmo aparelho
// se os dados do navegador forem apagados · nome: o que o aluno vê na lista ("Chrome no Windows")
const DISPOSITIVO = (() => {
  const CHAVE = 'es_dispositivo';
  let id = '';
  try { id = localStorage.getItem(CHAVE) || ''; } catch {}
  if (!/^[A-Za-z0-9-]{8,64}$/.test(id)) {
    id = (crypto.randomUUID?.() || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`);
    try { localStorage.setItem(CHAVE, id); } catch {}
  }
  const ua = navigator.userAgent || '';
  const navegador = /Edg\//.test(ua) ? 'Edge' : /OPR\//.test(ua) ? 'Opera' : /SamsungBrowser/.test(ua) ? 'Samsung Internet' : /Firefox\//.test(ua) ? 'Firefox' : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : 'Navegador';
  const sistema = /iPhone/.test(ua) ? 'iPhone' : /iPad/.test(ua) ? 'iPad' : /Android/.test(ua) ? (/Mobile/.test(ua) ? 'celular Android' : 'tablet Android') : /Windows/.test(ua) ? 'Windows' : /Mac OS X/.test(ua) ? 'Mac' : /CrOS/.test(ua) ? 'Chromebook' : /Linux/.test(ua) ? 'Linux' : 'aparelho';
  const bruto = [ua, navigator.platform, screen.width + 'x' + screen.height, screen.colorDepth, Intl.DateTimeFormat().resolvedOptions().timeZone, navigator.language, navigator.hardwareConcurrency].join('|');
  let h1 = 0x811c9dc5, h2 = 0x01000193;
  for (let i = 0; i < bruto.length; i++) { const c = bruto.charCodeAt(i); h1 = Math.imul(h1 ^ c, 16777619) >>> 0; h2 = Math.imul(h2 ^ c, 2246822519) >>> 0; }
  return { id, nome: `${navegador} no ${sistema}`, digital: h1.toString(16).padStart(8, '0') + h2.toString(16).padStart(8, '0') };
})();
