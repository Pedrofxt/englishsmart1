// dispositivos.js — Limite de 4 aparelhos por conta: tela de bloqueio e lista em "Meu perfil"

const Aparelhos = (() => {
  const el = (id) => document.getElementById(id);
  const LIMITE = 4;
  const quando = (d) => {
    const dias = Math.floor((Date.now() - new Date(d).getTime()) / 864e5);
    return dias <= 0 ? 'hoje' : dias === 1 ? 'ontem' : `há ${dias} dias`;
  };
  const icone = (nome) => (/celular|iPhone|iPad|Android|tablet/i.test(nome || '') ? 'celular' : 'computador');

  // Uma linha da lista de aparelhos
  function linha(d, { atual = false, podeRemover = true } = {}) {
    return `
      <li class="flex items-center gap-3 py-3">
        <span class="w-10 h-10 shrink-0 rounded-xl ${atual ? 'bg-navy-900 text-white' : 'bg-slate-100 text-slate-500'} grid place-items-center">${Icone(icone(d.nome), 'w-5 h-5')}</span>
        <span class="flex-1 min-w-0">
          <span class="block font-semibold text-navy-900 break-words leading-snug">${App.escapar(d.nome || 'Aparelho')}${atual ? ' <span class="ml-1 text-[11px] font-semibold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full align-middle">este aparelho</span>' : ''}</span>
          <span class="block text-xs text-slate-400">Último acesso ${quando(d.visto_em)}<span class="hidden sm:inline"> · conectado desde ${new Date(d.criado_em).toLocaleDateString('pt-BR')}</span></span>
        </span>
        ${!atual ? `<button data-remover="${App.escapar(d.id)}" ${podeRemover ? '' : 'disabled'} class="shrink-0 text-sm font-semibold border border-slate-200 hover:border-red-300 hover:text-red-700 disabled:opacity-40 disabled:pointer-events-none text-slate-600 rounded-xl px-4 py-2 transition">Remover</button>` : ''}
      </li>`;
  }

  async function remover(id, nome) {
    if (!confirm(`Remover "${nome}" da sua conta?\n\nEle precisará entrar de novo e vai ocupar uma vaga. Você pode remover até 3 aparelhos a cada 30 dias.`)) return false;
    const { error } = await sb.rpc('remover_dispositivo', { p_id: id, p_atual: DISPOSITIVO.id });
    if (error) { App.toast(error.message || 'Não foi possível remover agora.'); return false; }
    return true;
  }

  // ---------- Tela de bloqueio (#/dispositivos) ----------
  async function renderBloqueio(r) {
    const lista = r.dispositivos || [];
    const restantes = r.remocoes_restantes ?? 0;
    el('dispositivosConteudo').innerHTML = `
      <div class="reveal bg-white rounded-[2rem] border border-slate-200 shadow-sm p-7 md:p-10">
        <span class="w-14 h-14 rounded-2xl bg-amber-100 text-amber-700 grid place-items-center">${Icone('cadeado', 'w-7 h-7')}</span>
        <h1 class="mt-5 text-2xl md:text-3xl font-extrabold text-navy-900">Limite de ${LIMITE} aparelhos atingido</h1>
        <p class="mt-2 text-slate-500">Sua conta já está conectada em ${LIMITE} aparelhos. Para usar este aqui (<b class="text-navy-900">${App.escapar(DISPOSITIVO.nome)}</b>), remova um aparelho que você não usa mais.</p>
        <ul id="listaBloqueio" class="mt-6 divide-y divide-slate-100 border-y border-slate-100">${lista.map((d) => linha(d, { podeRemover: restantes > 0 })).join('')}</ul>
        <p class="mt-4 text-sm ${restantes ? 'text-slate-500' : 'text-amber-700'}">${restantes
          ? `Você pode remover mais <b>${restantes}</b> ${restantes === 1 ? 'aparelho' : 'aparelhos'} nos próximos 30 dias.`
          : `Você já removeu 3 aparelhos nos últimos 30 dias.${CONTATO_EMAIL ? ` Para liberar, escreva para <a class="font-semibold underline" href="mailto:${App.escapar(CONTATO_EMAIL)}">${App.escapar(CONTATO_EMAIL)}</a>.` : ''}`}
          Aparelhos sem uso por 60 dias saem da lista sozinhos.</p>
        <div class="mt-6 bg-slate-50 rounded-2xl p-4 text-sm text-slate-500 flex gap-3">${Icone('escudo', 'w-5 h-5 shrink-0 text-slate-400')}<span>A conta é pessoal: cada assinatura vale para uma pessoa, em até ${LIMITE} aparelhos dela. Compartilhar a senha não é permitido pelos <a href="#/termos" class="font-semibold underline">Termos de Uso</a>.</span></div>
        <button id="btnSairBloqueio" class="mt-6 w-full sm:w-auto font-semibold border border-slate-200 hover:border-navy-900 text-navy-900 rounded-xl px-6 py-3 transition">Sair desta conta</button>
      </div>`;
    el('btnSairBloqueio').addEventListener('click', () => App.sair());
    el('listaBloqueio').querySelectorAll('[data-remover]').forEach((b) => b.addEventListener('click', async () => {
      const nome = lista.find((d) => d.id === b.dataset.remover)?.nome || 'aparelho';
      setLoading(b, true);
      if (!(await remover(b.dataset.remover, nome))) return setLoading(b, false, 'Remover');
      const novo = await App.checarAparelho(true);
      if (novo.ok) {
        App.limparPerfil();
        App.toast('Aparelho removido. Este aparelho foi liberado.');
        location.hash = App.destino(await App.perfil(true));
      } else renderBloqueio(novo);
    }));
    revelar(el('dispositivosConteudo'));
  }

  App.registrar('dispositivos', {
    async iniciar() {
      const p = await App.perfil();
      if (!p) { location.hash = '#/entrar'; return false; }
      const r = p.papel === 'aluno' ? await App.checarAparelho(true) : { ok: true };
      if (r.ok) { App.limparPerfil(); location.hash = App.destino(await App.perfil(true)); return false; }
      await renderBloqueio(r);
    },
  });

  // ---------- Seção "Meus aparelhos" no perfil ----------
  async function desenharNoPerfil(alunoId) {
    const caixa = el('perfilAparelhos');
    if (!caixa) return;
    const [{ data: lista }, { data: remocoes }] = await Promise.all([
      sb.from('dispositivos').select('*').eq('aluno_id', alunoId),
      sb.from('dispositivos_remocoes').select('*').eq('aluno_id', alunoId),
    ]);
    const itens = (lista || []).sort((a, b) => (b.id === DISPOSITIVO.id) - (a.id === DISPOSITIVO.id) || new Date(b.visto_em) - new Date(a.visto_em));
    const feitas = (remocoes || []).filter((x) => Date.now() - new Date(x.removido_em).getTime() < 30 * 864e5).length;
    const restantes = Math.max(0, 3 - feitas);
    el('perfilAparelhosTotal').textContent = `${itens.length} de ${LIMITE}`;
    caixa.innerHTML = `
      <ul class="divide-y divide-slate-100">${itens.map((d) => linha(d, { atual: d.id === DISPOSITIVO.id, podeRemover: restantes > 0 })).join('')}</ul>
      <p class="mt-3 text-xs text-slate-400">Sua conta pode ficar conectada em até ${LIMITE} aparelhos. Sair da conta não libera a vaga; remova aqui os que você não usa mais (até 3 a cada 30 dias, restam ${restantes}). Aparelhos sem uso por 60 dias saem sozinhos.</p>`;
    caixa.querySelectorAll('[data-remover]').forEach((b) => b.addEventListener('click', async () => {
      const nome = itens.find((d) => d.id === b.dataset.remover)?.nome || 'aparelho';
      setLoading(b, true);
      if (await remover(b.dataset.remover, nome)) { App.toast('Aparelho removido.'); desenharNoPerfil(alunoId); }
      else setLoading(b, false, 'Remover');
    }));
  }

  return { desenharNoPerfil, LIMITE };
})();
