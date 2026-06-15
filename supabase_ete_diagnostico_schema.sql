
-- ============================================================
-- ETE Professor José Luiz de Mendonça
-- Sistema Inteligente de Diagnóstico Educacional
-- Supabase - Estrutura inicial: 12 turmas, Português e Matemática
-- Autor do site: Felipe Camargo
-- ============================================================

-- IMPORTANTE:
-- 1. Execute este script no Supabase em: SQL Editor -> New query -> Run.
-- 2. NÃO coloque service_role/secret key no GitHub Pages.
-- 3. Use no site apenas Project URL + anon public key.
-- 4. Após executar, cadastre os usuários no painel Authentication do Supabase.

create extension if not exists "pgcrypto";

do $$
begin
  if not exists (select 1 from pg_type where typname = 'perfil_usuario') then
    create type perfil_usuario as enum ('professor', 'coordenador');
  end if;

  if not exists (select 1 from pg_type where typname = 'disciplina_tipo') then
    create type disciplina_tipo as enum ('lingua_portuguesa', 'matematica');
  end if;

  if not exists (select 1 from pg_type where typname = 'permissao_tipo') then
    create type permissao_tipo as enum ('visualizar', 'editar', 'gerenciar');
  end if;
end$$;

create table if not exists public.perfis (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text not null,
  email text not null unique,
  perfil perfil_usuario not null default 'professor',
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

alter table public.perfis enable row level security;

create table if not exists public.turmas (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  serie text,
  turno text,
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

alter table public.turmas enable row level security;

create table if not exists public.professor_turma (
  id uuid primary key default gen_random_uuid(),
  professor_id uuid not null references public.perfis(id) on delete cascade,
  turma_id uuid not null references public.turmas(id) on delete cascade,
  disciplina disciplina_tipo not null,
  permissao permissao_tipo not null default 'editar',
  criado_em timestamptz not null default now(),
  unique (professor_id, turma_id, disciplina)
);

alter table public.professor_turma enable row level security;

create table if not exists public.avaliacoes (
  id uuid primary key default gen_random_uuid(),
  turma_id uuid not null references public.turmas(id) on delete cascade,
  professor_id uuid not null references public.perfis(id) on delete cascade,
  disciplina disciplina_tipo not null,
  titulo text not null default 'Avaliação',
  tipo text default 'diagnostica',
  data_avaliacao date default current_date,
  questoes jsonb not null default '[]'::jsonb,
  descritores jsonb not null default '[]'::jsonb,
  gabarito jsonb not null default '[]'::jsonb,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

alter table public.avaliacoes enable row level security;

create table if not exists public.resultados_alunos (
  id uuid primary key default gen_random_uuid(),
  avaliacao_id uuid not null references public.avaliacoes(id) on delete cascade,
  aluno_nome text not null,
  respostas jsonb not null default '[]'::jsonb,
  acertos integer default 0,
  total integer default 0,
  percentual numeric(5,2) default 0,
  descritores_criticos jsonb not null default '[]'::jsonb,
  relatorio_individual text,
  mapa_da_mina text,
  ficha_exercicios text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (avaliacao_id, aluno_nome)
);

alter table public.resultados_alunos enable row level security;

create table if not exists public.historico_avaliacoes (
  id uuid primary key default gen_random_uuid(),
  turma_id uuid not null references public.turmas(id) on delete cascade,
  disciplina disciplina_tipo not null,
  avaliacao_id uuid references public.avaliacoes(id) on delete set null,
  resumo jsonb not null default '{}'::jsonb,
  criado_em timestamptz not null default now()
);

alter table public.historico_avaliacoes enable row level security;

create or replace function public.usuario_e_coordenador()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.perfis p
    where p.id = auth.uid()
      and p.perfil = 'coordenador'
      and p.ativo = true
  );
$$;

create or replace function public.usuario_tem_turma_disciplina(
  turma uuid,
  disc disciplina_tipo
)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.professor_turma pt
    join public.perfis p on p.id = pt.professor_id
    where pt.professor_id = auth.uid()
      and pt.turma_id = turma
      and pt.disciplina = disc
      and pt.permissao in ('editar','gerenciar')
      and p.ativo = true
  );
$$;

drop policy if exists "perfis_select_autenticado" on public.perfis;
create policy "perfis_select_autenticado"
on public.perfis for select to authenticated using (true);

drop policy if exists "perfis_update_proprio_ou_coordenador" on public.perfis;
create policy "perfis_update_proprio_ou_coordenador"
on public.perfis for update to authenticated
using (id = auth.uid() or public.usuario_e_coordenador())
with check (id = auth.uid() or public.usuario_e_coordenador());

drop policy if exists "turmas_select_autenticado" on public.turmas;
create policy "turmas_select_autenticado"
on public.turmas for select to authenticated using (true);

drop policy if exists "turmas_write_coordenador" on public.turmas;
create policy "turmas_write_coordenador"
on public.turmas for all to authenticated
using (public.usuario_e_coordenador())
with check (public.usuario_e_coordenador());

drop policy if exists "professor_turma_select_autenticado" on public.professor_turma;
create policy "professor_turma_select_autenticado"
on public.professor_turma for select to authenticated using (true);

drop policy if exists "professor_turma_write_coordenador" on public.professor_turma;
create policy "professor_turma_write_coordenador"
on public.professor_turma for all to authenticated
using (public.usuario_e_coordenador())
with check (public.usuario_e_coordenador());

drop policy if exists "avaliacoes_select_professor_vinculado_ou_coordenador" on public.avaliacoes;
create policy "avaliacoes_select_professor_vinculado_ou_coordenador"
on public.avaliacoes for select to authenticated
using (
  public.usuario_e_coordenador()
  or professor_id = auth.uid()
  or public.usuario_tem_turma_disciplina(turma_id, disciplina)
);

drop policy if exists "avaliacoes_insert_professor_vinculado" on public.avaliacoes;
create policy "avaliacoes_insert_professor_vinculado"
on public.avaliacoes for insert to authenticated
with check (
  public.usuario_e_coordenador()
  or (
    professor_id = auth.uid()
    and public.usuario_tem_turma_disciplina(turma_id, disciplina)
  )
);

drop policy if exists "avaliacoes_update_autor_ou_coordenador" on public.avaliacoes;
create policy "avaliacoes_update_autor_ou_coordenador"
on public.avaliacoes for update to authenticated
using (public.usuario_e_coordenador() or professor_id = auth.uid())
with check (public.usuario_e_coordenador() or professor_id = auth.uid());

drop policy if exists "avaliacoes_delete_autor_ou_coordenador" on public.avaliacoes;
create policy "avaliacoes_delete_autor_ou_coordenador"
on public.avaliacoes for delete to authenticated
using (public.usuario_e_coordenador() or professor_id = auth.uid());

drop policy if exists "resultados_select_por_avaliacao_visivel" on public.resultados_alunos;
create policy "resultados_select_por_avaliacao_visivel"
on public.resultados_alunos for select to authenticated
using (
  exists (
    select 1
    from public.avaliacoes a
    where a.id = resultados_alunos.avaliacao_id
      and (
        public.usuario_e_coordenador()
        or a.professor_id = auth.uid()
        or public.usuario_tem_turma_disciplina(a.turma_id, a.disciplina)
      )
  )
);

drop policy if exists "resultados_insert_autor_avaliacao_ou_coordenador" on public.resultados_alunos;
create policy "resultados_insert_autor_avaliacao_ou_coordenador"
on public.resultados_alunos for insert to authenticated
with check (
  exists (
    select 1
    from public.avaliacoes a
    where a.id = resultados_alunos.avaliacao_id
      and (public.usuario_e_coordenador() or a.professor_id = auth.uid())
  )
);

drop policy if exists "resultados_update_autor_avaliacao_ou_coordenador" on public.resultados_alunos;
create policy "resultados_update_autor_avaliacao_ou_coordenador"
on public.resultados_alunos for update to authenticated
using (
  exists (
    select 1
    from public.avaliacoes a
    where a.id = resultados_alunos.avaliacao_id
      and (public.usuario_e_coordenador() or a.professor_id = auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.avaliacoes a
    where a.id = resultados_alunos.avaliacao_id
      and (public.usuario_e_coordenador() or a.professor_id = auth.uid())
  )
);

drop policy if exists "resultados_delete_autor_avaliacao_ou_coordenador" on public.resultados_alunos;
create policy "resultados_delete_autor_avaliacao_ou_coordenador"
on public.resultados_alunos for delete to authenticated
using (
  exists (
    select 1
    from public.avaliacoes a
    where a.id = resultados_alunos.avaliacao_id
      and (public.usuario_e_coordenador() or a.professor_id = auth.uid())
  )
);

drop policy if exists "historico_select_autenticado" on public.historico_avaliacoes;
create policy "historico_select_autenticado"
on public.historico_avaliacoes for select to authenticated
using (
  public.usuario_e_coordenador()
  or public.usuario_tem_turma_disciplina(turma_id, disciplina)
);

drop policy if exists "historico_write_professor_ou_coordenador" on public.historico_avaliacoes;
create policy "historico_write_professor_ou_coordenador"
on public.historico_avaliacoes for all to authenticated
using (
  public.usuario_e_coordenador()
  or public.usuario_tem_turma_disciplina(turma_id, disciplina)
)
with check (
  public.usuario_e_coordenador()
  or public.usuario_tem_turma_disciplina(turma_id, disciplina)
);

create or replace function public.set_atualizado_em()
returns trigger language plpgsql as $$
begin
  new.atualizado_em = now();
  return new;
end;
$$;

drop trigger if exists trg_avaliacoes_atualizado_em on public.avaliacoes;
create trigger trg_avaliacoes_atualizado_em
before update on public.avaliacoes
for each row execute function public.set_atualizado_em();

drop trigger if exists trg_resultados_atualizado_em on public.resultados_alunos;
create trigger trg_resultados_atualizado_em
before update on public.resultados_alunos
for each row execute function public.set_atualizado_em();

insert into public.turmas (nome, serie, turno)
values
  ('1º A', '1º ano', 'Manhã'),
  ('1º B', '1º ano', 'Manhã'),
  ('1º C', '1º ano', 'Manhã'),
  ('1º D', '1º ano', 'Tarde'),
  ('2º A', '2º ano', 'Manhã'),
  ('2º B', '2º ano', 'Manhã'),
  ('2º C', '2º ano', 'Tarde'),
  ('2º D', '2º ano', 'Tarde'),
  ('3º A', '3º ano', 'Manhã'),
  ('3º B', '3º ano', 'Manhã'),
  ('3º C', '3º ano', 'Tarde'),
  ('3º D', '3º ano', 'Tarde')
on conflict (nome) do nothing;

-- ============================================================
-- CADASTRO DE USUÁRIOS
-- ============================================================
-- Primeiro crie os usuários em Authentication -> Users.
-- Depois execute inserts em perfis usando o UUID de cada usuário.
--
-- Exemplo:
-- insert into public.perfis (id, nome, email, perfil)
-- values
--   ('UUID_DO_USUARIO_AQUI', 'Felipe Camargo', 'email@escola.com', 'professor'),
--   ('UUID_DA_COORDENACAO_AQUI', 'Coordenação', 'coordenacao@escola.com', 'coordenador');
--
-- Vincular professor a turmas:
-- insert into public.professor_turma (professor_id, turma_id, disciplina, permissao)
-- select 'UUID_DO_PROFESSOR_AQUI', id, 'matematica', 'editar'
-- from public.turmas
-- where nome in ('1º A', '1º B', '1º C');
--
-- Para Português:
-- insert into public.professor_turma (professor_id, turma_id, disciplina, permissao)
-- select 'UUID_DO_PROFESSOR_AQUI', id, 'lingua_portuguesa', 'editar'
-- from public.turmas
-- where nome in ('1º A', '1º B');
