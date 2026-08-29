-- Etapa 3: Abastecimento -- registro por veículo, mais uma lista de
-- postos avaliada pela comunidade (todos os usuários, não só o dono
-- do veículo). Sem geolocalização/distância por enquanto (precisaria
-- de uma API de geocodificação que não temos configurada) -- o
-- ranking é só por nota média.

create table abastecimentos (
  id uuid primary key default gen_random_uuid(),
  veiculo_id uuid not null references veiculos(id) on delete cascade,
  posto_nome text not null,
  valor numeric not null check (valor > 0),
  litros numeric,
  km integer,
  data date not null default current_date,
  criado_em timestamptz not null default now()
);

create index abastecimentos_veiculo_id_idx on abastecimentos(veiculo_id);

-- Postos são compartilhados entre todos os usuários (é o que permite
-- ranking de comunidade) -- qualquer usuário autenticado pode cadastrar
-- um novo, mas só quem cadastrou edita/remove.
create table postos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  endereco text,
  criado_por uuid not null references auth.users(id) on delete cascade,
  criado_em timestamptz not null default now()
);

create table avaliacoes_postos (
  id uuid primary key default gen_random_uuid(),
  posto_id uuid not null references postos(id) on delete cascade,
  usuario_id uuid not null references auth.users(id) on delete cascade,
  nota integer not null check (nota between 1 and 5),
  comentario text,
  criado_em timestamptz not null default now(),
  unique (posto_id, usuario_id)
);

create index avaliacoes_postos_posto_id_idx on avaliacoes_postos(posto_id);

-- View pública com a nota média de cada posto, pro ranking -- não
-- expõe quem avaliou o quê, só o agregado.
create view postos_com_nota as
select
  p.id,
  p.nome,
  p.endereco,
  coalesce(avg(a.nota), 0) as nota_media,
  count(a.id) as total_avaliacoes
from postos p
left join avaliacoes_postos a on a.posto_id = p.id
group by p.id;

grant select on postos_com_nota to authenticated;

alter table abastecimentos enable row level security;
alter table postos enable row level security;
alter table avaliacoes_postos enable row level security;

create policy "abastecimentos_select_proprio" on abastecimentos
  for select using (
    veiculo_id in (select id from veiculos where usuario_id = auth.uid())
  );

create policy "abastecimentos_insert_proprio" on abastecimentos
  for insert with check (
    veiculo_id in (select id from veiculos where usuario_id = auth.uid())
  );

create policy "abastecimentos_delete_proprio" on abastecimentos
  for delete using (
    veiculo_id in (select id from veiculos where usuario_id = auth.uid())
  );

-- postos: leitura liberada pra qualquer autenticado (é lista
-- compartilhada da comunidade); escrita só de quem cadastrou.
create policy "postos_select_autenticado" on postos
  for select to authenticated using (true);

create policy "postos_insert_autenticado" on postos
  for insert to authenticated with check (auth.uid() = criado_por);

create policy "postos_update_proprio" on postos
  for update using (auth.uid() = criado_por);

create policy "postos_delete_proprio" on postos
  for delete using (auth.uid() = criado_por);

-- avaliacoes_postos: leitura liberada (é o que alimenta a nota média
-- pública); cada usuário só grava/edita/remove a própria avaliação.
create policy "avaliacoes_select_autenticado" on avaliacoes_postos
  for select to authenticated using (true);

create policy "avaliacoes_insert_proprio" on avaliacoes_postos
  for insert with check (auth.uid() = usuario_id);

create policy "avaliacoes_update_proprio" on avaliacoes_postos
  for update using (auth.uid() = usuario_id);

create policy "avaliacoes_delete_proprio" on avaliacoes_postos
  for delete using (auth.uid() = usuario_id);
