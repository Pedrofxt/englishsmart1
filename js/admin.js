// admin.js — Portal do professor: acompanhamento por status, nível, lições e atividade recente

(() => {
  const el = (id) => document.getElementById(id);
  const tabela = el('tabelaAlunos');
  let linhas = [];
  let base = { turmas: [], assinaturas: [], alunos: [] }; // dados compartilhados entre as abas

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
    const r = planoBase(a);
    if (r.pagante && a.plano === 'anual') { r.nome += ' · anual'; r.anual = true; }
    return r;
  }
  function planoBase(a) {
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
        turma: base.turmas.find((t) => t.id === a.turma_id)?.nome || '',
        status: calcularStatus(a, est),
      };
    });
  }

  function cartoes() {
    const contar = (s) => linhas.filter((l) => l.status === s).length;
    const pagantes = linhas.filter((l) => l.plano.pagante).length;
    el('cartoesPlano').innerHTML = `
      <div class="bg-white rounded-2xl p-5 border border-slate-200"><p class="text-sm text-slate-500">Assinantes</p><p id="numAssinantes" class="mt-1 font-display text-4xl font-extrabold text-amber-600">${pagantes}</p></div>
      <div class="bg-white rounded-2xl p-5 border border-slate-200"><p class="text-sm text-slate-500">Receita mensal estimada</p><p id="numReceita" class="mt-1 font-display text-4xl font-extrabold text-navy-900">${precoBR(linhas.filter((l) => l.plano.pagante).reduce((t, l) => t + (l.plano.anual ? PLANO_ANUAL.preco / 12 : PLANO.preco), 0))}</p></div>
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

  function filtrados() {
    const termo = el('busca').value.trim().toLowerCase();
    const fs = el('filtroStatus').value;
    const fn = el('filtroNivel').value;
    const ft = el('filtroTurma').value;
    return linhas.filter((a) =>
      (!termo || a.nome.toLowerCase().includes(termo) || a.email.includes(termo)) &&
      (!fs || a.status === fs) && (!fn || a.nivel === fn) && (!ft || (ft === '-' ? !a.turma_id : a.turma_id === ft)));
  }

  function renderizar() {
    cartoes();
    const lista = filtrados();
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
              <p class="text-xs text-slate-400 truncate">${App.escapar(a.email)}${a.turma ? ` · <span class="text-navy-600">${App.escapar(a.turma)}</span>` : ''}</p>
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
    const [al, pr, ce, se, as, di, tu] = await Promise.all([
      sb.from('alunos').select('*').order('criado_em', { ascending: false }),
      sb.from('progresso').select('*'),
      sb.from('certificados').select('*'),
      sb.from('sessoes_revisao').select('aluno_id, feita_em'),
      sb.from('assinaturas').select('*'),
      sb.from('dispositivos').select('aluno_id'),
      sb.from('turmas').select('*').order('criada_em'),
    ]);
    if (al.error || pr.error || ce.error) throw al.error || pr.error || ce.error;
    base = { turmas: tu.error ? [] : tu.data, assinaturas: as.error ? [] : as.data, alunos: al.data };
    const sel = el('filtroTurma');
    const escolhida = sel.value;
    sel.innerHTML = '<option value="">Todas as turmas</option><option value="-">Sem turma</option>' + base.turmas.map((t) => `<option value="${t.id}">${App.escapar(t.nome)}</option>`).join('');
    sel.value = [...sel.options].some((o) => o.value === escolhida) ? escolhida : '';
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
  el('filtroTurma').addEventListener('change', renderizar);
  el('btnCsvAlunos').addEventListener('click', () => {
    const lista = filtrados();
    baixarCsv(`alunos-english-smart-${hojeArquivo()}.csv`,
      ['Nome', 'E-mail', 'Telefone', 'Cidade', 'Turma', 'Nível', 'Estágio', 'XP', 'Lições concluídas', 'Certificados', 'Atividades (7 dias)', 'Meta semanal', 'Última atividade', 'Status', 'Plano', 'Acesso até', 'Cadastro'],
      lista.map((a) => [a.nome, a.email, a.telefone || '', a.cidade || '', a.turma, a.nivel_num || '', a.nivel || '', a.xp, a.licoes, a.certs, a.est.semana, a.meta_semanal,
        a.est.ultima ? new Date(a.est.ultima).toLocaleDateString('pt-BR') : '', a.status, a.plano.nome, a.plano.ate ? dataBR(a.plano.ate) : '', dataBR(a.criado_em)]));
  });

  // ---------- CSV (abre direto no Excel em português: separador ; e acentos em UTF-8) ----------
  const hojeArquivo = () => new Date().toISOString().slice(0, 10);
  function baixarCsv(nome, cabecalho, dados) {
    const celula = (v) => { const t = String(v ?? ''); return /[";\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t; };
    const texto = '\ufeff' + [cabecalho, ...dados].map((l) => l.map(celula).join(';')).join('\r\n');
    const url = URL.createObjectURL(new Blob([texto], { type: 'text/csv;charset=utf-8' }));
    const a = Object.assign(document.createElement('a'), { href: url, download: nome });
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    App.toast(`${dados.length} linha(s) exportada(s).`);
  }

  // ---------- Abas do portal ----------
  let abaAtual = 'alunos';
  function abrirAba(aba) {
    abaAtual = aba;
    document.querySelectorAll('#abasAdmin [data-aba]').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.aba === aba)));
    document.querySelectorAll('[data-view="admin"] [data-painel]').forEach((p) => p.classList.toggle('hidden', p.dataset.painel !== aba));
    const fazer = { financeiro: painelFinanceiro, turmas: painelTurmas, erros: painelErros, config: painelConfig }[aba];
    fazer?.().catch((err) => { console.error(err); App.toast(App.mensagemDeErro(err)); });
  }
  document.querySelectorAll('#abasAdmin [data-aba]').forEach((b) => b.addEventListener('click', () => {
    history.replaceState(null, '', b.dataset.aba === 'alunos' ? '#/admin' : `#/admin?aba=${b.dataset.aba}`);
    abrirAba(b.dataset.aba);
  }));

  const cartao = (rotulo, valor, extra = '', id = '') => `<div class="bg-white rounded-2xl p-5 border border-slate-200"><p class="text-sm text-slate-500">${rotulo}</p><p ${id ? `id="${id}"` : ''} class="mt-1 font-display text-3xl font-extrabold text-navy-900">${valor}</p>${extra ? `<p class="text-[11px] text-slate-400 mt-0.5">${extra}</p>` : ''}</div>`;
  const nomeDe = (id) => base.alunos.find((a) => a.id === id)?.nome || '—';
  const inicioMes = (d = new Date(), voltar = 0) => new Date(d.getFullYear(), d.getMonth() - voltar, 1).getTime();

  // ---------- Financeiro ----------
  async function painelFinanceiro() {
    const raiz = el('painelFinanceiro');
    raiz.innerHTML = '<p class="text-slate-400">Carregando…</p>';
    const { data: pags, error } = await sb.from('pagamentos').select('*').order('criado_em', { ascending: false });
    if (error) throw error;
    const aprovados = (pags || []).filter((p) => p.status === 'aprovado');
    const quando = (p) => new Date(p.pago_em || p.criado_em).getTime();
    const esteMes = inicioMes();
    const doMes = aprovados.filter((p) => quando(p) >= esteMes);
    const mesPassado = aprovados.filter((p) => quando(p) >= inicioMes(new Date(), 1) && quando(p) < esteMes);
    const soma = (l) => l.reduce((s, p) => s + Number(p.valor || 0), 0);
    const primeiro = new Map();
    [...aprovados].sort((a, b) => quando(a) - quando(b)).forEach((p) => { if (!primeiro.has(p.aluno_id)) primeiro.set(p.aluno_id, quando(p)); });
    const novos = [...primeiro.values()].filter((t) => t >= esteMes).length;
    const cancelados = base.assinaturas.filter((a) => a.status === 'cancelada' && new Date(a.atualizada_em).getTime() >= esteMes).length;
    const agora = Date.now();
    const vencem = base.assinaturas.filter((a) => a.status !== 'ativa' && a.pago_ate)
      .map((a) => ({ ...a, vence: new Date(a.pago_ate).getTime() - 3 * 864e5 }))
      .filter((a) => a.vence > agora - 864e5 && a.vence <= agora + 7 * 864e5)
      .sort((a, b) => a.vence - b.vence);
    // Renovação no Pix: dos alunos que pagaram Pix há mais de 30 dias, quantos pagaram de novo
    const pixPorAluno = new Map();
    aprovados.filter((p) => p.metodo === 'pix').forEach((p) => pixPorAluno.set(p.aluno_id, [...(pixPorAluno.get(p.aluno_id) || []), quando(p)]));
    const elegiveis = [...pixPorAluno.values()].filter((l) => Math.min(...l) < agora - 30 * 864e5);
    const renovaram = elegiveis.filter((l) => l.length >= 2).length;
    const ativosCartao = base.assinaturas.filter((a) => a.status === 'ativa' && a.pago_ate && new Date(a.pago_ate) > agora);
    const mrr = ativosCartao.reduce((s, a) => s + (a.plano === 'anual' ? Number(a.valor || PLANO_ANUAL.preco) / 12 : Number(a.valor || PLANO.preco)), 0);
    const meses = Array.from({ length: 6 }, (_, i) => {
      const ini = inicioMes(new Date(), 5 - i);
      const fim = inicioMes(new Date(), 4 - i);
      return { rotulo: new Date(ini).toLocaleDateString('pt-BR', { month: 'short' }).replace('.', ''), valor: soma(aprovados.filter((p) => quando(p) >= ini && quando(p) < fim)) };
    });
    const maior = Math.max(1, ...meses.map((m) => m.valor));
    const variacao = soma(mesPassado) ? Math.round(((soma(doMes) - soma(mesPassado)) / soma(mesPassado)) * 100) : null;

    raiz.innerHTML = `
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
        ${cartao('Receita do mês', precoBR(soma(doMes)), `${doMes.length} pagamento(s)${variacao !== null ? ` · ${variacao >= 0 ? '+' : ''}${variacao}% vs. mês passado` : ''}`, 'finReceitaMes')}
        ${cartao('Receita recorrente (cartão)', precoBR(mrr), `${ativosCartao.length} assinatura(s) no cartão, por mês`)}
        ${cartao('Novos assinantes no mês', novos, 'primeiro pagamento aprovado', 'finNovos')}
        ${cartao('Cancelamentos no mês', cancelados, 'assinaturas de cartão canceladas')}
        ${cartao('Vencem nesta semana', vencem.length, 'Pix, cortesia ou cartão cancelado', 'finVencem')}
        ${cartao('Renovação no Pix', elegiveis.length ? `${Math.round((renovaram / elegiveis.length) * 100)}%` : '—', elegiveis.length ? `${renovaram} de ${elegiveis.length} pagaram de novo` : 'ainda sem dados (30 dias)')}
        ${cartao('Receita total', precoBR(soma(aprovados)), `${aprovados.length} pagamento(s) aprovado(s)`)}
        ${cartao('Ticket médio', aprovados.length ? precoBR(soma(aprovados) / aprovados.length) : '—')}
      </div>
      <div class="mt-5 grid lg:grid-cols-3 gap-5">
        <section class="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6">
          <h3 class="font-display font-bold text-navy-900">Receita dos últimos 6 meses</h3>
          <div class="mt-6 h-48 flex items-end gap-3">
            ${meses.map((m) => `<div class="flex-1 h-full flex flex-col justify-end items-center gap-2">
              <span class="text-[11px] font-semibold text-slate-500">${m.valor ? precoBR(m.valor).replace(',00', '') : ''}</span>
              <div class="w-full rounded-t-lg bg-navy-600" style="height:${Math.max(2, (m.valor / maior) * 100)}%"></div>
              <span class="text-xs text-slate-400 capitalize">${m.rotulo}</span></div>`).join('')}
          </div>
        </section>
        <section class="bg-white rounded-2xl border border-slate-200 p-6">
          <h3 class="font-display font-bold text-navy-900">Vencem nos próximos 7 dias</h3>
          ${vencem.length ? `<ul class="mt-3 divide-y divide-slate-100 text-sm">${vencem.slice(0, 12).map((a) => `<li class="py-2 flex justify-between gap-3"><span class="truncate text-navy-900">${App.escapar(nomeDe(a.aluno_id))}</span><span class="shrink-0 text-slate-500">${dataBR(a.vence)}</span></li>`).join('')}</ul>
            <p class="mt-3 text-xs text-slate-400">Eles recebem lembrete por e-mail 3 dias antes, 1 dia antes e no vencimento (se o Resend estiver configurado).</p>`
          : '<p class="mt-3 text-sm text-slate-500">Ninguém vence nesta semana.</p>'}
        </section>
      </div>
      <section class="mt-5 bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div class="p-5 flex items-center justify-between gap-3 border-b border-slate-100">
          <h3 class="font-display font-bold text-navy-900">Pagamentos</h3>
          <button id="btnCsvPagamentos" class="inline-flex items-center gap-1.5 border border-slate-300 hover:border-navy-900 px-3 py-2 rounded-xl text-sm font-semibold text-navy-900 transition">${Icone('baixar', 'w-4 h-4')}CSV</button>
        </div>
        <div class="overflow-x-auto"><table class="w-full text-left text-sm">
          <thead class="bg-slate-50 text-slate-400 uppercase text-xs tracking-wider"><tr><th class="px-5 py-3">Data</th><th class="px-5 py-3">Aluno</th><th class="px-5 py-3">Método</th><th class="px-5 py-3">Plano</th><th class="px-5 py-3">Valor</th><th class="px-5 py-3">Status</th></tr></thead>
          <tbody class="divide-y divide-slate-100">${(pags || []).filter((p) => p.status !== 'pendente' && p.status !== 'expirado').slice(0, 30).map((p) => `
            <tr><td class="px-5 py-3 text-slate-500">${dataBR(p.pago_em || p.criado_em)}</td><td class="px-5 py-3 text-navy-900">${App.escapar(nomeDe(p.aluno_id))}</td>
            <td class="px-5 py-3">${p.metodo === 'pix' ? 'Pix' : 'Cartão'}</td><td class="px-5 py-3">${p.plano === 'anual' ? 'Anual' : 'Mensal'}${p.cupom ? ` · ${App.escapar(p.cupom)}` : ''}</td>
            <td class="px-5 py-3 font-semibold text-navy-900">${precoBR(Number(p.valor))}</td><td class="px-5 py-3 ${p.status === 'aprovado' ? 'text-emerald-700' : 'text-amber-700'}">${App.escapar(p.status)}</td></tr>`).join('') || '<tr><td colspan="6" class="px-5 py-10 text-center text-slate-400">Nenhum pagamento ainda.</td></tr>'}</tbody>
        </table></div>
      </section>`;
    el('btnCsvPagamentos').addEventListener('click', () => baixarCsv(`pagamentos-english-smart-${hojeArquivo()}.csv`,
      ['Data', 'Aluno', 'E-mail', 'Método', 'Plano', 'Cupom', 'Valor', 'Status', 'ID Mercado Pago'],
      (pags || []).map((p) => [dataBR(p.pago_em || p.criado_em), nomeDe(p.aluno_id), base.alunos.find((a) => a.id === p.aluno_id)?.email || '', p.metodo === 'pix' ? 'Pix' : 'Cartão', p.plano || 'mensal', p.cupom || '', Number(p.valor).toFixed(2).replace('.', ','), p.status, p.id])));
  }

  // ---------- Turmas e cupons ----------
  const linkConvite = (codigo) => `${location.protocol === 'https:' ? location.origin + location.pathname : SITE_URL + '/'}#/cadastro?turma=${codigo}`;
  async function painelTurmas() {
    const raiz = el('painelTurmas');
    const { data: cupons } = await sb.from('cupons').select('*').order('criado_em', { ascending: false });
    raiz.innerHTML = `
      <div class="grid lg:grid-cols-2 gap-5">
        <section class="bg-white rounded-2xl border border-slate-200 p-6">
          <h3 class="font-display font-bold text-navy-900 inline-flex items-center gap-2">${Icone('grupo', 'w-5 h-5')}Turmas</h3>
          <p class="mt-1 text-sm text-slate-500">Crie uma turma e envie o link (ou o código) para os alunos. Depois filtre a lista de alunos por turma.</p>
          <form id="formTurmaAdmin" class="mt-4 flex gap-2" novalidate>
            <input id="nomeTurmaNova" maxlength="60" placeholder="Nome da turma (ex.: Manhã 2027)" class="campo" />
            <button class="shrink-0 font-semibold bg-navy-900 hover:bg-navy-800 text-white rounded-xl px-5 transition">Criar</button>
          </form>
          <ul id="listaTurmas" class="mt-4 divide-y divide-slate-100">
            ${base.turmas.map((t) => {
              const qtd = base.alunos.filter((a) => a.turma_id === t.id).length;
              return `<li class="py-3 flex flex-col sm:flex-row sm:items-center gap-2">
                <span class="flex-1 min-w-0"><b class="text-navy-900">${App.escapar(t.nome)}</b> <span class="text-xs text-slate-400">· ${qtd} aluno(s)</span><span class="block text-xs text-slate-500">Código: <b class="font-mono text-navy-900">${App.escapar(t.codigo)}</b></span></span>
                <span class="flex gap-2 shrink-0">
                  <button data-copiar-turma="${App.escapar(t.codigo)}" class="text-xs font-semibold border border-slate-300 hover:border-navy-900 text-navy-900 rounded-lg px-3 py-2 transition">Copiar link</button>
                  <button data-ver-turma="${t.id}" class="text-xs font-semibold border border-slate-300 hover:border-navy-900 text-navy-900 rounded-lg px-3 py-2 transition">Ver alunos</button>
                  <button data-excluir-turma="${t.id}" data-nome="${App.escapar(t.nome)}" class="text-xs font-semibold border border-slate-300 hover:border-red-300 hover:text-red-700 text-slate-500 rounded-lg px-3 py-2 transition">Excluir</button>
                </span></li>`;
            }).join('') || '<li class="py-3 text-sm text-slate-400">Nenhuma turma criada.</li>'}
          </ul>
        </section>
        <section class="bg-white rounded-2xl border border-slate-200 p-6">
          <h3 class="font-display font-bold text-navy-900 inline-flex items-center gap-2">${Icone('cupom', 'w-5 h-5')}Cupons de desconto</h3>
          <p class="mt-1 text-sm text-slate-500">Valem para pagamentos com Pix (mensal ou anual). O aluno digita o código na tela de assinatura.</p>
          <form id="formCupom" class="mt-4 grid grid-cols-2 gap-2" novalidate>
            <input id="cupomCodigo" maxlength="20" placeholder="CÓDIGO" class="campo uppercase font-mono col-span-2" />
            <label class="text-xs text-slate-500">Desconto (%)<input id="cupomDesconto" type="number" min="1" max="100" value="10" class="campo mt-1" /></label>
            <label class="text-xs text-slate-500">Limite de usos<input id="cupomUsos" type="number" min="1" placeholder="sem limite" class="campo mt-1" /></label>
            <label class="text-xs text-slate-500 col-span-2">Válido até (opcional)<input id="cupomValidade" type="date" class="campo mt-1" /></label>
            <button class="col-span-2 font-semibold bg-navy-900 hover:bg-navy-800 text-white rounded-xl py-3 transition">Salvar cupom</button>
          </form>
          <ul id="listaCupons" class="mt-4 divide-y divide-slate-100">
            ${(cupons || []).map((c) => {
              const vencido = c.valido_ate && new Date(c.valido_ate) < new Date();
              const esgotado = c.usos_max && c.usos >= c.usos_max;
              return `<li class="py-3 flex items-center gap-3">
                <span class="flex-1 min-w-0"><b class="font-mono text-navy-900">${App.escapar(c.codigo)}</b> <span class="text-sm font-semibold text-emerald-700">-${c.desconto}%</span>
                  <span class="block text-xs text-slate-400">${c.usos} uso(s)${c.usos_max ? ` de ${c.usos_max}` : ''}${c.valido_ate ? ` · até ${dataBR(c.valido_ate)}` : ''}${!c.ativo ? ' · <b class="text-slate-500">pausado</b>' : vencido ? ' · <b class="text-amber-700">vencido</b>' : esgotado ? ' · <b class="text-amber-700">esgotado</b>' : ''}</span></span>
                <button data-pausar-cupom="${App.escapar(c.codigo)}" class="text-xs font-semibold border border-slate-300 hover:border-navy-900 text-navy-900 rounded-lg px-3 py-2 transition">${c.ativo ? 'Pausar' : 'Ativar'}</button>
                <button data-excluir-cupom="${App.escapar(c.codigo)}" class="text-xs font-semibold border border-slate-300 hover:border-red-300 hover:text-red-700 text-slate-500 rounded-lg px-3 py-2 transition">Excluir</button></li>`;
            }).join('') || '<li class="py-3 text-sm text-slate-400">Nenhum cupom criado.</li>'}
          </ul>
        </section>
      </div>`;
    el('formTurmaAdmin').addEventListener('submit', async (e) => {
      e.preventDefault();
      const nome = el('nomeTurmaNova').value.trim();
      if (nome.length < 2) return App.toast('Dê um nome à turma.');
      const { data: codigo, error } = await sb.rpc('admin_salvar_turma', { p_nome: nome });
      if (error) return App.toast(App.mensagemDeErro(error));
      App.toast(`Turma criada. Código: ${codigo}`);
      await carregar(); painelTurmas();
    });
    raiz.querySelectorAll('[data-copiar-turma]').forEach((b) => b.addEventListener('click', async () => {
      const link = linkConvite(b.dataset.copiarTurma);
      try { await navigator.clipboard.writeText(link); App.toast('Link da turma copiado.'); } catch { prompt('Copie o link da turma:', link); }
    }));
    raiz.querySelectorAll('[data-ver-turma]').forEach((b) => b.addEventListener('click', () => {
      el('filtroTurma').value = b.dataset.verTurma; history.replaceState(null, '', '#/admin'); abrirAba('alunos'); renderizar();
    }));
    raiz.querySelectorAll('[data-excluir-turma]').forEach((b) => b.addEventListener('click', async () => {
      if (!confirm(`Excluir a turma "${b.dataset.nome}"? Os alunos continuam com as contas, só saem da turma.`)) return;
      const { error } = await sb.rpc('admin_excluir_turma', { p_id: b.dataset.excluirTurma });
      if (error) return App.toast(App.mensagemDeErro(error));
      await carregar(); painelTurmas();
    }));
    const salvarCupom = async (c) => {
      const { error } = await sb.rpc('admin_salvar_cupom', { p_codigo: c.codigo, p_desconto: c.desconto, p_valido_ate: c.valido_ate || null, p_usos_max: c.usos_max || null, p_ativo: c.ativo });
      if (error) { App.toast(error.message || App.mensagemDeErro(error)); return false; }
      return true;
    };
    el('formCupom').addEventListener('submit', async (e) => {
      e.preventDefault();
      const codigo = el('cupomCodigo').value.trim().toUpperCase();
      const desconto = parseInt(el('cupomDesconto').value, 10);
      if (!/^[A-Z0-9]{3,20}$/.test(codigo)) return App.toast('Código: de 3 a 20 letras e números, sem espaços.');
      if (!(desconto >= 1 && desconto <= 100)) return App.toast('Desconto entre 1% e 100%.');
      const validade = el('cupomValidade').value;
      const ok = await salvarCupom({ codigo, desconto, usos_max: parseInt(el('cupomUsos').value, 10) || null, valido_ate: validade ? new Date(`${validade}T23:59:59-03:00`).toISOString() : null, ativo: true });
      if (ok) { App.toast(`Cupom ${codigo} salvo.`); painelTurmas(); }
    });
    raiz.querySelectorAll('[data-pausar-cupom]').forEach((b) => b.addEventListener('click', async () => {
      const c = (cupons || []).find((x) => x.codigo === b.dataset.pausarCupom);
      if (c && await salvarCupom({ ...c, ativo: !c.ativo })) painelTurmas();
    }));
    raiz.querySelectorAll('[data-excluir-cupom]').forEach((b) => b.addEventListener('click', async () => {
      if (!confirm(`Excluir o cupom ${b.dataset.excluirCupom}?`)) return;
      const { error } = await sb.rpc('admin_excluir_cupom', { p_codigo: b.dataset.excluirCupom });
      if (error) return App.toast(App.mensagemDeErro(error));
      painelTurmas();
    }));
  }

  // ---------- Erros mais comuns (a partir da revisão inteligente) ----------
  async function painelErros() {
    const raiz = el('painelErros');
    raiz.innerHTML = '<p class="text-slate-400">Carregando…</p>';
    const { data, error } = await sb.from('revisao').select('item, nivel_num, acertos, erros, aluno_id').gt('erros', 0);
    if (error) throw error;
    const porItem = new Map();
    (data || []).forEach((r) => {
      const x = porItem.get(r.item) || { item: r.item, nivel: r.nivel_num, erros: 0, acertos: 0, alunos: new Set() };
      x.erros += r.erros; x.acertos += r.acertos; x.alunos.add(r.aluno_id);
      porItem.set(r.item, x);
    });
    const fn = raiz.dataset.faixa || '';
    const lista = [...porItem.values()].filter((x) => !fn || faixaDoNivel(x.nivel) === fn)
      .sort((a, b) => b.alunos.size - a.alunos.size || b.erros - a.erros).slice(0, 25);
    const TIPO = { v: 'Vocabulário', e: 'Gramática', d: 'Diálogo' };
    const texto = (it) => {
      if (!it) return '—';
      if (it.tipo === 'v') return `<b>${App.escapar(it.dado[0])}</b> <span class="text-slate-400">— ${App.escapar(it.dado[1])}</span>`;
      if (it.tipo === 'e') { const [frase, certa] = String(it.dado).split('|'); return `${App.escapar(frase).replace('___', `<b class="text-brand-red">${App.escapar(certa)}</b>`)}`; }
      return `<span class="text-slate-400">${App.escapar(it.dado[0])}:</span> ${App.escapar(it.dado[1])}`;
    };
    raiz.innerHTML = `
      <section class="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div class="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100">
          <div><h3 class="font-display font-bold text-navy-900">Onde os alunos mais erram</h3>
          <p class="text-sm text-slate-500">Palavras, frases e falas com mais erros nas lições e na revisão. Bom para planejar aulas de reforço.</p></div>
          <select id="filtroErrosFaixa" class="border border-slate-300 rounded-xl px-3 py-2 text-sm"><option value="">Todos os estágios</option>${Object.keys(FAIXAS).map((k) => `<option ${k === fn ? 'selected' : ''}>${k}</option>`).join('')}</select>
        </div>
        <div class="overflow-x-auto"><table class="w-full text-left text-sm">
          <thead class="bg-slate-50 text-slate-400 uppercase text-xs tracking-wider"><tr><th class="px-5 py-3">Conteúdo</th><th class="px-5 py-3">Onde</th><th class="px-5 py-3">Alunos que erraram</th><th class="px-5 py-3">Taxa de erro</th></tr></thead>
          <tbody id="tabelaErros" class="divide-y divide-slate-100">${lista.map((x) => {
            const it = Atividades.lerChave(x.item);
            const taxa = Math.round((x.erros / Math.max(1, x.erros + x.acertos)) * 100);
            return `<tr><td class="px-5 py-3 text-navy-900">${texto(it)}</td>
              <td class="px-5 py-3 text-xs text-slate-500 whitespace-nowrap">${TIPO[it?.tipo] || ''} · Nível ${x.nivel}${it ? `, lição ${it.l}` : ''}</td>
              <td class="px-5 py-3 font-semibold text-navy-900">${x.alunos.size}</td>
              <td class="px-5 py-3"><span class="inline-flex items-center gap-2"><span class="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden"><span class="block h-full ${taxa >= 50 ? 'bg-brand-red' : 'bg-amber-500'}" style="width:${taxa}%"></span></span><span class="text-xs text-slate-500">${taxa}%</span></span></td></tr>`;
          }).join('') || '<tr><td colspan="4" class="px-5 py-10 text-center text-slate-400">Ainda não há erros registrados.</td></tr>'}</tbody>
        </table></div>
      </section>`;
    el('filtroErrosFaixa').addEventListener('change', (e) => { raiz.dataset.faixa = e.target.value; painelErros(); });
  }

  // ---------- Configuração: o que falta para lançar ----------
  const PROJETO = SUPABASE_URL.match(/https:\/\/([a-z0-9]+)\./)?.[1] || '';
  const painelSupabase = (caminho) => `https://supabase.com/dashboard/project/${PROJETO}/${caminho}`;
  async function painelConfig() {
    const raiz = el('painelConfig');
    raiz.innerHTML = '<p class="text-slate-400">Conferindo a configuração…</p>';
    let c = null;
    let erroFuncao = '';
    try { c = await Planos.chamar('configuracao'); } catch (err) { erroFuncao = err.message; }
    try { const r = await fetch(`${SUPABASE_URL}/auth/v1/settings`, { headers: { apikey: SUPABASE_KEY } }); c = { ...(c || {}), google: !!(await r.json())?.external?.google }; } catch {}
    const marcados = new Set((App.lerLocal('es_checklist') || '').split(',').filter(Boolean));
    const evento = c?.ultimo_evento;
    const itens = [
      { auto: true, ok: !!c?.mp_token, titulo: 'Token do Mercado Pago', texto: c?.mp_teste ? 'Configurado, mas é um token de TESTE (começa com TEST-). Troque pelo de produção para receber de verdade.' : 'Segredo MP_ACCESS_TOKEN nas Edge Functions.', link: painelSupabase('functions/secrets'), aviso: c?.mp_teste },
      { auto: true, ok: !!c?.webhook_secret, titulo: 'Assinatura secreta do webhook', texto: 'Segredo MP_WEBHOOK_SECRET (Mercado Pago → Suas integrações → Webhooks → Assinatura secreta).', link: painelSupabase('functions/secrets') },
      { auto: true, ok: !!evento, titulo: 'Webhook recebendo avisos', texto: evento ? `Último aviso: ${new Date(evento.recebido_em).toLocaleString('pt-BR')} (${App.escapar(evento.tipo || '')}).` : 'Nenhum aviso recebido ainda. Cadastre a URL da função mercadopago nos Webhooks do Mercado Pago (eventos: Pagamentos e Planos e assinaturas).', link: 'https://www.mercadopago.com.br/developers/panel/app' },
      { auto: true, ok: !!c?.resend, titulo: 'E-mails de lembrete (Resend)', texto: 'Segredo RESEND_API_KEY (grátis até 3.000 e-mails/mês em resend.com). Opcional: EMAIL_REMETENTE com seu domínio verificado.', link: 'https://resend.com/api-keys' },
      { auto: true, ok: !!RESPONSAVEL_NOME && !!CONTATO_EMAIL, titulo: 'Responsável nos Termos', texto: 'Nome e e-mail de contato em js/config.js. CPF/CNPJ não é obrigatório.' },
      { auto: true, ok: !!TURNSTILE_SITE_KEY, opcional: true, titulo: 'CAPTCHA no cadastro (Turnstile)', texto: 'Opcional. Crie um widget grátis no Cloudflare Turnstile, cole a Site Key em js/config.js e a Secret Key em Supabase → Attack Protection.', link: painelSupabase('auth/protection') },
      { auto: true, ok: !!c?.google, opcional: true, titulo: 'Login com o Google', texto: 'Opcional. Crie o cliente OAuth no Google Cloud e ligue o Google em Supabase → Authentication → Providers (passo a passo no README). O botão aparece sozinho no site.', link: painelSupabase('auth/providers') },
      { id: 'pix', titulo: 'Chave Pix na conta do Mercado Pago', texto: 'Sem chave Pix cadastrada, o QR Code não é gerado. No app do Mercado Pago: Seu perfil → Minhas chaves Pix. Pode ser CPF, e-mail ou celular (não precisa de CNPJ).' },
      { id: 'url', titulo: 'Endereço do site no Supabase', texto: `Authentication → URL Configuration: Site URL = ${App.escapar(SITE_URL)} e adicione ${App.escapar(SITE_URL)}/** nas Redirect URLs (links de e-mail e recuperação de senha).`, link: painelSupabase('auth/url-configuration') },
      { id: 'vazadas', titulo: 'Bloquear senhas vazadas', texto: 'Authentication → Attack Protection → ligue "Prevent use of leaked passwords" (exige plano Pro do Supabase; no plano grátis, pule este item).', link: painelSupabase('auth/protection') },
      { id: 'smtp', titulo: 'E-mails de login com seu domínio (SMTP)', texto: 'O e-mail padrão do Supabase tem limite baixo por hora. Use o SMTP do Resend em Authentication → Emails → SMTP Settings.', link: painelSupabase('auth/smtp') },
      { id: 'teste', titulo: 'Fazer um pagamento real de teste', texto: 'Assine com um aluno de teste (Pix é o mais rápido), confira se o acesso libera na hora e depois devolva o valor pelo Mercado Pago.' },
    ];
    const pendentes = itens.filter((i) => !i.opcional && (i.auto ? !i.ok || i.aviso : !marcados.has(i.id))).length;
    el('alertaConfig').classList.toggle('hidden', !pendentes);
    raiz.innerHTML = `
      <section class="bg-white rounded-2xl border border-slate-200 p-6">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div><h3 class="font-display font-bold text-navy-900 text-lg">Checklist de lançamento</h3>
          <p class="text-sm text-slate-500">${pendentes ? `<b class="text-brand-red">${pendentes} item(ns) pendente(s).</b>` : '<b class="text-emerald-700">Tudo pronto!</b>'} Os itens com selo "automático" são conferidos sozinhos; marque os outros quando fizer.</p></div>
          ${c?.valores ? `<p class="text-sm text-slate-500 shrink-0">Valores cobrados: <b class="text-navy-900">${precoBR(Number(c.valores.mensal))}</b>/mês · <b class="text-navy-900">${precoBR(Number(c.valores.anual))}</b>/ano</p>` : ''}
        </div>
        ${erroFuncao ? `<p class="mt-4 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">Não consegui falar com a função mercadopago: ${App.escapar(erroFuncao)}</p>` : ''}
        <ul id="listaChecklist" class="mt-5 divide-y divide-slate-100">
          ${itens.map((i) => {
            const ok = i.auto ? i.ok && !i.aviso : marcados.has(i.id);
            return `<li class="py-4 flex gap-4">
              ${i.auto
                ? `<span class="w-7 h-7 shrink-0 rounded-full grid place-items-center ${ok ? 'bg-emerald-500 text-white' : i.aviso ? 'bg-amber-400 text-navy-900' : i.opcional ? 'bg-slate-200 text-slate-500' : 'bg-brand-red text-white'}">${Icone(ok ? 'check' : 'x', 'w-4 h-4')}</span>`
                : `<input type="checkbox" data-marcar="${i.id}" ${ok ? 'checked' : ''} class="mt-1 w-5 h-5 shrink-0 accent-emerald-600 cursor-pointer" aria-label="${App.escapar(i.titulo)}" />`}
              <div class="flex-1 min-w-0">
                <p class="font-semibold text-navy-900">${i.titulo} ${i.auto ? '<span class="ml-1 text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-500 rounded-full px-2 py-0.5 align-middle">automático</span>' : ''}${i.opcional ? '<span class="ml-1 text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-500 rounded-full px-2 py-0.5 align-middle">opcional</span>' : ''}</p>
                <p class="mt-0.5 text-sm text-slate-500">${i.texto}</p>
              </div>
              ${i.link ? `<a href="${i.link}" target="_blank" rel="noopener" class="shrink-0 self-start text-sm font-semibold text-navy-600 hover:text-brand-red">Abrir →</a>` : ''}
            </li>`;
          }).join('')}
        </ul>
      </section>
      <section class="mt-5 bg-white rounded-2xl border border-slate-200 p-6 flex flex-col sm:flex-row sm:items-center gap-4">
        <span class="w-12 h-12 shrink-0 rounded-xl bg-navy-900 text-white grid place-items-center">${Icone('envelope', 'w-6 h-6')}</span>
        <div class="flex-1"><h3 class="font-display font-bold text-navy-900">Lembretes de vencimento</h3>
        <p class="text-sm text-slate-500">Rodam sozinhos todo dia às 9h (horário de Brasília). Quem paga com Pix recebe aviso 3 dias antes, 1 dia antes e no dia em que vence. Cada aviso vai uma vez só.</p></div>
        <button id="btnLembretes" class="shrink-0 font-semibold bg-navy-900 hover:bg-navy-800 text-white rounded-xl px-5 py-3 transition">Enviar lembretes agora</button>
      </section>`;
    raiz.querySelectorAll('[data-marcar]').forEach((b) => b.addEventListener('change', () => {
      const atual = new Set((App.lerLocal('es_checklist') || '').split(',').filter(Boolean));
      b.checked ? atual.add(b.dataset.marcar) : atual.delete(b.dataset.marcar);
      App.gravarLocal('es_checklist', [...atual].join(','));
      painelConfig();
    }));
    el('btnLembretes').addEventListener('click', async (e) => {
      setLoading(e.target, true);
      const { data, error } = await sb.functions.invoke('lembretes', { body: {} });
      setLoading(e.target, false, 'Enviar lembretes agora');
      if (error) return App.toast('Não foi possível rodar os lembretes agora.');
      App.toast(data?.aviso || `${data?.enviados || 0} lembrete(s) enviado(s).${data?.falhas?.length ? ` ${data.falhas.length} falha(s).` : ''}`);
    });
  }

  App.registrar('admin', {
    async iniciar({ params } = {}) {
      const p = await App.perfil();
      if (!p) { location.hash = '#/entrar'; return false; }
      if (p.papel !== 'admin') { location.hash = App.destino(p); return false; }
      App.carregando(true);
      try { await carregar(); } finally { App.carregando(false); }
      const aba = params?.get('aba');
      abrirAba(['financeiro', 'turmas', 'erros', 'config'].includes(aba) ? aba : 'alunos');
    },
  });
})();
