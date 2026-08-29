module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    // O preset padrão assume que o Hermes de destino ("hermes-stable")
    // já entende campos/métodos privados de classe (#campo) nativamente
    // e não transpila essa sintaxe -- mas o Hermes embutido no Expo Go
    // instalado não entende, e isso quebra com "private properties are
    // not supported" logo ao carregar o próprio React Native. Forçando
    // esses plugins aqui, a sintaxe #campo vira código compatível com
    // qualquer versão de Hermes, sem depender de estar "sincronizado"
    // com o que o app do Expo Go tem instalado.
    plugins: [
      ["@babel/plugin-transform-class-properties", { loose: true }],
      ["@babel/plugin-transform-private-methods", { loose: true }],
      ["@babel/plugin-transform-private-property-in-object", { loose: true }],
    ],
  };
};
