// perfil.js — Meu perfil: dados pessoais, foto ou avatar, senha, certificados e exclusão da conta

(() => {
  const el = (id) => document.getElementById(id);
  let p = null;

  function mensagem(form, texto, tipo = 'erro') {
    const caixa = form.querySelector('[data-msg]');
    const estilos = { erro: 'bg-red-50 border-red-200 text-red-700', ok: 'bg-emerald-50 border-emerald-200 text-emerald-800' };
    caixa.className = `flex gap-2 items-start text-sm border rounded-xl px-4 py-3 ${estilos[tipo]}`;
    caixa.innerHTML = `${Icone(tipo === 'ok' ? 'check' : 'x', 'w-4 h-4 mt-0.5 shrink-0')}<span>${App.escapar(texto)}</span>`;
    if (tipo === 'erro') { form.classList.remove('shake'); void form.offsetWidth; form.classList.add('shake'); }
  }
  const limpar = (form) => { form.querySelector('[data-msg]').className = 'hidden'; };

  // Salva os dados no banco mantendo os campos que não mudaram
  async function salvar(campos) {
    const dados = { p_nome: p.nome, p_telefone: p.telefone || null, p_cidade: p.cidade || null, p_avatar: p.avatar || null, ...campos };
    const { error } = await sb.rpc('atualizar_perfil', dados);
    if (error) throw error;
    p = await App.perfil(true);
    App.atualizarAvatares(p);
  }

  // Apaga fotos antigas da pasta do aluno (mantém só a atual, se houver)
  async function limparFotos(manter = null) {
    const { data } = await sb.storage.from('avatares').list(p.id);
    const apagar = (data || []).map((f) => `${p.id}/${f.name}`).filter((c) => c !== manter);
    if (apagar.length) await sb.storage.from('avatares').remove(apagar);
  }

  // Recorta em quadrado e reduz para 320×320 (foto leve e rápida)
  function reduzirImagem(arquivo) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(arquivo);
      img.onload = () => {
        const lado = Math.min(img.width, img.height);
        const c = document.createElement('canvas');
        c.width = c.height = 320;
        c.getContext('2d').drawImage(img, (img.width - lado) / 2, (img.height - lado) / 2, lado, lado, 0, 0, 320, 320);
        URL.revokeObjectURL(url);
        c.toBlob((b) => (b ? resolve(b) : reject(new Error('Não foi possível processar a imagem.'))), 'image/jpeg', 0.86);
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Este arquivo não é uma imagem válida.')); };
      img.src = url;
    });
  }

  function desenharAvatar() {
    el('perfilAvatarGrande').innerHTML = App.avatarHtml(p, 'w-28 h-28 text-3xl');
    el('perfilNome').textContent = p.nome;
    const temFoto = (p.avatar || '').startsWith('https://');
    el('btnRemoverFoto').classList.toggle('hidden', !temFoto);
    el('txtEnviarFoto').textContent = temFoto ? 'Trocar foto' : 'Enviar foto';
    const marcado = (v) => (p.avatar === v ? 'ring-navy-900 ring-offset-2' : 'ring-transparent hover:ring-slate-300');
    el('gradeCores').innerHTML = App.CORES_AVATAR.map((c) =>
      `<button data-cor="${c}" class="aspect-square rounded-full ring-2 ${marcado(`cor:${c}`)} transition" style="background:${c}" title="Iniciais nesta cor" aria-label="Avatar com iniciais nesta cor"></button>`).join('');
    el('gradeIcones').innerHTML = App.ICONES_AVATAR.map((i) =>
      `<button data-icone="${i}" class="aspect-square rounded-full bg-navy-600 text-white grid place-items-center ring-2 ${marcado(`icone:${i}`)} transition" title="Avatar" aria-label="Avatar ${i}">${Icone(i, 'w-1/2 h-1/2')}</button>`).join('');
    el('gradeCores').querySelectorAll('[data-cor]').forEach((b) => b.addEventListener('click', () => escolherAvatar(`cor:${b.dataset.cor}`)));
    el('gradeIcones').querySelectorAll('[data-icone]').forEach((b) => b.addEventListener('click', () => escolherAvatar(`icone:${b.dataset.icone}`)));
  }

  async function escolherAvatar(valor) {
    try {
      const tinhaFoto = (p.avatar || '').startsWith('https://');
      await salvar({ p_avatar: valor });
      if (tinhaFoto) limparFotos().catch(() => {});
      desenharAvatar();
      App.toast('Avatar atualizado');
    } catch (err) {
      App.toast(err.message || 'Não foi possível salvar o avatar.');
    }
  }

  el('inputFoto').addEventListener('change', async (e) => {
    const arquivo = e.target.files[0];
    e.target.value = '';
    if (!arquivo) return;
    if (!/^image\/(jpeg|png|webp)$/.test(arquivo.type)) return App.toast('Use uma imagem JPG, PNG ou WEBP.');
    if (arquivo.size > 10 * 1024 * 1024) return App.toast('A imagem é muito grande (máximo 10 MB).');
    el('txtEnviarFoto').textContent = 'Enviando…';
    try {
      const blob = await reduzirImagem(arquivo);
      const caminho = `${p.id}/foto-${Date.now()}.jpg`;
      const { error } = await sb.storage.from('avatares').upload(caminho, blob, { contentType: 'image/jpeg' });
      if (error) throw error;
      const { data } = sb.storage.from('avatares').getPublicUrl(caminho);
      await salvar({ p_avatar: data.publicUrl });
      limparFotos(caminho).catch(() => {});
      desenharAvatar();
      App.toast('Foto de perfil atualizada');
    } catch (err) {
      App.toast(err.message || 'Não foi possível enviar a foto.');
      desenharAvatar();
    }
  });

  el('btnRemoverFoto').addEventListener('click', async () => {
    try {
      await salvar({ p_avatar: null });
      await limparFotos();
      desenharAvatar();
      App.toast('Foto removida');
    } catch (err) {
      App.toast(err.message || 'Não foi possível remover a foto.');
    }
  });

  // ---------- Dados pessoais ----------
  el('formDados').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = el('formDados');
    limpar(form);
    const nome = el('pfNome').value.trim();
    if (nome.length < 2) return mensagem(form, 'Informe seu nome completo.');
    const btn = form.querySelector('[type=submit]');
    setLoading(btn, true);
    try {
      await salvar({ p_nome: nome, p_telefone: el('pfTelefone').value, p_cidade: el('pfCidade').value });
      desenharAvatar();
      mensagem(form, 'Dados salvos com sucesso.', 'ok');
    } catch (err) {
      mensagem(form, err.message || 'Não foi possível salvar.');
    } finally {
      setLoading(btn, false, 'Salvar dados');
    }
  });

  // ---------- Senha ----------
  el('formSenha').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = el('formSenha');
    limpar(form);
    const s1 = el('pfSenha').value;
    const s2 = el('pfSenha2').value;
    if (s1.length < 6) return mensagem(form, 'A nova senha precisa ter pelo menos 6 caracteres.');
    if (s1 !== s2) return mensagem(form, 'As senhas não são iguais.');
    const btn = form.querySelector('[type=submit]');
    setLoading(btn, true);
    try {
      const { error } = await sb.auth.updateUser({ password: s1 });
      if (error) {
        const m = (error.message || '').toLowerCase();
        throw new Error(m.includes('different') ? 'A nova senha precisa ser diferente da atual.'
          : m.includes('weak') || m.includes('should be') ? 'Escolha uma senha mais forte.'
          : m.includes('reauth') ? 'Por segurança, saia e entre de novo antes de trocar a senha.'
          : 'Não foi possível alterar a senha.');
      }
      form.reset();
      mensagem(form, 'Senha alterada com sucesso.', 'ok');
    } catch (err) {
      mensagem(form, err.message);
    } finally {
      setLoading(btn, false, 'Alterar senha');
    }
  });

  // ---------- Excluir conta ----------
  el('btnExcluirConta').addEventListener('click', async () => {
    const confirmacao = prompt('Esta ação apaga para sempre sua conta, seu progresso e seus certificados.\n\nPara confirmar, digite EXCLUIR:');
    if ((confirmacao || '').trim().toUpperCase() !== 'EXCLUIR') return;
    App.carregando(true);
    try {
      await limparFotos().catch(() => {});
      const { error } = await sb.rpc('excluir_minha_conta');
      if (error) throw error;
      await sb.auth.signOut({ scope: 'local' }).catch(() => {});
      App.limparPerfil();
      App.atualizarAvatares(null);
      location.hash = '#/';
      App.toast('Sua conta foi excluída.');
    } catch (err) {
      App.toast(err.message || 'Não foi possível excluir a conta.');
    } finally {
      App.carregando(false);
    }
  });

  // ---------- Tela ----------
  function desenharStats(dados) {
    const desde = new Date(p.criado_em).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    const licoes = dados.progresso.filter((r) => r.licao >= 1 && r.acertos >= r.total * 0.6).length;
    const linha = (rotulo, valor) => `<div class="flex justify-between py-2 border-b border-slate-100 last:border-0 text-sm"><span class="text-slate-500">${rotulo}</span><span class="font-semibold text-navy-900">${valor}</span></div>`;
    el('perfilStats').innerHTML = `
      <p class="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Seu progresso</p>
      ${linha('Nível', p.nivel_num ? `${p.nivel_num} de 16 · ${p.nivel}` : 'Prova pendente')}
      ${linha('Experiência', `${(p.xp || 0).toLocaleString('pt-BR')} XP`)}
      ${linha('Lições concluídas', licoes)}
      ${linha('Certificados', dados.certificados.length)}
      ${linha('Aluno desde', desde)}`;

    const certs = [...dados.certificados].sort((a, b) => a.nivel_num - b.nivel_num);
    el('perfilCertificados').innerHTML = certs.length
      ? `<div class="grid sm:grid-cols-2 gap-3">${certs.map((c) => `
          <a href="#/certificado?n=${c.nivel_num}" class="flex items-center gap-3 border border-slate-200 hover:border-navy-900 rounded-2xl p-3 transition">
            <span class="w-11 h-11 shrink-0 rounded-xl ${FAIXAS[faixaDoNivel(c.nivel_num)].cor} text-white grid place-items-center font-bold">${c.nivel_num}</span>
            <span class="min-w-0"><span class="block text-sm font-semibold text-navy-900 truncate">Nível ${c.nivel_num} · ${App.escapar(nivelInfo(c.nivel_num).tema)}</span>
            <span class="block text-xs text-slate-400">Emitido em ${new Date(c.emitido_em).toLocaleDateString('pt-BR')}</span></span>
            <span class="ml-auto text-slate-300">${Icone('seta', 'w-4 h-4')}</span>
          </a>`).join('')}</div>`
      : '<p class="text-sm text-slate-500">Você ainda não tem certificados. Conclua o teste do seu nível na trilha para ganhar o primeiro.</p>';
  }

  App.registrar('perfil', {
    async iniciar() {
      p = await App.perfil(true);
      if (!p) { location.hash = '#/entrar'; return false; }
      const admin = p.papel === 'admin';
      document.querySelectorAll('[data-view="perfil"] [data-so-aluno]').forEach((x) => x.classList.toggle('hidden', admin));
      el('perfilVoltar').href = admin ? '#/admin' : p.nivel_num ? '#/curso' : '#/prova';
      el('perfilSub').textContent = admin ? 'Administrador' : p.email;
      limpar(el('formDados'));
      limpar(el('formSenha'));
      el('formSenha').reset();
      desenharAvatar();
      if (admin) return;
      el('pfNome').value = p.nome;
      el('pfEmail').value = p.email;
      el('pfTelefone').value = p.telefone || '';
      el('pfCidade').value = p.cidade || '';
      desenharStats(await App.dadosDoAluno(p.id));
    },
  });
})();
