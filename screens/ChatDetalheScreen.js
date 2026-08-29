import React, { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../lib/supabaseClient";
import { useCores, ESPACAMENTO, RAIO, larguraWeb, FONTES } from "../theme/estilos";

export default function ChatDetalheScreen({ conversa, user, onVoltar }) {
  const cores = useCores();
  const [mensagens, setMensagens] = useState([]);
  const [texto, setTexto] = useState("");
  const scrollRef = useRef(null);
  const intervaloRef = useRef(null);

  const buscar = useCallback(async () => {
    const { data } = await supabase
      .from("mensagens")
      .select("*")
      .eq("conversa_id", conversa.id)
      .order("criado_em", { ascending: true });
    setMensagens(data || []);
  }, [conversa.id]);

  useEffect(() => {
    buscar();
    intervaloRef.current = setInterval(buscar, 4000);
    return () => clearInterval(intervaloRef.current);
  }, [buscar]);

  async function enviar() {
    if (!texto.trim()) return;
    const textoEnviado = texto.trim();
    setTexto("");
    const { error } = await supabase
      .from("mensagens")
      .insert({ conversa_id: conversa.id, remetente_id: user.id, texto: textoEnviado });
    if (!error) buscar();
  }

  const estilos = criarEstilos(cores);
  const outroNome = conversa.vendedor_id === user.id ? conversa.comprador_nome : conversa.vendedor_nome;

  return (
    <SafeAreaView style={estilos.tela} edges={["top", "bottom"]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={[estilos.cabecalho, larguraWeb(680)]}>
          <TouchableOpacity onPress={onVoltar}>
            <Text style={estilos.link}>← Voltar</Text>
          </TouchableOpacity>
          <Text style={estilos.titulo}>{outroNome || "Conversa"}</Text>
        </View>
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={estilos.conteudo}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        >
          <View style={larguraWeb(680)}>
            {mensagens.map((m) => {
              const minha = m.remetente_id === user.id;
              return (
                <View key={m.id} style={[estilos.bolha, minha ? estilos.bolhaMinha : estilos.bolhaOutro]}>
                  <Text style={minha ? estilos.textoBolhaMinha : estilos.textoBolhaOutro}>{m.texto}</Text>
                </View>
              );
            })}
          </View>
        </ScrollView>
        <View style={[estilos.linhaEnviar, larguraWeb(680)]}>
          <TextInput
            style={estilos.campo}
            placeholder="Escreva uma mensagem..."
            placeholderTextColor={cores.textoSecundario}
            value={texto}
            onChangeText={setTexto}
            onSubmitEditing={enviar}
          />
          <TouchableOpacity style={estilos.botaoEnviar} onPress={enviar}>
            <Text style={estilos.botaoEnviarTexto}>Enviar</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function criarEstilos(cores) {
  return StyleSheet.create({
    tela: { flex: 1, backgroundColor: cores.fundo },
    cabecalho: { flexDirection: "row", alignItems: "center", gap: ESPACAMENTO.md, padding: ESPACAMENTO.lg, alignSelf: "center", width: "100%" },
    link: { color: cores.primaria, fontSize: 13, fontFamily: FONTES.semiBold },
    titulo: { fontSize: 15, color: cores.texto, fontFamily: FONTES.bold },
    conteudo: { alignItems: "center", padding: ESPACAMENTO.lg, paddingTop: 0 },
    bolha: { maxWidth: "78%", borderRadius: RAIO.lg, padding: ESPACAMENTO.md, marginBottom: ESPACAMENTO.sm },
    bolhaMinha: { backgroundColor: cores.primaria, alignSelf: "flex-end" },
    bolhaOutro: { backgroundColor: cores.card, borderWidth: 1, borderColor: cores.borda, alignSelf: "flex-start" },
    textoBolhaMinha: { color: "#FFF", fontSize: 13.5, fontFamily: FONTES.regular },
    textoBolhaOutro: { color: cores.texto, fontSize: 13.5, fontFamily: FONTES.regular },
    linhaEnviar: { flexDirection: "row", gap: ESPACAMENTO.sm, padding: ESPACAMENTO.lg, alignSelf: "center", width: "100%" },
    campo: {
      flex: 1, borderWidth: 1, borderColor: cores.borda, backgroundColor: cores.card, borderRadius: RAIO.pill,
      paddingHorizontal: ESPACAMENTO.lg, paddingVertical: ESPACAMENTO.sm, fontSize: 14, color: cores.texto, fontFamily: FONTES.regular,
    },
    botaoEnviar: { backgroundColor: cores.primaria, borderRadius: RAIO.pill, paddingHorizontal: ESPACAMENTO.lg, justifyContent: "center" },
    botaoEnviarTexto: { color: "#FFF", fontSize: 13, fontFamily: FONTES.semiBold },
  });
}
