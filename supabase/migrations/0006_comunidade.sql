-- Etapa 6: Comunidade -- feed de fotos, curtidas, comentários, e um
-- toggle de "perfil público" opcional (mostra os veículos do usuário
-- pra quem visitar o perfil dele -- feature separada do feed em si,
-- que já é visível pra qualquer usuário autenticado).

alter table perfis add column perfil_publico boolean not null default false;

create table posts_comunidade (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references auth.users(id) on delete cascade,
  veiculo_id uuid references veiculos(id) on delete set null,
  foto_url text not null,
  legenda text,
  criado_em timestamptz not null default now()
);

create index posts_comunidade_usuario_id_idx on posts_comunidade(usuario_id);

create table curtidas (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references posts_comunidade(id) on delete cascade,
  usuario_id uuid not null references auth.users(id) on delete cascade,
  criado_em timestamptz not null default now(),
  unique (post_id, usuario_id)
);

create table comentarios (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references posts_comunidade(id) on delete cascade,
  usuario_id uuid not null references auth.users(id) on delete cascade,
  texto text not null,
  criado_em timestamptz not null default now()
);

create index comentarios_post_id_idx on comentarios(post_id);

-- Feed público (pra qualquer autenticado) com nome de quem postou e
-- contagem de curtidas/comentários -- "curti ou não" fica de fora da
-- view, é resolvido no cliente consultando a própria linha em
-- `curtidas` (mais simples que parametrizar a view por usuário).
create view comunidade_feed as
select
  p.id,
  p.usuario_id,
  pf.nome as usuario_nome,
  p.veiculo_id,
  p.foto_url,
  p.legenda,
  p.criado_em,
  (select count(*) from curtidas c where c.post_id = p.id) as total_curtidas,
  (select count(*) from comentarios cm where cm.post_id = p.id) as total_comentarios
from posts_comunidade p
join perfis pf on pf.id = p.usuario_id
order by p.criado_em desc;

grant select on comunidade_feed to authenticated;

alter table posts_comunidade enable row level security;
alter table curtidas enable row level security;
alter table comentarios enable row level security;

create policy "posts_select_autenticado" on posts_comunidade
  for select to authenticated using (true);

create policy "posts_insert_proprio" on posts_comunidade
  for insert with check (auth.uid() = usuario_id);

create policy "posts_delete_proprio" on posts_comunidade
  for delete using (auth.uid() = usuario_id);

create policy "curtidas_select_autenticado" on curtidas
  for select to authenticated using (true);

create policy "curtidas_insert_proprio" on curtidas
  for insert with check (auth.uid() = usuario_id);

create policy "curtidas_delete_proprio" on curtidas
  for delete using (auth.uid() = usuario_id);

create policy "comentarios_select_autenticado" on comentarios
  for select to authenticated using (true);

create policy "comentarios_insert_proprio" on comentarios
  for insert with check (auth.uid() = usuario_id);

create policy "comentarios_delete_proprio" on comentarios
  for delete using (auth.uid() = usuario_id);

-- Perfil público: quando ligado, qualquer autenticado pode ver os
-- veículos do usuário (só leitura, nunca escrita). Sem isso, veiculos
-- continua 100% privado (política antiga "veiculos_select_proprio"
-- continua valendo pro dono; esta é uma policy adicional, permissiva,
-- só quando o dono ligou o perfil público).
create policy "veiculos_select_publico_se_ligado" on veiculos
  for select to authenticated using (
    usuario_id in (select id from perfis where perfil_publico = true)
  );
