# English Smart na Google Play — passo a passo

O app da Play Store é o próprio site empacotado como **TWA (Trusted Web Activity)**: abre o
englishsmart.app.br em tela cheia, sem barra do navegador, e toda atualização que você sobe no
GitHub chega ao app na hora (não precisa publicar versão nova para mudar o conteúdo).

## O que já está pronto no site

| Item | Onde |
|---|---|
| Manifesto completo (id, ícones normais e "maskable", capturas de tela, atalhos, categoria Educação, funciona deitado/em pé) | `manifest.webmanifest` |
| Service worker (abre sem internet boa + recebe notificações) | `sw.js` |
| Arquivo de verificação do domínio (falta só colar a impressão digital) | `.well-known/assetlinks.json` |
| GitHub Pages servindo a pasta `.well-known` | `.nojekyll` |
| Modo app: dentro do app não aparece preço nem botão de pagar | `App.modoApp()` em `js/app.js` |
| Imagens da loja (ícone, destaque, capturas de celular, tablet 7" e 10") | `kit-play-store.zip` (enviado no chat) |

## Por que o app não mostra preço nem pagamento

A Google Play exige que conteúdo digital (assinatura de curso) vendido **dentro do app** use o
faturamento da própria Google Play (comissão de 15% em assinaturas). No Brasil ainda não existe
a opção de "faturamento alternativo" sem inscrição em programa específico. Por isso o app funciona
no modelo "só consumo", permitido pela regra:

- quem já é assinante entra e estuda normalmente;
- quem não tem assinatura vê só "Sua conta ainda não tem uma assinatura ativa" e o botão
  "Atualizar meu acesso" — **sem preço, sem link e sem convite para pagar fora**;
- a página de vendas (início com preços) não abre dentro do app;
- a assinatura continua sendo feita no site (Mercado Pago/Pix), normalmente.

Não escreva na descrição da loja nada como "assine pelo site" ou o preço — isso também conta como
direcionar para pagamento externo.

## 1) Criar o pacote no PWABuilder (5 minutos, grátis)

1. Abra **https://www.pwabuilder.com**, digite `https://englishsmart.app.br` e clique em **Start**.
2. Clique em **Package for stores → Android → Generate Package** e depois em **Options**:
   - **Package ID:** `br.app.englishsmart`
   - **App name:** `English Smart — Curso de Inglês` · **Short name:** `English Smart`
   - **Start URL:** `/?origem=playstore`  ← importante: é isso que liga o "modo app"
   - **Display mode:** Standalone · **Orientation:** Default
   - **Notification delegation:** ligado (para os lembretes das 10h)
   - **Signing key:** "Create new" (o PWABuilder gera a chave de assinatura)
   - Version code `1`, version name `1.0.0`
3. Baixe o .zip. Dentro dele:
   - `app-release-bundle.aab` → é o que você envia para a Play;
   - `signing.keystore` + `signing-key-info.txt` → **guarde em lugar seguro (ex.: Google Drive
     pessoal) e nunca coloque no GitHub.** Sem eles você não consegue atualizar o app.
   - `assetlinks.json` → tem a impressão digital da sua chave.

## 2) Criar o app no Play Console

1. Conta de desenvolvedor em **https://play.google.com/console** (taxa única de US$ 25).
   Contas pessoais novas precisam fazer um **teste fechado com pelo menos 12 testadores por
   14 dias** antes de liberar a produção — convide alunos ou amigos pelo e-mail deles.
2. **Criar app** → nome "English Smart — Curso de Inglês", idioma Português (Brasil), App, Gratuito.
3. **Teste fechado → Criar versão** → envie o `app-release-bundle.aab`. Aceite o
   **Play App Signing** (a Google guarda a chave final de assinatura).

## 3) Verificar o domínio (tira a barra do navegador do app)

1. No Play Console: **Configuração → Integridade do app → Assinatura de apps** e copie a
   **impressão digital do certificado SHA-256** da *chave de assinatura do app*.
2. Abra `.well-known/assetlinks.json` neste repositório e troque o texto
   `COLE_AQUI_A_IMPRESSAO_SHA256...` por essa impressão. Adicione também a impressão que veio no
   `assetlinks.json` do PWABuilder (chave de upload), separadas por vírgula:
   ```json
   "sha256_cert_fingerprints": ["AA:BB:...(Play)", "CC:DD:...(PWABuilder)"]
   ```
3. Suba no GitHub e confira em `https://englishsmart.app.br/.well-known/assetlinks.json`.
   Se a barra com o endereço continuar aparecendo no app, a impressão está errada.

## 4) Ficha da loja (textos prontos)

**Nome:** English Smart — Curso de Inglês

**Descrição curta (até 80):**
Inglês do A1 ao C2 com prova de nivelamento grátis, áudio, fala e certificados.

**Descrição completa:**
Aprenda hoje. Fale amanhã.

O English Smart descobre o seu nível com uma prova de nivelamento grátis e monta a sua trilha de inglês, do "Hello" até conversar com naturalidade.

O QUE VOCÊ ENCONTRA
• 16 níveis, do A1 ao C2, com 128 lições de gramática, vocabulário e diálogos
• 8 trilhas extras: viagem, entrevista de emprego, inglês no trabalho, tecnologia, morar no exterior, conversação e gírias, atendimento e vendas, turismo
• Áudio em todas as frases, com velocidade normal e lenta
• Prática de fala: fale no microfone e receba a correção na hora
• Exercícios variados: ligar palavras, ordenar frases, ditado, escrita e diálogos
• Revisão inteligente que traz de volta o que você está quase esquecendo
• Lembrete diário às 10h para manter a sequência de estudos
• Medalhas, moedas, ranking semanal e sequência de dias
• Certificado a cada nível concluído, com código de verificação
• Modo escuro e funciona no celular e no tablet

COMO FUNCIONA
1. Crie sua conta e faça a prova de nivelamento grátis
2. Veja em qual dos 16 níveis você está
3. Estude no seu ritmo, poucos minutos por dia

**Categoria:** Educação · **Tags:** Educação de idiomas
**E-mail de contato:** o mesmo de `CONTATO_EMAIL` em `js/config.js`
**Política de privacidade:** `https://englishsmart.app.br/#/termos?aba=privacidade`
**Exclusão de conta (obrigatório):** `https://englishsmart.app.br/#/perfil` → "Excluir conta"
(apaga login, dados, progresso e certificados na hora).

**Imagens** (pasta `final` do kit):
- Ícone: `icone-512.png` · Destaque: `destaque-1024x500.png`
- Celular: `celular-1..6.png` (1080×1920)
- Tablet 7": `tablet7-1..6.png` (1080×1920) · Tablet 10": `tablet10-1..6.png` (1440×2560)

## 5) Questionários do Play Console

**Acesso ao app:** "Todas ou algumas funcionalidades são restritas" → crie um aluno de teste com
assinatura de cortesia (portal do professor) e informe e-mail e senha para o revisor da Google.

**Anúncios:** Não contém anúncios.

**Classificação de conteúdo:** Educação, sem violência, sem conteúdo sexual, sem drogas; tem
interação entre usuários? Não (o ranking mostra só o primeiro nome). Resultado esperado: Livre.

**Público-alvo:** 13+ (ou 18+, se preferir não atender menores). Não marque "crianças".

**Segurança dos dados:**
| Dado | Coletado | Para quê | Obrigatório |
|---|---|---|---|
| Nome, e-mail | Sim | Conta, funcionalidade do app | Sim |
| Telefone, cidade, foto | Sim | Funcionalidade (perfil) | Não |
| Atividade no app (progresso, notas, XP) | Sim | Funcionalidade, análise pedagógica | Sim |
| Identificadores do dispositivo | Sim (id do aparelho, para o limite de 4 aparelhos) | Segurança, prevenção de fraudes | Sim |
| Áudio/voz | Não armazenado (o reconhecimento é feito pelo sistema na hora) | — | — |
| Informações financeiras | Não (pagamento fora do app) | — | — |

- Dados criptografados em trânsito: **Sim** · Usuário pode pedir exclusão: **Sim**
- Compartilhados com terceiros: **Não** (provedores que processam em seu nome, como Supabase,
  não contam como compartilhamento).

**App de governo / finanças / saúde / notícias:** Não.

## 6) Notificações no app

Com "Notification delegation" ligado, o Android 13+ mostra o pedido de permissão quando o aluno
toca em **Ativar lembrete** (painel do curso ou Perfil → Notificações). O envio diário das 10h é o
mesmo do site.
