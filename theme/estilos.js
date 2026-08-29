// Tokens de design — mesmo sistema visual do Marcato PDV (aplicado à
// stack Expo/React Native deste app): paleta, espaçamento, raio de
// borda, sombra e tipografia únicos, reaproveitados em toda tela.
import { Platform, useColorScheme } from "react-native";

export const CORES_CLARO = {
  fundo: "#F5F4F0",
  texto: "#1F1E1C",
  textoSecundario: "#6B6A66",
  borda: "#DDDBD3",
  card: "rgba(255,255,255,0.86)",
  primaria: "#6C3CE9",
  primariaEscura: "#4B21B8",
  primariaClara: "rgba(108,60,233,0.12)",
  destaque: "#17D9A0",
  erro: "#B3261E",
  erroFundo: "#FBEAEA",
  sucesso: "#27500A",
  sucessoFundo: "#EAF3DE",
  aviso: "#993C1D",
  avisoFundo: "#FAECE7",
  desabilitado: "#C9C7BE",
};

export const CORES_ESCURO = {
  fundo: "#0A0A09",
  texto: "#F3F1EB",
  textoSecundario: "#928D7C",
  borda: "#232219",
  card: "rgba(21,20,16,0.86)",
  primaria: "#8B6BFF",
  primariaEscura: "#6C3CE9",
  primariaClara: "rgba(139,107,255,0.18)",
  destaque: "#17D9A0",
  erro: "#FF7A6B",
  erroFundo: "#301A17",
  sucesso: "#7BD9A0",
  sucessoFundo: "#152417",
  aviso: "#FFB37B",
  avisoFundo: "#301F13",
  desabilitado: "#3E3C33",
};

export const CORES = CORES_CLARO;

export function useCores() {
  const esquema = useColorScheme();
  return esquema === "dark" ? CORES_ESCURO : CORES_CLARO;
}

export const ESPACAMENTO = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28 };

export const RAIO = { sm: 8, md: 10, lg: 12, xl: 14, pill: 999 };

// Sombra discreta padrão de cartão.
export const SOMBRA = {
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 3 },
  shadowOpacity: 0.09,
  shadowRadius: 10,
  elevation: 3,
};

// Sombra mais forte, só pra elemento em destaque (banner, botão flutuante).
export const SOMBRA_ALTA = {
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.16,
  shadowRadius: 20,
  elevation: 8,
};

// Fonte única (Poppins), 4 pesos -- carregada via useFonts em App.js.
export const FONTES = {
  regular: "Poppins_400Regular",
  medium: "Poppins_500Medium",
  semiBold: "Poppins_600SemiBold",
  bold: "Poppins_700Bold",
};

// Na web, evita que formulários e listas fiquem esticados full-bleed
// numa janela larga de navegador.
export function larguraWeb(maxWidth = 640) {
  if (Platform.OS !== "web") return {};
  return { maxWidth, width: "100%", alignSelf: "center" };
}
