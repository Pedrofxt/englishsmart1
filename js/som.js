// som.js — Efeitos sonoros gerados na hora (Web Audio), sem arquivos de áudio para baixar.
// Liga/desliga pelo botão de som (fica guardado neste navegador). Não toca nada antes do primeiro toque do usuário.

const Som = (() => {
  const CHAVE = 'es_som';
  let ctx = null;
  let mestre = null;
  let ligado = true;
  try { ligado = localStorage.getItem(CHAVE) !== '0'; } catch {}

  function contexto() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      mestre = ctx.createGain();
      mestre.gain.value = 0.32;
      mestre.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    return ctx;
  }

  // Uma nota com envelope curto (ataque rápido, queda suave)
  function nota(freq, inicio, dur, { tipo = 'sine', vol = 0.6, deslize = 0 } = {}) {
    const c = ctx;
    const t = c.currentTime + inicio;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = tipo;
    o.frequency.setValueAtTime(freq, t);
    if (deslize) o.frequency.exponentialRampToValueAtTime(Math.max(40, freq + deslize), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(mestre);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  // Ruído curto (para "virar cartão" e "whoosh")
  function sopro(inicio, dur, { vol = 0.25, de = 600, ate = 3000 } = {}) {
    const c = ctx;
    const t = c.currentTime + inicio;
    const buf = c.createBuffer(1, Math.ceil(c.sampleRate * dur), c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    const fonte = c.createBufferSource();
    fonte.buffer = buf;
    const filtro = c.createBiquadFilter();
    filtro.type = 'bandpass';
    filtro.frequency.setValueAtTime(de, t);
    filtro.frequency.exponentialRampToValueAtTime(ate, t + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    fonte.connect(filtro).connect(g).connect(mestre);
    fonte.start(t);
  }

  const N = { C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46, G5: 783.99, A5: 880, B5: 987.77, C6: 1046.5, E6: 1318.5, G6: 1568, C4: 261.63, E4: 329.63, G4: 392, A4: 440 };
  const SONS = {
    clique: () => nota(1800, 0, 0.035, { tipo: 'triangle', vol: 0.12 }),
    pop: () => nota(620, 0, 0.09, { tipo: 'sine', vol: 0.35, deslize: 380 }),
    acerto: () => { nota(N.E5, 0, 0.14, { tipo: 'triangle', vol: 0.45 }); nota(N.A5, 0.08, 0.26, { tipo: 'triangle', vol: 0.45 }); },
    erro: () => { nota(220, 0, 0.16, { tipo: 'square', vol: 0.12 }); nota(174, 0.1, 0.24, { tipo: 'square', vol: 0.1 }); },
    sequencia: () => [N.E5, N.G5, N.C6].forEach((f, i) => nota(f, i * 0.06, 0.18, { tipo: 'triangle', vol: 0.35 })),
    virar: () => sopro(0, 0.18, { vol: 0.18, de: 900, ate: 4000 }),
    tique: () => nota(1200, 0, 0.05, { tipo: 'square', vol: 0.08 }),
    moeda: () => { nota(N.B5, 0, 0.08, { tipo: 'square', vol: 0.18 }); nota(N.E6, 0.07, 0.32, { tipo: 'square', vol: 0.18 }); },
    medalha: () => [N.C6, N.E6, N.G6, N.E6, N.G6].forEach((f, i) => nota(f, i * 0.07, 0.22, { tipo: 'sine', vol: 0.3 })),
    conclusao: () => {
      [N.C5, N.E5, N.G5, N.C6].forEach((f, i) => nota(f, i * 0.1, 0.32, { tipo: 'triangle', vol: 0.4 }));
      [N.C5, N.E5, N.G5].forEach((f) => nota(f, 0.42, 0.7, { tipo: 'sine', vol: 0.22 }));
    },
    quase: () => [N.G4, N.E4, N.C4].forEach((f, i) => nota(f, i * 0.12, 0.28, { tipo: 'triangle', vol: 0.3 })),
    nivel: () => {
      [N.G4, N.C5, N.E5, N.G5].forEach((f, i) => nota(f, i * 0.09, 0.2, { tipo: 'sawtooth', vol: 0.12 }));
      [N.C5, N.E5, N.G5, N.C6].forEach((f) => nota(f, 0.42, 0.9, { tipo: 'triangle', vol: 0.25 }));
      sopro(0.4, 0.5, { vol: 0.08, de: 2000, ate: 8000 });
    },
    sucesso: () => { nota(N.G5, 0, 0.12, { tipo: 'sine', vol: 0.4 }); nota(N.C6, 0.1, 0.4, { tipo: 'sine', vol: 0.4 }); },
    abrir: () => sopro(0, 0.12, { vol: 0.08, de: 400, ate: 2400 }),
  };

  function tocar(nome) {
    if (!ligado || !SONS[nome]) return;
    try { if (contexto()) SONS[nome](); } catch { /* sem áudio neste navegador */ }
  }

  function atualizarBotoes() {
    document.querySelectorAll('[data-som]').forEach((b) => {
      b.innerHTML = Icone(ligado ? 'som' : 'mudo', b.dataset.somClasse || 'w-4 h-4');
      b.setAttribute('aria-label', ligado ? 'Desligar os efeitos sonoros' : 'Ligar os efeitos sonoros');
      b.setAttribute('aria-pressed', String(ligado));
      b.title = ligado ? 'Sons ligados' : 'Sons desligados';
    });
  }

  function alternar() {
    ligado = !ligado;
    try { localStorage.setItem(CHAVE, ligado ? '1' : '0'); } catch {}
    atualizarBotoes();
    if (ligado) tocar('sucesso');
    App?.toast?.(ligado ? 'Efeitos sonoros ligados' : 'Efeitos sonoros desligados');
  }

  // Clique suave em botões (exceto os que já têm um som próprio)
  document.addEventListener('pointerdown', (e) => {
    const b = e.target.closest('button, a[href^="#/"], .opcao, summary');
    if (!b || b.disabled || b.closest('[data-sem-clique]') || b.matches('[data-op], [data-esq], [data-dir], [data-por], [data-som]')) return;
    tocar('clique');
  }, { passive: true });
  document.addEventListener('click', (e) => { if (e.target.closest('[data-som]')) alternar(); });
  document.addEventListener('DOMContentLoaded', atualizarBotoes);

  return { tocar, alternar, ligado: () => ligado, atualizarBotoes };
})();
