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

1. Rode a migration `supabase/migrations/0001_init.sql` no SQL Editor
   do seu projeto Supabase — cria as tabelas (`perfis`, `veiculos`,
   `fotos_veiculo`, `documentos_veiculo`), o trigger que cria o perfil
   automaticamente no cadastro, e as políticas de RLS.
2. Crie um bucket de **Storage público** chamado `veiculos` (usado pra
   fotos do veículo e foto do CRLV). Não tem como criar bucket via SQL
   — é em Storage → New bucket no painel.

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

## Próximas etapas (não construídas ainda, nesta ordem)

2. Manutenção (histórico de peças, revisão, troca de óleo, lembretes)
3. Abastecimento + avaliação/ranking de postos
4. Mural de venda (marketplace)
5. Transferência de veículo (verificação de identidade, LGPD)
6. Comunidade (feed social)
