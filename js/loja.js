// loja.js — Moedas (10 XP = 1 moeda), loja, medalhas e ranking semanal
// As moedas não tiram XP: o XP continua contando para o nível e o ranking. O saldo é
// (XP ÷ 10) − moedas já gastas; quem confere e desconta é o banco (função comprar_item).

const Loja = (() => {
  const el = (id) => document.getElementById(id);

  const ITENS = [
    { id: 'protetor', nome: 'Protetor de sequência', custo: 150, icone: 'escudo', cor: 'bg-sky-100 text-sky-700', desc: 'Faltou ontem? Conta o dia de ontem como estudado e salva a sua sequência.', tipo: 'uso' },
    { id: 'dias7', nome: '+7 dias de acesso', custo: 1500, icone: 'relogio', cor: 'bg-emerald-100 text-emerald-700', desc: 'Soma 7 dias à sua assinatura. Para quem paga com Pix (no cartão a renovação já é automática).', tipo: 'uso' },
    { id: 'moldura_ouro', nome: 'Moldura Ouro', custo: 300, icone: 'estrela', cor: 'bg-amber-100 text-amber-700', desc: 'Um contorno dourado na sua foto, no menu e no ranking.', tipo: 'moldura' },
    { id: 'moldura_neon', nome: 'Moldura Neon', custo: 300, icone: 'brilho', cor: 'bg-fuchsia-100 text-fuchsia-700', desc: 'Contorno neon azul e rosa.', tipo: 'moldura' },
    { id: 'moldura_arco', nome: 'Moldura Arco-íris', custo: 500, icone: 'globo', cor: 'bg-violet-100 text-violet-700', desc: 'Contorno com as cores do arco-íris.', tipo: 'moldura' },
    { id: 'moldura_diamante', nome: 'Moldura Diamante', custo: 1000, icone: 'trofeu', cor: 'bg-cyan-100 text-cyan-700', desc: 'A mais rara: contorno de diamante com brilho.', tipo: 'moldura' },
  ];

  const saldoDe = (p, compras) => Math.max(0, Math.floor((p.xp || 0) / 10) - (compras || []).reduce((s, c) => s + (c.custo || 0), 0));

  // ---------- Medalhas (calculadas no navegador a partir do que o aluno já fez) ----------
  const MEDALHAS = [
    { id: 'primeira', nome: 'Primeiro passo', desc: 'Concluir a 1ª lição', icone: 'foguete', teste: (d) => d.licoes >= 1 },
    { id: 'licoes10', nome: 'Pegando o ritmo', desc: 'Concluir 10 lições', icone: 'livro', teste: (d) => d.licoes >= 10 },
    { id: 'licoes30', nome: 'Maratonista', desc: 'Concluir 30 lições', icone: 'livro', teste: (d) => d.licoes >= 30 },
    { id: 'perfeita', nome: 'Gabaritou', desc: '100% em uma lição', icone: 'alvo', teste: (d) => d.perfeitas >= 1 },
    { id: 'seq3', nome: 'Constância', desc: '3 dias seguidos', icone: 'chama', teste: (d) => d.sequencia >= 3 },
    { id: 'seq7', nome: 'Semana de fogo', desc: '7 dias seguidos', icone: 'chama', teste: (d) => d.sequencia >= 7 },
    { id: 'seq30', nome: 'Imparável', desc: '30 dias seguidos', icone: 'chama', teste: (d) => d.sequencia >= 30 },
    { id: 'cert1', nome: 'Certificado', desc: 'Ganhar o 1º certificado', icone: 'certificado', teste: (d) => d.certificados >= 1 },
    { id: 'cert5', nome: 'Colecionador', desc: 'Ganhar 5 certificados', icone: 'trofeu', teste: (d) => d.certificados >= 5 },
    { id: 'b1', nome: 'Intermediário', desc: 'Chegar ao nível 7 (B1)', icone: 'capelo', teste: (d) => d.nivel >= 7 },
    { id: 'c1', nome: 'Avançado', desc: 'Chegar ao nível 13 (C1)', icone: 'capelo', teste: (d) => d.nivel >= 13 },
    { id: 'revisao10', nome: 'Memória afiada', desc: '10 revisões feitas', icone: 'brilho', teste: (d) => d.revisoes >= 10 },
    { id: 'xp1000', nome: '1.000 XP', desc: 'Juntar 1.000 XP', icone: 'estrela', teste: (d) => d.xp >= 1000 },
    { id: 'xp5000', nome: '5.000 XP', desc: 'Juntar 5.000 XP', icone: 'estrela', teste: (d) => d.xp >= 5000 },
    { id: 'extra', nome: 'Explorador', desc: 'Fazer uma lição de trilha extra', icone: 'aviao', teste: (d) => d.extras >= 1 },
    { id: 'loja', nome: 'Primeira compra', desc: 'Comprar algo na loja', icone: 'loja', teste: (d) => d.compras >= 1 },
  ];

  function resumo(p, dados, compras = []) {
    const prog = dados.progresso || [];
    const est = App.estatisticas(prog, p.meta_semanal, dados.sessoes || [], dados.protegidos || []);
    return {
      licoes: prog.filter((x) => x.licao > 0 && x.nivel_num <= 16).length,
      perfeitas: prog.filter((x) => x.licao > 0 && x.total >= 5 && x.acertos === x.total).length,
      sequencia: est.sequencia,
      certificados: (dados.certificados || []).length,
      nivel: p.nivel_num || 0,
      revisoes: (dados.sessoes || []).length,
      xp: p.xp || 0,
      extras: prog.filter((x) => x.nivel_num > 100).length,
      compras: compras.length,
    };
  }

  const conquistadas = (p, dados, compras) => { const r = resumo(p, dados, compras); return MEDALHAS.filter((m) => m.teste(r)).map((m) => m.id); };

  // Avisa (uma vez por aparelho) as medalhas novas
  function avisarNovas(p, dados, compras = []) {
    const chave = `es_medalhas_${p.id}`;
    const agora = conquistadas(p, dados, compras);
    const antes = App.lerLocal(chave);
    App.gravarLocal(chave, agora.join(','));
    if (!antes) return []; // primeira vez neste aparelho: só guarda, sem avisar tudo de uma vez
    const vistas = new Set(antes.split(','));
    const novas = MEDALHAS.filter((m) => agora.includes(m.id) && !vistas.has(m.id));
    novas.forEach((m, i) => setTimeout(() => mostrarMedalha(m), 900 + i * 3200));
    return novas;
  }

  function mostrarMedalha(m) {
    const t = document.createElement('div');
    t.className = 'medalha-toast fixed left-1/2 top-6 z-[90] -translate-x-1/2 flex items-center gap-3 bg-navy-900 text-white rounded-2xl shadow-card pl-3 pr-5 py-3 anim-pop';
    t.setAttribute('role', 'status');
    t.innerHTML = `<span class="w-11 h-11 rounded-xl bg-amber-400 text-navy-900 grid place-items-center">${Icone(m.icone, 'w-6 h-6')}</span>
      <span><span class="block text-[11px] font-semibold uppercase tracking-widest text-amber-300">Nova medalha</span><span class="block font-display font-bold">${App.escapar(m.nome)}</span></span>`;
    document.body.appendChild(t);
    Som.tocar('medalha');
    setTimeout(() => t.remove(), 3000);
  }

  function gradeMedalhas(p, dados, compras = []) {
    const tem = new Set(conquistadas(p, dados, compras));
    return `
      <div class="flex items-center justify-between gap-3"><h2 class="font-display text-lg font-bold text-navy-900">Medalhas</h2><span id="totalMedalhas" class="text-sm font-semibold text-slate-400">${tem.size} de ${MEDALHAS.length}</span></div>
      <ul class="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
        ${MEDALHAS.map((m) => `
          <li data-medalha="${m.id}" class="rounded-2xl border p-3 text-center ${tem.has(m.id) ? 'border-amber-200 bg-amber-50' : 'border-dashed border-slate-300 bg-slate-50'}" title="${App.escapar(m.desc)}">
            <span class="w-11 h-11 mx-auto rounded-xl grid place-items-center ${tem.has(m.id) ? 'bg-amber-400 text-navy-900' : 'bg-slate-100 text-slate-400'}">${Icone(tem.has(m.id) ? m.icone : 'cadeado', 'w-5 h-5')}</span>
            <p class="mt-2 text-sm font-semibold text-navy-900 leading-tight">${App.escapar(m.nome)}</p>
            <p class="text-[11px] text-slate-500 leading-tight mt-0.5">${App.escapar(m.desc)}</p>
          </li>`).join('')}
      </ul>`;
  }

  // ---------- Ranking semanal (só aparece quem escolheu participar) ----------
  async function desenharRanking(caixa) {
    if (!caixa) return;
    const { data: r, error } = await sb.rpc('ranking_semanal');
    if (error || !r) { caixa.innerHTML = ''; return; }
    const top = r.top || [];
    caixa.innerHTML = `
      <section data-ranking class="bg-white rounded-2xl border border-slate-200 p-6">
        <div class="flex items-center justify-between gap-3">
          <h2 class="font-display text-lg font-bold text-navy-900 inline-flex items-center gap-2">${Icone('trofeu', 'w-5 h-5 text-amber-500')}Ranking da semana</h2>
          <label class="inline-flex items-center gap-2 text-sm text-slate-600 cursor-pointer select-none">
            <input data-chk-ranking type="checkbox" class="w-4 h-4 accent-brand-red" ${r.participo ? 'checked' : ''} />Participar
          </label>
        </div>
        <p class="mt-1 text-xs text-slate-400">Pontos dos últimos 7 dias: 10 por acerto nas lições + XP das revisões. ${r.participo ? 'Os outros veem só seu primeiro nome e a inicial.' : 'Você vê sua posição, mas só aparece para os outros se marcar "Participar".'}</p>
        ${top.length ? `<ol class="mt-4 divide-y divide-slate-100">
          ${top.map((x) => `<li class="flex items-center gap-3 py-2.5 ${x.eu ? 'font-semibold' : ''}">
            <span class="w-7 h-7 shrink-0 rounded-full grid place-items-center text-xs font-bold ${x.posicao === 1 ? 'bg-amber-400 text-navy-900' : x.posicao === 2 ? 'bg-slate-300 text-navy-900' : x.posicao === 3 ? 'bg-orange-300 text-navy-900' : 'bg-slate-100 text-slate-500'}">${x.posicao}</span>
            <span class="flex-1 text-navy-900">${App.escapar(x.nome)}${x.eu ? ' <span class="text-xs text-brand-red">(você)</span>' : ''}</span>
            <span class="text-sm text-slate-500">${Number(x.pontos).toLocaleString('pt-BR')} pts</span></li>`).join('')}
        </ol>` : '<p class="mt-4 text-sm text-slate-500">Ninguém pontuou nesta semana ainda. Faça uma lição e apareça aqui!</p>'}
        ${r.minha_posicao && !top.some((x) => x.eu) ? `<p class="mt-3 text-sm text-slate-600">Sua posição: <b>${r.minha_posicao}º</b> · ${Number(r.meus_pontos || 0).toLocaleString('pt-BR')} pts</p>` : ''}
      </section>`;
    caixa.querySelector('[data-chk-ranking]').addEventListener('change', async (e) => {
      const { error: erro } = await sb.rpc('definir_ranking', { p_publico: e.target.checked });
      if (erro) { App.toast(App.mensagemDeErro(erro)); e.target.checked = !e.target.checked; return; }
      App.limparPerfil();
      App.toast(e.target.checked ? 'Você agora aparece no ranking.' : 'Você saiu do ranking público.');
      desenharRanking(caixa);
    });
  }

  // ---------- Tela da loja (#/loja) ----------
  async function render(p) {
    const [{ data: compras }, dados] = await Promise.all([
      sb.from('compras').select('*').eq('aluno_id', p.id),
      App.dadosDoAluno(p.id),
    ]);
    const lista = compras || [];
    const saldo = saldoDe(p, lista);
    const minhas = new Set(lista.map((c) => c.item));
    const pixOuCortesia = p.assinatura?.status !== 'ativa';
    const raiz = el('lojaConteudo');
    raiz.innerHTML = `
      <section class="reveal relative overflow-hidden bg-brand-hero text-white rounded-[2rem] p-8 md:p-10">
        <div class="absolute inset-0 bg-grid opacity-60"></div>
        <div class="relative flex flex-col md:flex-row md:items-center gap-6">
          <span class="gira-entra w-16 h-16 shrink-0 rounded-2xl bg-amber-400 text-navy-900 grid place-items-center shadow-glow">${Icone('moeda', 'w-9 h-9')}</span>
          <div class="flex-1">
            <p class="text-xs font-semibold uppercase tracking-widest text-white/50">Loja de moedas</p>
            <h1 class="mt-1 text-3xl md:text-4xl font-extrabold"><span id="saldoMoedas">${saldo.toLocaleString('pt-BR')}</span> moedas</h1>
            <p class="mt-1 text-white/70">Cada 10 XP vira 1 moeda. Gastar moedas não tira seu XP nem sua posição no ranking.</p>
          </div>
          <div class="shrink-0">${App.avatarHtml(p, 'w-20 h-20 text-xl')}</div>
        </div>
      </section>

      <h2 class="reveal mt-10 font-display text-lg font-bold text-navy-900">Itens</h2>
      <div id="gradeLoja" class="em-sequencia mt-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        ${ITENS.map((it) => {
          const temMoldura = it.tipo === 'moldura' && minhas.has(it.id);
          const usando = temMoldura && p.moldura === it.id;
          const bloqueado = it.id === 'dias7' && !pixOuCortesia;
          return `
          <article data-item="${it.id}" class="levanta bg-white rounded-2xl border ${usando ? 'border-amber-300 ring-2 ring-amber-200' : 'border-slate-200'} p-5 flex flex-col">
            <div class="flex items-center gap-3">
              ${it.tipo === 'moldura'
                ? `<span class="w-12 h-12 rounded-full bg-slate-200 moldura ${it.id.replace('_', '-')}"></span>`
                : `<span class="w-12 h-12 rounded-xl ${it.cor} grid place-items-center">${Icone(it.icone, 'w-6 h-6')}</span>`}
              <div class="min-w-0"><p class="font-display font-bold text-navy-900">${it.nome}</p>
              <p class="text-sm font-semibold text-amber-600 inline-flex items-center gap-1">${Icone('moeda', 'w-4 h-4')}${it.custo.toLocaleString('pt-BR')}</p></div>
            </div>
            <p class="mt-3 text-sm text-slate-500 flex-1">${it.desc}</p>
            ${usando
              ? '<button data-tirar class="mt-4 w-full font-semibold border border-slate-200 hover:border-navy-900 text-navy-900 rounded-xl py-2.5 transition">Usando · tirar</button>'
              : temMoldura
                ? `<button data-usar="${it.id}" class="mt-4 w-full font-semibold bg-navy-900 hover:bg-navy-800 text-white rounded-xl py-2.5 transition">Usar</button>`
                : `<button data-comprar="${it.id}" ${saldo < it.custo || bloqueado ? 'disabled' : ''} class="mt-4 w-full font-semibold bg-brand-red hover:bg-brand-redDark disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-xl py-2.5 transition">${bloqueado ? 'Seu cartão já renova sozinho' : saldo < it.custo ? `Faltam ${(it.custo - saldo).toLocaleString('pt-BR')} moedas` : 'Comprar'}</button>`}
          </article>`;
        }).join('')}
      </div>

      <div class="mt-10 grid lg:grid-cols-2 gap-6">
        <section class="reveal bg-white rounded-2xl border border-slate-200 p-6">${gradeMedalhas(p, dados, lista)}</section>
        <div id="lojaRanking" class="reveal"></div>
      </div>
      <section class="reveal mt-6 bg-white rounded-2xl border border-slate-200 p-6 text-sm text-slate-500">
        <h2 class="font-display font-bold text-navy-900">Como ganhar mais moedas</h2>
        <ul class="mt-2 space-y-1 list-disc list-inside">
          <li>Faça lições: cada acerto dá XP (e acertar mais rende mais).</li>
          <li>Faça a revisão inteligente todo dia (até 100 XP por dia).</li>
          <li>Passe nos testes de nível: o teste dá um bônus de XP.</li>
        </ul>
      </section>`;

    raiz.querySelectorAll('[data-comprar]').forEach((b) => b.addEventListener('click', () => comprar(p, ITENS.find((x) => x.id === b.dataset.comprar), b)));
    raiz.querySelectorAll('[data-usar]').forEach((b) => b.addEventListener('click', () => usar(p, b.dataset.usar, b)));
    raiz.querySelector('[data-tirar]')?.addEventListener('click', (e) => usar(p, null, e.target));
    desenharRanking(el('lojaRanking'));
    revelar(raiz);
  }

  async function comprar(p, it, btn) {
    const extra = it.id === 'protetor' ? '\n\nO dia de ontem vai contar como estudado.' : it.id === 'dias7' ? '\n\n7 dias serão somados ao seu acesso.' : '';
    if (!confirm(`Comprar "${it.nome}" por ${it.custo} moedas?${extra}`)) return;
    const texto = btn.innerHTML;
    setLoading(btn, true);
    const { error } = await sb.rpc('comprar_item', { p_item: it.id });
    if (error) { setLoading(btn, false, texto); App.toast(error.message || App.mensagemDeErro(error)); return; }
    Som.tocar('moeda');
    chuvaDeMoedas(btn, 12);
    App.toast(it.id === 'protetor' ? 'Sequência protegida!' : it.id === 'dias7' ? '+7 dias somados ao seu acesso!' : `${it.nome} comprada e já está no seu perfil!`);
    App.limparPerfil();
    const novo = await App.perfil(true);
    App.atualizarAvatares(novo);
    render(novo);
  }

  async function usar(p, item, btn) {
    setLoading(btn, true);
    const { error } = await sb.rpc('usar_moldura', { p_item: item });
    if (error) { setLoading(btn, false, item ? 'Usar' : 'Usando · tirar'); App.toast(error.message); return; }
    App.limparPerfil();
    const novo = await App.perfil(true);
    App.atualizarAvatares(novo);
    render(novo);
  }

  App.registrar('loja', {
    async iniciar() {
      const p = await App.perfil(true);
      if (!p) { location.hash = '#/entrar'; return false; }
      if (p.papel !== 'aluno') { App.toast('A loja é para os alunos.'); location.hash = '#/admin'; return false; }
      if (!p.nivel_num) { location.hash = App.destino(p); return false; } // quem venceu ainda pode trocar moedas por dias
      await render(p);
    },
  });

  return { ITENS, MEDALHAS, saldoDe, gradeMedalhas, avisarNovas, desenharRanking, conquistadas };
})();
