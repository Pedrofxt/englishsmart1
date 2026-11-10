// atividades.js — Gera as atividades das lições, do teste do nível e da revisão inteligente

const Atividades = (() => {
  const embaralhar = (lista) => {
    const a = [...lista];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  const sortear = (lista, n) => embaralhar(lista).slice(0, n);

  // Cada conteúdo tem uma chave usada na revisão: tipo|nível|lição|posição
  // v = vocabulário · e = frase de gramática · d = fala do diálogo
  const chave = (tipo, n, l, i) => `${tipo}|${n}|${l}|${i}`;
  function lerChave(k) {
    const [tipo, n, l, i] = k.split('|');
    const licao = nivelInfo(Number(n))?.licoes[Number(l) - 1];
    if (!licao) return null;
    const lista = { v: licao.v, e: licao.e, d: licao.d }[tipo];
    const dado = lista?.[Number(i)];
    return dado ? { tipo, n: Number(n), l: Number(l), i: Number(i), licao, dado, chave: k } : null;
  }

  // Monta uma questão de múltipla escolha com a certa no meio das erradas
  function escolha(base, certa, erradas) {
    const opcoes = embaralhar([certa, ...erradas.slice(0, 3)]);
    return { ...base, opcoes, correta: opcoes.indexOf(certa) };
  }

  const completa = (frase) => { const [t, c] = frase.split('|'); return t.replace('___', c); };

  function lacuna(frase, titulo = 'Gramática', ref) {
    const [texto, certa, ...erradas] = frase.split('|');
    return escolha({ tipo: 'escolha', titulo, pergunta: texto, depois: texto.replace('___', certa), ref }, certa, erradas);
  }

  function significado(v, todos, ref) {
    const outros = todos.filter((x) => x !== v).map((x) => x[1]);
    return escolha({ tipo: 'escolha', titulo: 'Vocabulário', pergunta: `O que significa “${v[0]}”?`, falar: v[0], ref }, v[1], sortear(outros, 3));
  }

  function traduzir(v, todos, ref) {
    const outros = todos.filter((x) => x !== v).map((x) => x[0]);
    return escolha({ tipo: 'escolha', titulo: 'Vocabulário', pergunta: `Como se diz “${v[1]}” em inglês?`, depois: v[0], ref }, v[0], sortear(outros, 3));
  }

  function ouvir(texto, candidatos, ref) {
    const outros = candidatos.filter((t) => t !== texto);
    return escolha({ tipo: 'ouvir', titulo: 'Compreensão auditiva', pergunta: 'Ouça e escolha o que você escutou.', audio: texto, depois: texto, ref }, texto, sortear(outros, 3));
  }

  const bomParaMontar = (t) => { const n = t.split(' ').length; return n >= 4 && n <= 9 && !/[()]/.test(t); };

  function montar(texto, ref) {
    const palavras = texto.split(' ');
    let embaralhadas = embaralhar(palavras);
    for (let i = 0; i < 5 && embaralhadas.join(' ') === texto; i++) embaralhadas = embaralhar(palavras);
    return { tipo: 'ordenar', titulo: 'Monte a frase', pergunta: 'Toque nas palavras na ordem certa.', resposta: texto, palavras: embaralhadas, depois: texto, ref };
  }

  function completarDialogo(d, ref, falta) {
    if (falta === undefined) {
      const candidatos = d.map((_, i) => i).filter((i) => i > 0);
      falta = candidatos[Math.floor(Math.random() * candidatos.length)];
    }
    const certa = d[falta][1];
    const outras = d.filter((_, i) => i !== falta).map((x) => x[1]);
    return escolha({ tipo: 'dialogo', titulo: 'Complete o diálogo', pergunta: 'Qual fala completa a conversa?', linhas: d, falta, depois: certa, ref: ref?.(falta) }, certa, sortear(outras, 3));
  }

  function falarFrase(texto) {
    return { tipo: 'falar', titulo: 'Fale em inglês', pergunta: 'Ouça e repita a frase em voz alta.', frase: texto };
  }

  // ~14 atividades por lição: vocabulário, escuta, gramática, montar frase, diálogo e fala
  function daLicao(nivel, numero) {
    const l = nivelInfo(nivel).licoes[numero - 1];
    const rv = (v) => chave('v', nivel, numero, l.v.indexOf(v));
    const rd = (i) => chave('d', nivel, numero, i);
    const falas = l.d.map((x) => x[1]);
    const iFala = (t) => falas.indexOf(t);
    const montaveis = sortear(falas.filter(bomParaMontar), 2);
    const vOuvir = sortear(l.v, 1)[0];
    const vTrad = sortear(l.v, 1)[0];
    const fOuvir = sortear(falas, 1)[0];
    return [
      ...sortear(l.v, 3).map((v) => significado(v, l.v, rv(v))),
      traduzir(vTrad, l.v, rv(vTrad)),
      ouvir(vOuvir[0], l.v.map((v) => v[0]), rv(vOuvir)),
      ...l.e.slice(0, 2).map((f, i) => lacuna(f, 'Gramática', chave('e', nivel, numero, i))),
      ...montaveis.slice(0, 1).map((t) => montar(t, rd(iFala(t)))),
      ouvir(fOuvir, falas, rd(iFala(fOuvir))),
      ...l.e.slice(2).map((f, i) => lacuna(f, 'Gramática', chave('e', nivel, numero, i + 2))),
      ...montaveis.slice(1).map((t) => montar(t, rd(iFala(t)))),
      completarDialogo(l.d, rd),
      falarFrase(sortear(falas.filter(bomParaMontar).length ? falas.filter(bomParaMontar) : falas, 1)[0]),
    ];
  }

  // Teste do nível: 12 questões misturando as 4 lições (gramática, vocabulário e escuta)
  function doTeste(nivel) {
    const info = nivelInfo(nivel);
    const lista = [];
    info.licoes.forEach((l, li) => {
      sortear(l.e.map((f, i) => [f, i]), 2).forEach(([f, i]) => lista.push(lacuna(f, 'Gramática', chave('e', nivel, li + 1, i))));
      const v = sortear(l.v, 1)[0];
      lista.push(significado(v, l.v, chave('v', nivel, li + 1, l.v.indexOf(v))));
    });
    return embaralhar(lista);
  }

  // =====================================================================
  // REVISÃO INTELIGENTE
  // =====================================================================

  // Corretor de respostas digitadas: aceita maiúsculas/minúsculas, pontuação, contrações
  // ("I'm" = "I am") e 1 errinho de digitação em palavras de 4+ letras.
  const CONTRACOES = {
    "i'm": 'i am', "you're": 'you are', "we're": 'we are', "they're": 'they are', "he's": 'he is', "she's": 'she is', "it's": 'it is',
    "that's": 'that is', "what's": 'what is', "there's": 'there is', "who's": 'who is', "where's": 'where is', "let's": 'let us',
    "i've": 'i have', "you've": 'you have', "we've": 'we have', "they've": 'they have', "i'll": 'i will', "you'll": 'you will',
    "we'll": 'we will', "they'll": 'they will', "he'll": 'he will', "she'll": 'she will', "it'll": 'it will', "i'd": 'i would',
    "you'd": 'you would', "we'd": 'we would', "they'd": 'they would', "he'd": 'he would', "she'd": 'she would',
    "don't": 'do not', "doesn't": 'does not', "didn't": 'did not', "isn't": 'is not', "aren't": 'are not', "wasn't": 'was not',
    "weren't": 'were not', "haven't": 'have not', "hasn't": 'has not', "hadn't": 'had not', "won't": 'will not', "wouldn't": 'would not',
    "can't": 'can not', cannot: 'can not', "couldn't": 'could not', "shouldn't": 'should not', "mustn't": 'must not', "needn't": 'need not',
  };
  // Também aceita sem apóstrofo ("Im", "dont"), menos quando vira outra palavra ("its", "well", "were"...)
  const SEM_APOSTROFO = ['its', 'well', 'were', 'wed', 'shed', 'id', 'lets', 'wont', 'hed', 'shell', 'hell', 'cannot'];
  Object.keys(CONTRACOES).forEach((k) => { const s = k.replace("'", ''); if (!SEM_APOSTROFO.includes(s) && !CONTRACOES[s]) CONTRACOES[s] = CONTRACOES[k]; });
  function palavras(t) {
    return String(t).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/\([^)]*\)/g, ' ').replace(/[’‘`´]/g, "'").replace(/[^a-z0-9' ]+/g, ' ')
      .split(/\s+/).filter(Boolean).flatMap((p) => (CONTRACOES[p] || p).split(' '));
  }
  function distancia(a, b) {
    if (Math.abs(a.length - b.length) > 1) return 2;
    const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
    for (let j = 1; j <= b.length; j++) dp[0][j] = j;
    for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++)
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    return dp[a.length][b.length];
  }
  const parecidas = (alvo, dito) => alvo === dito ? 'igual' : alvo.length >= 4 && distancia(alvo, dito) <= 1 ? 'quase' : null;

  // Compara palavra a palavra (alinhamento por LCS) e devolve o que estava certo, quase certo ou faltando
  function compararUma(alvo, digitado) {
    const a = palavras(alvo);
    const d = palavras(digitado);
    const m = Array.from({ length: a.length + 1 }, () => Array(d.length + 1).fill(0));
    for (let i = a.length - 1; i >= 0; i--) for (let j = d.length - 1; j >= 0; j--)
      m[i][j] = parecidas(a[i], d[j]) ? m[i + 1][j + 1] + 1 : Math.max(m[i + 1][j], m[i][j + 1]);
    const marcas = [];
    let i = 0, j = 0, extras = 0;
    while (i < a.length) {
      const p = j < d.length ? parecidas(a[i], d[j]) : null;
      if (p && m[i][j] === m[i + 1][j + 1] + 1) { marcas.push([a[i], p]); i++; j++; }
      else if (j < d.length && m[i][j + 1] >= m[i + 1][j]) { j++; extras++; }
      else { marcas.push([a[i], 'falta']); i++; }
    }
    extras += d.length - j;
    const faltam = marcas.filter((x) => x[1] === 'falta').length;
    const quase = marcas.some((x) => x[1] === 'quase');
    return { certo: a.length > 0 && faltam === 0 && extras === 0, quase, faltam, extras, marcas };
  }

  // Aceita alternativas: "be/is" e verbos com ou sem "to"
  function alternativas(resposta) {
    const base = String(resposta).replace(/\([^)]*\)/g, '').trim();
    const lista = new Set([base]);
    if (/\//.test(base) && !/\s/.test(base)) base.split('/').forEach((x) => lista.add(x));
    if (/^to\s/i.test(base)) lista.add(base.replace(/^to\s+/i, ''));
    return [...lista];
  }

  function conferir(digitado, respostas) {
    const todas = respostas.flatMap(alternativas);
    const resultados = todas.map((r) => compararUma(r, digitado));
    const certo = resultados.find((r) => r.certo && !r.quase) || resultados.find((r) => r.certo);
    if (certo) return certo;
    return resultados.sort((x, y) => (x.faltam + x.extras) - (y.faltam + y.extras))[0];
  }

  const dicaDe = (texto) => palavras(texto).map((p) => p[0] + '_'.repeat(Math.max(0, p.length - 1))).join(' ');

  // Uma atividade para um item, no formato pedido
  // formato: 'reconhecer' (múltipla escolha) · 'escrever' · 'ditado' · 'flash'
  function paraItem(item, formato) {
    const { tipo, n, l, licao, dado, chave: ref } = item;
    const rotulo = `Nível ${n} · ${licao.t}`;
    if (tipo === 'v') {
      const [en, pt] = dado;
      if (formato === 'escrever') return { tipo: 'digitar', titulo: 'Escreva em inglês', pergunta: `Como se escreve “${pt}” em inglês?`, respostas: [en], dica: dicaDe(en), depois: en, origem: rotulo, ref };
      if (formato === 'ditado') return { tipo: 'digitar', titulo: 'Ditado', pergunta: 'Ouça e escreva a palavra ou expressão.', audio: en, respostas: [en], depois: en, traducao: pt, origem: rotulo, ref };
      if (formato === 'flash') return { tipo: 'flashcard', titulo: 'Flashcard', frente: en, verso: pt, audio: en, origem: rotulo, ref };
      return Math.random() < 0.5 ? { ...significado(dado, licao.v, ref), origem: rotulo } : { ...traduzir(dado, licao.v, ref), origem: rotulo };
    }
    if (tipo === 'e') {
      const [texto, certa] = dado.split('|');
      const cheia = completa(dado);
      if (formato === 'escrever') return { tipo: 'digitar', titulo: 'Gramática: complete digitando', pergunta: texto, respostas: [certa], dica: dicaDe(certa), depois: cheia, origem: rotulo, ref };
      if (formato === 'ditado') return { tipo: 'digitar', titulo: 'Ditado', pergunta: 'Ouça e escreva a frase inteira.', audio: cheia, respostas: [cheia], depois: cheia, origem: rotulo, ref, frase: true };
      if (formato === 'flash') return { tipo: 'flashcard', titulo: 'Flashcard', frente: texto, verso: cheia, audio: cheia, origem: rotulo, ref };
      return { ...lacuna(dado, 'Gramática', ref), origem: rotulo };
    }
    // d = fala do diálogo
    const fala = dado[1];
    const falas = licao.d.map((x) => x[1]);
    if (formato === 'escrever') return bomParaMontar(fala) ? { ...montar(fala, ref), origem: rotulo } : paraItem(item, 'ditado');
    if (formato === 'ditado' || formato === 'flash') return { tipo: 'digitar', titulo: 'Ditado', pergunta: 'Ouça e escreva a frase inteira.', audio: fala, respostas: [fala], depois: fala, origem: rotulo, ref, frase: true };
    return item.i > 0 && Math.random() < 0.5
      ? { ...completarDialogo(licao.d, () => ref, item.i), origem: rotulo }
      : { ...ouvir(fala, falas, ref), origem: rotulo };
  }

  // Todos os itens das lições que o aluno já estudou
  function itensDasLicoes(licoes) {
    return licoes.flatMap(([n, l]) => {
      const li = nivelInfo(n).licoes[l - 1];
      return [
        ...li.v.map((_, i) => chave('v', n, l, i)),
        ...li.e.map((_, i) => chave('e', n, l, i)),
        ...li.d.map((_, i) => chave('d', n, l, i)),
      ];
    }).map(lerChave).filter(Boolean);
  }

  const formatoPorCaixa = (caixa) =>
    caixa <= 0 ? 'reconhecer' : caixa === 1 ? sortear(['reconhecer', 'escrever', 'ditado'], 1)[0] : sortear(['escrever', 'ditado'], 1)[0];

  // Monta a sessão de revisão de cada modo
  // licoes: [[nível, lição], ...] já estudadas · memoria: linhas da tabela revisao · faixa: 'A1'...
  function daRevisao(modo, { licoes, memoria = [], faixa } = {}) {
    const agora = Date.now();
    const todos = itensDasLicoes(licoes);
    const porChave = new Map(memoria.map((r) => [r.item, r]));
    const caixaDe = (it) => porChave.get(it.chave)?.caixa ?? -1;
    // dá preferência aos níveis mais recentes
    const recentes = (lista) => [...lista].sort((a, b) => b.n - a.n || Math.random() - 0.5);

    if (modo === 'dia') {
      const vencidos = memoria
        .filter((r) => new Date(r.proxima).getTime() <= agora)
        .sort((a, b) => a.caixa - b.caixa || new Date(a.proxima) - new Date(b.proxima))
        .map((r) => lerChave(r.item)).filter(Boolean).slice(0, 12);
      const novos = embaralhar(recentes(todos.filter((it) => !porChave.has(it.chave))).slice(0, 30)).slice(0, 15 - vencidos.length);
      return embaralhar([...vencidos, ...novos]).map((it) => paraItem(it, caixaDe(it) < 0 ? 'reconhecer' : formatoPorCaixa(caixaDe(it))));
    }
    if (modo === 'erros') {
      return memoria
        .filter((r) => r.caixa === 0 && r.erros > 0)
        .sort((a, b) => new Date(b.atualizada_em) - new Date(a.atualizada_em))
        .slice(0, 15).map((r) => lerChave(r.item)).filter(Boolean)
        .map((it) => paraItem(it, it.tipo === 'd' ? 'ditado' : sortear(['reconhecer', 'escrever'], 1)[0]));
    }
    if (modo === 'estagio') {
      const doEstagio = todos.filter((it) => faixaDoNivel(it.n) === faixa);
      const lista = sortear(doEstagio, 18);
      const formatos = embaralhar(['reconhecer', 'reconhecer', 'reconhecer', 'reconhecer', 'reconhecer', 'reconhecer',
        'escrever', 'escrever', 'escrever', 'escrever', 'escrever', 'ditado', 'ditado', 'ditado', 'ditado', 'reconhecer', 'escrever', 'ditado']);
      const atividades = lista.map((it, k) => paraItem(it, formatos[k]));
      const falas = doEstagio.filter((it) => it.tipo === 'd' && bomParaMontar(it.dado[1]));
      if (falas.length) atividades.push(falarFrase(sortear(falas, 1)[0].dado[1]));
      return atividades;
    }
    if (modo === 'ditado') {
      const frases = recentes(todos.filter((it) => it.tipo === 'd' || it.tipo === 'e')).slice(0, 40);
      return sortear(frases, 10).map((it) => paraItem(it, 'ditado'));
    }
    if (modo === 'escrita') {
      const lista = recentes(todos.filter((it) => it.tipo === 'v' || it.tipo === 'e')).slice(0, 48);
      return sortear(lista, 12).map((it) => paraItem(it, 'escrever'));
    }
    if (modo === 'relampago') {
      return sortear(todos.filter((it) => it.tipo !== 'd'), 40).map((it) => paraItem(it, 'reconhecer'));
    }
    if (modo === 'flashcards') {
      const fracos = todos.filter((it) => it.tipo === 'v').sort((a, b) => caixaDe(a) - caixaDe(b) || Math.random() - 0.5);
      return embaralhar(fracos.slice(0, 15)).map((it) => paraItem(it, 'flash'));
    }
    return [];
  }

  return { daLicao, doTeste, daRevisao, conferir, lerChave, itensDasLicoes, embaralhar };
})();
