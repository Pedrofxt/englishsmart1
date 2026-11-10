// termos.js — Termos de Uso e Política de Privacidade (com os dados do responsável definidos em config.js)

(() => {
  const el = (id) => document.getElementById(id);
  const ATIVA = 'bg-white text-navy-900 shadow';
  const INATIVA = 'text-slate-500 hover:text-navy-900';

  // Preenche nome, documento e contato do responsável
  (() => {
    const pendente = (t) => `<span class="bg-amber-100 text-amber-800 px-1 rounded">${t}</span>`;
    document.querySelectorAll('[data-resp-nome]').forEach((x) => {
      x.innerHTML = RESPONSAVEL_NOME ? App.escapar(RESPONSAVEL_NOME) : pendente('[nome do responsável]');
    });
    document.querySelectorAll('[data-resp-doc]').forEach((x) => {
      x.textContent = RESPONSAVEL_DOC ? `, inscrito(a) sob o nº ${RESPONSAVEL_DOC}` : '';
    });
    document.querySelectorAll('[data-contato]').forEach((x) => {
      x.innerHTML = CONTATO_EMAIL
        ? `<a href="mailto:${App.escapar(CONTATO_EMAIL)}" class="text-navy-600 underline">${App.escapar(CONTATO_EMAIL)}</a>`
        : pendente('[e-mail de contato]');
    });
  })();

  App.registrar('termos', {
    async iniciar({ params }) {
      const privacidade = params.get('aba') === 'privacidade';
      el('textoTermos').classList.toggle('hidden', privacidade);
      el('textoPrivacidade').classList.toggle('hidden', !privacidade);
      el('abaTermos').className = `text-center px-5 py-2.5 rounded-xl text-sm font-semibold transition ${privacidade ? INATIVA : ATIVA}`;
      el('abaPrivacidade').className = `text-center px-5 py-2.5 rounded-xl text-sm font-semibold transition ${privacidade ? ATIVA : INATIVA}`;
      let p = null;
      try { p = await App.perfil(); } catch { /* sem internet: a página funciona mesmo assim */ }
      el('termosVoltar').href = p ? App.destino(p) : '#/';
    },
  });
})();
