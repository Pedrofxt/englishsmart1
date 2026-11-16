// conta.js — Peças da conta usadas pelo Meu perfil (alunos) e pela aba Conta (escolas e professores):
// foto/avatar, senha atual obrigatória para trocar a senha ou excluir a conta, e a janela que pede a senha.

const Conta = (() => {
  const esc = (t) => App.escapar(t ?? '');

  // Quem criou a conta com o Google e nunca definiu senha não tem senha para digitar
  async function temSenha() {
    const { data } = await sb.auth.getUser();
    const u = data?.user;
    const provedores = u?.app_metadata?.providers || (u?.app_metadata?.provider ? [u.app_metadata.provider] : []);
    return { temSenha: !provedores.includes('google') || provedores.includes('email'), google: provedores.includes('google'), email: u?.email || '' };
  }

  // Confere a senha atual entrando de novo com o mesmo e-mail (não muda nada na conta)
  async function confirmarSenha(senha) {
    const { email } = await temSenha();
    if (!senha) throw new Error('Digite sua senha atual.');
    const { error } = await sb.auth.signInWithPassword({ email, password: senha });
    if (error) {
      const m = (error.message || '').toLowerCase();
      throw new Error(m.includes('rate') || m.includes('too many') ? 'Muitas tentativas. Espere alguns minutos e tente de novo.' : 'Senha atual incorreta.');
    }
  }

  async function alterarSenha(atual, nova, { exigirAtual = true } = {}) {
    if (exigirAtual) await confirmarSenha(atual);
    if (atual && atual === nova) throw new Error('A nova senha precisa ser diferente da atual.');
    const { error } = await sb.auth.updateUser({ password: nova });
    if (error) {
      const m = (error.message || '').toLowerCase();
      throw new Error(m.includes('different') ? 'A nova senha precisa ser diferente da atual.'
        : m.includes('weak') || m.includes('should be') ? 'Escolha uma senha mais forte.'
        : m.includes('reauth') ? 'Por segurança, saia e entre de novo antes de trocar a senha.'
        : 'Não foi possível alterar a senha.');
    }
  }

  // Janela de confirmação. Com senha: pede a senha e confere. Sem senha (conta Google): pede para digitar EXCLUIR.
  // Resolve true quando confirmado, false quando cancelado.
  function confirmarComSenha({ titulo, texto, botao = 'Confirmar', perigo = true }) {
    return new Promise(async (resolve) => {
      const { temSenha: comSenha } = await temSenha();
      const fundo = document.createElement('div');
      fundo.className = 'fixed inset-0 z-[90] bg-navy-950/60 backdrop-blur-sm grid place-items-center p-4';
      fundo.innerHTML = `
        <form role="dialog" aria-modal="true" aria-labelledby="ctTitulo" class="w-full max-w-md bg-white rounded-2xl shadow-card p-6 space-y-4" novalidate>
          <div><h2 id="ctTitulo" class="text-xl font-bold ${perigo ? 'text-red-700' : 'text-navy-900'}">${esc(titulo)}</h2>
            <p class="mt-1 text-sm text-slate-600">${texto}</p></div>
          <div>
            <label for="ctSenha" class="block text-sm font-medium text-slate-600 mb-1.5">${comSenha ? 'Digite sua senha para confirmar' : 'Para confirmar, digite EXCLUIR'}</label>
            <input id="ctSenha" type="${comSenha ? 'password' : 'text'}" autocomplete="${comSenha ? 'current-password' : 'off'}" class="campo" />
          </div>
          <p data-erro class="hidden text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3" role="alert"></p>
          <div class="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <button type="button" data-cancelar class="font-semibold border border-slate-200 hover:border-navy-900 text-navy-900 rounded-xl px-5 py-2.5 transition">Cancelar</button>
            <button type="submit" class="font-semibold ${perigo ? 'bg-red-700 hover:bg-red-800' : 'bg-navy-900 hover:bg-navy-800'} text-white rounded-xl px-5 py-2.5 transition">${esc(botao)}</button>
          </div>
        </form>`;
      document.body.appendChild(fundo);
      const form = fundo.querySelector('form');
      const campo = fundo.querySelector('#ctSenha');
      const erro = fundo.querySelector('[data-erro]');
      const fechar = (v) => { fundo.remove(); document.removeEventListener('keydown', tecla); resolve(v); };
      const tecla = (e) => { if (e.key === 'Escape') fechar(false); };
      document.addEventListener('keydown', tecla);
      fundo.querySelector('[data-cancelar]').addEventListener('click', () => fechar(false));
      fundo.addEventListener('click', (e) => { if (e.target === fundo) fechar(false); });
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        erro.classList.add('hidden');
        const btn = form.querySelector('[type=submit]');
        try {
          if (comSenha) { setLoading(btn, true); await confirmarSenha(campo.value); }
          else if (campo.value.trim().toUpperCase() !== 'EXCLUIR') throw new Error('Digite EXCLUIR para confirmar.');
          fechar(true);
        } catch (err) {
          erro.textContent = err.message; erro.classList.remove('hidden');
          setLoading(btn, false, botao);
          campo.select();
        }
      });
      setTimeout(() => campo.focus(), 30);
    });
  }

  // ---------- Foto e avatar ----------
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

  async function limparFotos(id, manter = null) {
    const { data } = await sb.storage.from('avatares').list(id);
    const apagar = (data || []).map((f) => `${id}/${f.name}`).filter((c) => c !== manter);
    if (apagar.length) await sb.storage.from('avatares').remove(apagar);
  }

  async function enviarFoto(id, arquivo) {
    if (!/^image\/(jpeg|png|webp)$/.test(arquivo.type)) throw new Error('Use uma imagem JPG, PNG ou WEBP.');
    if (arquivo.size > 10 * 1024 * 1024) throw new Error('A imagem é muito grande (máximo 10 MB).');
    const blob = await reduzirImagem(arquivo);
    const caminho = `${id}/foto-${Date.now()}.jpg`;
    const { error } = await sb.storage.from('avatares').upload(caminho, blob, { contentType: 'image/jpeg' });
    if (error) throw error;
    return { url: sb.storage.from('avatares').getPublicUrl(caminho).data.publicUrl, caminho };
  }

  return { temSenha, confirmarSenha, alterarSenha, confirmarComSenha, reduzirImagem, limparFotos, enviarFoto };
})();
