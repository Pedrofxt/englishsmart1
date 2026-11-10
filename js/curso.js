// curso.js — Trilha do aluno: 16 níveis, 4 lições + teste por nível, meta semanal, XP e certificados

(() => {
  const el = (id) => document.getElementById(id);
  let perfil = null;
  let dados = { progresso: [], certificados: [] };
  let admin = false;

  const registro = (n, l) => dados.progresso.find((p) => p.nivel_num === n && p.licao === l);
  const licaoOk = (r) => !!r && r.acertos >= r.total * 0.6;
  const temCertificado = (n) => dados.certificados.some((c) => c.nivel_num === n);
  const liberado = (n) => admin || n <= perfil.nivel_num;
  const licoesFeitas = (n) => [1, 2, 3, 4].filter((l) => licaoOk(registro(n, l))).length;
  const pct = (r) => Math.round((r.acertos / r.total) * 100);

  // ---------- Barra lateral: os 16 níveis ----------
  function renderizarNiveis(visto) {
    el('listaNiveis').innerHTML = Object.keys(FAIXAS).map((k) => `
      <div>
        <p class="px-2 mb-2 text-[11px] font-bold uppercase tracking-widest text-white/40">${k} · ${FAIXAS[k].nome}</p>
        <div class="space-y-1">
          ${CURRICULO.filter((n) => faixaDoNivel(n.n) === k).map((n) => {
            const aberto = liberado(n.n);
            const atual = !admin && n.n === perfil.nivel_num;
            const feito = temCertificado(n.n);
            const ativo = n.n === visto;
            const icone = feito ? Icone('check', 'w-4 h-4') : aberto ? n.n : Icone('cadeado', 'w-4 h-4');
            return `
              <a href="#/curso?n=${n.n}" class="flex items-center gap-3 px-2 py-2 rounded-xl text-sm transition
                ${ativo ? 'bg-white text-navy-900 shadow-lg' : aberto ? 'text-white/80 hover:bg-white/10' : 'text-white/35 hover:bg-white/5'}">
                <span class="w-8 h-8 shrink-0 rounded-lg grid place-items-center text-xs font-bold
                  ${feito ? 'bg-emerald-500 text-white' : atual ? 'bg-brand-red text-white' : ativo ? 'bg-navy-900 text-white' : 'bg-white/10'}">${icone}</span>
                <span class="min-w-0 flex-1">
                  <span class="block truncate font-semibold">${App.escapar(n.tema)}</span>
                  <span class="block text-[11px] ${ativo ? 'text-slate-400' : 'text-white/40'}">Nível ${n.n}${atual ? ' · você está aqui' : aberto && !admin ? ` · ${licoesFeitas(n.n)}/4 lições` : ''}</span>
                </span>
              </a>`;
          }).join('')}
        </div>
      </div>`).join('');
  }

  // ---------- Cartões de resumo ----------
  function renderizarResumo() {
    if (admin) {
      el('painelResumo').innerHTML = '';
      return;
    }
    const est = App.estatisticas(dados.progresso, perfil.meta_semanal, dados.sessoes);
    const n = perfil.nivel_num;
    const etapas = licoesFeitas(n) + (temCertificado(n) ? 1 : 0);
    const faixa = FAIXAS[perfil.nivel];
    const metaPct = Math.min(1, est.semana / est.meta);
    const C = 2 * Math.PI * 26;

    const a = perfil.assinatura;
    const diasPix = perfil.premium && a?.status !== 'ativa' && a?.ultimo_metodo === 'pix' && a?.pago_ate ? Math.ceil((new Date(a.pago_ate) - Date.now()) / 864e5) : null;
    el('painelResumo').innerHTML = `
      ${diasPix !== null && diasPix <= 5 ? `
        <a href="#/planos?metodo=pix" id="avisoRenovarPix" class="col-span-2 lg:col-span-4 flex flex-col sm:flex-row sm:items-center gap-4 bg-amber-50 border-2 border-amber-200 rounded-2xl p-5 hover:border-amber-400 transition">
          <span class="w-12 h-12 shrink-0 rounded-xl bg-[#32BCAD] text-white grid place-items-center">${Icone('relogio', 'w-6 h-6')}</span>
          <span class="flex-1"><span class="block font-display font-bold text-navy-900">Sua assinatura termina em ${diasPix} ${diasPix === 1 ? 'dia' : 'dias'}</span>
            <span class="block text-sm text-slate-600">Renove com Pix para não perder o acesso às lições, aos testes e à revisão. Os dias novos somam aos que faltam.</span></span>
          <span class="shrink-0 text-center font-semibold bg-[#32BCAD] text-white rounded-xl px-5 py-2.5">Renovar com Pix</span>
        </a>` : ''}

      <div class="bg-white rounded-2xl p-5 border border-slate-200 col-span-2 lg:col-span-1">
        <p class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Nível atual</p>
        <p class="mt-1 font-display text-3xl font-extrabold text-navy-900">${n}<span class="text-base text-slate-400"> de 16</span></p>
        <p class="text-xs font-semibold ${faixa.texto}">${perfil.nivel} · ${faixa.nome}</p>
        <div class="mt-3 h-1.5 bg-slate-100 rounded-full overflow-hidden"><div class="h-full ${faixa.cor} rounded-full" style="width:${(etapas / 5) * 100}%"></div></div>
        <p class="mt-1 text-[11px] text-slate-400">${etapas} de 5 etapas do nível</p>
      </div>
      <div class="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 flex items-center gap-3 sm:gap-4">
        <svg viewBox="0 0 60 60" class="w-11 h-11 sm:w-16 sm:h-16 shrink-0 -rotate-90">
          <circle cx="30" cy="30" r="26" fill="none" stroke="#F1F5F9" stroke-width="7"/>
          <circle cx="30" cy="30" r="26" fill="none" stroke="${metaPct >= 1 ? '#10B981' : '#EB1F3B'}" stroke-width="7" stroke-linecap="round"
            stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - metaPct)}" style="transition:stroke-dashoffset 1s"/>
        </svg>
        <div class="min-w-0">
          <p class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Meta semanal</p>
          <p class="font-display text-2xl font-extrabold text-navy-900">${est.semana}<span class="text-base text-slate-400">/${est.meta}</span></p>
          <label class="text-[11px] text-slate-400">atividades ·
            <select id="selMeta" class="text-[11px] font-semibold text-navy-600 bg-transparent cursor-pointer">
              ${Array.from({ length: 14 }, (_, i) => i + 1).map((m) => `<option value="${m}" ${m === est.meta ? 'selected' : ''}>meta ${m}</option>`).join('')}
            </select>
          </label>
        </div>
      </div>
      <div class="bg-white rounded-2xl p-5 border border-slate-200">
        <p class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Experiência</p>
        <p class="mt-1 font-display text-3xl font-extrabold text-navy-900">${perfil.xp.toLocaleString('pt-BR')}<span class="text-base text-slate-400"> XP</span></p>
        <p class="text-[11px] text-slate-400">10 XP por acerto · +100 por nível</p>
      </div>
      <div class="bg-white rounded-2xl p-5 border border-slate-200">
        <p class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Sequência</p>
        <p class="mt-1 font-display text-3xl font-extrabold text-navy-900">${est.sequencia > 0 ? `<span class="inline-block align-[-4px] text-brand-red">${Icone('chama', 'w-7 h-7')}</span>` : ''}${est.sequencia}<span class="text-base text-slate-400"> dia${est.sequencia === 1 ? '' : 's'}</span></p>
        <p class="text-[11px] text-slate-400">${est.sequencia ? 'Estude hoje para manter!' : 'Faça uma lição para começar'}</p>
      </div>
      ${dados.progresso.some((r) => r.licao >= 1) ? (() => {
        const hoje = (dados.memoria || []).filter((r) => new Date(r.proxima).getTime() <= Date.now()).length;
        const erros = (dados.memoria || []).filter((r) => r.caixa === 0 && r.erros > 0).length;
        return `
        <a href="#/revisao" id="cartaoRevisao" class="group col-span-2 lg:col-span-4 flex flex-col sm:flex-row sm:items-center gap-4 bg-white rounded-2xl p-5 border-2 ${hoje ? 'border-brand-red/30' : 'border-slate-200'} hover:border-navy-900 transition">
          <span class="w-12 h-12 shrink-0 rounded-xl bg-navy-900 text-white grid place-items-center">${Icone('brilho', 'w-6 h-6')}</span>
          <span class="flex-1 min-w-0">
            <span class="block font-display font-bold text-navy-900">Revisão inteligente</span>
            <span class="block text-sm text-slate-500">${hoje ? `<b class="text-brand-red">${hoje} ${hoje === 1 ? 'item' : 'itens'} para revisar hoje</b>` : 'Nada vencido hoje.'}${erros ? ` · ${erros} ${erros === 1 ? 'erro' : 'erros'} para fixar` : ''} · ditado, escrita, flashcards e desafio de 60 segundos.</span>
          </span>
          <span class="shrink-0 text-center font-semibold ${hoje ? 'bg-brand-red text-white' : 'border border-slate-200 text-navy-900'} rounded-xl px-5 py-2.5 transition group-hover:-translate-y-0.5">${hoje ? 'Revisar agora' : 'Abrir revisão'}</span>
        </a>`;
      })() : ''}`;

    el('selMeta').addEventListener('change', async (e) => {
      const meta = Number(e.target.value);
      const { error } = await sb.rpc('definir_meta', { p_meta: meta });
      if (error) return App.toast('Não foi possível salvar a meta.');
      perfil.meta_semanal = meta;
      App.limparPerfil();
      App.toast(`Meta semanal: ${meta} atividade${meta === 1 ? '' : 's'}`);
      renderizarResumo();
    });
  }

  // ---------- Página de um nível ----------
  function renderizarNivel(n) {
    const info = nivelInfo(n);
    const k = faixaDoNivel(n);
    const faixa = FAIXAS[k];
    const aberto = liberado(n);
    const feitas = licoesFeitas(n);
    const cert = temCertificado(n);
    const testeReg = registro(n, 0);
    const testeLiberado = admin || (aberto && feitas === 4);

    const cartaoLicao = (l, i) => {
      const num = i + 1;
      const r = registro(n, num);
      const ok = licaoOk(r);
      const chip = !r ? '<span class="text-[11px] font-semibold bg-slate-100 text-slate-500 px-2.5 py-1 rounded-full">Nova</span>'
        : ok ? `<span class="text-[11px] font-semibold bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full">Concluída · ${pct(r)}%</span>`
        : `<span class="text-[11px] font-semibold bg-amber-50 text-amber-700 px-2.5 py-1 rounded-full">${pct(r)}% · refaça</span>`;
      const resumo = l.g.split(/(?<=\.)\s/)[0];
      return `
        <article class="reveal group relative bg-white rounded-2xl border border-slate-200 p-6 flex flex-col ${aberto ? 'hover:-translate-y-1 hover:shadow-card' : 'opacity-60'} transition duration-300" style="transition-delay:${i * 60}ms">
          <div class="flex items-start justify-between gap-3">
            <span class="w-11 h-11 rounded-xl ${ok ? 'bg-emerald-500' : 'bg-navy-900'} text-white grid place-items-center font-display font-bold">${ok ? Icone('check', 'w-5 h-5') : num}</span>
            ${chip}
          </div>
          <p class="mt-4 text-[11px] font-semibold uppercase tracking-widest text-slate-400">Lição ${num}</p>
          <h3 class="text-lg font-bold text-navy-900">${App.escapar(l.t)}</h3>
          <p class="mt-1 text-sm text-slate-500 flex-1">${App.escapar(resumo)}</p>
          <div class="mt-4 flex items-center justify-between text-xs text-slate-400">
            <span class="inline-flex items-center gap-3"><span class="inline-flex items-center gap-1">${Icone('livro', 'w-3.5 h-3.5')}Gramática</span><span class="inline-flex items-center gap-1">${Icone('som', 'w-3.5 h-3.5')}Áudio</span><span class="inline-flex items-center gap-1">${Icone('microfone', 'w-3.5 h-3.5')}Fala</span></span>
          </div>
          ${aberto
            ? `<a href="#/licao?n=${n}&l=${num}" class="mt-4 text-center font-semibold rounded-xl py-2.5 transition ${ok ? 'border border-slate-200 text-navy-900 hover:border-navy-900' : 'bg-brand-red hover:bg-brand-redDark text-white'}">${r ? (ok ? 'Revisar' : 'Tentar de novo') : 'Começar'}</a>`
            : `<span class="mt-4 inline-flex items-center justify-center gap-1.5 text-sm text-slate-400 py-2.5">${Icone('cadeado', 'w-4 h-4')}Bloqueada</span>`}
        </article>`;
    };

    let blocoTeste;
    if (cert) {
      blocoTeste = `
        <div class="flex flex-col sm:flex-row sm:items-center gap-4">
          <span class="w-14 h-14 shrink-0 rounded-2xl bg-emerald-500 text-white grid place-items-center">${Icone('trofeu', 'w-7 h-7')}</span>
          <div class="flex-1"><p class="font-display text-lg font-bold text-navy-900">Teste aprovado${testeReg ? ` com ${pct(testeReg)}%` : ''}!</p><p class="text-sm text-slate-500">Você concluiu o nível ${n}. Parabéns!</p></div>
          <a href="#/certificado?n=${n}" class="text-center font-semibold bg-navy-900 hover:bg-navy-800 text-white rounded-xl px-6 py-3 transition">Ver certificado</a>
        </div>`;
    } else if (testeLiberado) {
      blocoTeste = `
        <div class="flex flex-col sm:flex-row sm:items-center gap-4">
          <span class="w-14 h-14 shrink-0 rounded-2xl bg-brand-red text-white grid place-items-center">${Icone('alvo', 'w-7 h-7')}</span>
          <div class="flex-1"><p class="font-display text-lg font-bold text-navy-900">Teste do nível ${n}</p><p class="text-sm text-slate-500">12 questões das 4 lições. Com 70% você ganha o certificado${n < 16 ? ` e vai para o nível ${n + 1}` : ' de conclusão do curso'}.${testeReg ? ` Sua melhor nota: ${pct(testeReg)}%.` : ''}</p></div>
          <a href="#/licao?n=${n}&l=0" class="btn-shine text-center font-semibold bg-brand-red hover:bg-brand-redDark text-white rounded-xl px-6 py-3 shadow-glow transition">${testeReg ? 'Tentar de novo' : 'Fazer o teste'}</a>
        </div>`;
    } else {
      blocoTeste = `
        <div class="flex flex-col sm:flex-row sm:items-center gap-4 opacity-70">
          <span class="w-14 h-14 shrink-0 rounded-2xl bg-slate-200 text-slate-500 grid place-items-center">${Icone('cadeado', 'w-7 h-7')}</span>
          <div class="flex-1"><p class="font-display text-lg font-bold text-navy-900">Teste do nível ${n}</p><p class="text-sm text-slate-500">${aberto ? `Conclua as 4 lições com pelo menos 60% para liberar. (${feitas}/4)` : `Chegue ao nível ${n} para liberar.`}</p></div>
        </div>`;
    }

    el('paginaNivel').innerHTML = `
      ${perfil.concluiu_curso_em ? `
        <div class="mb-6 relative overflow-hidden rounded-[2rem] bg-gradient-to-r from-amber-400 to-brand-red text-white p-6 md:p-8">
          <p class="text-sm font-semibold uppercase tracking-widest opacity-80">Curso concluído</p>
          <p class="mt-1 font-display text-2xl md:text-3xl font-extrabold">Você completou os 16 níveis. You speak English!</p>
          <a href="#/certificado?n=16" class="mt-4 inline-block font-semibold bg-white/20 hover:bg-white/30 rounded-xl px-5 py-2.5 transition">Ver certificado final</a>
        </div>` : ''}
      <div class="relative overflow-hidden bg-brand-hero text-white rounded-[2rem] p-7 md:p-10">
        <div class="absolute inset-0 bg-grid opacity-70"></div>
        <div class="relative">
          <div class="flex flex-wrap items-center gap-2">
            <span class="text-xs font-semibold uppercase tracking-widest ${faixa.cor} px-3 py-1 rounded-full">${k} · ${faixa.nome}</span>
            <span class="text-xs font-semibold uppercase tracking-widest bg-white/10 px-3 py-1 rounded-full">Nível ${n} de 16</span>
            ${!aberto ? `<span class="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-widest bg-white/10 px-3 py-1 rounded-full">${Icone('cadeado', 'w-3.5 h-3.5')}Bloqueado</span>` : ''}
          </div>
          <h1 class="mt-4 text-3xl md:text-5xl font-extrabold">${App.escapar(info.tema)}</h1>
          <p class="mt-3 text-white/70 text-lg max-w-2xl">Ao final deste nível, você vai conseguir <b class="text-white">${App.escapar(info.objetivo)}</b>.</p>
          ${aberto && !admin ? `
            <div class="mt-6 max-w-md">
              <div class="flex justify-between text-xs text-white/60 mb-1.5"><span>Progresso do nível</span><span>${feitas + (cert ? 1 : 0)}/5</span></div>
              <div class="h-2 bg-white/10 rounded-full overflow-hidden"><div class="h-full bg-brand-red rounded-full transition-all duration-700" style="width:${((feitas + (cert ? 1 : 0)) / 5) * 100}%"></div></div>
            </div>` : ''}
        </div>
      </div>
      <div class="mt-6 grid sm:grid-cols-2 gap-4">${info.licoes.map(cartaoLicao).join('')}</div>
      <div class="reveal mt-4 bg-white rounded-2xl border-2 ${cert ? 'border-emerald-200' : testeLiberado ? 'border-brand-red/30' : 'border-slate-200'} p-6">${blocoTeste}</div>`;
    revelar(el('paginaNivel'));
  }

  function renderizarCertificados() {
    const lista = [...dados.certificados].sort((a, b) => a.nivel_num - b.nivel_num);
    el('secaoCertificados').innerHTML = admin ? '' : `
      <h2 class="text-xl font-bold text-navy-900">Seus certificados</h2>
      ${lista.length ? `
        <div class="mt-4 flex flex-wrap gap-3">
          ${lista.map((c) => `
            <a href="#/certificado?n=${c.nivel_num}" class="flex items-center gap-3 bg-white border border-slate-200 hover:border-navy-900 rounded-2xl px-4 py-3 transition">
              <span class="w-10 h-10 rounded-xl ${FAIXAS[faixaDoNivel(c.nivel_num)].cor} text-white grid place-items-center font-bold">${c.nivel_num}</span>
              <span><span class="block text-sm font-semibold text-navy-900">Nível ${c.nivel_num} · ${App.escapar(nivelInfo(c.nivel_num).tema)}</span>
              <span class="block text-xs text-slate-400">${new Date(c.emitido_em).toLocaleDateString('pt-BR')}</span></span>
            </a>`).join('')}
        </div>`
      : '<p class="mt-2 text-sm text-slate-500">Conclua o teste do seu nível para ganhar o primeiro certificado.</p>'}`;
  }

  el('btnMenu').addEventListener('click', () => el('painelLateral').classList.toggle('hidden'));

  App.registrar('curso', {
    async iniciar({ params }) {
      const p = await App.perfil(true);
      if (!p) { location.hash = '#/entrar'; return false; }
      if (p.papel === 'aluno' && !p.nivel_num) { location.hash = '#/prova'; return false; }
      if (p.papel === 'aluno' && !p.premium) { location.hash = '#/planos?motivo=assinatura'; return false; } // trilha só com assinatura

      admin = p.papel === 'admin';
      perfil = admin ? { ...p, nivel_num: 16, nivel: 'C2', xp: 0, meta_semanal: 3 } : p;
      dados = admin ? { progresso: [], certificados: [], sessoes: [] } : await App.dadosDoAluno(p.id);
      if (!admin) {
        const { data: memoria } = await sb.from('revisao').select('item, caixa, erros, proxima').eq('aluno_id', p.id);
        dados.memoria = memoria || [];
      }

      const pedido = Number(params.get('n'));
      const visto = pedido >= 1 && pedido <= 16 ? pedido : admin ? 1 : perfil.nivel_num;

      const primeiroNome = p.nome.split(' ')[0];
      el('nomeAluno').textContent = p.nome;
      el('avatar').textContent = primeiroNome.charAt(0).toUpperCase();
      el('faixaAdmin').classList.toggle('hidden', !admin);
      el('statusConta').textContent = admin ? 'Administrador' : `Nível ${perfil.nivel_num} · ${perfil.nivel} · ${perfil.xp} XP`;
      el('saudacao').innerHTML = admin ? 'Trilha completa do curso:'
        : `Hello, <strong class="text-navy-900">${App.escapar(primeiroNome)}</strong>! Bora praticar hoje?`;

      renderizarNiveis(visto);
      renderizarResumo();
      renderizarNivel(visto);
      renderizarCertificados();
      if (window.innerWidth < 1024) el('painelLateral').classList.add('hidden');
    },
  });
})();
