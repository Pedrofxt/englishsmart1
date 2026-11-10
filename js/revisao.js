// revisao.js — Revisão inteligente: repetição espaçada, erros, revisão do estágio, ditado, escrita, desafio e flashcards

const Revisao = (() => {
  const el = (id) => document.getElementById(id);

  // Lições estudadas + memória (tabela revisao) + sessões. O admin vê tudo liberado e nada é salvo.
  async function dados(p) {
    if (p.papel === 'admin') {
      return { licoes: CURRICULO.flatMap((n) => [1, 2, 3, 4].map((l) => [n.n, l])), memoria: [], sessoes: [], progresso: [] };
    }
    const [prog, mem, ses] = await Promise.all([
      sb.from('progresso').select('*').eq('aluno_id', p.id),
      sb.from('revisao').select('*').eq('aluno_id', p.id),
      sb.from('sessoes_revisao').select('*').eq('aluno_id', p.id),
    ]);
    if (prog.error) throw prog.error;
    const progresso = prog.data || [];
    const vistas = new Set(progresso.filter((r) => r.licao >= 1).map((r) => `${r.nivel_num}|${r.licao}`));
    const memoria = mem.error ? [] : mem.data || [];
    memoria.forEach((r) => { const [, n, l] = r.item.split('|'); vistas.add(`${n}|${l}`); });
    const licoes = [...vistas].map((k) => k.split('|').map(Number)).filter(([n]) => n <= (p.nivel_num || 16)).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    return { licoes, memoria, sessoes: ses.error ? [] : ses.data || [], progresso };
  }

  const vencidos = (memoria) => memoria.filter((r) => new Date(r.proxima).getTime() <= Date.now());

  // Faixas da memória (caixas da repetição espaçada)
  const GRUPOS = [
    { nome: 'Para revisar', caixas: [0], cor: 'bg-brand-red', texto: 'text-brand-red' },
    { nome: 'Aprendendo', caixas: [1, 2], cor: 'bg-amber-400', texto: 'text-amber-600' },
    { nome: 'Fixando', caixas: [3], cor: 'bg-sky-500', texto: 'text-sky-600' },
    { nome: 'Dominado', caixas: [4, 5], cor: 'bg-emerald-500', texto: 'text-emerald-600' },
  ];

  function render(p, d) {
    const admin = p.papel === 'admin';
    const totalItens = Atividades.itensDasLicoes(d.licoes).length;
    const hoje = vencidos(d.memoria).length;
    const novos = Math.max(0, totalItens - d.memoria.length);
    const erros = d.memoria.filter((r) => r.caixa === 0 && r.erros > 0).length;
    const dominados = d.memoria.filter((r) => r.caixa >= 4).length;
    const semana = d.sessoes.filter((x) => Date.now() - new Date(x.feita_em).getTime() <= 7 * 864e5);
    const acertoSemana = semana.reduce((s, x) => s + x.total, 0) ? Math.round(100 * semana.reduce((s, x) => s + x.acertos, 0) / semana.reduce((s, x) => s + x.total, 0)) : null;
    const recorde = d.sessoes.filter((x) => x.modo === 'relampago').reduce((m, x) => Math.max(m, x.acertos), 0);
    const faixas = [...new Set(d.licoes.map(([n]) => faixaDoNivel(n)))];
    const ultimaFaixa = faixas[faixas.length - 1];

    if (!d.licoes.length) {
      el('revisaoConteudo').innerHTML = `
        <div class="reveal bg-white rounded-[2rem] border border-slate-200 p-10 text-center">
          <span class="w-14 h-14 mx-auto rounded-2xl bg-navy-900 text-white grid place-items-center">${Icone('brilho', 'w-7 h-7')}</span>
          <h2 class="mt-4 text-2xl font-extrabold text-navy-900">Sua revisão começa depois da primeira lição</h2>
          <p class="mt-2 text-slate-500 max-w-md mx-auto">Tudo o que você estudar nas lições entra aqui: as palavras, as frases de gramática e os diálogos. O que você errar volta para treinar até ficar fixado.</p>
          <a href="#/curso" class="btn-shine mt-6 inline-block font-semibold bg-brand-red hover:bg-brand-redDark text-white rounded-xl px-6 py-3 shadow-glow transition">Ir para a minha trilha</a>
        </div>`;
      revelar(el('revisaoConteudo'));
      return;
    }

    // Lições com mais erros
    const errosPorLicao = {};
    d.memoria.forEach((r) => { const [, n, l] = r.item.split('|'); const k = `${n}|${l}`; errosPorLicao[k] = (errosPorLicao[k] || 0) + (r.caixa <= 1 ? r.erros : 0); });
    const fracas = Object.entries(errosPorLicao).filter(([, e]) => e > 0).sort((a, b) => b[1] - a[1]).slice(0, 3);

    const totalMem = Math.max(1, d.memoria.length + novos);
    const barra = GRUPOS.map((g) => ({ ...g, qtd: d.memoria.filter((r) => g.caixas.includes(r.caixa)).length }));

    const cartao = (modo, icone, titulo, texto, extra = '', desabilitado = false) => `
      <article class="reveal group bg-white rounded-2xl border border-slate-200 p-6 flex flex-col ${desabilitado ? 'opacity-60' : 'hover:-translate-y-1 hover:shadow-card'} transition duration-300">
        <div class="flex items-start justify-between gap-3">
          <span class="w-11 h-11 rounded-xl bg-navy-900 text-white grid place-items-center">${Icone(icone, 'w-5 h-5')}</span>
          ${extra}
        </div>
        <h3 class="mt-4 text-lg font-bold text-navy-900">${titulo}</h3>
        <p class="mt-1 text-sm text-slate-500 flex-1">${texto}</p>
        ${modo === 'estagio' ? `
          <select id="selFaixa" class="mt-4 w-full text-sm font-semibold text-navy-900 border border-slate-200 rounded-xl px-3 py-2.5 bg-white">
            ${faixas.map((f) => `<option value="${f}" ${f === ultimaFaixa ? 'selected' : ''}>Estágio ${f} · ${FAIXAS[f].nome}</option>`).join('')}
          </select>` : ''}
        ${desabilitado
          ? '<span class="mt-4 text-center text-sm text-slate-400 py-2.5">Nada por aqui agora</span>'
          : `<button data-modo="${modo}" class="mt-4 font-semibold border border-slate-200 group-hover:border-navy-900 text-navy-900 rounded-xl py-2.5 transition">Começar</button>`}
      </article>`;

    el('revisaoConteudo').innerHTML = `
      <section class="reveal grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="bg-white rounded-2xl p-5 border border-slate-200"><p class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Para hoje</p><p id="revHoje" class="mt-1 font-display text-3xl font-extrabold text-brand-red">${hoje}</p><p class="text-[11px] text-slate-400">itens vencendo na memória</p></div>
        <div class="bg-white rounded-2xl p-5 border border-slate-200"><p class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Na memória</p><p class="mt-1 font-display text-3xl font-extrabold text-navy-900">${d.memoria.length}<span class="text-base text-slate-400">/${totalItens}</span></p><p class="text-[11px] text-slate-400">itens já revisados</p></div>
        <div class="bg-white rounded-2xl p-5 border border-slate-200"><p class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Dominados</p><p class="mt-1 font-display text-3xl font-extrabold text-emerald-600">${dominados}</p><p class="text-[11px] text-slate-400">acertados várias vezes seguidas</p></div>
        <div class="bg-white rounded-2xl p-5 border border-slate-200"><p class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Nesta semana</p><p class="mt-1 font-display text-3xl font-extrabold text-navy-900">${semana.length}<span class="text-base text-slate-400"> sess.</span></p><p class="text-[11px] text-slate-400">${acertoSemana === null ? 'nenhuma revisão ainda' : `${acertoSemana}% de acerto`}</p></div>
      </section>

      <section class="reveal mt-6 bg-white rounded-2xl border border-slate-200 p-6">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <h2 class="font-display text-lg font-bold text-navy-900">Força da memória</h2>
          <span class="text-xs text-slate-400">Cada acerto empurra o item para a direita e aumenta o intervalo até a próxima revisão: 1, 3, 7, 16 e 35 dias.</span>
        </div>
        <div class="mt-4 h-4 rounded-full overflow-hidden flex bg-slate-100">
          ${barra.map((g) => g.qtd ? `<div class="${g.cor} h-full transition-all duration-700" style="width:${(g.qtd / totalMem) * 100}%" title="${g.nome}: ${g.qtd}"></div>` : '').join('')}
        </div>
        <div class="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-500">
          ${barra.map((g) => `<span class="inline-flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full ${g.cor}"></span>${g.nome}: <b class="text-navy-900">${g.qtd}</b></span>`).join('')}
          <span class="inline-flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-slate-200"></span>Ainda não revisados: <b class="text-navy-900">${novos}</b></span>
        </div>
      </section>

      <section class="reveal mt-6 relative overflow-hidden bg-brand-hero text-white rounded-[2rem] p-7 md:p-9">
        <div class="absolute inset-0 bg-grid opacity-70"></div>
        <div class="relative flex flex-col md:flex-row md:items-center gap-6">
          <div class="flex-1">
            <p class="text-xs font-semibold uppercase tracking-widest text-white/50">Recomendado</p>
            <h2 class="mt-1 text-2xl md:text-3xl font-extrabold">Revisão do dia</h2>
            <p class="mt-2 text-white/70 max-w-xl">${hoje ? `<b class="text-white">${hoje} ${hoje === 1 ? 'item está' : 'itens estão'} vencendo</b> na sua memória.` : 'Nenhum item vencido.'} ${novos ? 'Completamos com conteúdos que você ainda não revisou.' : ''} O formato se adapta: o que você ainda erra aparece com opções; o que já sabe, para escrever ou ouvir.</p>
          </div>
          <button data-modo="dia" class="btn-shine shrink-0 font-display font-semibold bg-brand-red hover:bg-brand-redDark text-white rounded-2xl px-8 py-4 shadow-glow transition hover:-translate-y-0.5">Começar revisão do dia</button>
        </div>
      </section>

      <h2 class="mt-10 text-xl font-bold text-navy-900">Treinos avançados</h2>
      <section class="mt-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        ${cartao('erros', 'alvo', 'Meus erros', 'Só o que você errou recentemente, para escrever de memória até acertar.', erros ? `<span class="text-[11px] font-semibold bg-red-50 text-red-700 px-2.5 py-1 rounded-full">${erros} ${erros === 1 ? 'erro' : 'erros'}</span>` : '', !erros)}
        ${cartao('estagio', 'capelo', 'Revisão do estágio', 'Revisão acumulada de todas as lições de um estágio do CEFR: gramática, vocabulário, escrita, ditado e fala.')}
        ${cartao('ditado', 'fone', 'Ditado', 'Ouça frases das lições e escreva exatamente o que ouviu. Corrigimos palavra por palavra.')}
        ${cartao('escrita', 'documento', 'Escrita', 'Escreva as palavras em inglês e complete a gramática digitando, sem opções para escolher.')}
        ${cartao('relampago', 'relogio', 'Desafio relâmpago', 'Quantas você acerta em 60 segundos? Velocidade de reconhecimento, como numa conversa real.', recorde ? `<span class="text-[11px] font-semibold bg-amber-50 text-amber-700 px-2.5 py-1 rounded-full">Recorde: ${recorde}</span>` : '')}
        ${cartao('flashcards', 'blocos', 'Flashcards', 'Vire o cartão e diga se lembrou. As palavras que você esquece aparecem primeiro.')}
      </section>

      ${fracas.length ? `
        <section class="reveal mt-10">
          <h2 class="text-xl font-bold text-navy-900">Seus pontos fracos</h2>
          <p class="mt-1 text-sm text-slate-500">As lições onde você mais errou. Vale reler a explicação antes de revisar.</p>
          <div class="mt-4 grid sm:grid-cols-3 gap-3">
            ${fracas.map(([k, e]) => { const [n, l] = k.split('|').map(Number); const li = nivelInfo(n).licoes[l - 1]; return `
              <a href="#/licao?n=${n}&l=${l}" class="flex items-center gap-3 bg-white border border-slate-200 hover:border-navy-900 rounded-2xl p-4 transition">
                <span class="w-10 h-10 shrink-0 rounded-xl ${FAIXAS[faixaDoNivel(n)].cor} text-white grid place-items-center font-bold text-sm">${n}.${l}</span>
                <span class="min-w-0"><span class="block text-sm font-semibold text-navy-900 truncate">${App.escapar(li.t)}</span>
                <span class="block text-xs text-slate-400">${e} ${e === 1 ? 'erro' : 'erros'} · rever a lição</span></span>
              </a>`; }).join('')}
          </div>
        </section>` : ''}
      ${admin ? '<p class="mt-8 text-sm text-slate-500 bg-slate-100 rounded-xl px-4 py-3">Modo administrador: todas as lições estão incluídas e nada é salvo.</p>' : ''}`;

    el('revisaoConteudo').querySelectorAll('[data-modo]').forEach((b) => b.addEventListener('click', () => {
      const modo = b.dataset.modo;
      const faixa = modo === 'estagio' ? el('selFaixa').value : '';
      location.hash = `#/treino?modo=${modo}${faixa ? `&faixa=${faixa}` : ''}`;
    }));
    revelar(el('revisaoConteudo'));
  }

  App.registrar('revisao', {
    async iniciar() {
      const p = await App.perfil(true);
      if (!p) { location.hash = '#/entrar'; return false; }
      if (p.papel === 'aluno' && !p.nivel_num) { location.hash = '#/prova'; return false; }
      el('revisaoVoltar').href = p.papel === 'admin' ? '#/admin' : '#/curso';
      if (!p.premium) { location.hash = '#/planos?motivo=revisao'; return false; }
      render(p, await dados(p));
    },
  });

  return { dados, vencidos };
})();
