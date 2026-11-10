// cookies.js — Aviso de cookies e preferências de privacidade (LGPD)
//
// Essenciais (sempre ativos): login, respostas da prova em andamento, preferências e a sua escolha de cookies.
// Estatísticas (opcional): só carregam com o seu aceite e só se ANALYTICS_ID estiver preenchido em config.js.

const Cookies = (() => {
  const CHAVE = 'es_cookies_v1';
  const ler = () => { try { return JSON.parse(localStorage.getItem(CHAVE) || 'null'); } catch { return null; } };
  const gravar = (estatisticas) => {
    const escolha = { essenciais: true, estatisticas: !!estatisticas, data: new Date().toISOString(), versao: VERSAO_TERMOS };
    try { localStorage.setItem(CHAVE, JSON.stringify(escolha)); } catch {}
    return escolha;
  };

  // Google Analytics 4 (somente com consentimento)
  function aplicar(escolha) {
    const id = typeof ANALYTICS_ID === 'string' ? ANALYTICS_ID.trim() : '';
    if (!id) return;
    window[`ga-disable-${id}`] = !escolha?.estatisticas;
    if (escolha?.estatisticas && !document.getElementById('gtag-js')) {
      const s = document.createElement('script');
      s.id = 'gtag-js'; s.async = true;
      s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
      document.head.appendChild(s);
      window.dataLayer = window.dataLayer || [];
      window.gtag = function () { window.dataLayer.push(arguments); };
      window.gtag('js', new Date());
      window.gtag('config', id, { anonymize_ip: true });
    }
    if (!escolha?.estatisticas) {
      // apaga cookies de estatística que já existiam
      document.cookie.split(';').map((c) => c.split('=')[0].trim()).filter((n) => /^_ga/.test(n))
        .forEach((n) => { document.cookie = `${n}=; Max-Age=0; path=/`; document.cookie = `${n}=; Max-Age=0; path=/; domain=.${location.hostname}`; });
    }
  }

  function fechar() {
    const b = document.getElementById('avisoCookies');
    if (!b) return;
    b.classList.add('translate-y-6', 'opacity-0');
    setTimeout(() => b.remove(), 300);
  }

  function escolher(estatisticas) {
    const escolha = gravar(estatisticas);
    aplicar(escolha);
    fechar();
    if (window.App?.toast) App.toast(estatisticas ? 'Preferências salvas: todos os cookies aceitos.' : 'Preferências salvas: só os essenciais.');
  }

  function mostrar({ personalizar = false } = {}) {
    document.getElementById('avisoCookies')?.remove();
    const atual = ler();
    const el = document.createElement('div');
    el.id = 'avisoCookies';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-live', 'polite');
    el.setAttribute('aria-label', 'Aviso de cookies');
    el.className = 'fixed z-[70] left-3 right-3 bottom-3 md:left-6 md:right-auto md:bottom-6 md:max-w-md bg-white text-slate-600 rounded-2xl shadow-card border border-slate-200 p-5 transition duration-300 translate-y-6 opacity-0';
    el.innerHTML = `
      <div class="flex items-start gap-3">
        <span class="w-10 h-10 shrink-0 rounded-xl bg-navy-900 text-white grid place-items-center">${Icone('cookie', 'w-5 h-5')}</span>
        <div class="min-w-0">
          <p class="font-display font-bold text-navy-900">Sua privacidade</p>
          <p class="mt-1 text-sm leading-relaxed">Usamos cookies e o armazenamento do navegador <b>essenciais</b> para manter você conectado e guardar seu progresso. Com a sua permissão, também usamos cookies de <b>estatística</b> para melhorar o curso.
            <a href="#/termos?aba=privacidade" data-ver-politica class="font-semibold text-navy-600 hover:text-brand-red underline underline-offset-2">Política de Privacidade</a></p>
        </div>
      </div>
      <div id="cookiesDetalhes" class="${personalizar ? '' : 'hidden'} mt-4 space-y-2">
        <label class="flex items-start gap-3 bg-slate-50 rounded-xl p-3">
          <input type="checkbox" checked disabled class="mt-1 w-4 h-4 accent-navy-900" />
          <span class="text-sm"><b class="text-navy-900">Essenciais</b> · sempre ativos<br /><span class="text-xs text-slate-500">Login, respostas da prova em andamento, preferências e esta escolha. Sem eles o site não funciona.</span></span>
        </label>
        <label class="flex items-start gap-3 bg-slate-50 rounded-xl p-3 cursor-pointer">
          <input id="cookiesEstatisticas" type="checkbox" ${atual?.estatisticas ? 'checked' : ''} class="mt-1 w-4 h-4 accent-brand-red" />
          <span class="text-sm"><b class="text-navy-900">Estatísticas</b> · opcional<br /><span class="text-xs text-slate-500">Contam visitas e páginas mais usadas, de forma agregada, para melhorar o curso. Nunca para publicidade.</span></span>
        </label>
      </div>
      <div class="mt-4 grid grid-cols-2 gap-2">
        <button data-cookies-essenciais class="font-semibold text-sm border border-slate-200 hover:border-navy-900 text-navy-900 rounded-xl py-2.5 transition">Só essenciais</button>
        <button data-cookies-todos class="font-semibold text-sm bg-navy-900 hover:bg-navy-800 text-white rounded-xl py-2.5 transition">Aceitar todos</button>
      </div>
      <button data-cookies-personalizar class="${personalizar ? 'hidden' : ''} mt-2 w-full text-xs font-semibold text-slate-400 hover:text-navy-900 py-1 transition">Personalizar</button>
      <button data-cookies-salvar class="${personalizar ? '' : 'hidden'} mt-2 w-full font-semibold text-sm bg-brand-red hover:bg-brand-redDark text-white rounded-xl py-2.5 transition">Salvar preferências</button>`;
    document.body.appendChild(el);
    requestAnimationFrame(() => el.classList.remove('translate-y-6', 'opacity-0'));
    el.querySelector('[data-cookies-todos]').addEventListener('click', () => escolher(true));
    el.querySelector('[data-cookies-essenciais]').addEventListener('click', () => escolher(false));
    el.querySelector('[data-cookies-personalizar]').addEventListener('click', (e) => {
      e.target.classList.add('hidden');
      el.querySelector('#cookiesDetalhes').classList.remove('hidden');
      el.querySelector('[data-cookies-salvar]').classList.remove('hidden');
    });
    el.querySelector('[data-cookies-salvar]').addEventListener('click', () => escolher(el.querySelector('#cookiesEstatisticas').checked));
  }

  function iniciar() {
    const escolha = ler();
    aplicar(escolha);
    // pede de novo se os termos mudarem de versão
    if (!escolha || escolha.versao !== VERSAO_TERMOS) setTimeout(() => { if (!ler() || ler().versao !== VERSAO_TERMOS) mostrar(); }, 700);
    // qualquer elemento com data-cookies reabre as preferências
    document.addEventListener('click', (e) => {
      if (e.target.closest('[data-cookies]')) { e.preventDefault(); mostrar({ personalizar: true }); }
    });
  }

  return { iniciar, mostrar, ler };
})();
