# App de Gestão de Veículos (Carro + Moto) — Plano Completo

> Plano original do usuário. Mantido aqui como referência — a arquitetura
> real usada neste repositório diverge do texto abaixo em um ponto
> importante: **é um app Expo/React Native de verdade** (iOS/Android,
> testável via Expo Go, buildável pra loja via EAS depois), não uma PWA
> em Cloudflare Workers. Essa mudança foi decidida em conversa (o usuário
> queria "um app mesmo" pra iPhone e Android, não um site instalável) —
> o resto do plano (conceito, monetização, estrutura de telas, ordem de
> construção) segue valendo.

## 1. Conceito

Um app que centraliza a vida do veículo: documentação, manutenção, abastecimento, venda, transferência e comunidade. Funciona pra carro e moto no mesmo app, com múltiplos veículos por usuário.

Monetização possível:
- Assinatura premium (histórico ilimitado, alertas avançados, destaque no mural)
- Taxa sobre anúncios em destaque no mural de venda
- Taxa sobre transferência de veículo (serviço de verificação)
- Parceria/comissão com postos de combustível (cadastro pago pra aparecer no ranking)
- Anúncios no mural da comunidade

## 2. Stack técnica

- **Expo (React Native)**: um código só, funciona como app iOS, Android e web, com Supabase como backend.
- **Backend: Supabase** (banco de dados Postgres + Auth + Storage pra fotos).
- **Login:** Supabase Auth, cadastro com nome, e-mail, telefone e CPF (necessário pra transferência de veículo e verificação LGPD).
- **Hospedagem (versão web/preview):** Netlify, mesmo esquema do Marcato e da Lista de Casamento. Build pra loja (iOS/Android) via EAS quando chegar a hora.
- **Layout:** identidade visual do Marcato PDV (paleta roxo/verde, Poppins, cartões com borda+sombra leve, barra de abas com círculo animado) — ver `README.md`.

## 3. Estrutura de telas

### 3.1 Dashboard inicial
- Lista de veículos cadastrados (carro/moto) em cards com foto principal
- Resumo: km total, próxima manutenção mais próxima, gasto do mês em combustível

### 3.2 Perfil do veículo
- Fotos: frente, verso, lateral, interior (upload múltiplo, Supabase Storage)
- Dados: placa, marca, modelo, ano, cor, km atual, tipo (carro/moto)
- Documentos: CRLV (upload de foto/PDF)

### 3.3 Manutenção
- Histórico de peças trocadas (nome da peça, data, km, oficina, valor)
- Última revisão feita / próxima revisão (por data ou km)
- Última troca de óleo / próxima troca de óleo (por data ou km)
- Lembretes automáticos (notificação push quando estiver perto da data/km)

### 3.4 Abastecimento
- Registro de abastecimento (posto, valor, litros, km no momento)
- Avaliação de postos pela comunidade (nota + comentário)
- Ranking de postos próximos por avaliação (usar geolocalização)
- Filtro "onde não abastecer" (postos com avaliação ruim)

### 3.5 Mural de venda (marketplace)
- Anunciar veículo à venda com fotos, descrição, preço
- Filtros de busca (tipo, marca, faixa de preço, localização)
- Chat entre comprador e vendedor dentro do app

### 3.6 Transferência de veículo
- Fluxo de transferência: vendedor inicia, comprador confirma
- Verificação de identidade (CPF + selfie ou documento, via serviço de verificação)
- Termo de transferência gerado automaticamente, com aceite digital
- Conformidade LGPD: consentimento explícito de uso de dados, política de privacidade clara, dados sensíveis (CPF, documento) criptografados

### 3.7 Comunidade
- Mural estilo feed, fotos de carros/motos dos usuários
- Curtidas e comentários
- Perfil público opcional (mostrar veículos do usuário)

## 4. Ordem de construção sugerida (por etapas)

1. ✅ Cadastro de usuário + cadastro de veículo com fotos — **feito, este repositório**
2. Módulo de manutenção + lembretes
3. Módulo de abastecimento + ranking de postos
4. Mural de venda (marketplace)
5. Transferência de veículo (parte mais sensível, deixar por último)
6. Comunidade/feed social
