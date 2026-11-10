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
    certificado: '<rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 9h8M8 12h5"/><circle cx="17" cy="17" r="3"/><path d="M15.5 19.5L15 22l2-1 2 1-.5-2.5"/>',
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
