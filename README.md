# English Smart — Curso de Inglês Inteligente

Plataforma completa de inglês, do zero à fluência, com prova de nivelamento grátis e assinatura mensal pelo Mercado Pago, inspirada no modelo das plataformas usadas na rede
estadual (prova de nivelamento, 16 níveis alinhados ao CEFR, metas semanais e certificados).
Feita em HTML, Tailwind e JavaScript, com banco e login no **Supabase**.

**Não precisa de servidor, Node ou terminal: é só dar dois cliques no `index.html`.**
**Nada depende de CNPJ:** Mercado Pago (conta de pessoa física, chave Pix no CPF/e-mail/celular), Supabase, Resend e
Cloudflare funcionam com CPF. O campo de CPF/CNPJ nos Termos é opcional.

## Novidades desta versão
| Para o aluno | Para você (portal do professor) |
|---|---|
| **Plano anual** (R$ 299,90, cartão ou Pix) e **cupons** de desconto no Pix | Aba **Financeiro**: receita do mês, recorrente, novos, cancelamentos, vencimentos da semana, renovação no Pix, gráfico de 6 meses |
| **Indique um amigo**: +30 dias quando o amigo faz o 1º pagamento | **Exportar CSV** de alunos e de pagamentos (abre no Excel) |
| **Loja de moedas** (10 XP = 1 moeda): molduras de avatar, protetor de sequência e +7 dias de acesso | **Turmas** com código/link de convite e filtro por turma |
| **Medalhas** (16) e **ranking semanal** (só aparece quem quiser) | **Cupons**: criar, pausar, limitar usos e validade |
| **Trilhas extras**: Viagem, Entrevista de emprego e Inglês no trabalho | **Erros mais comuns** dos alunos (para aulas de reforço) |
| **Pronúncia palavra por palavra** na prática de fala | **Checklist de lançamento** que confere a configuração sozinho |
| **Modo escuro**, **app instalável** (PWA) e mini lição grátis na página inicial | **Lembretes por e-mail** antes de o acesso vencer (automáticos) |
| Mensagem própria de **acesso vencido** ("continue do nível N") | Página pública **Verificar certificado** (`#/verificar`) |

## Como usar

1. Descompacte a pasta (mantenha juntos `index.html`, `css/`, `img/` e `js/`).
2. Dê dois cliques em **`index.html`**. Precisa de internet.
3. Para ouvir os áudios e treinar a fala, use **Google Chrome** ou **Microsoft Edge**.

### Ajuste único no Supabase (recomendado)
Para o aluno entrar logo depois de criar a conta, sem confirmar o e-mail:
1. Abra https://supabase.com/dashboard/project/wfxqxvlcrqbwvcvqslzi/auth/providers
2. Clique em **Email**, desligue **Confirm email** e clique em **Save**.

### Responsável nos Termos
Os Termos de Uso e a Política de Privacidade já mostram **Pedro de Farias Xavier Toledo** como responsável e
**pedro.farias.toledo@gmail.com** como contato (em `js/config.js`). O CPF/CNPJ é opcional (não é exigido para nada): se quiser exibir, preencha `RESPONSAVEL_DOC`.

### "Esqueci minha senha": dois ajustes no Supabase
**1. Colocar o código no e-mail (1 minuto).** Abra
https://supabase.com/dashboard/project/wfxqxvlcrqbwvcvqslzi/auth/templates, escolha **Reset Password** e troque o conteúdo por:
```html
<h2>Redefinir sua senha</h2>
<p>Use este código na tela "Esqueci minha senha" do English Smart:</p>
<p style="font-size:28px;font-weight:bold;letter-spacing:6px">{{ .Token }}</p>
<p>Ou, com o site publicado, clique aqui: <a href="{{ .ConfirmationURL }}">criar nova senha</a></p>
<p>Se não foi você que pediu, ignore este e-mail.</p>
```
O código funciona até abrindo o site pelo arquivo; o link só funciona com o site publicado (https) e com o endereço
dele cadastrado em **Authentication → URL Configuration** (Site URL e Redirect URLs).

**2. Liberar o envio para todos os alunos.** O e-mail grátis do Supabase **só envia para os membros da sua equipe no
Supabase** e tem limite baixo por hora. Para os alunos receberem o código, ligue um SMTP próprio em
https://supabase.com/dashboard/project/wfxqxvlcrqbwvcvqslzi/auth/smtp (Resend e Brevo têm plano grátis).

**Enquanto isso:** no Portal do professor, o botão **Senha** gera uma senha provisória para o aluno, sem e-mail.
O aluno entra com ela e troca em *Meu perfil*.

## Assinatura (R$ 29,99/mês pelo Mercado Pago)

Não há plano grátis. O caminho do aluno é:

```
Cria a conta (grátis) ──▶ Prova de nivelamento (grátis) ──▶ Vê o nível ──▶ Assina ──▶ Trilha liberada
```

- Sem assinatura ativa, a trilha, as lições, os testes, os certificados e a revisão ficam bloqueados. Quem tenta abrir
  qualquer um deles (ou entra no site) vai para a página da assinatura, que mostra o **nível que a prova encontrou** e o
  pagamento logo ao lado.
- A trava também está no banco: sem assinatura, nenhuma lição, teste ou revisão é salva.
- Certificados já emitidos e o perfil continuam acessíveis.

**Formas de pagamento** (em `#/planos`, abas Cartão e Pix):
- **Cartão de crédito:** assinatura com cobrança automática todo mês pelo Mercado Pago.
- **Pix:** o site gera na hora o **QR Code** e o **Pix copia e cola** (válidos por 30 minutos, com contagem regressiva).
  Assim que o banco confirma, o acesso é liberado sozinho por **30 dias** (ou **365** no anual), com **3 dias de
  tolerância** depois do vencimento. Cada novo Pix soma os dias ao que falta; faltando 5 dias aparece na trilha o aviso
  "Renovar com Pix" e o aluno recebe **e-mails 3 dias antes, 1 dia antes e no vencimento**. Quando acaba, ele vê
  "Seu acesso terminou em dd/mm. Renove para continuar do nível N" (nada é apagado). Pix estornado retira os dias.
- **Plano anual:** R$ 299,90 (economia de R$ 59,98). No cartão, cobra uma vez por ano; no Pix, libera 365 dias.
  Mude o valor cobrado com o segredo `PLANO_ANUAL_VALOR` e o valor mostrado em `PLANO_ANUAL` (`js/config.js`).
- **Cupons (só Pix):** crie no portal (aba *Turmas e cupons*). O aluno digita o código na aba Pix e o QR Code já sai com desconto.

**Como funciona:** o aluno escolhe a forma de pagamento, paga e a trilha é liberada sozinha, sem recarregar a página. Ele cancela em **Meu plano** e continua com acesso até o fim do mês pago.
Excluir a conta também cancela a cobrança. O professor vê o plano de cada aluno, os assinantes e a receita estimada no
portal, e pode liberar **Cortesia** (acesso sem cobrança por X dias).

**O que já está pronto no seu Supabase:** tabelas `assinaturas` e `pagamentos`, trava no banco (sem assinatura, o banco
recusa salvar as lições 2–4, testes e revisões) e a função do servidor **`mercadopago`** (em `supabase/functions/mercadopago`),
que cria a assinatura, recebe os avisos do Mercado Pago e cancela.

### Para começar a cobrar (3 passos, uns 10 minutos)
1. **Pegue suas credenciais no Mercado Pago.** Entre em https://www.mercadopago.com.br/developers/panel/app, crie uma aplicação
   (produto: *Assinaturas*) e copie o **Access Token** de produção (começa com `APP_USR-`). Para testar antes, use as
   credenciais de teste e contas de teste do próprio painel.
2. **Cole o Access Token no Supabase** como segredo `MP_ACCESS_TOKEN`:
   https://supabase.com/dashboard/project/wfxqxvlcrqbwvcvqslzi/functions/secrets
3. **Ligue os avisos de pagamento (webhook).** No painel da aplicação do Mercado Pago, em **Webhooks → Configurar
   notificações**, cole a URL abaixo, marque o evento **Planos e assinaturas** e salve:
   ```
   https://wfxqxvlcrqbwvcvqslzi.supabase.co/functions/v1/mercadopago
   ```
   O Mercado Pago mostra uma **assinatura secreta**: salve-a no Supabase como segredo `MP_WEBHOOK_SECRET` (mesma página do passo 2).
   Marque também o evento **Pagamentos** (é por ele que chega a confirmação do Pix; cada Pix também já é criado com
   essa URL de aviso).
4. **Para o Pix:** a sua conta do Mercado Pago precisa ter uma **chave Pix cadastrada** (app do Mercado Pago → Pix →
   Minhas chaves). Sem ela, o Mercado Pago não gera o QR Code.

Pronto. Para mudar o preço: altere `PLANO.preco` em `js/config.js` (o que aparece na tela) e crie o segredo `PLANO_VALOR`
com o novo valor (o que é cobrado). Assinaturas antigas continuam com o valor antigo.

**Observações**
- Use o e-mail da conta do Mercado Pago do aluno no campo da assinatura (o Mercado Pago costuma recusar quando é diferente).
  Você não consegue assinar com a sua própria conta de vendedor.
- Com o site aberto pelo arquivo, o Mercado Pago abre em outra aba e o site confere o pagamento sozinho. Com o site
  publicado (https), o aluno volta direto para a página do plano.
- O conteúdo das lições fica no navegador; a trava real está no banco: sem assinatura não há progresso, teste, certificado nem revisão.
- Os Termos de Uso já têm a cláusula da assinatura (preço, renovação, cancelamento e os 7 dias de arrependimento do CDC)
  e a Política de Privacidade cita o Mercado Pago.

### Lembretes de vencimento por e-mail
Já agendados no banco (todo dia às 9h de Brasília). Para os e-mails saírem, crie uma conta grátis no
**Resend** (https://resend.com, 3.000 e-mails/mês, só com e-mail/CPF) e salve em
https://supabase.com/dashboard/project/wfxqxvlcrqbwvcvqslzi/functions/secrets:
- `RESEND_API_KEY`: a chave do Resend (obrigatório)
- `EMAIL_REMETENTE`: ex. `English Smart <contato@englishsmart.app.br>` (depois de verificar o domínio no Resend; sem isso, usa o remetente de teste do Resend)
- `SITE_URL`: `https://englishsmart.app.br` (padrão)

Quem paga no cartão não recebe (renova sozinho). Cada aviso vai uma vez só. O portal tem o botão *Enviar lembretes agora*.

### Indique um amigo
Cada aluno tem um link (`#/cadastro?ref=CÓDIGO`) em *Minha assinatura* e em *Meu perfil*, com botão de WhatsApp.
Quando o amigo cria a conta pelo link (até 7 dias) e faz o **primeiro pagamento aprovado**, quem indicou ganha
**+30 dias** sozinho. Sem limite de indicações; não vale indicar a si mesmo.

## Login com o Google
O site já tem os botões **"Continuar com o Google"** (Entrar) e **"Criar conta com o Google"** (Cadastro). Eles só
aparecem depois que o Google é ligado no Supabase, então nada quebra enquanto isso. O aluno que entra com o Google
já chega com nome e foto da conta Google, faz a prova de nivelamento e segue as mesmas regras (assinatura, 4 aparelhos).
Se ele já tinha conta com o mesmo e-mail, o Supabase junta as duas: o progresso continua o mesmo.

**Como ligar (uns 10 minutos, grátis, sem CNPJ):**
1. Entre em https://console.cloud.google.com com a sua conta Google e crie um projeto (ex.: "English Smart").
2. Vá em **Google Auth Platform → Branding** (https://console.cloud.google.com/auth/branding) → *Get started*:
   nome do app `English Smart`, seu e-mail de suporte, público **External**, e-mail de contato. Em *Branding*, coloque
   o domínio `englishsmart.app.br`, o link da política `https://englishsmart.app.br/#/termos?aba=privacidade` e dos
   termos `https://englishsmart.app.br/#/termos` (o logo é opcional; com logo o Google pede verificação, que leva alguns dias).
3. Em **Audience**, clique em **Publish app** (sem isso, só e-mails de teste conseguem entrar).
4. Em **Clients** (https://console.cloud.google.com/auth/clients/create): tipo **Web application**.
   - *Authorized JavaScript origins*: `https://englishsmart.app.br`
   - *Authorized redirect URIs*: `https://wfxqxvlcrqbwvcvqslzi.supabase.co/auth/v1/callback`
   - Clique em *Create* e copie o **Client ID** e o **Client Secret**.
5. No Supabase: https://supabase.com/dashboard/project/wfxqxvlcrqbwvcvqslzi/auth/providers → **Google** → ligue,
   cole o Client ID e o Client Secret e salve.
6. Em https://supabase.com/dashboard/project/wfxqxvlcrqbwvcvqslzi/auth/url-configuration confira:
   Site URL `https://englishsmart.app.br` e, em Redirect URLs, `https://englishsmart.app.br/**`.

Pronto: recarregue a tela de Entrar e o botão aparece. Quem entrou com o Google pode, se quiser, definir uma senha em
*Meu perfil* para entrar também com e-mail. O aceite dos Termos fica registrado na conta (o botão mostra o aviso).

## Limite de 4 aparelhos por conta
Para impedir que uma assinatura seja compartilhada, cada conta fica conectada em no máximo **4 aparelhos**
(cada navegador/celular recebe uma identificação própria). O 5º aparelho vê a tela **"Limite de 4 aparelhos atingido"**.

| Regra | Por quê |
|---|---|
| Sair da conta **não** libera a vaga | Senão daria para revezar a senha com qualquer número de pessoas |
| O aluno remove aparelhos em *Meu perfil* (ou na tela de limite), **até 3 a cada 30 dias** | Troca de celular sem virar rodízio |
| Aparelho sem uso por **60 dias** sai sozinho | Quem trocou de aparelho não fica preso |
| Apagar os dados do navegador não gasta vaga nova | O aparelho é reconhecido por um resumo do navegador e da tela |
| Professor: botão **x/4** no portal desconecta todos os aparelhos do aluno | Para casos de suporte |

A trava também está no banco: um aparelho fora da lista não consegue salvar lições, testes nem revisões. Os Termos
dizem que a conta é pessoal e proíbem compartilhar a senha; a Política de Privacidade explica os dados do aparelho.

## Aviso de cookies (LGPD)
Na primeira visita aparece um aviso com **Aceitar todos**, **Só essenciais** e **Personalizar**. A escolha fica guardada
e pode ser mudada pelo link **Cookies** no rodapé ou pelo botão na Política de Privacidade (seção 5, que lista cada item
guardado no navegador). Se os Termos mudarem de versão (`VERSAO_TERMOS`), o aviso aparece de novo.

**Estatísticas (opcional):** para medir visitas com o Google Analytics, cole o ID `G-XXXXXXX` em `ANALYTICS_ID`
(`js/config.js`). Ele só carrega para quem aceitar os cookies de estatística; quem recusar não é medido.

## A trilha

```
Prova de nivelamento ──▶ Nível 1 a 16 ──▶ 4 lições ──▶ Teste do nível ──▶ Certificado + próximo nível
```

| Estágio (CEFR) | Níveis | Temas |
|---|---|---|
| A1 · Básico | 1–3 | First Steps · My World · My Routine |
| A2 · Pré-intermediário | 4–6 | Out and About · Stories · Then & Now |
| B1 · Intermediário | 7–9 | Experiences · Plans & Possibilities · Life Skills |
| B2 · Intermediário superior | 10–12 | Professional English · What If · Communicate with Impact |
| C1 · Avançado | 13–15 | Advanced Structures · Natural Fluency · Persuasive Communication |
| C2 · Proficiente | 16 | Mastery |

**64 lições** no total. Cada uma tem:
- **Aprenda:** explicação de gramática em português, frases de exemplo, 6 palavras/expressões e um diálogo, tudo com áudio (normal e 🐢 devagar).
- **Pratique:** de 17 a 18 atividades com correção na hora. Os tipos e a dificuldade mudam com o estágio:

| Estágio | O que predomina |
|---|---|
| **A1–A2** | Escolher significado e tradução, **ligar palavras**, ouvir e escolher, completar frases, montar a frase, **ligar falas** do diálogo, primeiras escritas (escrever a palavra e ditado de palavra) |
| **B1–B2** | Metade escrita: **escrever palavras**, **completar a gramática digitando**, **ditado de frase**, **frase própria** com a expressão da lição, além de ligar e montar |
| **C1–C2** | Quase tudo sem opções: lacunas digitadas, 2 ditados, **ligar metades de frases**, 2 **frases próprias**, ligar falas e montar |

  Toda lição termina com **falar** (reconhecimento de voz). Na **frase própria**, o site confere se a expressão foi
  usada numa frase completa e mostra um exemplo da lição para comparar (não corrige a gramática livre).
- **Resultado:** nota, XP ganho e o próximo passo. A lição conta como concluída com 60%.

**Teste do nível:** 12 questões das 4 lições (mudam a cada tentativa). Com **70%**, o aluno ganha o
certificado do nível e sobe para o próximo. No nível 16, ganha o certificado de conclusão do curso.

### Prova de nivelamento
- 25 questões em duas partes: **Gramática** (15) e **Vocabulário e leitura** (10), do A1 ao C1.
- O nível é definido pelo primeiro estágio em que o aluno acerta menos de 60%; dentro dele, os acertos
  decidem entre os 3 níveis do estágio. Quem acerta tudo vai para o nível 16.
- A correção acontece **no banco**: o gabarito nunca chega ao navegador. Cada aluno faz a prova uma vez.

### Revisão inteligente (`#/revisao`)
Tudo o que o aluno estuda (as 6 palavras, as 4 frases de gramática e as falas do diálogo de cada lição) entra na
memória dele. Cada acerto empurra o item para uma caixa mais alta e aumenta o intervalo até a próxima revisão
(**1, 3, 7, 16 e 35 dias**); cada erro devolve o item para "revisar hoje" (repetição espaçada, sistema Leitner).

| Treino | O que faz |
|---|---|
| **Revisão do dia** | Itens vencidos + conteúdos ainda não revisados. O formato se adapta: o que o aluno erra aparece com opções; o que já sabe, para escrever ou ouvir. |
| **Meus erros** | Só o que errou recentemente, para escrever de memória. |
| **Revisão do estágio** | Revisão acumulada de todas as lições de um estágio (A1…C2): gramática, vocabulário, escrita, ditado e fala. |
| **Ditado** | Ouve a frase e escreve. Correção palavra por palavra (verde, amarelo para erro de digitação, vermelho para o que faltou). |
| **Escrita** | Escreve a palavra em inglês e completa a gramática digitando, sem opções. Tem dica com as primeiras letras. |
| **Desafio relâmpago** | Quantas acerta em 60 segundos, com recorde. |
| **Flashcards** | Vira o cartão e diz se lembrou; as palavras esquecidas aparecem primeiro. |

- Respostas digitadas aceitam maiúsculas, pontuação, contrações (I'm = I am) e 1 errinho de digitação em palavras longas.
- Ao final: lista do que errou com a resposta e o áudio, e o botão "Treinar estes de novo".
- A tela mostra itens para hoje, força da memória, dominados, sessões da semana e os **pontos fracos** (lições com mais erros).
- Cada acerto vale 5 XP (até 100 XP de revisão por dia) e cada sessão conta na **meta semanal** e na **sequência**.

### Trilhas extras
Três trilhas de 4 lições cada, liberadas para quem assina, em qualquer ordem: **Inglês para viagem** (aeroporto, hotel,
transporte, imprevistos), **Entrevista de emprego** (apresentação, pontos fortes, conquistas, encerramento) e
**Inglês no trabalho** (e-mails, reuniões, conversa com colegas, apresentações). Somam XP, meta e sequência; não têm
teste nem certificado e não entram na revisão. O conteúdo fica em `EXTRAS`, no fim de `js/curriculo.js`.

### Motivação
- **Meta semanal** (o aluno escolhe de 1 a 14 atividades), **XP** (10 por acerto, +100 por nível) e **sequência de dias**.
- **Certificado** imprimível (ou salvo em PDF) a cada nível, com código de verificação. Qualquer pessoa confere em
  **`#/verificar`** (link no rodapé), sem login.
- **Medalhas** (16, em *Meu perfil*): primeira lição, 10 e 30 lições, 100% numa lição, sequências de 3/7/30 dias,
  certificados, B1 e C1, revisões, XP, trilha extra e primeira compra. Medalha nova aparece em destaque.
- **Ranking semanal:** pontos dos últimos 7 dias (10 por acerto nas lições + XP da revisão). Cada aluno escolhe se
  aparece (primeiro nome e inicial); quem não participa vê só a própria posição.
- **Loja de moedas** (`#/loja`): cada 10 XP vira 1 moeda; gastar não tira XP nem posição no ranking.

| Item | Moedas | O que faz |
|---|---|---|
| Protetor de sequência | 150 | Conta o dia de ontem como estudado |
| Moldura Ouro / Neon | 300 | Contorno no avatar |
| Moldura Arco-íris | 500 | Contorno no avatar |
| Moldura Diamante | 1.000 | Contorno animado no avatar |
| +7 dias de acesso | 1.500 | Soma 7 dias (para quem paga com Pix; quem venceu também pode trocar) |

O saldo e as compras são conferidos no banco (função `comprar_item`), então ninguém compra sem moedas.

## Conta do aluno
- **Avatar no canto superior direito** de todas as telas logadas, com menu: Meu perfil, Minha trilha, Revisão, Loja de moedas, Assinatura, Termos, Modo escuro e Sair.
- **Meu perfil** (`#/perfil`): nome, telefone e cidade; foto de perfil (recortada e reduzida automaticamente, guardada no Supabase Storage)
  ou avatar com cor ou ícone; troca de senha; progresso; medalhas; ranking; **turma** (código do professor); indique um amigo;
  certificados; aparelhos; e **Excluir conta** (apaga tudo, conforme a LGPD).
- **Termos de Uso e Política de Privacidade** (`#/termos`): aba no topo da página inicial e no rodapé. O cadastro exige o aceite,
  que fica registrado com data e versão.

## Sons, animações e contraste
- **Efeitos sonoros** gerados pelo próprio navegador (nada para baixar): acerto, erro, sequência de 3 acertos, ligar e
  montar frases, virar flashcard, contagem final do desafio relâmpago, lição concluída, subir de nível, compra na loja,
  medalha e pagamento confirmado. Botão de alto-falante no topo da página inicial e das lições, e "Ligar/Desligar sons"
  no menu do avatar (a escolha fica no navegador).
- **Animações:** troca de tela suave, cartões que entram em sequência, números que sobem (XP, moedas, nota),
  "+10 XP" subindo ao acertar, onda ao tocar nos botões, chama da sequência tremulando, barras de progresso com brilho,
  moedas voando na compra e confete na mini lição da página inicial. Quem ativa "reduzir movimento" no aparelho não vê animações.
- **Contraste:** todas as telas foram conferidas por um teste automático nos modos claro e escuro (padrão WCAG AA:
  4,5:1 para texto normal). Por isso o vermelho, o verde, o azul e o laranja de fundo ficaram um tom mais escuros
  (texto branco legível) e os textos cinza ficaram um pouco mais fortes.

## Modo escuro e app no celular
- **Modo escuro:** botão de lua no topo da página inicial e no menu do avatar, em todas as telas (inclusive portal, loja, lições, termos e aviso de cookies). O certificado continua claro para imprimir. A escolha fica no navegador.
- **App instalável (PWA):** no site publicado, o Chrome do Android oferece "Instalar app" (botão no rodapé); no iPhone,
  Compartilhar → *Adicionar à Tela de Início*. O app abre direto na trilha, com o ícone do English Smart.

## Prática de fala (microfone)
Na correção automática, o aluno vê a **frase palavra por palavra**: verde (entendida), amarelo (quase) e vermelho
riscado (não entendida), com dica de quais treinar; tocar numa palavra toca o áudio dela devagar.

A atividade "Fale em inglês" escolhe sozinha o melhor modo que o navegador permite:

| Situação | O que acontece |
|---|---|
| Site publicado na internet (https), no **Google Chrome** | **Correção automática**: o navegador transcreve a fala e confere a pronúncia. |
| Site aberto **direto do arquivo** (`index.html` no computador) | **Gravar e comparar**: o aluno grava a voz, ouve e compara com o modelo. (Chrome e Edge bloqueiam o reconhecimento de voz em arquivos locais.) |
| Correção automática falhou (comum no **Edge**, que tem uma falha conhecida no reconhecimento de voz) | Troca sozinho para **Gravar e comparar**. |
| Microfone bloqueado | Explica como liberar (ícone de cadeado ao lado do endereço). |
| Sem microfone | Modo "ouça e repita". |

**Para ter a correção automática:** publique a pasta num endereço https gratuito, como o **Netlify Drop**
(https://app.netlify.com/drop: arraste a pasta e pronto) ou o GitHub Pages, e use o Chrome.

## Lições: áudio e animações
- O áudio **só toca quando o aluno clica** (nada fala sozinho). Depois de responder, aparece o botão "Ouvir a frase".
- Acerto: a opção pulsa, solta faíscas e o painel verde sobe. Erro: a opção treme e a resposta certa pisca em verde.

## Portal do professor (admin)
Entre com o e-mail da tabela `admins` (hoje `pedro.28fxt@gmail.com`).
- Status de cada aluno, calculado pelos últimos 7 dias:
  **Alto desempenho** (bateu a meta, média ≥ 80%) · **Em dia** (bateu a meta) · **Atrasado** (abaixo da meta) · **Inativo** (14+ dias sem estudar).
- Nível, XP, lições concluídas, certificados, última atividade e distribuição por estágio.
- Filtros por status, estágio, **turma** e busca; **CSV** da lista filtrada. Botão **Nova prova** para liberar outro nivelamento.
- Botão **Senha**: gera uma senha provisória para o aluno que esqueceu a senha (ela aparece uma única vez).
- **Ver trilha** abre o curso inteiro desbloqueado para conferência (nada é salvo).
- Abas: **Financeiro** (números do mês, vencimentos, pagamentos + CSV), **Turmas e cupons**, **Erros mais comuns** e
  **Configuração** (checklist de lançamento com bolinha vermelha enquanto faltar algo).

### Checklist de lançamento (aba Configuração)
Conferidos sozinhos: token do Mercado Pago (avisa se for de teste), assinatura do webhook, último aviso recebido,
Resend, responsável nos Termos e Turnstile. Para marcar: chave Pix na conta, endereço do site no Supabase, bloqueio
de senhas vazadas, SMTP e um pagamento real de teste.

### CAPTCHA no cadastro (opcional, grátis)
1. Crie um widget em https://dash.cloudflare.com → **Turnstile** (domínio `englishsmart.app.br`).
2. Cole a **Site Key** em `TURNSTILE_SITE_KEY` (`js/config.js`).
3. Cole a **Secret Key** em https://supabase.com/dashboard/project/wfxqxvlcrqbwvcvqslzi/auth/protection → *Enable CAPTCHA protection* (Turnstile).
Faça os passos 2 e 3 juntos: com só um deles, o login falha.

### Bloquear senhas vazadas
Em https://supabase.com/dashboard/project/wfxqxvlcrqbwvcvqslzi/auth/protection ligue *Prevent use of leaked passwords*
(recurso do plano Pro do Supabase). O site já traduz o aviso para o aluno.

Para adicionar outro administrador, rode no SQL Editor do Supabase:
```sql
insert into public.admins (email) values ('novo-admin@email.com');
```

## Segurança
- A chave em `js/config.js` é a chave **pública** do Supabase; pode ficar no navegador.
- As regras do banco (RLS) garantem que cada aluno só vê os próprios dados, que níveis bloqueados
  não podem ser registrados, que o teste só é aceito depois das 4 lições e que só o admin vê a turma.
- As notas das lições são calculadas no navegador (é prática, então isso é aceitável); a prova de
  nivelamento é corrigida no banco.

## Publicar atualizações (GitHub Pages)
- O visual vem do arquivo pronto `css/tailwind.css` (sem depender do site do Tailwind). Se mudar classes no HTML/JS,
  gere de novo: `npx tailwindcss@3.4.19 -c tailwind.config.js -i css/tailwind-entrada.css -o css/tailwind.css --minify`.
- Os arquivos são chamados com `?v=20261111b` no `index.html`. Ao subir uma versão nova, troque esse número
  (localizar e substituir) para todos os navegadores baixarem os arquivos novos na hora.
- O `sw.js` (app instalável) sempre busca a versão nova primeiro; a cópia guardada só é usada sem internet.

## Como editar o conteúdo
- **Lições, níveis e diálogos:** `js/curriculo.js`. Cada lição tem `g` (gramática), `v` (vocabulário),
  `e` (frases para completar no formato `frase com ___|certa|errada|errada|errada`) e `d` (diálogo).
  As atividades são geradas automaticamente a partir disso.
- **Questões da prova:** tabela `questoes` no Supabase (Table Editor).

## Arquivos
```
index.html            Todas as telas
css/brand.css         Identidade visual, animações e impressão do certificado
css/tailwind.css      Visual pronto (gerado de tailwind.config.js + css/tailwind-entrada.css)
css/escuro.css        Modo escuro (todas as telas)
img/                  Logo, ícones do app e imagem de compartilhamento (compartilhar.png)
manifest.webmanifest  App instalável (nome, ícones, cores)
sw.js                 Service worker do app instalável
js/config.js          Conexão com o Supabase, preços, SITE_URL e TURNSTILE_SITE_KEY
js/curriculo.js       16 níveis × 4 lições + 3 trilhas extras (conteúdo do curso)
js/atividades.js      Gera as atividades das lições, do teste e da revisão; corrige respostas digitadas
js/voz.js             Áudio (voz do navegador) e reconhecimento de fala
js/som.js             Efeitos sonoros (Web Audio)
js/app.js             Troca de telas, sessão e estatísticas
js/inicio.js          Página inicial
js/entrar.js          Entrar, criar conta e "esqueci minha senha"
js/prova.js           Prova de nivelamento
js/curso.js           Trilha do aluno
js/dispositivos.js    Limite de 4 aparelhos (tela de bloqueio e "Meus aparelhos")
js/plano.js           Assinatura: mensal/anual, cartão ou Pix (QR Code), cupom, indicação, status e cancelamento
js/loja.js            Loja de moedas, medalhas e ranking semanal
js/verificar.js       Página pública de verificação de certificado
js/cookies.js         Aviso e preferências de cookies (LGPD)
js/revisao.js         Revisão inteligente (repetição espaçada e treinos)
js/licao.js           Player das lições e do teste do nível
js/certificado.js     Certificado
js/perfil.js          Meu perfil (dados, foto, senha, excluir conta)
js/termos.js          Termos de Uso e Política de Privacidade
js/admin.js           Portal do professor (alunos, financeiro, turmas, cupons, erros, configuração)
supabase/schema.sql   Estrutura completa do banco (já aplicada no seu projeto)
supabase/functions/mercadopago/index.ts   Função do servidor do Mercado Pago (já publicada)
supabase/functions/lembretes/index.ts     E-mails de vencimento (já publicada e agendada)
```
