-- Etapa 4: Mural de venda (marketplace) -- anunciar veículo já
-- cadastrado, buscar com filtros, e conversar com o vendedor dentro
-- do próprio app (sem trocar contato antes de decidir comprar).

create table anuncios (
  id uuid primary key default gen_random_uuid(),
  veiculo_id uuid not null references veiculos(id) on delete cascade,
  preco numeric not null check (preco > 0),
  descricao text,
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

create index anuncios_veiculo_id_idx on anuncios(veiculo_id);

create table conversas (
  id uuid primary key default gen_random_uuid(),
  anuncio_id uuid not null references anuncios(id) on delete cascade,
  comprador_id uuid not null references auth.users(id) on delete cascade,
  vendedor_id uuid not null references auth.users(id) on delete cascade,
  criado_em timestamptz not null default now(),
  unique (anuncio_id, comprador_id)
);

create table mensagens (
  id uuid primary key default gen_random_uuid(),
  conversa_id uuid not null references conversas(id) on delete cascade,
  remetente_id uuid not null references auth.users(id) on delete cascade,
  texto text not null,
  criado_em timestamptz not null default now()
);

create index mensagens_conversa_id_idx on mensagens(conversa_id);

-- View pública de anúncios ativos -- junta veículo + primeira foto +
-- nome do vendedor, roda com o privilégio de quem criou a view (dono
-- da tabela), então funciona mesmo com RLS de "veiculos" restrito ao
-- dono (mesmo truque de presentes_publico/postos_com_nota).
create view anuncios_publico as
select
  an.id as anuncio_id,
  an.preco,
  an.descricao,
  an.criado_em,
  v.id as veiculo_id,
  v.tipo,
  v.marca,
  v.modelo,
  v.ano,
  v.cor,
  v.km_atual,
  v.usuario_id as vendedor_id,
  p.nome as vendedor_nome,
  (select f.foto_url from fotos_veiculo f where f.veiculo_id = v.id and f.tipo = 'frente' limit 1) as foto_capa
from anuncios an
join veiculos v on v.id = an.veiculo_id
join perfis p on p.id = v.usuario_id
where an.ativo = true;

grant select on anuncios_publico to authenticated;

alter table anuncios enable row level security;
alter table conversas enable row level security;
alter table mensagens enable row level security;

-- anuncios: só o dono do veículo gerencia (a exposição pública é
-- via view acima, não via select direto na tabela).
create policy "anuncios_select_proprio" on anuncios
  for select using (
    veiculo_id in (select id from veiculos where usuario_id = auth.uid())
  );

create policy "anuncios_insert_proprio" on anuncios
  for insert with check (
    veiculo_id in (select id from veiculos where usuario_id = auth.uid())
  );

create policy "anuncios_update_proprio" on anuncios
  for update using (
    veiculo_id in (select id from veiculos where usuario_id = auth.uid())
  );

create policy "anuncios_delete_proprio" on anuncios
  for delete using (
    veiculo_id in (select id from veiculos where usuario_id = auth.uid())
  );

-- conversas: só os dois participantes (comprador e vendedor) enxergam.
-- O comprador inicia; o vendedor_id precisa bater com o dono de
-- verdade do anúncio (confere via join, não confia no que o app manda).
create policy "conversas_select_participante" on conversas
  for select using (auth.uid() = comprador_id or auth.uid() = vendedor_id);

create policy "conversas_insert_comprador" on conversas
  for insert with check (
    auth.uid() = comprador_id
    and vendedor_id = (
      select v.usuario_id from anuncios a join veiculos v on v.id = a.veiculo_id where a.id = anuncio_id
    )
  );

-- mensagens: só quem participa da conversa lê/escreve, e só em nome
-- de si mesmo.
create policy "mensagens_select_participante" on mensagens
  for select using (
    conversa_id in (
      select id from conversas where auth.uid() = comprador_id or auth.uid() = vendedor_id
    )
  );

create policy "mensagens_insert_participante" on mensagens
  for insert with check (
    auth.uid() = remetente_id
    and conversa_id in (
      select id from conversas where auth.uid() = comprador_id or auth.uid() = vendedor_id
    )
  );
