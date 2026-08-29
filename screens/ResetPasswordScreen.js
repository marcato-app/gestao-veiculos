import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../theme/AuthContext";
import { useCores, ESPACAMENTO, RAIO, larguraWeb, FONTES } from "../theme/estilos";
import { confirmar } from "../lib/confirmar";

export default function ResetPasswordScreen() {
  const cores = useCores();
  const { atualizarSenha, cancelarRecuperacaoSenha } = useAuth();
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [salvando, setSalvando] = useState(false);

  async function salvar() {
    if (!novaSenha || novaSenha.length < 6) {
      confirmar("Senha muito curta", "Use pelo menos 6 caracteres.");
      return;
    }
    if (novaSenha !== confirmacao) {
      confirmar("As senhas não batem", "Digite a mesma senha nos dois campos.");
      return;
    }
    setSalvando(true);
    try {
      await atualizarSenha(novaSenha);
      confirmar("Pronto!", "Sua senha foi alterada.");
    } catch (e) {
      confirmar("Não deu pra trocar a senha", e.message || "Tente de novo em instantes.");
    } finally {
      setSalvando(false);
    }
  }

  const estilos = criarEstilos(cores);

  return (
    <SafeAreaView style={estilos.tela} edges={["top", "bottom"]}>
      <ScrollView contentContainerStyle={estilos.conteudo}>
        <View style={[estilos.cartao, larguraWeb(420)]}>
          <Text style={estilos.titulo}>Nova senha</Text>
          <Text style={estilos.subtitulo}>Escolha uma nova senha pra sua conta.</Text>

          <TextInput
            style={estilos.campo}
            placeholder="Nova senha"
            placeholderTextColor={cores.textoSecundario}
            secureTextEntry
            value={novaSenha}
            onChangeText={setNovaSenha}
          />
          <TextInput
            style={estilos.campo}
            placeholder="Confirme a nova senha"
            placeholderTextColor={cores.textoSecundario}
            secureTextEntry
            value={confirmacao}
            onChangeText={setConfirmacao}
          />

          <TouchableOpacity style={estilos.botao} onPress={salvar} disabled={salvando}>
            {salvando ? <ActivityIndicator color="#FFF" /> : <Text style={estilos.botaoTexto}>Salvar nova senha</Text>}
          </TouchableOpacity>

          <TouchableOpacity onPress={cancelarRecuperacaoSenha} style={{ marginTop: ESPACAMENTO.lg }}>
            <Text style={estilos.link}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function criarEstilos(cores) {
  return StyleSheet.create({
    tela: { flex: 1, backgroundColor: cores.fundo },
    conteudo: { flexGrow: 1, alignItems: "center", justifyContent: "center", padding: ESPACAMENTO.xl },
    cartao: {
      width: "100%",
      backgroundColor: cores.card,
      borderRadius: RAIO.xl,
      borderWidth: 1,
      borderColor: cores.borda,
      padding: ESPACAMENTO.xxl,
    },
    titulo: { fontSize: 22, color: cores.texto, textAlign: "center", fontFamily: FONTES.bold },
    subtitulo: {
      fontSize: 13,
      color: cores.textoSecundario,
      textAlign: "center",
      marginTop: ESPACAMENTO.sm,
      marginBottom: ESPACAMENTO.xl,
      fontFamily: FONTES.regular,
    },
    campo: {
      borderWidth: 1,
      borderColor: cores.borda,
      backgroundColor: cores.fundo,
      borderRadius: RAIO.md,
      paddingHorizontal: ESPACAMENTO.lg,
      paddingVertical: ESPACAMENTO.md,
      fontSize: 15,
      color: cores.texto,
      marginBottom: ESPACAMENTO.md,
      fontFamily: FONTES.regular,
    },
    botao: {
      backgroundColor: cores.primaria,
      borderRadius: RAIO.pill,
      paddingVertical: ESPACAMENTO.md,
      alignItems: "center",
      marginTop: ESPACAMENTO.sm,
    },
    botaoTexto: { color: "#FFF", fontSize: 16, fontFamily: FONTES.semiBold },
    link: { color: cores.textoSecundario, textAlign: "center", fontSize: 13, fontFamily: FONTES.regular },
  });
}
