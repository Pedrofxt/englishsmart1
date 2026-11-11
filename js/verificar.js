// verificar.js — Página pública para conferir se um certificado é verdadeiro (#/verificar?c=CODIGO)

(() => {
  const el = (id) => document.getElementById(id);

  async function verificar(codigo) {
    const caixa = el('resultadoVerificar');
    codigo = String(codigo || '').trim().toUpperCase();
    if (!/^[A-Z0-9]{6,16}$/.test(codigo)) {
      caixa.innerHTML = '<p class="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3">Digite o código como está no certificado (de 6 a 16 letras e números).</p>';
      return;
    }
    caixa.innerHTML = '<p class="text-slate-500 inline-flex items-center gap-2"><span class="spinner spinner-escuro"></span>Conferindo…</p>';
    const { data, error } = await sb.rpc('verificar_certificado', { p_codigo: codigo });
    if (error) { caixa.innerHTML = `<p class="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3">${App.escapar(App.mensagemDeErro(error))}</p>`; return; }
    if (!data) {
      caixa.innerHTML = `
        <div id="certInvalido" class="anim-sobe bg-white rounded-2xl border-2 border-red-200 p-6 flex gap-4">
          <span class="w-12 h-12 shrink-0 rounded-xl bg-red-100 text-red-700 grid place-items-center">${Icone('x', 'w-6 h-6')}</span>
          <div><p class="font-display font-bold text-lg text-navy-900">Certificado não encontrado</p>
          <p class="mt-1 text-slate-500">Nenhum certificado do English Smart tem o código <b class="font-mono">${App.escapar(codigo)}</b>. Confira se digitou certo (O e 0, I e 1).</p></div>
        </div>`;
      return;
    }
    const final = data.nivel_num === 16;
    caixa.innerHTML = `
      <div id="certValido" class="anim-sobe bg-white rounded-2xl border-2 border-emerald-300 p-6 md:p-8">
        <div class="flex items-center gap-3 text-emerald-700 font-semibold">${Icone('check', 'w-6 h-6')}Certificado verdadeiro, emitido pelo English Smart</div>
        <dl class="mt-6 grid sm:grid-cols-2 gap-x-8 gap-y-4 text-sm">
          <div><dt class="text-slate-400">Aluno(a)</dt><dd class="mt-0.5 font-display text-xl font-bold text-navy-900">${App.escapar(data.nome)}</dd></div>
          <div><dt class="text-slate-400">Conclusão</dt><dd class="mt-0.5 font-semibold text-navy-900">${final ? 'Curso completo · 16 níveis (C2)' : `Nível ${data.nivel_num} de 16 · ${App.escapar(data.nivel || '')}`}</dd></div>
          <div><dt class="text-slate-400">Emitido em</dt><dd class="mt-0.5 font-semibold text-navy-900">${new Date(data.emitido_em).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}</dd></div>
          <div><dt class="text-slate-400">Código</dt><dd class="mt-0.5 font-mono font-semibold text-navy-900">${App.escapar(data.codigo)}</dd></div>
        </dl>
        <p class="mt-6 text-xs text-slate-400">Certificado de conclusão de curso livre de inglês, com níveis baseados no Quadro Europeu Comum de Referência (CEFR). Para conseguir o certificado, o aluno precisa de pelo menos 70% de acertos no teste do nível.</p>
      </div>`;
  }

  el('formVerificar').addEventListener('submit', (e) => {
    e.preventDefault();
    const c = el('codigoVerificar').value.trim().toUpperCase();
    history.replaceState(null, '', `#/verificar?c=${encodeURIComponent(c)}`);
    verificar(c);
  });

  App.registrar('verificar', {
    async iniciar({ params }) {
      const c = params.get('c') || '';
      el('codigoVerificar').value = c.toUpperCase();
      el('resultadoVerificar').innerHTML = '';
      if (c) verificar(c);
    },
  });
})();
