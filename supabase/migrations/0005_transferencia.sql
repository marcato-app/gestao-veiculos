-- Etapa 5: Transferência de veículo -- a etapa mais sensível, por
-- último de propósito (LGPD, dado sensível). IMPORTANTE: isto NÃO é
-- uma verificação de identidade de verdade (tipo Unico/ClearSale) --
-- é upload manual de documento + selfie, guardado privado, esperando
-- uma revisão manual até decidirmos contratar um serviço de
-- verificação automática de verdade. Não finge ser mais seguro do que
-- é: trata como "declaração assinada digitalmente", não como KYC.
--
-- Fluxo: vendedor inicia informando o CPF do comprador (que precisa já
-- ter conta no app); os dois aceitam o termo + consentimento LGPD e
-- enviam documento/selfie (cada um só vê o próprio, não o do outro --
-- a real "verificação" cruzada fica pra quando tiver um fornecedor de
-- KYC de verdade); o vendedor confirma a conclusão, que só então troca
-- o dono do veículo (`veiculos.usuario_id`).

create table transferencias (
  id uuid primary key default gen_random_uuid(),
  veiculo_id uuid not null references veiculos(id) on delete cascade,
  vendedor_id uuid not null references auth.users(id) on delete cascade,
  comprador_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'aguardando_documentos' check (
    status in ('aguardando_documentos', 'concluida', 'cancelada')
  ),
  termo_aceito_vendedor boolean not null default false,
  termo_aceito_comprador boolean not null default false,
  consentimento_lgpd_vendedor boolean not null default false,
  consentimento_lgpd_comprador boolean not null default false,
  documento_vendedor_path text,
  selfie_vendedor_path text,
  documento_comprador_path text,
  selfie_comprador_path text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index transferencias_veiculo_id_idx on transferencias(veiculo_id);
create index transferencias_vendedor_id_idx on transferencias(vendedor_id);
create index transferencias_comprador_id_idx on transferencias(comprador_id);

alter table transferencias enable row level security;

-- Só vendedor e comprador da transferência enxergam/editam a linha.
create policy "transferencias_select_participante" on transferencias
  for select using (auth.uid() = vendedor_id or auth.uid() = comprador_id);

create policy "transferencias_insert_vendedor" on transferencias
  for insert with check (
    auth.uid() = vendedor_id
    and veiculo_id in (select id from veiculos where usuario_id = auth.uid())
  );

create policy "transferencias_update_participante" on transferencias
  for update using (auth.uid() = vendedor_id or auth.uid() = comprador_id);

-- Bucket "documentos-transferencia" PRIVADO (não marcar como público no
-- Storage -- ao contrário do bucket "veiculos", documento/selfie não
-- pode ser acessível por link direto). A leitura das imagens no app usa
-- `createSignedUrl` (URL temporária), nunca `getPublicUrl`. Cada um só
-- grava/lê a própria pasta -- nem o outro lado da transferência vê o
-- documento do outro, isso é intencional (ver comentário no topo).
create policy "documentos_transferencia_upload_proprio" on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'documentos-transferencia' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "documentos_transferencia_leitura_proprio" on storage.objects
  for select
  to authenticated
  using (bucket_id = 'documentos-transferencia' and (storage.foldername(name))[1] = auth.uid()::text);
