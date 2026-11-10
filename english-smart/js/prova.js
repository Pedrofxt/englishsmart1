// prova.js — Prova de nivelamento (corrigida no banco, uma vez por aluno)

(() => {
  const el = (id) => document.getElementById(id);
  const secoes = ['provaIntro', 'provaQuestao', 'provaResultado', 'provaCarregando'];
  const LETRAS = ['A', 'B', 'C', 'D', 'E'];

  let aluno = null;
  let questoes = [];
  let respostas = {};
  let atual = 0;
  let avancoAutomatico = null;

  const chave = () => 'es_prova_' + aluno.id;
  const salvar = () => { try { localStorage.setItem(chave(), JSON.stringify(respostas)); } catch {} };
  const recuperar = () => { try { return JSON.parse(localStorage.getItem(chave())) || {}; } catch { return {}; } };
  const apagar = () => { try { localStorage.removeItem(chave()); } catch {} };

  function mostrarSecao(id) { secoes.forEach((s) => el(s).classList.toggle('hidden', s !== id)); }

  // "___" vira uma lacuna desenhada
  const comLacuna = (txt) => App.escapar(txt).replace(/_{2,}/g,
    '<span class="inline-block w-16 md:w-20 border-b-[3px] border-brand-red mx-1 translate-y-1"></span>');

  // ---------- Questão ----------
  function renderizarQuestao() {
    const q = questoes[atual];
    const total = questoes.length;
    const feitas = Object.keys(respostas).filter((id) => questoes.some((x) => String(x.id) === id)).length;
    const ultima = atual === total - 1;

    const parte2 = q.secao === 'vocabulario';
    el('provaParte').innerHTML = `
      <div class="inline-flex items-center gap-3 rounded-2xl ${parte2 ? 'bg-brand-redSoft text-brand-red' : 'bg-navy-900/5 text-navy-900'} px-4 py-2">
        <span class="text-xs font-bold uppercase tracking-widest">Parte ${parte2 ? 2 : 1} de 2</span>
        <span class="font-display font-semibold">${parte2 ? 'Vocabulário e leitura' : 'Gramática'}</span>
      </div>`;

    el('provaContador').innerHTML = `Questão <strong class="text-navy-900">${atual + 1}</strong> de ${total}`;
    el('provaRespondidas').textContent = `${feitas} respondida${feitas === 1 ? '' : 's'}`;
    el('provaBarra').style.width = `${(feitas / total) * 100}%`;

    el('provaPontos').innerHTML = questoes.map((x, i) => {
      const resp = respostas[x.id] !== undefined;
      const cor = i === atual ? 'bg-brand-red text-white ring-4 ring-brand-red/20'
        : resp ? 'bg-navy-900 text-white' : 'bg-white text-slate-400 border border-slate-200';
      return `<button data-ir="${i}" class="w-8 h-8 rounded-lg text-xs font-bold transition ${cor}" aria-label="Ir para a questão ${i + 1}">${i + 1}</button>`;
    }).join('');
    el('provaPontos').querySelectorAll('[data-ir]').forEach((b) =>
      b.addEventListener('click', () => irPara(Number(b.dataset.ir)))
    );

    el('provaCartao').innerHTML = `
      <div class="lesson-enter">
        ${q.texto_apoio ? `
          <div class="mb-6 bg-sky-50 border border-sky-100 rounded-2xl p-5">
            <p class="text-xs font-semibold uppercase tracking-widest text-sky-700 mb-2">Leia o texto</p>
            <p class="text-slate-700 leading-relaxed italic">${App.escapar(q.texto_apoio)}</p>
          </div>` : ''}
        <h2 class="text-xl md:text-2xl font-bold text-navy-900 leading-snug">${comLacuna(q.enunciado)}</h2>
        <div class="mt-7 grid gap-3">
          ${q.opcoes.map((op, i) => {
            const marcada = respostas[q.id] === i;
            return `
              <button data-op="${i}" class="opcao w-full flex items-center gap-4 text-left rounded-2xl border-2 px-5 py-4
                ${marcada ? 'border-navy-900 bg-navy-900/[0.04]' : 'border-slate-200 hover:border-navy-600/50 bg-white'}">
                <span class="w-9 h-9 shrink-0 rounded-xl grid place-items-center font-bold text-sm
                  ${marcada ? 'bg-navy-900 text-white' : 'bg-slate-100 text-slate-500'}">${LETRAS[i]}</span>
                <span class="font-medium ${marcada ? 'text-navy-900' : 'text-slate-700'}">${App.escapar(op)}</span>
              </button>`;
          }).join('')}
        </div>
      </div>`;

    el('provaCartao').querySelectorAll('[data-op]').forEach((b) =>
      b.addEventListener('click', () => escolher(Number(b.dataset.op)))
    );

    el('btnQAnterior').disabled = atual === 0;
    el('btnQProxima').textContent = ultima ? 'Finalizar prova' : 'Próxima →';
    el('btnQProxima').className = `btn-shine px-6 py-3 rounded-xl font-semibold text-white transition ${
      ultima ? 'bg-brand-red hover:bg-brand-redDark shadow-glow' : 'bg-navy-900 hover:bg-navy-800'}`;
  }

  function escolher(i) {
    const q = questoes[atual];
    respostas[q.id] = i;
    salvar();
    renderizarQuestao();
    clearTimeout(avancoAutomatico);
    if (atual < questoes.length - 1) avancoAutomatico = setTimeout(() => irPara(atual + 1), 450);
  }

  function irPara(i) {
    clearTimeout(avancoAutomatico);
    atual = Math.max(0, Math.min(i, questoes.length - 1));
    renderizarQuestao();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function comecar() {
    const btn = el('btnComecarProva');
    setLoading(btn, true);
    try {
      const { data, error } = await sb.rpc('obter_prova');
      if (error) throw error;
      questoes = data;
      respostas = recuperar();
      const primeiraEmBranco = questoes.findIndex((q) => respostas[q.id] === undefined);
      atual = primeiraEmBranco === -1 ? questoes.length - 1 : primeiraEmBranco;
      mostrarSecao('provaQuestao');
      renderizarQuestao();
    } catch (err) {
      console.error(err);
      App.toast(App.mensagemDeErro(err));
    } finally {
      setLoading(btn, false, Object.keys(recuperar()).length ? 'Continuar a prova' : 'Começar a prova');
    }
  }

  async function finalizar() {
    const emBranco = questoes.filter((q) => respostas[q.id] === undefined).length;
    if (emBranco > 0) {
      const ok = confirm(`Você deixou ${emBranco} questão(ões) em branco. Elas contam como erro.\n\nQuer enviar mesmo assim?`);
      if (!ok) return irPara(questoes.findIndex((q) => respostas[q.id] === undefined));
    }
    mostrarSecao('provaCarregando');
    try {
      const { data, error } = await sb.rpc('enviar_prova', { respostas });
      if (error) throw error;
      apagar();
      App.limparPerfil();
      renderizarResultado(data, true);
    } catch (err) {
      if ((err.message || '').includes('já fez')) {
        apagar();
        const p = await App.perfil(true);
        return renderizarResultado(p, false);
      }
      console.error(err);
      mostrarSecao('provaQuestao');
      App.toast('Não foi possível enviar. Suas respostas estão salvas; tente de novo.');
    }
  }

  // ---------- Resultado ----------
  const confete = (container) => soltarConfete(container);

  function renderizarResultado(r, comemorar) {
    const num = r.nivel_num;
    const cefr = r.nivel;
    const faixa = FAIXAS[cefr];
    const info = nivelInfo(num);
    const det = r.detalhes || {};
    const faixas = det.faixas || {};
    const secoes = det.secoes || {};
    const pct = r.total ? Math.round((r.acertos / r.total) * 100) : 0;

    el('provaResultado').innerHTML = `
      <div class="relative overflow-hidden bg-white rounded-[2rem] border border-slate-200 shadow-sm">
        <div class="relative overflow-hidden bg-brand-hero text-white px-8 pt-10 pb-24 text-center">
          <div class="absolute inset-0 bg-grid opacity-70"></div>
          <p class="relative fade-up text-white/70 font-medium">Prova concluída! Sua trilha começa no</p>
        </div>
        <div class="relative -mt-20 flex justify-center">
          <div class="anel-nivel w-40 h-40 rounded-full bg-white p-2 shadow-card">
            <div class="w-full h-full rounded-full ${faixa.cor} text-white grid place-items-center">
              <div class="text-center">
                <p class="text-[11px] font-semibold uppercase tracking-widest opacity-80">Nível</p>
                <p class="font-display text-6xl font-extrabold leading-none">${num}</p>
                <p class="text-xs font-semibold mt-1 opacity-80">de 16</p>
              </div>
            </div>
          </div>
        </div>
        <div class="px-6 md:px-12 pb-10 text-center">
          <p class="mt-5 inline-flex items-center gap-2 text-sm font-semibold ${faixa.texto} fade-up delay-1">
            <span class="px-2 py-0.5 rounded-md ${faixa.cor} text-white">${cefr}</span> ${faixa.nome}
          </p>
          <h1 class="mt-3 text-3xl md:text-4xl font-extrabold text-navy-900 fade-up delay-1">${App.escapar(info.tema)}</h1>
          <p class="mt-3 text-slate-500 max-w-lg mx-auto fade-up delay-2">Neste nível você vai aprender a <b class="text-navy-900">${App.escapar(info.objetivo)}</b>.</p>

          <div class="mt-8 grid sm:grid-cols-3 gap-3 fade-up delay-3">
            <div class="bg-slate-50 rounded-2xl p-4">
              <p class="font-display text-3xl font-extrabold text-navy-900"><span data-contar="${r.acertos}">0</span><span class="text-lg text-slate-400">/${r.total}</span></p>
              <p class="text-xs text-slate-500">acertos no total (${pct}%)</p>
            </div>
            <div class="bg-slate-50 rounded-2xl p-4">
              <p class="font-display text-3xl font-extrabold text-navy-900">${secoes.gramatica?.acertos ?? '–'}<span class="text-lg text-slate-400">/${secoes.gramatica?.total ?? '–'}</span></p>
              <p class="text-xs text-slate-500">Parte 1 · Gramática</p>
            </div>
            <div class="bg-slate-50 rounded-2xl p-4">
              <p class="font-display text-3xl font-extrabold text-navy-900">${secoes.vocabulario?.acertos ?? '–'}<span class="text-lg text-slate-400">/${secoes.vocabulario?.total ?? '–'}</span></p>
              <p class="text-xs text-slate-500">Parte 2 · Vocabulário</p>
            </div>
          </div>

          <div class="mt-4 grid grid-cols-5 gap-2 text-left fade-up delay-4">
            ${['A1', 'A2', 'B1', 'B2', 'C1'].map((k) => {
              const d = faixas[k] || { acertos: 0, total: 0 };
              const p = d.total ? (d.acertos / d.total) * 100 : 0;
              return `
                <div class="bg-slate-50 rounded-xl p-3 ${k === cefr ? 'ring-2 ring-navy-900' : ''}">
                  <div class="flex justify-between items-baseline"><span class="font-bold text-navy-900 text-sm">${k}</span><span class="text-[11px] text-slate-400">${d.acertos}/${d.total}</span></div>
                  <div class="mt-2 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <div class="h-full ${FAIXAS[k].cor} rounded-full transition-all duration-1000" style="width:0" data-largura="${p}%"></div>
                  </div>
                </div>`;
            }).join('')}
          </div>

          <a href="#/curso" class="btn-shine mt-10 inline-flex w-full sm:w-auto justify-center items-center gap-2 bg-brand-red hover:bg-brand-redDark text-white font-display font-semibold text-lg px-10 py-4 rounded-2xl shadow-glow transition hover:-translate-y-0.5 fade-up delay-5">
            Ver minha trilha →
          </a>
        </div>
      </div>`;

    mostrarSecao('provaResultado');
    const caixa = el('provaResultado').firstElementChild;
    if (comemorar) confete(caixa);

    setTimeout(() => caixa.querySelectorAll('[data-largura]').forEach((b) => { b.style.width = b.dataset.largura; }), 500);
    const cont = caixa.querySelector('[data-contar]');
    const alvo = Number(cont.dataset.contar);
    const t0 = performance.now();
    const passo = (t) => {
      const p = Math.min((t - t0) / 1200, 1);
      cont.textContent = Math.round(alvo * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(passo);
    };
    requestAnimationFrame(passo);
  }

  // ---------- Eventos ----------
  el('btnComecarProva').addEventListener('click', comecar);
  el('btnQAnterior').addEventListener('click', () => irPara(atual - 1));
  el('btnQProxima').addEventListener('click', () => (atual === questoes.length - 1 ? finalizar() : irPara(atual + 1)));
  document.addEventListener('keydown', (e) => {
    if (el('provaQuestao').classList.contains('hidden') || document.querySelector('[data-view="prova"]').classList.contains('hidden')) return;
    const n = { a: 0, b: 1, c: 2, d: 3, 1: 0, 2: 1, 3: 2, 4: 3 }[e.key.toLowerCase()];
    if (n !== undefined && questoes[atual]?.opcoes[n] !== undefined) escolher(n);
    if (e.key === 'ArrowRight' && atual < questoes.length - 1) irPara(atual + 1);
    if (e.key === 'ArrowLeft') irPara(atual - 1);
  });

  App.registrar('prova', {
    async iniciar() {
      const p = await App.perfil();
      if (!p) { location.hash = '#/entrar'; return false; }
      if (p.papel === 'admin') { location.hash = '#/admin'; return false; }
      aluno = p;

      if (p.prova_feita_em && p.nivel_num) {
        renderizarResultado(p, false);
        return;
      }
      if (p.prova_feita_em) {
        // Prova registrada sem nível (ex.: versão antiga): explica em vez de travar
        el('provaResultado').innerHTML = `
          <div class="bg-white rounded-[2rem] border border-slate-200 shadow-sm p-8 md:p-10 text-center">
            <div class="mx-auto w-14 h-14 rounded-2xl bg-amber-100 text-amber-700 grid place-items-center">${Icone('relogio', 'w-7 h-7')}</div>
            <h1 class="mt-4 text-2xl font-extrabold text-navy-900">Sua prova precisa ser atualizada</h1>
            <p class="mt-3 text-slate-500 max-w-md mx-auto">Você fez a prova de nivelamento numa versão anterior do curso. Peça à equipe English Smart para liberar uma nova prova no portal do professor.</p>
            <button data-sair class="mt-8 font-semibold bg-navy-900 hover:bg-navy-800 text-white rounded-xl px-6 py-3 transition">Sair</button>
          </div>`;
        el('provaResultado').querySelector('[data-sair]').addEventListener('click', App.sair);
        mostrarSecao('provaResultado');
        return;
      }
      el('provaOla').textContent = `Olá, ${p.nome.split(' ')[0]}!`;
      el('btnComecarProva').textContent = Object.keys(recuperar()).length ? 'Continuar a prova' : 'Começar a prova';
      mostrarSecao('provaIntro');
    },
  });
})();
