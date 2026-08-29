import { Alert, Platform } from "react-native";

// No app nativo, Alert.alert funciona normal. No build web, Alert.alert
// com múltiplos botões não faz nada (limitação do react-native-web).
// Esse helper troca pra window.confirm/alert do navegador quando
// Platform.OS === "web", mantendo a mesma assinatura de Alert.alert.
export function confirmar(titulo, mensagem, botoes) {
  if (Platform.OS !== "web") {
    Alert.alert(titulo, mensagem, botoes);
    return;
  }

  if (!botoes || botoes.length <= 1) {
    window.alert(mensagem ? `${titulo}\n\n${mensagem}` : titulo);
    botoes?.[0]?.onPress?.();
    return;
  }

  const botaoConfirmar = botoes.find((b) => b.style !== "cancel") || botoes[botoes.length - 1];
  const botaoCancelar = botoes.find((b) => b.style === "cancel");

  if (window.confirm(mensagem ? `${titulo}\n\n${mensagem}` : titulo)) {
    botaoConfirmar.onPress?.();
  } else {
    botaoCancelar?.onPress?.();
  }
}
