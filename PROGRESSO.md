# Progresso do Gestão de Veículos

> Este arquivo é mantido pela Claude. Toda vez que terminarmos uma etapa importante, ele é atualizado. Quando você disser "podemos continuar de onde paramos" numa sessão nova, este arquivo deve ser lido primeiro.

Última atualização: 2026-08-29 (todas as 6 etapas do plano construídas — código pronto, você está testando a Etapa 1 no Expo Go enquanto o resto foi escrito)

## Contexto do produto

App completo de gestão de veículos (carro + moto): documentação, manutenção, abastecimento, mural de venda, transferência com verificação de identidade (LGPD), comunidade. Plano completo em `PLANO.md`.

**Decisão importante**: o plano original pedia PWA + Cloudflare Workers (mesmo esquema do Marcato PDV, que é um painel de admin pra navegador). O usuário corrigiu isso no meio da conversa — queria "um app mesmo" pra iPhone e Android. Mudamos pra **Expo/React Native** (mesma stack do Marcato e da Lista de Casamento). A identidade visual (paleta, Poppins, barra de abas com círculo animado) continua vindo do Marcato PDV — só a tecnologia de hospedagem/distribuição mudou.

**Ordem de construção**: o usuário pediu pra construir todas as 6 etapas de uma vez ("faz todas as etapas, vou testar a Etapa 1 no Expo Go enquanto isso"). Então a Etapa 1 é a única testada/validada com Supabase de verdade até agora — as etapas 2 a 6 têm build web limpo (`npx expo export -p web`, sem erro), mas **nenhuma delas foi clicada ao vivo ainda**.

## ✅ Etapa 1 — Cadastro + veículo (testando agora)

- Expo (React Native + Web), `App.js` na raiz, `screens/`, `lib/`, `theme/`, `components/`, `supabase/migrations`.
- Sistema visual (`theme/estilos.js`): roxo `#6C3CE9`/verde `#17D9A0` (claro e escuro), espaçamento 4/8/12/16/20/28, raio 8/10/12/14/pill, sombra padrão e alta, fonte única Poppins. Cartões translúcidos (`rgba`), como no Marcato PDV.
- Barra de abas animada (`components/BarraInferior.js`): círculo que desliza (`translateX`) + aperta-e-volta (`scale`) via `Animated` nativo, componente genérico (recebe abas por prop). Com 5 abas na barra principal (ver seção de navegação abaixo).
- Schema (`0001_init.sql`): `perfis`, `veiculos`, `fotos_veiculo`, `documentos_veiculo`, RLS, trigger `lidar_novo_usuario()` que cria o perfil sozinho no cadastro (lê `options.data` do `signUp`).
- CPF com validação de dígito verificador de verdade (`lib/data.js`).
- Cadastro/login/recuperação de senha (`AuthScreen.js`, `ResetPasswordScreen.js`, `theme/AuthContext.js`).
- Dashboard (`VeiculosScreen.js`) + cadastro/edição de veículo com 4 fotos + CRLV (`VeiculoFormScreen.js`).
- Perfil (`PerfilScreen.js`): nome/telefone editáveis, CPF fixo.

## ✅ Etapa 2 — Manutenção (`ManutencaoScreen.js`, migration `0002`)

- Tabela `manutencoes` (peça/revisão/troca de óleo, com `tipo`), campos em `veiculos` pra alvo de "próxima" revisão/troca de óleo (por data e/ou km).
- "Última revisão"/"última troca de óleo" **não** são coluna redundante — sempre a linha mais recente de `manutencoes` daquele tipo, consultada ao vivo.
- Aviso visual (Em dia / Chegando perto / Atrasada) calculado no cliente (`lib/data.js`: `diasParaData`) comparando com a data/km alvo. **Sem notificação push de verdade** — isso exigiria infraestrutura de push token + cron/Edge Function rodando periodicamente, não construído ainda (ver pendências).

## ✅ Etapa 3 — Abastecimento (`AbastecimentoScreen.js`, migration `0003`)

- Registro de abastecimento por veículo (posto, valor, litros, km, data) + KPI de gasto do mês.
- Postos compartilhados entre todos os usuários (`postos` + `avaliacoes_postos`, nota 1-5 + comentário), ranking por nota média via view `postos_com_nota`.
- **Sem geolocalização/distância** — o plano pedia "postos próximos" usando a localização do usuário, mas isso precisaria de uma API de geocodificação (converter endereço em lat/lng) que não está configurada. O ranking hoje é só por nota, não por proximidade. Pendência clara pra quando decidirem qual serviço de geocodificação usar (Google Maps API, Mapbox, etc. — todos pagos a partir de certo volume).

## ✅ Etapa 4 — Mural de venda (`MuralScreen.js`, `ChatDetalheScreen.js`, migration `0004`)

- Anunciar veículo já cadastrado (preço + descrição), ativar/desativar.
- Busca pública com filtro por tipo (carro/moto) e texto (marca/modelo) — view `anuncios_publico` (mesmo padrão de `presentes_publico`/`postos_com_nota`: view criada pelo dono da tabela, contorna o RLS de `veiculos` que é privado por padrão).
- Chat comprador/vendedor dentro do app (`conversas` + `mensagens`, RLS restrito aos dois participantes). **Sem realtime de verdade** — a tela de chat faz polling a cada 4s (mesmo padrão usado no polling de pagamento Pix da Lista de Casamento), não usa `supabase.channel()`. Funciona, mas não é instantâneo.

## ✅ Etapa 5 — Transferência de veículo (`TransferenciaScreen.js`, migration `0005`)

**Atenção, isso é o mais importante de entender antes de usar com clientes de verdade**: a "verificação de identidade" aqui **não é KYC de verdade**. É upload manual de foto do documento + selfie, guardado num bucket **privado** (`documentos-transferencia`, ao contrário do bucket `veiculos` que é público — aqui uso `createSignedUrl` com expiração de 1h, nunca `getPublicUrl`). Cada lado só vê o próprio documento, não o do outro — não tem verificação cruzada automática nem humana ainda. Trate como uma "declaração assinada digitalmente", não como uma garantia legal ou anti-fraude de verdade. Isso fica registrado como aviso dentro do próprio app (`TransferenciaScreen.js`).

Fluxo: vendedor escolhe o veículo + informa o CPF do comprador (que **precisa já ter conta no app** com esse CPF — não criei convite pra quem ainda não tem conta, seria muito mais complexo). Os dois aceitam um termo de transferência (texto fixo) + um checkbox de consentimento LGPD separado, e enviam documento+selfie. O vendedor confirma a conclusão, que aí sim troca `veiculos.usuario_id` pro comprador (a posse muda de verdade dentro do app).

**Antes de contratar um fornecedor de KYC de verdade** (tipo Unico, ClearSale, Serpro), essa tela serve como MVP funcional, mas não deve ser vendida como "verificado" pros usuários.

## ✅ Etapa 6 — Comunidade (`ComunidadeScreen.js`, migration `0006`)

- Feed de fotos (`posts_comunidade`) visível pra qualquer usuário autenticado, com curtidas (`curtidas`) e comentários (`comentarios`) — view `comunidade_feed` com contagem agregada.
- Fotos sobem pro bucket `veiculos` já existente, pasta `comunidade/{uid}/...` (não precisou de bucket novo nem policy nova — a policy de upload já cobre qualquer subpasta dentro da pasta do usuário).
- "Perfil público" (toggle em `PerfilScreen.js`, coluna `perfis.perfil_publico`): quando ligado, libera uma policy adicional de `select` em `veiculos` pra qualquer autenticado ver os veículos daquele usuário. É uma feature **separada** do feed (o feed já é visível a todos independente desse toggle).

## 🧭 Como a navegação ficou organizada

A barra de abas de baixo (a animada) ficou só com **5** itens — Veículos, Manutenção, Postos, Mural, Perfil — porque o componente foi desenhado pro Marcato PDV com poucas abas, e 7 ficaria espremido/quebrado (o círculo é maior que o espaço disponível por aba). **Transferências** e **Comunidade** ficam acessíveis por dentro do Perfil (dois itens de menu, "🔄 Transferências de veículo" e "💬 Comunidade"), abrindo em tela cheia com um "← Voltar ao app". Funciona, mas se quiserem elevar Comunidade/Transferência pra abas de primeira classe depois, dá pra repensar o componente da barra pra suportar mais itens (ex: um item "Mais" que abre um menu).

## 🚧 Pendências antes de usar de verdade

1. **Rodar as migrations `0002` a `0006`** (a `0001` você já está rodando/rodou). Ordem não importa muito entre elas, mas siga a numeração.
2. **Criar o bucket privado `documentos-transferencia`** no Storage (Etapa 5) — **não marcar como público**, ao contrário do bucket `veiculos`.
3. Testar cada etapa nova de ponta a ponta (nenhuma foi clicada ao vivo ainda, só validada por build):
   - Manutenção: registrar peça trocada, definir lembrete de revisão, ver o aviso mudar de cor.
   - Abastecimento: registrar abastecimento, cadastrar e avaliar um posto (precisa de 2 contas pra testar avaliação de terceiro fazendo sentido).
   - Mural: anunciar um veículo, ver ele aparecer pra outra conta, iniciar uma conversa, mandar mensagem.
   - Transferência: precisa de 2 contas com CPF cadastrado — iniciar, aceitar termo dos dois lados, subir documento dos dois lados, concluir, e confirmar que o veículo mudou de dono.
   - Comunidade: postar foto, curtir/comentar com outra conta, ligar "perfil público" e confirmar que a outra conta consegue ver os veículos.
4. Push notification de verdade pros lembretes de manutenção (hoje é só um aviso visual dentro do app, não notifica fora dele).
5. Geolocalização de postos (Etapa 3) — decidir e configurar uma API de geocodificação.
6. Decidir um fornecedor de KYC de verdade antes de anunciar a Etapa 5 como "verificação de identidade" pros usuários.
7. Ícones/splash ainda são placeholders de cor sólida.
8. CPF em texto puro no banco (sem criptografia extra) — considerar antes de ter usuários reais em produção.

## 📋 Próximos passos sugeridos (ordem)
1. Terminar de validar a Etapa 1 (você já está nisso).
2. Rodar as migrations 0002-0006 e o bucket `documentos-transferencia`.
3. Testar cada etapa nova, uma de cada vez, na ordem que aparecem acima.
4. Decidir sobre geocodificação (Etapa 3) e fornecedor de KYC (Etapa 5) — são as duas maiores pendências de "serviço externo pago" que faltam pro produto ficar completo de verdade.
5. Deploy da versão web (Netlify) e ícones de verdade antes de qualquer build pra loja.
