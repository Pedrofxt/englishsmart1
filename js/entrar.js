// entrar.js — Entrar e criar conta (alunos e administrador usam a mesma tela)

(() => {
  const formEntrar = document.getElementById('formEntrar');
  const formCadastro = document.getElementById('formCadastro');
  const formRecuperar = document.getElementById('formRecuperar');
  const abaEntrar = document.getElementById('abaEntrar');
  const abaCadastro = document.getElementById('abaCadastro');
  const ATIVA = 'bg-white text-navy-900 shadow';
  const INATIVA = 'text-slate-500 hover:text-navy-900';

  // CAPTCHA (Cloudflare Turnstile): só aparece se TURNSTILE_SITE_KEY estiver preenchido em config.js
  const Captcha = (() => {
    const ativo = !!TURNSTILE_SITE_KEY;
    let carregado = null;
    const widgets = {};
    const carregar = () => (carregado ||= new Promise((ok, erro) => {
      window.aoCarregarTurnstile = ok;
      const s = document.createElement('script');
      s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=aoCarregarTurnstile';
      s.async = true; s.onerror = erro;
      document.head.appendChild(s);
    }));
    async function montar(form) {
      if (!ativo || form.id in widgets) return;
      widgets[form.id] = null;
      const caixa = document.createElement('div');
      caixa.className = 'flex justify-center min-h-[65px]';
      form.querySelector('[data-msg]').before(caixa);
      try { await carregar(); widgets[form.id] = window.turnstile.render(caixa, { sitekey: TURNSTILE_SITE_KEY, language: 'pt-br', theme: Tema.escuro() ? 'dark' : 'light' }); }
      catch { caixa.textContent = 'Não foi possível carregar a verificação. Recarregue a página.'; }
    }
    const token = (form) => (ativo ? window.turnstile?.getResponse(widgets[form.id]) || '' : undefined);
    const reiniciar = (form) => { if (ativo && widgets[form.id] != null) window.turnstile?.reset(widgets[form.id]); };
    return { ativo, montar, token, reiniciar };
  })();
  const semCaptcha = (form) => Captcha.ativo && !Captcha.token(form);

  function mensagem(form, texto, tipo = 'erro') {
    const el = form.querySelector('[data-msg]');
    const estilos = {
      erro: 'bg-red-50 border-red-200 text-red-700',
      info: 'bg-sky-50 border-sky-200 text-sky-800',
      ok: 'bg-emerald-50 border-emerald-200 text-emerald-800',
    };
    const icones = { erro: Icone('x', 'w-4 h-4 mt-0.5'), info: Icone('documento', 'w-4 h-4 mt-0.5'), ok: Icone('check', 'w-4 h-4 mt-0.5') };
    el.className = `flex gap-3 items-start text-sm border rounded-xl px-4 py-3 ${estilos[tipo]}`;
    el.innerHTML = `<span>${icones[tipo]}</span><span>${App.escapar(texto)}</span>`;
    if (tipo === 'erro') {
      form.classList.remove('shake');
      void form.offsetWidth;
      form.classList.add('shake');
    }
  }
  const limparMensagem = (form) => { form.querySelector('[data-msg]').className = 'hidden'; };

  // Traduz os erros do Supabase Auth
  function traduzir(erro) {
    const m = (erro?.message || '').toLowerCase();
    if (m === 'captcha' || m.includes('captcha')) return 'Confirme a verificação "Não sou um robô" e tente de novo.';
    if (m.includes('invalid login')) return 'E-mail ou senha incorretos.';
    if (m.includes('pwned') || m.includes('leaked') || m.includes('known to be') || m.includes('compromised')) return 'Esta senha apareceu em vazamentos de dados na internet. Escolha outra senha.';
    if (m.includes('email not confirmed')) return 'Confirme seu e-mail pelo link que enviamos antes de entrar.';
    if (m.includes('already registered') || m.includes('already been registered')) return 'Este e-mail já tem conta. Use a aba Entrar.';
    if (m.includes('password should be') || m.includes('weak')) return 'Escolha uma senha mais forte (mínimo 6 caracteres).';
    if (m.includes('not authorized') || m.includes('not_authorized')) return 'O envio de e-mails ainda não está liberado nesta plataforma. Peça ao seu professor uma senha provisória.';
    if (m.includes('expired') || m.includes('invalid') && (m.includes('token') || m.includes('otp'))) return 'Código inválido ou expirado. Confira os números ou peça um novo código.';
    if (m.includes('should be different') || m.includes('same password')) return 'A nova senha precisa ser diferente da anterior.';
    if (m.includes('security purposes') || m.includes('after') && m.includes('seconds')) return 'Aguarde um minuto antes de pedir outro código.';
    if (m.includes('rate limit') || m.includes('too many')) return 'Muitas tentativas seguidas. Aguarde alguns minutos e tente de novo.';
    if (m.includes('invalid') && m.includes('email')) return 'Informe um e-mail válido.';
    if (m.includes('fetch') || m.includes('network')) return 'Sem conexão com a internet. Verifique e tente de novo.';
    return 'Não foi possível concluir. Tente novamente.';
  }

  function aba(qual) {
    const cadastro = qual === 'cadastro';
    const recuperar = qual === 'recuperar' || qual === 'redefinir';
    formEntrar.classList.toggle('hidden', cadastro || recuperar);
    formCadastro.classList.toggle('hidden', !cadastro);
    formRecuperar.classList.toggle('hidden', !recuperar);
    Captcha.montar(cadastro ? formCadastro : recuperar ? formRecuperar : formEntrar);
    document.getElementById('abasEntrar').classList.toggle('hidden', recuperar);
    abaEntrar.className = `text-center py-2.5 rounded-xl text-sm font-semibold transition ${cadastro ? INATIVA : ATIVA}`;
    abaCadastro.className = `text-center py-2.5 rounded-xl text-sm font-semibold transition ${cadastro ? ATIVA : INATIVA}`;
  }

  // Mostrar / ocultar senha
  document.querySelectorAll('[data-ver-senha]').forEach((btn) =>
    btn.addEventListener('click', () => {
      const input = document.getElementById(btn.dataset.verSenha);
      const mostrar = input.type === 'password';
      input.type = mostrar ? 'text' : 'password';
      btn.textContent = mostrar ? 'Ocultar' : 'Mostrar';
    })
  );

  // ---------- Entrar ----------
  formEntrar.addEventListener('submit', async (e) => {
    e.preventDefault();
    limparMensagem(formEntrar);
    const btn = formEntrar.querySelector('[type=submit]');
    const email = document.getElementById('entrarEmail').value.trim();
    const senha = document.getElementById('entrarSenha').value;
    if (!email || !senha) return mensagem(formEntrar, 'Informe e-mail e senha.');
    if (semCaptcha(formEntrar)) return mensagem(formEntrar, 'Confirme a verificação "Não sou um robô".');

    setLoading(btn, true);
    try {
      const { error } = await sb.auth.signInWithPassword({ email, password: senha, options: { captchaToken: Captcha.token(formEntrar) } });
      Captcha.reiniciar(formEntrar);
      if (error) return mensagem(formEntrar, traduzir(error));
      App.limparPerfil();
      location.hash = App.destino(await App.perfil(true));
    } catch (err) {
      mensagem(formEntrar, traduzir(err));
    } finally {
      setLoading(btn, false, 'Entrar');
    }
  });

  // ---------- Criar conta ----------
  formCadastro.addEventListener('submit', async (e) => {
    e.preventDefault();
    limparMensagem(formCadastro);
    const btn = formCadastro.querySelector('[type=submit]');
    const texto = btn.innerHTML;
    const nome = document.getElementById('cadNome').value.trim();
    const email = document.getElementById('cadEmail').value.trim();
    const senha = document.getElementById('cadSenha').value;

    if (nome.length < 2) return mensagem(formCadastro, 'Informe seu nome completo.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return mensagem(formCadastro, 'Informe um e-mail válido.');
    if (senha.length < 6) return mensagem(formCadastro, 'A senha precisa ter pelo menos 6 caracteres.');
    if (!document.getElementById('cadAceite').checked) return mensagem(formCadastro, 'Para criar a conta, aceite os Termos de Uso e a Política de Privacidade.');
    if (semCaptcha(formCadastro)) return mensagem(formCadastro, 'Confirme a verificação "Não sou um robô".');

    setLoading(btn, true);
    try {
      const { data, error } = await sb.auth.signUp({ email, password: senha, options: { captchaToken: Captcha.token(formCadastro), data: { nome, aceitou_termos_em: new Date().toISOString(), versao_termos: VERSAO_TERMOS } } });
      Captcha.reiniciar(formCadastro);
      if (error) return mensagem(formCadastro, traduzir(error));

      if (!data.session) {
        // O projeto Supabase está pedindo confirmação de e-mail
        mensagem(formCadastro, 'Conta criada! Enviamos um link de confirmação para o seu e-mail. Clique nele e depois entre pela aba Entrar.', 'info');
        formCadastro.reset();
        return;
      }
      App.limparPerfil();
      location.hash = App.destino(await App.perfil(true));
    } catch (err) {
      mensagem(formCadastro, traduzir(err));
    } finally {
      setLoading(btn, false, texto);
    }
  });

  // ---------- Esqueci minha senha ----------
  // 1) e-mail → o Supabase envia um código (e um link)  2) código  3) nova senha
  // O código funciona até abrindo o site direto do arquivo; o link só funciona com o site publicado.
  let rec = { etapa: 'email', email: '' };
  const TEXTOS_REC = {
    email: ['Informe o e-mail da sua conta. Vamos enviar um código para você criar uma nova senha.', 'Enviar código'],
    codigo: ['', 'Confirmar código'],
    nova: ['Crie sua nova senha. Depois disso você já entra na sua conta.', 'Salvar nova senha'],
  };

  function etapaRec(etapa) {
    rec.etapa = etapa;
    formRecuperar.querySelectorAll('[data-etapa]').forEach((d) => d.classList.toggle('hidden', d.dataset.etapa !== etapa));
    const [sub, botao] = TEXTOS_REC[etapa];
    document.getElementById('recSub').innerHTML = etapa === 'codigo'
      ? `Enviamos um código para <b class="text-navy-900">${App.escapar(rec.email)}</b>. Digite-o abaixo.`
      : sub;
    document.getElementById('btnRecuperar').textContent = botao;
    const foco = { email: 'recEmail', codigo: 'recCodigo', nova: 'recSenha' }[etapa];
    setTimeout(() => document.getElementById(foco).focus(), 50);
  }

  // Link do e-mail só volta para o site se ele estiver publicado (https)
  const enderecoDeVolta = () => (/^https?:$/.test(location.protocol) ? location.href.split('#')[0] : undefined);

  let esperaReenvio = null;
  function travarReenvio(segundos = 60) {
    const btn = document.getElementById('btnReenviar');
    clearInterval(esperaReenvio);
    let falta = segundos;
    btn.disabled = true;
    btn.textContent = `Reenviar em ${falta}s`;
    esperaReenvio = setInterval(() => {
      falta--;
      if (falta <= 0) { clearInterval(esperaReenvio); btn.disabled = false; btn.textContent = 'Reenviar código'; }
      else btn.textContent = `Reenviar em ${falta}s`;
    }, 1000);
  }

  async function enviarCodigo() {
    if (semCaptcha(formRecuperar)) throw new Error('captcha');
    const { error } = await sb.auth.resetPasswordForEmail(rec.email, { redirectTo: enderecoDeVolta(), captchaToken: Captcha.token(formRecuperar) });
    Captcha.reiniciar(formRecuperar);
    if (error) throw error;
    travarReenvio();
  }

  document.getElementById('btnReenviar').addEventListener('click', async () => {
    limparMensagem(formRecuperar);
    try { await enviarCodigo(); mensagem(formRecuperar, 'Enviamos um novo código.', 'ok'); }
    catch (err) { mensagem(formRecuperar, traduzir(err)); }
  });

  document.getElementById('recCodigo').addEventListener('input', (e) => { e.target.value = e.target.value.replace(/\D/g, ''); });

  formRecuperar.addEventListener('submit', async (e) => {
    e.preventDefault();
    limparMensagem(formRecuperar);
    const btn = document.getElementById('btnRecuperar');
    setLoading(btn, true);
    try {
      if (rec.etapa === 'email') {
        const email = document.getElementById('recEmail').value.trim().toLowerCase();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return mensagem(formRecuperar, 'Informe um e-mail válido.');
        rec.email = email;
        await enviarCodigo();
        etapaRec('codigo');
        mensagem(formRecuperar, 'Se este e-mail tiver conta, o código chega em instantes.', 'info');
      } else if (rec.etapa === 'codigo') {
        const codigo = document.getElementById('recCodigo').value.trim();
        if (!/^\d{6,10}$/.test(codigo)) return mensagem(formRecuperar, 'Digite o código de 6 números que chegou no seu e-mail.');
        const { error } = await sb.auth.verifyOtp({ email: rec.email, token: codigo, type: 'recovery' });
        if (error) return mensagem(formRecuperar, traduzir(error));
        etapaRec('nova');
      } else {
        const s1 = document.getElementById('recSenha').value;
        const s2 = document.getElementById('recSenha2').value;
        if (s1.length < 6) return mensagem(formRecuperar, 'A nova senha precisa ter pelo menos 6 caracteres.');
        if (s1 !== s2) return mensagem(formRecuperar, 'As duas senhas não são iguais.');
        const { error } = await sb.auth.updateUser({ password: s1 });
        if (error) return mensagem(formRecuperar, traduzir(error));
        formRecuperar.reset();
        App.limparPerfil();
        App.toast('Senha alterada! Você já está conectado.');
        location.hash = App.destino(await App.perfil(true));
      }
    } catch (err) {
      mensagem(formRecuperar, traduzir(err));
    } finally {
      setLoading(btn, false, TEXTOS_REC[rec.etapa][1]);
    }
  });

  App.registrar('entrar', {
    async iniciar({ rota, params }) {
      limparMensagem(formEntrar);
      limparMensagem(formCadastro);
      limparMensagem(formRecuperar);

      // Veio do link do e-mail (site publicado): já existe uma sessão de recuperação → só falta a nova senha
      if (rota === 'redefinir') {
        if (!(await App.usuario())) { location.hash = '#/recuperar?expirou=1'; return false; }
        aba('recuperar');
        etapaRec('nova');
        return;
      }

      const p = await App.perfil();
      if (p) { location.hash = App.destino(p); return false; }
      aba(rota);
      if (rota === 'recuperar') {
        const digitado = document.getElementById('entrarEmail').value.trim();
        if (digitado && !document.getElementById('recEmail').value) document.getElementById('recEmail').value = digitado;
        etapaRec(rec.etapa === 'codigo' && rec.email ? 'codigo' : 'email');
        if (params?.get('expirou')) mensagem(formRecuperar, 'O link de recuperação expirou ou já foi usado. Peça um novo código abaixo.', 'info');
        return;
      }
      if (rota === 'cadastro' && App.lerLocal('es_ref')) mensagem(formCadastro, 'Você foi convidado por um amigo! Crie sua conta e faça a prova de nivelamento grátis.', 'info');
      setTimeout(() => document.getElementById(rota === 'cadastro' ? 'cadNome' : 'entrarEmail').focus(), 50);
    },
  });
})();
