// voz.js — Ouvir (voz do navegador) e falar (reconhecimento de voz), sem nenhum serviço pago

const Voz = (() => {
  const temOuvir = 'speechSynthesis' in window;
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  let vozes = [];

  function carregarVozes() {
    if (!temOuvir) return;
    const todas = speechSynthesis.getVoices().filter((v) => /^en[-_]/i.test(v.lang));
    const us = todas.filter((v) => /en[-_]US/i.test(v.lang));
    const gb = todas.filter((v) => /en[-_]GB/i.test(v.lang));
    vozes = [...us, ...gb, ...todas.filter((v) => !us.includes(v) && !gb.includes(v))];
  }
  if (temOuvir) {
    carregarVozes();
    speechSynthesis.onvoiceschanged = carregarVozes;
  }

  const limpar = (t) => String(t).replace(/\([^)]*\)/g, '').replace(/[—–]/g, ', ').replace(/_{2,}/g, '...').trim();

  // indice: 0 = voz principal, 1 = segunda voz (para diálogos)
  function falar(texto, { lento = false, indice = 0 } = {}) {
    return new Promise((resolve) => {
      if (!temOuvir) return resolve();
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(limpar(texto));
      u.lang = 'en-US';
      if (vozes.length) u.voice = vozes[Math.min(indice, vozes.length - 1)];
      u.rate = lento ? 0.62 : 0.92;
      u.onend = resolve;
      u.onerror = resolve;
      speechSynthesis.speak(u);
    });
  }

  const parar = () => { if (temOuvir) speechSynthesis.cancel(); };

  // Escuta o aluno e devolve as transcrições possíveis
  function ouvirAluno() {
    return new Promise((resolve, reject) => {
      if (!SR) return reject(new Error('sem-suporte'));
      const r = new SR();
      r.lang = 'en-US';
      r.interimResults = false;
      r.maxAlternatives = 3;
      let recebeu = false;
      r.onresult = (e) => { recebeu = true; resolve([...e.results[0]].map((a) => a.transcript)); };
      r.onerror = (e) => reject(new Error(e.error || 'erro'));
      r.onend = () => { if (!recebeu) reject(new Error('silencio')); };
      try { r.start(); } catch (err) { reject(err); }
    });
  }

  // Quantas palavras da frase o aluno disse (0 a 1)
  const normalizar = (t) => limpar(t).toLowerCase().replace(/[^a-z0-9' ]/g, ' ').split(/\s+/).filter(Boolean);
  function semelhanca(alvo, dito) {
    const a = normalizar(alvo);
    const d = normalizar(dito);
    if (!a.length) return 0;
    const restantes = [...d];
    let iguais = 0;
    a.forEach((p) => {
      const i = restantes.indexOf(p);
      if (i !== -1) { iguais++; restantes.splice(i, 1); }
    });
    return iguais / a.length;
  }

  // ---------- Qual modo de fala usar ----------
  // 'reconhecer' = o navegador transcreve e corrige a pronúncia (precisa de https e funciona melhor no Chrome)
  // 'gravar'     = grava a voz do aluno para ele ouvir e comparar com o modelo (funciona até abrindo pelo arquivo)
  // 'repetir'    = sem microfone disponível: o aluno ouve e repete em voz alta
  const podeGravar = !!(navigator.mediaDevices?.getUserMedia && window.MediaRecorder);
  const pagina = location.protocol === 'file:' ? 'arquivo' : 'site';
  let falhouReconhecer = false;
  try { falhouReconhecer = sessionStorage.getItem('es_voz_falhou') === '1'; } catch {}

  function modoFala() {
    if (SR && pagina === 'site' && !falhouReconhecer) return 'reconhecer';
    if (podeGravar) return 'gravar';
    return 'repetir';
  }
  // Chamado quando o reconhecimento falha por bloqueio ou rede: passa a gravar até o fim da sessão
  function marcarFalhaReconhecer() {
    falhouReconhecer = true;
    try { sessionStorage.setItem('es_voz_falhou', '1'); } catch {}
  }
  const motivoSemReconhecer = () =>
    pagina === 'arquivo' ? 'arquivo' : !SR ? 'navegador' : falhouReconhecer ? 'falhou' : null;

  // ---------- Gravação da voz do aluno ----------
  let gravacao = null;

  async function comecarGravacao(maxSegundos = 8) {
    pararGravacao(true);
    const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    const pedacos = [];
    const rec = new MediaRecorder(stream);
    const pronto = new Promise((resolve) => {
      rec.ondataavailable = (e) => { if (e.data.size) pedacos.push(e.data); };
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop()); // desliga o microfone
        resolve(pedacos.length ? URL.createObjectURL(new Blob(pedacos, { type: rec.mimeType || 'audio/webm' })) : null);
      };
    });
    rec.start();
    const limite = setTimeout(() => pararGravacao(), maxSegundos * 1000);
    gravacao = { rec, stream, pronto, limite };
    return pronto;
  }

  function pararGravacao(descartar = false) {
    if (!gravacao) return;
    clearTimeout(gravacao.limite);
    if (gravacao.rec.state !== 'inactive') gravacao.rec.stop();
    else gravacao.stream.getTracks().forEach((t) => t.stop());
    if (descartar) gravacao.pronto.then((url) => url && URL.revokeObjectURL(url));
    gravacao = null;
  }
  const gravando = () => !!gravacao && gravacao.rec.state === 'recording';

  let audioAluno = null;
  function tocarGravacao(url) {
    parar();
    audioAluno?.pause();
    audioAluno = new Audio(url);
    return new Promise((resolve) => { audioAluno.onended = resolve; audioAluno.onerror = resolve; audioAluno.play().catch(resolve); });
  }

  return {
    falar, parar, ouvirAluno, semelhanca, temOuvir, temFalar: !!SR, limpar,
    modoFala, marcarFalhaReconhecer, motivoSemReconhecer, podeGravar,
    comecarGravacao, pararGravacao, gravando, tocarGravacao,
  };
})();
