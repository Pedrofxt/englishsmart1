// plano.js — Plano Premium: comparação, assinatura pelo Mercado Pago, status e cancelamento

const Planos = (() => {
  const el = (id) => document.getElementById(id);
  const data = (d) => (d ? new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }) : '—');
  let espera = null;

  const RECURSOS_GRATIS = ['Prova de nivelamento completa', 'A 1ª lição de cada nível', 'Áudio, diálogos e prática de fala'];
  const RECURSOS_PREMIUM = ['Todas as 64 lições dos 16 níveis', 'Teste de cada nível e certificados', 'Revisão inteligente: ditado, escrita, flashcards e desafio', 'Metas, XP, sequência e acompanhamento', 'Cancele quando quiser, sem multa'];

  const item = (t, cor) => `<li class="flex gap-3"><span class="${cor} mt-0.5 shrink-0">${Icone('check', 'w-5 h-5')}</span><span>${t}</span></li>`;

  // Os dois cartões de plano (usados aqui e na página inicial)
  function cartoes({ acaoGratis = '', acaoPremium = '' } = {}) {
    const [reais, centavos] = PLANO.preco.toFixed(2).split('.');
    return `
      <div class="grid md:grid-cols-2 gap-6 items-stretch">
        <article class="reveal bg-white rounded-[2rem] border border-slate-200 p-8 flex flex-col">
          <p class="font-display font-bold text-navy-900 text-xl">Grátis</p>
          <p class="mt-1 text-slate-500 text-sm">Para conhecer o método</p>
          <p class="mt-6 font-display text-5xl font-extrabold text-navy-900">R$ 0</p>
          <ul class="mt-8 space-y-3 text-slate-600 flex-1">${RECURSOS_GRATIS.map((t) => item(t, 'text-slate-400')).join('')}</ul>
          ${acaoGratis}
        </article>
        <article class="reveal relative overflow-hidden bg-brand-hero text-white rounded-[2rem] p-8 flex flex-col shadow-card" style="transition-delay:.1s">
          <div class="absolute inset-0 bg-grid opacity-60"></div>
          <div class="relative flex flex-col flex-1">
            <div class="flex items-center justify-between gap-3">
              <p class="font-display font-bold text-xl">${PLANO.nome}</p>
              <span class="text-[11px] font-bold uppercase tracking-widest bg-brand-red px-3 py-1 rounded-full">Curso completo</span>
            </div>
            <p class="mt-1 text-white/60 text-sm">Do primeiro "Hello" à fluência</p>
            <p class="mt-6 font-display font-extrabold"><span class="text-2xl align-top">R$</span> <span class="text-6xl">${reais}</span><span class="text-2xl">,${centavos}</span><span class="text-base font-semibold text-white/60"> /mês</span></p>
            <ul class="mt-8 space-y-3 text-white/85 flex-1">${RECURSOS_PREMIUM.map((t) => item(t, 'text-brand-red')).join('')}</ul>
            ${acaoPremium}
          </div>
        </article>
      </div>`;
  }

  // Mensagem de erro que a função do servidor devolveu
  async function erroDaFuncao(error) {
    try { const j = await error.context.json(); return j.erro || error.message; } catch { return App.mensagemDeErro(error); }
  }

  async function chamar(acao, extra = {}) {
    const { data: resp, error } = await sb.functions.invoke('mercadopago', { body: { acao, ...extra } });
    if (error) throw new Error(await erroDaFuncao(error));
    if (resp?.erro) throw new Error(resp.erro);
    return resp;
  }

  function pararEspera() {
    clearInterval(espera?.t);
    if (espera?.foco) window.removeEventListener('focus', espera.foco);
    espera = null;
  }

  // Depois de abrir o Mercado Pago: confere sozinho a cada 6 s (por 15 min) e quando o aluno volta para a aba
  function esperarPagamento() {
    pararEspera();
    const inicio = Date.now();
    const conferir = async (manual = false) => {
      if (!document.querySelector('[data-view="planos"]') || document.querySelector('[data-view="planos"]').classList.contains('hidden')) return pararEspera();
      try {
        const { assinatura } = await chamar('sincronizar');
        if (App.temPremium(assinatura)) {
          pararEspera();
          App.limparPerfil();
          const p = await App.perfil(true);
          render(p, { boasVindas: true });
          return;
        }
        if (manual) App.toast('Ainda não recebemos a confirmação. Se já pagou, aguarde alguns segundos.');
      } catch (err) { if (manual) App.toast(err.message); }
      if (Date.now() - inicio > 15 * 60e3) pararEspera();
    };
    espera = { t: setInterval(conferir, 6000), foco: () => conferir() };
    window.addEventListener('focus', espera.foco);
    el('btnJaPaguei')?.addEventListener('click', () => conferir(true));
  }

  async function assinar(p) {
    const btn = el('btnAssinar');
    const email = el('emailMP').value.trim();
    const msg = el('msgAssinar');
    msg.classList.add('hidden');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { msg.textContent = 'Informe um e-mail válido.'; msg.classList.remove('hidden'); return; }
    const site = /^https:$/.test(location.protocol);
    // abre a aba antes de esperar a resposta, senão o navegador bloqueia a janela
    const janela = site ? null : window.open('', '_blank');
    setLoading(btn, true, 'Abrindo o Mercado Pago…');
    try {
      const { link } = await chamar('criar', { email, voltar: site ? `${location.href.split('#')[0]}#/planos?retorno=1` : '' });
      if (site) { location.href = link; return; }
      if (janela) janela.location.href = link; else location.href = link;
      el('caixaAssinar').innerHTML = `
        <div class="text-center py-4">
          <span class="spinner spinner-escuro mx-auto" style="width:32px;height:32px"></span>
          <h3 class="mt-5 font-display text-xl font-bold text-navy-900">Aguardando o pagamento</h3>
          <p class="mt-2 text-slate-500 text-sm max-w-sm mx-auto">Conclua a assinatura na aba do Mercado Pago. Assim que o pagamento for aprovado, o Premium é liberado aqui sozinho.</p>
          <div class="mt-5 flex flex-col sm:flex-row justify-center gap-3">
            <button id="btnJaPaguei" class="font-semibold bg-navy-900 hover:bg-navy-800 text-white rounded-xl px-5 py-3 transition">Já paguei, verificar</button>
            <a href="${App.escapar(link)}" target="_blank" rel="noopener" class="font-semibold border border-slate-200 hover:border-navy-900 text-navy-900 rounded-xl px-5 py-3 transition">Abrir o Mercado Pago de novo</a>
          </div>
        </div>`;
      esperarPagamento();
    } catch (err) {
      janela?.close();
      setLoading(btn, false, `Assinar por ${precoBR(PLANO.preco)}/mês`);
      msg.textContent = err.message;
      msg.classList.remove('hidden');
    }
  }

  async function cancelar() {
    const a = App.perfil && (await App.perfil()).assinatura;
    const ate = a?.pago_ate ? data(a.pago_ate) : 'o fim do período pago';
    if (!confirm(`Cancelar a assinatura Premium?\n\nNão haverá novas cobranças e você continua com acesso até ${ate}. Seu progresso fica guardado.`)) return;
    const btn = el('btnCancelar');
    setLoading(btn, true, 'Cancelando…');
    try {
      await chamar('cancelar');
      App.limparPerfil();
      App.toast('Assinatura cancelada. Nenhuma nova cobrança será feita.');
      render(await App.perfil(true));
    } catch (err) {
      setLoading(btn, false, 'Cancelar assinatura');
      App.toast(err.message);
    }
  }

  // ----- Situação do aluno -----
  function painelStatus(p, pagamentos) {
    const a = p.assinatura || {};
    const cortesia = a.cortesia_ate && new Date(a.cortesia_ate) > new Date();
    const pago = a.pago_ate && new Date(a.pago_ate) > new Date();
    const ativa = a.status === 'ativa';
    const titulo = ativa ? 'Premium ativo' : pago ? 'Premium até o fim do período pago' : cortesia ? 'Premium de cortesia' : 'Premium';
    const linhas = [
      ativa && a.proxima_cobranca ? ['Próxima cobrança', `${data(a.proxima_cobranca)} · ${precoBR(Number(a.valor || PLANO.preco))}`] : null,
      !ativa && pago ? ['Acesso garantido até', data(a.pago_ate)] : null,
      cortesia ? ['Cortesia até', data(a.cortesia_ate)] : null,
      a.email_pagador ? ['Conta do Mercado Pago', App.escapar(a.email_pagador)] : null,
      a.status === 'cancelada' ? ['Renovação', 'Cancelada (sem novas cobranças)'] : null,
      a.status === 'pausada' ? ['Renovação', 'Pausada no Mercado Pago'] : null,
    ].filter(Boolean);
    return `
      <section class="reveal relative overflow-hidden bg-brand-hero text-white rounded-[2rem] p-8 md:p-10">
        <div class="absolute inset-0 bg-grid opacity-60"></div>
        <div class="relative flex flex-col md:flex-row md:items-center gap-6">
          <span class="w-16 h-16 shrink-0 rounded-2xl bg-brand-red grid place-items-center shadow-glow">${Icone('estrela', 'w-8 h-8')}</span>
          <div class="flex-1">
            <p class="text-xs font-semibold uppercase tracking-widest text-white/50">Seu plano</p>
            <h2 id="tituloPlano" class="mt-1 text-2xl md:text-3xl font-extrabold">${titulo}</h2>
            <p class="mt-1 text-white/70">Todas as lições, testes, certificados e a revisão inteligente estão liberados.</p>
          </div>
          <a href="#/curso" class="shrink-0 text-center font-semibold bg-white text-navy-900 hover:bg-slate-100 rounded-xl px-6 py-3 transition">Ir para a trilha</a>
        </div>
      </section>
      <section class="reveal mt-6 grid md:grid-cols-2 gap-6">
        <div class="bg-white rounded-2xl border border-slate-200 p-6">
          <h3 class="font-display font-bold text-navy-900">Detalhes</h3>
          <dl class="mt-4 divide-y divide-slate-100 text-sm">
            ${linhas.map(([k, v]) => `<div class="flex justify-between gap-4 py-2.5"><dt class="text-slate-500">${k}</dt><dd class="font-semibold text-navy-900 text-right">${v}</dd></div>`).join('') || '<p class="text-slate-500">—</p>'}
          </dl>
          ${ativa ? '<button id="btnCancelar" class="mt-5 w-full font-semibold border border-red-200 text-red-700 hover:bg-red-50 rounded-xl py-3 transition">Cancelar assinatura</button>' : ''}
          ${!ativa && !cortesia ? `<button id="btnReassinar" class="mt-5 w-full font-semibold bg-brand-red hover:bg-brand-redDark text-white rounded-xl py-3 transition">Renovar assinatura</button>` : ''}
        </div>
        <div class="bg-white rounded-2xl border border-slate-200 p-6">
          <h3 class="font-display font-bold text-navy-900">Pagamentos</h3>
          ${pagamentos.length ? `<ul id="listaPagamentos" class="mt-4 divide-y divide-slate-100 text-sm">
            ${pagamentos.map((x) => `<li class="flex justify-between gap-4 py-2.5"><span class="text-slate-500">${data(x.pago_em || x.criado_em)}</span>
              <span class="font-semibold ${x.status === 'aprovado' ? 'text-emerald-700' : 'text-amber-700'}">${precoBR(Number(x.valor))} · ${x.status === 'aprovado' ? 'aprovado' : App.escapar(x.status)}</span></li>`).join('')}
          </ul>` : `<p class="mt-4 text-sm text-slate-500">${cortesia && !a.mp_id ? 'Acesso liberado pela equipe, sem cobrança.' : 'As cobranças aparecem aqui assim que o Mercado Pago confirmar.'}</p>`}
          <p class="mt-4 text-xs text-slate-400">Os recibos também ficam na sua conta do Mercado Pago, em "Assinaturas".</p>
        </div>
      </section>`;
  }

  function caixaAssinar(p) {
    const a = p.assinatura;
    return `
      <section id="caixaAssinar" class="reveal mt-8 bg-white rounded-[2rem] border-2 border-brand-red/20 p-6 md:p-8 max-w-2xl mx-auto">
        <h2 class="font-display text-2xl font-bold text-navy-900">Assinar o ${PLANO.nome}</h2>
        <p class="mt-1 text-slate-500">Pagamento seguro pelo Mercado Pago, com cobrança automática todo mês. Cancele quando quiser.</p>
        <label for="emailMP" class="mt-6 block text-sm font-medium text-slate-600 mb-1.5">E-mail da sua conta no Mercado Pago</label>
        <input id="emailMP" type="email" autocomplete="email" value="${App.escapar(a?.email_pagador || p.email || '')}" class="campo" />
        <p class="mt-2 text-xs text-slate-400">Use o mesmo e-mail com que você entra no Mercado Pago (se for diferente do seu login aqui, troque acima).</p>
        <p id="msgAssinar" class="hidden mt-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3" role="alert"></p>
        <button id="btnAssinar" class="btn-shine mt-6 w-full bg-brand-red hover:bg-brand-redDark disabled:opacity-70 text-white font-display font-semibold text-lg py-4 rounded-2xl shadow-glow transition hover:-translate-y-0.5">Assinar por ${precoBR(PLANO.preco)}/mês</button>
        <div class="mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-xs text-slate-400">
          <span class="inline-flex items-center gap-1.5">${Icone('cadeado', 'w-3.5 h-3.5')}Seus dados de cartão ficam só no Mercado Pago</span>
          <span class="inline-flex items-center gap-1.5">${Icone('escudo', 'w-3.5 h-3.5')}7 dias para desistir com reembolso</span>
        </div>
      </section>`;
  }

  async function render(p, { boasVindas = false, motivo = '' } = {}) {
    const raiz = el('planosConteudo');
    pararEspera();
    const logado = !!p;
    const aluno = p?.papel === 'aluno';
    const MOTIVOS = {
      licao: 'Esta lição faz parte do plano Premium.',
      teste: 'O teste do nível e o certificado fazem parte do plano Premium.',
      revisao: 'A revisão inteligente faz parte do plano Premium.',
    };

    el('planosTitulo').textContent = aluno && p.premium ? 'Meu plano' : 'Escolha como estudar';
    el('planosSub').textContent = aluno && p.premium ? 'Sua assinatura, cobranças e acesso.' : 'Comece grátis e assine o Premium quando quiser o curso completo.';
    if (aluno && p.premium) {
      const { data: pagamentos } = await sb.from('pagamentos').select('*').eq('aluno_id', p.id);
      raiz.innerHTML = painelStatus(p, (pagamentos || []).sort((x, y) => new Date(y.criado_em) - new Date(x.criado_em)));
      el('btnCancelar')?.addEventListener('click', cancelar);
      el('btnReassinar')?.addEventListener('click', () => { raiz.insertAdjacentHTML('beforeend', caixaAssinar(p)); el('btnReassinar').remove(); el('btnAssinar').addEventListener('click', () => assinar(p)); revelar(raiz); el('caixaAssinar').scrollIntoView({ behavior: 'smooth' }); });
      if (boasVindas) {
        raiz.insertAdjacentHTML('afterbegin', `<div id="bemVindoPremium" class="anim-pop mb-6 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl px-5 py-4 font-semibold">Pagamento confirmado! Bem-vindo ao ${PLANO.nome}.</div>`);
        soltarConfete(raiz.querySelector('section'));
      }
      revelar(raiz);
      return;
    }

    const pendente = aluno && p.assinatura?.status === 'pendente' && p.assinatura?.mp_id;
    raiz.innerHTML = `
      ${motivo && MOTIVOS[motivo] ? `<div id="avisoPlano" class="mb-8 flex items-center gap-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-2xl px-5 py-4">${Icone('cadeado', 'w-5 h-5 shrink-0')}<span><b>${MOTIVOS[motivo]}</b> Assine para continuar de onde parou.</span></div>` : ''}
      ${cartoes({
        acaoGratis: logado ? '<a href="#/curso" class="mt-8 text-center font-semibold border border-slate-200 hover:border-navy-900 text-navy-900 rounded-xl py-3 transition">Continuar no grátis</a>'
          : '<a href="#/cadastro" class="mt-8 text-center font-semibold border border-slate-200 hover:border-navy-900 text-navy-900 rounded-xl py-3 transition">Criar conta grátis</a>',
        acaoPremium: aluno ? '<button data-ir-assinar class="btn-shine mt-8 font-display font-semibold bg-brand-red hover:bg-brand-redDark text-white rounded-xl py-3.5 shadow-glow transition">Quero o Premium</button>'
          : logado ? '<p class="mt-8 text-center text-sm text-white/60">Administradores já têm acesso completo.</p>'
          : '<a href="#/cadastro" class="btn-shine mt-8 text-center font-display font-semibold bg-brand-red hover:bg-brand-redDark text-white rounded-xl py-3.5 shadow-glow transition">Criar conta e assinar</a>',
      })}
      ${aluno ? caixaAssinar(p) : ''}
      ${pendente ? '<p class="mt-4 text-center text-sm text-slate-500">Começou uma assinatura e não terminou? <button id="btnVerificarPendente" class="font-semibold text-navy-600 hover:text-brand-red underline">Verificar pagamento</button></p>' : ''}
      <section class="reveal mt-12 max-w-3xl mx-auto grid sm:grid-cols-3 gap-4 text-sm">
        <div class="bg-white rounded-2xl border border-slate-200 p-5"><p class="font-semibold text-navy-900">Cobrança mensal</p><p class="mt-1 text-slate-500">Renova sozinha todo mês no cartão, pelo Mercado Pago.</p></div>
        <div class="bg-white rounded-2xl border border-slate-200 p-5"><p class="font-semibold text-navy-900">Sem fidelidade</p><p class="mt-1 text-slate-500">Cancele aqui mesmo; o acesso vai até o fim do mês pago.</p></div>
        <div class="bg-white rounded-2xl border border-slate-200 p-5"><p class="font-semibold text-navy-900">Seu progresso fica</p><p class="mt-1 text-slate-500">Se parar de assinar, nada do que você fez é apagado.</p></div>
      </section>`;
    raiz.querySelector('[data-ir-assinar]')?.addEventListener('click', () => { el('caixaAssinar').scrollIntoView({ behavior: 'smooth', block: 'center' }); setTimeout(() => el('emailMP').focus(), 400); });
    el('btnAssinar')?.addEventListener('click', () => assinar(p));
    el('btnVerificarPendente')?.addEventListener('click', async (e) => {
      setLoading(e.target, true, 'Verificando…');
      try {
        const { assinatura } = await chamar('sincronizar');
        if (App.temPremium(assinatura)) { App.limparPerfil(); return render(await App.perfil(true), { boasVindas: true }); }
        App.toast('O pagamento ainda não foi concluído no Mercado Pago.');
      } catch (err) { App.toast(err.message); }
      setLoading(e.target, false, 'Verificar pagamento');
    });
    revelar(raiz);
  }

  App.registrar('planos', {
    async iniciar({ params }) {
      const p = await App.perfil(true);
      el('planosVoltar').href = !p ? '#/' : p.papel === 'admin' ? '#/admin' : '#/curso';
      // voltou do Mercado Pago (site publicado): confere o pagamento na hora
      if (params.get('retorno') && p?.papel === 'aluno' && !p.premium && p.assinatura?.mp_id) {
        try {
          const { assinatura } = await chamar('sincronizar');
          if (App.temPremium(assinatura)) { App.limparPerfil(); await render(await App.perfil(true), { boasVindas: true }); return; }
        } catch {}
        await render(p);
        if (el('caixaAssinar')) { el('btnAssinar').closest('section').scrollIntoView(); esperarPagamentoComAviso(); }
        return;
      }
      await render(p, { motivo: params.get('motivo') || '' });
    },
  });

  function esperarPagamentoComAviso() {
    App.toast('Estamos aguardando a confirmação do Mercado Pago…');
    esperarPagamento();
  }

  return { cartoes, chamar };
})();
