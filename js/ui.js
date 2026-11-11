// ui.js — Animações compartilhadas entre as páginas

// Revela elementos .reveal quando entram na tela (chame revelar(raiz) após criar elementos novos)
window.revelar = (() => {
  const io = 'IntersectionObserver' in window
    ? new IntersectionObserver((entries) => entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add('is-visible'); io.unobserve(e.target); }
      }), { threshold: 0.15 })
    : null;
  const revelar = (raiz = document) => raiz.querySelectorAll('.reveal:not(.is-visible)').forEach((el) =>
    io ? io.observe(el) : el.classList.add('is-visible'));
  revelar();
  return revelar;
})();

// Sombra no cabeçalho ao rolar
(() => {
  const header = document.querySelector('[data-header]');
  if (!header) return;
  const onScroll = () => header.classList.toggle('shadow-2xl', window.scrollY > 10);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
})();

// Contadores que sobem de 0 até o valor (data-count="100")
(() => {
  const els = document.querySelectorAll('[data-count]');
  if (!els.length || !('IntersectionObserver' in window)) return;
  const io = new IntersectionObserver((entries) => entries.forEach((e) => {
    if (!e.isIntersecting) return;
    const el = e.target;
    const alvo = Number(el.dataset.count);
    const inicio = performance.now();
    const dur = 1400;
    const passo = (t) => {
      const p = Math.min((t - inicio) / dur, 1);
      el.textContent = Math.round(alvo * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(passo);
    };
    requestAnimationFrame(passo);
    io.unobserve(el);
  }), { threshold: 0.6 });
  els.forEach((el) => io.observe(el));
})();

// Botão com estado de carregamento
window.setLoading = (btn, carregando, textoNormal) => {
  btn.disabled = carregando;
  btn.innerHTML = carregando
    ? '<span class="inline-flex items-center gap-2 justify-center"><span class="spinner"></span>Aguarde...</span>'
    : textoNormal;
};

// Confete de comemoração (prova concluída, subiu de nível...)
window.soltarConfete = (container) => {
  const cores = ['#EB1F3B', '#00174F', '#023FA0', '#FFFFFF', '#FDE8EB', '#F59E0B'];
  for (let i = 0; i < 50; i++) {
    const c = document.createElement('span');
    c.className = 'confete';
    c.style.left = '50%';
    c.style.top = '120px';
    c.style.background = cores[i % cores.length];
    c.style.setProperty('--dx', `${(Math.random() - 0.5) * 700}px`);
    c.style.setProperty('--dy', `${Math.random() * 420 - 80}px`);
    c.style.setProperty('--rot', `${Math.random() * 720 - 360}deg`);
    c.style.animationDelay = `${Math.random() * 0.25}s`;
    container.appendChild(c);
    setTimeout(() => c.remove(), 3200);
  }
};

// Ícones (no lugar de emojis): Icone('trofeu', 'w-6 h-6')
window.Icone = (() => {
  const P = {
    check: '<path d="M5 13l4 4L19 7"/>',
    x: '<path d="M6 18L18 6M6 6l12 12"/>',
    cadeado: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 018 0v4"/>',
    trofeu: '<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 01-10 0V4zM7 6H4a3 3 0 003 3M17 6h3a3 3 0 01-3 3"/>',
    chama: '<path d="M12 3c1 3 4 5 4 9a4 4 0 01-8 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-5 0-8z"/>',
    alvo: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
    livro: '<path d="M4 5a2 2 0 012-2h13v16H6a2 2 0 00-2 2V5zM4 19a2 2 0 012-2h13"/>',
    som: '<path d="M11 5L6 9H3v6h3l5 4V5zM15.5 8.5a5 5 0 010 7M19 5a10 10 0 010 14"/>',
    conversa: '<path d="M8 10h8M8 14h5m-9 6l3-3h10a3 3 0 003-3V7a3 3 0 00-3-3H7a3 3 0 00-3 3v13z"/>',
    blocos: '<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/>',
    microfone: '<path d="M12 15a3 3 0 003-3V6a3 3 0 10-6 0v6a3 3 0 003 3zM19 11a7 7 0 01-14 0M12 18v3"/>',
    estrela: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/>',
    usuario: '<path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>',
    camera: '<path d="M3 8a2 2 0 012-2h2l2-2h6l2 2h2a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V8z"/><circle cx="12" cy="13" r="3.5"/>',
    sair: '<path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>',
    escudo: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z"/>',
    documento: '<path d="M7 3h7l5 5v13H7zM14 3v5h5M10 13h6M10 17h6"/>',
    lento: '<path d="M4 18a8 8 0 1116 0"/><path d="M12 18l-3-4"/>',
    relogio: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/>',
    brilho: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M6 18l2.5-2.5M15.5 8.5L18 6"/>',
    olho: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    capelo: '<path d="M2 9l10-5 10 5-10 5L2 9zM6 11v5c3 2 9 2 12 0v-5"/>',
    globo: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 010 18M12 3a14 14 0 000 18"/>',
    foguete: '<path d="M5 15c-1 1-1 4-1 4s3 0 4-1M9 15l-3-3c2-6 7-9 12-9 0 5-3 10-9 12z"/><circle cx="14" cy="9" r="1.5"/>',
    fone: '<path d="M4 15v-3a8 8 0 0116 0v3"/><path d="M4 15a2 2 0 002 2h1v-5H6a2 2 0 00-2 2zM20 15a2 2 0 01-2 2h-1v-5h1a2 2 0 012 2z"/>',
    cafe: '<path d="M4 8h12v6a5 5 0 01-5 5H9a5 5 0 01-5-5V8zM16 10h2a2 2 0 010 4h-2M8 3v2M12 3v2"/>',
    lixeira: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
    chave: '<circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M17 6l3 3"/>',
    seta: '<path d="M13 7l5 5-5 5M6 12h12"/>',
    voltar: '<path d="M15 18l-6-6 6-6"/>',
    grafico: '<path d="M4 20V10M10 20V4M16 20v-8M22 20H2"/>',
    celular: '<rect x="7" y="2.5" width="10" height="19" rx="2.5"/><path d="M11 18.5h2"/>',
    computador: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>',
    cartao: '<rect x="2.5" y="5" width="19" height="14" rx="2.5"/><path d="M2.5 10h19M6.5 15h4"/>',
    cookie: '<path d="M12 3a9 9 0 1 0 9 9 4 4 0 0 1-4-4 4 4 0 0 1-4-4 1 1 0 0 0-1-1Z"/><circle cx="8.5" cy="10.5" r="1"/><circle cx="15" cy="15" r="1"/><circle cx="10" cy="15.5" r="1"/>',
    certificado: '<rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 9h8M8 12h5"/><circle cx="17" cy="17" r="3"/><path d="M15.5 19.5L15 22l2-1 2 1-.5-2.5"/>',
    presente: '<rect x="3" y="8" width="18" height="5" rx="1"/><path d="M5 13v8h14v-8M12 8v13M12 8S10.5 3 8 3.5 7 8 12 8zm0 0s1.5-5 4-4.5S17 8 12 8z"/>',
    moeda: '<circle cx="12" cy="12" r="9"/><path d="M14.5 9.5c-.4-1-1.4-1.5-2.5-1.5-1.5 0-2.5.8-2.5 2s1 1.6 2.5 2 2.5.8 2.5 2-1 2-2.5 2c-1.2 0-2.2-.6-2.6-1.6M12 6.5v1.5M12 16v1.5"/>',
    lua: '<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>',
    sol: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    medalha: '<circle cx="12" cy="15" r="6"/><path d="M8.5 10L6 3h4l2 5M15.5 10L18 3h-4l-2 5M12 12.5l.9 1.8 2 .3-1.5 1.4.4 2-1.8-1-1.8 1 .4-2-1.5-1.4 2-.3z"/>',
    mala: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V4h6v3M3 12h18"/>',
    aviao: '<path d="M10.5 13.5L3 11l1.5-1.5 8 1 4-4.5a2.1 2.1 0 013 3l-4.5 4 1 8L14.5 22 12 14.5 9 17.5V20l-1.5 1.5-1-3-3-1L5 16h2.5z"/>',
    entrevista: '<circle cx="8" cy="8" r="3"/><circle cx="17" cy="8" r="3"/><path d="M3 20a5 5 0 0110 0M12 20a5 5 0 0110 0"/>',
    baixar: '<path d="M12 4v11m0 0l-4-4m4 4l4-4M5 20h14"/>',
    loja: '<path d="M4 9l1.5-5h13L20 9M4 9h16v2a3 3 0 01-6 0 3 3 0 01-4 0 3 3 0 01-6 0V9zM5 13v7h14v-7M10 20v-4h4v4"/>',
    grupo: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0113 0M16 4.5a3.5 3.5 0 010 7M18 14a6.5 6.5 0 013.5 6"/>',
    cupom: '<path d="M3 8a2 2 0 012-2h14a2 2 0 012 2v2a2 2 0 000 4v2a2 2 0 01-2 2H5a2 2 0 01-2-2v-2a2 2 0 000-4V8z"/><path d="M14 6v12" stroke-dasharray="2 2"/>',
    lista: '<path d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01"/>',
    envelope: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
    lupa: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
    mudo: '<path d="M11 5L6 9H3v6h3l5 4V5zM16 9l5 6M21 9l-5 6"/>',
  };
  return (nome, cls = 'w-5 h-5') =>
    `<svg class="${cls}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24" aria-hidden="true">${P[nome] || ''}</svg>`;
})();

// Faíscas saindo de um elemento (usado ao acertar)
window.soltarFaiscas = (elemento) => {
  if (!elemento) return;
  const caixa = document.createElement('span');
  caixa.className = 'faiscas';
  const cores = ['#10B981', '#34D399', '#FBBF24', '#023FA0'];
  for (let i = 0; i < 12; i++) {
    const f = document.createElement('span');
    f.className = 'faisca';
    const ang = (Math.PI * 2 * i) / 12;
    f.style.setProperty('--x', `${Math.cos(ang) * (60 + Math.random() * 40)}px`);
    f.style.setProperty('--y', `${Math.sin(ang) * (30 + Math.random() * 30)}px`);
    f.style.background = cores[i % cores.length];
    caixa.appendChild(f);
  }
  elemento.style.position = elemento.style.position || 'relative';
  elemento.appendChild(caixa);
  setTimeout(() => caixa.remove(), 800);
};

// Modo escuro: escolha guardada neste navegador (padrão: claro)
window.Tema = (() => {
  const CHAVE = 'es_tema';
  const ler = () => { try { return localStorage.getItem(CHAVE) || ''; } catch { return ''; } };
  const escuro = () => document.documentElement.classList.contains('escuro');
  function aplicar(sim) {
    document.documentElement.classList.toggle('escuro', sim);
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', sim ? '#020617' : '#00174F');
    document.querySelectorAll('[data-tema]').forEach((b) => {
      b.innerHTML = Icone(sim ? 'sol' : 'lua', b.dataset.temaClasse || 'w-4 h-4');
      b.setAttribute('aria-label', sim ? 'Usar modo claro' : 'Usar modo escuro');
      b.title = sim ? 'Modo claro' : 'Modo escuro';
    });
  }
  function alternar() {
    const sim = !escuro();
    try { localStorage.setItem(CHAVE, sim ? 'escuro' : 'claro'); } catch {}
    aplicar(sim);
  }
  const salvo = ler();
  aplicar(salvo === 'escuro');
  return { escuro, alternar, aplicar };
})();

// ---------- Animações extras ----------
const SEM_MOVIMENTO = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

// Número que sobe até o valor (XP, moedas, porcentagens)
window.contar = (el, alvo, { dur = 900, formato = (n) => n.toLocaleString('pt-BR') } = {}) => {
  if (!el) return;
  alvo = Number(alvo) || 0;
  if (SEM_MOVIMENTO() || alvo === 0) { el.textContent = formato(alvo); return; }
  const inicio = performance.now();
  const passo = (t) => {
    const p = Math.min((t - inicio) / dur, 1);
    el.textContent = formato(Math.round(alvo * (1 - Math.pow(1 - p, 3))));
    if (p < 1) requestAnimationFrame(passo);
  };
  requestAnimationFrame(passo);
};
// Liga contadores marcados com data-contar="123" dentro de uma área recém-desenhada
window.animarNumeros = (raiz = document) => raiz.querySelectorAll('[data-contar]').forEach((el) => {
  if (el.dataset.contou) return;
  el.dataset.contou = '1';
  contar(el, el.dataset.contar);
});

// Texto que sobe e some (ex.: "+10 XP" ao acertar)
window.flutuar = (alvo, texto, cor = '#059669') => {
  if (!alvo || SEM_MOVIMENTO()) return;
  const r = alvo.getBoundingClientRect();
  const t = document.createElement('span');
  t.className = 'texto-flutuante';
  t.textContent = texto;
  t.style.left = `${r.left + r.width / 2}px`;
  t.style.top = `${r.top + window.scrollY}px`;
  t.style.color = cor;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 1100);
};

// Moedas voando de um ponto (compra na loja, medalha)
window.chuvaDeMoedas = (alvo, qtd = 10) => {
  if (!alvo || SEM_MOVIMENTO()) return;
  const r = alvo.getBoundingClientRect();
  for (let i = 0; i < qtd; i++) {
    const m = document.createElement('span');
    m.className = 'moeda-voando';
    m.style.left = `${r.left + r.width / 2}px`;
    m.style.top = `${r.top + window.scrollY + r.height / 2}px`;
    m.style.setProperty('--dx', `${(Math.random() - 0.5) * 220}px`);
    m.style.setProperty('--dy', `${-60 - Math.random() * 140}px`);
    m.style.animationDelay = `${i * 0.03}s`;
    document.body.appendChild(m);
    setTimeout(() => m.remove(), 1300);
  }
};

// Onda ao clicar nos botões principais
document.addEventListener('pointerdown', (e) => {
  const b = e.target.closest('.btn-shine, .opcao, [data-onda]');
  if (!b || b.disabled || SEM_MOVIMENTO()) return;
  const r = b.getBoundingClientRect();
  const o = document.createElement('span');
  const tam = Math.max(r.width, r.height) * 1.2;
  o.className = 'onda';
  o.style.width = o.style.height = `${tam}px`;
  o.style.left = `${e.clientX - r.left - tam / 2}px`;
  o.style.top = `${e.clientY - r.top - tam / 2}px`;
  if (getComputedStyle(b).position === 'static') b.style.position = 'relative';
  b.style.overflow = 'hidden';
  b.appendChild(o);
  setTimeout(() => o.remove(), 650);
}, { passive: true });
