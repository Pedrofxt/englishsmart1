// modoprova.js — Tela cheia obrigatória na prova de nivelamento e nos testes de nível
// • Começa só depois que o aluno entra em tela cheia (precisa de um toque/clique: regra dos navegadores).
// • Sair da tela cheia, trocar de aba/app ou de janela conta como "saída": a prova fica coberta até voltar.
// • Na 3ª saída a tentativa é cancelada (quem chamou decide o que fazer: reiniciar, voltar ao nível…).
// • Copiar, recortar, colar, selecionar texto e o menu do botão direito ficam bloqueados durante a prova.
// • iPhone não permite tela cheia em páginas: lá vale o "modo concentrado" (só a troca de app/aba conta).
// Não impede outro aparelho — é uma barreira contra consulta rápida no mesmo aparelho.

const ModoProva = (() => {
  const LIMITE = 3;
  let ativo = null; // { nome, saidas, aoCancelar, pausado }
  let timerBlur = null;

  const doc = document;
  const raiz = doc.documentElement;
  const suportado = () => !!(doc.fullscreenEnabled || doc.webkitFullscreenEnabled) && !!(raiz.requestFullscreen || raiz.webkitRequestFullscreen);
  const emTelaCheia = () => !!(doc.fullscreenElement || doc.webkitFullscreenElement);

  async function pedirTelaCheia() {
    if (!suportado()) return true;
    try {
      if (raiz.requestFullscreen) await raiz.requestFullscreen({ navigationUI: 'hide' });
      else await raiz.webkitRequestFullscreen();
      return emTelaCheia();
    } catch { return false; }
  }
  function sairTelaCheia() {
    if (!emTelaCheia()) return;
    try { (doc.exitFullscreen || doc.webkitExitFullscreen).call(doc); } catch {}
  }

  // ---------- Aviso antes de começar ----------
  // Mostra o aviso e só chama comecar() depois que a tela cheia entrar.
  function exigir({ nome, aoComecar, aoCancelar }) {
    const semApi = !suportado();
    const fundo = doc.createElement('div');
    fundo.id = 'modoProvaAviso';
    fundo.className = 'fixed inset-0 z-[90] bg-navy-950/80 backdrop-blur-sm grid place-items-center p-4';
    fundo.innerHTML = `
      <div role="dialog" aria-modal="true" aria-labelledby="mpTitulo" class="w-full max-w-md bg-white rounded-[1.75rem] shadow-2xl p-6 md:p-8 text-center fade-up">
        <span class="mx-auto w-14 h-14 rounded-2xl bg-navy-900 text-white grid place-items-center">${Icone(semApi ? 'alvo' : 'computador', 'w-7 h-7')}</span>
        <h2 id="mpTitulo" class="mt-4 text-2xl font-extrabold text-navy-900">${semApi ? 'Modo concentrado' : 'Prova em tela cheia'}</h2>
        <p class="mt-2 text-slate-600">${semApi
          ? `Seu aparelho não permite tela cheia, então a ${nome} fica no modo concentrado.`
          : `A ${nome} é feita em tela cheia para mostrar o seu nível real, sem consultas.`}</p>
        <ul class="mt-5 space-y-2 text-left text-sm text-slate-600">
          <li class="flex gap-2"><span class="text-brand-red mt-0.5">${Icone('check', 'w-4 h-4')}</span><span>${semApi ? 'Não troque de aba nem de aplicativo até terminar.' : 'Não saia da tela cheia nem troque de aba ou de janela.'}</span></li>
          <li class="flex gap-2"><span class="text-brand-red mt-0.5">${Icone('check', 'w-4 h-4')}</span><span>Cada saída é registrada. Na <b>${LIMITE}ª saída</b> a tentativa é <b>cancelada</b>.</span></li>
          <li class="flex gap-2"><span class="text-brand-red mt-0.5">${Icone('check', 'w-4 h-4')}</span><span>Copiar e colar ficam desativados durante a prova.</span></li>
        </ul>
        <button type="button" id="mpEntrar" class="btn-shine mt-6 w-full bg-brand-red hover:bg-brand-redDark text-white font-display font-semibold text-lg py-3.5 rounded-2xl shadow-glow transition">${semApi ? 'Entendi, começar' : 'Entrar em tela cheia e começar'}</button>
        <button type="button" id="mpVoltar" class="mt-2 w-full text-sm font-semibold text-slate-500 hover:text-navy-900 py-2">Agora não</button>
        <p id="mpErro" class="hidden mt-2 text-sm text-red-700"></p>
      </div>`;
    doc.body.appendChild(fundo);
    const fechar = () => fundo.remove();
    fundo.querySelector('#mpVoltar').addEventListener('click', () => { fechar(); aoCancelar?.('desistiu'); });
    fundo.querySelector('#mpEntrar').addEventListener('click', async () => {
      const ok = await pedirTelaCheia();
      if (!ok) {
        const e = fundo.querySelector('#mpErro');
        e.textContent = 'O navegador não entrou em tela cheia. Toque de novo e, se aparecer um pedido, permita.';
        e.classList.remove('hidden');
        return;
      }
      fechar();
      ligar(nome, aoCancelar);
      aoComecar();
    });
    fundo.querySelector('#mpEntrar').focus();
  }

  // ---------- Durante a prova ----------
  const bloquear = (e) => { if (ativo) e.preventDefault(); };
  const bloquearTeclas = (e) => {
    if (!ativo) return;
    const k = e.key.toLowerCase();
    if ((e.ctrlKey || e.metaKey) && ['c', 'x', 'v', 'a', 'p', 's', 'u', 'f'].includes(k)) e.preventDefault();
    if (k === 'f12' || k === 'printscreen') e.preventDefault();
  };

  function saida(motivo) {
    if (!ativo || ativo.pausado) return;
    ativo.saidas++;
    ativo.pausado = true;
    if (ativo.saidas >= LIMITE) {
      const cb = ativo.aoCancelar;
      encerrar();
      cobrir(true);
      cb?.('limite');
      return;
    }
    cobrir(false, motivo);
  }

  function cobrir(cancelada, motivo) {
    doc.getElementById('modoProvaPausa')?.remove();
    const div = doc.createElement('div');
    div.id = 'modoProvaPausa';
    div.className = 'fixed inset-0 z-[95] bg-navy-950 text-white grid place-items-center p-6 text-center';
    const restam = ativo ? LIMITE - ativo.saidas : 0;
    div.innerHTML = cancelada ? `
      <div class="max-w-md fade-up">
        <span class="mx-auto w-14 h-14 rounded-2xl bg-brand-red grid place-items-center">${Icone('x', 'w-7 h-7')}</span>
        <h2 class="mt-4 text-2xl font-extrabold">Tentativa cancelada</h2>
        <p class="mt-2 text-white/70">Você saiu da prova ${LIMITE} vezes. Para valer, a prova precisa ser feita do começo ao fim em tela cheia.</p>
        <button type="button" data-mp-ok class="mt-6 font-semibold bg-white text-navy-900 rounded-xl px-6 py-3">Entendi</button>
      </div>` : `
      <div class="max-w-md fade-up">
        <span class="mx-auto w-14 h-14 rounded-2xl bg-amber-400 text-navy-900 grid place-items-center">${Icone('alvo', 'w-7 h-7')}</span>
        <h2 class="mt-4 text-2xl font-extrabold">Prova pausada</h2>
        <p class="mt-2 text-white/70">${motivo === 'aba' ? 'Você trocou de aba ou de aplicativo.' : motivo === 'janela' ? 'Você saiu da janela da prova.' : 'Você saiu da tela cheia.'} Saída <b class="text-white">${ativo.saidas} de ${LIMITE}</b>.</p>
        <p class="mt-1 text-amber-300 font-semibold">${restam === 1 ? 'Mais uma saída e a tentativa será cancelada.' : `Restam ${restam} saídas antes de cancelar.`}</p>
        <button type="button" data-mp-voltar class="btn-shine mt-6 w-full bg-brand-red hover:bg-brand-redDark text-white font-display font-semibold text-lg py-3.5 rounded-2xl">${suportado() ? 'Voltar para a tela cheia' : 'Continuar a prova'}</button>
        <p data-mp-erro class="hidden mt-2 text-sm text-red-300"></p>
      </div>`;
    doc.body.appendChild(div);
    div.querySelector('[data-mp-ok]')?.addEventListener('click', () => div.remove());
    div.querySelector('[data-mp-voltar]')?.addEventListener('click', async () => {
      const ok = await pedirTelaCheia();
      if (!ok) { const e = div.querySelector('[data-mp-erro]'); e.textContent = 'Não foi possível voltar para a tela cheia. Tente de novo.'; e.classList.remove('hidden'); return; }
      if (ativo) ativo.pausado = false;
      div.remove();
    });
  }

  const aoMudarTela = () => { if (ativo && suportado() && !emTelaCheia()) saida('tela'); };
  const aoMudarAba = () => { if (ativo && doc.visibilityState === 'hidden') saida('aba'); };
  // Clicar fora da janela (outro programa, outra janela do navegador). Pequena tolerância para
  // pedidos do próprio sistema que tiram o foco por um instante.
  const aoPerderFoco = () => {
    if (!ativo) return;
    clearTimeout(timerBlur);
    timerBlur = setTimeout(() => { if (ativo && !doc.hasFocus()) saida('janela'); }, 1200);
  };
  const aoGanharFoco = () => clearTimeout(timerBlur);

  function ligar(nome, aoCancelar) {
    ativo = { nome, saidas: 0, aoCancelar, pausado: false };
    raiz.classList.add('modo-prova');
    doc.addEventListener('fullscreenchange', aoMudarTela);
    doc.addEventListener('webkitfullscreenchange', aoMudarTela);
    doc.addEventListener('visibilitychange', aoMudarAba);
    window.addEventListener('blur', aoPerderFoco);
    window.addEventListener('focus', aoGanharFoco);
    ['copy', 'cut', 'paste', 'contextmenu', 'selectstart', 'dragstart'].forEach((t) => doc.addEventListener(t, bloquear));
    doc.addEventListener('keydown', bloquearTeclas, true);
    window.addEventListener('hashchange', encerrar, { once: true });
  }

  // Fim normal da prova (enviada) ou saída da página
  function encerrar() {
    if (!ativo) return;
    ativo = null;
    clearTimeout(timerBlur);
    raiz.classList.remove('modo-prova');
    doc.removeEventListener('fullscreenchange', aoMudarTela);
    doc.removeEventListener('webkitfullscreenchange', aoMudarTela);
    doc.removeEventListener('visibilitychange', aoMudarAba);
    window.removeEventListener('blur', aoPerderFoco);
    window.removeEventListener('focus', aoGanharFoco);
    ['copy', 'cut', 'paste', 'contextmenu', 'selectstart', 'dragstart'].forEach((t) => doc.removeEventListener(t, bloquear));
    doc.removeEventListener('keydown', bloquearTeclas, true);
    doc.getElementById('modoProvaPausa')?.remove();
    sairTelaCheia();
  }

  // Confirmação dentro da página (o confirm() do navegador tira o foco e contaria como saída)
  function confirmar(texto, sim = 'Enviar', nao = 'Voltar') {
    return new Promise((resolve) => {
      const f = doc.createElement('div');
      f.className = 'fixed inset-0 z-[96] bg-navy-950/70 grid place-items-center p-4';
      f.innerHTML = `<div role="alertdialog" aria-modal="true" class="w-full max-w-sm bg-white rounded-2xl p-6 shadow-2xl fade-up">
        <p class="text-navy-900 font-semibold">${App.escapar(texto)}</p>
        <div class="mt-5 flex gap-2 justify-end">
          <button type="button" data-nao class="font-semibold border border-slate-200 text-navy-900 rounded-xl px-4 py-2.5">${nao}</button>
          <button type="button" data-sim class="font-semibold bg-brand-red hover:bg-brand-redDark text-white rounded-xl px-4 py-2.5">${sim}</button>
        </div></div>`;
      doc.body.appendChild(f);
      const fim = (v) => { f.remove(); resolve(v); };
      f.querySelector('[data-sim]').addEventListener('click', () => fim(true));
      f.querySelector('[data-nao]').addEventListener('click', () => fim(false));
      f.querySelector('[data-nao]').focus();
    });
  }

  return { exigir, encerrar, confirmar, suportado, ativo: () => !!ativo, saidas: () => ativo?.saidas || 0, LIMITE };
})();
