// notificacoes.js — lembrete diário às 10h por notificação (Web Push)
// O aluno ativa no curso ou no perfil; o navegador pede permissão; a inscrição vai para o banco
// (salvar_inscricao_push) e a função "notificacoes" envia todo dia às 10h de Brasília.

const Notificacoes = (() => {
  const VAPID_PUBLICA = 'BGfE6jjOZFySpgQBNp9l-MjUVo1rVNGH3JQGE3IKeWeq_AqiGWzIkK3Y8xmZAEvhmynbNdKEwjiGJTaRNE6tcPU';
  const DISPENSADO = 'es_notif_dispensado';

  const ehIOS = () => /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const instalado = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true || App.modoApp?.();
  const suportado = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

  function chaveBytes(b64) {
    const p = '='.repeat((4 - (b64.length % 4)) % 4);
    const bin = atob((b64 + p).replace(/-/g, '+').replace(/_/g, '/'));
    return Uint8Array.from(bin, (c) => c.charCodeAt(0));
  }

  async function registro() {
    if (!suportado()) return null;
    let r = await navigator.serviceWorker.getRegistration();
    if (!r) r = await navigator.serviceWorker.register('sw.js');
    return navigator.serviceWorker.ready.then(() => r).catch(() => r);
  }

  // 'ativo' | 'inativo' | 'negado' | 'ios-instalar' | 'sem-suporte'
  async function estado() {
    if (!suportado()) return ehIOS() && !instalado() ? 'ios-instalar' : 'sem-suporte';
    if (Notification.permission === 'denied') return 'negado';
    if (Notification.permission !== 'granted') return 'inativo';
    try {
      const r = await navigator.serviceWorker.getRegistration();
      const s = r && (await r.pushManager.getSubscription());
      return s ? 'ativo' : 'inativo';
    } catch { return 'inativo'; }
  }

  async function salvar(s) {
    const j = s.toJSON();
    const { error } = await sb.rpc('salvar_inscricao_push', { p_endpoint: j.endpoint, p_p256dh: j.keys.p256dh, p_auth: j.keys.auth, p_aparelho: DISPOSITIVO.nome });
    if (error) throw error;
  }

  async function ativar() {
    if (!suportado()) throw new Error(ehIOS() ? 'No iPhone/iPad, adicione o English Smart à Tela de Início (Compartilhar → Adicionar à Tela de Início) e ative por lá.' : 'Este navegador não aceita notificações. Tente o Chrome, Edge ou Firefox.');
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') throw new Error(perm === 'denied' ? 'As notificações estão bloqueadas. Libere nas configurações do navegador (cadeado ao lado do endereço → Notificações → Permitir).' : 'Você não permitiu as notificações.');
    const r = await registro();
    let s = await r.pushManager.getSubscription();
    if (!s) s = await r.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: chaveBytes(VAPID_PUBLICA) });
    await salvar(s);
    App.gravarLocal(DISPENSADO, '');
    sb.functions.invoke('notificacoes', { body: { teste: true } }).catch(() => {});
    return true;
  }

  async function desativar() {
    const r = await navigator.serviceWorker?.getRegistration();
    const s = r && (await r.pushManager.getSubscription());
    if (s) {
      await sb.rpc('remover_inscricao_push', { p_endpoint: s.endpoint });
      await s.unsubscribe().catch(() => {});
    }
  }

  // ao abrir o curso: se a permissão já existe, garante que a inscrição está no banco (o endereço pode mudar)
  async function sincronizar() {
    try {
      if (!suportado() || Notification.permission !== 'granted') return;
      const r = await navigator.serviceWorker.getRegistration();
      const s = r && (await r.pushManager.getSubscription());
      if (s) await salvar(s);
    } catch {}
  }

  const SINO = '<svg class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>';

  // Cartão no painel do curso (só aparece enquanto não estiver ativo e o aluno não dispensou)
  async function cartaoCurso(destino) {
    if (!destino) return;
    const st = await estado();
    if (st === 'ativo' || st === 'sem-suporte' || st === 'negado' || App.lerLocal(DISPENSADO)) return;
    const ios = st === 'ios-instalar';
    const div = document.createElement('div');
    div.id = 'cartaoNotificacoes';
    div.className = 'col-span-2 md:col-span-3 lg:col-span-4 flex flex-col sm:flex-row sm:items-center gap-4 bg-white rounded-2xl p-5 border-2 border-navy-200';
    div.innerHTML = `
      <span class="w-12 h-12 shrink-0 rounded-xl bg-brand-red text-white grid place-items-center"><span class="balanca">${SINO}</span></span>
      <span class="flex-1 min-w-0">
        <span class="block font-display font-bold text-navy-900">Lembrete diário às 10h</span>
        <span class="block text-sm text-slate-500">${ios ? 'No iPhone/iPad, toque em Compartilhar → <b>Adicionar à Tela de Início</b>, abra o app por lá e ative o lembrete.' : 'Receba uma notificação todo dia às 10h para não perder sua sequência de estudos.'}</span>
      </span>
      <span class="shrink-0 flex items-center gap-2">
        ${ios ? '' : '<button type="button" data-notif-ativar class="font-semibold bg-brand-red hover:bg-brand-redDark text-white rounded-xl px-5 py-2.5 transition">Ativar lembrete</button>'}
        <button type="button" data-notif-dispensar class="text-sm font-semibold text-slate-500 hover:text-navy-900 px-3 py-2.5">Agora não</button>
      </span>`;
    destino.appendChild(div);
    div.querySelector('[data-notif-dispensar]').addEventListener('click', () => { App.gravarLocal(DISPENSADO, '1'); div.remove(); });
    div.querySelector('[data-notif-ativar]')?.addEventListener('click', async (e) => {
      const b = e.currentTarget; b.disabled = true; b.textContent = 'Ativando…';
      try {
        await ativar();
        if (typeof Som !== 'undefined') Som.tocar('sucesso');
        App.toast('Pronto! Você vai receber um lembrete todo dia às 10h.');
        div.remove();
      } catch (err) {
        App.toast(err.message || 'Não foi possível ativar as notificações.', 'erro');
        b.disabled = false; b.textContent = 'Ativar lembrete';
      }
    });
  }

  // Seção do perfil: liga/desliga + teste
  async function painelPerfil(destino) {
    if (!destino) return;
    const st = await estado();
    const textos = {
      ativo: ['Ativado', 'Você recebe um lembrete todo dia às 10h (horário de Brasília) neste aparelho.', 'bg-emerald-100 text-emerald-800'],
      inativo: ['Desativado', 'Ative para receber um lembrete todo dia às 10h (horário de Brasília) neste aparelho.', 'bg-slate-100 text-slate-700'],
      negado: ['Bloqueado', 'As notificações estão bloqueadas neste navegador. Libere nas configurações do site (cadeado ao lado do endereço → Notificações → Permitir) e volte aqui.', 'bg-amber-100 text-amber-800'],
      'ios-instalar': ['Indisponível aqui', 'No iPhone/iPad, toque em Compartilhar → Adicionar à Tela de Início, abra o English Smart por lá e ative o lembrete.', 'bg-slate-100 text-slate-700'],
      'sem-suporte': ['Indisponível', 'Este navegador não aceita notificações. Tente o Chrome, Edge ou Firefox.', 'bg-slate-100 text-slate-700'],
    }[st];
    destino.innerHTML = `
      <div class="flex flex-col sm:flex-row sm:items-center gap-4">
        <span class="w-12 h-12 shrink-0 rounded-xl bg-navy-900 text-white grid place-items-center">${SINO}</span>
        <div class="flex-1 min-w-0">
          <p class="font-semibold text-navy-900">Lembrete diário às 10h <span id="notifStatus" class="ml-1 align-middle text-xs font-bold rounded-full px-2 py-0.5 ${textos[2]}">${textos[0]}</span></p>
          <p class="text-sm text-slate-500">${textos[1]}</p>
        </div>
        <div class="shrink-0 flex flex-wrap gap-2">
          ${st === 'ativo' ? `
            <button type="button" id="btnNotifTeste" class="font-semibold border border-slate-200 text-navy-900 hover:border-navy-900 rounded-xl px-4 py-2.5 transition">Enviar teste</button>
            <button type="button" id="btnNotifDesativar" class="font-semibold border border-slate-200 text-slate-600 hover:border-red-300 hover:text-red-700 rounded-xl px-4 py-2.5 transition">Desativar</button>`
          : st === 'inativo' ? '<button type="button" id="btnNotifAtivar" class="font-semibold bg-navy-900 hover:bg-navy-800 text-white rounded-xl px-5 py-2.5 transition">Ativar notificações</button>' : ''}
        </div>
      </div>`;
    const recarregar = () => painelPerfil(destino);
    destino.querySelector('#btnNotifAtivar')?.addEventListener('click', async (e) => {
      e.currentTarget.disabled = true;
      try { await ativar(); App.toast('Pronto! Você vai receber um lembrete todo dia às 10h.'); }
      catch (err) { App.toast(err.message || 'Não foi possível ativar.', 'erro'); }
      recarregar();
    });
    destino.querySelector('#btnNotifDesativar')?.addEventListener('click', async () => {
      try { await desativar(); App.toast('Lembretes desativados neste aparelho.'); } catch { App.toast('Não foi possível desativar agora.', 'erro'); }
      recarregar();
    });
    destino.querySelector('#btnNotifTeste')?.addEventListener('click', async (e) => {
      const b = e.currentTarget; b.disabled = true;
      await sincronizar();
      const { data, error } = await sb.functions.invoke('notificacoes', { body: { teste: true } });
      b.disabled = false;
      if (error || !data?.enviados) App.toast(data?.aviso || 'Não foi possível enviar o teste agora.', 'erro');
      else App.toast('Teste enviado! A notificação deve chegar em alguns segundos.');
    });
  }

  return { suportado, estado, ativar, desativar, sincronizar, cartaoCurso, painelPerfil };
})();
