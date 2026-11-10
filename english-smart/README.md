# English Smart — Curso de Inglês Inteligente

Plataforma completa de inglês, do zero à fluência, com plano grátis e assinatura Premium pelo Mercado Pago, inspirada no modelo das plataformas usadas na rede
estadual (prova de nivelamento, 16 níveis alinhados ao CEFR, metas semanais e certificados).
Feita em HTML, Tailwind e JavaScript, com banco e login no **Supabase**.

**Não precisa de servidor, Node ou terminal: é só dar dois cliques no `index.html`.**

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
**pedro.farias.toledo@gmail.com** como contato (em `js/config.js`). O CPF/CNPJ é opcional: se quiser exibir, preencha `RESPONSAVEL_DOC`.

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

## Plano Premium (assinatura mensal pelo Mercado Pago)

| | Grátis | Premium · R$ 29,99/mês |
|---|---|---|
| Prova de nivelamento | ✓ | ✓ |
| 1ª lição de cada nível | ✓ | ✓ |
| Lições 2, 3 e 4, teste do nível e certificados | | ✓ |
| Revisão inteligente | | ✓ |

**Como funciona:** o aluno clica em **Assinar** (`#/planos`), paga no Mercado Pago com cobrança automática todo mês e o
Premium é liberado sozinho, sem recarregar a página. Ele cancela em **Meu plano** e continua com acesso até o fim do mês pago.
Excluir a conta também cancela a cobrança. O professor vê o plano de cada aluno, os assinantes e a receita estimada no
portal, e pode liberar **Cortesia** (Premium grátis por X dias).

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
- **Pratique:** cerca de 14 atividades com correção na hora: significado, tradução, ouvir e escolher,
  completar frases, montar a frase, completar o diálogo e **falar** (reconhecimento de voz).
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

### Motivação
- **Meta semanal** (o aluno escolhe de 1 a 14 atividades), **XP** (10 por acerto, +100 por nível) e **sequência de dias**.
- **Certificado** imprimível (ou salvo em PDF) a cada nível, com código de verificação.

## Conta do aluno
- **Avatar no canto superior direito** de todas as telas logadas, com menu: Meu perfil, Minha trilha, Termos e privacidade e Sair.
- **Meu perfil** (`#/perfil`): nome, telefone e cidade; foto de perfil (recortada e reduzida automaticamente, guardada no Supabase Storage)
  ou avatar com cor ou ícone; troca de senha; progresso; certificados; e **Excluir conta** (apaga tudo, conforme a LGPD).
- **Termos de Uso e Política de Privacidade** (`#/termos`): aba no topo da página inicial e no rodapé. O cadastro exige o aceite,
  que fica registrado com data e versão.

## Prática de fala (microfone)
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
- Filtros por status, estágio e busca. Botão **Nova prova** para liberar outro nivelamento.
- Botão **Senha**: gera uma senha provisória para o aluno que esqueceu a senha (ela aparece uma única vez).
- **Ver trilha** abre o curso inteiro desbloqueado para conferência (nada é salvo).

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

## Como editar o conteúdo
- **Lições, níveis e diálogos:** `js/curriculo.js`. Cada lição tem `g` (gramática), `v` (vocabulário),
  `e` (frases para completar no formato `frase com ___|certa|errada|errada|errada`) e `d` (diálogo).
  As atividades são geradas automaticamente a partir disso.
- **Questões da prova:** tabela `questoes` no Supabase (Table Editor).

## Arquivos
```
index.html            Todas as telas
css/brand.css         Identidade visual, animações e impressão do certificado
img/                  Logo e ícone
js/config.js          Conexão com o Supabase
js/curriculo.js       16 níveis × 4 lições (conteúdo do curso)
js/atividades.js      Gera as atividades das lições, do teste e da revisão; corrige respostas digitadas
js/voz.js             Áudio (voz do navegador) e reconhecimento de fala
js/app.js             Troca de telas, sessão e estatísticas
js/inicio.js          Página inicial
js/entrar.js          Entrar, criar conta e "esqueci minha senha"
js/prova.js           Prova de nivelamento
js/curso.js           Trilha do aluno
js/plano.js           Plano Premium: assinar, status, pagamentos e cancelamento
js/revisao.js         Revisão inteligente (repetição espaçada e treinos)
js/licao.js           Player das lições e do teste do nível
js/certificado.js     Certificado
js/perfil.js          Meu perfil (dados, foto, senha, excluir conta)
js/termos.js          Termos de Uso e Política de Privacidade
js/admin.js           Portal do professor
supabase/schema.sql   Estrutura completa do banco (já aplicada no seu projeto)
supabase/functions/mercadopago/index.ts   Função do servidor do Mercado Pago (já publicada)
```
