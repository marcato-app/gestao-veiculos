import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../theme/AuthContext";
import { useCores, ESPACAMENTO, RAIO, larguraWeb, FONTES } from "../theme/estilos";
import { confirmar } from "../lib/confirmar";
import { aplicarMascaraCpf, aplicarMascaraTelefone, validarCpf } from "../lib/data";

export default function AuthScreen() {
  const cores = useCores();
  const { signIn, signUp, resetPassword } = useAuth();
  const [modo, setModo] = useState("login"); // login | cadastro | recuperar
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [cpf, setCpf] = useState("");
  const [senha, setSenha] = useState("");
  const [carregando, setCarregando] = useState(false);

  async function enviar() {
    if (modo === "recuperar") {
      if (!email.trim()) {
        confirmar("Preencha o e-mail", "Informe o e-mail da sua conta pra receber o link.");
        return;
      }
      setCarregando(true);
      try {
        await resetPassword(email.trim());
        confirmar("Link enviado", "Confira seu e-mail (inclusive spam) pra redefinir a senha.");
        setModo("login");
      } catch (e) {
        confirmar("Não deu certo", e.message || "Tente de novo em instantes.");
      } finally {
        setCarregando(false);
      }
      return;
    }

    if (modo === "cadastro") {
      if (!nome.trim() || !email.trim() || !senha.trim() || !cpf.trim()) {
        confirmar("Preencha tudo", "Nome, e-mail, CPF e senha são obrigatórios.");
        return;
      }
      if (!validarCpf(cpf)) {
        confirmar("CPF inválido", "Confira o número digitado.");
        return;
      }
      setCarregando(true);
      try {
        await signUp(email.trim(), senha, {
          nome: nome.trim(),
          telefone: telefone.trim() || null,
          cpf: cpf.replace(/\D/g, ""),
        });
        confirmar("Conta criada", "Agora é só entrar com o e-mail e senha que você cadastrou.");
        setModo("login");
      } catch (e) {
        const msg = String(e.message || e).includes("duplicate") || String(e.message || e).includes("perfis_cpf_key")
          ? "Esse CPF já está cadastrado em outra conta."
          : e.message || "Tente de novo em instantes.";
        confirmar("Não deu certo", msg);
      } finally {
        setCarregando(false);
      }
      return;
    }

    if (!email.trim() || !senha.trim()) {
      confirmar("Preencha tudo", "Informe e-mail e senha pra continuar.");
      return;
    }
    setCarregando(true);
    try {
      await signIn(email.trim(), senha);
    } catch (e) {
      confirmar("Não deu certo", e.message || "Tente de novo em instantes.");
    } finally {
      setCarregando(false);
    }
  }

  const estilos = criarEstilos(cores);

  return (
    <SafeAreaView style={estilos.tela} edges={["top", "bottom"]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={estilos.conteudo} keyboardShouldPersistTaps="handled">
          <View style={[estilos.cartao, larguraWeb(420)]}>
            <Text style={estilos.titulo}>🚗 Gestão de Veículos</Text>
            <Text style={estilos.subtitulo}>
              {modo === "recuperar"
                ? "Informe seu e-mail pra receber o link de redefinição de senha."
                : modo === "cadastro"
                ? "Crie sua conta pra cadastrar seus veículos."
                : "Entre pra ver seus veículos."}
            </Text>

            {modo === "cadastro" && (
              <TextInput
                style={estilos.campo}
                placeholder="Nome completo"
                placeholderTextColor={cores.textoSecundario}
                value={nome}
                onChangeText={setNome}
              />
            )}

            <TextInput
              style={estilos.campo}
              placeholder="E-mail"
              placeholderTextColor={cores.textoSecundario}
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />

            {modo === "cadastro" && (
              <>
                <TextInput
                  style={estilos.campo}
                  placeholder="Telefone (opcional)"
                  placeholderTextColor={cores.textoSecundario}
                  keyboardType="number-pad"
                  maxLength={15}
                  value={telefone}
                  onChangeText={(t) => setTelefone(aplicarMascaraTelefone(t))}
                />
                <TextInput
                  style={estilos.campo}
                  placeholder="CPF"
                  placeholderTextColor={cores.textoSecundario}
                  keyboardType="number-pad"
                  maxLength={14}
                  value={cpf}
                  onChangeText={(t) => setCpf(aplicarMascaraCpf(t))}
                />
              </>
            )}

            {modo !== "recuperar" && (
              <TextInput
                style={estilos.campo}
                placeholder="Senha"
                placeholderTextColor={cores.textoSecundario}
                secureTextEntry
                value={senha}
                onChangeText={setSenha}
              />
            )}

            <TouchableOpacity style={estilos.botao} onPress={enviar} disabled={carregando}>
              {carregando ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={estilos.botaoTexto}>
                  {modo === "recuperar" ? "Enviar link" : modo === "cadastro" ? "Criar conta" : "Entrar"}
                </Text>
              )}
            </TouchableOpacity>

            {modo === "recuperar" ? (
              <TouchableOpacity onPress={() => setModo("login")} style={{ marginTop: ESPACAMENTO.lg }}>
                <Text style={estilos.link}>Voltar pro login</Text>
              </TouchableOpacity>
            ) : (
              <>
                <TouchableOpacity
                  onPress={() => setModo(modo === "cadastro" ? "login" : "cadastro")}
                  style={{ marginTop: ESPACAMENTO.lg }}
                >
                  <Text style={estilos.link}>
                    {modo === "cadastro" ? "Já tenho conta — entrar" : "Ainda não tenho conta — criar"}
                  </Text>
                </TouchableOpacity>
                {modo === "login" && (
                  <TouchableOpacity onPress={() => setModo("recuperar")} style={{ marginTop: ESPACAMENTO.sm }}>
                    <Text style={estilos.linkSecundario}>Esqueci minha senha</Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
    link: { color: cores.primaria, textAlign: "center", fontSize: 14, fontFamily: FONTES.semiBold },
    linkSecundario: { color: cores.textoSecundario, textAlign: "center", fontSize: 13, fontFamily: FONTES.regular },
  });
}
