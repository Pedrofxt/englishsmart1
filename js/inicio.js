// inicio.js — Página inicial: cartão animado e botão "Entrar / Minha área"

App.registrar('inicio', {
  async iniciar() {
    // Se já estiver logado, o topo mostra o atalho para a área certa
    try {
      const p = await App.perfil();
      const link = document.getElementById('linkConta');
      const criar = document.getElementById('linkCriar');
      const criarCelular = document.querySelector('[data-view="inicio"] nav a[href="#/cadastro"]');
      if (p) {
        link.href = App.destino(p);
        link.querySelector('span').textContent = p.papel === 'admin' ? 'Portal' : 'Minha área';
        link.querySelector('svg')?.classList.add('hidden');
        criar.classList.add('sm:hidden');
        criarCelular?.classList.add('hidden');
      } else {
        link.href = '#/entrar';
        link.querySelector('span').textContent = 'Entrar';
        link.querySelector('svg')?.classList.remove('hidden');
        criar.classList.remove('sm:hidden');
        criarCelular?.classList.remove('hidden');
      }
      App.atualizarAvatares(p);
      desenharPlanos(p);
    } catch { desenharPlanos(null); /* sem internet: a página inicial funciona mesmo assim */ }
  },
});

// Seção "Planos" da página inicial
function desenharPlanos(p) {
  const grade = document.getElementById('gradePlanos');
  const botao = (href, texto, cls) => `<a href="${href}" class="mt-8 text-center font-semibold rounded-xl py-3.5 transition ${cls}">${texto}</a>`;
  const aluno = p?.papel === 'aluno';
  grade.innerHTML = Planos.cartoes({
    acao: botao(!p ? '#/cadastro' : aluno ? (p.premium ? '#/curso' : App.destino(p)) : '#/admin',
      !p ? 'Criar conta e fazer a prova grátis' : aluno && p.premium ? 'Ir para minha trilha' : aluno && !p.nivel_num ? 'Fazer a prova grátis' : aluno ? 'Assinar e começar' : 'Abrir o portal',
      'btn-shine font-display bg-brand-red hover:bg-brand-redDark text-white shadow-glow'),
  });
  revelar(grade);
}

// Cartão "Frase do dia" que digita sozinho
(() => {
  const frases = [
    { tema: 'At the Restaurant', en: 'A table for two, please.', pt: 'Uma mesa para dois, por favor.', pct: 34 },
    { tema: 'Travel & Airport', en: 'Where is the boarding gate?', pt: 'Onde fica o portão de embarque?', pct: 67 },
    { tema: 'Present Simple', en: 'She works at a school.', pt: 'Ela trabalha numa escola.', pct: 100 },
  ];
  const elEn = document.getElementById('heroEn');
  const elPt = document.getElementById('heroPt');
  const boxPt = document.getElementById('heroPtBox');
  const elTema = document.getElementById('heroTema');
  const bar = document.getElementById('heroBar');
  const pct = document.getElementById('heroPct');
  const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
  const semAnimacao = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  async function ciclo(i) {
    const f = frases[i % frases.length];
    boxPt.classList.add('opacity-0', 'translate-y-2');
    elTema.textContent = f.tema;
    elEn.textContent = '';
    await esperar(400);
    if (semAnimacao) elEn.textContent = f.en;
    else for (const letra of f.en) { elEn.textContent += letra; await esperar(45); }
    await esperar(350);
    elPt.textContent = f.pt;
    boxPt.classList.remove('opacity-0', 'translate-y-2');
    bar.style.width = f.pct + '%';
    pct.textContent = f.pct + '%';
    await esperar(3200);
    ciclo(i + 1);
  }
  setTimeout(() => ciclo(0), 900);
})();

// Grade dos 6 estágios (A1 → C2) com os temas de cada nível
(() => {
  const grade = document.getElementById('gradeFaixas');
  grade.innerHTML = Object.entries(FAIXAS).map(([k, f], i) => {
    const niveis = CURRICULO.filter((n) => faixaDoNivel(n.n) === k);
    return `
      <div class="reveal rounded-3xl border border-slate-200 p-7 bg-white hover:-translate-y-1 hover:shadow-card transition duration-300" style="transition-delay:${(i % 3) * 0.1}s">
        <div class="flex items-center gap-4">
          <span class="inline-grid place-items-center w-14 h-14 rounded-2xl ${f.cor} text-white font-display font-bold text-lg">${k}</span>
          <div>
            <h3 class="text-xl font-bold text-navy-900">${f.nome}</h3>
            <p class="text-sm text-slate-400">Nível ${f.niveis}</p>
          </div>
        </div>
        <ul class="mt-5 space-y-2">
          ${niveis.map((n) => `
            <li class="flex items-start gap-3 text-sm">
              <span class="w-6 h-6 shrink-0 rounded-md bg-slate-100 text-navy-900 grid place-items-center text-xs font-bold">${n.n}</span>
              <span><b class="text-navy-900">${n.tema}</b><span class="text-slate-500"> · ${n.objetivo}</span></span>
            </li>`).join('')}
        </ul>
      </div>`;
  }).join('');
  revelar(grade);
})();

// Mini lição na página inicial: 3 atividades sem cadastro
(() => {
  const caixa = document.getElementById('previewLicao');
  if (!caixa) return;
  const ATIVIDADES = [
    { tipo: 'escolha', titulo: 'Vocabulário', pergunta: 'Como se diz “Prazer em conhecer você” em inglês?', opcoes: ['Nice to meet you', 'See you later', 'Good night', 'How old are you?'], correta: 0 },
    { tipo: 'ouvir', titulo: 'Ouça e escolha', pergunta: 'Toque no botão, ouça a frase e escolha o que ela significa.', audio: 'Where is the train station?', opcoes: ['Onde fica a estação de trem?', 'Quando o trem chega?', 'Quanto custa a passagem?'], correta: 0 },
    { tipo: 'ordenar', titulo: 'Monte a frase', pergunta: 'Toque nas palavras para dizer “Eu gostaria de um café, por favor.”', resposta: "I'd like a coffee, please", palavras: ['coffee,', "I'd", 'please', 'a', 'like'] },
  ];
  let i = 0;
  let acertos = 0;
  const botaoOpcao = (t, k) => `<button data-op="${k}" class="w-full text-left font-semibold text-navy-900 border-2 border-slate-200 hover:border-navy-600 rounded-2xl px-5 py-4 transition">${App.escapar(t)}</button>`;

  function cabecalho(a) {
    return `
      <div class="flex items-center justify-between gap-3">
        <span class="text-xs font-semibold uppercase tracking-widest text-brand-red">${a.titulo}</span>
        <span class="text-xs font-semibold text-slate-400">${i + 1} de ${ATIVIDADES.length}</span>
      </div>
      <div class="mt-3 h-1.5 bg-slate-100 rounded-full overflow-hidden"><div class="h-full bg-brand-red rounded-full transition-all" style="width:${(i / ATIVIDADES.length) * 100}%"></div></div>
      <h3 class="mt-6 font-display text-xl md:text-2xl font-bold text-navy-900">${App.escapar(a.pergunta)}</h3>`;
  }

  function resultado(certo, correta) {
    if (certo) acertos++;
    const r = document.createElement('div');
    r.className = `anim-sobe mt-5 flex flex-col sm:flex-row sm:items-center gap-3 rounded-2xl px-5 py-4 ${certo ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800'}`;
    r.innerHTML = `<span class="flex-1 font-semibold">${certo ? 'Isso mesmo!' : `Quase! A resposta é: <b>${App.escapar(correta)}</b>`}</span>
      <button id="previewSeguir" class="shrink-0 font-semibold bg-navy-900 hover:bg-navy-800 text-white rounded-xl px-5 py-2.5 transition">${i + 1 < ATIVIDADES.length ? 'Continuar' : 'Ver resultado'}</button>`;
    caixa.appendChild(r);
    document.getElementById('previewSeguir').addEventListener('click', () => { i++; desenhar(); });
  }

  function desenhar() {
    if (i >= ATIVIDADES.length) {
      caixa.innerHTML = `
        <div id="previewFim" class="text-center py-4">
          <span class="w-16 h-16 mx-auto rounded-2xl bg-brand-red text-white grid place-items-center">${Icone('trofeu', 'w-8 h-8')}</span>
          <h3 class="mt-5 font-display text-2xl font-bold text-navy-900">Você acertou ${acertos} de ${ATIVIDADES.length}!</h3>
          <p class="mt-2 text-slate-500 max-w-md mx-auto">Cada lição do curso tem de 17 a 18 atividades como estas, com áudio, fala e escrita. Descubra o seu nível com a prova grátis.</p>
          <div class="mt-6 flex flex-col sm:flex-row justify-center gap-3">
            <a href="#/cadastro" class="btn-shine font-display font-semibold bg-brand-red hover:bg-brand-redDark text-white rounded-xl px-6 py-3.5 shadow-glow transition">Fazer a prova de nivelamento grátis</a>
            <button id="previewDeNovo" class="font-semibold border border-slate-200 hover:border-navy-900 text-navy-900 rounded-xl px-6 py-3.5 transition">Fazer de novo</button>
          </div>
        </div>`;
      document.getElementById('previewDeNovo').addEventListener('click', () => { i = 0; acertos = 0; desenhar(); });
      return;
    }
    const a = ATIVIDADES[i];
    if (a.tipo === 'ordenar') {
      const escolhidas = [];
      caixa.innerHTML = `${cabecalho(a)}
        <div id="previewMontada" class="mt-5 min-h-[60px] flex flex-wrap gap-2 border-b-2 border-dashed border-slate-200 pb-3"></div>
        <div id="previewBanco" class="mt-4 flex flex-wrap gap-2">${a.palavras.map((w, k) => `<button data-w="${k}" class="font-semibold text-navy-900 bg-white border-2 border-slate-200 hover:border-navy-600 rounded-xl px-4 py-2 transition">${App.escapar(w)}</button>`).join('')}</div>
        <button id="previewConferir" disabled class="mt-6 w-full font-display font-semibold bg-brand-red hover:bg-brand-redDark disabled:opacity-40 text-white rounded-2xl py-3.5 transition">Conferir</button>`;
      const montada = document.getElementById('previewMontada');
      const conferirBtn = document.getElementById('previewConferir');
      caixa.querySelectorAll('[data-w]').forEach((b) => b.addEventListener('click', () => {
        if (b.disabled) return;
        b.disabled = true; b.classList.add('opacity-30');
        escolhidas.push(a.palavras[b.dataset.w]);
        montada.innerHTML = escolhidas.map((w) => `<span class="font-semibold text-white bg-navy-900 rounded-xl px-4 py-2">${App.escapar(w)}</span>`).join('');
        conferirBtn.disabled = escolhidas.length !== a.palavras.length;
      }));
      conferirBtn.addEventListener('click', () => {
        conferirBtn.remove();
        caixa.querySelectorAll('[data-w]').forEach((b) => (b.disabled = true));
        const norm = (t) => t.toLowerCase().replace(/[^a-z' ]/g, '').replace(/\s+/g, ' ').trim();
        resultado(norm(escolhidas.join(' ')) === norm(a.resposta), a.resposta);
      });
      return;
    }
    caixa.innerHTML = `${cabecalho(a)}
      ${a.audio ? `<button id="previewOuvir" class="mt-5 inline-flex items-center gap-2 font-semibold bg-navy-900 hover:bg-navy-800 text-white rounded-2xl px-5 py-3 transition">${Icone('som', 'w-5 h-5')}Ouvir a frase</button>` : ''}
      <div class="mt-5 space-y-3">${a.opcoes.map(botaoOpcao).join('')}</div>`;
    document.getElementById('previewOuvir')?.addEventListener('click', () => Voz.falar(a.audio));
    caixa.querySelectorAll('[data-op]').forEach((b) => b.addEventListener('click', () => {
      const k = Number(b.dataset.op);
      caixa.querySelectorAll('[data-op]').forEach((x) => {
        x.disabled = true;
        if (Number(x.dataset.op) === a.correta) x.classList.add('!border-emerald-500', 'bg-emerald-50');
        else if (x === b) x.classList.add('!border-red-400', 'bg-red-50');
      });
      resultado(k === a.correta, a.opcoes[a.correta]);
    }));
  }
  desenhar();
})();
