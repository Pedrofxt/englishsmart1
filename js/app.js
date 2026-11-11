// app.js — Troca de telas (pelo endereço #/...) e sessão do usuário

const App = (() => {
  const telas = {}; // nome → { iniciar(params) }
  let perfilCache = null;

  // ---------- Utilidades ----------
  const escapar = (txt) => {
    const div = document.createElement('div');
    div.textContent = txt == null ? '' : String(txt);
    return div.innerHTML;
  };

  function toast(msg) {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.classList.remove('translate-y-24', 'opacity-0');
    clearTimeout(toast.t);
    toast.t = setTimeout(() => el.classList.add('translate-y-24', 'opacity-0'), 2800);
  }

  function carregando(sim) {
    document.getElementById('telaCarregando').classList.toggle('hidden', !sim);
  }

  // ---------- Sessão ----------
  async function usuario() {
    const { data } = await sb.auth.getSession();
    return data.session?.user || null;
  }

  // Quem está logado: { papel: 'admin' | 'aluno', nome, email, nivel, ... } ou null
  async function perfil(forcar = false) {
    if (perfilCache && !forcar) return perfilCache;
    const user = await usuario();
    if (!user) return (perfilCache = null);

    const { data: ehAdmin, error: erroAdmin } = await sb.rpc('eh_admin');
    if (erroAdmin) throw erroAdmin;
    if (ehAdmin) {
      perfilCache = { papel: 'admin', id: user.id, nome: 'Administrador', email: user.email, premium: true };
      return perfilCache;
    }

    const [{ data, error }, { data: assinatura }] = await Promise.all([
      sb.from('alunos').select('*').eq('id', user.id).maybeSingle(),
      sb.from('assinaturas').select('*').eq('aluno_id', user.id).maybeSingle(),
    ]);
    if (error) throw error;
    perfilCache = data ? { papel: 'aluno', ...data } : { papel: 'aluno', id: user.id, nome: user.email, email: user.email, semCadastro: true };
    perfilCache.assinatura = assinatura || null;
    perfilCache.premium = temPremium(assinatura);
    if (data) perfilCache.aparelho = await checarAparelho(forcar);
    if (data) await convitesPendentes(perfilCache);
    return perfilCache;
  }

  // Link de indicação (?ref=) e convite de turma (?turma=) guardados antes do cadastro/login
  const lerLocal = (k) => { try { return localStorage.getItem(k) || ''; } catch { return ''; } };
  const gravarLocal = (k, v) => { try { v ? localStorage.setItem(k, v) : localStorage.removeItem(k); } catch {} };
  async function convitesPendentes(p) {
    const ref = lerLocal('es_ref');
    if (ref) {
      gravarLocal('es_ref', '');
      if (!p.indicado_por && ref !== p.codigo_indicacao) {
        const { data: ok } = await sb.rpc('registrar_indicacao', { p_codigo: ref });
        if (ok) p.indicado_por = ref;
      }
    }
    const turma = lerLocal('es_turma');
    if (turma) {
      gravarLocal('es_turma', '');
      const { data: nome, error } = await sb.rpc('entrar_turma', { p_codigo: turma });
      if (!error && nome) setTimeout(() => toast(`Você entrou na turma "${nome}".`), 600);
    }
  }

  const limparPerfil = () => { perfilCache = null; };

  // ---------- Limite de 4 aparelhos por conta ----------
  // Registra este aparelho na conta (conferido de novo a cada 2 minutos). Falha de rede não bloqueia:
  // o banco também recusa salvar progresso de aparelho não liberado.
  let aparelho = { quando: 0, resultado: null };
  async function checarAparelho(forcar = false) {
    if (!forcar && aparelho.resultado && Date.now() - aparelho.quando < 120e3) return aparelho.resultado;
    const { data, error } = await sb.rpc('registrar_dispositivo', { p_id: DISPOSITIVO.id, p_nome: DISPOSITIVO.nome, p_digital: DISPOSITIVO.digital });
    if (error || !data) return aparelho.resultado || { ok: true };
    aparelho = { quando: Date.now(), resultado: data };
    return data;
  }
  const esquecerAparelho = () => { aparelho = { quando: 0, resultado: null }; };

  // Acesso liberado: mês pago (com tolerância) ou cortesia do professor
  function temPremium(a) {
    if (!a) return false;
    const agora = Date.now();
    return (a.pago_ate && new Date(a.pago_ate).getTime() > agora) || (a.cortesia_ate && new Date(a.cortesia_ate).getTime() > agora) || false;
  }
  // Sem plano grátis: cadastro e prova são livres; qualquer lição exige assinatura
  const licaoLivre = (p) => !!p?.premium;

  // Progresso e certificados de um aluno (o banco só devolve os dele; o admin vê todos)
  async function dadosDoAluno(id) {
    const [prog, cert, ses, prot] = await Promise.all([
      sb.from('progresso').select('*').eq('aluno_id', id),
      sb.from('certificados').select('*').eq('aluno_id', id),
      sb.from('sessoes_revisao').select('*').eq('aluno_id', id),
      sb.from('dias_protegidos').select('*').eq('aluno_id', id),
    ]);
    if (prog.error) throw prog.error;
    if (cert.error) throw cert.error;
    return { progresso: prog.data || [], certificados: cert.data || [], sessoes: ses.error ? [] : ses.data || [], protegidos: prot?.error ? [] : prot?.data || [] };
  }

  // Conta atividades e dias de estudo a partir do progresso (lições) e das sessões de revisão
  // protegidos: dias comprados na loja ("protetor de sequência"), contam como estudados
  function estatisticas(progresso, meta = 3, sessoes = [], protegidos = []) {
    const agora = Date.now();
    const seteDias = progresso.filter((p) => agora - new Date(p.atualizada_em).getTime() <= 7 * 864e5);
    const revisoesSemana = sessoes.filter((x) => agora - new Date(x.feita_em).getTime() <= 7 * 864e5).length;
    const dias = new Set([...progresso.flatMap((p) => [p.concluida_em, p.atualizada_em]), ...sessoes.map((x) => x.feita_em)].filter(Boolean).map((d) => new Date(d).toDateString()));
    protegidos.forEach((x) => { const [a, m, d] = String(x.dia).split('-').map(Number); if (a) dias.add(new Date(a, m - 1, d).toDateString()); });
    let sequencia = 0;
    const dia = new Date();
    if (!dias.has(dia.toDateString())) dia.setDate(dia.getDate() - 1); // conta até ontem se hoje ainda não estudou
    while (dias.has(dia.toDateString())) { sequencia++; dia.setDate(dia.getDate() - 1); }
    const media = seteDias.length ? seteDias.reduce((s, p) => s + p.acertos / p.total, 0) / seteDias.length : 0;
    const ultima = [...progresso.map((p) => p.atualizada_em), ...sessoes.map((x) => x.feita_em)].reduce((m, d) => Math.max(m, new Date(d).getTime()), 0);
    return { semana: seteDias.length + revisoesSemana, meta, sequencia, media, ultima: ultima || null };
  }

  // Para onde cada pessoa vai depois de entrar
  function destino(p) {
    if (!p) return '#/entrar';
    if (p.papel === 'admin') return '#/admin';
    if (!p.nivel_num) return '#/prova';      // primeiro a prova de nivelamento (grátis)
    return p.premium ? '#/curso' : '#/planos'; // depois, só com assinatura
  }

  async function sair() {
    await sb.auth.signOut().catch(() => {});
    limparPerfil();
    esquecerAparelho();
    atualizarAvatares(null);
    location.hash = '#/entrar';
  }


  // ---------- Avatar (canto superior direito) ----------
  const CORES_AVATAR = ['#D91A34', '#00174F', '#023FA0', '#047857', '#B45309', '#7C3AED', '#0369A1', '#BE185D'];
  // cores antigas, mais claras, trocadas por tons com contraste para as iniciais brancas
  const COR_ANTIGA = { '#eb1f3b': '#D91A34', '#10b981': '#047857', '#f59e0b': '#B45309', '#0ea5e9': '#0369A1', '#db2777': '#BE185D' };
  const ICONES_AVATAR = ['capelo', 'livro', 'globo', 'estrela', 'foguete', 'microfone', 'fone', 'cafe'];
  const iniciaisDe = (nome) => String(nome || '?').split(' ').filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join('') || '?';

  const MOLDURAS = ['moldura_ouro', 'moldura_neon', 'moldura_arco', 'moldura_diamante'];
  function avatarHtml(p, clsBase = 'w-10 h-10 text-sm') {
    const cls = MOLDURAS.includes(p?.moldura) ? `${clsBase} moldura ${p.moldura.replace('_', '-')}` : clsBase;
    const av = p?.avatar || '';
    const ini = escapar(iniciaisDe(p?.nome));
    if (av.startsWith('https://')) {
      return `<span class="${cls} rounded-full overflow-hidden bg-slate-200 grid place-items-center shrink-0">
        <img src="${escapar(av)}" alt="" referrerpolicy="no-referrer" class="w-full h-full object-cover" onerror="const p=this.parentElement;p.style.background='#00174F';p.style.color='#fff';p.style.fontWeight='700';p.textContent='${ini}'" /></span>`;
    }
    if (av.startsWith('icone:') && ICONES_AVATAR.includes(av.slice(6))) {
      return `<span class="${cls} rounded-full bg-navy-600 text-white grid place-items-center shrink-0">${Icone(av.slice(6), 'w-1/2 h-1/2')}</span>`;
    }
    const cor0 = /^cor:#[0-9a-f]{6}$/i.test(av) ? av.slice(4) : (p?.papel === 'admin' ? '#00174F' : '#D91A34');
    const cor = COR_ANTIGA[cor0.toLowerCase()] || cor0;
    return `<span class="${cls} rounded-full text-white font-bold grid place-items-center shrink-0" style="background:${cor}">${ini}</span>`;
  }

  function atualizarAvatares(p = perfilCache) {
    document.querySelectorAll('[data-avatar]').forEach((b) => {
      b.classList.toggle('hidden', !p);
      if (!p) return;
      b.innerHTML = avatarHtml(p, b.dataset.tamanho || 'w-10 h-10 text-sm');
      b.title = `Conectado como ${p.nome}`;
      b.setAttribute('aria-label', `Conta de ${p.nome}: abrir menu`);
    });
  }

  function fecharMenuAvatar() { document.getElementById('menuAvatar')?.remove(); }

  function abrirMenuAvatar(botao) {
    const p = perfilCache;
    if (!p) return;
    if (document.getElementById('menuAvatar')) return fecharMenuAvatar();
    const r = botao.getBoundingClientRect();
    const menu = document.createElement('div');
    menu.id = 'menuAvatar';
    menu.className = 'menu-avatar fixed z-[80] w-64 bg-white rounded-2xl shadow-card border border-slate-200 overflow-hidden text-slate-700';
    menu.style.top = `${r.bottom + 8}px`;
    menu.style.right = `${Math.max(12, window.innerWidth - r.right)}px`;
    const item = (href, icone, texto) =>
      `<a href="${href}" class="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-slate-50 transition">${Icone(icone, 'w-4 h-4 text-slate-400')}${texto}</a>`;
    menu.innerHTML = `
      <div class="flex items-center gap-3 p-4 border-b border-slate-100">
        ${avatarHtml(p, 'w-11 h-11 text-sm')}
        <div class="min-w-0"><p class="font-semibold text-navy-900 truncate">${escapar(p.nome)}</p><p class="text-xs text-slate-400 truncate">${escapar(p.email || '')}</p></div>
      </div>
      <div class="py-1">
        ${item('#/perfil', 'usuario', 'Meu perfil')}
        ${p.papel === 'admin' ? item('#/admin', 'grafico', 'Portal do professor') : item('#/curso', 'capelo', 'Minha trilha')}
        ${p.papel === 'admin' || p.nivel_num ? item('#/revisao', 'brilho', 'Revisão inteligente') : ''}
        ${p.papel === 'aluno' && p.nivel_num ? item('#/loja', 'loja', 'Loja de moedas') : ''}
        ${p.papel === 'aluno' ? item('#/planos', 'estrela', p.premium ? 'Minha assinatura' : 'Assinar') : ''}
        ${item('#/termos', 'documento', 'Termos e privacidade')}
        <button data-menu-som class="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-slate-50 transition">${Icone(Som.ligado() ? 'som' : 'mudo', 'w-4 h-4 text-slate-400')}${Som.ligado() ? 'Desligar sons' : 'Ligar sons'}</button>
        <button data-menu-tema class="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-slate-50 transition">${Icone(Tema.escuro() ? 'sol' : 'lua', 'w-4 h-4 text-slate-400')}${Tema.escuro() ? 'Modo claro' : 'Modo escuro'}</button>
      </div>
      <button data-menu-sair class="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-600 hover:bg-red-50 border-t border-slate-100 transition">${Icone('sair', 'w-4 h-4')}Sair</button>`;
    document.body.appendChild(menu);
    menu.querySelector('[data-menu-sair]').addEventListener('click', () => { fecharMenuAvatar(); sair(); });
    menu.querySelector('[data-menu-tema]').addEventListener('click', () => { fecharMenuAvatar(); Tema.alternar(); });
    menu.querySelector('[data-menu-som]').addEventListener('click', () => { fecharMenuAvatar(); Som.alternar(); });
    Som.tocar('abrir');
    menu.querySelectorAll('a').forEach((a) => a.addEventListener('click', fecharMenuAvatar));
  }

  // ---------- Telas ----------
  function registrar(nome, tela) { telas[nome] = tela; }

  let telaAtual = '';
  function mostrar(nome) {
    document.querySelectorAll('[data-view]').forEach((v) => {
      const ver = v.dataset.view === nome;
      v.classList.toggle('hidden', !ver);
      if (ver && nome !== telaAtual) { v.classList.remove('tela-entra'); void v.offsetWidth; v.classList.add('tela-entra'); }
    });
    telaAtual = nome;
  }

  // '#/entrar' → entrar · '#/cadastro' → entrar (aba cadastro) · '#como-funciona' → início + rolar
  let navegacaoAtual = 0;
  async function navegar() {
    const minha = ++navegacaoAtual; // se outra troca de tela começar, esta é descartada
    const hash = location.hash || '#/';
    if (!hash.startsWith('#/')) {
      fecharMenuAvatar();
      mostrar('inicio');
      telas.inicio?.iniciar();
      document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'smooth' });
      return;
    }
    const [caminho, consulta] = hash.slice(2).split('?');
    const rota = caminho || 'inicio';
    const params = new URLSearchParams(consulta || '');
    if (/^[A-Za-z0-9]{4,12}$/.test(params.get('ref') || '')) gravarLocal('es_ref', params.get('ref').toUpperCase());
    if (/^[A-Za-z0-9]{4,12}$/.test(params.get('turma') || '')) {
      gravarLocal('es_turma', params.get('turma').toUpperCase());
      if (await usuario()) { limparPerfil(); await perfil(true).catch(() => {}); }
    }
    const APELIDOS = { cadastro: 'entrar', recuperar: 'entrar', redefinir: 'entrar', treino: 'licao', conquistas: 'perfil' };
    const nome = APELIDOS[rota] || rota;
    const tela = telas[nome];
    if (!tela) { location.hash = '#/'; return; }
    Voz.parar();
    Voz.pararGravacao(true); // desliga o microfone ao trocar de tela
    fecharMenuAvatar();

    // aparelho acima do limite: só pode ver a tela de aparelhos, os termos e a página inicial
    if (!['inicio', 'entrar', 'termos', 'dispositivos', 'verificar'].includes(nome)) {
      try {
        const p = (await usuario()) ? await perfil() : null;
        if (minha !== navegacaoAtual) return;
        if (p?.papel === 'aluno' && p.aparelho && p.aparelho.ok === false) { location.hash = '#/dispositivos'; return; }
      } catch { /* a própria tela trata o erro */ }
    }

    try {
      const continuar = await tela.iniciar({ rota, params });
      if (minha !== navegacaoAtual) return; // chegou uma troca de tela mais nova
      if (continuar === false) return;      // a tela redirecionou
      atualizarAvatares();
      mostrar(nome);
      window.scrollTo(0, 0);
    } catch (err) {
      console.error('[English Smart] Erro ao abrir a tela', nome, err);
      if (minha !== navegacaoAtual) return;
      carregando(false);
      mostrar('inicio');
      toast(mensagemDeErro(err));
    }
  }

  // Diferencia falta de internet de outros problemas (para não culpar a conexão à toa)
  function ehErroDeRede(err) {
    const m = String(err?.message || err || '');
    return !navigator.onLine || /failed to fetch|networkerror|network request failed|load failed|fetch/i.test(m);
  }
  function mensagemDeErro(err) {
    if (ehErroDeRede(err)) return 'Sem conexão com o servidor. Verifique sua internet e tente de novo.';
    const m = String(err?.message || '');
    if (/jwt|token|session|refresh/i.test(m)) return 'Sua sessão expirou. Entre novamente.';
    return 'Algo deu errado ao abrir esta tela. Recarregue a página (F5) e tente de novo.';
  }

  let instalar = null; // evento de instalação do app (Android/Chrome)

  async function concluirLoginSocial(hashInicial) {
    carregando(true);
    try {
      const { data } = await sb.auth.getSession(); // espera o Supabase ler os dados do link
      history.replaceState(null, '', location.pathname); // tira ?social= e os dados do endereço
      const erro = new URLSearchParams(hashInicial.replace(/^#\/?/, '')).get('error_description');
      if (!data?.session) {
        gravarLocal('es_social', '');
        toast(erro && !/denied|cancel/i.test(erro) ? `Não foi possível entrar com o Google: ${erro.replace(/\+/g, ' ')}` : 'Login com o Google cancelado.');
        location.hash = '#/entrar';
        return;
      }
      // registra o aceite dos Termos (o botão do Google mostra o aviso de aceite)
      const meta = data.session.user.user_metadata || {};
      if (!meta.aceitou_termos_em) {
        await sb.auth.updateUser({ data: { aceitou_termos_em: new Date().toISOString(), versao_termos: VERSAO_TERMOS, aceite_via: 'google' } }).catch(() => {});
      }
      gravarLocal('es_social', '');
      limparPerfil();
      const p = await perfil(true);
      const primeiroNome = String(p?.nome || meta.full_name || '').split(' ')[0];
      location.hash = destino(p);
      if (primeiroNome) setTimeout(() => toast(`Olá, ${primeiroNome}! Você entrou com o Google.`), 500);
    } catch (e) {
      console.error(e);
      toast('Não foi possível concluir o login com o Google. Tente de novo.');
      location.hash = '#/entrar';
    } finally {
      carregando(false);
    }
  }

  function iniciar() {
    document.getElementById('ano').textContent = new Date().getFullYear();
    document.querySelectorAll('[data-sair]').forEach((b) => b.addEventListener('click', sair));
    document.querySelectorAll('[data-rolar]').forEach((b) =>
      b.addEventListener('click', () => document.getElementById(b.dataset.rolar)?.scrollIntoView({ behavior: 'smooth' }))
    );
    document.addEventListener('click', (e) => {
      const botao = e.target.closest('[data-avatar]');
      if (botao) { e.stopPropagation(); abrirMenuAvatar(botao); return; }
      if (!e.target.closest('#menuAvatar')) fecharMenuAvatar();
    });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') fecharMenuAvatar(); });
    window.addEventListener('resize', fecharMenuAvatar);
    document.querySelectorAll('[data-tema]').forEach((b) => b.addEventListener('click', () => Tema.alternar()));
    // App instalável (PWA): só funciona no site publicado (https)
    if ('serviceWorker' in navigator && location.protocol === 'https:') {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    }
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      instalar = e;
      document.querySelectorAll('[data-instalar]').forEach((b) => b.classList.remove('hidden'));
    });
    document.querySelectorAll('[data-instalar]').forEach((b) => b.addEventListener('click', async () => {
      if (!instalar) return toast('No iPhone: toque em Compartilhar e depois em "Adicionar à Tela de Início".');
      instalar.prompt();
      await instalar.userChoice.catch(() => {});
      instalar = null;
      document.querySelectorAll('[data-instalar]').forEach((x) => x.classList.add('hidden'));
    }));
    if (!sb) { mostrar('inicio'); return; } // biblioteca do Supabase não carregou: config.js já avisa na tela
    // Link de "esqueci minha senha" aberto com o site publicado: o Supabase devolve #access_token=...&type=recovery
    const hashInicial = location.hash;
    const veioDoLink = /type=recovery/.test(hashInicial);
    const linkComErro = /error_code=|error=access_denied/.test(hashInicial);
    sb.auth.onAuthStateChange((evento) => {
      if (evento === 'SIGNED_OUT') limparPerfil();
      if (evento === 'PASSWORD_RECOVERY') { limparPerfil(); location.hash = '#/redefinir'; }
    });
    // Volta do login com o Google: o Supabase devolve #access_token=... (ou #error=...) com ?social=google
    if (new URLSearchParams(location.search).get('social')) {
      concluirLoginSocial(hashInicial).finally(() => window.addEventListener('hashchange', navegar));
      return;
    }
    window.addEventListener('hashchange', navegar);
    if (linkComErro) { location.hash = '#/recuperar?expirou=1'; return; }
    if (veioDoLink) {
      // espera o Supabase ler o link; se o evento não vier, confere a sessão
      setTimeout(async () => { if (!location.hash.startsWith('#/redefinir')) location.hash = (await usuario()) ? '#/redefinir' : '#/recuperar?expirou=1'; }, 2500);
      return;
    }
    navegar();
  }

  return { lerLocal, gravarLocal, checarAparelho, temPremium, licaoLivre, registrar, iniciar, perfil, limparPerfil, destino, sair, escapar, toast, carregando, usuario, dadosDoAluno, estatisticas, mensagemDeErro, avatarHtml, atualizarAvatares, CORES_AVATAR, ICONES_AVATAR };
})();
