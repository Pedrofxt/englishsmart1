-- =====================================================================
-- English Smart — esquema completo do banco (Supabase)
-- Já está aplicado no projeto "english-smart". Para recriar tudo em outro
-- projeto, cole este arquivo inteiro no SQL Editor e clique em Run.
-- ATENÇÃO: apaga as tabelas do curso se elas já existirem.
-- =====================================================================

drop table if exists public.certificados cascade;
drop table if exists public.progresso cascade;
drop table if exists public.alunos cascade;
drop table if exists public.questoes cascade;
drop table if exists public.admins cascade;

-- ---------- Administradores (lista de e-mails) ----------
create table public.admins (
  email text primary key
);
alter table public.admins enable row level security; -- sem policies: só as funções leem

insert into public.admins (email) values ('pedro.28fxt@gmail.com');

create or replace function public.eh_admin()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.admins where email = lower(auth.jwt() ->> 'email')
  );
$$;

-- ---------- Alunos ----------
create table public.alunos (
  id             uuid primary key references auth.users(id) on delete cascade,
  nome           text not null,
  email          text not null,
  nivel          text check (nivel in ('A1', 'A2', 'B1', 'B2', 'C1', 'C2')),
  nivel_num      int check (nivel_num between 1 and 16),
  acertos        int,
  total          int,
  detalhes       jsonb,          -- acertos por estágio e por parte da prova
  prova_feita_em timestamptz,
  xp             int not null default 0,
  meta_semanal   int not null default 3 check (meta_semanal between 1 and 14),
  concluiu_curso_em timestamptz,
  criado_em      timestamptz not null default now()
);
alter table public.alunos enable row level security;

create policy "aluno vê o próprio cadastro; admin vê todos"
  on public.alunos for select to authenticated
  using (id = (select auth.uid()) or (select public.eh_admin()));
-- Sem policies de insert/update/delete: tudo passa pelas funções abaixo.

-- Cria o registro do aluno automaticamente quando alguém se cadastra
create or replace function public.criar_aluno()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if not exists (select 1 from public.admins where email = lower(new.email)) then
    insert into public.alunos (id, nome, email)
    values (
      new.id,
      coalesce(nullif(trim(new.raw_user_meta_data ->> 'nome'), ''), split_part(new.email, '@', 1)),
      lower(new.email)
    )
    on conflict (id) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists ao_criar_usuario on auth.users;
create trigger ao_criar_usuario
  after insert on auth.users
  for each row execute function public.criar_aluno();

create or replace function public.nivel_cefr(n int)
returns text language sql immutable set search_path = ''
as $$
  select case when n <= 3 then 'A1' when n <= 6 then 'A2' when n <= 9 then 'B1'
              when n <= 12 then 'B2' when n <= 15 then 'C1' else 'C2' end;
$$;

-- ---------- Prova de nivelamento (2 partes, estágios A1 a C1) ----------
create table public.questoes (
  id          serial primary key,
  ordem       int not null,
  secao       text not null check (secao in ('gramatica', 'vocabulario')),
  nivel       text not null check (nivel in ('A1', 'A2', 'B1', 'B2', 'C1')),
  texto_apoio text,
  enunciado   text not null,
  opcoes      jsonb not null,
  correta     int not null        -- índice da opção certa (0 a 3)
);
alter table public.questoes enable row level security; -- sem policies: o gabarito fica protegido

insert into public.questoes (ordem, secao, nivel, texto_apoio, enunciado, opcoes, correta) values
( 1,'gramatica','A1',null,'Hello! My name ___ Ana.','["is","are","am","be"]',0),
( 2,'gramatica','A1',null,'They ___ from Brazil.','["is","am","are","be"]',2),
( 3,'gramatica','A1',null,'She ___ coffee every morning.','["drink","drinks","drinking","is drink"]',1),
( 4,'gramatica','A2',null,'Yesterday I ___ to the beach.','["go","goes","went","gone"]',2),
( 5,'gramatica','A2',null,'There aren''t ___ apples in the fridge.','["some","any","a","much"]',1),
( 6,'gramatica','A2',null,'My brother is ___ than me.','["tall","more tall","taller","tallest"]',2),
( 7,'gramatica','B1',null,'I ___ here since 2020.','["live","lived","have lived","am living"]',2),
( 8,'gramatica','B1',null,'If it rains tomorrow, we ___ at home.','["stay","will stay","would stay","stayed"]',1),
( 9,'gramatica','B1',null,'This book ___ by millions of people.','["has read","has been read","have read","is reading"]',1),
(10,'gramatica','B2',null,'If I ___ about the traffic, I would have left earlier.','["knew","had known","have known","would know"]',1),
(11,'gramatica','B2',null,'She suggested ___ a taxi to the airport.','["to take","taking","take","took"]',1),
(12,'gramatica','B2',null,'Hardly ___ the house when it started to rain.','["I had left","had I left","I left","did I leave"]',1),
(13,'gramatica','C1',null,'Not until the results were published ___ how serious the problem was.','["we realised","did we realise","we did realise","had realised"]',1),
(14,'gramatica','C1',null,'It''s high time the government ___ action on this issue.','["takes","took","will take","has taken"]',1),
(15,'gramatica','C1',null,'Had the company invested earlier, it ___ in a much stronger position now.','["would be","will be","would have been","is"]',0),
(16,'vocabulario','A1',null,'Choose the opposite of "big".','["small","tall","old","long"]',0),
(17,'vocabulario','A1',null,'"What time is it?" — Choose the best answer.','["It''s seven o''clock.","It''s Monday.","I''m fine, thanks.","It''s in the kitchen."]',0),
(18,'vocabulario','A2',null,'I''m really hungry. Let''s go to the ___.','["library","restaurant","bank","airport"]',1),
(19,'vocabulario','A2','Hi Tom, I can''t go to the cinema tonight because I have a test tomorrow. Can we go on Saturday? — Julia',
     'Why can''t Julia go to the cinema tonight?','["She is sick.","She has a test tomorrow.","She doesn''t like films.","The cinema is closed."]',1),
(20,'vocabulario','B1',null,'My flight was ___ because of the storm, so I waited for three hours.','["delayed","landed","booked","boarded"]',0),
(21,'vocabulario','B1','Many companies now let employees work from home two or three days a week. Workers save time on commuting, but some say they miss talking to their colleagues in person.',
     'According to the text, what is a disadvantage of working from home?','["Spending more time commuting.","Missing face-to-face contact with colleagues.","Earning less money.","Working more days a week."]',1),
(22,'vocabulario','B2',null,'The meeting was ___ off because the manager was ill.','["called","put","taken","turned"]',0),
(23,'vocabulario','B2','Although the new policy was intended to reduce traffic in the city centre, critics argue that it has merely shifted congestion to neighbouring areas rather than solving the underlying problem.',
     'What do the critics believe?','["The policy completely solved the problem.","The policy moved the traffic to other areas.","The policy improved public transport.","The policy was never put into practice."]',1),
(24,'vocabulario','C1',null,'Her explanation was so ___ that everyone understood it immediately.','["lucid","vague","tedious","reluctant"]',0),
(25,'vocabulario','C1','The author contends that, far from being a panacea, technology often exacerbates the very inequalities it purports to address.',
     'What is the author''s view of technology?','["It solves inequality completely.","It can make existing inequalities worse.","It has no effect on inequality.","It should be banned from schools."]',1);

-- Entrega as questões SEM o gabarito
create or replace function public.obter_prova()
returns table (id int, secao text, texto_apoio text, enunciado text, opcoes jsonb)
language sql stable security definer set search_path = ''
as $$
  select q.id, q.secao, q.texto_apoio, q.enunciado, q.opcoes
  from public.questoes q
  where auth.uid() is not null
  order by q.ordem;
$$;

-- Corrige a prova no banco e define o nível de 1 a 16 (3 níveis por estágio; passou em tudo = 16)
create or replace function public.enviar_prova(respostas jsonb)
returns json
language plpgsql security definer set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  aluno public.alunos;
  faixas text[] := array['A1','A2','B1','B2','C1'];
  b int; ac int; tot int;
  num int := null;
  soma int := 0; soma_tot int := 0;
  det jsonb := '{}'::jsonb;
  secoes jsonb;
begin
  if uid is null then raise exception 'Faça login para enviar a prova.'; end if;
  select * into aluno from public.alunos where id = uid;
  if not found then raise exception 'Apenas alunos fazem a prova de nivelamento.'; end if;
  if aluno.prova_feita_em is not null then raise exception 'Você já fez a prova de nivelamento.'; end if;

  for b in 1..array_length(faixas, 1) loop
    select count(*) filter (where (respostas ->> q.id::text) ~ '^[0-9]+$' and (respostas ->> q.id::text)::int = q.correta),
           count(*)
      into ac, tot
      from public.questoes q where q.nivel = faixas[b];
    soma := soma + ac; soma_tot := soma_tot + tot;
    det := det || jsonb_build_object(faixas[b], jsonb_build_object('acertos', ac, 'total', tot));
    if num is null and ac::numeric < tot * 0.6 then
      num := (b - 1) * 3 + 1 + least(ac, 2);
    end if;
  end loop;
  num := coalesce(num, 16);

  select jsonb_object_agg(secao, jsonb_build_object('acertos', a, 'total', t)) into secoes from (
    select q.secao,
           count(*) filter (where (respostas ->> q.id::text) ~ '^[0-9]+$' and (respostas ->> q.id::text)::int = q.correta) a,
           count(*) t
      from public.questoes q group by q.secao) s;

  update public.alunos
     set nivel_num = num, nivel = public.nivel_cefr(num), acertos = soma, total = soma_tot,
         detalhes = jsonb_build_object('faixas', det, 'secoes', secoes), prova_feita_em = now()
   where id = uid;

  return json_build_object('nivel_num', num, 'nivel', public.nivel_cefr(num), 'acertos', soma, 'total', soma_tot,
                           'detalhes', jsonb_build_object('faixas', det, 'secoes', secoes));
end;
$$;

-- Admin libera o aluno para refazer a prova (lições e certificados continuam)
create or replace function public.liberar_nova_prova(aluno_id uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not public.eh_admin() then raise exception 'Acesso restrito ao administrador.'; end if;
  update public.alunos
     set nivel = null, nivel_num = null, acertos = null, total = null, detalhes = null, prova_feita_em = null
   where id = aluno_id;
end;
$$;

-- ---------- Progresso nas lições (licao 0 = teste do nível) ----------
create table public.progresso (
  aluno_id      uuid not null references public.alunos(id) on delete cascade,
  nivel_num     int  not null check (nivel_num between 1 and 16),
  licao         int  not null check (licao between 0 and 4),
  acertos       int  not null,
  total         int  not null,
  tentativas    int  not null default 1,
  concluida_em  timestamptz not null default now(),
  atualizada_em timestamptz not null default now(),
  primary key (aluno_id, nivel_num, licao)
);
alter table public.progresso enable row level security;
create policy "aluno vê o próprio progresso; admin vê todos"
  on public.progresso for select to authenticated
  using (aluno_id = (select auth.uid()) or (select public.eh_admin()));

-- ---------- Certificados (um por nível concluído) ----------
create table public.certificados (
  aluno_id   uuid not null references public.alunos(id) on delete cascade,
  nivel_num  int  not null check (nivel_num between 1 and 16),
  emitido_em timestamptz not null default now(),
  codigo     text not null default upper(substr(md5(random()::text || clock_timestamp()::text), 1, 10)),
  primary key (aluno_id, nivel_num)
);
alter table public.certificados enable row level security;
create policy "aluno vê os próprios certificados; admin vê todos"
  on public.certificados for select to authenticated
  using (aluno_id = (select auth.uid()) or (select public.eh_admin()));

-- Registra uma lição (1–4) ou o teste do nível (0). Teste aprovado (70%) = certificado + próximo nível.
create or replace function public.registrar_atividade(p_nivel int, p_licao int, p_acertos int, p_total int)
returns json
language plpgsql security definer set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  aluno public.alunos;
  ant public.progresso;
  ganho int;
  licoes_ok int;
  subiu boolean := false;
  concluiu boolean := false;
  cert text := null;
begin
  if uid is null then raise exception 'Faça login para continuar.'; end if;
  select * into aluno from public.alunos where id = uid;
  if not found then raise exception 'Apenas alunos registram atividades.'; end if;
  if aluno.nivel_num is null then raise exception 'Faça a prova de nivelamento primeiro.'; end if;
  if p_nivel is null or p_nivel < 1 or p_nivel > aluno.nivel_num then raise exception 'Este nível ainda está bloqueado.'; end if;
  if p_licao is null or p_licao < 0 or p_licao > 4 then raise exception 'Atividade inválida.'; end if;
  if p_total is null or p_total < 1 or p_total > 60 or p_acertos is null or p_acertos < 0 or p_acertos > p_total then
    raise exception 'Resultado inválido.';
  end if;

  if p_licao = 0 then
    select count(*) into licoes_ok from public.progresso
     where aluno_id = uid and nivel_num = p_nivel and licao between 1 and 4 and acertos >= total * 0.6;
    if licoes_ok < 4 then raise exception 'Conclua as 4 lições do nível antes do teste.'; end if;
  end if;

  select * into ant from public.progresso where aluno_id = uid and nivel_num = p_nivel and licao = p_licao;
  if not found then
    insert into public.progresso (aluno_id, nivel_num, licao, acertos, total)
    values (uid, p_nivel, p_licao, p_acertos, p_total);
    ganho := p_acertos * 10;
  else
    ganho := greatest(0, p_acertos - ant.acertos) * 10;
    update public.progresso
       set acertos = greatest(ant.acertos, p_acertos), total = p_total,
           tentativas = ant.tentativas + 1, atualizada_em = now()
     where aluno_id = uid and nivel_num = p_nivel and licao = p_licao;
  end if;
  if p_licao = 0 and p_acertos >= p_total * 0.7 then ganho := ganho + 100; end if;

  update public.alunos set xp = xp + ganho where id = uid;

  if p_licao = 0 and p_nivel = aluno.nivel_num and p_acertos >= p_total * 0.7 then
    insert into public.certificados (aluno_id, nivel_num) values (uid, p_nivel)
      on conflict (aluno_id, nivel_num) do nothing;
    select codigo into cert from public.certificados where aluno_id = uid and nivel_num = p_nivel;
    if p_nivel < 16 then
      update public.alunos set nivel_num = p_nivel + 1, nivel = public.nivel_cefr(p_nivel + 1) where id = uid;
      subiu := true;
    else
      update public.alunos set concluiu_curso_em = coalesce(concluiu_curso_em, now()) where id = uid;
      concluiu := true;
    end if;
  end if;

  return json_build_object(
    'xp_ganho', ganho,
    'xp_total', (select xp from public.alunos where id = uid),
    'subiu', subiu, 'concluiu_curso', concluiu,
    'nivel_num', (select nivel_num from public.alunos where id = uid),
    'certificado', cert);
end;
$$;

-- Aluno escolhe a própria meta semanal (1 a 14 atividades)
create or replace function public.definir_meta(p_meta int)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if auth.uid() is null then raise exception 'Faça login para continuar.'; end if;
  if p_meta < 1 or p_meta > 14 then raise exception 'Meta inválida.'; end if;
  update public.alunos set meta_semanal = p_meta where id = auth.uid();
end;
$$;

-- ---------- Permissões das funções ----------
revoke all on function public.eh_admin()                           from public, anon;
revoke all on function public.obter_prova()                        from public, anon;
revoke all on function public.enviar_prova(jsonb)                  from public, anon;
revoke all on function public.liberar_nova_prova(uuid)             from public, anon;
revoke all on function public.registrar_atividade(int,int,int,int) from public, anon;
revoke all on function public.definir_meta(int)                    from public, anon;
revoke all on function public.criar_aluno()                        from public, anon, authenticated;

grant execute on function public.eh_admin()                           to authenticated;
grant execute on function public.obter_prova()                        to authenticated;
grant execute on function public.enviar_prova(jsonb)                  to authenticated;
grant execute on function public.liberar_nova_prova(uuid)             to authenticated;
grant execute on function public.registrar_atividade(int,int,int,int) to authenticated;
grant execute on function public.definir_meta(int)                    to authenticated;

-- Cria o registro de quem já tinha conta antes deste esquema (exceto admins)
insert into public.alunos (id, nome, email)
select u.id,
       coalesce(nullif(trim(u.raw_user_meta_data ->> 'nome'), ''), split_part(u.email, '@', 1)),
       lower(u.email)
from auth.users u
where not exists (select 1 from public.admins a where a.email = lower(u.email))
on conflict (id) do nothing;

-- =====================================================================
-- Perfil do aluno, fotos de perfil e exclusão de conta (LGPD)
-- =====================================================================
alter table public.alunos
  add column if not exists telefone text check (telefone is null or char_length(telefone) <= 20),
  add column if not exists cidade   text check (cidade is null or char_length(cidade) <= 80),
  add column if not exists avatar   text check (avatar is null or char_length(avatar) <= 300);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatares', 'avatares', true, 1048576, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = true, file_size_limit = 1048576, allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

drop policy if exists "avatar: dono envia" on storage.objects;
drop policy if exists "avatar: dono altera" on storage.objects;
drop policy if exists "avatar: dono apaga" on storage.objects;
create policy "avatar: dono envia" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatares' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "avatar: dono altera" on storage.objects for update to authenticated
  using (bucket_id = 'avatares' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "avatar: dono apaga" on storage.objects for delete to authenticated
  using (bucket_id = 'avatares' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- Troque o endereço abaixo pelo do seu projeto se recriar em outra conta
create or replace function public.atualizar_perfil(p_nome text, p_telefone text, p_cidade text, p_avatar text)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  nome_limpo text := trim(coalesce(p_nome, ''));
  tel text := nullif(trim(coalesce(p_telefone, '')), '');
  cid text := nullif(trim(coalesce(p_cidade, '')), '');
  av text := nullif(trim(coalesce(p_avatar, '')), '');
begin
  if uid is null then raise exception 'Faça login para continuar.'; end if;
  if char_length(nome_limpo) < 2 or char_length(nome_limpo) > 80 then raise exception 'Informe um nome entre 2 e 80 caracteres.'; end if;
  if tel is not null and tel !~ '^[0-9()+\- ]{8,20}$' then raise exception 'Telefone inválido.'; end if;
  if cid is not null and char_length(cid) > 80 then raise exception 'Cidade muito longa.'; end if;
  if av is not null and not (
       av ~ '^cor:#[0-9A-Fa-f]{6}$'
    or av ~ '^icone:(capelo|livro|globo|estrela|foguete|microfone|fone|cafe)$'
    or av like 'https://wfxqxvlcrqbwvcvqslzi.supabase.co/storage/v1/object/public/avatares/' || uid::text || '/%'
  ) then
    raise exception 'Avatar inválido.';
  end if;
  update public.alunos set nome = nome_limpo, telefone = tel, cidade = cid, avatar = av where id = uid;
  if not found then raise exception 'Cadastro de aluno não encontrado.'; end if;
end;
$$;

create or replace function public.excluir_minha_conta()
returns void
language plpgsql security definer set search_path = ''
as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'Faça login para continuar.'; end if;
  if public.eh_admin() then raise exception 'A conta de administrador não pode ser excluída por aqui.'; end if;
  delete from auth.users where id = uid;
end;
$$;

revoke all on function public.atualizar_perfil(text, text, text, text) from public, anon;
revoke all on function public.excluir_minha_conta()                   from public, anon;
grant execute on function public.atualizar_perfil(text, text, text, text) to authenticated;
grant execute on function public.excluir_minha_conta()                   to authenticated;


-- =====================================================================
-- REVISÃO INTELIGENTE (repetição espaçada) e SENHA PROVISÓRIA
-- =====================================================================

-- Cada item estudado pelo aluno (palavra, frase de gramática ou fala de diálogo)
-- item = tipo|nível|lição|posição  →  v = vocabulário, e = frase de gramática, d = fala do diálogo
create table if not exists public.revisao (
  aluno_id      uuid not null references public.alunos(id) on delete cascade,
  item          text not null check (item ~ '^[ved]\|([1-9]|1[0-6])\|[1-4]\|[0-9]{1,2}$'),
  nivel_num     int  not null check (nivel_num between 1 and 16),
  caixa         int  not null default 0 check (caixa between 0 and 5), -- 0 = errou/novo · 5 = dominado
  acertos       int  not null default 0,
  erros         int  not null default 0,
  proxima       timestamptz not null default now(),                  -- quando revisar de novo
  atualizada_em timestamptz not null default now(),
  primary key (aluno_id, item)
);
create index if not exists revisao_proxima on public.revisao (aluno_id, proxima);

-- Cada sessão de revisão (conta na meta semanal e na sequência de dias)
create table if not exists public.sessoes_revisao (
  id       bigint generated always as identity primary key,
  aluno_id uuid not null references public.alunos(id) on delete cascade,
  modo     text not null check (modo in ('dia', 'erros', 'estagio', 'ditado', 'escrita', 'relampago', 'flashcards')),
  acertos  int  not null check (acertos >= 0),
  total    int  not null check (total >= 0),
  xp       int  not null default 0,
  feita_em timestamptz not null default now()
);
create index if not exists sessoes_revisao_aluno on public.sessoes_revisao (aluno_id, feita_em);

alter table public.revisao enable row level security;
alter table public.sessoes_revisao enable row level security;

drop policy if exists "aluno vê a própria revisão" on public.revisao;
create policy "aluno vê a própria revisão" on public.revisao
  for select to authenticated using (aluno_id = (select auth.uid()) or (select public.eh_admin()));

drop policy if exists "aluno vê as próprias sessões" on public.sessoes_revisao;
create policy "aluno vê as próprias sessões" on public.sessoes_revisao
  for select to authenticated using (aluno_id = (select auth.uid()) or (select public.eh_admin()));

-- Registra o resultado de uma revisão (ou dos itens de uma lição, com p_modo = 'licao')
-- p_itens = [{ "item": "v|7|1|3", "certo": true }, ...]
-- Intervalos da repetição espaçada por caixa: 0 → hoje · 1 → 1 dia · 2 → 3 · 3 → 7 · 4 → 16 · 5 → 35 dias
create or replace function public.registrar_revisao(p_modo text, p_itens jsonb, p_acertos int, p_total int)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  a public.alunos;
  x jsonb;
  v_item text;
  v_nivel int;
  v_certo boolean;
  dias int[] := array[0, 1, 3, 7, 16, 35];
  hoje_xp int;
  ganho int := 0;
  recorde int;
begin
  select * into a from public.alunos where id = uid;
  if a.id is null then raise exception 'Apenas alunos registram revisões.'; end if;
  if a.nivel_num is null then raise exception 'Faça a prova de nivelamento primeiro.'; end if;
  if p_modo not in ('licao', 'dia', 'erros', 'estagio', 'ditado', 'escrita', 'relampago', 'flashcards') then raise exception 'Modo inválido.'; end if;
  if jsonb_typeof(p_itens) <> 'array' or jsonb_array_length(p_itens) > 80 then raise exception 'Itens inválidos.'; end if;
  if p_total < 0 or p_total > 80 or p_acertos < 0 or p_acertos > p_total then raise exception 'Resultado inválido.'; end if;

  for x in select * from jsonb_array_elements(p_itens) loop
    v_item := x->>'item';
    v_certo := coalesce((x->>'certo')::boolean, false);
    continue when v_item is null or v_item !~ '^[ved]\|([1-9]|1[0-6])\|[1-4]\|[0-9]{1,2}$';
    v_nivel := split_part(v_item, '|', 2)::int;
    continue when v_nivel > a.nivel_num; -- nível ainda bloqueado

    insert into public.revisao as r (aluno_id, item, nivel_num, caixa, acertos, erros, proxima, atualizada_em)
    values (uid, v_item, v_nivel,
            case when v_certo then 1 else 0 end,
            case when v_certo then 1 else 0 end,
            case when v_certo then 0 else 1 end,
            now() + make_interval(days => case when v_certo then dias[2] else 0 end), now())
    on conflict (aluno_id, item) do update set
      caixa   = case when v_certo then least(r.caixa + 1, 5) else 0 end,
      acertos = r.acertos + case when v_certo then 1 else 0 end,
      erros   = r.erros + case when v_certo then 0 else 1 end,
      proxima = now() + make_interval(days => case when v_certo then dias[least(r.caixa + 1, 5) + 1] else 0 end),
      atualizada_em = now();
  end loop;

  if p_modo = 'licao' then
    return jsonb_build_object('xp_ganho', 0, 'xp_total', a.xp);
  end if;

  -- 5 XP por acerto, até 100 XP por dia vindos de revisões
  select coalesce(sum(xp), 0) into hoje_xp from public.sessoes_revisao
   where aluno_id = uid and feita_em >= date_trunc('day', now());
  ganho := least(p_acertos * 5, greatest(0, 100 - hoje_xp));
  select max(acertos) into recorde from public.sessoes_revisao where aluno_id = uid and modo = p_modo;

  insert into public.sessoes_revisao (aluno_id, modo, acertos, total, xp) values (uid, p_modo, p_acertos, p_total, ganho);
  update public.alunos set xp = xp + ganho where id = uid returning xp into a.xp;

  return jsonb_build_object('xp_ganho', ganho, 'xp_total', a.xp, 'recorde_anterior', recorde);
end;
$$;

-- O professor gera uma senha provisória para um aluno que esqueceu a senha
-- (funciona mesmo sem e-mail configurado). O aluno troca depois em "Meu perfil".
create or replace function public.admin_redefinir_senha(p_aluno uuid)
returns text
language plpgsql security definer set search_path = ''
as $$
declare
  nova text := 'ES-' || substr(replace(replace(encode(extensions.gen_random_bytes(9), 'base64'), '/', 'x'), '+', 'k'), 1, 10);
begin
  if not public.eh_admin() then raise exception 'Acesso restrito ao administrador.'; end if;
  if not exists (select 1 from public.alunos where id = p_aluno) then raise exception 'Aluno não encontrado.'; end if;
  update auth.users
     set encrypted_password = extensions.crypt(nova, extensions.gen_salt('bf')), updated_at = now()
   where id = p_aluno;
  return nova;
end;
$$;

revoke all on function public.registrar_revisao(text, jsonb, int, int) from public, anon;
revoke all on function public.admin_redefinir_senha(uuid)              from public, anon;
grant execute on function public.registrar_revisao(text, jsonb, int, int) to authenticated;
grant execute on function public.admin_redefinir_senha(uuid)              to authenticated;
