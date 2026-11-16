// turma.js — Turmas de escolas e professores
// #/turmas      → aluno: entrar numa turma pelo código e ver as turmas dele
// #/turma?id=…  → dentro da turma: aulas ao vivo, vídeos, comunidade e (para quem gerencia) os alunos

const Turma = (() => {
  const el = (id) => document.getElementById(id);
  const esc = (t) => App.escapar(t ?? '');
  const dataHora = (d) => new Date(d).toLocaleString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  const linkTurma = (codigo) => `${location.protocol === 'https:' ? location.origin + location.pathname : SITE_URL + '/'}#/turmas?codigo=${codigo}`;

  // YouTube / Vimeo viram player; outros links abrem em nova aba
  function embed(url) {
    try {
      const u = new URL(url);
      let id = '';
      if (/(^|\.)youtube\.com$/.test(u.hostname)) id = u.searchParams.get('v') || (u.pathname.match(/\/(embed|shorts|live)\/([\w-]{6,})/) || [])[2] || '';
      if (u.hostname === 'youtu.be') id = u.pathname.slice(1);
      if (/^[\w-]{6,20}$/.test(id)) return `https://www.youtube-nocookie.com/embed/${id}`;
      const v = u.hostname.endsWith('vimeo.com') && u.pathname.match(/\/(\d{6,12})/);
      if (v) return `https://player.vimeo.com/video/${v[1]}`;
    } catch {}
    return null;
  }

  // ---------- #/turmas (aluno) ----------
  async function renderTurmasAluno(p, codigoInicial) {
    const raiz = el('turmasConteudo');
    const turmas = p.turmasEdu || [];
    raiz.innerHTML = `
      <div class="fade-up">
        <h1 class="text-3xl font-extrabold text-navy-900">Minhas turmas</h1>
        <p class="mt-2 text-slate-500">Entre na turma da sua escola ou do seu professor com o código que eles passaram. Depois que aprovarem sua entrada, o acesso às lições é liberado por eles.</p>
        <form id="formEntrarTurma" class="mt-6 bg-white rounded-2xl border border-slate-200 p-5 flex flex-col sm:flex-row gap-3">
          <label for="codTurma" class="sr-only">Código da turma</label>
          <input id="codTurma" maxlength="12" placeholder="Código da turma (ex.: 7F3A9C21)" value="${esc(codigoInicial || '')}" class="campo uppercase tracking-widest font-mono" />
          <button type="submit" class="shrink-0 font-semibold bg-brand-red hover:bg-brand-redDark text-white rounded-xl px-6 py-3 transition">Pedir para entrar</button>
        </form>
        <div class="mt-6 space-y-3">
          ${turmas.length ? turmas.map((t) => `
            <a ${t.status === 'aprovado' ? `href="#/turma?id=${t.id}"` : ''} class="flex items-center gap-4 bg-white rounded-2xl border border-slate-200 p-5 ${t.status === 'aprovado' ? 'hover:border-navy-900 transition' : ''}">
              <span class="w-12 h-12 shrink-0 rounded-xl ${t.status === 'aprovado' ? 'bg-navy-900' : 'bg-slate-400'} text-white grid place-items-center">${Icone('grupo', 'w-6 h-6')}</span>
              <span class="flex-1 min-w-0">
                <span class="block font-bold text-navy-900 truncate">${esc(t.nome)}</span>
                <span class="block text-sm text-slate-500 truncate">${t.tipo === 'escola' ? 'Escola' : 'Professor'} · ${esc(t.instituicao)}</span>
              </span>
              <span class="shrink-0 text-xs font-bold rounded-full px-3 py-1 ${t.status !== 'aprovado' ? 'bg-amber-100 text-amber-800' : t.ativa ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'}">${t.status !== 'aprovado' ? 'Aguardando aprovação' : t.ativa ? 'Acesso liberado' : 'Aguardando pagamento da escola'}</span>
            </a>`).join('') : '<div class="bg-white rounded-2xl border border-dashed border-slate-300 p-8 text-center text-slate-500">Você ainda não participa de nenhuma turma.</div>'}
        </div>
      </div>`;
    el('formEntrarTurma').addEventListener('submit', async (e) => {
      e.preventDefault();
      const cod = el('codTurma').value.trim().toUpperCase();
      if (cod.length < 4) return App.toast('Digite o código da turma.');
      const b = e.currentTarget.querySelector('button'); setLoading(b, true);
      const { data, error } = await sb.rpc('entrar_turma', { p_codigo: cod });
      setLoading(b, false, 'Pedir para entrar');
      if (error) return App.toast(error.message);
      App.toast(`Pedido enviado: ${data}`);
      App.limparPerfil();
      renderTurmasAluno(await App.perfil(true));
    });
  }

  // ---------- #/turma?id= ----------
  let atual = null;
  async function renderTurma(id, abaInicial) {
    const { data: t, error } = await sb.rpc('turma_info', { p_turma: id });
    if (error) { App.toast(error.message); location.hash = '#/'; return false; }
    atual = t;
    el('turmaVoltar').href = t.gerencia ? '#/escola?aba=turmas' : '#/turmas';
    const abas = [['aulas', 'Aulas ao vivo', 'camera'], ['videos', 'Vídeos', 'olho'], ['mural', 'Comunidade da turma', 'conversa']].concat(t.gerencia ? [['alunos', 'Alunos', 'grupo']] : []);
    const aba = abas.some((a) => a[0] === abaInicial) ? abaInicial : 'aulas';
    el('turmaConteudo').innerHTML = `
      <section class="fade-up bg-brand-hero text-white rounded-[1.75rem] p-6 md:p-8 relative overflow-hidden">
        <div class="absolute inset-0 bg-grid opacity-60"></div>
        <div class="relative">
          <p class="text-white/70 text-sm">${t.tipo === 'escola' ? 'Escola' : 'Professor'} · ${esc(t.instituicao)}${t.professor ? ` · Prof. ${esc(t.professor)}` : ''}</p>
          <h1 class="mt-1 text-3xl font-extrabold">${esc(t.nome)}</h1>
          ${t.descricao ? `<p class="mt-2 text-white/80">${esc(t.descricao)}</p>` : ''}
          ${t.gerencia ? `<div class="mt-4 flex flex-wrap items-center gap-2"><span class="text-sm text-white/70">Código da turma:</span><b class="font-mono tracking-widest bg-white/10 rounded-lg px-3 py-1">${esc(t.codigo)}</b><button type="button" id="btnCopiarTurma" class="text-sm font-semibold bg-white text-navy-900 rounded-lg px-3 py-1.5">Copiar link de convite</button></div>` : ''}
        </div>
      </section>
      <nav class="mt-5 flex gap-2 overflow-x-auto pb-1" aria-label="Seções da turma">
        ${abas.map(([k, n, ic]) => `<button type="button" data-aba-turma="${k}" class="shrink-0 inline-flex items-center gap-2 text-sm font-semibold rounded-full px-4 py-2 transition ${k === aba ? 'bg-navy-900 text-white' : 'bg-white border border-slate-200 text-navy-900 hover:border-navy-900'}">${Icone(ic, 'w-4 h-4')}${n}</button>`).join('')}
      </nav>
      <div id="turmaAba" class="mt-5"></div>`;
    el('btnCopiarTurma')?.addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(linkTurma(t.codigo)); App.toast('Link de convite copiado.'); } catch { prompt('Copie o link:', linkTurma(t.codigo)); }
    });
    el('turmaConteudo').querySelectorAll('[data-aba-turma]').forEach((b) => b.addEventListener('click', () => {
      history.replaceState(null, '', `#/turma?id=${id}&aba=${b.dataset.abaTurma}`);
      el('turmaConteudo').querySelectorAll('[data-aba-turma]').forEach((x) => { x.className = `shrink-0 inline-flex items-center gap-2 text-sm font-semibold rounded-full px-4 py-2 transition ${x === b ? 'bg-navy-900 text-white' : 'bg-white border border-slate-200 text-navy-900 hover:border-navy-900'}`; });
      abrirAba(b.dataset.abaTurma);
    }));
    abrirAba(aba);
  }

  function abrirAba(aba) {
    const raiz = el('turmaAba');
    if (aba === 'aulas') return abaAulas(raiz);
    if (aba === 'videos') return abaVideos(raiz);
    if (aba === 'mural') return Comunidade.montar(raiz, { escopo: 'turma', ref: atual.id, aviso: 'Só o professor e os alunos aprovados desta turma veem estas publicações.' });
    if (aba === 'alunos') return abaAlunos(raiz, atual.id);
  }

  async function abaAulas(raiz) {
    raiz.innerHTML = '<span class="spinner spinner-escuro"></span>';
    const { data, error } = await sb.rpc('aulas_turma', { p_turma: atual.id });
    if (error) { raiz.innerHTML = `<p class="text-red-700">${esc(error.message)}</p>`; return; }
    const agora = Date.now();
    raiz.innerHTML = `
      ${atual.gerencia ? `
      <form id="formAula" class="bg-white rounded-2xl border border-slate-200 p-5 grid gap-3 md:grid-cols-[1fr_auto_auto] md:items-end">
        <div><label for="aulaTitulo" class="block text-sm font-medium text-slate-600 mb-1">Título da aula</label><input id="aulaTitulo" maxlength="100" placeholder="Conversação: viagens" class="campo" /></div>
        <div><label for="aulaInicio" class="block text-sm font-medium text-slate-600 mb-1">Data e hora</label><input id="aulaInicio" type="datetime-local" class="campo" /></div>
        <div><label for="aulaDuracao" class="block text-sm font-medium text-slate-600 mb-1">Duração</label><select id="aulaDuracao" class="campo"><option value="30">30 min</option><option value="45">45 min</option><option value="60" selected>1 hora</option><option value="90">1h30</option><option value="120">2 horas</option></select></div>
        <div class="md:col-span-3"><label for="aulaLink" class="block text-sm font-medium text-slate-600 mb-1">Link próprio (opcional: Google Meet, Zoom, Teams). Em branco, usamos uma sala de vídeo gratuita (Jitsi).</label><input id="aulaLink" maxlength="300" placeholder="https://meet.google.com/…" class="campo" /></div>
        <button type="submit" class="md:col-span-3 font-semibold bg-navy-900 hover:bg-navy-800 text-white rounded-xl px-6 py-3 transition">Agendar aula ao vivo</button>
      </form>` : ''}
      <div class="mt-4 space-y-3">
        ${(data || []).length ? data.map((a) => {
          const ini = new Date(a.inicio).getTime(), fim = ini + a.duracao_min * 60e3;
          const aoVivo = agora >= ini - 10 * 60e3 && agora <= fim;
          return `
          <div class="bg-white rounded-2xl border ${aoVivo ? 'border-emerald-400' : 'border-slate-200'} p-5 flex flex-col sm:flex-row sm:items-center gap-4">
            <span class="w-12 h-12 shrink-0 rounded-xl ${aoVivo ? 'bg-emerald-600' : 'bg-navy-900'} text-white grid place-items-center">${Icone('camera', 'w-6 h-6')}</span>
            <div class="flex-1 min-w-0">
              <p class="font-bold text-navy-900">${esc(a.titulo)} ${aoVivo ? '<span class="ml-1 text-xs font-bold bg-emerald-100 text-emerald-800 rounded-full px-2 py-0.5">AO VIVO</span>' : ''}</p>
              <p class="text-sm text-slate-500">${dataHora(a.inicio)} · ${a.duracao_min} min · ${a.externo ? 'link do professor' : 'sala Jitsi'}</p>
            </div>
            <div class="shrink-0 flex gap-2">
              <a href="${esc(a.link)}" target="_blank" rel="noopener" class="font-semibold ${aoVivo ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-navy-900 hover:bg-navy-800'} text-white rounded-xl px-5 py-2.5 transition">Entrar na aula</a>
              ${atual.gerencia ? `<button type="button" data-excluir-aula="${a.id}" class="font-semibold border border-slate-200 text-slate-600 hover:text-red-700 rounded-xl px-3 py-2.5" aria-label="Excluir aula">${Icone('lixeira', 'w-4 h-4')}</button>` : ''}
            </div>
          </div>`;
        }).join('') : '<div class="bg-white rounded-2xl border border-dashed border-slate-300 p-8 text-center text-slate-500">Nenhuma aula ao vivo agendada.</div>'}
      </div>
      <p class="mt-3 text-xs text-slate-500">A sala abre numa nova aba. Na sala Jitsi, o professor entra primeiro e confirma o login (Google ou GitHub) para ser o moderador; os alunos entram direto.</p>`;
    el('formAula')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const titulo = el('aulaTitulo').value.trim(), inicio = el('aulaInicio').value;
      if (titulo.length < 2 || !inicio) return App.toast('Preencha o título, a data e a hora.');
      const { error: er } = await sb.rpc('salvar_aula', { p_turma: atual.id, p_id: null, p_titulo: titulo, p_inicio: new Date(inicio).toISOString(), p_duracao: Number(el('aulaDuracao').value), p_link: el('aulaLink').value.trim() || null });
      if (er) return App.toast(er.message);
      App.toast('Aula agendada.'); abaAulas(raiz);
    });
    raiz.querySelectorAll('[data-excluir-aula]').forEach((b) => b.addEventListener('click', async () => {
      if (!confirm('Excluir esta aula?')) return;
      const { error: er } = await sb.rpc('excluir_aula', { p_id: b.dataset.excluirAula });
      if (er) return App.toast(er.message);
      abaAulas(raiz);
    }));
  }

  async function abaVideos(raiz) {
    raiz.innerHTML = '<span class="spinner spinner-escuro"></span>';
    const { data, error } = await sb.rpc('videos_turma', { p_turma: atual.id });
    if (error) { raiz.innerHTML = `<p class="text-red-700">${esc(error.message)}</p>`; return; }
    raiz.innerHTML = `
      ${atual.gerencia ? `
      <form id="formVideo" class="bg-white rounded-2xl border border-slate-200 p-5 grid gap-3 md:grid-cols-2">
        <div><label for="vidTitulo" class="block text-sm font-medium text-slate-600 mb-1">Título</label><input id="vidTitulo" maxlength="120" placeholder="Aula gravada: Present Perfect" class="campo" /></div>
        <div><label for="vidUrl" class="block text-sm font-medium text-slate-600 mb-1">Link do vídeo (YouTube, Vimeo, Google Drive…)</label><input id="vidUrl" maxlength="300" placeholder="https://youtu.be/…" class="campo" /></div>
        <div class="md:col-span-2"><label for="vidDesc" class="block text-sm font-medium text-slate-600 mb-1">Descrição (opcional)</label><input id="vidDesc" maxlength="500" class="campo" /></div>
        <button type="submit" class="md:col-span-2 font-semibold bg-navy-900 hover:bg-navy-800 text-white rounded-xl px-6 py-3 transition">Publicar vídeo</button>
      </form>` : ''}
      <div class="mt-4 grid md:grid-cols-2 gap-4">
        ${(data || []).length ? data.map((v) => {
          const src = embed(v.url);
          return `
          <article class="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            ${src ? `<div class="aspect-video bg-navy-950"><iframe src="${esc(src)}" title="${esc(v.titulo)}" class="w-full h-full" loading="lazy" allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe></div>` : ''}
            <div class="p-4">
              <p class="font-bold text-navy-900">${esc(v.titulo)}</p>
              ${v.descricao ? `<p class="mt-1 text-sm text-slate-500">${esc(v.descricao)}</p>` : ''}
              <div class="mt-3 flex gap-2">
                ${src ? '' : `<a href="${esc(v.url)}" target="_blank" rel="noopener" class="font-semibold bg-navy-900 text-white rounded-xl px-4 py-2 text-sm">Abrir vídeo</a>`}
                ${atual.gerencia ? `<button type="button" data-excluir-video="${v.id}" class="text-sm font-semibold border border-slate-200 text-slate-600 hover:text-red-700 rounded-xl px-3 py-2">Excluir</button>` : ''}
              </div>
            </div>
          </article>`;
        }).join('') : '<div class="md:col-span-2 bg-white rounded-2xl border border-dashed border-slate-300 p-8 text-center text-slate-500">Nenhum vídeo publicado ainda.</div>'}
      </div>`;
    el('formVideo')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const titulo = el('vidTitulo').value.trim(), url = el('vidUrl').value.trim();
      if (titulo.length < 2 || !/^https:\/\//.test(url)) return App.toast('Preencha o título e um link que comece com https://');
      const { error: er } = await sb.rpc('salvar_video', { p_turma: atual.id, p_titulo: titulo, p_url: url, p_descricao: el('vidDesc').value.trim() || null });
      if (er) return App.toast(er.message);
      App.toast('Vídeo publicado.'); abaVideos(raiz);
    });
    raiz.querySelectorAll('[data-excluir-video]').forEach((b) => b.addEventListener('click', async () => {
      if (!confirm('Excluir este vídeo?')) return;
      const { error: er } = await sb.rpc('excluir_video', { p_id: b.dataset.excluirVideo });
      if (er) return App.toast(er.message);
      abaVideos(raiz);
    }));
  }

  // Alunos da turma (aprovar / recusar / remover) — usado aqui e no painel
  async function abaAlunos(raiz, turmaId, aoMudar) {
    raiz.innerHTML = '<span class="spinner spinner-escuro"></span>';
    const { data, error } = await sb.rpc('alunos_turma_edu', { p_turma: turmaId });
    if (error) { raiz.innerHTML = `<p class="text-red-700">${esc(error.message)}</p>`; return; }
    const pend = (data || []).filter((a) => a.status === 'pendente'), aprov = (data || []).filter((a) => a.status === 'aprovado');
    const linha = (a) => `
      <li class="flex items-center gap-3 py-3">
        <span class="w-9 h-9 rounded-full bg-navy-700 text-white font-bold grid place-items-center shrink-0">${esc((a.nome || '?').charAt(0).toUpperCase())}</span>
        <span class="flex-1 min-w-0"><span class="block font-semibold text-navy-900 truncate">${esc(a.nome)}</span><span class="block text-xs text-slate-500 truncate">${esc(a.email)}${a.nivel_num ? ` · Nível ${a.nivel_num}` : ''}</span></span>
        ${a.status === 'pendente' ? `
          <button type="button" data-decidir="aprovar" data-aluno="${a.id}" class="text-sm font-semibold bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg px-3 py-1.5">Aprovar</button>
          <button type="button" data-decidir="recusar" data-aluno="${a.id}" class="text-sm font-semibold border border-slate-200 text-slate-600 rounded-lg px-3 py-1.5">Recusar</button>`
        : `<button type="button" data-decidir="remover" data-aluno="${a.id}" class="text-sm font-semibold border border-slate-200 text-slate-600 hover:text-red-700 rounded-lg px-3 py-1.5">Remover</button>`}
      </li>`;
    raiz.innerHTML = `
      <div class="grid lg:grid-cols-2 gap-4">
        <section class="bg-white rounded-2xl border border-slate-200 p-5">
          <h3 class="font-bold text-navy-900">Pedidos de entrada <span class="text-sm font-semibold text-amber-700">${pend.length}</span></h3>
          ${App.modoApp() ? '' : '<p class="text-xs text-slate-500">Cada aluno aprovado entra na próxima fatura da instituição (escola: −10%; professor: −5%).</p>'}
          <ul class="mt-2 divide-y divide-slate-100">${pend.map(linha).join('') || '<li class="py-3 text-sm text-slate-500">Nenhum pedido pendente.</li>'}</ul>
          ${pend.length > 1 ? '<button type="button" id="btnAprovarTodos" class="mt-2 text-sm font-semibold text-emerald-800 hover:underline">Aprovar todos</button>' : ''}
        </section>
        <section class="bg-white rounded-2xl border border-slate-200 p-5">
          <h3 class="font-bold text-navy-900">Alunos aprovados <span class="text-sm font-semibold text-emerald-700">${aprov.length}</span></h3>
          <ul class="mt-2 divide-y divide-slate-100 max-h-[28rem] overflow-y-auto">${aprov.map(linha).join('') || '<li class="py-3 text-sm text-slate-500">Nenhum aluno aprovado ainda.</li>'}</ul>
        </section>
      </div>`;
    const decidir = async (aluno, acao) => {
      const { error: er } = await sb.rpc('decidir_aluno_turma', { p_turma: turmaId, p_aluno: aluno, p_acao: acao });
      if (er) App.toast(er.message);
    };
    raiz.querySelectorAll('[data-decidir]').forEach((b) => b.addEventListener('click', async () => {
      if (b.dataset.decidir === 'remover' && !confirm('Remover este aluno da turma? Ele perde o acesso liberado pela turma.')) return;
      await decidir(b.dataset.aluno, b.dataset.decidir);
      abaAlunos(raiz, turmaId, aoMudar); aoMudar?.();
    }));
    el('btnAprovarTodos')?.addEventListener('click', async () => {
      for (const a of pend) await decidir(a.id, 'aprovar');
      App.toast(`${pend.length} alunos aprovados.`);
      abaAlunos(raiz, turmaId, aoMudar); aoMudar?.();
    });
  }

  App.registrar('turmas', {
    async iniciar({ params }) {
      const p = await App.perfil(true);
      if (!p) { if (params.get('codigo')) App.gravarLocal('es_turma', params.get('codigo').toUpperCase()); location.hash = '#/entrar'; return false; }
      if (p.papel !== 'aluno') { location.hash = App.destino(p); return false; }
      await renderTurmasAluno(p, params.get('codigo'));
    },
  });
  App.registrar('turma', {
    async iniciar({ params }) {
      const p = await App.perfil(true);
      if (!p) { location.hash = '#/entrar'; return false; }
      return renderTurma(params.get('id'), params.get('aba'));
    },
  });

  return { abaAlunos, linkTurma, embed };
})();
