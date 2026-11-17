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


-- =====================================================================
-- PLANO PREMIUM (assinatura mensal pelo Mercado Pago)
-- Grátis: prova de nivelamento + 1ª lição de cada nível
-- Premium: todas as lições, testes do nível, certificados e revisão inteligente
-- =====================================================================

create table if not exists public.assinaturas (
  aluno_id         uuid primary key references public.alunos(id) on delete cascade,
  mp_id            text unique,                                  -- id da assinatura (preapproval) no Mercado Pago
  status           text not null default 'pendente' check (status in ('pendente', 'ativa', 'pausada', 'cancelada')),
  valor            numeric(10, 2) not null default 29.99,
  email_pagador    text,
  proxima_cobranca timestamptz,
  pago_ate         timestamptz,                                  -- acesso garantido até esta data
  cortesia_ate     timestamptz,                                  -- acesso liberado pelo professor
  criada_em        timestamptz not null default now(),
  atualizada_em    timestamptz not null default now()
);

create table if not exists public.pagamentos (
  id         text primary key,                                   -- id da cobrança (authorized_payment) no Mercado Pago
  aluno_id   uuid not null references public.alunos(id) on delete cascade,
  valor      numeric(10, 2) not null,
  status     text not null,
  pago_em    timestamptz,
  criado_em  timestamptz not null default now()
);
create index if not exists pagamentos_aluno on public.pagamentos (aluno_id, criado_em);

alter table public.assinaturas enable row level security;
alter table public.pagamentos enable row level security;

drop policy if exists "aluno vê a própria assinatura" on public.assinaturas;
create policy "aluno vê a própria assinatura" on public.assinaturas
  for select to authenticated using (aluno_id = (select auth.uid()) or (select public.eh_admin()));

drop policy if exists "aluno vê os próprios pagamentos" on public.pagamentos;
create policy "aluno vê os próprios pagamentos" on public.pagamentos
  for select to authenticated using (aluno_id = (select auth.uid()) or (select public.eh_admin()));
-- Ninguém grava pelo navegador: só a função do servidor (Mercado Pago) e o admin, via funções abaixo.

-- O aluno tem acesso Premium agora?
create or replace function public.eh_assinante(p_aluno uuid default null)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select public.eh_admin() and p_aluno is null
      or exists (
        select 1 from public.assinaturas
         where aluno_id = coalesce(p_aluno, auth.uid())
           and (pago_ate > now() or cortesia_ate > now()));
$$;

-- Professor libera (ou retira) acesso Premium de cortesia: p_dias = 0 retira
create or replace function public.admin_cortesia(p_aluno uuid, p_dias int)
returns timestamptz
language plpgsql security definer set search_path = ''
as $$
declare ate timestamptz := case when p_dias > 0 then now() + make_interval(days => least(p_dias, 3650)) else null end;
begin
  if not public.eh_admin() then raise exception 'Acesso restrito ao administrador.'; end if;
  if not exists (select 1 from public.alunos where id = p_aluno) then raise exception 'Aluno não encontrado.'; end if;
  insert into public.assinaturas (aluno_id, cortesia_ate) values (p_aluno, ate)
    on conflict (aluno_id) do update set cortesia_ate = ate, atualizada_em = now();
  return ate;
end;
$$;

-- registrar_atividade com a trava do plano: lições 2 a 4 e teste do nível só para assinantes
create or replace function public.registrar_atividade(p_nivel integer, p_licao integer, p_acertos integer, p_total integer)
returns json
language plpgsql security definer set search_path = ''
as $function$
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
  if p_licao <> 1 and not public.eh_assinante(uid) then raise exception 'Conteúdo do plano Premium. Assine para continuar.'; end if;
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
$function$;

-- Revisão inteligente: só Premium (os itens da 1ª lição continuam sendo guardados no modo 'licao')
do $$
declare d text;
begin
  d := pg_get_functiondef('public.registrar_revisao(text,jsonb,int,int)'::regprocedure);
  if position('plano Premium' in d) = 0 then
    d := replace(d, '  if jsonb_typeof(p_itens)',
      '  if p_modo <> ''licao'' and not public.eh_assinante(uid) then raise exception ''A revisão inteligente faz parte do plano Premium.''; end if;' || chr(10) || '  if jsonb_typeof(p_itens)');
    execute d;
  end if;
end $$;

revoke all on function public.eh_assinante(uuid)        from public, anon, authenticated; -- uso interno das outras funções
revoke all on function public.admin_cortesia(uuid, int) from public, anon;
grant execute on function public.admin_cortesia(uuid, int) to authenticated;


-- =====================================================================
-- PIX: pagamento avulso que libera 30 dias de Premium (QR Code gerado pelo Mercado Pago)
-- =====================================================================
alter table public.pagamentos add column if not exists metodo text not null default 'cartao' check (metodo in ('cartao', 'pix'));
alter table public.pagamentos add column if not exists dias int;
alter table public.pagamentos add column if not exists qr_code text;
alter table public.pagamentos add column if not exists qr_base64 text;
alter table public.pagamentos add column if not exists link text;
alter table public.pagamentos add column if not exists expira_em timestamptz;
alter table public.assinaturas add column if not exists ultimo_metodo text check (ultimo_metodo in ('cartao', 'pix'));


-- =====================================================================
-- SEM PLANO GRÁTIS: cadastro e prova de nivelamento são livres; lições, testes e revisão só com assinatura
-- =====================================================================
do $$
declare d text;
begin
  d := pg_get_functiondef('public.registrar_atividade(int,int,int,int)'::regprocedure);
  d := replace(d, 'if p_licao <> 1 and not public.eh_assinante(uid) then raise exception ''Conteúdo do plano Premium. Assine para continuar.''; end if;',
                  'if not public.eh_assinante(uid) then raise exception ''Assine o English Smart para acessar as lições.''; end if;');
  execute d;
  d := pg_get_functiondef('public.registrar_revisao(text,jsonb,int,int)'::regprocedure);
  d := replace(d, 'if p_modo <> ''licao'' and not public.eh_assinante(uid) then raise exception ''A revisão inteligente faz parte do plano Premium.''; end if;',
                  'if not public.eh_assinante(uid) then raise exception ''Assine o English Smart para acessar a revisão.''; end if;');
  execute d;
end $$;


-- =====================================================================
-- LIMITE DE 4 APARELHOS POR CONTA
-- Sair da conta não libera a vaga; aparelho sem uso há 60 dias sai sozinho;
-- o aluno remove até 3 aparelhos a cada 30 dias; o professor pode zerar.
-- =====================================================================
create table if not exists public.dispositivos (
  aluno_id  uuid not null references public.alunos(id) on delete cascade,
  id        text not null check (id ~ '^[A-Za-z0-9-]{8,64}$'),
  nome      text check (length(nome) <= 80),
  digital   text check (length(digital) <= 64),
  criado_em timestamptz not null default now(),
  visto_em  timestamptz not null default now(),
  primary key (aluno_id, id)
);
create table if not exists public.dispositivos_remocoes (
  id          bigint generated always as identity primary key,
  aluno_id    uuid not null references public.alunos(id) on delete cascade,
  removido_em timestamptz not null default now()
);
create index if not exists dispositivos_remocoes_aluno on public.dispositivos_remocoes (aluno_id, removido_em);
alter table public.dispositivos enable row level security;
alter table public.dispositivos_remocoes enable row level security;
drop policy if exists "aluno vê os próprios aparelhos" on public.dispositivos;
create policy "aluno vê os próprios aparelhos" on public.dispositivos
  for select to authenticated using (aluno_id = (select auth.uid()) or (select public.eh_admin()));
drop policy if exists "aluno vê as próprias remoções" on public.dispositivos_remocoes;
create policy "aluno vê as próprias remoções" on public.dispositivos_remocoes
  for select to authenticated using (aluno_id = (select auth.uid()) or (select public.eh_admin()));

create or replace function public.registrar_dispositivo(p_id text, p_nome text, p_digital text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); limite constant int := 4; total int; restantes int;
begin
  if uid is null then raise exception 'Faça login para continuar.'; end if;
  if public.eh_admin() or not exists (select 1 from public.alunos where id = uid) then return jsonb_build_object('ok', true, 'limite', limite); end if;
  if p_id is null or p_id !~ '^[A-Za-z0-9-]{8,64}$' then raise exception 'Aparelho inválido.'; end if;
  delete from public.dispositivos where aluno_id = uid and visto_em < now() - interval '60 days';
  update public.dispositivos set visto_em = now(), nome = left(coalesce(p_nome, nome), 80) where aluno_id = uid and id = p_id;
  if not found and p_digital is not null and length(p_digital) between 8 and 64 then
    update public.dispositivos set id = p_id, visto_em = now(), nome = left(coalesce(p_nome, nome), 80)
     where aluno_id = uid and digital = p_digital
       and ctid = (select ctid from public.dispositivos where aluno_id = uid and digital = p_digital order by visto_em desc limit 1);
  end if;
  if not found then
    select count(*) into total from public.dispositivos where aluno_id = uid;
    if total >= limite then
      select greatest(0, 3 - count(*)) into restantes from public.dispositivos_remocoes where aluno_id = uid and removido_em > now() - interval '30 days';
      return jsonb_build_object('ok', false, 'limite', limite, 'remocoes_restantes', restantes,
        'dispositivos', (select coalesce(jsonb_agg(jsonb_build_object('id', id, 'nome', nome, 'visto_em', visto_em, 'criado_em', criado_em) order by visto_em desc), '[]')
                           from public.dispositivos where aluno_id = uid));
    end if;
    insert into public.dispositivos (aluno_id, id, nome, digital) values (uid, p_id, left(p_nome, 80), left(p_digital, 64));
  end if;
  select count(*) into total from public.dispositivos where aluno_id = uid;
  return jsonb_build_object('ok', true, 'limite', limite, 'total', total);
end; $$;

create or replace function public.remover_dispositivo(p_id text, p_atual text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); feitas int;
begin
  if uid is null then raise exception 'Faça login para continuar.'; end if;
  if p_id = p_atual then raise exception 'Este é o aparelho que você está usando agora.'; end if;
  select count(*) into feitas from public.dispositivos_remocoes where aluno_id = uid and removido_em > now() - interval '30 days';
  if feitas >= 3 then raise exception 'Você já removeu 3 aparelhos nos últimos 30 dias. Fale com o suporte para liberar.'; end if;
  delete from public.dispositivos where aluno_id = uid and id = p_id;
  if not found then raise exception 'Aparelho não encontrado.'; end if;
  insert into public.dispositivos_remocoes (aluno_id) values (uid);
  return jsonb_build_object('remocoes_restantes', 2 - feitas);
end; $$;

create or replace function public.dispositivo_ok(p_aluno uuid, p_id text)
returns boolean language plpgsql security definer set search_path = '' as $$
begin update public.dispositivos set visto_em = now() where aluno_id = p_aluno and id = p_id; return found; end; $$;

create or replace function public.admin_limpar_dispositivos(p_aluno uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.eh_admin() then raise exception 'Acesso restrito ao administrador.'; end if;
  delete from public.dispositivos where aluno_id = p_aluno;
  delete from public.dispositivos_remocoes where aluno_id = p_aluno;
end; $$;

do $$
declare d text;
begin
  d := pg_get_functiondef('public.registrar_atividade(int,int,int,int)'::regprocedure);
  d := replace(d, 'p_acertos integer, p_total integer)', 'p_acertos integer, p_total integer, p_dispositivo text DEFAULT NULL)');
  d := replace(d, 'if not public.eh_assinante(uid) then raise exception ''Assine o English Smart para acessar as lições.''; end if;',
    'if not public.eh_assinante(uid) then raise exception ''Assine o English Smart para acessar as lições.''; end if;' || chr(10) ||
    '  if not public.dispositivo_ok(uid, p_dispositivo) then raise exception ''Este aparelho não está liberado nesta conta (limite de 4 aparelhos).''; end if;');
  drop function public.registrar_atividade(int,int,int,int);
  execute d;
  d := pg_get_functiondef('public.registrar_revisao(text,jsonb,int,int)'::regprocedure);
  d := replace(d, 'p_acertos integer, p_total integer)', 'p_acertos integer, p_total integer, p_dispositivo text DEFAULT NULL)');
  d := replace(d, 'if not public.eh_assinante(uid) then raise exception ''Assine o English Smart para acessar a revisão.''; end if;',
    'if not public.eh_assinante(uid) then raise exception ''Assine o English Smart para acessar a revisão.''; end if;' || chr(10) ||
    '  if not public.dispositivo_ok(uid, p_dispositivo) then raise exception ''Este aparelho não está liberado nesta conta (limite de 4 aparelhos).''; end if;');
  drop function public.registrar_revisao(text,jsonb,int,int);
  execute d;
end $$;

revoke all on function public.registrar_atividade(int,int,int,int,text) from public, anon;
revoke all on function public.registrar_revisao(text,jsonb,int,int,text) from public, anon;
revoke all on function public.registrar_dispositivo(text,text,text) from public, anon;
revoke all on function public.remover_dispositivo(text,text) from public, anon;
revoke all on function public.admin_limpar_dispositivos(uuid) from public, anon;
revoke all on function public.dispositivo_ok(uuid,text) from public, anon, authenticated;
grant execute on function public.registrar_atividade(int,int,int,int,text) to authenticated;
grant execute on function public.registrar_revisao(text,jsonb,int,int,text) to authenticated;
grant execute on function public.registrar_dispositivo(text,text,text) to authenticated;
grant execute on function public.remover_dispositivo(text,text) to authenticated;
grant execute on function public.admin_limpar_dispositivos(uuid) to authenticated;
-- =====================================================================
-- MELHORIAS: plano anual, cupons, indique um amigo, turmas, ranking,
-- verificação de certificado, trilhas extras, lembretes por e-mail, eventos do Mercado Pago
-- =====================================================================

-- ---------- Plano mensal/anual e cupons ----------
alter table public.assinaturas add column if not exists plano text not null default 'mensal' check (plano in ('mensal', 'anual'));
alter table public.pagamentos  add column if not exists plano text check (plano in ('mensal', 'anual'));
alter table public.pagamentos  add column if not exists cupom text;

create table if not exists public.cupons (
  codigo     text primary key check (codigo ~ '^[A-Z0-9]{3,20}$'),
  desconto   int  not null check (desconto between 1 and 100),   -- % de desconto
  valido_ate timestamptz,
  usos_max   int check (usos_max is null or usos_max > 0),
  usos       int not null default 0,
  ativo      boolean not null default true,
  criado_em  timestamptz not null default now()
);
alter table public.cupons enable row level security;
drop policy if exists "admin vê cupons" on public.cupons;
create policy "admin vê cupons" on public.cupons for select to authenticated using ((select public.eh_admin()));

create or replace function public.admin_salvar_cupom(p_codigo text, p_desconto int, p_valido_ate timestamptz, p_usos_max int, p_ativo boolean)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.eh_admin() then raise exception 'Acesso restrito ao administrador.'; end if;
  insert into public.cupons (codigo, desconto, valido_ate, usos_max, ativo)
  values (upper(trim(p_codigo)), p_desconto, p_valido_ate, p_usos_max, coalesce(p_ativo, true))
  on conflict (codigo) do update set desconto = excluded.desconto, valido_ate = excluded.valido_ate, usos_max = excluded.usos_max, ativo = excluded.ativo;
end; $$;

create or replace function public.admin_excluir_cupom(p_codigo text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.eh_admin() then raise exception 'Acesso restrito ao administrador.'; end if;
  delete from public.cupons where codigo = upper(trim(p_codigo));
end; $$;

-- O aluno confere um cupom antes de pagar (só devolve o desconto)
create or replace function public.validar_cupom(p_codigo text)
returns int language sql stable security definer set search_path = '' as $$
  select desconto from public.cupons
   where codigo = upper(trim(p_codigo)) and ativo
     and (valido_ate is null or valido_ate > now())
     and (usos_max is null or usos < usos_max);
$$;

-- ---------- Indique um amigo ----------
alter table public.alunos add column if not exists codigo_indicacao text unique default upper(substr(md5(gen_random_uuid()::text), 1, 8));
alter table public.alunos add column if not exists indicado_por text;
update public.alunos set codigo_indicacao = upper(substr(md5(gen_random_uuid()::text), 1, 8)) where codigo_indicacao is null;

create table if not exists public.indicacoes_bonus (
  indicado   uuid primary key references public.alunos(id) on delete cascade,
  indicador  uuid not null references public.alunos(id) on delete cascade,
  dias       int not null default 30,
  criado_em  timestamptz not null default now()
);
alter table public.indicacoes_bonus enable row level security;
drop policy if exists "indicador vê os bônus" on public.indicacoes_bonus;
create policy "indicador vê os bônus" on public.indicacoes_bonus for select to authenticated
  using (indicador = (select auth.uid()) or (select public.eh_admin()));

-- O aluno registra quem o indicou (uma vez, nos 7 primeiros dias, sem ser ele mesmo)
create or replace function public.registrar_indicacao(p_codigo text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); a public.alunos;
begin
  select * into a from public.alunos where id = uid;
  if a.id is null or a.indicado_por is not null or a.criado_em < now() - interval '7 days' then return false; end if;
  if upper(trim(p_codigo)) = a.codigo_indicacao then return false; end if;
  if not exists (select 1 from public.alunos where codigo_indicacao = upper(trim(p_codigo))) then return false; end if;
  update public.alunos set indicado_por = upper(trim(p_codigo)) where id = uid;
  return true;
end; $$;

-- ---------- Turmas com código de convite ----------
create table if not exists public.turmas (
  id        uuid primary key default gen_random_uuid(),
  nome      text not null check (char_length(nome) between 2 and 60),
  codigo    text not null unique default upper(substr(md5(gen_random_uuid()::text), 1, 6)),
  criada_em timestamptz not null default now()
);
alter table public.alunos add column if not exists turma_id uuid references public.turmas(id) on delete set null;
alter table public.turmas enable row level security;
drop policy if exists "aluno vê a própria turma" on public.turmas;
create policy "aluno vê a própria turma" on public.turmas for select to authenticated
  using ((select public.eh_admin()) or id = (select turma_id from public.alunos where id = (select auth.uid())));

create or replace function public.admin_salvar_turma(p_nome text)
returns text language plpgsql security definer set search_path = '' as $$
declare c text;
begin
  if not public.eh_admin() then raise exception 'Acesso restrito ao administrador.'; end if;
  insert into public.turmas (nome) values (trim(p_nome)) returning codigo into c;
  return c;
end; $$;

create or replace function public.admin_excluir_turma(p_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.eh_admin() then raise exception 'Acesso restrito ao administrador.'; end if;
  delete from public.turmas where id = p_id;
end; $$;

create or replace function public.entrar_turma(p_codigo text)
returns text language plpgsql security definer set search_path = '' as $$
declare t public.turmas;
begin
  select * into t from public.turmas where codigo = upper(trim(p_codigo));
  if t.id is null then raise exception 'Código de turma não encontrado.'; end if;
  update public.alunos set turma_id = t.id where id = auth.uid();
  if not found then raise exception 'Apenas alunos entram em turmas.'; end if;
  return t.nome;
end; $$;

create or replace function public.sair_turma()
returns void language sql security definer set search_path = '' as $$
  update public.alunos set turma_id = null where id = auth.uid();
$$;

-- ---------- Ranking semanal (opcional para cada aluno) ----------
alter table public.alunos add column if not exists ranking_publico boolean not null default false;

create or replace function public.definir_ranking(p_publico boolean)
returns void language sql security definer set search_path = '' as $$
  update public.alunos set ranking_publico = coalesce(p_publico, false) where id = auth.uid();
$$;

-- Pontos da semana: 10 por acerto nas lições atualizadas nos últimos 7 dias + XP das revisões da semana
create or replace function public.ranking_semanal()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare uid uuid := auth.uid(); resultado jsonb;
begin
  with pontos as (
    select a.id, a.ranking_publico, a.nome,
           coalesce((select sum(p.acertos) * 10 from public.progresso p where p.aluno_id = a.id and p.atualizada_em > now() - interval '7 days'), 0)
         + coalesce((select sum(s.xp) from public.sessoes_revisao s where s.aluno_id = a.id and s.feita_em > now() - interval '7 days'), 0) as total
      from public.alunos a
  ), visiveis as (
    select *, rank() over (order by total desc) as posicao from pontos where (ranking_publico or id = uid) and total > 0
  )
  select jsonb_build_object(
    'top', coalesce((select jsonb_agg(jsonb_build_object(
              'posicao', posicao,
              'nome', split_part(nome, ' ', 1) || coalesce(' ' || left(nullif(split_part(nome, ' ', 2), ''), 1) || '.', ''),
              'pontos', total, 'eu', id = uid) order by posicao)
            from (select * from visiveis order by posicao limit 10) t), '[]'),
    'minha_posicao', (select posicao from visiveis where id = uid),
    'meus_pontos', (select total from pontos where id = uid),
    'participo', (select ranking_publico from public.alunos where id = uid)
  ) into resultado;
  return resultado;
end; $$;

-- ---------- Verificação pública de certificado ----------
create or replace function public.verificar_certificado(p_codigo text)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('nome', a.nome, 'nivel_num', c.nivel_num, 'nivel', public.nivel_cefr(c.nivel_num), 'emitido_em', c.emitido_em, 'codigo', c.codigo)
    from public.certificados c join public.alunos a on a.id = c.aluno_id
   where c.codigo = upper(trim(p_codigo)) and upper(trim(p_codigo)) ~ '^[A-Z0-9]{6,16}$';
$$;

-- ---------- Trilhas extras (viagem 101, entrevista 102, trabalho 103) ----------
alter table public.progresso drop constraint if exists progresso_nivel_num_check;
alter table public.progresso add constraint progresso_nivel_num_check check (nivel_num between 1 and 16 or nivel_num between 101 and 103);

do $$
declare d text;
begin
  d := pg_get_functiondef('public.registrar_atividade(int,int,int,int,text)'::regprocedure);
  d := replace(d, 'if p_nivel is null or p_nivel < 1 or p_nivel > aluno.nivel_num then raise exception ''Este nível ainda está bloqueado.''; end if;',
    'if p_nivel is null or p_nivel < 1 or (p_nivel <= 16 and p_nivel > aluno.nivel_num) or (p_nivel > 16 and p_nivel not between 101 and 103) then raise exception ''Este nível ainda está bloqueado.''; end if;' || chr(10) ||
    '  if p_nivel > 100 and p_licao = 0 then raise exception ''As trilhas extras não têm teste.''; end if;');
  execute d;
end $$;

-- ---------- Eventos do Mercado Pago (para a checagem de configuração) ----------
create table if not exists public.mp_eventos (
  id          bigint generated always as identity primary key,
  tipo        text,
  recebido_em timestamptz not null default now()
);
alter table public.mp_eventos enable row level security;
drop policy if exists "admin vê eventos" on public.mp_eventos;
create policy "admin vê eventos" on public.mp_eventos for select to authenticated using ((select public.eh_admin()));

-- ---------- Lembretes de vencimento por e-mail ----------
create table if not exists public.lembretes_enviados (
  aluno_id  uuid not null references public.alunos(id) on delete cascade,
  tipo      text not null check (tipo in ('3d', '1d', 'venceu')),
  ref       date not null,               -- data de vencimento a que o lembrete se refere
  enviado_em timestamptz not null default now(),
  primary key (aluno_id, tipo, ref)
);
alter table public.lembretes_enviados enable row level security;
drop policy if exists "admin vê lembretes" on public.lembretes_enviados;
create policy "admin vê lembretes" on public.lembretes_enviados for select to authenticated using ((select public.eh_admin()));

-- Configuração privada (só o servidor lê): segredo do agendamento diário
create table if not exists public.config_privada (chave text primary key, valor text not null);
alter table public.config_privada enable row level security;
insert into public.config_privada (chave, valor)
values ('cron_segredo', encode(extensions.gen_random_bytes(24), 'hex'))
on conflict (chave) do nothing;

revoke all on function public.admin_salvar_cupom(text,int,timestamptz,int,boolean) from public, anon;
revoke all on function public.admin_excluir_cupom(text) from public, anon;
revoke all on function public.validar_cupom(text) from public, anon;
revoke all on function public.registrar_indicacao(text) from public, anon;
revoke all on function public.admin_salvar_turma(text) from public, anon;
revoke all on function public.admin_excluir_turma(uuid) from public, anon;
revoke all on function public.entrar_turma(text) from public, anon;
revoke all on function public.sair_turma() from public, anon;
revoke all on function public.definir_ranking(boolean) from public, anon;
revoke all on function public.ranking_semanal() from public, anon;
revoke all on function public.verificar_certificado(text) from public;
grant execute on function public.admin_salvar_cupom(text,int,timestamptz,int,boolean) to authenticated;
grant execute on function public.admin_excluir_cupom(text) to authenticated;
grant execute on function public.validar_cupom(text) to authenticated;
grant execute on function public.registrar_indicacao(text) to authenticated;
grant execute on function public.admin_salvar_turma(text) to authenticated;
grant execute on function public.admin_excluir_turma(uuid) to authenticated;
grant execute on function public.entrar_turma(text) to authenticated;
grant execute on function public.sair_turma() to authenticated;
grant execute on function public.definir_ranking(boolean) to authenticated;
grant execute on function public.ranking_semanal() to authenticated;
grant execute on function public.verificar_certificado(text) to anon, authenticated;


-- =====================================================================
-- LEMBRETES AGENDADOS (pg_cron + pg_net) E LOJA DE MOEDAS
-- =====================================================================
create extension if not exists pg_net;
create extension if not exists pg_cron;
select cron.unschedule('lembretes-diarios') where exists (select 1 from cron.job where jobname = 'lembretes-diarios');
select cron.schedule('lembretes-diarios', '0 12 * * *', $cron$
  select net.http_post(
    url := 'https://wfxqxvlcrqbwvcvqslzi.supabase.co/functions/v1/lembretes',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron', (select valor from public.config_privada where chave = 'cron_segredo')),
    body := '{}'::jsonb
  );
$cron$);

alter table public.alunos add column if not exists moldura text;
create table if not exists public.compras (
  id bigint generated always as identity primary key,
  aluno_id uuid not null references public.alunos(id) on delete cascade,
  item text not null, custo int not null check (custo >= 0), criada_em timestamptz not null default now()
);
create index if not exists compras_aluno on public.compras (aluno_id);
create table if not exists public.dias_protegidos (
  aluno_id uuid not null references public.alunos(id) on delete cascade, dia date not null, primary key (aluno_id, dia)
);
alter table public.compras enable row level security;
alter table public.dias_protegidos enable row level security;
drop policy if exists "aluno vê as próprias compras" on public.compras;
create policy "aluno vê as próprias compras" on public.compras for select to authenticated using (aluno_id = (select auth.uid()) or (select public.eh_admin()));
drop policy if exists "aluno vê os próprios dias protegidos" on public.dias_protegidos;
create policy "aluno vê os próprios dias protegidos" on public.dias_protegidos for select to authenticated using (aluno_id = (select auth.uid()) or (select public.eh_admin()));

create or replace function public.saldo_moedas(p_aluno uuid)
returns int language sql stable security definer set search_path = '' as $$
  select coalesce((select xp / 10 from public.alunos where id = p_aluno), 0)
       - coalesce((select sum(custo) from public.compras where aluno_id = p_aluno), 0)::int;
$$;

create or replace function public.comprar_item(p_item text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); custo int; saldo int; ontem date := (now() at time zone 'America/Sao_Paulo')::date - 1; s public.assinaturas;
begin
  if not exists (select 1 from public.alunos where id = uid) then raise exception 'Apenas alunos usam a loja.'; end if;
  custo := case p_item when 'moldura_ouro' then 300 when 'moldura_neon' then 300 when 'moldura_arco' then 500 when 'moldura_diamante' then 1000
    when 'protetor' then 150 when 'dias7' then 1500 else null end;
  if custo is null then raise exception 'Item não encontrado.'; end if;
  if p_item like 'moldura_%' and exists (select 1 from public.compras where aluno_id = uid and item = p_item) then
    update public.alunos set moldura = p_item where id = uid;
    return jsonb_build_object('ok', true, 'saldo', public.saldo_moedas(uid), 'ja_tinha', true);
  end if;
  perform pg_advisory_xact_lock(hashtext(uid::text));
  saldo := public.saldo_moedas(uid);
  if saldo < custo then raise exception 'Moedas insuficientes: você tem % e o item custa %.', saldo, custo; end if;
  if p_item = 'protetor' then
    if exists (select 1 from public.dias_protegidos where aluno_id = uid and dia = ontem)
       or exists (select 1 from public.progresso where aluno_id = uid and (atualizada_em at time zone 'America/Sao_Paulo')::date = ontem)
       or exists (select 1 from public.sessoes_revisao where aluno_id = uid and (feita_em at time zone 'America/Sao_Paulo')::date = ontem) then
      raise exception 'Você estudou ontem: sua sequência não precisa de proteção.';
    end if;
    insert into public.dias_protegidos (aluno_id, dia) values (uid, ontem);
  elsif p_item = 'dias7' then
    select * into s from public.assinaturas where aluno_id = uid;
    if s.status = 'ativa' then raise exception 'Sua assinatura no cartão renova sozinha; os dias extras são para quem paga com Pix.'; end if;
    insert into public.assinaturas (aluno_id, pago_ate, status)
    values (uid, greatest(now() + interval '3 days', coalesce(s.pago_ate, now())) + interval '7 days', 'pendente')
    on conflict (aluno_id) do update set pago_ate = greatest(now() + interval '3 days', coalesce(public.assinaturas.pago_ate, now())) + interval '7 days', atualizada_em = now();
  else
    update public.alunos set moldura = p_item where id = uid;
  end if;
  insert into public.compras (aluno_id, item, custo) values (uid, p_item, custo);
  return jsonb_build_object('ok', true, 'saldo', public.saldo_moedas(uid));
end; $$;

create or replace function public.usar_moldura(p_item text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_item is null then update public.alunos set moldura = null where id = auth.uid(); return; end if;
  if not exists (select 1 from public.compras where aluno_id = auth.uid() and item = p_item) then raise exception 'Você ainda não tem esta moldura.'; end if;
  update public.alunos set moldura = p_item where id = auth.uid();
end; $$;

revoke all on function public.saldo_moedas(uuid) from public, anon, authenticated;
revoke all on function public.comprar_item(text) from public, anon;
revoke all on function public.usar_moldura(text) from public, anon;
grant execute on function public.comprar_item(text) to authenticated;
grant execute on function public.usar_moldura(text) to authenticated;

-- =====================================================================
-- Login com o Google: nome e foto vêm de full_name/name e avatar_url/picture
-- =====================================================================
create or replace function public.criar_aluno()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_foto text := coalesce(nullif(v_meta ->> 'avatar_url', ''), nullif(v_meta ->> 'picture', ''));
begin
  if not exists (select 1 from public.admins where email = lower(new.email)) then
    insert into public.alunos (id, nome, email, avatar)
    values (new.id,
            left(coalesce(nullif(trim(v_meta ->> 'nome'), ''), nullif(trim(v_meta ->> 'full_name'), ''),
                          nullif(trim(v_meta ->> 'name'), ''), split_part(new.email, '@', 1)), 80),
            lower(new.email),
            case when v_foto ~ '^https://[a-z0-9.-]+\.googleusercontent\.com/' and char_length(v_foto) <= 300 then v_foto end)
    on conflict (id) do nothing;
  end if;
  return new;
end;
$$;
revoke all on function public.criar_aluno() from public, anon, authenticated;
-- atualizar_perfil também aceita manter a foto do Google já gravada:
--   or (av ~ '^https://[a-z0-9.-]+\.googleusercontent\.com/' and char_length(av) <= 300
--       and av = (select a.avatar from public.alunos a where a.id = uid))

-- =====================================================================
-- 8 lições por nível (licao 1–8; 0 = teste) e 8 trilhas extras (101–108)
-- =====================================================================
alter table public.progresso drop constraint if exists progresso_licao_check;
alter table public.progresso add constraint progresso_licao_check check (licao >= 0 and licao <= 20);
alter table public.progresso drop constraint if exists progresso_nivel_num_check;
alter table public.progresso add constraint progresso_nivel_num_check check ((nivel_num between 1 and 16) or (nivel_num between 101 and 120));
alter table public.revisao drop constraint if exists revisao_item_check;
alter table public.revisao add constraint revisao_item_check check (item ~ '^[ved]\|([1-9]|1[0-6])\|[1-8]\|[0-9]{1,2}$');
-- registrar_atividade: extras 101–108; lição até 8 nos níveis e até 20 nas trilhas; teste exige as 8 lições com 60%
-- registrar_revisao: itens aceitam lição 1–8
do $$
declare d text;
begin
  d := pg_get_functiondef('public.registrar_atividade(integer,integer,integer,integer,text)'::regprocedure);
  d := replace(d, 'p_nivel not between 101 and 103', 'p_nivel not between 101 and 108');
  d := replace(d, 'if p_licao is null or p_licao < 0 or p_licao > 4 then', 'if p_licao is null or p_licao < 0 or (p_nivel <= 16 and p_licao > 8) or (p_nivel > 100 and p_licao > 20) then');
  d := replace(d, 'licao between 1 and 4 and acertos >= total * 0.6;', 'licao between 1 and 8 and acertos >= total * 0.6;');
  d := replace(d, 'if licoes_ok < 4 then raise exception ''Conclua as 4 lições do nível antes do teste.''; end if;', 'if licoes_ok < 8 then raise exception ''Conclua as 8 lições do nível antes do teste.''; end if;');
  execute d;
  d := pg_get_functiondef('public.registrar_revisao(text,jsonb,integer,integer,text)'::regprocedure);
  d := replace(d, '[1-4]', '[1-8]');
  execute d;
end $$;

-- =====================================================================
-- Notificações diárias (Web Push) — lembrete às 10h de Brasília
-- As chaves VAPID ficam em config_privada ('vapid_publica', 'vapid_privada'); não vão para o GitHub.
-- =====================================================================
create table if not exists public.push_inscricoes (
  endpoint text primary key check (endpoint ~ '^https://' and length(endpoint) <= 1000),
  aluno_id uuid not null references auth.users(id) on delete cascade,
  p256dh text not null check (length(p256dh) between 20 and 200),
  auth text not null check (length(auth) between 8 and 100),
  aparelho text check (length(aparelho) <= 80),
  criado_em timestamptz not null default now(),
  falhas int not null default 0
);
create index if not exists push_inscricoes_aluno on public.push_inscricoes(aluno_id);
alter table public.push_inscricoes enable row level security;
drop policy if exists "ve as proprias inscricoes" on public.push_inscricoes;
create policy "ve as proprias inscricoes" on public.push_inscricoes for select to authenticated using (aluno_id = (select auth.uid()));

create or replace function public.salvar_inscricao_push(p_endpoint text, p_p256dh text, p_auth text, p_aparelho text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare v uuid := auth.uid();
begin
  if v is null then raise exception 'Entre na sua conta.'; end if;
  if (select count(*) from public.push_inscricoes where aluno_id = v and endpoint <> p_endpoint) >= 8 then
    delete from public.push_inscricoes where endpoint = (select endpoint from public.push_inscricoes where aluno_id = v order by criado_em limit 1);
  end if;
  insert into public.push_inscricoes(endpoint, aluno_id, p256dh, auth, aparelho)
  values (p_endpoint, v, p_p256dh, p_auth, left(p_aparelho, 80))
  on conflict (endpoint) do update set aluno_id = excluded.aluno_id, p256dh = excluded.p256dh, auth = excluded.auth, aparelho = excluded.aparelho, falhas = 0;
end $$;

create or replace function public.remover_inscricao_push(p_endpoint text)
returns void language sql security definer set search_path = '' as $$
  delete from public.push_inscricoes where endpoint = p_endpoint and aluno_id = auth.uid();
$$;
revoke all on function public.salvar_inscricao_push(text,text,text,text) from public, anon;
revoke all on function public.remover_inscricao_push(text) from public, anon;
grant execute on function public.salvar_inscricao_push(text,text,text,text) to authenticated;
grant execute on function public.remover_inscricao_push(text) to authenticated;

select cron.schedule('notificacoes-10h', '0 13 * * *', $c$
  select net.http_post(
    url := 'https://wfxqxvlcrqbwvcvqslzi.supabase.co/functions/v1/notificacoes',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron', (select valor from public.config_privada where chave = 'cron_segredo')),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  );
$c$);
-- =====================================================================
-- ESCOLAS E PROFESSORES — turmas pagas pela instituição
-- escola: paga 10% a menos por aluno · professor independente: 5% a menos
-- professor vinculado: entra com o código da escola e a escola aprova; quem paga é a escola
-- =====================================================================

-- Quem é educador (professor ou responsável por escola)
create table if not exists public.educadores (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text not null check (char_length(nome) between 2 and 80),
  email text not null,
  criado_em timestamptz not null default now()
);

-- Escola ou professor independente (quem paga)
create table if not exists public.instituicoes (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('escola', 'professor')),
  nome text not null check (char_length(nome) between 2 and 100),
  documento text check (documento is null or char_length(documento) <= 20),
  dono uuid not null unique references public.educadores(id) on delete cascade,
  codigo text not null unique default upper(substr(md5(gen_random_uuid()::text), 1, 8)),
  ciclo text not null default 'mensal' check (ciclo in ('mensal', 'anual')),
  pago_ate timestamptz,
  criado_em timestamptz not null default now()
);

-- Professores vinculados a uma escola
create table if not exists public.professores_escola (
  professor_id uuid primary key references public.educadores(id) on delete cascade,
  instituicao_id uuid not null references public.instituicoes(id) on delete cascade,
  status text not null default 'pendente' check (status in ('pendente', 'aprovado')),
  criado_em timestamptz not null default now()
);
create index if not exists professores_escola_inst on public.professores_escola(instituicao_id);

-- Turmas: as antigas (do admin) ficam com instituicao_id nulo
alter table public.turmas add column if not exists instituicao_id uuid references public.instituicoes(id) on delete cascade;
alter table public.turmas add column if not exists professor_id uuid references public.educadores(id) on delete set null;
alter table public.turmas add column if not exists descricao text check (descricao is null or char_length(descricao) <= 300);
alter table public.turmas add column if not exists sala text default ('EnglishSmart-' || substr(md5(gen_random_uuid()::text), 1, 12));
create index if not exists turmas_inst on public.turmas(instituicao_id);

-- Alunos das turmas (pedido de entrada → aprovação)
create table if not exists public.turma_alunos (
  turma_id uuid not null references public.turmas(id) on delete cascade,
  aluno_id uuid not null references public.alunos(id) on delete cascade,
  status text not null default 'pendente' check (status in ('pendente', 'aprovado')),
  solicitado_em timestamptz not null default now(),
  aprovado_em timestamptz,
  primary key (turma_id, aluno_id)
);
create index if not exists turma_alunos_aluno on public.turma_alunos(aluno_id);

-- Faturas da instituição e cobranças proporcionais de quem entrou no meio do ciclo
create table if not exists public.faturas (
  id uuid primary key default gen_random_uuid(),
  instituicao_id uuid not null references public.instituicoes(id) on delete cascade,
  tipo text not null check (tipo in ('ciclo', 'proporcional')),
  ciclo text not null check (ciclo in ('mensal', 'anual')),
  periodo_inicio timestamptz,
  periodo_fim timestamptz,
  qtd_alunos int not null default 0,
  valor_unit numeric(10,2) not null default 0,
  desconto_pct int not null default 0,
  ajustes numeric(10,2) not null default 0,
  total numeric(10,2) not null check (total >= 0),
  status text not null default 'aberta' check (status in ('aberta', 'paga', 'cancelada')),
  vence_em timestamptz not null,
  paga_em timestamptz,
  mp_id text, qr_code text, qr_base64 text, link text, expira_em timestamptz,
  criada_em timestamptz not null default now()
);
create index if not exists faturas_inst on public.faturas(instituicao_id, criada_em desc);
create table if not exists public.cobrancas_proporcionais (
  id bigint generated always as identity primary key,
  instituicao_id uuid not null references public.instituicoes(id) on delete cascade,
  aluno_id uuid references public.alunos(id) on delete set null,
  dias int not null,
  valor numeric(10,2) not null,
  fatura_id uuid references public.faturas(id) on delete set null,
  criada_em timestamptz not null default now()
);

-- Aulas ao vivo e vídeos das turmas
create table if not exists public.aulas (
  id uuid primary key default gen_random_uuid(),
  turma_id uuid not null references public.turmas(id) on delete cascade,
  titulo text not null check (char_length(titulo) between 2 and 100),
  inicio timestamptz not null,
  duracao_min int not null default 60 check (duracao_min between 10 and 300),
  link text check (link is null or (link ~ '^https://' and char_length(link) <= 300)),
  criado_por uuid references public.educadores(id) on delete set null,
  criado_em timestamptz not null default now()
);
create table if not exists public.videos (
  id uuid primary key default gen_random_uuid(),
  turma_id uuid not null references public.turmas(id) on delete cascade,
  titulo text not null check (char_length(titulo) between 2 and 120),
  url text not null check (url ~ '^https://' and char_length(url) <= 300),
  descricao text check (descricao is null or char_length(descricao) <= 500),
  criado_por uuid references public.educadores(id) on delete set null,
  criado_em timestamptz not null default now()
);

-- Comunidade: pública, da escola ou da turma
create table if not exists public.posts (
  id bigint generated always as identity primary key,
  escopo text not null check (escopo in ('publica', 'escola', 'turma')),
  ref uuid,
  autor uuid not null references auth.users(id) on delete cascade,
  texto text not null check (char_length(texto) between 1 and 2000),
  fixado boolean not null default false,
  criado_em timestamptz not null default now(),
  check ((escopo = 'publica') = (ref is null))
);
create index if not exists posts_escopo on public.posts(escopo, ref, id desc);
create table if not exists public.comentarios (
  id bigint generated always as identity primary key,
  post_id bigint not null references public.posts(id) on delete cascade,
  autor uuid not null references auth.users(id) on delete cascade,
  texto text not null check (char_length(texto) between 1 and 1000),
  criado_em timestamptz not null default now()
);
create index if not exists comentarios_post on public.comentarios(post_id, id);
create table if not exists public.curtidas (
  post_id bigint not null references public.posts(id) on delete cascade,
  usuario_id uuid not null references auth.users(id) on delete cascade,
  primary key (post_id, usuario_id)
);
create table if not exists public.denuncias (
  id bigint generated always as identity primary key,
  post_id bigint references public.posts(id) on delete cascade,
  comentario_id bigint references public.comentarios(id) on delete cascade,
  autor uuid references auth.users(id) on delete set null,
  motivo text check (motivo is null or char_length(motivo) <= 300),
  criada_em timestamptz not null default now()
);

-- RLS ligado em tudo; o acesso é feito pelas funções abaixo (security definer)
alter table public.educadores enable row level security;
alter table public.instituicoes enable row level security;
alter table public.professores_escola enable row level security;
alter table public.turma_alunos enable row level security;
alter table public.faturas enable row level security;
alter table public.cobrancas_proporcionais enable row level security;
alter table public.aulas enable row level security;
alter table public.videos enable row level security;
alter table public.posts enable row level security;
alter table public.comentarios enable row level security;
alter table public.curtidas enable row level security;
alter table public.denuncias enable row level security;

-- ---------------------------------------------------------------------
-- Funções de apoio
-- ---------------------------------------------------------------------
create or replace function public.desconto_inst(p_tipo text) returns int
language sql immutable set search_path = '' as $$ select case when p_tipo = 'escola' then 10 else 5 end $$;

create or replace function public.preco_aluno(p_ciclo text) returns numeric
language sql immutable set search_path = '' as $$ select case when p_ciclo = 'anual' then 299.90 else 29.99 end::numeric $$;

-- Instituição "em dia": pago_ate no futuro e nenhuma fatura vencida há mais de 7 dias
create or replace function public.inst_ativa(p_inst uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.instituicoes i where i.id = p_inst and i.pago_ate > now())
     and not exists (select 1 from public.faturas f where f.instituicao_id = p_inst and f.status = 'aberta' and f.vence_em < now() - interval '7 days');
$$;

-- Instituição que o educador administra (dono) ou a que está vinculado (aprovado)
create or replace function public.minha_inst() returns uuid
language sql stable security definer set search_path = '' as $$
  select coalesce(
    (select id from public.instituicoes where dono = auth.uid()),
    (select instituicao_id from public.professores_escola where professor_id = auth.uid() and status = 'aprovado'));
$$;
create or replace function public.sou_dono_inst(p_inst uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.instituicoes where id = p_inst and dono = auth.uid());
$$;
-- Pode gerenciar a turma: dono da instituição ou o professor da turma (vinculado aprovado)
create or replace function public.gerencia_turma(p_turma uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.turmas t
     where t.id = p_turma and t.instituicao_id is not null
       and (public.sou_dono_inst(t.instituicao_id)
            or (t.professor_id = auth.uid() and t.instituicao_id = public.minha_inst())));
$$;
-- Participa da turma (gerencia ou é aluno aprovado)
create or replace function public.participa_turma(p_turma uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.eh_admin() or public.gerencia_turma(p_turma)
      or exists (select 1 from public.turma_alunos where turma_id = p_turma and aluno_id = auth.uid() and status = 'aprovado');
$$;
-- Participa da escola (dono, professor vinculado ou aluno aprovado em alguma turma dela)
create or replace function public.participa_inst(p_inst uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.eh_admin() or public.minha_inst() = p_inst
      or exists (select 1 from public.turma_alunos ta join public.turmas t on t.id = ta.turma_id
                  where t.instituicao_id = p_inst and ta.aluno_id = auth.uid() and ta.status = 'aprovado');
$$;

-- Acesso às lições: assinatura própria OU aluno aprovado numa turma de instituição em dia
create or replace function public.eh_assinante(p_aluno uuid default null)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.eh_admin() and p_aluno is null
      or exists (select 1 from public.assinaturas
                  where aluno_id = coalesce(p_aluno, auth.uid()) and (pago_ate > now() or cortesia_ate > now()))
      or exists (select 1 from public.turma_alunos ta join public.turmas t on t.id = ta.turma_id
                  where ta.aluno_id = coalesce(p_aluno, auth.uid()) and ta.status = 'aprovado'
                    and t.instituicao_id is not null and public.inst_ativa(t.instituicao_id));
$$;

-- ---------------------------------------------------------------------
-- Cadastro de educador
-- ---------------------------------------------------------------------
-- tipo: 'escola' | 'professor' (independente) | 'vinculado' (com código da escola)
create or replace function public.tornar_educador(p_tipo text, p_nome text, p_instituicao text default null, p_documento text default null, p_codigo_escola text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); v_email text; v_inst public.instituicoes; v_escola public.instituicoes;
begin
  if uid is null then raise exception 'Faça login para continuar.'; end if;
  if public.eh_admin() then raise exception 'O administrador não pode virar professor.'; end if;
  if p_tipo not in ('escola', 'professor', 'vinculado') then raise exception 'Tipo de conta inválido.'; end if;
  if exists (select 1 from public.educadores where id = uid) then raise exception 'Sua conta já é de professor ou escola.'; end if;
  -- só converte conta de aluno sem histórico (prova, lições ou assinatura)
  if exists (select 1 from public.alunos where id = uid and prova_feita_em is not null)
     or exists (select 1 from public.progresso where aluno_id = uid)
     or exists (select 1 from public.assinaturas where aluno_id = uid and (pago_ate > now() or status = 'ativa')) then
    raise exception 'Esta conta já tem estudos registrados como aluno. Use outro e-mail para a conta de professor ou escola.';
  end if;
  select email into v_email from auth.users where id = uid;
  if p_tipo = 'vinculado' then
    select * into v_escola from public.instituicoes where codigo = upper(trim(coalesce(p_codigo_escola, ''))) and tipo = 'escola';
    if v_escola.id is null then raise exception 'Código da escola não encontrado.'; end if;
  end if;
  delete from public.turma_alunos where aluno_id = uid;
  delete from public.alunos where id = uid;
  insert into public.educadores (id, nome, email) values (uid, left(trim(p_nome), 80), lower(v_email));
  if p_tipo = 'vinculado' then
    insert into public.professores_escola (professor_id, instituicao_id) values (uid, v_escola.id);
    return jsonb_build_object('tipo', 'vinculado', 'escola', v_escola.nome);
  end if;
  insert into public.instituicoes (tipo, nome, documento, dono)
  values (p_tipo, left(trim(coalesce(nullif(p_instituicao, ''), p_nome)), 100), nullif(left(trim(coalesce(p_documento, '')), 20), ''), uid)
  returning * into v_inst;
  return jsonb_build_object('tipo', p_tipo, 'codigo', v_inst.codigo);
end $$;

-- Cadastro por e-mail: os dados de educador vêm nos metadados do usuário
create or replace function public.criar_aluno()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_foto text := coalesce(nullif(v_meta ->> 'avatar_url', ''), nullif(v_meta ->> 'picture', ''));
  v_nome text := left(coalesce(nullif(trim(v_meta ->> 'nome'), ''), nullif(trim(v_meta ->> 'full_name'), ''), nullif(trim(v_meta ->> 'name'), ''), split_part(new.email, '@', 1)), 80);
  v_tipo text := v_meta ->> 'tipo_conta';
  v_escola uuid; v_status text;
begin
  if exists (select 1 from public.admins where email = lower(new.email)) then return new; end if;
  if v_tipo in ('escola', 'professor', 'vinculado') then
    if v_tipo = 'vinculado' then
      select id into v_escola from public.instituicoes where codigo = upper(trim(coalesce(v_meta ->> 'codigo_escola', ''))) and tipo = 'escola';
      if v_escola is null then v_tipo := 'professor'; end if; -- código inválido: vira independente (pode corrigir depois)
    end if;
    insert into public.educadores (id, nome, email) values (new.id, v_nome, lower(new.email)) on conflict (id) do nothing;
    if v_tipo = 'vinculado' then
      insert into public.professores_escola (professor_id, instituicao_id) values (new.id, v_escola) on conflict do nothing;
    else
      insert into public.instituicoes (tipo, nome, documento, dono)
      values (v_tipo, left(coalesce(nullif(trim(v_meta ->> 'instituicao'), ''), v_nome), 100), nullif(left(trim(coalesce(v_meta ->> 'documento', '')), 20), ''), new.id)
      on conflict (dono) do nothing;
    end if;
    return new;
  end if;
  insert into public.alunos (id, nome, email, avatar)
  values (new.id, v_nome, lower(new.email),
          case when v_foto ~ '^https://[a-z0-9.-]+\.googleusercontent\.com/' and char_length(v_foto) <= 300 then v_foto end)
  on conflict (id) do nothing;
  return new;
end $$;

-- Contexto do usuário logado (papel, instituição, vínculo, turmas)
create or replace function public.meu_contexto()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare uid uuid := auth.uid(); e public.educadores; i public.instituicoes; v record;
begin
  if uid is null then return null; end if;
  select * into e from public.educadores where id = uid;
  if e.id is not null then
    select * into i from public.instituicoes where dono = uid;
    if i.id is not null then
      return jsonb_build_object('papel', 'educador', 'subtipo', i.tipo, 'nome', e.nome, 'email', e.email,
        'instituicao', jsonb_build_object('id', i.id, 'tipo', i.tipo, 'nome', i.nome, 'codigo', i.codigo, 'ciclo', i.ciclo, 'pago_ate', i.pago_ate,
          'ativa', public.inst_ativa(i.id), 'desconto', public.desconto_inst(i.tipo), 'documento', i.documento));
    end if;
    select pe.status, ins.id, ins.nome, ins.codigo into v from public.professores_escola pe join public.instituicoes ins on ins.id = pe.instituicao_id where pe.professor_id = uid;
    return jsonb_build_object('papel', 'educador', 'subtipo', 'vinculado', 'nome', e.nome, 'email', e.email,
      'vinculo', case when v.id is null then null else jsonb_build_object('status', v.status, 'id', v.id, 'nome', v.nome, 'ativa', public.inst_ativa(v.id)) end);
  end if;
  return jsonb_build_object('papel', 'aluno', 'premium', public.eh_assinante(),
    'turmas', coalesce((select jsonb_agg(jsonb_build_object('id', t.id, 'nome', t.nome, 'status', ta.status, 'instituicao', ins.nome, 'tipo', ins.tipo,
                  'ativa', public.inst_ativa(ins.id)) order by ta.solicitado_em)
                  from public.turma_alunos ta join public.turmas t on t.id = ta.turma_id join public.instituicoes ins on ins.id = t.instituicao_id
                 where ta.aluno_id = uid), '[]'::jsonb));
end $$;

-- ---------------------------------------------------------------------
-- Turmas
-- ---------------------------------------------------------------------
create or replace function public.salvar_turma_edu(p_id uuid, p_nome text, p_descricao text default null, p_professor uuid default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_inst uuid := public.minha_inst(); v_dono boolean; t public.turmas; v_prof uuid;
begin
  if v_inst is null then raise exception 'Acesso restrito a professores e escolas.'; end if;
  v_dono := public.sou_dono_inst(v_inst);
  if char_length(trim(coalesce(p_nome, ''))) < 2 then raise exception 'Dê um nome à turma.'; end if;
  -- professor da turma: a escola escolhe entre os vinculados; o professor é sempre ele mesmo
  if v_dono then
    v_prof := coalesce(p_professor, auth.uid());
    if v_prof <> auth.uid() and not exists (select 1 from public.professores_escola where professor_id = v_prof and instituicao_id = v_inst and status = 'aprovado') then
      raise exception 'Professor não pertence a esta escola.';
    end if;
  else
    v_prof := auth.uid();
  end if;
  if p_id is null then
    insert into public.turmas (nome, descricao, instituicao_id, professor_id)
    values (left(trim(p_nome), 60), nullif(left(trim(coalesce(p_descricao, '')), 300), ''), v_inst, v_prof) returning * into t;
  else
    if not public.gerencia_turma(p_id) then raise exception 'Você não pode editar esta turma.'; end if;
    update public.turmas set nome = left(trim(p_nome), 60), descricao = nullif(left(trim(coalesce(p_descricao, '')), 300), ''),
           professor_id = case when v_dono then v_prof else professor_id end
     where id = p_id returning * into t;
  end if;
  return jsonb_build_object('id', t.id, 'codigo', t.codigo);
end $$;

create or replace function public.excluir_turma_edu(p_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.gerencia_turma(p_id) then raise exception 'Você não pode excluir esta turma.'; end if;
  delete from public.turmas where id = p_id;
end $$;

-- Lista das turmas que o educador gerencia, com contagens
create or replace function public.minhas_turmas_edu()
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', t.id, 'nome', t.nome, 'descricao', t.descricao, 'codigo', t.codigo, 'sala', t.sala, 'criada_em', t.criada_em,
    'professor_id', t.professor_id, 'professor', (select nome from public.educadores where id = t.professor_id),
    'aprovados', (select count(*) from public.turma_alunos where turma_id = t.id and status = 'aprovado'),
    'pendentes', (select count(*) from public.turma_alunos where turma_id = t.id and status = 'pendente')) order by t.criada_em), '[]'::jsonb)
  from public.turmas t where public.gerencia_turma(t.id);
$$;

-- Alunos de uma turma (pendentes e aprovados)
create or replace function public.alunos_turma_edu(p_turma uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.gerencia_turma(p_turma) then raise exception 'Acesso negado.'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('id', a.id, 'nome', a.nome, 'email', a.email, 'avatar', a.avatar, 'nivel_num', a.nivel_num,
                     'status', ta.status, 'solicitado_em', ta.solicitado_em, 'aprovado_em', ta.aprovado_em) order by ta.status desc, a.nome)
                   from public.turma_alunos ta join public.alunos a on a.id = ta.aluno_id where ta.turma_id = p_turma), '[]'::jsonb);
end $$;

-- Aprovar / recusar / remover aluno
create or replace function public.decidir_aluno_turma(p_turma uuid, p_aluno uuid, p_acao text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_inst uuid; v_ins public.instituicoes; v_ja boolean; v_dias int; v_total int; v_valor numeric;
begin
  if not public.gerencia_turma(p_turma) then raise exception 'Acesso negado.'; end if;
  select instituicao_id into v_inst from public.turmas where id = p_turma;
  if p_acao = 'aprovar' then
    -- já conta (aprovado em outra turma da mesma instituição)? então não cobra de novo
    select exists (select 1 from public.turma_alunos ta join public.turmas t on t.id = ta.turma_id
                    where t.instituicao_id = v_inst and ta.aluno_id = p_aluno and ta.status = 'aprovado') into v_ja;
    update public.turma_alunos set status = 'aprovado', aprovado_em = now() where turma_id = p_turma and aluno_id = p_aluno and status = 'pendente';
    if not found then raise exception 'Pedido não encontrado.'; end if;
    -- entrou no meio de um ciclo já pago: cobrança proporcional entra na próxima fatura
    select * into v_ins from public.instituicoes where id = v_inst;
    if not v_ja and v_ins.pago_ate > now() then
      v_total := case when v_ins.ciclo = 'anual' then 365 else 30 end;
      v_dias := least(v_total, greatest(1, ceil(extract(epoch from (v_ins.pago_ate - interval '3 days' - now())) / 86400)::int));
      v_valor := round(public.preco_aluno(v_ins.ciclo) * (100 - public.desconto_inst(v_ins.tipo)) / 100 * v_dias / v_total, 2);
      if v_valor > 0 then
        insert into public.cobrancas_proporcionais (instituicao_id, aluno_id, dias, valor) values (v_inst, p_aluno, v_dias, v_valor);
      end if;
    end if;
  elsif p_acao in ('recusar', 'remover') then
    delete from public.turma_alunos where turma_id = p_turma and aluno_id = p_aluno;
  else
    raise exception 'Ação inválida.';
  end if;
end $$;

-- Aluno pede para entrar na turma pelo código (turma de instituição → pendente; turma antiga do admin → direto)
create or replace function public.entrar_turma(p_codigo text)
returns text language plpgsql security definer set search_path = '' as $$
declare t public.turmas;
begin
  select * into t from public.turmas where codigo = upper(trim(p_codigo));
  if t.id is null then raise exception 'Código de turma não encontrado.'; end if;
  if not exists (select 1 from public.alunos where id = auth.uid()) then raise exception 'Apenas alunos entram em turmas.'; end if;
  if t.instituicao_id is null then
    update public.alunos set turma_id = t.id where id = auth.uid();
    return t.nome;
  end if;
  if (select count(*) from public.turma_alunos where aluno_id = auth.uid()) >= 10 then raise exception 'Limite de turmas atingido.'; end if;
  insert into public.turma_alunos (turma_id, aluno_id) values (t.id, auth.uid()) on conflict do nothing;
  return t.nome || ' (aguardando aprovação)';
end $$;

create or replace function public.sair_turma_edu(p_turma uuid)
returns void language sql security definer set search_path = '' as $$
  delete from public.turma_alunos where turma_id = p_turma and aluno_id = auth.uid();
$$;

-- Escola: professores vinculados
create or replace function public.professores_da_escola()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_inst uuid := (select id from public.instituicoes where dono = auth.uid() and tipo = 'escola');
begin
  if v_inst is null then raise exception 'Acesso restrito à escola.'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('id', e.id, 'nome', e.nome, 'email', e.email, 'status', pe.status, 'criado_em', pe.criado_em,
                     'turmas', (select count(*) from public.turmas where professor_id = e.id and instituicao_id = v_inst),
                     'alunos', (select count(distinct ta.aluno_id) from public.turma_alunos ta join public.turmas t on t.id = ta.turma_id
                                 where t.professor_id = e.id and t.instituicao_id = v_inst and ta.status = 'aprovado')) order by pe.status desc, e.nome)
                   from public.professores_escola pe join public.educadores e on e.id = pe.professor_id where pe.instituicao_id = v_inst), '[]'::jsonb);
end $$;

create or replace function public.decidir_professor(p_professor uuid, p_acao text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_inst uuid := (select id from public.instituicoes where dono = auth.uid() and tipo = 'escola');
begin
  if v_inst is null then raise exception 'Acesso restrito à escola.'; end if;
  if p_acao = 'aprovar' then
    update public.professores_escola set status = 'aprovado' where professor_id = p_professor and instituicao_id = v_inst;
  elsif p_acao in ('recusar', 'remover') then
    -- as turmas do professor ficam com a escola
    update public.turmas set professor_id = auth.uid() where professor_id = p_professor and instituicao_id = v_inst;
    delete from public.professores_escola where professor_id = p_professor and instituicao_id = v_inst;
  else raise exception 'Ação inválida.'; end if;
end $$;

-- Professor sem escola: pedir vínculo com um código (ou trocar de escola)
create or replace function public.vincular_escola(p_codigo text)
returns text language plpgsql security definer set search_path = '' as $$
declare v public.instituicoes;
begin
  if not exists (select 1 from public.educadores where id = auth.uid()) or exists (select 1 from public.instituicoes where dono = auth.uid()) then
    raise exception 'Apenas professores sem instituição própria podem se vincular.';
  end if;
  select * into v from public.instituicoes where codigo = upper(trim(p_codigo)) and tipo = 'escola';
  if v.id is null then raise exception 'Código da escola não encontrado.'; end if;
  insert into public.professores_escola (professor_id, instituicao_id) values (auth.uid(), v.id)
  on conflict (professor_id) do update set instituicao_id = excluded.instituicao_id, status = 'pendente', criado_em = now();
  return v.nome;
end $$;

-- Ciclo de cobrança (mensal/anual) e dados da instituição
create or replace function public.atualizar_instituicao(p_nome text, p_documento text, p_ciclo text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_ciclo not in ('mensal', 'anual') then raise exception 'Ciclo inválido.'; end if;
  update public.instituicoes set nome = left(trim(p_nome), 100), documento = nullif(left(trim(coalesce(p_documento, '')), 20), ''), ciclo = p_ciclo
   where dono = auth.uid();
  if not found then raise exception 'Acesso restrito ao responsável.'; end if;
end $$;
-- ---------------------------------------------------------------------
-- Faturas (escola −10%, professor −5%)
-- ---------------------------------------------------------------------
create or replace function public.qtd_alunos_inst(p_inst uuid) returns int
language sql stable security definer set search_path = '' as $$
  select count(distinct ta.aluno_id)::int from public.turma_alunos ta join public.turmas t on t.id = ta.turma_id
   where t.instituicao_id = p_inst and ta.status = 'aprovado';
$$;

create or replace function public.previsao_fatura()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare i public.instituicoes; q int; u numeric; d int; aj numeric;
begin
  select * into i from public.instituicoes where dono = auth.uid();
  if i.id is null then raise exception 'Acesso restrito ao responsável.'; end if;
  q := public.qtd_alunos_inst(i.id); u := public.preco_aluno(i.ciclo); d := public.desconto_inst(i.tipo);
  select coalesce(sum(valor), 0) into aj from public.cobrancas_proporcionais where instituicao_id = i.id and fatura_id is null;
  return jsonb_build_object('qtd', q, 'valor_unit', u, 'desconto', d, 'subtotal', round(q * u, 2),
    'total_ciclo', round(q * u * (100 - d) / 100, 2), 'ajustes', aj, 'ciclo', i.ciclo, 'pago_ate', i.pago_ate, 'ativa', public.inst_ativa(i.id));
end $$;

-- Cria a fatura (uso interno e pelo responsável). Reaproveita a fatura aberta do mesmo tipo.
create or replace function public.criar_fatura_inst(p_inst uuid, p_tipo text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare i public.instituicoes; q int; u numeric; d int; aj numeric; ini timestamptz; fim timestamptz; f uuid; tot numeric;
begin
  select * into i from public.instituicoes where id = p_inst;
  select id into f from public.faturas where instituicao_id = p_inst and status = 'aberta' and tipo = p_tipo limit 1;
  if f is not null then return f; end if;
  select coalesce(sum(valor), 0) into aj from public.cobrancas_proporcionais where instituicao_id = p_inst and fatura_id is null;
  if p_tipo = 'proporcional' then
    if aj <= 0 then return null; end if;
    insert into public.faturas (instituicao_id, tipo, ciclo, ajustes, total, vence_em)
    values (p_inst, 'proporcional', i.ciclo, aj, aj, now() + interval '5 days') returning id into f;
  else
    q := public.qtd_alunos_inst(p_inst); u := public.preco_aluno(i.ciclo); d := public.desconto_inst(i.tipo);
    if q = 0 and aj = 0 then raise exception 'Aprove pelo menos um aluno nas suas turmas antes de gerar a fatura.'; end if;
    ini := case when i.pago_ate > now() then i.pago_ate - interval '3 days' else now() end;
    fim := ini + case when i.ciclo = 'anual' then interval '1 year' else interval '1 month' end;
    tot := round(q * u * (100 - d) / 100, 2) + aj;
    insert into public.faturas (instituicao_id, tipo, ciclo, periodo_inicio, periodo_fim, qtd_alunos, valor_unit, desconto_pct, ajustes, total, vence_em)
    values (p_inst, 'ciclo', i.ciclo, ini, fim, q, u, d, aj, tot, greatest(now() + interval '3 days', ini)) returning id into f;
  end if;
  update public.cobrancas_proporcionais set fatura_id = f where instituicao_id = p_inst and fatura_id is null;
  return f;
end $$;

create or replace function public.gerar_fatura()
returns uuid language plpgsql security definer set search_path = '' as $$
declare v uuid := (select id from public.instituicoes where dono = auth.uid());
begin
  if v is null then raise exception 'Acesso restrito ao responsável.'; end if;
  return public.criar_fatura_inst(v, 'ciclo');
end $$;

create or replace function public.minhas_faturas()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v uuid := (select id from public.instituicoes where dono = auth.uid());
begin
  if v is null then raise exception 'Acesso restrito ao responsável.'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('id', id, 'tipo', tipo, 'ciclo', ciclo, 'periodo_inicio', periodo_inicio, 'periodo_fim', periodo_fim,
            'qtd_alunos', qtd_alunos, 'valor_unit', valor_unit, 'desconto_pct', desconto_pct, 'ajustes', ajustes, 'total', total, 'status', status,
            'vence_em', vence_em, 'paga_em', paga_em, 'criada_em', criada_em) order by criada_em desc)
          from public.faturas where instituicao_id = v), '[]'::jsonb);
end $$;

-- Renovação automática: fatura do próximo ciclo 7 dias antes de vencer; anual: proporcionais todo mês
create or replace function public.gerar_faturas_automaticas()
returns int language plpgsql security definer set search_path = '' as $$
declare r record; n int := 0;
begin
  for r in select i.* from public.instituicoes i
            where i.pago_ate between now() and now() + interval '10 days'
              and not exists (select 1 from public.faturas f where f.instituicao_id = i.id and f.tipo = 'ciclo' and f.status in ('aberta')
                              or f.instituicao_id = i.id and f.tipo = 'ciclo' and f.status = 'paga' and f.periodo_inicio >= i.pago_ate - interval '3 days')
              and public.qtd_alunos_inst(i.id) > 0 loop
    perform public.criar_fatura_inst(r.id, 'ciclo'); n := n + 1;
  end loop;
  for r in select distinct c.instituicao_id from public.cobrancas_proporcionais c join public.instituicoes i on i.id = c.instituicao_id
            where c.fatura_id is null and i.ciclo = 'anual' and c.criada_em < now() - interval '25 days' loop
    perform public.criar_fatura_inst(r.instituicao_id, 'proporcional'); n := n + 1;
  end loop;
  return n;
end $$;

-- ---------------------------------------------------------------------
-- Painel (estilo Power BI) — escola vê tudo, professor vê as turmas dele
-- ---------------------------------------------------------------------
create or replace function public.painel_edu(p_turma uuid default null, p_dias int default 30)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare dias int := least(greatest(coalesce(p_dias, 30), 7), 365); desde timestamptz := now() - make_interval(days => least(greatest(coalesce(p_dias, 30), 7), 365));
        res jsonb;
begin
  if public.minha_inst() is null then raise exception 'Acesso restrito a professores e escolas.'; end if;
  if p_turma is not null and not public.gerencia_turma(p_turma) then raise exception 'Acesso negado.'; end if;
  with t as (select id, nome, professor_id from public.turmas tt where public.gerencia_turma(tt.id) and (p_turma is null or tt.id = p_turma)),
  ta as (select x.turma_id, x.aluno_id from public.turma_alunos x join t on t.id = x.turma_id where x.status = 'aprovado'),
  al as (select distinct a.* from public.alunos a join ta on ta.aluno_id = a.id),
  pr as (select p.* from public.progresso p join al on al.id = p.aluno_id),
  sr as (select s.* from public.sessoes_revisao s join al on al.id = s.aluno_id),
  atv as (select aluno_id, atualizada_em as em from pr union all select aluno_id, feita_em from sr),
  ult as (select aluno_id, max(em) as em from atv group by aluno_id)
  select jsonb_build_object(
    'periodo', dias,
    'kpis', jsonb_build_object(
      'alunos', (select count(*) from al),
      'pendentes', (select count(*) from public.turma_alunos x join t on t.id = x.turma_id where x.status = 'pendente'),
      'ativos7', (select count(*) from ult where em > now() - interval '7 days'),
      'licoes', (select count(*) from pr where licao > 0 and total > 0 and acertos >= total * 0.6 and coalesce(concluida_em, atualizada_em) >= desde),
      'media', (select round(avg(acertos::numeric / nullif(total, 0)) * 100) from pr where atualizada_em >= desde and total > 0),
      'revisoes', (select count(*) from sr where feita_em >= desde),
      'certificados', (select count(*) from public.certificados c join al on al.id = c.aluno_id where c.emitido_em >= desde),
      'xp', (select coalesce(sum(xp), 0) from al),
      'turmas', (select count(*) from t)),
    'serie', (select coalesce(jsonb_agg(jsonb_build_object('dia', d::date, 'atividades', (select count(*) from atv where em::date = d::date),
                 'alunos', (select count(distinct aluno_id) from atv where em::date = d::date)) order by d), '[]'::jsonb)
              from generate_series((now() - make_interval(days => dias - 1))::date, now()::date, interval '1 day') d),
    'niveis', (select coalesce(jsonb_agg(jsonb_build_object('nivel', n, 'qtd', (select count(*) from al where nivel_num = n)) order by n), '[]'::jsonb)
               from generate_series(1, 16) n),
    'turmas', (select coalesce(jsonb_agg(jsonb_build_object('id', t.id, 'nome', t.nome, 'professor', (select nome from public.educadores where id = t.professor_id),
                 'alunos', (select count(*) from ta where ta.turma_id = t.id),
                 'ativos7', (select count(*) from ta join ult on ult.aluno_id = ta.aluno_id where ta.turma_id = t.id and ult.em > now() - interval '7 days'),
                 'media', (select round(avg(p.acertos::numeric / nullif(p.total, 0)) * 100) from pr p join ta on ta.aluno_id = p.aluno_id where ta.turma_id = t.id and p.total > 0),
                 'licoes', (select count(*) from pr p join ta on ta.aluno_id = p.aluno_id where ta.turma_id = t.id and p.licao > 0 and p.total > 0 and p.acertos >= p.total * 0.6)) order by t.nome), '[]'::jsonb) from t),
    'alunos', (select coalesce(jsonb_agg(jsonb_build_object('id', al.id, 'nome', al.nome, 'email', al.email, 'nivel_num', al.nivel_num, 'xp', al.xp,
                 'turmas', (select string_agg(t.nome, ', ') from ta join t on t.id = ta.turma_id where ta.aluno_id = al.id),
                 'licoes', (select count(*) from pr where pr.aluno_id = al.id and licao > 0 and total > 0 and acertos >= total * 0.6),
                 'media', (select round(avg(acertos::numeric / nullif(total, 0)) * 100) from pr where pr.aluno_id = al.id and total > 0),
                 'certificados', (select count(*) from public.certificados c where c.aluno_id = al.id),
                 'ultimo', (select em from ult where ult.aluno_id = al.id)) order by al.nome), '[]'::jsonb) from al)
  ) into res;
  return res;
end $$;

-- ---------------------------------------------------------------------
-- Turma por dentro: informações, aulas ao vivo e vídeos
-- ---------------------------------------------------------------------
create or replace function public.turma_info(p_turma uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare r record;
begin
  if not public.participa_turma(p_turma) then raise exception 'Você não participa desta turma.'; end if;
  select t.id, t.nome, t.descricao, t.codigo, t.sala, t.instituicao_id, i.nome as inst, i.tipo, e.nome as professor
    into r from public.turmas t join public.instituicoes i on i.id = t.instituicao_id left join public.educadores e on e.id = t.professor_id where t.id = p_turma;
  return jsonb_build_object('id', r.id, 'nome', r.nome, 'descricao', r.descricao, 'codigo', r.codigo, 'sala', r.sala, 'instituicao_id', r.instituicao_id,
    'instituicao', r.inst, 'tipo', r.tipo, 'professor', r.professor, 'gerencia', public.gerencia_turma(p_turma));
end $$;

create or replace function public.aulas_turma(p_turma uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.participa_turma(p_turma) then raise exception 'Você não participa desta turma.'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('id', a.id, 'titulo', a.titulo, 'inicio', a.inicio, 'duracao_min', a.duracao_min,
            'link', coalesce(a.link, 'https://meet.jit.si/' || t.sala || '-' || substr(replace(a.id::text, '-', ''), 1, 6)), 'externo', a.link is not null) order by a.inicio)
          from public.aulas a join public.turmas t on t.id = a.turma_id
         where a.turma_id = p_turma and a.inicio + make_interval(mins => a.duracao_min) > now() - interval '1 day'), '[]'::jsonb);
end $$;

create or replace function public.salvar_aula(p_turma uuid, p_id uuid, p_titulo text, p_inicio timestamptz, p_duracao int, p_link text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v uuid;
begin
  if not public.gerencia_turma(p_turma) then raise exception 'Acesso negado.'; end if;
  if p_link is not null and p_link <> '' and p_link !~ '^https://' then raise exception 'O link precisa começar com https://'; end if;
  if p_id is null then
    insert into public.aulas (turma_id, titulo, inicio, duracao_min, link, criado_por)
    values (p_turma, left(trim(p_titulo), 100), p_inicio, coalesce(p_duracao, 60), nullif(trim(coalesce(p_link, '')), ''), auth.uid()) returning id into v;
  else
    update public.aulas set titulo = left(trim(p_titulo), 100), inicio = p_inicio, duracao_min = coalesce(p_duracao, 60), link = nullif(trim(coalesce(p_link, '')), '')
     where id = p_id and turma_id = p_turma returning id into v;
  end if;
  return v;
end $$;

create or replace function public.excluir_aula(p_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.gerencia_turma((select turma_id from public.aulas where id = p_id)) then raise exception 'Acesso negado.'; end if;
  delete from public.aulas where id = p_id;
end $$;

create or replace function public.videos_turma(p_turma uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.participa_turma(p_turma) then raise exception 'Você não participa desta turma.'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('id', id, 'titulo', titulo, 'url', url, 'descricao', descricao, 'criado_em', criado_em) order by criado_em desc)
          from public.videos where turma_id = p_turma), '[]'::jsonb);
end $$;

create or replace function public.salvar_video(p_turma uuid, p_titulo text, p_url text, p_descricao text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v uuid;
begin
  if not public.gerencia_turma(p_turma) then raise exception 'Acesso negado.'; end if;
  if p_url !~ '^https://' then raise exception 'O link precisa começar com https://'; end if;
  insert into public.videos (turma_id, titulo, url, descricao, criado_por)
  values (p_turma, left(trim(p_titulo), 120), left(trim(p_url), 300), nullif(left(trim(coalesce(p_descricao, '')), 500), ''), auth.uid()) returning id into v;
  return v;
end $$;

create or replace function public.excluir_video(p_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.gerencia_turma((select turma_id from public.videos where id = p_id)) then raise exception 'Acesso negado.'; end if;
  delete from public.videos where id = p_id;
end $$;

-- ---------------------------------------------------------------------
-- Comunidade
-- ---------------------------------------------------------------------
create or replace function public.pode_ver_escopo(p_escopo text, p_ref uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and case p_escopo
    when 'publica' then true
    when 'escola' then public.participa_inst(p_ref)
    when 'turma' then public.participa_turma(p_ref)
    else false end;
$$;
create or replace function public.pode_moderar(p_escopo text, p_ref uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.eh_admin() or case p_escopo
    when 'escola' then public.sou_dono_inst(p_ref)
    when 'turma' then public.gerencia_turma(p_ref)
    else false end;
$$;
create or replace function public.autor_info(p_id uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select case
    when exists (select 1 from public.admins ad join auth.users u on lower(u.email) = ad.email where u.id = p_id) then jsonb_build_object('nome', 'Equipe English Smart', 'papel', 'equipe')
    when exists (select 1 from public.instituicoes where dono = p_id and tipo = 'escola') then jsonb_build_object('nome', (select nome from public.instituicoes where dono = p_id), 'papel', 'escola')
    when exists (select 1 from public.educadores where id = p_id) then jsonb_build_object('nome', (select nome from public.educadores where id = p_id), 'papel', 'professor')
    else (select jsonb_build_object('nome', split_part(nome, ' ', 1) || coalesce(' ' || left(nullif(split_part(nome, ' ', 2), ''), 1) || '.', ''), 'avatar', avatar, 'papel', 'aluno') from public.alunos where id = p_id)
  end;
$$;

create or replace function public.listar_posts(p_escopo text, p_ref uuid default null, p_antes bigint default null)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare mod boolean;
begin
  if not public.pode_ver_escopo(p_escopo, p_ref) then raise exception 'Você não participa desta comunidade.'; end if;
  mod := public.pode_moderar(p_escopo, p_ref);
  return coalesce((select jsonb_agg(x order by (x->>'fixado')::boolean desc, (x->>'id')::bigint desc) from (
    select jsonb_build_object('id', p.id, 'texto', p.texto, 'criado_em', p.criado_em, 'fixado', p.fixado,
      'autor', public.autor_info(p.autor), 'meu', p.autor = auth.uid(), 'pode_apagar', p.autor = auth.uid() or mod, 'pode_fixar', mod,
      'curtidas', (select count(*) from public.curtidas c where c.post_id = p.id),
      'curti', exists (select 1 from public.curtidas c where c.post_id = p.id and c.usuario_id = auth.uid()),
      'comentarios', (select count(*) from public.comentarios c where c.post_id = p.id)) as x
      from public.posts p
     where p.escopo = p_escopo and p.ref is not distinct from p_ref and (p_antes is null or p.id < p_antes)
     order by p.fixado desc, p.id desc limit 20) s), '[]'::jsonb);
end $$;

create or replace function public.publicar_post(p_escopo text, p_ref uuid, p_texto text)
returns bigint language plpgsql security definer set search_path = '' as $$
declare v bigint;
begin
  if not public.pode_ver_escopo(p_escopo, case when p_escopo = 'publica' then null else p_ref end) then raise exception 'Você não participa desta comunidade.'; end if;
  if char_length(trim(coalesce(p_texto, ''))) < 1 then raise exception 'Escreva alguma coisa.'; end if;
  if (select count(*) from public.posts where autor = auth.uid() and criado_em > now() - interval '1 hour') >= 10 then raise exception 'Você publicou muitas vezes seguidas. Tente de novo mais tarde.'; end if;
  insert into public.posts (escopo, ref, autor, texto) values (p_escopo, case when p_escopo = 'publica' then null else p_ref end, auth.uid(), left(trim(p_texto), 2000)) returning id into v;
  return v;
end $$;

create or replace function public.apagar_post(p_id bigint)
returns void language plpgsql security definer set search_path = '' as $$
declare p public.posts;
begin
  select * into p from public.posts where id = p_id;
  if p.id is null then return; end if;
  if p.autor <> auth.uid() and not public.pode_moderar(p.escopo, p.ref) then raise exception 'Você não pode apagar esta publicação.'; end if;
  delete from public.posts where id = p_id;
end $$;

create or replace function public.fixar_post(p_id bigint, p_fixar boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare p public.posts;
begin
  select * into p from public.posts where id = p_id;
  if not public.pode_moderar(p.escopo, p.ref) then raise exception 'Apenas quem modera pode fixar.'; end if;
  update public.posts set fixado = p_fixar where id = p_id;
end $$;

create or replace function public.curtir_post(p_id bigint)
returns boolean language plpgsql security definer set search_path = '' as $$
declare p public.posts;
begin
  select * into p from public.posts where id = p_id;
  if p.id is null or not public.pode_ver_escopo(p.escopo, p.ref) then raise exception 'Publicação não encontrada.'; end if;
  if exists (select 1 from public.curtidas where post_id = p_id and usuario_id = auth.uid()) then
    delete from public.curtidas where post_id = p_id and usuario_id = auth.uid(); return false;
  end if;
  insert into public.curtidas (post_id, usuario_id) values (p_id, auth.uid()); return true;
end $$;

create or replace function public.listar_comentarios(p_post bigint)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare p public.posts; mod boolean;
begin
  select * into p from public.posts where id = p_post;
  if p.id is null or not public.pode_ver_escopo(p.escopo, p.ref) then raise exception 'Publicação não encontrada.'; end if;
  mod := public.pode_moderar(p.escopo, p.ref);
  return coalesce((select jsonb_agg(jsonb_build_object('id', c.id, 'texto', c.texto, 'criado_em', c.criado_em, 'autor', public.autor_info(c.autor),
            'pode_apagar', c.autor = auth.uid() or mod) order by c.id) from public.comentarios c where c.post_id = p_post), '[]'::jsonb);
end $$;

create or replace function public.comentar(p_post bigint, p_texto text)
returns bigint language plpgsql security definer set search_path = '' as $$
declare p public.posts; v bigint;
begin
  select * into p from public.posts where id = p_post;
  if p.id is null or not public.pode_ver_escopo(p.escopo, p.ref) then raise exception 'Publicação não encontrada.'; end if;
  if char_length(trim(coalesce(p_texto, ''))) < 1 then raise exception 'Escreva alguma coisa.'; end if;
  if (select count(*) from public.comentarios where autor = auth.uid() and criado_em > now() - interval '1 hour') >= 30 then raise exception 'Muitos comentários seguidos. Tente mais tarde.'; end if;
  insert into public.comentarios (post_id, autor, texto) values (p_post, auth.uid(), left(trim(p_texto), 1000)) returning id into v;
  return v;
end $$;

create or replace function public.apagar_comentario(p_id bigint)
returns void language plpgsql security definer set search_path = '' as $$
declare c public.comentarios; p public.posts;
begin
  select * into c from public.comentarios where id = p_id;
  if c.id is null then return; end if;
  select * into p from public.posts where id = c.post_id;
  if c.autor <> auth.uid() and not public.pode_moderar(p.escopo, p.ref) then raise exception 'Você não pode apagar este comentário.'; end if;
  delete from public.comentarios where id = p_id;
end $$;

create or replace function public.denunciar(p_post bigint, p_comentario bigint, p_motivo text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Faça login.'; end if;
  if (select count(*) from public.denuncias where autor = auth.uid() and criada_em > now() - interval '1 day') >= 20 then return; end if;
  insert into public.denuncias (post_id, comentario_id, autor, motivo) values (p_post, p_comentario, auth.uid(), left(trim(coalesce(p_motivo, '')), 300));
end $$;

-- Admin: denúncias e instituições
create or replace function public.admin_denuncias()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.eh_admin() then raise exception 'Acesso restrito ao administrador.'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('id', d.id, 'motivo', d.motivo, 'criada_em', d.criada_em, 'post_id', d.post_id, 'comentario_id', d.comentario_id,
            'texto', coalesce((select texto from public.comentarios where id = d.comentario_id), (select texto from public.posts where id = d.post_id)),
            'autor', public.autor_info(coalesce((select autor from public.comentarios where id = d.comentario_id), (select autor from public.posts where id = d.post_id)))) order by d.id desc)
          from public.denuncias d where d.post_id is not null or d.comentario_id is not null), '[]'::jsonb);
end $$;
create or replace function public.admin_resolver_denuncia(p_id bigint, p_apagar boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare d public.denuncias;
begin
  if not public.eh_admin() then raise exception 'Acesso restrito ao administrador.'; end if;
  select * into d from public.denuncias where id = p_id;
  if p_apagar then
    if d.comentario_id is not null then delete from public.comentarios where id = d.comentario_id;
    elsif d.post_id is not null then delete from public.posts where id = d.post_id; end if;
  end if;
  delete from public.denuncias where id = p_id;
end $$;
create or replace function public.admin_instituicoes()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.eh_admin() then raise exception 'Acesso restrito ao administrador.'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('id', i.id, 'tipo', i.tipo, 'nome', i.nome, 'email', e.email, 'codigo', i.codigo, 'ciclo', i.ciclo,
            'pago_ate', i.pago_ate, 'ativa', public.inst_ativa(i.id), 'alunos', public.qtd_alunos_inst(i.id),
            'professores', (select count(*) from public.professores_escola where instituicao_id = i.id and status = 'aprovado'),
            'turmas', (select count(*) from public.turmas where instituicao_id = i.id),
            'em_aberto', (select coalesce(sum(total), 0) from public.faturas where instituicao_id = i.id and status = 'aberta'),
            'criado_em', i.criado_em) order by i.criado_em desc)
          from public.instituicoes i join public.educadores e on e.id = i.dono), '[]'::jsonb);
end $$;

-- Contexto do aluno com o id da instituição (para a comunidade da escola)
create or replace function public.meu_contexto()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare uid uuid := auth.uid(); e public.educadores; i public.instituicoes; v record;
begin
  if uid is null then return null; end if;
  select * into e from public.educadores where id = uid;
  if e.id is not null then
    select * into i from public.instituicoes where dono = uid;
    if i.id is not null then
      return jsonb_build_object('papel', 'educador', 'subtipo', i.tipo, 'nome', e.nome, 'email', e.email,
        'instituicao', jsonb_build_object('id', i.id, 'tipo', i.tipo, 'nome', i.nome, 'codigo', i.codigo, 'ciclo', i.ciclo, 'pago_ate', i.pago_ate,
          'ativa', public.inst_ativa(i.id), 'desconto', public.desconto_inst(i.tipo), 'documento', i.documento));
    end if;
    select pe.status, ins.id, ins.nome, ins.codigo into v from public.professores_escola pe join public.instituicoes ins on ins.id = pe.instituicao_id where pe.professor_id = uid;
    return jsonb_build_object('papel', 'educador', 'subtipo', 'vinculado', 'nome', e.nome, 'email', e.email,
      'vinculo', case when v.id is null then null else jsonb_build_object('status', v.status, 'id', v.id, 'nome', v.nome, 'ativa', public.inst_ativa(v.id)) end);
  end if;
  return jsonb_build_object('papel', 'aluno', 'premium', public.eh_assinante(),
    'turmas', coalesce((select jsonb_agg(jsonb_build_object('id', t.id, 'nome', t.nome, 'status', ta.status, 'instituicao', ins.nome, 'instituicao_id', ins.id, 'tipo', ins.tipo,
                  'ativa', public.inst_ativa(ins.id)) order by ta.solicitado_em)
                  from public.turma_alunos ta join public.turmas t on t.id = ta.turma_id join public.instituicoes ins on ins.id = t.instituicao_id
                 where ta.aluno_id = uid), '[]'::jsonb));
end $$;

-- ---------------------------------------------------------------------
-- Permissões: só usuários logados chamam; funções internas só pelo servidor
-- ---------------------------------------------------------------------
do $$
declare f text;
begin
  foreach f in array array[
    'tornar_educador(text,text,text,text,text)', 'meu_contexto()', 'salvar_turma_edu(uuid,text,text,uuid)', 'excluir_turma_edu(uuid)', 'minhas_turmas_edu()',
    'alunos_turma_edu(uuid)', 'decidir_aluno_turma(uuid,uuid,text)', 'entrar_turma(text)', 'sair_turma_edu(uuid)', 'professores_da_escola()',
    'decidir_professor(uuid,text)', 'vincular_escola(text)', 'atualizar_instituicao(text,text,text)', 'previsao_fatura()', 'gerar_fatura()', 'minhas_faturas()',
    'painel_edu(uuid,integer)', 'turma_info(uuid)', 'aulas_turma(uuid)', 'salvar_aula(uuid,uuid,text,timestamp with time zone,integer,text)', 'excluir_aula(uuid)',
    'videos_turma(uuid)', 'salvar_video(uuid,text,text,text)', 'excluir_video(uuid)', 'listar_posts(text,uuid,bigint)', 'publicar_post(text,uuid,text)',
    'apagar_post(bigint)', 'fixar_post(bigint,boolean)', 'curtir_post(bigint)', 'listar_comentarios(bigint)', 'comentar(bigint,text)', 'apagar_comentario(bigint)',
    'denunciar(bigint,bigint,text)', 'admin_denuncias()', 'admin_resolver_denuncia(bigint,boolean)', 'admin_instituicoes()'] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
  foreach f in array array['criar_fatura_inst(uuid,text)', 'gerar_faturas_automaticas()', 'qtd_alunos_inst(uuid)', 'autor_info(uuid)'] loop
    execute format('revoke all on function public.%s from public, anon, authenticated', f);
  end loop;
end $$;

-- Faturas automáticas todo dia às 6h de Brasília (9h UTC)
select cron.unschedule('faturas-instituicoes') where exists (select 1 from cron.job where jobname = 'faturas-instituicoes');
select cron.schedule('faturas-instituicoes', '7 9 * * *', $c$ select public.gerar_faturas_automaticas(); $c$);

-- =====================================================================
-- Migração: 10 lições por nível (níveis 1–16) e segurança dos auxiliares
-- =====================================================================
CREATE OR REPLACE FUNCTION public.registrar_atividade(p_nivel integer, p_licao integer, p_acertos integer, p_total integer, p_dispositivo text DEFAULT NULL::text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
  if p_nivel is null or p_nivel < 1 or (p_nivel <= 16 and p_nivel > aluno.nivel_num) or (p_nivel > 16 and p_nivel not between 101 and 108) then raise exception 'Este nível ainda está bloqueado.'; end if;
  if p_nivel > 100 and p_licao = 0 then raise exception 'As trilhas extras não têm teste.'; end if;
  if p_licao is null or p_licao < 0 or (p_nivel <= 16 and p_licao > 10) or (p_nivel > 100 and p_licao > 20) then raise exception 'Atividade inválida.'; end if;
  if not public.eh_assinante(uid) then raise exception 'Assine o English Smart para acessar as lições.'; end if;
  if not public.dispositivo_ok(uid, p_dispositivo) then raise exception 'Este aparelho não está liberado nesta conta (limite de 4 aparelhos).'; end if;
  if p_total is null or p_total < 1 or p_total > 60 or p_acertos is null or p_acertos < 0 or p_acertos > p_total then
    raise exception 'Resultado inválido.';
  end if;

  if p_licao = 0 then
    select count(*) into licoes_ok from public.progresso
     where aluno_id = uid and nivel_num = p_nivel and licao between 1 and 10 and acertos >= total * 0.6;
    if licoes_ok < 10 then raise exception 'Conclua as 10 lições do nível antes do teste.'; end if;
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
$function$;

CREATE OR REPLACE FUNCTION public.registrar_revisao(p_modo text, p_itens jsonb, p_acertos integer, p_total integer, p_dispositivo text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
  if not public.eh_assinante(uid) then raise exception 'Assine o English Smart para acessar a revisão.'; end if;
  if not public.dispositivo_ok(uid, p_dispositivo) then raise exception 'Este aparelho não está liberado nesta conta (limite de 4 aparelhos).'; end if;
  if jsonb_typeof(p_itens) <> 'array' or jsonb_array_length(p_itens) > 80 then raise exception 'Itens inválidos.'; end if;
  if p_total < 0 or p_total > 80 or p_acertos < 0 or p_acertos > p_total then raise exception 'Resultado inválido.'; end if;

  for x in select * from jsonb_array_elements(p_itens) loop
    v_item := x->>'item';
    v_certo := coalesce((x->>'certo')::boolean, false);
    continue when v_item is null or v_item !~ '^[ved]\|([1-9]|1[0-6])\|([1-9]|10)\|[0-9]{1,2}$';
    v_nivel := split_part(v_item, '|', 2)::int;
    continue when v_nivel > a.nivel_num;

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

  select coalesce(sum(xp), 0) into hoje_xp from public.sessoes_revisao
   where aluno_id = uid and feita_em >= date_trunc('day', now());
  ganho := least(p_acertos * 5, greatest(0, 100 - hoje_xp));
  select max(acertos) into recorde from public.sessoes_revisao where aluno_id = uid and modo = p_modo;

  insert into public.sessoes_revisao (aluno_id, modo, acertos, total, xp) values (uid, p_modo, p_acertos, p_total, ganho);
  update public.alunos set xp = xp + ganho where id = uid returning xp into a.xp;

  return jsonb_build_object('xp_ganho', ganho, 'xp_total', a.xp, 'recorde_anterior', recorde);
end;
$function$;

alter table public.revisao drop constraint if exists revisao_item_check;
alter table public.revisao add constraint revisao_item_check CHECK ((item ~ '^[ved]\|([1-9]|1[0-6])\|([1-9]|10)\|[0-9]{1,2}$'::text));

-- Funções auxiliares internas: não ficam abertas para visitantes sem login
revoke execute on function public.gerencia_turma(uuid), public.inst_ativa(uuid), public.minha_inst(), public.participa_inst(uuid), public.participa_turma(uuid), public.pode_moderar(text, uuid), public.pode_ver_escopo(text, uuid), public.sou_dono_inst(uuid) from anon, public;
grant execute on function public.gerencia_turma(uuid), public.inst_ativa(uuid), public.minha_inst(), public.participa_inst(uuid), public.participa_turma(uuid), public.pode_moderar(text, uuid), public.pode_ver_escopo(text, uuid), public.sou_dono_inst(uuid) to authenticated;

-- =====================================================================
-- Migração: certificados nas trilhas extras (101–108)
-- Regra: todas as lições da trilha com pelo menos 70% de acertos
-- =====================================================================
alter table public.certificados drop constraint if exists certificados_nivel_num_check;
alter table public.certificados add constraint certificados_nivel_num_check check (nivel_num between 1 and 16 or nivel_num between 101 and 120);

create or replace function public.licoes_trilha(n integer)
 returns integer language sql immutable set search_path to ''
as $$ select case when n between 101 and 103 then 16 when n between 104 and 108 then 12 else 0 end; $$;
revoke execute on function public.licoes_trilha(integer) from anon, public;

do $mig$
declare d text;
begin
  d := pg_get_functiondef('public.registrar_atividade(integer,integer,integer,integer,text)'::regprocedure);
  if position('certificado da trilha' in d) = 0 then
    d := replace(d, E'  return json_build_object(\n    ''xp_ganho'', ganho,',
      E'  -- certificado da trilha extra: todas as lições com pelo menos 70%\n' ||
      E'  if p_nivel > 100 and p_acertos >= p_total * 0.7 and not exists (select 1 from public.certificados where aluno_id = uid and nivel_num = p_nivel) then\n' ||
      E'    select count(*) into licoes_ok from public.progresso\n' ||
      E'     where aluno_id = uid and nivel_num = p_nivel and licao between 1 and public.licoes_trilha(p_nivel) and acertos >= total * 0.7;\n' ||
      E'    if public.licoes_trilha(p_nivel) > 0 and licoes_ok >= public.licoes_trilha(p_nivel) then\n' ||
      E'      insert into public.certificados (aluno_id, nivel_num) values (uid, p_nivel) on conflict (aluno_id, nivel_num) do nothing;\n' ||
      E'      select codigo into cert from public.certificados where aluno_id = uid and nivel_num = p_nivel;\n' ||
      E'      update public.alunos set xp = xp + 100 where id = uid;\n' ||
      E'      ganho := ganho + 100;\n' ||
      E'    end if;\n' ||
      E'  end if;\n\n' ||
      E'  return json_build_object(\n    ''xp_ganho'', ganho,');
    if position('certificado da trilha' in d) = 0 then raise exception 'trecho não encontrado'; end if;
    execute d;
  end if;
end $mig$;

-- Quem já completou alguma trilha com 70% em todas as lições ganha o certificado agora
insert into public.certificados (aluno_id, nivel_num)
select p.aluno_id, p.nivel_num from public.progresso p
 where p.nivel_num between 101 and 108 and p.licao between 1 and public.licoes_trilha(p.nivel_num) and p.acertos >= p.total * 0.7
 group by p.aluno_id, p.nivel_num
having count(*) >= public.licoes_trilha(p.nivel_num)
on conflict (aluno_id, nivel_num) do nothing;

create or replace function public.verificar_certificado(p_codigo text)
 returns jsonb language sql stable security definer set search_path to ''
as $function$
  select jsonb_build_object('nome', a.nome, 'nivel_num', c.nivel_num,
           'nivel', case when c.nivel_num > 100 then null else public.nivel_cefr(c.nivel_num) end,
           'trilha', c.nivel_num > 100, 'emitido_em', c.emitido_em, 'codigo', c.codigo)
    from public.certificados c join public.alunos a on a.id = c.aluno_id
   where c.codigo = upper(trim(p_codigo)) and upper(trim(p_codigo)) ~ '^[A-Z0-9]{6,16}$';
$function$;

-- =====================================================================
-- Migração: perfil de escolas e professores (foto/avatar, telefone, cidade)
-- =====================================================================
alter table public.educadores add column if not exists telefone text;
alter table public.educadores add column if not exists cidade text;
alter table public.educadores add column if not exists avatar text;

create or replace function public.atualizar_perfil(p_nome text, p_telefone text, p_cidade text, p_avatar text)
 returns void language plpgsql security definer set search_path to ''
as $function$
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
    or (av ~ '^https://[a-z0-9.-]+\.googleusercontent\.com/' and char_length(av) <= 300
        and av in (select a.avatar from public.alunos a where a.id = uid union all select e.avatar from public.educadores e where e.id = uid))
  ) then
    raise exception 'Avatar inválido.';
  end if;

  update public.alunos set nome = nome_limpo, telefone = tel, cidade = cid, avatar = av where id = uid;
  if found then return; end if;
  update public.educadores set nome = nome_limpo, telefone = tel, cidade = cid, avatar = av where id = uid;
  if not found then raise exception 'Cadastro não encontrado.'; end if;
end;
$function$;

do $mig$
declare d text;
begin
  d := pg_get_functiondef('public.meu_contexto()'::regprocedure);
  if position('''avatar'', e.avatar' in d) = 0 then
    d := replace(d, '''nome'', e.nome, ''email'', e.email,', '''nome'', e.nome, ''email'', e.email, ''avatar'', e.avatar, ''telefone'', e.telefone, ''cidade'', e.cidade,');
    if position('''avatar'', e.avatar' in d) = 0 then raise exception 'trecho não encontrado'; end if;
    execute d;
  end if;
end $mig$;

create or replace function public.autor_info(p_id uuid)
 returns jsonb language sql stable security definer set search_path to ''
as $function$
  select case
    when exists (select 1 from public.admins ad join auth.users u on lower(u.email) = ad.email where u.id = p_id) then jsonb_build_object('nome', 'Equipe English Smart', 'papel', 'equipe')
    when exists (select 1 from public.instituicoes where dono = p_id and tipo = 'escola') then jsonb_build_object('nome', (select nome from public.instituicoes where dono = p_id), 'avatar', (select avatar from public.educadores where id = p_id), 'papel', 'escola')
    when exists (select 1 from public.educadores where id = p_id) then (select jsonb_build_object('nome', nome, 'avatar', avatar, 'papel', 'professor') from public.educadores where id = p_id)
    else (select jsonb_build_object('nome', split_part(nome, ' ', 1) || coalesce(' ' || left(nullif(split_part(nome, ' ', 2), ''), 1) || '.', ''), 'avatar', avatar, 'papel', 'aluno') from public.alunos where id = p_id)
  end;
$function$;

-- =====================================================================
-- Endurecimento: tabelas fechadas para visitantes; usuários logados só leem (o que as políticas permitem).
-- Toda gravação passa pelas funções do banco (SECURITY DEFINER), que conferem as regras.
-- =====================================================================
revoke all on all tables in schema public from anon;
revoke insert, update, delete, truncate, references, trigger on all tables in schema public from authenticated;
revoke select on public.config_privada, public.admins from authenticated;
alter default privileges in schema public revoke all on tables from anon;
alter default privileges in schema public revoke insert, update, delete, truncate, references, trigger on tables from authenticated;

-- =====================================================================
-- Fale conosco: a tabela "denuncias" guarda sugestões, reclamações, elogios e denúncias,
-- sempre com o e-mail de contato para a equipe responder (aba Mensagens do portal).
-- Funções: enviar_manifestacao (visitante ou logado), admin_manifestacoes, admin_atualizar_manifestacao.
-- O SQL completo foi aplicado pela migração "fale_conosco_manifestacoes".
-- =====================================================================
alter table public.denuncias add column if not exists tipo text not null default 'denuncia';
alter table public.denuncias add column if not exists email text;
alter table public.denuncias add column if not exists nome text;
alter table public.denuncias add column if not exists papel text;
alter table public.denuncias add column if not exists status text not null default 'aberta';
alter table public.denuncias add column if not exists resolvida_em timestamptz;
