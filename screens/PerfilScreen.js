import React, { useCallback, useEffect, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../theme/AuthContext";
import { supabase } from "../lib/supabaseClient";
import { useCores, ESPACAMENTO, RAIO, larguraWeb, FONTES } from "../theme/estilos";
import { confirmar } from "../lib/confirmar";
import { aplicarMascaraCpf, aplicarMascaraTelefone } from "../lib/data";

export default function PerfilScreen({ onAbrirTransferencias, onAbrirComunidade }) {
  const cores = useCores();
  const { user, signOut } = useAuth();
  const [perfil, setPerfil] = useState(null);
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [perfilPublico, setPerfilPublico] = useState(false);
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
      setPerfilPublico(!!data.perfil_publico);
    }
    setCarregando(false);
  }, [user]);

  async function alternarPerfilPublico() {
    const novoValor = !perfilPublico;
    setPerfilPublico(novoValor);
    const { error } = await supabase.from("perfis").update({ perfil_publico: novoValor }).eq("id", user.id);
    if (error) {
      setPerfilPublico(!novoValor);
      confirmar("Não deu pra atualizar", error.message);
    }
  }

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

          <TouchableOpacity style={estilos.linhaToggle} onPress={alternarPerfilPublico}>
            <View style={{ flex: 1 }}>
              <Text style={estilos.rotulo}>Perfil público</Text>
              <Text style={estilos.notaCpf}>Deixa qualquer pessoa da comunidade ver seus veículos cadastrados.</Text>
            </View>
            <View style={[estilos.toggle, perfilPublico && estilos.toggleAtivo]}>
              <View style={[estilos.toggleBolinha, perfilPublico && estilos.toggleBolinhaAtiva]} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={estilos.botao} onPress={salvar} disabled={salvando}>
            {salvando ? <ActivityIndicator color="#FFF" /> : <Text style={estilos.botaoTexto}>Salvar</Text>}
          </TouchableOpacity>

          <TouchableOpacity style={estilos.linhaMenu} onPress={onAbrirTransferencias}>
            <Text style={estilos.linhaMenuTexto}>🔄 Transferências de veículo</Text>
            <Text style={estilos.linhaMenuSeta}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity style={estilos.linhaMenu} onPress={onAbrirComunidade}>
            <Text style={estilos.linhaMenuTexto}>💬 Comunidade</Text>
            <Text style={estilos.linhaMenuSeta}>›</Text>
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
    linhaToggle: { flexDirection: "row", alignItems: "center", gap: ESPACAMENTO.md, marginBottom: ESPACAMENTO.lg },
    toggle: { width: 44, height: 26, borderRadius: 13, backgroundColor: cores.borda, padding: 2, justifyContent: "center" },
    toggleAtivo: { backgroundColor: cores.primaria },
    toggleBolinha: { width: 22, height: 22, borderRadius: 11, backgroundColor: "#FFF" },
    toggleBolinhaAtiva: { alignSelf: "flex-end" },
    linhaMenu: {
      flexDirection: "row", alignItems: "center", justifyContent: "space-between",
      paddingVertical: ESPACAMENTO.md, borderTopWidth: 1, borderTopColor: cores.borda, marginTop: ESPACAMENTO.md,
    },
    linhaMenuTexto: { fontSize: 14, color: cores.texto, fontFamily: FONTES.medium },
    linhaMenuSeta: { fontSize: 18, color: cores.textoSecundario },
  });
}
