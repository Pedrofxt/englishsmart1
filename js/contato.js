// contato.js — Fale conosco: sugestão, reclamação, elogio ou denúncia, sempre com um e-mail para a equipe responder.
// Contato.abrir() abre a janela; com { post } ou { comentario } a mensagem vai ligada àquela publicação da comunidade.

const Contato = (() => {
  const TIPOS = [
    ['sugestao', 'Sugestão', 'brilho', 'Uma ideia para melhorar o English Smart'],
    ['reclamacao', 'Reclamação', 'alerta', 'Algo não funcionou como deveria'],
    ['elogio', 'Elogio', 'estrela', 'Conte o que você gostou'],
    ['denuncia', 'Denúncia', 'bandeira', 'Conteúdo ou comportamento impróprio'],
  ];
  const ROTULO = Object.fromEntries(TIPOS.map(([k, n]) => [k, n]));

  async function abrir({ tipo = null, post = null, comentario = null } = {}) {
    const esc = App.escapar;
    const p = await App.perfil().catch(() => null);
    const emailConta = p?.email || '';
    const ligado = post || comentario;
    const inicial = tipo || (ligado ? 'denuncia' : 'sugestao');

    const fundo = document.createElement('div');
    fundo.className = 'fixed inset-0 z-[90] bg-navy-950/60 backdrop-blur-sm grid place-items-center p-4 overflow-y-auto';
    fundo.innerHTML = `
      <form role="dialog" aria-modal="true" aria-labelledby="ctoTitulo" class="w-full max-w-lg bg-white rounded-2xl shadow-card p-6 space-y-4 my-auto" novalidate>
        <div class="flex items-start justify-between gap-3">
          <div><h2 id="ctoTitulo" class="text-xl font-bold text-navy-900">${ligado ? `Sobre ${comentario ? 'este comentário' : 'esta publicação'}` : 'Fale conosco'}</h2>
            <p class="mt-1 text-sm text-slate-500">Escolha o tipo da mensagem. A equipe English Smart lê todas e responde pelo e-mail informado.</p></div>
          <button type="button" data-fechar class="shrink-0 w-9 h-9 grid place-items-center rounded-full hover:bg-slate-100 text-slate-500" aria-label="Fechar">${Icone('x', 'w-5 h-5')}</button>
        </div>
        <fieldset>
          <legend class="block text-sm font-medium text-slate-600 mb-2">Tipo</legend>
          <div class="grid grid-cols-2 gap-2">
            ${TIPOS.map(([k, n, ic, d]) => `
              <label class="tipo-msg cursor-pointer">
                <input type="radio" name="ctoTipo" value="${k}" class="sr-only" ${k === inicial ? 'checked' : ''} />
                <span class="flex items-start gap-2 h-full border-2 border-slate-200 rounded-xl p-3 transition">
                  <span class="mt-0.5 text-navy-700">${Icone(ic, 'w-4 h-4')}</span>
                  <span><span class="block text-sm font-semibold text-navy-900">${n}</span><span class="block text-xs text-slate-500 leading-snug">${d}</span></span>
                </span>
              </label>`).join('')}
          </div>
        </fieldset>
        <div>
          <label for="ctoMsg" class="block text-sm font-medium text-slate-600 mb-1.5">Mensagem${ligado ? ' (opcional)' : ''}</label>
          <textarea id="ctoMsg" rows="5" maxlength="2000" class="campo resize-y" placeholder="${ligado ? 'Conte o que há de errado (opcional)' : 'Escreva aqui com o máximo de detalhes'}"></textarea>
          <p class="mt-1 text-right text-xs text-slate-400"><span data-cont>0</span>/2000</p>
        </div>
        ${p ? '' : `<div><label for="ctoNome" class="block text-sm font-medium text-slate-600 mb-1.5">Seu nome (opcional)</label><input id="ctoNome" maxlength="80" autocomplete="name" class="campo" /></div>`}
        <div class="bg-slate-50 border border-slate-200 rounded-xl p-4">
          <label for="ctoEmail" class="block text-sm font-semibold text-navy-900 mb-1">E-mail para contato</label>
          <p class="text-xs text-slate-500 mb-2">Vai anexado à mensagem para a equipe responder você.${p ? ' Já preenchemos com o e-mail da sua conta; troque se preferir outro.' : ''}</p>
          <input id="ctoEmail" type="email" maxlength="200" autocomplete="email" inputmode="email" value="${esc(emailConta)}" class="campo bg-white" required />
        </div>
        <p data-erro class="hidden text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3" role="alert"></p>
        <div class="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
          <button type="button" data-fechar class="font-semibold border border-slate-200 hover:border-navy-900 text-navy-900 rounded-xl px-5 py-2.5 transition">Cancelar</button>
          <button type="submit" class="btn-shine font-semibold bg-brand-red hover:bg-brand-redDark text-white rounded-xl px-5 py-2.5 transition">Enviar mensagem</button>
        </div>
      </form>`;
    document.body.appendChild(fundo);
    const form = fundo.querySelector('form');
    const erro = fundo.querySelector('[data-erro]');
    const msg = fundo.querySelector('#ctoMsg');
    const fechar = () => { fundo.remove(); document.removeEventListener('keydown', tecla); };
    const tecla = (e) => { if (e.key === 'Escape') fechar(); };
    document.addEventListener('keydown', tecla);
    fundo.querySelectorAll('[data-fechar]').forEach((b) => b.addEventListener('click', fechar));
    fundo.addEventListener('click', (e) => { if (e.target === fundo) fechar(); });
    msg.addEventListener('input', () => { fundo.querySelector('[data-cont]').textContent = msg.value.length; });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      erro.classList.add('hidden');
      const tipoEsc = form.querySelector('[name=ctoTipo]:checked')?.value;
      const email = fundo.querySelector('#ctoEmail').value.trim();
      const texto = msg.value.trim();
      const falha = (t) => { erro.textContent = t; erro.classList.remove('hidden'); };
      if (!tipoEsc) return falha('Escolha o tipo da mensagem.');
      if (!ligado && texto.length < 5) return falha('Escreva a sua mensagem.');
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return falha('Informe um e-mail válido para entrarmos em contato.');
      const bt = form.querySelector('[type=submit]');
      setLoading(bt, true);
      const { error } = await sb.rpc('enviar_manifestacao', {
        p_tipo: tipoEsc, p_mensagem: texto, p_email: email,
        p_nome: fundo.querySelector('#ctoNome')?.value.trim() || null,
        p_post: post || null, p_comentario: comentario || null,
      });
      setLoading(bt, false, 'Enviar mensagem');
      if (error) return falha(App.mensagemDeErro ? App.mensagemDeErro(error) : error.message);
      fechar();
      App.toast(tipoEsc === 'elogio' ? 'Obrigado pelo elogio! A equipe vai adorar ler.' : tipoEsc === 'denuncia' ? 'Denúncia enviada. A equipe vai analisar.' : 'Mensagem enviada! Vamos responder no seu e-mail.');
    });
    setTimeout(() => form.querySelector('[name=ctoTipo]:checked')?.focus(), 30);
  }

  return { abrir, ROTULO, TIPOS };
})();
