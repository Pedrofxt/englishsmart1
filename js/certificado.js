// certificado.js — Certificado de conclusão de nível (imprimível / salvar em PDF)

(() => {
  const el = (id) => document.getElementById(id);

  document.getElementById('btnImprimir').addEventListener('click', () => window.print());

  App.registrar('certificado', {
    async iniciar({ params }) {
      const p = await App.perfil(true);
      if (!p) { location.hash = '#/entrar'; return false; }
      if (p.papel !== 'aluno') { App.toast('Certificados são emitidos para alunos.'); location.hash = '#/admin'; return false; }

      const n = Number(params.get('n'));
      const { certificados } = await App.dadosDoAluno(p.id);
      const c = certificados.find((x) => x.nivel_num === n);
      if (!c) { App.toast('Você ainda não tem o certificado deste nível.'); location.hash = `#/curso?n=${n || ''}`; return false; }

      const info = nivelInfo(n);
      const k = faixaDoNivel(n);
      const faixa = FAIXAS[k];
      const final = n === 16;
      const data = new Date(c.emitido_em).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });

      el('certificadoArea').innerHTML = `
        <div class="certificado relative bg-white shadow-card overflow-hidden" style="width:1123px;height:794px">
          <div class="absolute inset-0 border-[18px] border-navy-900"></div>
          <div class="absolute inset-[18px] border-2 border-brand-red/60"></div>
          <div class="absolute -right-32 -top-32 w-96 h-96 rounded-full bg-brand-red/10"></div>
          <div class="absolute -left-24 -bottom-24 w-80 h-80 rounded-full bg-navy-600/10"></div>

          <div class="relative h-full flex flex-col items-center justify-center text-center px-24">
            <div class="bg-navy-900 rounded-2xl px-6 py-3"><img src="img/logo.png" alt="English Smart" class="h-16 w-auto" /></div>
            <p class="mt-8 text-sm font-bold uppercase tracking-[0.35em] text-brand-red">${final ? 'Certificado de conclusão do curso' : 'Certificado de conclusão de nível'}</p>
            <p class="mt-6 text-lg text-slate-500">Certificamos que</p>
            <p class="mt-2 font-display text-5xl font-extrabold text-navy-900">${App.escapar(p.nome)}</p>
            <div class="mt-4 w-40 h-1 rounded-full bg-brand-red"></div>
            <p class="mt-6 text-lg text-slate-600 max-w-3xl leading-relaxed">
              ${final
                ? 'concluiu os <b class="text-navy-900">16 níveis</b> do Curso de Inglês Inteligente, alcançando o estágio <b class="text-navy-900">C2 · Proficiente</b> do Quadro Europeu Comum de Referência (CEFR).'
                : `concluiu o <b class="text-navy-900">Nível ${n} · ${App.escapar(info.tema)}</b> do Curso de Inglês Inteligente, estágio <b class="text-navy-900">${k} · ${faixa.nome}</b> do Quadro Europeu Comum de Referência (CEFR).`}
            </p>
            <p class="mt-3 text-slate-500 max-w-3xl">Demonstrou ser capaz de ${App.escapar(info.objetivo)}.</p>

            <div class="mt-12 w-full flex items-end justify-between">
              <div class="text-left">
                <p class="text-xs uppercase tracking-widest text-slate-400">Emitido em</p>
                <p class="font-semibold text-navy-900">${data}</p>
              </div>
              <div class="flex flex-col items-center">
                <span class="w-20 h-20 rounded-full ${faixa.cor} text-white grid place-items-center font-display font-extrabold text-2xl ring-8 ring-white shadow-card">${k}</span>
                <p class="mt-2 text-xs font-semibold text-slate-500">Nível ${n} de 16</p>
              </div>
              <div class="text-right">
                <p class="text-xs uppercase tracking-widest text-slate-400">Código de verificação</p>
                <p class="font-mono font-semibold text-navy-900">${App.escapar(c.codigo)}</p>
                <p class="text-[11px] text-slate-400">Confira em ${App.escapar(SITE_URL.replace(/^https:\/\//, ''))}/#/verificar</p>
              </div>
            </div>
          </div>
        </div>`;
    },
  });
})();
