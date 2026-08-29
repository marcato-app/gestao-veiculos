const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Corrige "SyntaxError: private properties are not supported" no Expo
// Go/build nativo -- o @supabase/supabase-js importa opcionalmente o
// pacote "ws" (WebSocket pra Node, usado só fora do React Native) pra
// suportar Realtime; esse pacote tem sintaxe de classe que o Metro não
// transpila (empacota o node_modules "como está"), e o Hermes não
// entende. Desligar a resolução via "exports" faz o Metro cair pro
// campo "main"/"browser" do package.json, que aponta pra uma versão
// sem essa sintaxe. Não afeta nada do app -- não usamos Realtime.
config.resolver.unstable_enablePackageExports = false;

module.exports = config;
