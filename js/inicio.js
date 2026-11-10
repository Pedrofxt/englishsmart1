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
