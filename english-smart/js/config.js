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
const VERSAO_TERMOS = '2026-11-09.2';

// Plano Premium (o valor cobrado de verdade fica na função do servidor: segredo PLANO_VALOR, padrão 29.99)
const PLANO = { nome: 'Premium', preco: 29.99 };
const precoBR = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
