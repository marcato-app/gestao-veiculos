import React, { useCallback, useEffect, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../theme/AuthContext";
import { supabase } from "../lib/supabaseClient";
import { useCores, ESPACAMENTO, RAIO, larguraWeb, FONTES } from "../theme/estilos";
import { confirmar } from "../lib/confirmar";
import { aplicarMascaraCpf, aplicarMascaraTelefone } from "../lib/data";

export default function PerfilScreen() {
  const cores = useCores();
  const { user, signOut } = useAuth();
  const [perfil, setPerfil] = useState(null);
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);

  const buscar = useCallback(async () => {
    if (!user) return;
    setCarregando(true);
    const { data } = await supabase.from("perfis").select("*").eq("id", user.id).maybeSingle();
    if (data) {
      setPerfil(data);
      setNome(data.nome || "");
      setTelefone(aplicarMascaraTelefone(data.telefone || ""));
    }
    setCarregando(false);
  }, [user]);

  useEffect(() => {
    buscar();
  }, [buscar]);

  async function salvar() {
    if (!nome.trim()) {
      confirmar("Preencha o nome", "O nome não pode ficar em branco.");
      return;
    }
    setSalvando(true);
    try {
      const { error } = await supabase
        .from("perfis")
        .update({ nome: nome.trim(), telefone: telefone.trim() || null })
        .eq("id", user.id);
      if (error) throw error;
      confirmar("Salvo!", "Seus dados foram atualizados.");
      buscar();
    } catch (e) {
      confirmar("Não deu pra salvar", e.message || String(e));
    } finally {
      setSalvando(false);
    }
  }

  const estilos = criarEstilos(cores);

  if (carregando) {
    return (
      <SafeAreaView style={estilos.tela}>
        <ActivityIndicator color={cores.primaria} style={{ marginTop: ESPACAMENTO.xxl }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={estilos.tela} edges={["top", "bottom"]}>
      <ScrollView contentContainerStyle={estilos.conteudo}>
        <View style={[estilos.cartao, larguraWeb(480)]}>
          <Text style={estilos.titulo}>Seus dados</Text>

          <Text style={estilos.rotulo}>E-mail</Text>
          <Text style={estilos.valorFixo}>{user?.email}</Text>

          <Text style={estilos.rotulo}>Nome</Text>
          <TextInput style={estilos.campo} value={nome} onChangeText={setNome} placeholderTextColor={cores.textoSecundario} />

          <Text style={estilos.rotulo}>Telefone</Text>
          <TextInput
            style={estilos.campo}
            keyboardType="number-pad"
            maxLength={15}
            value={telefone}
            onChangeText={(t) => setTelefone(aplicarMascaraTelefone(t))}
            placeholderTextColor={cores.textoSecundario}
          />

          <Text style={estilos.rotulo}>CPF</Text>
          <Text style={estilos.valorFixo}>{aplicarMascaraCpf(perfil?.cpf || "")}</Text>
          <Text style={estilos.notaCpf}>O CPF não pode ser alterado por aqui (é usado pra verificação de identidade na transferência de veículo).</Text>

          <TouchableOpacity style={estilos.botao} onPress={salvar} disabled={salvando}>
            {salvando ? <ActivityIndicator color="#FFF" /> : <Text style={estilos.botaoTexto}>Salvar</Text>}
          </TouchableOpacity>

          <TouchableOpacity onPress={signOut} style={{ marginTop: ESPACAMENTO.lg }}>
            <Text style={estilos.link}>Sair</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function criarEstilos(cores) {
  return StyleSheet.create({
    tela: { flex: 1, backgroundColor: cores.fundo },
    conteudo: { flexGrow: 1, alignItems: "center", padding: ESPACAMENTO.xl },
    cartao: {
      width: "100%",
      backgroundColor: cores.card,
      borderRadius: RAIO.xl,
      borderWidth: 1,
      borderColor: cores.borda,
      padding: ESPACAMENTO.xxl,
    },
    titulo: { fontSize: 22, color: cores.texto, textAlign: "center", marginBottom: ESPACAMENTO.lg, fontFamily: FONTES.bold },
    rotulo: { fontSize: 13, color: cores.texto, marginBottom: ESPACAMENTO.xs, fontFamily: FONTES.medium },
    valorFixo: {
      fontSize: 15,
      color: cores.textoSecundario,
      marginBottom: ESPACAMENTO.md,
      fontFamily: FONTES.regular,
    },
    notaCpf: { fontSize: 11.5, color: cores.textoSecundario, marginBottom: ESPACAMENTO.lg, fontFamily: FONTES.regular },
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
  });
}
