// escola.js — Área de escolas e professores (#/escola)
// Abas: painel (estilo Power BI) · turmas · professores (só escola) · financeiro (quem paga) · conteúdo · conta
// Acessos:
//   escola (dono)            → tudo, inclusive professores vinculados e financeiro (−10% por aluno)
//   professor independente   → painel, turmas, financeiro (−5% por aluno), conteúdo, conta
//   professor vinculado      → painel e turmas dele, conteúdo, conta (quem paga é a escola)

(() => {
  const el = (id) => document.getElementById(id);
  const esc = (t) => App.escapar(t ?? '');
  const brl = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const dia = (d) => d ? new Date(d).toLocaleDateString('pt-BR') : '—';
  let p = null;
  let painelFiltro = { turma: '', dias: 30 };

  const ehDono = () => !!p?.instituicao;
  const ehEscola = () => p?.instituicao?.tipo === 'escola';
  const vinculoOk = () => ehDono() || p?.vinculo?.status === 'aprovado';

  function abasDisponiveis() {
    if (!vinculoOk()) return [['conta', 'Minha conta', 'usuario']];
    return [
      ['painel', 'Painel', 'grafico'], ['turmas', 'Turmas', 'grupo'],
      ...(ehEscola() ? [['professores', 'Professores', 'capelo']] : []),
      ...(ehDono() && !App.modoApp() ? [['financeiro', 'Financeiro', 'cartao']] : []), // no app da Play Store não há pagamento
      ['conteudo', 'Conteúdo do curso', 'livro'], ['comunidade', 'Comunidade', 'conversa'], ['conta', 'Conta', 'usuario'],
    ];
  }

  function cabecalho(aba) {
    const inst = p.instituicao || p.vinculo;
    const titulo = ehEscola() ? 'Painel da escola' : ehDono() ? 'Painel do professor' : 'Painel do professor';
    el('escolaTitulo').textContent = titulo;
    el('escolaSub').innerHTML = ehDono()
      ? `${esc(inst.nome)} · ${ehEscola() ? 'Escola' : 'Professor independente'} · <b>${p.instituicao.desconto}% de desconto</b> por aluno`
      : p.vinculo ? `Professor vinculado a <b>${esc(p.vinculo.nome)}</b>${p.vinculo.status === 'pendente' ? ' · aguardando aprovação da escola' : ''}` : 'Professor sem escola vinculada';
    el('escolaAbas').innerHTML = abasDisponiveis().map(([k, n, ic]) => `<a href="${k === 'comunidade' ? '#/comunidade' : `#/escola?aba=${k}`}" class="shrink-0 inline-flex items-center gap-2 text-sm font-semibold rounded-full px-4 py-2 transition ${k === aba ? 'bg-white text-navy-900' : 'text-white/80 hover:bg-white/10'}">${Icone(ic, 'w-4 h-4')}${n}</a>`).join('');
    const aviso = el('escolaAviso');
    aviso.className = 'hidden';
    if (ehDono() && !p.instituicao.ativa) {
      aviso.className = 'max-w-7xl mx-auto px-5 mt-5';
      aviso.innerHTML = App.modoApp()
        ? '<div class="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-900"><b>Os alunos ainda não têm acesso às lições.</b> O acesso é liberado assim que a conta da instituição estiver ativa.</div>'
        : `<div class="flex flex-col sm:flex-row sm:items-center gap-3 bg-amber-50 border border-amber-200 rounded-2xl p-4"><p class="flex-1 text-sm text-amber-900"><b>Os alunos ainda não têm acesso às lições.</b> Aprove os alunos nas turmas e pague a fatura em Financeiro para liberar o acesso de todos.</p><a href="#/escola?aba=financeiro" class="shrink-0 font-semibold bg-amber-500 hover:bg-amber-600 text-navy-900 rounded-xl px-4 py-2 text-sm">Ir para o financeiro</a></div>`;
    } else if (!ehDono() && p.vinculo?.status === 'aprovado' && !p.vinculo.ativa) {
      aviso.className = 'max-w-7xl mx-auto px-5 mt-5';
      aviso.innerHTML = '<div class="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-900">A escola ainda não pagou a fatura. Seus alunos aprovados terão acesso às lições assim que a escola regularizar o pagamento.</div>';
    }
  }

  // ======================= PAINEL (BI) =======================
  const kpi = (rotulo, valor, sub, cor = 'text-navy-900') => `
    <div class="bg-white rounded-2xl border border-slate-200 p-4">
      <p class="text-xs font-bold uppercase tracking-wider text-slate-500">${rotulo}</p>
      <p class="mt-1 font-display text-3xl font-extrabold ${cor}">${valor}</p>
      ${sub ? `<p class="text-xs text-slate-500">${sub}</p>` : ''}
    </div>`;

  function graficoLinha(serie) {
    const W = 640, H = 200, pe = 28, pd = 8, pt = 10, pb = 26;
    const max = Math.max(1, ...serie.map((s) => s.atividades));
    const x = (i) => pe + (i * (W - pe - pd)) / Math.max(1, serie.length - 1);
    const y = (v) => pt + (H - pt - pb) * (1 - v / max);
    const caminho = (k) => serie.map((s, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(s[k]).toFixed(1)}`).join(' ');
    const area = `${caminho('atividades')} L${x(serie.length - 1)},${H - pb} L${x(0)},${H - pb} Z`;
    const marcas = [0, Math.round(max / 2), max];
    const passo = Math.ceil(serie.length / 6);
    return `
      <svg viewBox="0 0 ${W} ${H}" class="w-full h-auto" role="img" aria-label="Atividades por dia">
        ${marcas.map((m) => `<line x1="${pe}" x2="${W - pd}" y1="${y(m)}" y2="${y(m)}" class="stroke-slate-200" stroke-width="1"/><text x="${pe - 6}" y="${y(m) + 4}" text-anchor="end" class="fill-slate-500" font-size="10">${m}</text>`).join('')}
        <path d="${area}" class="fill-brand-red/10"/>
        <path d="${caminho('atividades')}" fill="none" class="stroke-brand-red" stroke-width="2.5" stroke-linejoin="round"/>
        <path d="${caminho('alunos')}" fill="none" class="stroke-navy-600" stroke-width="2" stroke-dasharray="5 4"/>
        ${serie.map((s, i) => (i % passo === 0 || i === serie.length - 1) ? `<text x="${x(i)}" y="${H - 8}" text-anchor="${i === serie.length - 1 ? 'end' : i === 0 ? 'start' : 'middle'}" class="fill-slate-500" font-size="10">${new Date(s.dia + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</text>` : '').join('')}
        ${serie.map((s, i) => `<circle cx="${x(i)}" cy="${y(s.atividades)}" r="7" fill="transparent"><title>${new Date(s.dia + 'T12:00:00').toLocaleDateString('pt-BR')}: ${s.atividades} atividades, ${s.alunos} alunos</title></circle>`).join('')}
      </svg>
      <div class="mt-1 flex gap-4 text-xs text-slate-500"><span class="inline-flex items-center gap-1.5"><span class="w-4 h-0.5 bg-brand-red"></span>Atividades</span><span class="inline-flex items-center gap-1.5"><span class="w-4 border-t-2 border-dashed border-navy-600"></span>Alunos ativos</span></div>`;
  }

  function barrasNiveis(niveis) {
    const max = Math.max(1, ...niveis.map((n) => n.qtd));
    const faixa = (n) => (typeof faixaDoNivel === 'function' ? faixaDoNivel(n) : '');
    return `<div class="space-y-1.5">${niveis.map((n) => `
      <div class="flex items-center gap-2 text-xs">
        <span class="w-14 shrink-0 text-slate-500">N${n.nivel} <span class="text-slate-400">${faixa(n.nivel)}</span></span>
        <span class="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden"><span class="block h-full rounded-full bg-navy-600" style="width:${(n.qtd / max) * 100}%"></span></span>
        <span class="w-6 text-right font-semibold text-navy-900">${n.qtd}</span>
      </div>`).join('')}</div>`;
  }

  async function abaPainel(raiz) {
    const { data: turmas } = await sb.rpc('minhas_turmas_edu');
    raiz.innerHTML = '<div class="py-16 grid place-items-center"><span class="spinner spinner-escuro"></span></div>';
    const { data: d, error } = await sb.rpc('painel_edu', { p_turma: painelFiltro.turma || null, p_dias: painelFiltro.dias });
    if (error) { raiz.innerHTML = `<p class="text-red-700">${esc(error.message)}</p>`; return; }
    const k = d.kpis;
    let ordem = { campo: 'nome', asc: true }, busca = '';
    raiz.innerHTML = `
      <div class="flex flex-wrap items-end gap-3">
        <div><label for="fTurma" class="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Turma</label>
          <select id="fTurma" class="campo !py-2 min-w-[12rem]"><option value="">Todas as turmas</option>${(turmas || []).map((t) => `<option value="${t.id}" ${t.id === painelFiltro.turma ? 'selected' : ''}>${esc(t.nome)}</option>`).join('')}</select></div>
        <div><label for="fDias" class="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Período</label>
          <select id="fDias" class="campo !py-2">${[[7, '7 dias'], [30, '30 dias'], [90, '90 dias'], [365, '12 meses']].map(([v, n]) => `<option value="${v}" ${v === painelFiltro.dias ? 'selected' : ''}>Últimos ${n}</option>`).join('')}</select></div>
        <button type="button" id="btnCsvPainel" class="ml-auto font-semibold border border-slate-300 bg-white text-navy-900 hover:border-navy-900 rounded-xl px-4 py-2.5 text-sm">${Icone('baixar', 'w-4 h-4 inline -mt-0.5')} Exportar CSV</button>
      </div>
      <div class="mt-4 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        ${kpi('Alunos', k.alunos, `${k.turmas} turma(s)${k.pendentes ? ` · <b class="text-amber-700">${k.pendentes} pendente(s)</b>` : ''}`)}
        ${kpi('Ativos na semana', k.alunos ? `${Math.round((k.ativos7 / k.alunos) * 100)}%` : '—', `${k.ativos7} de ${k.alunos}`, 'text-emerald-700')}
        ${kpi('Lições concluídas', k.licoes, `no período`)}
        ${kpi('Média de acertos', k.media != null ? `${k.media}%` : '—', 'no período', k.media >= 70 ? 'text-emerald-700' : k.media >= 50 ? 'text-amber-700' : 'text-red-700')}
        ${kpi('Revisões', k.revisoes, 'sessões no período')}
        ${kpi('Certificados', k.certificados, 'emitidos no período', 'text-brand-red')}
      </div>
      <div class="mt-4 grid lg:grid-cols-3 gap-4">
        <section class="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-5">
          <h3 class="font-bold text-navy-900">Engajamento diário</h3>
          <div class="mt-3">${graficoLinha(d.serie || [])}</div>
        </section>
        <section class="bg-white rounded-2xl border border-slate-200 p-5">
          <h3 class="font-bold text-navy-900">Alunos por nível</h3>
          <div class="mt-3">${barrasNiveis(d.niveis || [])}</div>
        </section>
      </div>
      <section class="mt-4 bg-white rounded-2xl border border-slate-200 p-5 overflow-x-auto">
        <h3 class="font-bold text-navy-900">Desempenho por turma</h3>
        <table class="mt-3 w-full text-sm min-w-[36rem]">
          <thead><tr class="text-left text-xs uppercase tracking-wider text-slate-500"><th class="py-2">Turma</th>${ehEscola() ? '<th>Professor</th>' : ''}<th>Alunos</th><th>Ativos 7 dias</th><th>Lições</th><th class="w-48">Média de acertos</th></tr></thead>
          <tbody class="divide-y divide-slate-100">${(d.turmas || []).map((t) => `
            <tr><td class="py-2.5 font-semibold text-navy-900">${esc(t.nome)}</td>${ehEscola() ? `<td class="text-slate-600">${esc(t.professor || '—')}</td>` : ''}<td>${t.alunos}</td><td>${t.ativos7}</td><td>${t.licoes}</td>
            <td><span class="flex items-center gap-2"><span class="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden"><span class="block h-full rounded-full ${t.media >= 70 ? 'bg-emerald-600' : t.media >= 50 ? 'bg-amber-500' : 'bg-red-500'}" style="width:${t.media || 0}%"></span></span><b class="w-10 text-right">${t.media != null ? t.media + '%' : '—'}</b></span></td></tr>`).join('') || `<tr><td colspan="6" class="py-4 text-slate-500">Nenhuma turma ainda. <a href="#/escola?aba=turmas" class="font-semibold text-navy-600 underline">Crie a primeira turma</a>.</td></tr>`}</tbody>
        </table>
      </section>
      <section class="mt-4 bg-white rounded-2xl border border-slate-200 p-5">
        <div class="flex flex-wrap items-center gap-3"><h3 class="font-bold text-navy-900 flex-1">Alunos</h3><label for="buscaAluno" class="sr-only">Buscar aluno</label><input id="buscaAluno" placeholder="Buscar por nome ou e-mail" class="campo !py-2 max-w-xs" /></div>
        <div class="mt-3 overflow-x-auto"><table class="w-full text-sm min-w-[44rem]"><thead id="cabAlunos"></thead><tbody id="corpoAlunos" class="divide-y divide-slate-100"></tbody></table></div>
      </section>`;

    const COLS = [['nome', 'Aluno'], ['turmas', 'Turma(s)'], ['nivel_num', 'Nível'], ['licoes', 'Lições'], ['media', 'Média'], ['xp', 'XP'], ['certificados', 'Certif.'], ['ultimo', 'Último acesso']];
    const desenhar = () => {
      const lista = (d.alunos || []).filter((a) => !busca || `${a.nome} ${a.email}`.toLowerCase().includes(busca))
        .sort((a, b) => { const va = a[ordem.campo] ?? '', vb = b[ordem.campo] ?? ''; return (va > vb ? 1 : va < vb ? -1 : 0) * (ordem.asc ? 1 : -1); });
      el('cabAlunos').innerHTML = `<tr class="text-left text-xs uppercase tracking-wider text-slate-500">${COLS.map(([c, n]) => `<th class="py-2"><button type="button" data-ordem="${c}" class="hover:text-navy-900">${n}${ordem.campo === c ? (ordem.asc ? ' ▲' : ' ▼') : ''}</button></th>`).join('')}</tr>`;
      const inativo = (u) => !u || Date.now() - new Date(u).getTime() > 7 * 864e5;
      el('corpoAlunos').innerHTML = lista.map((a) => `
        <tr><td class="py-2.5"><b class="text-navy-900">${esc(a.nome)}</b><br><span class="text-xs text-slate-500">${esc(a.email)}</span></td>
        <td class="text-slate-600">${esc(a.turmas || '')}</td><td>${a.nivel_num ? `${a.nivel_num} <span class="text-xs text-slate-500">${faixaDoNivel(a.nivel_num)}</span>` : '<span class="text-xs text-slate-500">sem prova</span>'}</td>
        <td>${a.licoes}</td><td class="${a.media >= 70 ? 'text-emerald-700' : a.media >= 50 ? 'text-amber-700' : 'text-red-700'} font-semibold">${a.media != null ? a.media + '%' : '—'}</td>
        <td>${a.xp}</td><td>${a.certificados}</td><td class="${inativo(a.ultimo) ? 'text-red-700' : 'text-slate-600'}">${a.ultimo ? dia(a.ultimo) : 'nunca'}</td></tr>`).join('') || '<tr><td colspan="8" class="py-4 text-slate-500">Nenhum aluno aprovado nas turmas.</td></tr>';
      el('cabAlunos').querySelectorAll('[data-ordem]').forEach((b) => b.addEventListener('click', () => { ordem = { campo: b.dataset.ordem, asc: ordem.campo === b.dataset.ordem ? !ordem.asc : true }; desenhar(); }));
    };
    desenhar();
    el('buscaAluno').addEventListener('input', (e) => { busca = e.target.value.trim().toLowerCase(); desenhar(); });
    el('fTurma').addEventListener('change', (e) => { painelFiltro.turma = e.target.value; abaPainel(raiz); });
    el('fDias').addEventListener('change', (e) => { painelFiltro.dias = Number(e.target.value); abaPainel(raiz); });
    el('btnCsvPainel').addEventListener('click', () => {
      const linhas = [['Aluno', 'E-mail', 'Turmas', 'Nível', 'Lições concluídas', 'Média de acertos (%)', 'XP', 'Certificados', 'Último acesso']]
        .concat((d.alunos || []).map((a) => [a.nome, a.email, a.turmas || '', a.nivel_num || '', a.licoes, a.media ?? '', a.xp, a.certificados, a.ultimo ? dia(a.ultimo) : '']));
      const csv = '﻿' + linhas.map((l) => l.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\n');
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
      a.download = `english-smart-alunos-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    });
  }

  // ======================= TURMAS =======================
  async function abaTurmas(raiz) {
    const [{ data: turmas, error }, profs] = await Promise.all([sb.rpc('minhas_turmas_edu'), ehEscola() ? sb.rpc('professores_da_escola') : Promise.resolve({ data: [] })]);
    if (error) { raiz.innerHTML = `<p class="text-red-700">${esc(error.message)}</p>`; return; }
    const aprovados = (profs.data || []).filter((x) => x.status === 'aprovado');
    const opcoesProf = (sel) => `<option value="">${ehEscola() ? 'A própria escola' : 'Eu'}</option>${aprovados.map((x) => `<option value="${x.id}" ${x.id === sel ? 'selected' : ''}>${esc(x.nome)}</option>`).join('')}`;
    raiz.innerHTML = `
      <form id="formTurma" class="bg-white rounded-2xl border border-slate-200 p-5 grid gap-3 md:grid-cols-[1fr_1fr${ehEscola() ? '_auto' : ''}_auto] md:items-end">
        <div><label for="tNome" class="block text-sm font-medium text-slate-600 mb-1">Nome da nova turma</label><input id="tNome" maxlength="60" placeholder="Inglês 8º ano — manhã" class="campo" /></div>
        <div><label for="tDesc" class="block text-sm font-medium text-slate-600 mb-1">Descrição (opcional)</label><input id="tDesc" maxlength="300" placeholder="Terças e quintas, 8h" class="campo" /></div>
        ${ehEscola() ? `<div><label for="tProf" class="block text-sm font-medium text-slate-600 mb-1">Professor</label><select id="tProf" class="campo">${opcoesProf('')}</select></div>` : ''}
        <button type="submit" class="font-semibold bg-brand-red hover:bg-brand-redDark text-white rounded-xl px-6 py-3 transition">Criar turma</button>
      </form>
      <div class="mt-5 grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        ${(turmas || []).map((t) => `
          <article class="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col">
            <div class="flex items-start gap-3">
              <span class="w-11 h-11 shrink-0 rounded-xl bg-navy-900 text-white grid place-items-center">${Icone('grupo', 'w-5 h-5')}</span>
              <div class="flex-1 min-w-0"><h3 class="font-bold text-navy-900 truncate">${esc(t.nome)}</h3><p class="text-xs text-slate-500 truncate">${t.descricao ? esc(t.descricao) + ' · ' : ''}${ehEscola() ? `Prof. ${esc(t.professor || '—')}` : ''}</p></div>
            </div>
            <div class="mt-4 flex items-center gap-2 text-sm">
              <span class="font-mono tracking-widest bg-slate-100 text-navy-900 rounded-lg px-2.5 py-1">${esc(t.codigo)}</span>
              <button type="button" data-copiar="${esc(t.codigo)}" class="text-xs font-semibold text-navy-600 hover:underline">Copiar convite</button>
            </div>
            <p class="mt-3 text-sm text-slate-600"><b class="text-navy-900">${t.aprovados}</b> aluno(s)${t.pendentes ? ` · <b class="text-amber-700">${t.pendentes} pedido(s)</b>` : ''}</p>
            <div class="mt-auto pt-4 flex flex-wrap gap-2">
              <a href="#/turma?id=${t.id}&aba=alunos" class="text-sm font-semibold bg-navy-900 hover:bg-navy-800 text-white rounded-lg px-3 py-2">${t.pendentes ? 'Aprovar alunos' : 'Alunos'}</a>
              <a href="#/turma?id=${t.id}&aba=aulas" class="text-sm font-semibold border border-slate-200 text-navy-900 hover:border-navy-900 rounded-lg px-3 py-2">Aulas e vídeos</a>
              <button type="button" data-editar="${t.id}" class="text-sm font-semibold border border-slate-200 text-navy-900 hover:border-navy-900 rounded-lg px-3 py-2">Editar</button>
              <button type="button" data-excluir="${t.id}" data-nome="${esc(t.nome)}" class="text-sm font-semibold border border-slate-200 text-slate-600 hover:text-red-700 rounded-lg px-3 py-2">Excluir</button>
            </div>
            <form data-form-editar="${t.id}" class="hidden mt-3 grid gap-2 border-t border-slate-100 pt-3">
              <input name="nome" maxlength="60" value="${esc(t.nome)}" class="campo !py-2" aria-label="Nome da turma" />
              <input name="descricao" maxlength="300" value="${esc(t.descricao || '')}" placeholder="Descrição" class="campo !py-2" aria-label="Descrição" />
              ${ehEscola() ? `<select name="professor" class="campo !py-2" aria-label="Professor">${opcoesProf(t.professor_id === p.id ? '' : t.professor_id)}</select>` : ''}
              <button type="submit" class="font-semibold bg-navy-900 text-white rounded-lg px-3 py-2 text-sm">Salvar</button>
            </form>
          </article>`).join('') || '<div class="md:col-span-2 xl:col-span-3 bg-white rounded-2xl border border-dashed border-slate-300 p-8 text-center text-slate-500">Crie sua primeira turma e envie o código ou o link de convite para os alunos.</div>'}
      </div>
      <div class="mt-5 bg-sky-50 border border-sky-200 rounded-2xl p-4 text-sm text-sky-900">
        <b>Como os alunos entram:</b> eles criam a conta de aluno (ou entram) e usam o código da turma em <i>Minhas turmas</i>, ou abrem o link de convite. Você aprova cada pedido aqui. ${App.modoApp() ? 'Alunos aprovados ganham acesso às lições enquanto a conta da instituição estiver ativa.' : `Alunos aprovados entram na fatura ${ehDono() ? `com <b>${p.instituicao.desconto}% de desconto</b>` : 'da escola'} e ganham acesso às lições quando a fatura estiver paga.`}
      </div>`;
    el('formTurma').addEventListener('submit', async (e) => {
      e.preventDefault();
      const nome = el('tNome').value.trim();
      if (nome.length < 2) return App.toast('Dê um nome à turma.');
      const { error: er } = await sb.rpc('salvar_turma_edu', { p_id: null, p_nome: nome, p_descricao: el('tDesc').value.trim() || null, p_professor: el('tProf')?.value || null });
      if (er) return App.toast(er.message);
      App.toast('Turma criada! Copie o convite e envie para os alunos.');
      abaTurmas(raiz);
    });
    raiz.querySelectorAll('[data-copiar]').forEach((b) => b.addEventListener('click', async () => {
      const link = Turma.linkTurma(b.dataset.copiar);
      try { await navigator.clipboard.writeText(link); App.toast('Link de convite copiado.'); } catch { prompt('Copie o link:', link); }
    }));
    raiz.querySelectorAll('[data-editar]').forEach((b) => b.addEventListener('click', () => raiz.querySelector(`[data-form-editar="${b.dataset.editar}"]`).classList.toggle('hidden')));
    raiz.querySelectorAll('[data-form-editar]').forEach((f) => f.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(f);
      const { error: er } = await sb.rpc('salvar_turma_edu', { p_id: f.dataset.formEditar, p_nome: fd.get('nome'), p_descricao: fd.get('descricao') || null, p_professor: fd.get('professor') || null });
      if (er) return App.toast(er.message);
      App.toast('Turma atualizada.'); abaTurmas(raiz);
    }));
    raiz.querySelectorAll('[data-excluir]').forEach((b) => b.addEventListener('click', async () => {
      if (!confirm(`Excluir a turma "${b.dataset.nome}"? Os alunos saem da turma (as contas deles continuam) e as aulas, vídeos e publicações da turma são apagados.`)) return;
      const { error: er } = await sb.rpc('excluir_turma_edu', { p_id: b.dataset.excluir });
      if (er) return App.toast(er.message);
      App.toast('Turma excluída.'); abaTurmas(raiz);
    }));
  }

  // ======================= PROFESSORES (escola) =======================
  async function abaProfessores(raiz) {
    const { data, error } = await sb.rpc('professores_da_escola');
    if (error) { raiz.innerHTML = `<p class="text-red-700">${esc(error.message)}</p>`; return; }
    const pend = data.filter((x) => x.status === 'pendente'), aprov = data.filter((x) => x.status === 'aprovado');
    const linha = (x) => `
      <li class="flex flex-wrap items-center gap-3 py-3">
        <span class="w-10 h-10 rounded-full bg-emerald-700 text-white font-bold grid place-items-center shrink-0">${esc(x.nome.charAt(0).toUpperCase())}</span>
        <span class="flex-1 min-w-0"><span class="block font-semibold text-navy-900">${esc(x.nome)}</span><span class="block text-xs text-slate-500">${esc(x.email)}${x.status === 'aprovado' ? ` · ${x.turmas} turma(s) · ${x.alunos} aluno(s)` : ` · pediu em ${dia(x.criado_em)}`}</span></span>
        ${x.status === 'pendente' ? `<button type="button" data-prof="aprovar" data-id="${x.id}" class="text-sm font-semibold bg-emerald-700 text-white rounded-lg px-3 py-1.5">Aprovar</button><button type="button" data-prof="recusar" data-id="${x.id}" class="text-sm font-semibold border border-slate-200 text-slate-600 rounded-lg px-3 py-1.5">Recusar</button>`
          : `<button type="button" data-prof="remover" data-id="${x.id}" class="text-sm font-semibold border border-slate-200 text-slate-600 hover:text-red-700 rounded-lg px-3 py-1.5">Desvincular</button>`}
      </li>`;
    raiz.innerHTML = `
      <section class="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col md:flex-row md:items-center gap-4">
        <div class="flex-1"><h3 class="font-bold text-navy-900">Código da escola para professores</h3><p class="text-sm text-slate-500">O professor cria a conta escolhendo <b>Professor → de uma escola</b> e digita este código. Depois você aprova aqui. Professores vinculados criam e gerenciam as próprias turmas; a cobrança dos alunos vem para a escola.</p></div>
        <div class="flex items-center gap-2"><b class="font-mono text-xl tracking-widest bg-slate-100 text-navy-900 rounded-xl px-4 py-2">${esc(p.instituicao.codigo)}</b><button type="button" id="btnCopiarCodEscola" class="font-semibold bg-navy-900 text-white rounded-xl px-4 py-2.5 text-sm">Copiar</button></div>
      </section>
      <div class="mt-4 grid lg:grid-cols-2 gap-4">
        <section class="bg-white rounded-2xl border border-slate-200 p-5"><h3 class="font-bold text-navy-900">Pedidos de vínculo <span class="text-amber-700">${pend.length}</span></h3><ul class="mt-2 divide-y divide-slate-100">${pend.map(linha).join('') || '<li class="py-3 text-sm text-slate-500">Nenhum pedido.</li>'}</ul></section>
        <section class="bg-white rounded-2xl border border-slate-200 p-5"><h3 class="font-bold text-navy-900">Professores da escola <span class="text-emerald-700">${aprov.length}</span></h3><ul class="mt-2 divide-y divide-slate-100">${aprov.map(linha).join('') || '<li class="py-3 text-sm text-slate-500">Nenhum professor vinculado ainda.</li>'}</ul></section>
      </div>`;
    el('btnCopiarCodEscola').addEventListener('click', async () => { try { await navigator.clipboard.writeText(p.instituicao.codigo); App.toast('Código copiado.'); } catch {} });
    raiz.querySelectorAll('[data-prof]').forEach((b) => b.addEventListener('click', async () => {
      if (b.dataset.prof === 'remover' && !confirm('Desvincular este professor? As turmas dele passam para a escola.')) return;
      const { error: er } = await sb.rpc('decidir_professor', { p_professor: b.dataset.id, p_acao: b.dataset.prof });
      if (er) return App.toast(er.message);
      abaProfessores(raiz);
    }));
  }

  // ======================= FINANCEIRO =======================
  async function abaFinanceiro(raiz) {
    const [{ data: pv, error }, { data: faturas }] = await Promise.all([sb.rpc('previsao_fatura'), sb.rpc('minhas_faturas')]);
    if (error) { raiz.innerHTML = `<p class="text-red-700">${esc(error.message)}</p>`; return; }
    const aberta = (faturas || []).find((f) => f.status === 'aberta');
    const precoUnit = (c) => (c === 'anual' ? PLANO_ANUAL.preco : PLANO.preco);
    const comDesc = (c) => precoUnit(c) * (100 - pv.desconto) / 100;
    raiz.innerHTML = `
      <div class="grid lg:grid-cols-3 gap-4">
        <section class="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-5 md:p-6">
          <h3 class="font-bold text-navy-900">Próxima cobrança</h3>
          <div class="mt-4 grid sm:grid-cols-3 gap-3">
            ${kpi('Alunos aprovados', pv.qtd, 'contados uma vez, mesmo em 2 turmas')}
            ${kpi('Por aluno', brl(comDesc(pv.ciclo)), `<s>${brl(pv.valor_unit)}</s> −${pv.desconto}% · ${pv.ciclo === 'anual' ? 'por ano' : 'por mês'}`, 'text-emerald-700')}
            ${kpi('Total do ciclo', brl(pv.total_ciclo + Number(pv.ajustes)), pv.ajustes > 0 ? `inclui ${brl(pv.ajustes)} proporcionais` : `economia de ${brl(pv.subtotal - pv.total_ciclo)}`)}
          </div>
          <p class="mt-4 text-sm text-slate-600">Situação: ${pv.ativa ? `<b class="text-emerald-700">em dia</b> · acesso dos alunos garantido até <b>${dia(pv.pago_ate)}</b>` : '<b class="text-amber-700">aguardando pagamento</b> · os alunos aprovados ganham acesso assim que a fatura for paga'}.</p>
          <div class="mt-4 flex flex-wrap gap-2">
            ${aberta ? `<button type="button" data-pagar="${aberta.id}" class="font-semibold bg-brand-red hover:bg-brand-redDark text-white rounded-xl px-5 py-3">Pagar fatura em aberto · ${brl(aberta.total)}</button>`
              : `<button type="button" id="btnGerarFatura" ${pv.qtd || pv.ajustes > 0 ? '' : 'disabled'} class="font-semibold bg-brand-red hover:bg-brand-redDark disabled:opacity-50 text-white rounded-xl px-5 py-3">${pv.ativa ? 'Antecipar a próxima fatura' : 'Gerar fatura e liberar o acesso'}</button>`}
          </div>
          <div id="caixaPagamento" class="mt-4"></div>
        </section>
        <section class="bg-white rounded-2xl border border-slate-200 p-5 md:p-6">
          <h3 class="font-bold text-navy-900">Plano da ${ehEscola() ? 'escola' : 'conta'}</h3>
          <p class="mt-1 text-sm text-slate-500">${ehEscola() ? 'Escolas' : 'Professores independentes'} pagam <b>${pv.desconto}% a menos</b> por aluno.</p>
          <div class="mt-4 space-y-2">
            ${['mensal', 'anual'].map((c) => `
              <label class="flex items-center gap-3 border-2 ${pv.ciclo === c ? 'border-navy-900' : 'border-slate-200'} rounded-xl p-3 cursor-pointer">
                <input type="radio" name="ciclo" value="${c}" ${pv.ciclo === c ? 'checked' : ''} class="accent-brand-red" />
                <span class="flex-1"><b class="text-navy-900">${c === 'anual' ? 'Anual' : 'Mensal'}</b><br><span class="text-xs text-slate-500">${brl(comDesc(c))} por aluno/${c === 'anual' ? 'ano' : 'mês'}${c === 'anual' ? ` · equivale a ${brl(comDesc(c) / 12)}/mês` : ''}</span></span>
              </label>`).join('')}
          </div>
          <p class="mt-3 text-xs text-slate-500">A mudança vale a partir da próxima fatura. Alunos aprovados no meio do ciclo geram uma cobrança proporcional, somada à fatura seguinte${pv.ciclo === 'anual' ? ' (no plano anual, cobrada no mês seguinte)' : ''}. Alunos removidos deixam de ser cobrados no próximo ciclo.</p>
        </section>
      </div>
      <section class="mt-4 bg-white rounded-2xl border border-slate-200 p-5 overflow-x-auto">
        <h3 class="font-bold text-navy-900">Faturas</h3>
        <table class="mt-3 w-full text-sm min-w-[40rem]">
          <thead><tr class="text-left text-xs uppercase tracking-wider text-slate-500"><th class="py-2">Emitida</th><th>Tipo</th><th>Período</th><th>Alunos</th><th>Total</th><th>Vencimento</th><th>Situação</th><th></th></tr></thead>
          <tbody class="divide-y divide-slate-100">${(faturas || []).map((f) => `
            <tr><td class="py-2.5">${dia(f.criada_em)}</td><td>${f.tipo === 'ciclo' ? `Ciclo ${f.ciclo}` : 'Proporcional'}</td><td>${f.periodo_inicio ? `${dia(f.periodo_inicio)} → ${dia(f.periodo_fim)}` : '—'}</td>
            <td>${f.tipo === 'ciclo' ? `${f.qtd_alunos} × ${brl(f.valor_unit)} −${f.desconto_pct}%` : '—'}${Number(f.ajustes) > 0 ? `<br><span class="text-xs text-slate-500">+ ${brl(f.ajustes)} proporcionais</span>` : ''}</td>
            <td class="font-semibold">${brl(f.total)}</td><td>${dia(f.vence_em)}</td>
            <td><span class="text-xs font-bold rounded-full px-2 py-0.5 ${f.status === 'paga' ? 'bg-emerald-100 text-emerald-800' : f.status === 'aberta' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'}">${f.status === 'paga' ? `Paga ${dia(f.paga_em)}` : f.status === 'aberta' ? 'Em aberto' : 'Cancelada'}</span></td>
            <td>${f.status === 'aberta' ? `<button type="button" data-pagar="${f.id}" class="text-sm font-semibold text-brand-red hover:underline">Pagar</button>` : ''}</td></tr>`).join('') || '<tr><td colspan="8" class="py-4 text-slate-500">Nenhuma fatura ainda.</td></tr>'}</tbody>
        </table>
      </section>`;

    raiz.querySelectorAll('input[name=ciclo]').forEach((r) => r.addEventListener('change', async () => {
      const { error: er } = await sb.rpc('atualizar_instituicao', { p_nome: p.instituicao.nome, p_documento: p.instituicao.documento || null, p_ciclo: r.value });
      if (er) return App.toast(er.message);
      App.toast(`Plano ${r.value} escolhido para as próximas faturas.`);
      App.limparPerfil(); p = await App.perfil(true); abaFinanceiro(raiz);
    }));
    el('btnGerarFatura')?.addEventListener('click', async (e) => {
      const bt = e.currentTarget;
      setLoading(bt, true);
      const { data: id, error: er } = await sb.rpc('gerar_fatura');
      if (er) { setLoading(bt, false, 'Gerar fatura'); return App.toast(er.message); }
      await abaFinanceiro(raiz);
      mostrarPagamento(id);
    });
    raiz.querySelectorAll('[data-pagar]').forEach((b) => b.addEventListener('click', () => mostrarPagamento(b.dataset.pagar)));
  }

  let vigiaFatura = null;
  async function mostrarPagamento(id) {
    const caixa = el('caixaPagamento');
    if (!caixa) return;
    clearInterval(vigiaFatura);
    caixa.innerHTML = `
      <div class="border-2 border-navy-900 rounded-2xl p-5">
        <p class="font-bold text-navy-900">Como você quer pagar?</p>
        <div class="mt-3 flex flex-wrap gap-2">
          <button type="button" id="btnFatPix" class="font-semibold bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl px-5 py-3">Pix (liberação na hora)</button>
          <button type="button" id="btnFatCartao" class="font-semibold bg-navy-900 hover:bg-navy-800 text-white rounded-xl px-5 py-3">Cartão de crédito</button>
        </div>
        <div id="fatResultado" class="mt-4"></div>
      </div>`;
    caixa.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const chamar = async (acao, extra = {}) => {
      const { data, error } = await sb.functions.invoke('mercadopago', { body: { acao, id, ...extra } });
      if (error) { let m = 'Não foi possível falar com o Mercado Pago agora.'; try { m = (await error.context.json()).erro || m; } catch {} throw new Error(m); }
      if (data?.erro) throw new Error(data.erro);
      return data;
    };
    el('btnFatPix').addEventListener('click', async (e) => {
      const bt = e.currentTarget;
      setLoading(bt, true);
      try {
        const { fatura } = await chamar('fatura_pix');
        el('fatResultado').innerHTML = `
          <div class="grid sm:grid-cols-[auto_1fr] gap-4 items-center">
            ${fatura.qr_base64 ? `<img src="data:image/png;base64,${fatura.qr_base64}" alt="QR Code do Pix" class="w-44 h-44 rounded-xl border border-slate-200 bg-white" />` : ''}
            <div><p class="font-semibold text-navy-900">Pague ${brl(fatura.total)} com o Pix</p><p class="text-sm text-slate-500">Escaneie o QR Code ou copie o código. O acesso dos alunos é liberado assim que o pagamento cair.</p>
            <textarea readonly rows="3" class="campo mt-2 font-mono text-xs" aria-label="Código Pix copia e cola">${esc(fatura.qr_code)}</textarea>
            <button type="button" id="btnCopiarPixFat" class="mt-2 font-semibold bg-navy-900 text-white rounded-xl px-4 py-2 text-sm">Copiar código Pix</button>
            <p id="fatStatus" class="mt-2 text-sm text-slate-500">Aguardando pagamento…</p></div>
          </div>`;
        el('btnCopiarPixFat').addEventListener('click', async () => { try { await navigator.clipboard.writeText(fatura.qr_code); App.toast('Código Pix copiado.'); } catch {} });
        vigiaFatura = setInterval(async () => {
          if (!el('fatStatus')) return clearInterval(vigiaFatura);
          try {
            const { fatura: f } = await chamar('fatura_status');
            if (f.status === 'paga') {
              clearInterval(vigiaFatura);
              App.toast('Pagamento confirmado! O acesso dos alunos foi liberado.');
              if (typeof Som !== 'undefined') Som.tocar('sucesso');
              App.limparPerfil(); p = await App.perfil(true); cabecalho('financeiro'); abaFinanceiro(el('escolaConteudo'));
            }
          } catch {}
        }, 5000);
      } catch (err) { el('fatResultado').innerHTML = `<p class="text-sm text-red-700">${esc(err.message)}</p>`; }
      finally { if (bt.isConnected) setLoading(bt, false, 'Pix (liberação na hora)'); }
    });
    el('btnFatCartao').addEventListener('click', async (e) => {
      const bt = e.currentTarget;
      setLoading(bt, true);
      try {
        const voltar = location.protocol === 'https:' ? `${location.origin}${location.pathname}#/escola?aba=financeiro` : undefined;
        const { link } = await chamar('fatura_cartao', { voltar });
        location.href = link;
      } catch (err) { el('fatResultado').innerHTML = `<p class="text-sm text-red-700">${esc(err.message)}</p>`; setLoading(bt, false, 'Cartão de crédito'); }
    });
  }

  // ======================= CONTEÚDO =======================
  function abaConteudo(raiz) {
    const bloco = (nv, extra) => `
      <details class="bg-white rounded-2xl border border-slate-200">
        <summary class="cursor-pointer select-none p-4 flex items-center gap-3"><span class="w-10 h-10 shrink-0 rounded-xl ${extra ? nv.cor || 'bg-navy-700' : 'bg-navy-900'} text-white grid place-items-center font-bold text-sm">${extra ? Icone(nv.icone || 'livro', 'w-5 h-5') : nv.n}</span>
          <span class="flex-1 min-w-0"><b class="text-navy-900">${extra ? esc(nv.nome) : `Nível ${nv.n} · ${faixaDoNivel(nv.n)}`}</b><br><span class="text-sm text-slate-500">${esc(nv.tema || nv.descricao || '')} · ${nv.licoes.length} lições</span></span></summary>
        <ol class="px-4 pb-4 space-y-1.5">${nv.licoes.map((l, i) => `<li class="flex items-center gap-3 text-sm"><span class="w-6 text-right text-slate-500">${i + 1}.</span><span class="flex-1 min-w-0"><b class="text-navy-900">${esc(l.t)}</b> <span class="text-slate-500">— ${esc(l.g.split('.')[0])}</span></span><a href="#/licao?n=${nv.n}&l=${i + 1}" class="shrink-0 text-xs font-semibold text-navy-600 hover:underline">Ver lição</a></li>`).join('')}</ol>
      </details>`;
    raiz.innerHTML = `
      <p class="text-slate-600">Veja o que seus alunos estudam. Abra qualquer lição em modo de visualização (nada é registrado).</p>
      <h3 class="mt-5 font-bold text-navy-900">16 níveis (A1 → C2)</h3>
      <div class="mt-3 grid lg:grid-cols-2 gap-3">${CURRICULO.map((nv) => bloco(nv, false)).join('')}</div>
      <h3 class="mt-6 font-bold text-navy-900">Trilhas extras</h3>
      <div class="mt-3 grid lg:grid-cols-2 gap-3">${EXTRAS.map((nv) => bloco(nv, true)).join('')}</div>`;
  }

  // ======================= CONTA =======================
  function abaConta(raiz) {
    const vinc = p.vinculo;
    raiz.innerHTML = `
      <div class="grid lg:grid-cols-2 gap-4 items-start">
        <div class="space-y-4">
        ${ehDono() ? `
        <form id="formInst" class="bg-white rounded-2xl border border-slate-200 p-5 md:p-6 space-y-3">
          <h3 class="font-bold text-navy-900">${ehEscola() ? 'Dados da escola' : 'Seus dados de professor'}</h3>
          <div><label for="iNome" class="block text-sm font-medium text-slate-600 mb-1">${ehEscola() ? 'Nome da escola' : 'Nome que aparece para os alunos'}</label><input id="iNome" maxlength="100" value="${esc(p.instituicao.nome)}" class="campo" /></div>
          <div><label for="iDoc" class="block text-sm font-medium text-slate-600 mb-1">${ehEscola() ? 'CNPJ' : 'CPF ou CNPJ'} (opcional, para as faturas)</label><input id="iDoc" maxlength="20" value="${esc(p.instituicao.documento || '')}" class="campo" /></div>
          <button type="submit" class="font-semibold bg-navy-900 text-white rounded-xl px-5 py-3">Salvar</button>
        </form>` : `
        <section class="bg-white rounded-2xl border border-slate-200 p-5 md:p-6">
          <h3 class="font-bold text-navy-900">Escola vinculada</h3>
          ${vinc ? `<p class="mt-2 text-slate-600"><b class="text-navy-900">${esc(vinc.nome)}</b> · ${vinc.status === 'aprovado' ? '<span class="text-emerald-700 font-semibold">vínculo aprovado</span>' : '<span class="text-amber-700 font-semibold">aguardando aprovação da escola</span>'}</p>` : '<p class="mt-2 text-slate-600">Você ainda não está vinculado a nenhuma escola.</p>'}
          <form id="formVinculo" class="mt-4 flex gap-2">
            <label for="codEscola" class="sr-only">Código da escola</label>
            <input id="codEscola" maxlength="12" placeholder="Código da escola" class="campo uppercase font-mono tracking-widest" />
            <button type="submit" class="shrink-0 font-semibold bg-navy-900 text-white rounded-xl px-4">${vinc ? 'Trocar de escola' : 'Pedir vínculo'}</button>
          </form>
          <p class="mt-2 text-xs text-slate-500">Peça o código para a coordenação da escola. Quem paga os alunos das suas turmas é a escola.</p>
        </section>`}
        <form id="formContaSenha" class="bg-white rounded-2xl border border-slate-200 p-5 md:p-6 space-y-3" novalidate>
          <h3 id="cSenhaTitulo" class="font-bold text-navy-900">Alterar senha</h3>
          <p id="cSenhaSub" class="text-sm text-slate-500">Por segurança, confirme a senha atual. A nova precisa ter pelo menos 6 caracteres.</p>
          <div id="cCaixaAtual"><label for="cSenhaAtual" class="block text-sm font-medium text-slate-600 mb-1">Senha atual</label><input id="cSenhaAtual" type="password" autocomplete="current-password" class="campo" /></div>
          <div class="grid sm:grid-cols-2 gap-3">
            <div><label for="cSenha1" class="block text-sm font-medium text-slate-600 mb-1">Nova senha</label><input id="cSenha1" type="password" autocomplete="new-password" class="campo" /></div>
            <div><label for="cSenha2" class="block text-sm font-medium text-slate-600 mb-1">Confirmar nova senha</label><input id="cSenha2" type="password" autocomplete="new-password" class="campo" /></div>
          </div>
          <p data-msg class="hidden" role="alert"></p>
          <button type="submit" id="cBtnSenha" class="font-semibold bg-navy-900 hover:bg-navy-800 text-white rounded-xl px-5 py-3 transition">Alterar senha</button>
        </form>
        <section class="bg-white rounded-2xl border border-red-200 p-5 md:p-6">
          <h3 class="font-bold text-red-700">Excluir conta</h3>
          <p class="mt-1 text-sm text-slate-500">${ehDono() ? 'Apaga para sempre o seu login, a instituição, as turmas, as faturas e o vínculo dos professores. Os alunos continuam com as contas deles, mas perdem o acesso liberado pela instituição.' : 'Apaga para sempre o seu login. Suas turmas passam para a escola.'} Esta ação pede a sua senha.</p>
          <button type="button" id="btnExcluirContaEdu" class="mt-4 font-semibold border border-red-300 text-red-700 hover:bg-red-50 rounded-xl px-5 py-2.5 transition">Excluir minha conta</button>
        </section>
        </div>
        <div class="space-y-4">
        <section class="bg-white rounded-2xl border border-slate-200 p-5 md:p-6">
          <h3 class="font-bold text-navy-900">Foto de perfil</h3>
          <p class="text-sm text-slate-500">Aparece no menu, na comunidade e para os alunos das suas turmas.</p>
          <div class="mt-4 flex flex-col sm:flex-row sm:items-center gap-4">
            <div id="contaAvatar"></div>
            <div class="flex flex-wrap gap-2">
              <label class="cursor-pointer inline-flex items-center gap-2 font-semibold bg-navy-900 hover:bg-navy-800 text-white rounded-xl px-4 py-2.5 text-sm transition">
                <input id="contaFoto" type="file" accept="image/jpeg,image/png,image/webp" class="sr-only" />
                ${Icone('camera', 'w-4 h-4')}<span id="contaTxtFoto">Enviar foto</span></label>
              <button type="button" id="contaRemoverFoto" class="hidden font-semibold border border-slate-200 hover:border-red-300 text-red-700 rounded-xl px-4 py-2.5 text-sm transition">Remover foto</button>
            </div>
          </div>
          <p class="mt-5 text-sm font-medium text-slate-600">Ou escolha um avatar</p>
          <div id="contaCores" class="mt-2 grid grid-cols-8 gap-2 max-w-sm"></div>
          <div id="contaIcones" class="mt-2 grid grid-cols-8 gap-2 max-w-sm"></div>

          <form id="formContaDados" class="mt-6 pt-6 border-t border-slate-100 space-y-3" novalidate>
            <h3 class="font-bold text-navy-900">${ehEscola() ? 'Dados do responsável' : 'Seus dados'}</h3>
            <div><label for="cNome" class="block text-sm font-medium text-slate-600 mb-1">Nome completo</label><input id="cNome" maxlength="80" autocomplete="name" value="${esc(p.nome)}" class="campo" /></div>
            <div><label for="cEmail" class="block text-sm font-medium text-slate-600 mb-1">E-mail de acesso</label><input id="cEmail" value="${esc(p.email)}" disabled class="campo bg-slate-50 text-slate-500" /></div>
            <div class="grid sm:grid-cols-2 gap-3">
              <div><label for="cTel" class="block text-sm font-medium text-slate-600 mb-1">Telefone (opcional)</label><input id="cTel" maxlength="20" autocomplete="tel" inputmode="tel" value="${esc(p.telefone || '')}" class="campo" /></div>
              <div><label for="cCidade" class="block text-sm font-medium text-slate-600 mb-1">Cidade (opcional)</label><input id="cCidade" maxlength="80" autocomplete="address-level2" value="${esc(p.cidade || '')}" class="campo" /></div>
            </div>
            <p data-msg class="hidden" role="alert"></p>
            <button type="submit" class="font-semibold bg-navy-900 hover:bg-navy-800 text-white rounded-xl px-5 py-3 transition">Salvar dados</button>
          </form>
        </section>


        <section class="bg-white rounded-2xl border border-slate-200 p-5 md:p-6">
          <h3 class="font-bold text-navy-900">Notificações</h3>
          <div id="contaNotificacoes" class="mt-2"></div>
        </section>

        </div>
      </div>`;
    if (typeof Notificacoes !== 'undefined') Notificacoes.painelPerfil(el('contaNotificacoes'));
    el('formInst')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const { error: er } = await sb.rpc('atualizar_instituicao', { p_nome: el('iNome').value.trim(), p_documento: el('iDoc').value.trim() || null, p_ciclo: p.instituicao.ciclo });
      if (er) return App.toast(er.message);
      App.toast('Dados salvos.'); App.limparPerfil(); p = await App.perfil(true); cabecalho('conta');
    });
    el('formVinculo')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const { data, error: er } = await sb.rpc('vincular_escola', { p_codigo: el('codEscola').value.trim() });
      if (er) return App.toast(er.message);
      App.toast(`Pedido enviado para ${data}. Aguarde a aprovação.`);
      App.limparPerfil(); p = await App.perfil(true); render('conta');
    });
    contaPerfil();
  }

  // ---------- Foto, dados pessoais, senha e exclusão (aba Conta) ----------
  function contaPerfil() {
    const msg = (form, texto, ok = false) => {
      const c = form.querySelector('[data-msg]');
      c.className = `text-sm border rounded-xl px-4 py-3 ${ok ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-700'}`;
      c.textContent = texto;
    };
    const salvar = async (campos) => {
      const { error: er } = await sb.rpc('atualizar_perfil', { p_nome: p.nome, p_telefone: p.telefone || null, p_cidade: p.cidade || null, p_avatar: p.avatar || null, ...campos });
      if (er) throw er;
      App.limparPerfil(); p = await App.perfil(true); App.atualizarAvatares(p);
    };
    const desenhar = () => {
      el('contaAvatar').innerHTML = App.avatarHtml(p, 'w-24 h-24 text-2xl');
      const foto = (p.avatar || '').startsWith('https://');
      el('contaRemoverFoto').classList.toggle('hidden', !foto);
      el('contaTxtFoto').textContent = foto ? 'Trocar foto' : 'Enviar foto';
      const marc = (v) => (p.avatar === v ? 'ring-navy-900 ring-offset-2' : 'ring-transparent hover:ring-slate-300');
      el('contaCores').innerHTML = App.CORES_AVATAR.map((c) => `<button type="button" data-av="cor:${c}" class="aspect-square rounded-full ring-2 ${marc(`cor:${c}`)} transition" style="background:${c}" aria-label="Avatar com iniciais nesta cor"></button>`).join('');
      el('contaIcones').innerHTML = App.ICONES_AVATAR.map((i) => `<button type="button" data-av="icone:${i}" class="aspect-square rounded-full bg-navy-600 text-white grid place-items-center ring-2 ${marc(`icone:${i}`)} transition" aria-label="Avatar ${i}">${Icone(i, 'w-1/2 h-1/2')}</button>`).join('');
      document.querySelectorAll('#contaCores [data-av], #contaIcones [data-av]').forEach((b) => b.addEventListener('click', async () => {
        try {
          const tinhaFoto = (p.avatar || '').startsWith('https://');
          await salvar({ p_avatar: b.dataset.av });
          if (tinhaFoto) Conta.limparFotos(p.id).catch(() => {});
          desenhar(); App.toast('Avatar atualizado');
        } catch (err) { App.toast(err.message || 'Não foi possível salvar o avatar.'); }
      }));
    };
    desenhar();

    el('contaFoto').addEventListener('change', async (e) => {
      const arq = e.target.files[0]; e.target.value = '';
      if (!arq) return;
      el('contaTxtFoto').textContent = 'Enviando…';
      try {
        const { url, caminho } = await Conta.enviarFoto(p.id, arq);
        await salvar({ p_avatar: url });
        Conta.limparFotos(p.id, caminho).catch(() => {});
        App.toast('Foto de perfil atualizada');
      } catch (err) { App.toast(err.message || 'Não foi possível enviar a foto.'); }
      desenhar();
    });
    el('contaRemoverFoto').addEventListener('click', async () => {
      try { await salvar({ p_avatar: null }); await Conta.limparFotos(p.id).catch(() => {}); desenhar(); App.toast('Foto removida'); }
      catch (err) { App.toast(err.message || 'Não foi possível remover a foto.'); }
    });

    el('formContaDados').addEventListener('submit', async (e) => {
      e.preventDefault();
      const form = e.currentTarget; const bt = form.querySelector('[type=submit]');
      const nome = el('cNome').value.trim();
      if (nome.length < 2) return msg(form, 'Informe seu nome completo.');
      setLoading(bt, true);
      try { await salvar({ p_nome: nome, p_telefone: el('cTel').value, p_cidade: el('cCidade').value }); desenhar(); msg(form, 'Dados salvos com sucesso.', true); }
      catch (err) { msg(form, err.message || 'Não foi possível salvar.'); }
      finally { setLoading(bt, false, 'Salvar dados'); }
    });

    let comSenha = true;
    const ajustar = async () => {
      const info = await Conta.temSenha();
      comSenha = info.temSenha;
      el('cCaixaAtual').classList.toggle('hidden', !comSenha);
      el('cSenhaTitulo').textContent = comSenha ? 'Alterar senha' : 'Criar senha (opcional)';
      el('cSenhaSub').textContent = comSenha ? 'Por segurança, confirme a senha atual. A nova precisa ter pelo menos 6 caracteres.' : 'Você entra com o Google. Se quiser, crie uma senha para entrar também com e-mail (pelo menos 6 caracteres).';
      el('cBtnSenha').textContent = comSenha ? 'Alterar senha' : 'Salvar senha';
    };
    ajustar();
    el('formContaSenha').addEventListener('submit', async (e) => {
      e.preventDefault();
      const form = e.currentTarget; const bt = el('cBtnSenha');
      const atual = el('cSenhaAtual').value, s1 = el('cSenha1').value, s2 = el('cSenha2').value;
      if (comSenha && !atual) return msg(form, 'Digite sua senha atual.');
      if (s1.length < 6) return msg(form, 'A nova senha precisa ter pelo menos 6 caracteres.');
      if (s1 !== s2) return msg(form, 'As senhas não são iguais.');
      const texto = bt.textContent; setLoading(bt, true);
      try {
        await Conta.alterarSenha(atual, s1, { exigirAtual: comSenha });
        form.reset(); msg(form, comSenha ? 'Senha alterada com sucesso.' : 'Senha criada! Agora você também pode entrar com e-mail e senha.', true);
        await ajustar();
      } catch (err) { msg(form, err.message); }
      finally { setLoading(bt, false, el('cBtnSenha').textContent || texto); }
    });

    el('btnExcluirContaEdu').addEventListener('click', async () => {
      const ok = await Conta.confirmarComSenha({ titulo: 'Excluir minha conta', botao: 'Excluir para sempre',
        texto: ehDono() ? 'A instituição, as turmas e as faturas serão apagadas para sempre. Os alunos perdem o acesso liberado por você.' : 'Seu login será apagado para sempre e suas turmas passam para a escola.' });
      if (!ok) return;
      App.carregando(true);
      try {
        await Conta.limparFotos(p.id).catch(() => {});
        const { error: er } = await sb.rpc('excluir_minha_conta');
        if (er) throw er;
        App.toast('Sua conta foi excluída.'); App.sair();
      } catch (err) { App.toast(err.message || 'Não foi possível excluir a conta.'); }
      finally { App.carregando(false); }
    });
  }

  async function render(aba) {
    const disponiveis = abasDisponiveis().map((a) => a[0]);
    if (!disponiveis.includes(aba)) aba = disponiveis[0];
    cabecalho(aba);
    const raiz = el('escolaConteudo');
    raiz.innerHTML = '<div class="py-16 grid place-items-center"><span class="spinner spinner-escuro"></span></div>';
    if (!vinculoOk()) {
      raiz.innerHTML = `<div class="bg-white rounded-2xl border border-slate-200 p-6 mb-4"><h2 class="text-xl font-bold text-navy-900">${p.vinculo ? 'Aguardando a escola aprovar seu vínculo' : 'Vincule-se a uma escola'}</h2><p class="mt-1 text-slate-600">${p.vinculo ? `Assim que <b>${esc(p.vinculo.nome)}</b> aprovar, você poderá criar turmas e acompanhar seus alunos.` : 'Digite o código que a escola passou para você.'}</p></div><div id="escolaConta"></div>`;
      return abaConta(el('escolaConta'));
    }
    const fazer = { painel: abaPainel, turmas: abaTurmas, professores: abaProfessores, financeiro: abaFinanceiro, conteudo: abaConteudo, conta: abaConta }[aba];
    await fazer(raiz);
  }

  App.registrar('escola', {
    async iniciar({ params }) {
      p = await App.perfil(true);
      if (!p) { location.hash = '#/entrar'; return false; }
      if (p.papel !== 'educador') { location.hash = App.destino(p); return false; }
      await render(params.get('aba') || 'painel');
    },
  });
})();
