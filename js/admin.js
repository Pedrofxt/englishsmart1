// admin.js — Portal do professor: acompanhamento por status, nível, lições e atividade recente

(() => {
  const el = (id) => document.getElementById(id);
  const tabela = el('tabelaAlunos');
  let linhas = [];

  const STATUS = {
    'Alto desempenho': { cor: 'bg-emerald-50 text-emerald-700', ponto: 'bg-emerald-500', numero: 'text-emerald-600' },
    'Em dia': { cor: 'bg-sky-50 text-sky-700', ponto: 'bg-sky-500', numero: 'text-sky-600' },
    'Atrasado': { cor: 'bg-amber-50 text-amber-700', ponto: 'bg-amber-500', numero: 'text-amber-600' },
    'Inativo': { cor: 'bg-slate-100 text-slate-500', ponto: 'bg-slate-400', numero: 'text-slate-500' },
    'Sem nivelamento': { cor: 'bg-violet-50 text-violet-700', ponto: 'bg-violet-500', numero: 'text-violet-600' },
  };

  const dataBR = (t) => (t ? new Date(t).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '—');
  const iniciais = (nome) => nome.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join('');

  function relativo(t) {
    if (!t) return 'nunca';
    const dias = Math.floor((Date.now() - t) / 864e5);
    if (dias === 0) return 'hoje';
    if (dias === 1) return 'ontem';
    return `há ${dias} dias`;
  }

  function calcularStatus(a, est) {
    if (!a.nivel_num) return 'Sem nivelamento';
    const ultima = est.ultima || new Date(a.prova_feita_em).getTime();
    if (Date.now() - ultima > 14 * 864e5) return 'Inativo';
    if (est.semana >= a.meta_semanal) return est.media >= 0.8 ? 'Alto desempenho' : 'Em dia';
    return 'Atrasado';
  }

  // Plano de cada aluno
  function planoDe(a) {
    if (!a) return { nome: 'Sem assinatura', cls: 'bg-slate-100 text-slate-500' };
    const agora = Date.now();
    if (a.status === 'ativa' && a.pago_ate && new Date(a.pago_ate) > agora) return { nome: 'Assinante', cls: 'bg-amber-100 text-amber-800', pagante: true };
    if (a.pago_ate && new Date(a.pago_ate) > agora && a.ultimo_metodo === 'pix') return { nome: 'Assinante (Pix)', cls: 'bg-teal-100 text-teal-800', ate: a.pago_ate, pagante: true };
    if (a.pago_ate && new Date(a.pago_ate) > agora) return { nome: 'Assinante (cancelou)', cls: 'bg-amber-50 text-amber-700', ate: a.pago_ate };
    if (a.cortesia_ate && new Date(a.cortesia_ate) > agora) return { nome: 'Cortesia', cls: 'bg-sky-100 text-sky-800', ate: a.cortesia_ate, cortesia: true };
    return { nome: 'Sem assinatura', cls: 'bg-slate-100 text-slate-500' };
  }

  function montarLinhas(alunos, progresso, certificados, sessoes = [], assinaturas = [], aparelhos = []) {
    return alunos.map((a) => {
      const prog = progresso.filter((p) => p.aluno_id === a.id);
      const est = App.estatisticas(prog, a.meta_semanal, sessoes.filter((x) => x.aluno_id === a.id));
      const licoes = prog.filter((p) => p.licao >= 1 && p.acertos >= p.total * 0.6).length;
      return {
        ...a,
        est,
        licoes,
        certs: certificados.filter((c) => c.aluno_id === a.id).length,
        plano: planoDe(assinaturas.find((x) => x.aluno_id === a.id)),
        aparelhos: aparelhos.filter((x) => x.aluno_id === a.id).length,
        status: calcularStatus(a, est),
      };
    });
  }

  function cartoes() {
    const contar = (s) => linhas.filter((l) => l.status === s).length;
    const pagantes = linhas.filter((l) => l.plano.pagante).length;
    el('cartoesPlano').innerHTML = `
      <div class="bg-white rounded-2xl p-5 border border-slate-200"><p class="text-sm text-slate-500">Assinantes</p><p id="numAssinantes" class="mt-1 font-display text-4xl font-extrabold text-amber-600">${pagantes}</p></div>
      <div class="bg-white rounded-2xl p-5 border border-slate-200"><p class="text-sm text-slate-500">Receita mensal estimada</p><p id="numReceita" class="mt-1 font-display text-4xl font-extrabold text-navy-900">${precoBR(pagantes * PLANO.preco)}</p></div>
      <div class="bg-white rounded-2xl p-5 border border-slate-200"><p class="text-sm text-slate-500">Conversão</p><p class="mt-1 font-display text-4xl font-extrabold text-navy-900">${linhas.length ? Math.round((pagantes / linhas.length) * 100) : 0}%</p><p class="text-[11px] text-slate-400">dos alunos são assinantes</p></div>`;
    const itens = [
      ['Total de alunos', linhas.length, 'text-navy-900', ''],
      ['Alto desempenho', contar('Alto desempenho'), STATUS['Alto desempenho'].numero, 'Alto desempenho'],
      ['Em dia', contar('Em dia'), STATUS['Em dia'].numero, 'Em dia'],
      ['Atrasados', contar('Atrasado'), STATUS.Atrasado.numero, 'Atrasado'],
      ['Inativos', contar('Inativo'), STATUS.Inativo.numero, 'Inativo'],
    ];
    el('cartoesStatus').innerHTML = itens.map(([rotulo, valor, cor, filtro]) => `
      <button data-filtrar="${filtro}" class="text-left bg-white rounded-2xl p-5 border border-slate-200 hover:border-navy-900 transition">
        <p class="text-sm text-slate-500 flex items-center gap-2">${filtro ? `<span class="w-2 h-2 rounded-full ${STATUS[filtro].ponto}"></span>` : ''}${rotulo}</p>
        <p class="mt-1 font-display text-4xl font-extrabold ${cor}">${valor}</p>
      </button>`).join('');
    el('cartoesStatus').querySelectorAll('[data-filtrar]').forEach((b) => b.addEventListener('click', () => {
      el('filtroStatus').value = b.dataset.filtrar;
      renderizar();
    }));

    const comNivel = linhas.filter((l) => l.nivel);
    el('distribuicao').innerHTML = Object.keys(FAIXAS).map((k) => {
      const qtd = comNivel.filter((l) => l.nivel === k).length;
      const p = comNivel.length ? Math.round((qtd / comNivel.length) * 100) : 0;
      return `
        <div>
          <div class="flex justify-between items-baseline"><span class="font-bold text-navy-900">${k}</span><span class="text-xs text-slate-400">${qtd}</span></div>
          <div class="mt-2 h-24 bg-slate-100 rounded-xl overflow-hidden flex items-end">
            <div class="w-full ${FAIXAS[k].cor} rounded-xl transition-all duration-700" style="height:${p}%"></div>
          </div>
          <p class="mt-1 text-[11px] text-slate-400 truncate">${FAIXAS[k].nome}</p>
        </div>`;
    }).join('');
  }

  function renderizar() {
    cartoes();
    const termo = el('busca').value.trim().toLowerCase();
    const fs = el('filtroStatus').value;
    const fn = el('filtroNivel').value;
    const lista = linhas.filter((a) =>
      (!termo || a.nome.toLowerCase().includes(termo) || a.email.includes(termo)) &&
      (!fs || a.status === fs) && (!fn || a.nivel === fn));
    el('resumo').textContent = `${lista.length} de ${linhas.length} aluno(s)`;

    if (!lista.length) {
      tabela.innerHTML = `<tr><td colspan="8" class="px-6 py-14 text-center text-slate-400">${linhas.length ? 'Nenhum aluno com esses filtros.' : 'Nenhum aluno cadastrado ainda.'}</td></tr>`;
      return;
    }

    tabela.innerHTML = lista.map((a, i) => {
      const s = STATUS[a.status];
      return `
      <tr class="row-in hover:bg-slate-50/80 transition" style="animation-delay:${Math.min(i, 10) * 40}ms">
        <td class="px-5 py-4">
          <div class="flex items-center gap-3">
            <span class="w-9 h-9 shrink-0 rounded-full ${a.nivel ? 'bg-navy-900' : 'bg-slate-300'} text-white grid place-items-center text-xs font-bold">${App.escapar(iniciais(a.nome))}</span>
            <div class="min-w-0">
              <p class="font-semibold text-navy-900 truncate">${App.escapar(a.nome)}</p>
              <p class="text-xs text-slate-400 truncate">${App.escapar(a.email)}</p>
            </div>
          </div>
        </td>
        <td class="px-5 py-4">${a.nivel_num
          ? `<span class="inline-flex items-center gap-2"><span class="w-8 h-8 rounded-lg ${FAIXAS[a.nivel].cor} text-white grid place-items-center text-xs font-bold">${a.nivel_num}</span><span class="text-xs"><b class="text-navy-900">${a.nivel}</b><br /><span class="text-slate-400">${a.xp} XP</span></span></span>`
          : '<span class="text-xs text-slate-400">—</span>'}</td>
        <td class="px-5 py-4 text-slate-600">${a.licoes} <span class="text-xs text-slate-400">· ${a.certs} cert.</span></td>
        <td class="px-5 py-4">
          <div class="flex items-center gap-2">
            <div class="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden"><div class="h-full ${a.est.semana >= a.meta_semanal ? 'bg-emerald-500' : 'bg-amber-500'}" style="width:${Math.min(100, (a.est.semana / a.meta_semanal) * 100)}%"></div></div>
            <span class="text-xs text-slate-500">${a.est.semana}/${a.meta_semanal}</span>
          </div>
        </td>
        <td class="px-5 py-4 text-slate-500 text-xs">${relativo(a.est.ultima)}</td>
        <td class="px-5 py-4"><span class="inline-flex items-center gap-1.5 ${s.cor} text-xs font-semibold px-3 py-1 rounded-full whitespace-nowrap"><span class="w-1.5 h-1.5 rounded-full ${s.ponto}"></span>${a.status}</span></td>
        <td class="px-5 py-4"><span data-plano="${a.id}" class="inline-block ${a.plano.cls} text-xs font-semibold px-3 py-1 rounded-full whitespace-nowrap" title="${a.plano.ate ? `até ${dataBR(a.plano.ate)}` : ''}">${a.plano.nome}</span></td>
        <td class="px-5 py-4 text-right whitespace-nowrap">
          ${a.plano.pagante ? '' : `<button data-cortesia="${a.id}" data-nome="${App.escapar(a.nome)}" data-tem="${a.plano.cortesia ? 1 : ''}" class="inline-flex items-center gap-1.5 border border-slate-300 hover:border-navy-900 text-navy-900 text-xs font-semibold px-3 py-2 rounded-lg transition active:scale-95 mr-1" title="Liberar ou retirar o acesso sem cobrança">${Icone('estrela', 'w-3.5 h-3.5')}${a.plano.cortesia ? 'Tirar cortesia' : 'Cortesia'}</button>`}
          <button data-aparelhos="${a.id}" data-nome="${App.escapar(a.nome)}" class="inline-flex items-center gap-1.5 border border-slate-300 hover:border-navy-900 text-navy-900 text-xs font-semibold px-3 py-2 rounded-lg transition active:scale-95 mr-1" title="Aparelhos conectados (limite de 4). Clique para liberar todos.">${Icone('celular', 'w-3.5 h-3.5')}${a.aparelhos}/4</button>
          <button data-senha="${a.id}" data-nome="${App.escapar(a.nome)}" class="inline-flex items-center gap-1.5 border border-slate-300 hover:border-navy-900 text-navy-900 text-xs font-semibold px-3 py-2 rounded-lg transition active:scale-95 mr-1" title="Gerar uma senha provisória para quem esqueceu a senha">${Icone('chave', 'w-3.5 h-3.5')}Senha</button>
          ${a.nivel_num
            ? `<button data-liberar="${a.id}" data-nome="${App.escapar(a.nome)}" class="inline-flex items-center gap-1.5 border border-slate-300 hover:border-navy-900 text-navy-900 text-xs font-semibold px-3 py-2 rounded-lg transition active:scale-95 whitespace-nowrap" title="Prova feita em ${dataBR(a.prova_feita_em)}">↻ Nova prova</button>`
            : '<span class="text-xs text-slate-400">aguardando prova</span>'}
        </td>
      </tr>`;
    }).join('');

    tabela.querySelectorAll('[data-liberar]').forEach((b) => b.addEventListener('click', () => liberar(b)));
    tabela.querySelectorAll('[data-senha]').forEach((b) => b.addEventListener('click', () => senhaProvisoria(b)));
    tabela.querySelectorAll('[data-cortesia]').forEach((b) => b.addEventListener('click', () => cortesia(b)));
    tabela.querySelectorAll('[data-aparelhos]').forEach((b) => b.addEventListener('click', () => liberarAparelhos(b)));
  }

  async function carregar() {
    const [al, pr, ce, se, as, di] = await Promise.all([
      sb.from('alunos').select('*').order('criado_em', { ascending: false }),
      sb.from('progresso').select('*'),
      sb.from('certificados').select('*'),
      sb.from('sessoes_revisao').select('aluno_id, feita_em'),
      sb.from('assinaturas').select('*'),
      sb.from('dispositivos').select('aluno_id'),
    ]);
    if (al.error || pr.error || ce.error) throw al.error || pr.error || ce.error;
    linhas = montarLinhas(al.data, pr.data, ce.data, se.error ? [] : se.data, as.error ? [] : as.data, di.error ? [] : di.data);
    renderizar();
  }

  async function atualizar() {
    const icone = el('iconeAtualizar');
    icone.classList.add('spin-slow');
    try { await carregar(); } catch { App.toast('Não foi possível atualizar a lista.'); }
    finally { icone.classList.remove('spin-slow'); }
  }

  async function liberar(btn) {
    if (!confirm(`Liberar uma nova prova de nivelamento para ${btn.dataset.nome}?\nO nível atual será apagado e o aluno fará a prova de novo no próximo acesso. Lições e certificados já conquistados continuam salvos.`)) return;
    btn.disabled = true;
    const { error } = await sb.rpc('liberar_nova_prova', { aluno_id: btn.dataset.liberar });
    if (error) { btn.disabled = false; return App.toast('Não foi possível liberar. Tente de novo.'); }
    App.toast(`Nova prova liberada para ${btn.dataset.nome}`);
    atualizar();
  }

  // Acesso de cortesia (bolsa, parceria, teste): 30 dias por padrão
  async function cortesia(btn) {
    const tirar = !!btn.dataset.tem;
    let dias = 0;
    if (!tirar) {
      const r = prompt(`Liberar o acesso de ${btn.dataset.nome} sem cobrança.\nPor quantos dias?`, '30');
      if (r === null) return;
      dias = parseInt(r, 10);
      if (!(dias > 0)) return App.toast('Informe um número de dias.');
    } else if (!confirm(`Retirar a cortesia de ${btn.dataset.nome}? O aluno fica sem acesso às lições até assinar.`)) return;
    btn.disabled = true;
    const { error } = await sb.rpc('admin_cortesia', { p_aluno: btn.dataset.cortesia, p_dias: dias });
    if (error) { btn.disabled = false; return App.toast('Não foi possível alterar o plano. Tente de novo.'); }
    App.toast(tirar ? 'Cortesia retirada.' : `Acesso liberado por ${dias} dias.`);
    atualizar();
  }

  // Aluno trocou de aparelhos e ficou sem vagas: o professor libera todas
  async function liberarAparelhos(btn) {
    if (!confirm(`Desconectar todos os aparelhos de ${btn.dataset.nome}?\nO aluno volta a ter as 4 vagas e entra de novo em cada aparelho que usar.`)) return;
    btn.disabled = true;
    const { error } = await sb.rpc('admin_limpar_dispositivos', { p_aluno: btn.dataset.aparelhos });
    if (error) { btn.disabled = false; return App.toast('Não foi possível liberar os aparelhos.'); }
    App.toast('Aparelhos liberados.');
    atualizar();
  }

  // Aluno esqueceu a senha e o e-mail não chegou: o professor gera uma senha provisória
  async function senhaProvisoria(btn) {
    if (!confirm(`Gerar uma senha provisória para ${btn.dataset.nome}?\nA senha atual deixa de funcionar. Entregue a nova senha ao aluno e peça para ele trocá-la em "Meu perfil".`)) return;
    btn.disabled = true;
    const { data, error } = await sb.rpc('admin_redefinir_senha', { p_aluno: btn.dataset.senha });
    btn.disabled = false;
    if (error) return App.toast('Não foi possível gerar a senha. Tente de novo.');
    const caixa = document.createElement('div');
    caixa.id = 'modalSenha';
    caixa.className = 'fixed inset-0 z-[90] bg-navy-900/60 grid place-items-center p-5';
    caixa.innerHTML = `
      <div class="anim-pop bg-white rounded-3xl shadow-card max-w-sm w-full p-7 text-center">
        <span class="w-12 h-12 mx-auto rounded-2xl bg-navy-900 text-white grid place-items-center">${Icone('chave', 'w-6 h-6')}</span>
        <h3 class="mt-4 font-display text-xl font-bold text-navy-900">Senha provisória</h3>
        <p class="mt-1 text-sm text-slate-500">Para <b>${btn.dataset.nome}</b>. Ela só aparece agora.</p>
        <p id="senhaGerada" class="mt-5 font-mono text-2xl font-bold tracking-wider text-navy-900 bg-slate-100 rounded-xl py-3 select-all">${App.escapar(data)}</p>
        <div class="mt-5 grid grid-cols-2 gap-3">
          <button data-copiar class="font-semibold bg-navy-900 hover:bg-navy-800 text-white rounded-xl py-3 transition">Copiar</button>
          <button data-fechar class="font-semibold border border-slate-200 hover:border-navy-900 text-navy-900 rounded-xl py-3 transition">Fechar</button>
        </div>
      </div>`;
    document.body.appendChild(caixa);
    caixa.querySelector('[data-fechar]').addEventListener('click', () => caixa.remove());
    caixa.querySelector('[data-copiar]').addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(data); App.toast('Senha copiada'); } catch { App.toast('Selecione a senha e copie'); }
    });
  }

  el('btnAtualizar').addEventListener('click', atualizar);
  el('busca').addEventListener('input', renderizar);
  el('filtroStatus').addEventListener('change', renderizar);
  el('filtroNivel').addEventListener('change', renderizar);

  App.registrar('admin', {
    async iniciar() {
      const p = await App.perfil();
      if (!p) { location.hash = '#/entrar'; return false; }
      if (p.papel !== 'admin') { location.hash = App.destino(p); return false; }
      App.carregando(true);
      try { await carregar(); } finally { App.carregando(false); }
    },
  });
})();
