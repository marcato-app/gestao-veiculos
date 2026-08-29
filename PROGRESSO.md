# Progresso do Gestão de Veículos

> Este arquivo é mantido pela Claude. Toda vez que terminarmos uma etapa importante, ele é atualizado. Quando você disser "podemos continuar de onde paramos" numa sessão nova, este arquivo deve ser lido primeiro.

Última atualização: 2026-08-29 (Etapa 1 construída — código pronto, nada rodado em produção ainda)

## Contexto do produto

App completo de gestão de veículos (carro + moto): documentação, manutenção, abastecimento, mural de venda, transferência com verificação de identidade (LGPD), comunidade. Plano completo em `PLANO.md`.

**Decisão importante desta sessão**: o plano original pedia PWA + Cloudflare Workers (mesmo esquema do Marcato PDV, que é um painel de admin pra navegador). O usuário corrigiu isso no meio da conversa — queria "um app mesmo" pra iPhone e Android, não um site instalável. Mudamos pra **Expo/React Native** (mesma stack do Marcato e da Lista de Casamento), que dá um app de verdade, testável via Expo Go e buildável pra loja depois via EAS. A identidade visual (paleta, Poppins, barra de abas com círculo animado) continua vindo do Marcato PDV — só a tecnologia de hospedagem/distribuição mudou.

## ✅ Construído nesta sessão — Etapa 1 (código pronto, não testado ao vivo ainda)

- **Estrutura do projeto**: Expo (React Native + Web), mesma convenção do Marcato/Lista de Casamento (`App.js` na raiz, `screens/`, `lib/`, `theme/`, `components/`, `supabase/migrations`).
- **Sistema visual novo** (`theme/estilos.js`): paleta roxo `#6C3CE9`/verde `#17D9A0` (claro e escuro, valores exatos que o usuário passou), espaçamento 4/8/12/16/20/28, raio 8/10/12/14/pill, sombra padrão e sombra alta, fonte única Poppins (`@expo-google-fonts/poppins`, 4 pesos). Cartões usam `card` translúcido (`rgba`) em vez de cor sólida, como no Marcato PDV.
- **Barra de abas animada** (`components/BarraInferior.js`): reimplementação genérica (recebe abas por prop) do componente que o usuário mandou como referência — círculo colorido que desliza (`translateX`) até a aba tocada, com efeito de aperta-e-volta (`scale`) no toque, usando `Animated` da própria React Native (sem `reanimated`, que o projeto não tem instalado).
- **Schema do banco** (`supabase/migrations/0001_init.sql`): tabelas `perfis` (nome/telefone/cpf, 1 por usuário), `veiculos` (placa/marca/modelo/ano/cor/km/tipo carro-ou-moto), `fotos_veiculo` (frente/verso/lateral/interior), `documentos_veiculo` (CRLV). RLS por dono em tudo. **Trigger automático**: `lidar_novo_usuario()` cria a linha em `perfis` sozinha assim que a conta é criada no Supabase Auth, lendo nome/telefone/cpf que o app manda em `options.data` no `signUp` (`security definer`, porque nesse momento ainda não existe sessão autenticada) — evita ter que gravar o perfil na mão depois de um jeito que dependeria de já ter sessão ativa.
- **CPF com validação de verdade**: `lib/data.js` (`validarCpf`) confere o dígito verificador, não só o formato — evita CPF inventado no cadastro. Também tem máscaras de CPF, telefone e placa.
- **Cadastro/login** (`screens/AuthScreen.js`): cadastro pede nome, e-mail, telefone (opcional), CPF e senha; login só e-mail/senha. Recuperação de senha (mesmo padrão dos outros dois projetos: `theme/AuthContext.js` com `resetPassword`/`atualizarSenha`/`recuperandoSenha`, tratamento de link via `expo-linking`, tela `ResetPasswordScreen.js`).
- **Dashboard de veículos** (`screens/VeiculosScreen.js`): KPIs (quantidade de veículos, km total), lista em cards (foto de capa se tiver, placa/ano/cor, km), botão remover (com confirmação), botão "+ Adicionar".
- **Cadastro/edição de veículo** (`screens/VeiculoFormScreen.js`): tipo (carro/moto, toggle), placa (com máscara), marca, modelo, ano, cor, km atual. Depois de salvar os dados básicos (precisa existir um `id` de veículo pra poder anexar arquivo), libera upload de até 4 fotos (frente/verso/lateral/interior, um slot quadrado cada) e 1 foto do CRLV — tudo pro bucket `veiculos` no Storage, caminho prefixado com `{auth.uid()}/{veiculo.id}/...`.
- **Perfil** (`screens/PerfilScreen.js`): editar nome/telefone, CPF mostrado mas **não editável** por aqui (é a âncora de identidade que a Etapa 5 vai usar), sair.
- Build web validado (`npx expo export -p web`, sem erros) antes de qualquer coisa ser commitada.

## 🚧 Pendências antes de usar de verdade

1. **Criar um projeto Supabase novo** (separado do Marcato e da Lista de Casamento) — mesma conta/login, projeto diferente.
2. **Rodar a migration** `0001_init.sql` no SQL Editor.
3. **Criar o bucket público `veiculos`** no Storage (sem isso, upload de foto/CRLV não funciona — nem a exibição das fotos já enviadas, já que o `<Image>` do app busca a URL sem token de autenticação, então o bucket precisa estar marcado como público pra imagem carregar).
4. **Preencher o `.env`** local (`EXPO_PUBLIC_SUPABASE_URL`/`EXPO_PUBLIC_SUPABASE_ANON_KEY`).
5. **`npm install` e testar de ponta a ponta**: cadastro (conferir que a linha em `perfis` é criada sozinha pelo trigger) → login → cadastrar um veículo → enviar as 4 fotos + CRLV → editar dados → remover um veículo → editar perfil (nome/telefone) → recuperar senha.
6. Nunca testado num aparelho de verdade (só build web local) — falta abrir no Expo Go.
7. Ícones/splash são placeholders de cor sólida (roxo `#6C3CE9`) — trocar por arte de verdade antes de qualquer build pra loja.
8. CPF armazenado em texto puro em `perfis.cpf` — sem criptografia específica. O plano original já previa deixar a parte de LGPD/criptografia pra Etapa 5 (transferência), então isso não é um bug desta etapa, mas fica registrado como pendência de segurança antes de ir pra produção de verdade com usuários reais.

## 📋 Próximos passos sugeridos (ordem)
1. Rodar as pendências 1–5 acima (todas manuais, fora do código).
2. Testar o fluxo ponta a ponta (`npx expo start`, Expo Go num celular de verdade).
3. Decidir domínio/deploy da versão web (Netlify, como os outros dois projetos) — `netlify.toml` já está no repo.
4. Trocar os ícones placeholder por arte de verdade.
5. Começar a Etapa 2 (Manutenção): histórico de peças trocadas, revisão, troca de óleo, lembretes.
