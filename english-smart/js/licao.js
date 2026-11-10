// licao.js — Player da lição (Aprenda → Pratique → Resultado) e do teste do nível

(() => {
  const el = (id) => document.getElementById(id);
  const LETRAS = ['A', 'B', 'C', 'D'];
  const icone = {
    som: '<svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15.5 8.5a5 5 0 010 7M19 5a10 10 0 010 14M11 5L6 9H3v6h3l5 4V5z"/></svg>',
    mic: '<svg class="w-7 h-7" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 15a3 3 0 003-3V6a3 3 0 10-6 0v6a3 3 0 003 3zM19 11a7 7 0 01-14 0M12 18v3"/></svg>',
  };

  let st = {}; // estado da sessão atual

  const botaoSom = (texto, extra = '') =>
    `<button data-falar="${App.escapar(texto)}" class="shrink-0 w-9 h-9 rounded-lg grid place-items-center text-navy-600 hover:bg-navy-600/10 transition ${extra}" title="Ouvir">${icone.som}</button>`;
  const botaoLento = (texto) =>
    `<button data-falar="${App.escapar(texto)}" data-lento="1" class="shrink-0 h-9 px-2 rounded-lg inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:bg-navy-600/10 transition" title="Ouvir devagar">${Icone('lento', 'w-4 h-4')}Lento</button>`;

  function ligarSons(raiz) {
    raiz.querySelectorAll('[data-falar]').forEach((b) =>
      b.addEventListener('click', (e) => { e.stopPropagation(); Voz.falar(b.dataset.falar, { lento: !!b.dataset.lento }); })
    );
  }

  function atualizarBarra() {
    if (st.relampago && st.modo === 'pratica') return atualizarCronometro();
    const total = st.exercicios.length;
    const feitos = st.modo === 'resultado' ? total : st.i;
    el('licaoBarra').style.width = st.modo === 'aprenda' ? '0%' : `${(feitos / total) * 100}%`;
    el('licaoBarra').classList.remove('barra-brilho'); void el('licaoBarra').offsetWidth; el('licaoBarra').classList.add('barra-brilho');
    el('licaoContador').textContent = st.modo === 'pratica' ? `${st.i + 1}/${total}` : '';
  }

  // ===================== 1. APRENDA =====================
  function renderizarAprenda() {
    st.modo = 'aprenda';
    atualizarBarra();
    const l = st.licao;
    el('licaoConteudo').innerHTML = `
      <div class="lesson-enter space-y-5">
        <section class="bg-white rounded-[1.5rem] border border-slate-200 p-6 md:p-8">
          <p class="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-brand-red">${Icone('livro', 'w-4 h-4')} Gramática</p>
          <h1 class="mt-2 text-2xl md:text-3xl font-extrabold text-navy-900">${App.escapar(l.t)}</h1>
          <p class="mt-3 text-slate-600 leading-relaxed">${App.escapar(l.g)}</p>
          <div class="mt-5 space-y-2">
            ${l.e.map((f) => { const [t, c] = f.split('|'); const frase = t.replace('___', c); return `
              <div class="flex items-center gap-3 bg-slate-50 rounded-xl px-4 py-2.5">
                ${botaoSom(frase)}
                <p class="text-slate-700">${App.escapar(t).replace('___', `<b class="text-navy-900 underline decoration-brand-red decoration-2 underline-offset-4">${App.escapar(c)}</b>`)}</p>
              </div>`; }).join('')}
          </div>
        </section>

        <section class="bg-white rounded-[1.5rem] border border-slate-200 p-6 md:p-8">
          <p class="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-brand-red">${Icone('som', 'w-4 h-4')} Vocabulário e expressões</p>
          <div class="mt-4 grid sm:grid-cols-2 gap-3">
            ${l.v.map(([en, pt]) => `
              <div class="flex items-center gap-2 border border-slate-200 rounded-xl pl-4 pr-2 py-3">
                <div class="flex-1 min-w-0"><p class="font-semibold text-navy-900">${App.escapar(en)}</p><p class="text-sm text-slate-500">${App.escapar(pt)}</p></div>
                ${botaoSom(en)}${botaoLento(en)}
              </div>`).join('')}
          </div>
        </section>

        <section class="bg-white rounded-[1.5rem] border border-slate-200 p-6 md:p-8">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <p class="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-brand-red">${Icone('conversa', 'w-4 h-4')} Diálogo</p>
            <button id="btnDialogo" class="inline-flex items-center gap-2 text-sm font-semibold text-navy-900 border border-slate-200 hover:border-navy-900 rounded-xl px-4 py-2 transition">${Icone('som', 'w-4 h-4')} Ouvir a conversa</button>
          </div>
          <div class="mt-5 space-y-3">
            ${l.d.map(([quem, fala], i) => `
              <div data-linha="${i}" class="flex items-end gap-2 ${quem === 'B' ? 'flex-row-reverse' : ''} transition">
                <span class="w-8 h-8 shrink-0 rounded-full ${quem === 'B' ? 'bg-brand-red' : 'bg-navy-900'} text-white grid place-items-center text-xs font-bold">${quem}</span>
                <div class="max-w-[80%] flex items-center gap-1 ${quem === 'B' ? 'bg-brand-redSoft rounded-2xl rounded-br-md flex-row-reverse' : 'bg-slate-100 rounded-2xl rounded-bl-md'} pl-4 pr-1 py-1.5">
                  <p class="text-slate-800 py-1">${App.escapar(fala)}</p>${botaoSom(fala, '!w-8 !h-8')}
                </div>
              </div>`).join('')}
          </div>
        </section>

        ${!Voz.temOuvir ? '<p class="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">Seu navegador não tem leitura em voz alta. Para ouvir os áudios, use o Google Chrome ou o Microsoft Edge.</p>' : ''}

        <button id="btnPraticar" class="btn-shine w-full bg-brand-red hover:bg-brand-redDark text-white font-display font-semibold text-lg py-4 rounded-2xl shadow-glow transition hover:-translate-y-0.5">
          Começar as atividades (${st.exercicios.length}) →
        </button>
      </div>`;

    ligarSons(el('licaoConteudo'));
    el('btnPraticar').addEventListener('click', () => { Voz.parar(); comecarPratica(); });
    el('btnDialogo').addEventListener('click', tocarDialogo);
    window.scrollTo(0, 0);
  }

  async function tocarDialogo() {
    const sessao = (st.dialogoId = Math.random());
    for (const [i, [quem, fala]] of st.licao.d.entries()) {
      if (st.dialogoId !== sessao || st.modo !== 'aprenda') return;
      const linha = document.querySelector(`[data-linha="${i}"]`);
      linha?.classList.add('scale-[1.02]');
      linha?.querySelector('div')?.classList.add('ring-2', 'ring-navy-600/40');
      await Voz.falar(fala, { indice: quem === 'B' ? 1 : 0 });
      linha?.classList.remove('scale-[1.02]');
      linha?.querySelector('div')?.classList.remove('ring-2', 'ring-navy-600/40');
    }
  }

  // ===================== 2. PRATIQUE =====================
  function comecarPratica() {
    st.modo = 'pratica';
    st.i = 0;
    st.acertos = 0;
    st.avaliadas = 0;
    st.seguidas = 0;
    st.itens = [];
    st.erradas = [];
    if (st.relampago) iniciarCronometro();
    renderizarExercicio();
  }

  // ---------- Desafio relâmpago: 60 segundos ----------
  const TEMPO_RELAMPAGO = 60;
  function iniciarCronometro() {
    clearInterval(st.relogio);
    st.fimEm = Date.now() + TEMPO_RELAMPAGO * 1000;
    st.relogio = setInterval(() => {
      if (document.querySelector('[data-view="licao"]').classList.contains('hidden')) return clearInterval(st.relogio);
      atualizarCronometro();
      if (Date.now() >= st.fimEm) { clearInterval(st.relogio); if (st.modo === 'pratica') finalizar(); }
    }, 250);
    atualizarCronometro();
  }
  function atualizarCronometro() {
    const resta = Math.max(0, Math.ceil((st.fimEm - Date.now()) / 1000));
    el('licaoBarra').style.width = `${(resta / TEMPO_RELAMPAGO) * 100}%`;
    el('licaoBarra').classList.toggle('!bg-amber-400', resta <= 10);
    el('licaoContador').innerHTML = `<span class="inline-flex items-center gap-1 font-semibold ${resta <= 10 ? 'text-amber-300' : ''}">${Icone('relogio', 'w-4 h-4')}0:${String(resta).padStart(2, '0')}</span> · ${st.acertos} acertos`;
  }

  function cabecalho(ex) {
    return `
      <div class="flex flex-wrap items-center justify-between gap-2"><p class="text-xs font-bold uppercase tracking-widest text-brand-red">${App.escapar(ex.titulo)}</p>${ex.origem ? `<span class="text-[11px] font-semibold text-slate-400 bg-slate-100 rounded-full px-2.5 py-1">${App.escapar(ex.origem)}</span>` : ''}</div>${ex.tipo === 'ouvir' ? '<p class="mt-1 text-sm text-slate-400">Toque no botão para ouvir.</p>' : ''}
      <h2 class="mt-2 text-xl md:text-2xl font-bold text-navy-900 leading-snug">${comLacuna(ex.pergunta)}</h2>`;
  }
  const comLacuna = (txt) => App.escapar(txt).replace(/_{2,}/g,
    '<span class="inline-block w-16 md:w-20 border-b-[3px] border-brand-red mx-1 translate-y-1"></span>');

  function opcoesHtml(ex) {
    return `<div class="mt-6 grid gap-3">${ex.opcoes.map((op, i) => `
      <button data-op="${i}" class="opcao w-full flex items-center gap-4 text-left rounded-2xl border-2 border-slate-200 hover:border-navy-600/50 bg-white px-5 py-4">
        <span class="w-9 h-9 shrink-0 rounded-xl grid place-items-center font-bold text-sm bg-slate-100 text-slate-500">${LETRAS[i]}</span>
        <span class="font-medium text-slate-700">${App.escapar(op)}</span>
      </button>`).join('')}</div>`;
  }

  function renderizarExercicio() {
    st.respondida = false;
    esconderFeedback();
    atualizarBarra();
    const ex = st.exercicios[st.i];
    let corpo = '';

    if (ex.tipo === 'escolha') {
      corpo = `${cabecalho(ex)}${ex.falar ? `<div class="mt-3 flex gap-1">${botaoSom(ex.falar)}${botaoLento(ex.falar)}</div>` : ''}${opcoesHtml(ex)}`;
    } else if (ex.tipo === 'ouvir') {
      corpo = `${cabecalho(ex)}
        <div class="mt-6 flex justify-center gap-3">
          <button data-falar="${App.escapar(ex.audio)}" class="w-20 h-20 rounded-full bg-navy-900 hover:bg-navy-800 text-white grid place-items-center shadow-card transition hover:scale-105">${icone.som.replace('w-5 h-5', 'w-9 h-9')}</button>
          <button data-falar="${App.escapar(ex.audio)}" data-lento="1" class="h-12 px-4 self-end rounded-full bg-slate-100 hover:bg-slate-200 inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 transition" title="Devagar">${Icone('lento', 'w-4 h-4')}Lento</button>
        </div>${opcoesHtml(ex)}`;
    } else if (ex.tipo === 'dialogo') {
      corpo = `${cabecalho(ex)}
        <div class="mt-6 space-y-2.5 bg-slate-50 rounded-2xl p-4">
          ${ex.linhas.map(([quem, fala], i) => `
            <div class="flex items-start gap-2 ${quem === 'B' ? 'flex-row-reverse text-right' : ''}">
              <span class="w-7 h-7 shrink-0 rounded-full ${quem === 'B' ? 'bg-brand-red' : 'bg-navy-900'} text-white grid place-items-center text-[11px] font-bold">${quem}</span>
              ${i === ex.falta
                ? '<span class="px-4 py-2 rounded-xl border-2 border-dashed border-brand-red text-brand-red font-semibold">? ? ?</span>'
                : `<span class="px-4 py-2 rounded-xl bg-white text-slate-700 text-sm">${App.escapar(fala)}</span>`}
            </div>`).join('')}
        </div>${opcoesHtml(ex)}`;
    } else if (ex.tipo === 'ordenar') {
      st.montagem = [];
      corpo = `${cabecalho(ex)}
        <div id="areaResposta" class="mt-6 min-h-[64px] flex flex-wrap gap-2 p-3 rounded-2xl border-2 border-dashed border-slate-300 bg-white"></div>
        <div id="areaPalavras" class="mt-4 flex flex-wrap gap-2"></div>
        <button id="btnVerificar" disabled class="mt-6 w-full bg-navy-900 hover:bg-navy-800 disabled:opacity-40 text-white font-semibold py-3.5 rounded-xl transition">Verificar</button>`;
    } else if (ex.tipo === 'falar') {
      corpo = `${cabecalho(ex)}
        <div class="mt-6 bg-slate-50 rounded-2xl p-6 text-center">
          <p class="font-display text-2xl font-bold text-navy-900">${App.escapar(ex.frase)}</p>
          <div class="mt-3 flex justify-center gap-1">${botaoSom(ex.frase)}${botaoLento(ex.frase)}</div>
        </div>
        <div id="areaFala" class="mt-6 text-center"></div>`;
    } else if (ex.tipo === 'digitar') {
      corpo = `${cabecalho(ex)}
        ${ex.audio ? `
          <div class="mt-6 flex justify-center gap-3">
            <button data-falar="${App.escapar(ex.audio)}" class="w-20 h-20 rounded-full bg-navy-900 hover:bg-navy-800 text-white grid place-items-center shadow-card transition hover:scale-105" aria-label="Ouvir">${icone.som.replace('w-5 h-5', 'w-9 h-9')}</button>
            <button data-falar="${App.escapar(ex.audio)}" data-lento="1" class="h-12 px-4 self-end rounded-full bg-slate-100 hover:bg-slate-200 inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 transition" title="Devagar">${Icone('lento', 'w-4 h-4')}Lento</button>
          </div>` : ''}
        <div class="mt-6">
          <input id="inputResposta" type="text" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" lang="en"
            placeholder="${ex.frase ? 'Escreva a frase que você ouviu…' : 'Digite sua resposta…'}" class="campo text-lg" />
          <div id="diffResposta" class="hidden mt-3 flex flex-wrap gap-1.5"></div>
          ${ex.dica ? `<p class="mt-2 text-sm text-slate-400"><button id="btnDica" class="font-semibold text-navy-600 hover:text-brand-red underline underline-offset-2">Mostrar dica</button> <span id="textoDica" class="hidden font-mono tracking-wider text-slate-500">${App.escapar(ex.dica)}</span></p>` : ''}
        </div>
        <div class="mt-6 flex flex-col sm:flex-row gap-3">
          <button id="btnVerificar" disabled class="flex-1 bg-navy-900 hover:bg-navy-800 disabled:opacity-40 text-white font-semibold py-3.5 rounded-xl transition">Verificar</button>
          <button id="btnNaoSei" class="sm:w-40 border border-slate-200 hover:border-navy-900 text-slate-500 hover:text-navy-900 font-semibold py-3.5 rounded-xl transition">Não sei</button>
        </div>`;
    } else if (ex.tipo === 'flashcard') {
      corpo = `${cabecalho(ex)}
        <div class="mt-6 flip-cartao" id="cartaoFlash">
          <div class="flip-interno">
            <div class="flip-face bg-brand-hero text-white">
              <p class="text-[11px] font-semibold uppercase tracking-widest text-white/50">Inglês</p>
              <p class="mt-3 font-display text-2xl md:text-3xl font-bold">${comLacuna(ex.frente)}</p>
            </div>
            <div class="flip-face flip-verso bg-white border-2 border-navy-600/20">
              <p class="text-[11px] font-semibold uppercase tracking-widest text-slate-400">Resposta</p>
              <p class="mt-3 font-display text-2xl md:text-3xl font-bold text-navy-900">${App.escapar(ex.verso)}</p>
            </div>
          </div>
        </div>
        <div class="mt-4 flex justify-center gap-1">${botaoSom(ex.audio)}${botaoLento(ex.audio)}</div>
        <div id="acoesFlash" class="mt-5">
          <button id="btnVirar" class="w-full bg-navy-900 hover:bg-navy-800 text-white font-semibold py-3.5 rounded-xl transition">Mostrar resposta</button>
        </div>`;
    }

    el('licaoConteudo').innerHTML = `<article class="lesson-enter bg-white rounded-[2rem] border border-slate-200 shadow-sm p-6 md:p-9">${corpo}</article>`;
    ligarSons(el('licaoConteudo'));

    if (['escolha', 'ouvir', 'dialogo'].includes(ex.tipo)) {
      el('licaoConteudo').querySelectorAll('[data-op]').forEach((b) =>
        b.addEventListener('click', () => responderEscolha(Number(b.dataset.op)))
      );
    }
    if (ex.tipo === 'ordenar') montarOrdenar(ex);
    if (ex.tipo === 'falar') prepararFala(ex);
    if (ex.tipo === 'digitar') prepararDigitar(ex);
    if (ex.tipo === 'flashcard') prepararFlashcard(ex);
    window.scrollTo(0, 0);
  }

  function responderEscolha(i) {
    if (st.respondida) return;
    const ex = st.exercicios[st.i];
    const certo = i === ex.correta;
    el('licaoConteudo').querySelectorAll('[data-op]').forEach((b) => {
      const k = Number(b.dataset.op);
      b.disabled = true;
      b.classList.remove('hover:border-navy-600/50');
      if (k === ex.correta) {
        b.classList.add('!border-emerald-500', '!bg-emerald-50', certo ? 'anim-acerto' : 'anim-revela');
        b.querySelector('span').className = 'w-9 h-9 shrink-0 rounded-xl grid place-items-center bg-emerald-500 text-white';
        b.querySelector('span').innerHTML = Icone('check', 'w-5 h-5');
        if (certo) soltarFaiscas(b);
      } else if (k === i) {
        b.classList.add('!border-red-400', '!bg-red-50', 'anim-erro');
        b.querySelector('span').className = 'w-9 h-9 shrink-0 rounded-xl grid place-items-center bg-red-500 text-white';
        b.querySelector('span').innerHTML = Icone('x', 'w-5 h-5');
      } else b.classList.add('opacity-50');
    });
    corrigir(certo, ex.opcoes[ex.correta], ex.depois);
  }

  function montarOrdenar(ex) {
    const desenhar = () => {
      el('areaResposta').innerHTML = st.montagem.length
        ? st.montagem.map((k, pos) => `<button data-tirar="${pos}" class="px-3 py-2 rounded-xl bg-navy-900 text-white font-medium">${App.escapar(ex.palavras[k])}</button>`).join('')
        : '<span class="text-sm text-slate-400 self-center px-2">Toque nas palavras abaixo…</span>';
      el('areaPalavras').innerHTML = ex.palavras.map((p, k) => `
        <button data-por="${k}" ${st.montagem.includes(k) ? 'disabled' : ''}
          class="px-3 py-2 rounded-xl border-2 border-slate-200 bg-white font-medium text-slate-700 hover:border-navy-600 disabled:opacity-25 disabled:pointer-events-none transition">${App.escapar(p)}</button>`).join('');
      el('btnVerificar').disabled = st.montagem.length !== ex.palavras.length;
      el('areaResposta').querySelectorAll('[data-tirar]').forEach((b) => b.addEventListener('click', () => {
        if (st.respondida) return;
        st.montagem.splice(Number(b.dataset.tirar), 1); desenhar();
      }));
      el('areaPalavras').querySelectorAll('[data-por]').forEach((b) => b.addEventListener('click', () => {
        if (st.respondida) return;
        st.montagem.push(Number(b.dataset.por)); desenhar();
      }));
    };
    desenhar();
    el('btnVerificar').addEventListener('click', () => {
      if (st.respondida) return;
      const montada = st.montagem.map((k) => ex.palavras[k]).join(' ');
      const certo = montada.toLowerCase() === ex.resposta.toLowerCase();
      el('areaResposta').classList.remove('border-slate-300');
      el('areaResposta').classList.add(certo ? 'border-emerald-500' : 'border-red-400', certo ? 'bg-emerald-50' : 'bg-red-50', certo ? 'anim-acerto' : 'anim-erro');
      if (certo) soltarFaiscas(el('areaResposta'));
      el('btnVerificar').disabled = true;
      corrigir(certo, ex.resposta, ex.depois);
    });
  }

  // ---------- Digitar (escrita e ditado) ----------
  function prepararDigitar(ex) {
    const input = el('inputResposta');
    const verificar = el('btnVerificar');
    input.addEventListener('input', () => { verificar.disabled = !input.value.trim(); });
    input.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      e.stopPropagation(); // o mesmo Enter não pode pular para a próxima atividade
      if (!st.respondida && input.value.trim()) verificar.click();
      else if (st.respondida) el('btnContinuar').click();
    });
    el('btnDica')?.addEventListener('click', (e) => { e.target.classList.add('hidden'); el('textoDica').classList.remove('hidden'); st.usouDica = true; });
    el('btnNaoSei').addEventListener('click', () => { if (!st.respondida) responderDigitar(ex, ''); });
    verificar.addEventListener('click', () => { if (!st.respondida) responderDigitar(ex, input.value); });
    if (!ex.audio) setTimeout(() => input.focus(), 60);
  }

  function responderDigitar(ex, valor) {
    const r = Atividades.conferir(valor, ex.respostas);
    const input = el('inputResposta');
    input.disabled = true;
    el('btnVerificar').disabled = true;
    el('btnNaoSei').disabled = true;
    input.classList.add(r.certo ? '!border-emerald-500' : '!border-red-400', r.certo ? '!bg-emerald-50' : '!bg-red-50', r.certo ? 'anim-acerto' : 'anim-erro');
    if (r.certo) soltarFaiscas(input);
    // Mostra palavra por palavra o que estava certo, com erro de digitação ou faltando
    if (valor.trim() && (!r.certo || r.quase)) {
      const cor = { igual: 'bg-emerald-100 text-emerald-800', quase: 'bg-amber-100 text-amber-800', falta: 'bg-red-100 text-red-700 line-through decoration-2' };
      el('diffResposta').innerHTML = r.marcas.map(([p, t]) => `<span class="px-2 py-1 rounded-lg text-sm font-medium ${cor[t]}">${App.escapar(p)}</span>`).join('')
        + (r.extras ? `<span class="px-2 py-1 text-xs text-slate-400">+${r.extras} palavra(s) a mais</span>` : '');
      el('diffResposta').classList.remove('hidden');
    }
    const extra = [r.certo && r.quase ? 'Atenção à grafia' : '', ex.traducao ? `“${ex.traducao}”` : ''].filter(Boolean).join(' · ');
    corrigir(r.certo, ex.depois || ex.respostas[0], ex.depois || ex.audio, extra);
  }

  // ---------- Flashcard: lembrou ou não? ----------
  function prepararFlashcard(ex) {
    el('btnVirar').addEventListener('click', () => {
      el('cartaoFlash').classList.add('virado');
      el('acoesFlash').innerHTML = `
        <p class="text-center text-sm text-slate-500 mb-3">Você lembrou da resposta?</p>
        <div class="grid grid-cols-2 gap-3">
          <button id="btnNaoLembrei" class="border-2 border-red-200 hover:border-red-400 text-red-700 font-semibold py-3.5 rounded-xl transition">Não lembrei</button>
          <button id="btnLembrei" class="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3.5 rounded-xl transition">Lembrei</button>
        </div>`;
      el('btnNaoLembrei').addEventListener('click', () => !st.respondida && corrigir(false, ex.verso, ex.audio));
      el('btnLembrei').addEventListener('click', () => !st.respondida && corrigir(true, ex.verso, ex.audio));
    });
  }

  // ---------- Atividade de fala ----------
  const AJUDA_PERMISSAO = 'Clique no ícone de cadeado (ou de microfone) ao lado do endereço do site, permita o microfone e tente de novo.';

  function avisoModo() {
    const motivo = Voz.motivoSemReconhecer();
    const textos = {
      arquivo: 'Você abriu o site direto do arquivo. Nesse modo, a correção automática da pronúncia fica indisponível, mas você pode gravar sua voz e comparar com o modelo.',
      navegador: 'Seu navegador não tem correção automática de pronúncia. Grave sua voz e compare com o modelo.',
      falhou: 'A correção automática da pronúncia não respondeu neste navegador. Grave sua voz e compare com o modelo.',
    };
    return textos[motivo]
      ? `<p class="mt-4 text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-left">${textos[motivo]}</p>`
      : '';
  }

  function prepararFala(ex) {
    const modo = Voz.modoFala();
    if (modo === 'reconhecer') falaReconhecer(ex);
    else if (modo === 'gravar') falaGravar(ex);
    else falaRepetir(ex, 'Não encontramos um microfone disponível neste navegador. Ouça a frase e repita em voz alta.');
  }

  // Modo 1: o navegador transcreve a fala e corrige
  function falaReconhecer(ex) {
    el('areaFala').innerHTML = `
      <button id="btnMic" class="w-24 h-24 rounded-full bg-brand-red hover:bg-brand-redDark text-white grid place-items-center mx-auto shadow-glow transition hover:scale-105" aria-label="Falar">${icone.mic}</button>
      <p id="micStatus" class="mt-3 text-sm text-slate-500">Toque no microfone e leia a frase em voz alta.</p>
      <button id="btnPularFala" class="mt-3 text-xs text-slate-400 hover:text-navy-900 underline">Não posso falar agora</button>`;
    let tentativas = 0;
    el('btnPularFala').addEventListener('click', () => corrigir(null, null));
    el('btnMic').addEventListener('click', async () => {
      if (st.respondida) return;
      Voz.parar();
      const btn = el('btnMic');
      btn.classList.add('animate-pulse');
      el('micStatus').textContent = 'Ouvindo… fale agora.';
      try {
        const opcoes = await Voz.ouvirAluno();
        const melhor = opcoes.reduce((m, t) => (Voz.semelhanca(ex.frase, t) > Voz.semelhanca(ex.frase, m) ? t : m), opcoes[0]);
        const nota = Voz.semelhanca(ex.frase, melhor);
        tentativas++;
        if (nota >= 0.7 || tentativas >= 3) {
          corrigir(nota >= 0.7, ex.frase, null, `Entendemos: “${melhor}”`);
        } else {
          el('micStatus').innerHTML = `Entendemos: “<b>${App.escapar(melhor)}</b>”. Quase! Tente de novo (${tentativas}/3).`;
        }
      } catch (err) {
        const e = err.message;
        if (e === 'not-allowed' && navigator.permissions) {
          // Descobre se foi o aluno que negou o microfone ou o navegador que bloqueou o serviço de voz
          const perm = await navigator.permissions.query({ name: 'microphone' }).catch(() => null);
          if (perm?.state === 'denied') {
            el('micStatus').innerHTML = `<b class="text-red-600">O microfone está bloqueado para este site.</b><br />${AJUDA_PERMISSAO}`;
            return;
          }
        }
        if (['not-allowed', 'service-not-allowed', 'network', 'sem-suporte', 'language-not-supported'].includes(e)) {
          Voz.marcarFalhaReconhecer();      // não tenta mais nesta sessão
          falaGravar(ex);                  // troca na hora para o modo de gravação
        } else if (e === 'audio-capture') {
          el('micStatus').innerHTML = '<b class="text-red-600">Nenhum microfone encontrado.</b><br />Confira se ele está conectado e se não está sendo usado por outro programa.';
        } else {
          el('micStatus').textContent = 'Não ouvimos nada. Toque no microfone e fale mais perto.';
        }
      } finally {
        btn?.classList.remove('animate-pulse');
      }
    });
  }

  // Modo 2: grava a voz do aluno para ele ouvir e comparar com o modelo
  function falaGravar(ex) {
    let urlGravada = null;
    const desenhar = (estado, extra = '') => {
      if (st.respondida) return;
      const botaoMic = estado === 'gravando'
        ? `<button id="btnGravar" class="w-24 h-24 rounded-full bg-red-600 text-white grid place-items-center mx-auto shadow-glow animate-pulse" aria-label="Parar gravação">
             <span class="w-7 h-7 rounded-md bg-white"></span></button>`
        : `<button id="btnGravar" class="w-24 h-24 rounded-full bg-brand-red hover:bg-brand-redDark text-white grid place-items-center mx-auto shadow-glow transition hover:scale-105" aria-label="Gravar">${icone.mic}</button>`;
      const status = {
        inicio: 'Toque no microfone, leia a frase em voz alta e toque de novo para parar.',
        gravando: 'Gravando… leia a frase e toque para parar.',
        pronto: 'Agora ouça e compare a sua pronúncia com o modelo.',
      }[estado];
      el('areaFala').innerHTML = `
        ${botaoMic}
        <p id="micStatus" class="mt-3 text-sm text-slate-500">${extra || status}</p>
        ${estado === 'pronto' ? `
          <div class="mt-5 grid sm:grid-cols-2 gap-3 max-w-md mx-auto">
            <button id="btnOuvirModelo" class="inline-flex items-center justify-center gap-2 border border-slate-200 hover:border-navy-900 rounded-xl py-3 font-semibold text-navy-900 transition">${Icone('som', 'w-4 h-4')}Ouvir o modelo</button>
            <button id="btnOuvirMinha" class="inline-flex items-center justify-center gap-2 border border-slate-200 hover:border-navy-900 rounded-xl py-3 font-semibold text-navy-900 transition">${Icone('microfone', 'w-4 h-4')}Ouvir minha voz</button>
          </div>
          <div class="mt-4 flex flex-col sm:flex-row justify-center gap-3">
            <button id="btnConcluirFala" class="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl px-6 py-3 transition">Ficou parecido</button>
            <button id="btnRegravar" class="text-sm font-semibold text-slate-500 hover:text-navy-900 underline">Gravar de novo</button>
          </div>` : ''}
        ${estado !== 'gravando' ? '<button id="btnPularFala" class="mt-4 text-xs text-slate-400 hover:text-navy-900 underline">Não posso falar agora</button>' : ''}
        ${avisoModo()}`;

      el('btnGravar').addEventListener('click', alternar);
      el('btnPularFala')?.addEventListener('click', () => { Voz.pararGravacao(true); corrigir(null, null); });
      el('btnOuvirModelo')?.addEventListener('click', () => Voz.falar(ex.frase));
      el('btnOuvirMinha')?.addEventListener('click', () => Voz.tocarGravacao(urlGravada));
      el('btnRegravar')?.addEventListener('click', alternar);
      el('btnConcluirFala')?.addEventListener('click', () => corrigir(null, null, null, 'Pronúncia praticada'));
    };

    async function alternar() {
      if (st.respondida) return;
      if (Voz.gravando()) { Voz.pararGravacao(); return; }
      Voz.parar();
      try {
        const promessa = Voz.comecarGravacao(8);
        desenhar('gravando');
        const url = await promessa;
        if (urlGravada) URL.revokeObjectURL(urlGravada);
        urlGravada = url;
        if (url) desenhar('pronto'); else desenhar('inicio', 'Não conseguimos gravar. Tente de novo, falando mais perto do microfone.');
      } catch (err) {
        const n = err?.name || '';
        if (n === 'NotAllowedError' || n === 'SecurityError') {
          desenhar('inicio', `<b class="text-red-600">O microfone foi bloqueado.</b><br />${AJUDA_PERMISSAO}`);
        } else if (n === 'NotFoundError' || n === 'OverconstrainedError') {
          falaRepetir(ex, 'Nenhum microfone foi encontrado neste aparelho. Ouça a frase e repita em voz alta.');
        } else if (n === 'NotReadableError') {
          desenhar('inicio', '<b class="text-red-600">O microfone está sendo usado por outro programa.</b><br />Feche o outro programa (como uma chamada de vídeo) e tente de novo.');
        } else {
          desenhar('inicio', 'Não foi possível usar o microfone. Tente de novo.');
        }
      }
    }
    desenhar('inicio');
  }

  // Modo 3: sem microfone
  function falaRepetir(ex, texto) {
    el('areaFala').innerHTML = `
      <p class="text-sm text-slate-500 max-w-md mx-auto">${texto}</p>
      <button id="btnJaRepeti" class="mt-4 bg-navy-900 hover:bg-navy-800 text-white font-semibold px-8 py-3 rounded-xl transition">Já repeti</button>`;
    el('btnJaRepeti').addEventListener('click', () => corrigir(null, null));
  }

  // certo: true / false / null (não avaliada)
  function corrigir(certo, resposta, falarDepois, detalhe = '') {
    st.respondida = true;
    const atual = st.exercicios[st.i];
    if (certo !== null && atual?.ref) st.itens.push({ item: atual.ref, certo: !!certo });
    if (certo === false && atual) st.erradas.push(atual);
    if (certo !== null) {
      st.avaliadas++;
      if (certo) st.acertos++;
    }
    st.seguidas = certo === true ? (st.seguidas || 0) + 1 : certo === false ? 0 : st.seguidas || 0;
    st.falarDepois = falarDepois || null; // só toca se o aluno clicar em "Ouvir a frase"

    const fb = el('feedback');
    const ok = certo !== false;
    fb.className = `anim-sobe fixed inset-x-0 bottom-0 z-40 border-t-4 ${ok ? 'bg-emerald-50 border-emerald-400' : 'bg-red-50 border-red-400'}`;
    el('feedbackIcone').className = `anim-pop w-10 h-10 shrink-0 rounded-full grid place-items-center text-white ${ok ? 'bg-emerald-500' : 'bg-red-500'}`;
    el('feedbackIcone').innerHTML = Icone(ok ? 'check' : 'x', 'w-6 h-6');
    const elogios = ['Muito bem!', 'Excelente!', 'Isso aí!', 'Perfeito!', 'Great job!'];
    el('feedbackTitulo').textContent = certo === null ? 'Ótimo, continue praticando!' : certo ? elogios[Math.floor(Math.random() * elogios.length)] : 'Quase lá!';
    el('feedbackTitulo').className = `font-display font-bold text-lg ${ok ? 'text-emerald-700' : 'text-red-700'}`;
    el('feedbackTexto').innerHTML = [
      certo === false && resposta ? `Resposta certa: <b>${App.escapar(resposta)}</b>` : '',
      certo === true ? (st.revisao ? '+5 XP' : '+10 XP') : '',
      certo === true && st.seguidas >= 3 ? `${st.seguidas} acertos seguidos` : '',
      detalhe ? App.escapar(detalhe) : '',
    ].filter(Boolean).join(' · ')
      + (st.falarDepois ? ` <button id="btnOuvirFrase" class="ml-1 inline-flex items-center gap-1 font-semibold underline underline-offset-2">${Icone('som', 'w-4 h-4')}Ouvir a frase</button>` : '');
    el('btnOuvirFrase')?.addEventListener('click', () => Voz.falar(st.falarDepois));
    el('feedbackTexto').className = `text-sm ${ok ? 'text-emerald-800' : 'text-red-800'}`;
    el('btnContinuar').className = `btn-shine shrink-0 px-8 py-3.5 rounded-xl font-display font-semibold text-white transition ${ok ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'}`;
    el('btnContinuar').textContent = st.i === st.exercicios.length - 1 ? 'Ver resultado' : 'Continuar';
    fb.classList.remove('hidden');
    if (st.relampago) {
      // no desafio, segue sozinho para não perder tempo
      const i = st.i;
      setTimeout(() => { if (st.modo === 'pratica' && st.i === i && st.respondida) el('btnContinuar').click(); }, certo ? 550 : 1300);
    } else if (!document.activeElement?.matches('#inputResposta')) el('btnContinuar').focus();
  }

  function esconderFeedback() { el('feedback').classList.add('hidden'); }

  el('btnContinuar').addEventListener('click', () => {
    if (!st.respondida) return;
    Voz.pararGravacao(true);
    if (st.i < st.exercicios.length - 1) { st.i++; renderizarExercicio(); }
    else finalizar();
  });

  document.addEventListener('keydown', (e) => {
    if (document.querySelector('[data-view="licao"]').classList.contains('hidden') || st.modo !== 'pratica') return;
    if (e.target.matches?.('input, textarea')) return;
    if (e.key === 'Enter' && st.respondida) { e.preventDefault(); el('btnContinuar').click(); return; }
    const k = { 1: 0, 2: 1, 3: 2, 4: 3, a: 0, b: 1, c: 2, d: 3 }[e.key.toLowerCase()];
    const ex = st.exercicios[st.i];
    if (k !== undefined && !st.respondida && ['escolha', 'ouvir', 'dialogo'].includes(ex.tipo) && ex.opcoes[k] !== undefined) responderEscolha(k);
  });

  // ===================== 3. RESULTADO =====================
  async function finalizar() {
    if (st.revisao) return finalizarRevisao();
    esconderFeedback();
    st.modo = 'resultado';
    atualizarBarra();
    Voz.parar();
    const total = Math.max(st.avaliadas, 1);
    const porcentagem = Math.round((st.acertos / total) * 100);
    const minimo = st.teste ? 70 : 60;
    const passou = porcentagem >= minimo;

    el('licaoConteudo').innerHTML = '<div class="py-24 grid place-items-center"><span class="spinner spinner-escuro" style="width:32px;height:32px"></span></div>';

    let resp = null;
    let erro = null;
    if (!st.admin) {
      const { data, error } = await sb.rpc('registrar_atividade', { p_nivel: st.n, p_licao: st.l, p_acertos: st.acertos, p_total: total });
      if (error) erro = error.message; else resp = data;
      App.limparPerfil();
      // guarda o que o aluno acertou e errou para a revisão inteligente
      if (st.itens.length) sb.rpc('registrar_revisao', { p_modo: 'licao', p_itens: st.itens, p_acertos: 0, p_total: 0 }).then(() => {}, () => {});
    }

    const C = 2 * Math.PI * 54;
    const subiu = resp?.subiu || resp?.concluiu_curso;
    const proximo = st.teste ? null : st.l < 4 ? `#/licao?n=${st.n}&l=${st.l + 1}` : `#/licao?n=${st.n}&l=0`;

    let titulo, texto;
    if (st.teste) {
      if (resp?.concluiu_curso) { titulo = 'Você concluiu o curso!'; texto = 'Parabéns! Você completou os 16 níveis da English Smart. You speak English!'; }
      else if (resp?.subiu) { titulo = `Você chegou ao nível ${resp.nivel_num}!`; texto = `Teste aprovado. Seu certificado do nível ${st.n} já está disponível.`; }
      else if (passou) { titulo = 'Teste aprovado!'; texto = 'Você já tinha concluído este nível. Ótima revisão!'; }
      else { titulo = 'Ainda não foi desta vez'; texto = `Você precisa de ${minimo}% para passar. Revise as lições e tente de novo; você consegue!`; }
    } else {
      titulo = passou ? 'Lição concluída!' : 'Faltou pouco!';
      texto = passou ? (st.l < 4 ? 'Siga para a próxima lição da trilha.' : 'Você terminou as 4 lições. Hora do teste do nível!')
        : `Para concluir a lição você precisa de ${minimo}%. Revise o conteúdo e tente de novo.`;
    }

    el('licaoConteudo').innerHTML = `
      <div class="relative overflow-hidden bg-white rounded-[2rem] border border-slate-200 shadow-sm p-8 md:p-10 text-center lesson-enter">
        <svg viewBox="0 0 120 120" class="w-36 h-36 mx-auto -rotate-90">
          <circle cx="60" cy="60" r="54" fill="none" stroke="#F1F5F9" stroke-width="10"/>
          <circle id="anelResultado" cx="60" cy="60" r="54" fill="none" stroke="${passou ? '#10B981' : '#EB1F3B'}" stroke-width="10" stroke-linecap="round"
            stroke-dasharray="${C}" stroke-dashoffset="${C}" style="transition:stroke-dashoffset 1.2s cubic-bezier(.2,.8,.2,1)"/>
        </svg>
        <p class="-mt-[5.6rem] mb-12 font-display text-4xl font-extrabold text-navy-900">${porcentagem}%</p>
        <h1 class="text-2xl md:text-3xl font-extrabold text-navy-900">${titulo}</h1>
        <p class="mt-2 text-slate-500 max-w-md mx-auto">${texto}</p>
        <div class="mt-6 flex flex-wrap justify-center gap-3">
          <span class="bg-slate-50 rounded-xl px-4 py-2 text-sm"><b class="text-navy-900">${st.acertos}/${st.avaliadas}</b> acertos</span>
          ${resp ? `<span class="bg-amber-50 text-amber-800 rounded-xl px-4 py-2 text-sm font-semibold">+${resp.xp_ganho} XP</span>` : ''}
          ${st.admin ? '<span class="bg-slate-50 rounded-xl px-4 py-2 text-sm text-slate-500">Modo administrador: nada foi salvo</span>' : ''}
        </div>
        ${erro ? `<p class="mt-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3">Não foi possível salvar: ${App.escapar(erro)}</p>` : ''}
        <div class="mt-8 flex flex-col sm:flex-row justify-center gap-3">
          ${subiu ? `<a href="#/certificado?n=${st.n}" class="btn-shine font-semibold bg-brand-red hover:bg-brand-redDark text-white rounded-xl px-6 py-3 shadow-glow transition">Ver meu certificado</a>` : ''}
          ${!st.teste && passou && proximo ? `<a href="${proximo}" class="btn-shine font-semibold bg-brand-red hover:bg-brand-redDark text-white rounded-xl px-6 py-3 shadow-glow transition">${st.l < 4 ? 'Próxima lição →' : 'Fazer o teste do nível →'}</a>` : ''}
          ${!passou ? `<button id="btnRefazer" class="font-semibold bg-navy-900 hover:bg-navy-800 text-white rounded-xl px-6 py-3 transition">Tentar de novo</button>` : ''}
          <a href="#/curso?n=${subiu && resp?.nivel_num ? resp.nivel_num : st.n}" class="font-semibold border border-slate-200 hover:border-navy-900 text-navy-900 rounded-xl px-6 py-3 transition">Voltar à trilha</a>
        </div>
      </div>`;

    requestAnimationFrame(() => setTimeout(() => {
      const anel = document.getElementById('anelResultado');
      if (anel) anel.style.strokeDashoffset = C * (1 - porcentagem / 100);
    }, 60));
    if (passou) soltarConfete(el('licaoConteudo').firstElementChild);
    el('btnRefazer')?.addEventListener('click', () => iniciarSessao());
    window.scrollTo(0, 0);
  }

  // ===================== RESULTADO DA REVISÃO =====================
  async function finalizarRevisao() {
    clearInterval(st.relogio);
    esconderFeedback();
    st.modo = 'resultado';
    el('licaoBarra').style.width = '100%';
    el('licaoBarra').classList.remove('!bg-amber-400');
    el('licaoContador').textContent = '';
    Voz.parar();
    const avaliadas = st.avaliadas;
    const porcentagem = avaliadas ? Math.round((st.acertos / avaliadas) * 100) : 0;
    el('licaoConteudo').innerHTML = '<div class="py-24 grid place-items-center"><span class="spinner spinner-escuro" style="width:32px;height:32px"></span></div>';

    let resp = null, erro = null;
    if (!st.admin && avaliadas) {
      const { data, error } = await sb.rpc('registrar_revisao', { p_modo: st.modoRevisao, p_itens: st.itens.slice(0, 80), p_acertos: st.acertos, p_total: avaliadas });
      if (error) erro = error.message; else resp = data;
      App.limparPerfil();
    }
    const recorde = st.relampago && resp && st.acertos > 0 && (resp.recorde_anterior == null || st.acertos > resp.recorde_anterior);
    const info = MODOS_REVISAO[st.modoRevisao];
    const C = 2 * Math.PI * 54;
    const bom = porcentagem >= 70;
    const titulo = st.relampago ? (recorde ? 'Novo recorde!' : 'Tempo esgotado!')
      : bom ? 'Revisão concluída!' : 'Boa! Revisar é assim mesmo';
    const texto = st.relampago ? `Você acertou ${st.acertos} em ${TEMPO_RELAMPAGO} segundos.${resp?.recorde_anterior != null && !recorde ? ` Seu recorde é ${resp.recorde_anterior}.` : ''}`
      : bom ? 'Os itens que você acertou voltam mais tarde, com intervalos cada vez maiores.' : 'O que você errou volta já na próxima revisão do dia até ficar fixado.';
    const erradas = st.erradas;
    const respostaDe = (ex) => ex.depois || ex.verso || ex.resposta || ex.respostas?.[0] || ex.opcoes?.[ex.correta] || '';
    const enunciadoDe = (ex) => ex.tipo === 'digitar' && ex.audio ? 'Ditado' : ex.tipo === 'flashcard' ? ex.frente : ex.pergunta;

    el('licaoConteudo').innerHTML = `
      <div class="relative overflow-hidden bg-white rounded-[2rem] border border-slate-200 shadow-sm p-8 md:p-10 text-center lesson-enter">
        <svg viewBox="0 0 120 120" class="w-36 h-36 mx-auto -rotate-90">
          <circle cx="60" cy="60" r="54" fill="none" stroke="#F1F5F9" stroke-width="10"/>
          <circle id="anelResultado" cx="60" cy="60" r="54" fill="none" stroke="${bom || recorde ? '#10B981' : '#023FA0'}" stroke-width="10" stroke-linecap="round"
            stroke-dasharray="${C}" stroke-dashoffset="${C}" style="transition:stroke-dashoffset 1.2s cubic-bezier(.2,.8,.2,1)"/>
        </svg>
        <p class="-mt-[5.6rem] mb-12 font-display text-4xl font-extrabold text-navy-900">${st.relampago ? st.acertos : `${porcentagem}%`}</p>
        <h1 class="text-2xl md:text-3xl font-extrabold text-navy-900">${titulo}</h1>
        <p class="mt-2 text-slate-500 max-w-md mx-auto">${texto}</p>
        <div class="mt-6 flex flex-wrap justify-center gap-3">
          <span class="bg-slate-50 rounded-xl px-4 py-2 text-sm"><b class="text-navy-900">${st.acertos}/${avaliadas}</b> acertos</span>
          ${resp ? `<span class="bg-amber-50 text-amber-800 rounded-xl px-4 py-2 text-sm font-semibold">+${resp.xp_ganho} XP${resp.xp_ganho === 0 && st.acertos ? ' (limite diário de XP da revisão)' : ''}</span>` : ''}
          ${st.admin ? '<span class="bg-slate-50 rounded-xl px-4 py-2 text-sm text-slate-500">Modo administrador: nada foi salvo</span>' : ''}
        </div>
        ${erro ? `<p class="mt-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3">Não foi possível salvar: ${App.escapar(erro)}</p>` : ''}
        ${erradas.length ? `
          <div class="mt-8 text-left">
            <p class="text-xs font-bold uppercase tracking-widest text-brand-red">Para fixar (${erradas.length})</p>
            <ul id="listaErradas" class="mt-3 divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden">
              ${erradas.map((ex) => `
                <li class="flex items-center gap-3 px-4 py-3 bg-white">
                  <div class="min-w-0 flex-1">
                    <p class="text-xs text-slate-400 truncate">${App.escapar(enunciadoDe(ex))}</p>
                    <p class="font-semibold text-navy-900">${App.escapar(respostaDe(ex))}</p>
                  </div>
                  ${botaoSom(ex.audio || ex.falar || ex.depois || respostaDe(ex))}
                </li>`).join('')}
            </ul>
          </div>` : ''}
        <div class="mt-8 flex flex-col sm:flex-row justify-center gap-3">
          ${erradas.length ? `<button id="btnRefazerErros" class="btn-shine font-semibold bg-brand-red hover:bg-brand-redDark text-white rounded-xl px-6 py-3 shadow-glow transition">Treinar estes ${erradas.length} de novo</button>` : ''}
          <button id="btnNovaRevisao" class="font-semibold bg-navy-900 hover:bg-navy-800 text-white rounded-xl px-6 py-3 transition">${st.relampago ? 'Jogar de novo' : `Nova sessão: ${App.escapar(info.nome)}`}</button>
          <a href="#/revisao" class="font-semibold border border-slate-200 hover:border-navy-900 text-navy-900 rounded-xl px-6 py-3 transition">Voltar à revisão</a>
        </div>
      </div>`;
    ligarSons(el('licaoConteudo'));
    requestAnimationFrame(() => setTimeout(() => {
      const anel = document.getElementById('anelResultado');
      if (anel) anel.style.strokeDashoffset = C * (1 - (st.relampago ? Math.min(1, st.acertos / 20) : porcentagem / 100));
    }, 60));
    if (bom || recorde) soltarConfete(el('licaoConteudo').firstElementChild);
    el('btnRefazerErros')?.addEventListener('click', () => {
      st.exercicios = Atividades.embaralhar(erradas);
      st.relampago = false;
      comecarPratica();
    });
    el('btnNovaRevisao').addEventListener('click', () => { location.hash = `#/treino?modo=${st.modoRevisao}${st.faixa ? `&faixa=${st.faixa}` : ''}&r=${Date.now()}`; });
    window.scrollTo(0, 0);
  }

  // Modos da revisão (os textos também aparecem na tela #/revisao)
  const MODOS_REVISAO = {
    dia: { nome: 'Revisão do dia', texto: 'Os itens que estão vencendo na sua memória, no formato certo para cada um: quem você ainda erra aparece com opções; quem você já sabe, para escrever ou ouvir.' },
    erros: { nome: 'Meus erros', texto: 'Só o que você errou recentemente, para escrever de memória até fixar.' },
    estagio: { nome: 'Revisão do estágio', texto: 'Uma revisão acumulada de todas as lições do estágio, misturando gramática, vocabulário, escrita, ditado e fala.' },
    ditado: { nome: 'Ditado', texto: 'Ouça frases das lições e escreva exatamente o que ouviu. Treina ouvido e ortografia ao mesmo tempo.' },
    escrita: { nome: 'Escrita', texto: 'Escreva as palavras em inglês e complete as frases de gramática digitando, sem opções para escolher.' },
    relampago: { nome: 'Desafio relâmpago', texto: 'Quantas você acerta em 60 segundos? As respostas seguem sozinhas para não perder tempo.' },
    flashcards: { nome: 'Flashcards', texto: 'Veja a palavra, tente lembrar o significado, vire o cartão e diga se lembrou. As que você esquece voltam antes.' },
  };

  function introRevisao() {
    const info = MODOS_REVISAO[st.modoRevisao];
    st.modo = 'aprenda';
    el('licaoBarra').style.width = '0%';
    el('licaoContador').textContent = '';
    const tipos = [...new Set(st.exercicios.map((ex) => ({ escolha: 'Escolha', ouvir: 'Escuta', dialogo: 'Diálogo', ordenar: 'Montar frase', digitar: ex.audio ? 'Ditado' : 'Escrita', flashcard: 'Flashcard', falar: 'Fala' }[ex.tipo])))];
    el('licaoConteudo').innerHTML = `
      <div class="lesson-enter bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
        <div class="relative overflow-hidden bg-brand-hero text-white p-8 md:p-10">
          <div class="absolute inset-0 bg-grid opacity-70"></div>
          <div class="relative">
            <p class="text-white/60 font-medium">Revisão inteligente${st.faixa ? ` · Estágio ${st.faixa}` : ''}</p>
            <h1 class="mt-2 text-3xl md:text-4xl font-extrabold">${App.escapar(info.nome)}</h1>
            <p class="mt-3 text-white/70 text-lg">${App.escapar(info.texto)}</p>
          </div>
        </div>
        <div class="p-8 md:p-10">
          <div class="flex flex-wrap gap-2">
            <span class="text-sm font-semibold bg-slate-100 text-navy-900 rounded-full px-3 py-1.5">${st.relampago ? `${TEMPO_RELAMPAGO} segundos` : `${st.exercicios.length} atividades`}</span>
            ${tipos.map((t) => `<span class="text-sm bg-slate-50 border border-slate-200 text-slate-600 rounded-full px-3 py-1.5">${t}</span>`).join('')}
          </div>
          <ul class="mt-6 space-y-3 text-slate-600 text-sm">
            <li class="flex gap-3"><span class="text-brand-red mt-0.5">${Icone('check', 'w-4 h-4')}</span>Cada acerto vale <b>5 XP</b> (até 100 XP de revisão por dia) e a sessão conta na sua meta semanal.</li>
            <li class="flex gap-3"><span class="text-brand-red mt-0.5">${Icone('check', 'w-4 h-4')}</span>Nas respostas digitadas, maiúsculas, pontuação e contrações não contam como erro (I'm = I am).</li>
          </ul>
          <button id="btnIniciarRevisao" class="btn-shine mt-8 w-full bg-brand-red hover:bg-brand-redDark text-white font-display font-semibold text-lg py-4 rounded-2xl shadow-glow transition">${st.relampago ? 'Valendo! Começar' : 'Começar'}</button>
        </div>
      </div>`;
    el('btnIniciarRevisao').addEventListener('click', comecarPratica);
  }

  // ===================== Início =====================
  function iniciarSessao() {
    st.exercicios = st.teste ? Atividades.doTeste(st.n) : Atividades.daLicao(st.n, st.l);
    if (st.teste) {
      st.modo = 'aprenda';
      atualizarBarra();
      el('licaoConteudo').innerHTML = `
        <div class="lesson-enter bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
          <div class="relative overflow-hidden bg-brand-hero text-white p-8 md:p-10">
            <div class="absolute inset-0 bg-grid opacity-70"></div>
            <div class="relative">
              <p class="text-white/60 font-medium">Nível ${st.n} · ${App.escapar(nivelInfo(st.n).tema)}</p>
              <h1 class="mt-2 text-3xl md:text-4xl font-extrabold">Teste do nível</h1>
              <p class="mt-3 text-white/70 text-lg">${st.exercicios.length} questões sobre as 4 lições deste nível.</p>
            </div>
          </div>
          <div class="p-8 md:p-10">
            <ul class="space-y-3 text-slate-600">
              <li class="flex gap-3"><span class="text-brand-red mt-1">${Icone('check', 'w-4 h-4')}</span>Você precisa de <b>70%</b> de acertos para passar.</li>
              <li class="flex gap-3"><span class="text-brand-red mt-1">${Icone('check', 'w-4 h-4')}</span>Aprovado, você recebe o <b>certificado do nível ${st.n}</b>${st.n < 16 ? ` e libera o <b>nível ${st.n + 1}</b>` : ' e conclui o curso'}.</li>
              <li class="flex gap-3"><span class="text-brand-red mt-1">${Icone('check', 'w-4 h-4')}</span>Pode tentar quantas vezes quiser; as questões mudam a cada tentativa.</li>
            </ul>
            <button id="btnIniciarTeste" class="btn-shine mt-8 w-full bg-brand-red hover:bg-brand-redDark text-white font-display font-semibold text-lg py-4 rounded-2xl shadow-glow transition">Começar o teste</button>
          </div>
        </div>`;
      el('btnIniciarTeste').addEventListener('click', comecarPratica);
    } else {
      renderizarAprenda();
    }
  }

  // Sessão de revisão: #/treino?modo=dia|erros|estagio|ditado|escrita|relampago|flashcards[&faixa=B1]
  async function iniciarTreino(p, params) {
    clearInterval(st.relogio);
    const admin = p.papel === 'admin';
    const modo = params.get('modo');
    if (!MODOS_REVISAO[modo]) { location.hash = '#/revisao'; return false; }
    const faixa = modo === 'estagio' ? params.get('faixa') : null;
    const { licoes, memoria } = await Revisao.dados(p);
    const exercicios = Atividades.daRevisao(modo, { licoes, memoria, faixa });
    if (!exercicios.length) {
      App.toast(modo === 'erros' ? 'Você não tem erros para revisar agora.' : 'Ainda não há conteúdo para esta revisão. Faça uma lição primeiro.');
      location.hash = '#/revisao';
      return false;
    }
    st = { revisao: true, modoRevisao: modo, faixa, relampago: modo === 'relampago', admin, exercicios, i: 0, acertos: 0, avaliadas: 0, itens: [], erradas: [] };
    el('licaoVoltar').href = '#/revisao';
    el('licaoRotulo').textContent = `Revisão inteligente${faixa ? ` · ${faixa}` : ''}`;
    el('licaoTitulo').textContent = MODOS_REVISAO[modo].nome;
    introRevisao();
  }

  window.MODOS_REVISAO = MODOS_REVISAO;
  App.registrar('licao', {
    async iniciar({ rota, params }) {
      const p = await App.perfil(true);
      if (!p) { location.hash = '#/entrar'; return false; }
      if (p.papel === 'aluno' && !p.nivel_num) { location.hash = '#/prova'; return false; }
      if (rota === 'treino') {
        if (!p.premium) { location.hash = '#/planos?motivo=revisao'; return false; }
        return iniciarTreino(p, params);
      }
      {
        const l0 = Number(params.get('l'));
        if (!App.licaoLivre(p, l0)) { location.hash = `#/planos?motivo=${l0 === 0 ? 'teste' : 'licao'}`; return false; }
      }
      clearInterval(st.relogio);
      const admin = p.papel === 'admin';
      const n = Number(params.get('n'));
      const l = Number(params.get('l'));
      if (!(n >= 1 && n <= 16) || !(l >= 0 && l <= 4)) { location.hash = '#/curso'; return false; }
      if (!admin && n > p.nivel_num) { App.toast('Este nível ainda está bloqueado.'); location.hash = `#/curso?n=${n}`; return false; }

      if (l === 0 && !admin) {
        const { progresso } = await App.dadosDoAluno(p.id);
        const feitas = progresso.filter((r) => r.nivel_num === n && r.licao >= 1 && r.acertos >= r.total * 0.6).length;
        if (feitas < 4) { App.toast('Conclua as 4 lições do nível antes do teste.'); location.hash = `#/curso?n=${n}`; return false; }
      }

      st = { n, l, teste: l === 0, admin, licao: l ? nivelInfo(n).licoes[l - 1] : null, i: 0, acertos: 0, avaliadas: 0, itens: [], erradas: [] };
      el('licaoVoltar').href = `#/curso?n=${n}`;
      el('licaoRotulo').textContent = `Nível ${n} · ${faixaDoNivel(n)} · ${l ? `Lição ${l} de 4` : 'Teste do nível'}`;
      el('licaoTitulo').textContent = l ? st.licao.t : nivelInfo(n).tema;
      iniciarSessao();
    },
  });
})();
