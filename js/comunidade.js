// comunidade.js — Comunidade pública, da escola e da turma
// Comunidade.montar(elemento, { escopo: 'publica'|'escola'|'turma', ref, titulo }) desenha o mural.
// Tela #/comunidade: abas com as comunidades que o usuário participa.

const Comunidade = (() => {
  const el = (id) => document.getElementById(id);
  const esc = (t) => App.escapar(t ?? '');
  const quando = (d) => {
    const s = Math.round((Date.now() - new Date(d).getTime()) / 1000);
    if (s < 60) return 'agora';
    if (s < 3600) return `há ${Math.floor(s / 60)} min`;
    if (s < 86400) return `há ${Math.floor(s / 3600)} h`;
    if (s < 7 * 86400) return `há ${Math.floor(s / 86400)} d`;
    return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  };
  const SELO = { escola: ['Escola', 'bg-indigo-100 text-indigo-800'], professor: ['Professor', 'bg-emerald-100 text-emerald-800'], equipe: ['Equipe', 'bg-red-100 text-red-800'] };
  // links clicáveis no texto (só https)
  const comLinks = (t) => esc(t).replace(/(https:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer" class="underline text-navy-600 break-all">$1</a>').replace(/\n/g, '<br>');

  function avatar(a) {
    const ini = (a?.nome || '?').trim().charAt(0).toUpperCase();
    if (a?.avatar && /^https:\/\//.test(a.avatar)) return `<img src="${esc(a.avatar)}" alt="" class="w-10 h-10 rounded-full object-cover shrink-0" referrerpolicy="no-referrer" />`;
    const cor = { escola: 'bg-indigo-600', professor: 'bg-emerald-700', equipe: 'bg-brand-red' }[a?.papel] || 'bg-navy-700';
    return `<span class="w-10 h-10 rounded-full ${cor} text-white font-bold grid place-items-center shrink-0">${esc(ini)}</span>`;
  }

  function cartao(p) {
    const selo = SELO[p.autor?.papel];
    return `
      <article data-post="${p.id}" class="bg-white rounded-2xl border ${p.fixado ? 'border-amber-300' : 'border-slate-200'} p-4 md:p-5">
        ${p.fixado ? `<p class="mb-2 inline-flex items-center gap-1.5 text-xs font-bold text-amber-800">${Icone('estrela', 'w-3.5 h-3.5')} Fixado</p>` : ''}
        <header class="flex items-start gap-3">
          ${avatar(p.autor)}
          <div class="flex-1 min-w-0">
            <p class="font-semibold text-navy-900 truncate">${esc(p.autor?.nome || 'Usuário')} ${selo ? `<span class="ml-1 align-middle text-[11px] font-bold rounded-full px-2 py-0.5 ${selo[1]}">${selo[0]}</span>` : ''}</p>
            <p class="text-xs text-slate-500">${quando(p.criado_em)}</p>
          </div>
          <div class="relative">
            <button type="button" data-mais aria-label="Mais opções" class="w-8 h-8 grid place-items-center rounded-lg text-slate-500 hover:bg-slate-100"><svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg></button>
            <div data-menu class="hidden absolute right-0 top-9 z-10 w-44 bg-white border border-slate-200 rounded-xl shadow-card py-1 text-sm">
              ${p.pode_fixar ? `<button type="button" data-fixar="${p.fixado ? 0 : 1}" class="w-full text-left px-3 py-2 hover:bg-slate-50">${p.fixado ? 'Desafixar' : 'Fixar no topo'}</button>` : ''}
              ${p.pode_apagar ? '<button type="button" data-apagar class="w-full text-left px-3 py-2 text-red-700 hover:bg-red-50">Apagar</button>' : ''}
              ${p.meu ? '' : '<button type="button" data-denunciar class="w-full text-left px-3 py-2 hover:bg-slate-50">Denunciar ou comentar com a equipe</button>'}
            </div>
          </div>
        </header>
        <p class="mt-3 text-slate-700 leading-relaxed break-words">${comLinks(p.texto)}</p>
        <footer class="mt-3 flex items-center gap-2 text-sm">
          <button type="button" data-curtir class="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-semibold ${p.curti ? 'bg-red-50 text-brand-red' : 'text-slate-500 hover:bg-slate-100'}"><svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 21s-7.5-4.6-10-9.3C.4 8.4 2.2 4.5 6 4.5c2.1 0 3.4 1.1 4.2 2.3l1.8 2.4 1.8-2.4c.8-1.2 2.1-2.3 4.2-2.3 3.8 0 5.6 3.9 4 7.2C19.5 16.4 12 21 12 21z"/></svg> <span data-qtd>${p.curtidas}</span></button>
          <button type="button" data-comentar class="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-semibold text-slate-500 hover:bg-slate-100">${Icone('conversa', 'w-4 h-4')} <span data-qtd-com>${p.comentarios}</span></button>
        </footer>
        <div data-comentarios class="hidden mt-3 border-t border-slate-100 pt-3 space-y-3"></div>
      </article>`;
  }

  function montar(raiz, { escopo, ref = null, titulo = '', aviso = '' }) {
    let ultimo = null;
    raiz.innerHTML = `
      ${titulo ? `<h2 class="text-xl font-bold text-navy-900">${esc(titulo)}</h2>` : ''}
      ${aviso ? `<p class="mt-1 text-sm text-slate-500">${aviso}</p>` : ''}
      <form data-novo class="mt-4 bg-white rounded-2xl border border-slate-200 p-4">
        <label class="sr-only" for="txt-${escopo}">Escreva uma publicação</label>
        <textarea id="txt-${escopo}" maxlength="2000" rows="3" placeholder="${escopo === 'publica' ? 'Compartilhe uma dúvida, uma dica ou uma conquista com toda a comunidade…' : 'Escreva para a turma: avisos, dúvidas, links de material…'}" class="campo resize-y"></textarea>
        <div class="mt-2 flex items-center justify-between gap-3">
          <p class="text-xs text-slate-500">Seja gentil. Não compartilhe dados pessoais (telefone, endereço).</p>
          <button type="submit" class="shrink-0 font-semibold bg-navy-900 hover:bg-navy-800 text-white rounded-xl px-5 py-2.5 transition">Publicar</button>
        </div>
      </form>
      <div data-lista class="mt-4 space-y-3"><div class="py-10 grid place-items-center"><span class="spinner spinner-escuro"></span></div></div>
      <button type="button" data-mais-posts class="hidden mt-4 w-full font-semibold border border-slate-200 bg-white text-navy-900 rounded-xl py-3 hover:border-navy-900">Ver mais</button>`;
    const lista = raiz.querySelector('[data-lista]');
    const maisBtn = raiz.querySelector('[data-mais-posts]');

    async function carregar(append = false) {
      const { data, error } = await sb.rpc('listar_posts', { p_escopo: escopo, p_ref: ref, p_antes: append ? ultimo : null });
      if (error) { lista.innerHTML = `<p class="text-sm text-red-700">${esc(error.message)}</p>`; return; }
      const posts = data || [];
      if (!append) lista.innerHTML = '';
      if (!posts.length && !append) lista.innerHTML = '<div class="bg-white rounded-2xl border border-dashed border-slate-300 p-8 text-center text-slate-500">Nenhuma publicação ainda. Que tal começar a conversa?</div>';
      lista.insertAdjacentHTML('beforeend', posts.map(cartao).join(''));
      ultimo = posts.length ? Math.min(...posts.filter((p) => !p.fixado).map((p) => p.id).concat([ultimo || Infinity])) : ultimo;
      maisBtn.classList.toggle('hidden', posts.length < 20);
    }

    raiz.querySelector('[data-novo]').addEventListener('submit', async (e) => {
      e.preventDefault();
      const ta = e.currentTarget.querySelector('textarea');
      const texto = ta.value.trim();
      if (!texto) return;
      const b = e.currentTarget.querySelector('[type=submit]');
      setLoading(b, true);
      const { error } = await sb.rpc('publicar_post', { p_escopo: escopo, p_ref: ref, p_texto: texto });
      setLoading(b, false, 'Publicar');
      if (error) return App.toast(error.message);
      ta.value = '';
      if (typeof Som !== 'undefined') Som.tocar('acerto');
      ultimo = null;
      carregar();
    });
    maisBtn.addEventListener('click', () => carregar(true));

    lista.addEventListener('click', async (e) => {
      const art = e.target.closest('[data-post]');
      if (!art) return;
      const id = Number(art.dataset.post);
      const alvo = e.target.closest('button');
      if (!alvo) return;
      if (alvo.matches('[data-mais]')) { art.querySelector('[data-menu]').classList.toggle('hidden'); return; }
      art.querySelector('[data-menu]')?.classList.add('hidden');
      if (alvo.matches('[data-curtir]')) {
        const { data: curtiu, error } = await sb.rpc('curtir_post', { p_id: id });
        if (error) return App.toast(error.message);
        const q = alvo.querySelector('[data-qtd]');
        q.textContent = Number(q.textContent) + (curtiu ? 1 : -1);
        alvo.className = `inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-semibold ${curtiu ? 'bg-red-50 text-brand-red' : 'text-slate-500 hover:bg-slate-100'}`;
      } else if (alvo.matches('[data-apagar]')) {
        if (!confirm('Apagar esta publicação?')) return;
        const { error } = await sb.rpc('apagar_post', { p_id: id });
        if (error) return App.toast(error.message);
        art.remove();
      } else if (alvo.matches('[data-fixar]')) {
        const { error } = await sb.rpc('fixar_post', { p_id: id, p_fixar: alvo.dataset.fixar === '1' });
        if (error) return App.toast(error.message);
        ultimo = null; carregar();
      } else if (alvo.matches('[data-denunciar]')) {
        Contato.abrir({ post: id });
      } else if (alvo.matches('[data-comentar]')) {
        const box = art.querySelector('[data-comentarios]');
        if (!box.classList.contains('hidden')) { box.classList.add('hidden'); return; }
        box.classList.remove('hidden');
        await desenharComentarios(box, id, art);
      }
    });

    async function desenharComentarios(box, id, art) {
      box.innerHTML = '<span class="spinner spinner-escuro"></span>';
      const { data, error } = await sb.rpc('listar_comentarios', { p_post: id });
      if (error) { box.innerHTML = `<p class="text-sm text-red-700">${esc(error.message)}</p>`; return; }
      box.innerHTML = `
        ${(data || []).map((c) => `
          <div class="flex items-start gap-2.5" data-com="${c.id}">
            ${avatar(c.autor).replace(/w-10 h-10/g, 'w-8 h-8')}
            <div class="flex-1 min-w-0 bg-slate-50 rounded-xl px-3 py-2">
              <p class="text-sm"><b class="text-navy-900">${esc(c.autor?.nome || 'Usuário')}</b> <span class="text-xs text-slate-500">${quando(c.criado_em)}</span></p>
              <p class="text-sm text-slate-700 break-words">${comLinks(c.texto)}</p>
            </div>
            ${c.pode_apagar ? `<button type="button" data-apagar-com="${c.id}" class="text-xs text-slate-500 hover:text-red-700 px-1" aria-label="Apagar comentário">${Icone('x', 'w-3.5 h-3.5')}</button>` : `<button type="button" data-denunciar-com="${c.id}" class="text-xs text-slate-500 hover:text-navy-900 px-1" title="Denunciar ou falar com a equipe" aria-label="Denunciar comentário">${Icone('bandeira', 'w-3.5 h-3.5')}</button>`}
          </div>`).join('')}
        <form data-form-com class="flex gap-2">
          <label class="sr-only" for="com-${id}">Comentário</label>
          <input id="com-${id}" maxlength="1000" placeholder="Escreva um comentário…" class="campo !py-2" />
          <button type="submit" class="shrink-0 font-semibold bg-navy-900 text-white rounded-xl px-4">Enviar</button>
        </form>`;
      box.querySelector('[data-form-com]').addEventListener('submit', async (e) => {
        e.preventDefault();
        const inp = e.currentTarget.querySelector('input');
        if (!inp.value.trim()) return;
        const { error } = await sb.rpc('comentar', { p_post: id, p_texto: inp.value.trim() });
        if (error) return App.toast(error.message);
        const q = art.querySelector('[data-qtd-com]'); q.textContent = Number(q.textContent) + 1;
        desenharComentarios(box, id, art);
      });
      box.querySelectorAll('[data-apagar-com]').forEach((b) => b.addEventListener('click', async () => {
        const { error } = await sb.rpc('apagar_comentario', { p_id: Number(b.dataset.apagarCom) });
        if (error) return App.toast(error.message);
        const q = art.querySelector('[data-qtd-com]'); q.textContent = Math.max(0, Number(q.textContent) - 1);
        desenharComentarios(box, id, art);
      }));
      box.querySelectorAll('[data-denunciar-com]').forEach((b) => b.addEventListener('click', async () => {
        Contato.abrir({ comentario: Number(b.dataset.denunciarCom) });
      }));
    }

    carregar();
  }

  // ---------- Tela #/comunidade ----------
  async function abas(p) {
    const lista = [{ escopo: 'publica', ref: null, nome: 'Pública', titulo: 'Comunidade English Smart', aviso: 'Aberta a todos os alunos, professores e escolas da plataforma.' }];
    if (p.papel === 'educador') {
      const inst = p.instituicao || (p.vinculo?.status === 'aprovado' ? p.vinculo : null);
      if (inst) lista.push({ escopo: 'escola', ref: inst.id, nome: inst.tipo === 'professor' ? 'Meus alunos' : 'Escola', titulo: inst.nome, aviso: 'Só para a escola, os professores e os alunos aprovados nas turmas.' });
      const { data: turmas } = await sb.rpc('minhas_turmas_edu');
      (turmas || []).forEach((t) => lista.push({ escopo: 'turma', ref: t.id, nome: t.nome, titulo: `Turma ${t.nome}`, aviso: 'Só o professor e os alunos aprovados desta turma veem.' }));
    } else if (p.papel === 'aluno') {
      const aprovadas = (p.turmasEdu || []).filter((t) => t.status === 'aprovado');
      const insts = [...new Map(aprovadas.map((t) => [t.instituicao_id, t])).values()];
      insts.forEach((t) => lista.push({ escopo: 'escola', ref: t.instituicao_id, nome: t.tipo === 'escola' ? t.instituicao : `Prof. ${t.instituicao}`, titulo: t.instituicao, aviso: 'Só para a escola, os professores e os alunos aprovados.' }));
      aprovadas.forEach((t) => lista.push({ escopo: 'turma', ref: t.id, nome: t.nome, titulo: `Turma ${t.nome}`, aviso: 'Só o professor e os alunos desta turma veem.' }));
    }
    return lista;
  }

  App.registrar('comunidade', {
    async iniciar({ params }) {
      const p = await App.perfil(true);
      if (!p) { location.hash = '#/entrar'; return false; }
      el('comunidadeVoltar').href = p.papel === 'educador' ? '#/escola' : p.papel === 'admin' ? '#/admin' : '#/curso';
      const lista = await abas(p);
      const sel = Math.max(0, lista.findIndex((a) => a.escopo === params.get('escopo') && (a.ref || '') === (params.get('ref') || '')));
      el('comunidadeAbas').innerHTML = lista.map((a, i) => `<button type="button" data-aba-com="${i}" class="shrink-0 text-sm font-semibold rounded-full px-4 py-2 transition ${i === sel ? 'bg-navy-900 text-white' : 'bg-white border border-slate-200 text-navy-900 hover:border-navy-900'}">${esc(a.nome)}</button>`).join('');
      const abrir = (i) => {
        el('comunidadeAbas').querySelectorAll('[data-aba-com]').forEach((b) => { b.className = `shrink-0 text-sm font-semibold rounded-full px-4 py-2 transition ${Number(b.dataset.abaCom) === i ? 'bg-navy-900 text-white' : 'bg-white border border-slate-200 text-navy-900 hover:border-navy-900'}`; });
        montar(el('comunidadeMural'), lista[i]);
      };
      el('comunidadeAbas').querySelectorAll('[data-aba-com]').forEach((b) => b.addEventListener('click', () => abrir(Number(b.dataset.abaCom))));
      abrir(sel);
    },
  });

  return { montar };
})();
