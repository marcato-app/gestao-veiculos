module.exports = function (api) {
  api.cache(true);
  return {
    // "unstable_transformProfile" força o preset a NÃO assumir que o
    // Hermes de destino entende campos/métodos privados de classe
    // (#campo) nativamente -- o padrão ("hermes-stable") detecta isso
    // pela versão do Hermes que o Metro acha que o cliente tem, e o
    // Expo Go instalado está com uma versão que na prática não suporta,
    // causando "private properties are not supported" ao carregar o
    // próprio React Native. Com "default" o preset SEMPRE transpila
    // essa sintaxe pra algo mais antigo/compatível, plugins extras não
    // resolvem isso porque a decisão de pular a transpilação é interna
    // ao preset, não uma questão de plugin ausente.
    presets: [["babel-preset-expo", { unstable_transformProfile: "default" }]],
  };
};
