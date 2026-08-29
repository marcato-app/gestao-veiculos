# Gestão de Veículos

App (React Native + Expo, funciona também na web) pra centralizar a vida
do veículo: documentação, manutenção, abastecimento, venda, transferência
e comunidade. Carro e moto no mesmo app, múltiplos veículos por usuário.

Este repositório está na **Etapa 1** do plano completo (veja `PLANO.md`):
cadastro de usuário + cadastro de veículo com fotos e documento.

## Como rodar localmente

### 1. Instale o Node.js
https://nodejs.org (versão LTS).

### 2. Configure o `.env`
```
cp .env.example .env
```
Preencha com as credenciais do seu projeto Supabase (Project Settings → API).

### 3. Instale as dependências e rode
```
npm install
npx expo start
```
Escaneie o QR code com o app **Expo Go** (Android) ou a câmera do
iPhone. Pra testar no navegador: `npx expo start --web`.

## Configurar o backend (Supabase)

1. Rode as migrations em `supabase/migrations/` **em ordem** (`0001` a
   `0006`) no SQL Editor do seu projeto Supabase.
2. Crie um bucket de **Storage público** chamado `veiculos` (fotos do
   veículo, CRLV, e fotos da Comunidade). Não tem como criar bucket via
   SQL — é em Storage → New bucket no painel.
3. Crie um bucket de **Storage privado** chamado `documentos-transferencia`
   (documento + selfie da Etapa 5) — **não marque como público**, esse
   é acessado só via URL assinada temporária, nunca por link direto.

## Visual

Segue o mesmo sistema visual do Marcato PDV: roxo `#6C3CE9` como cor de
marca, verde `#17D9A0` como destaque, fonte única Poppins, cartões com
borda + sombra leve, botões em cápsula, e uma barra de abas inferior
com um círculo animado que desliza até a aba tocada
(`components/BarraInferior.js`).

## Identidade / verificação

O cadastro já pede CPF (com validação de dígito verificador,
`lib/data.js`) porque a Etapa 5 (transferência de veículo) vai precisar
dele pra verificação de identidade. Ainda **não** há criptografia
específica pro CPF armazenado — isso faz parte do trabalho de LGPD que
o plano original deixa pra Etapa 5, de propósito.

## Etapas construídas

Todas as 6 etapas do plano têm código pronto (ver `PROGRESSO.md` pra
detalhes e pendências de cada uma):

1. Cadastro + veículo
2. Manutenção (histórico, lembretes de revisão/troca de óleo)
3. Abastecimento + avaliação/ranking de postos (sem geolocalização ainda)
4. Mural de venda (marketplace) + chat
5. Transferência de veículo (fluxo completo, mas **sem KYC de
   verdade** — verificação de identidade é manual por enquanto)
6. Comunidade (feed social)

Transferências e Comunidade ficam acessíveis pelo menu do Perfil (não
são abas de primeira classe na barra de baixo, que ficou só com 5
itens — ver `PROGRESSO.md`).
