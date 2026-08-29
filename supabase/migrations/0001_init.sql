-- Gestão de Veículos — schema da Etapa 1 (cadastro de usuário +
-- cadastro de veículo com fotos/documentos). As etapas seguintes
-- (manutenção, abastecimento, mural de venda, transferência,
-- comunidade) ganham suas próprias migrations depois, na ordem que o
-- plano original definiu -- não criar essas tabelas adiantado.

create extension if not exists pgcrypto;

-- Dados complementares do usuário (auth.users já cobre e-mail/senha).
-- CPF é exigido aqui porque a Etapa 5 (transferência de veículo) vai
-- precisar dele pra verificação de identidade -- pedir já no cadastro
-- evita ter que voltar em todo usuário existente depois.
create table perfis (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text not null,
  telefone text,
  cpf text not null unique,
  criado_em timestamptz not null default now()
);

-- Cria a linha em "perfis" sozinha assim que a conta é criada no
-- Supabase Auth, lendo nome/telefone/cpf que o app manda em
-- `options.data` no signUp -- evita ter que gravar o perfil na mão
-- depois (que dependeria de já ter sessão, e nem sempre tem, se o
-- projeto exigir confirmação de e-mail). `security definer` porque
-- nesse momento ainda não existe uma sessão autenticada como o usuário
-- novo -- sem isso, o RLS de "perfis" bloquearia o insert.
create function lidar_novo_usuario()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.perfis (id, nome, telefone, cpf)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nome', ''),
    new.raw_user_meta_data->>'telefone',
    coalesce(new.raw_user_meta_data->>'cpf', '')
  );
  return new;
end;
$$;

create trigger ao_criar_usuario
  after insert on auth.users
  for each row execute function lidar_novo_usuario();

create table veiculos (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references auth.users(id) on delete cascade,
  tipo text not null check (tipo in ('carro', 'moto')),
  placa text not null,
  marca text not null,
  modelo text not null,
  ano integer,
  cor text,
  km_atual integer not null default 0,
  criado_em timestamptz not null default now()
);

create index veiculos_usuario_id_idx on veiculos(usuario_id);

-- Fotos do veículo (frente/verso/lateral/interior) -- múltiplas por
-- veículo, cada uma com seu tipo.
create table fotos_veiculo (
  id uuid primary key default gen_random_uuid(),
  veiculo_id uuid not null references veiculos(id) on delete cascade,
  tipo text not null check (tipo in ('frente', 'verso', 'lateral', 'interior', 'outra')),
  foto_url text not null,
  criado_em timestamptz not null default now()
);

create index fotos_veiculo_veiculo_id_idx on fotos_veiculo(veiculo_id);

-- Documentos (CRLV etc.) -- separado das fotos porque pode ser PDF,
-- não só imagem, e a lista de tipos tende a crescer nas etapas
-- seguintes (ex: comprovante de transferência).
create table documentos_veiculo (
  id uuid primary key default gen_random_uuid(),
  veiculo_id uuid not null references veiculos(id) on delete cascade,
  tipo text not null default 'crlv',
  arquivo_url text not null,
  criado_em timestamptz not null default now()
);

create index documentos_veiculo_veiculo_id_idx on documentos_veiculo(veiculo_id);

alter table perfis enable row level security;
alter table veiculos enable row level security;
alter table fotos_veiculo enable row level security;
alter table documentos_veiculo enable row level security;

-- perfis: cada um só vê/edita o próprio.
create policy "perfis_select_proprio" on perfis
  for select using (auth.uid() = id);

create policy "perfis_insert_proprio" on perfis
  for insert with check (auth.uid() = id);

create policy "perfis_update_proprio" on perfis
  for update using (auth.uid() = id);

-- veiculos: só o dono vê/edita os próprios. Nada público aqui ainda —
-- o mural de venda (Etapa 4) é que vai precisar expor um subconjunto
-- de veículos publicamente, através de uma view própria, como foi
-- feito no projeto da lista de casamento (presentes_publico).
create policy "veiculos_select_proprio" on veiculos
  for select using (auth.uid() = usuario_id);

create policy "veiculos_insert_proprio" on veiculos
  for insert with check (auth.uid() = usuario_id);

create policy "veiculos_update_proprio" on veiculos
  for update using (auth.uid() = usuario_id);

create policy "veiculos_delete_proprio" on veiculos
  for delete using (auth.uid() = usuario_id);

-- fotos_veiculo / documentos_veiculo: acesso via dono do veículo.
create policy "fotos_select_proprio" on fotos_veiculo
  for select using (
    veiculo_id in (select id from veiculos where usuario_id = auth.uid())
  );

create policy "fotos_insert_proprio" on fotos_veiculo
  for insert with check (
    veiculo_id in (select id from veiculos where usuario_id = auth.uid())
  );

create policy "fotos_delete_proprio" on fotos_veiculo
  for delete using (
    veiculo_id in (select id from veiculos where usuario_id = auth.uid())
  );

create policy "documentos_select_proprio" on documentos_veiculo
  for select using (
    veiculo_id in (select id from veiculos where usuario_id = auth.uid())
  );

create policy "documentos_insert_proprio" on documentos_veiculo
  for insert with check (
    veiculo_id in (select id from veiculos where usuario_id = auth.uid())
  );

create policy "documentos_delete_proprio" on documentos_veiculo
  for delete using (
    veiculo_id in (select id from veiculos where usuario_id = auth.uid())
  );

-- Upload de fotos/documentos vai pro bucket "veiculos" (criar manualmente
-- no Storage, marcado como PÚBLICO -- igual foi feito com o bucket "capas"
-- da lista de casamento. Precisa ser público porque o <Image> do app busca
-- a foto sem enviar token de autenticação; a policy de select abaixo só
-- vale pra chamadas autenticadas via SDK, não pra URL pública). Cada
-- usuário só grava dentro da própria pasta (nome do arquivo prefixado com
-- auth.uid()) -- as fotos ficam "públicas, mas com URL impossível de
-- adivinhar" (mesmo modelo da lista de casamento), não listadas em lugar
-- nenhum ainda porque a Etapa 4 (mural) é que vai expor veículo publicamente.
create policy "veiculos_upload_proprio" on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'veiculos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "veiculos_leitura_proprio" on storage.objects
  for select
  to authenticated
  using (bucket_id = 'veiculos' and (storage.foldername(name))[1] = auth.uid()::text);
