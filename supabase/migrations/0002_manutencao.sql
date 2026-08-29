-- Etapa 2: Manutenção -- histórico de peças trocadas/revisão/troca de
-- óleo, e alvo de "próxima" (por data ou km) pra calcular o aviso de
-- lembrete direto no app. "Última revisão"/"última troca de óleo" não
-- viram coluna redundante -- são sempre a linha mais recente de
-- `manutencoes` com aquele `tipo`, consultada ao vivo.

create table manutencoes (
  id uuid primary key default gen_random_uuid(),
  veiculo_id uuid not null references veiculos(id) on delete cascade,
  tipo text not null default 'peca' check (tipo in ('peca', 'revisao', 'troca_oleo')),
  peca text not null,
  data date not null,
  km integer,
  oficina text,
  valor numeric,
  criado_em timestamptz not null default now()
);

create index manutencoes_veiculo_id_idx on manutencoes(veiculo_id);

-- Alvo da "próxima" revisão/troca de óleo -- o dono define por data,
-- por km, ou os dois; o app avisa quando qualquer um dos dois estiver
-- perto (o que vier primeiro).
alter table veiculos
  add column proxima_revisao_data date,
  add column proxima_revisao_km integer,
  add column proxima_troca_oleo_data date,
  add column proxima_troca_oleo_km integer;

alter table manutencoes enable row level security;

create policy "manutencoes_select_proprio" on manutencoes
  for select using (
    veiculo_id in (select id from veiculos where usuario_id = auth.uid())
  );

create policy "manutencoes_insert_proprio" on manutencoes
  for insert with check (
    veiculo_id in (select id from veiculos where usuario_id = auth.uid())
  );

create policy "manutencoes_update_proprio" on manutencoes
  for update using (
    veiculo_id in (select id from veiculos where usuario_id = auth.uid())
  );

create policy "manutencoes_delete_proprio" on manutencoes
  for delete using (
    veiculo_id in (select id from veiculos where usuario_id = auth.uid())
  );
