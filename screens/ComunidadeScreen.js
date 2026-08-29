import React, { useCallback, useEffect, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { useAuth } from "../theme/AuthContext";
import { supabase } from "../lib/supabaseClient";
import { useCores, ESPACAMENTO, RAIO, SOMBRA, larguraWeb, FONTES } from "../theme/estilos";
import { confirmar } from "../lib/confirmar";

function tempoRelativo(criadoEm) {
  const diffMs = Date.now() - new Date(criadoEm).getTime();
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `${min}min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export default function ComunidadeScreen() {
  const cores = useCores();
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [minhasCurtidas, setMinhasCurtidas] = useState(new Set());
  const [carregando, setCarregando] = useState(true);
  const [modalPostarAberto, setModalPostarAberto] = useState(false);
  const [comentariosAbertos, setComentariosAbertos] = useState(null);

  const buscar = useCallback(async () => {
    setCarregando(true);
    const [{ data: dadosPosts }, { data: dadosCurtidas }] = await Promise.all([
      supabase.from("comunidade_feed").select("*"),
      supabase.from("curtidas").select("post_id").eq("usuario_id", user.id),
    ]);
    setPosts(dadosPosts || []);
    setMinhasCurtidas(new Set((dadosCurtidas || []).map((c) => c.post_id)));
    setCarregando(false);
  }, [user]);

  useEffect(() => {
    buscar();
  }, [buscar]);

  async function alternarCurtida(post) {
    const curtiu = minhasCurtidas.has(post.id);
    if (curtiu) {
      await supabase.from("curtidas").delete().eq("post_id", post.id).eq("usuario_id", user.id);
    } else {
      await supabase.from("curtidas").insert({ post_id: post.id, usuario_id: user.id });
    }
    buscar();
  }

  const estilos = criarEstilos(cores);

  return (
    <SafeAreaView style={estilos.tela} edges={["top", "bottom"]}>
      <ScrollView contentContainerStyle={estilos.conteudo}>
        <View style={larguraWeb(560)}>
          <View style={estilos.cabecalho}>
            <Text style={estilos.titulo}>Comunidade</Text>
            <TouchableOpacity style={estilos.botaoAdd} onPress={() => setModalPostarAberto(true)}>
              <Text style={estilos.botaoAddTexto}>+ Postar</Text>
            </TouchableOpacity>
          </View>

          {carregando ? (
            <ActivityIndicator color={cores.primaria} style={{ marginTop: ESPACAMENTO.xl }} />
          ) : posts.length === 0 ? (
            <Text style={estilos.vazio}>Nenhum post ainda. Seja o primeiro a compartilhar!</Text>
          ) : (
            posts.map((p) => (
              <View key={p.id} style={estilos.cartaoPost}>
                <View style={estilos.cabecalhoPost}>
                  <Text style={estilos.nomeUsuario}>{p.usuario_nome}</Text>
                  <Text style={estilos.tempo}>{tempoRelativo(p.criado_em)}</Text>
                </View>
                <Image source={{ uri: p.foto_url }} style={estilos.fotoPost} />
                <View style={estilos.linhaAcoesPost}>
                  <TouchableOpacity style={estilos.acaoPost} onPress={() => alternarCurtida(p)}>
                    <Text style={estilos.iconeAcao}>{minhasCurtidas.has(p.id) ? "❤️" : "🤍"}</Text>
                    <Text style={estilos.textoAcao}>{p.total_curtidas}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={estilos.acaoPost} onPress={() => setComentariosAbertos(p)}>
                    <Text style={estilos.iconeAcao}>💬</Text>
                    <Text style={estilos.textoAcao}>{p.total_comentarios}</Text>
                  </TouchableOpacity>
                </View>
                {p.legenda ? (
                  <Text style={estilos.legenda}>
                    <Text style={estilos.nomeUsuario}>{p.usuario_nome} </Text>
                    {p.legenda}
                  </Text>
                ) : null}
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {modalPostarAberto && (
        <ModalPostar
          cores={cores}
          user={user}
          onFechar={() => setModalPostarAberto(false)}
          onPostado={() => {
            setModalPostarAberto(false);
            buscar();
          }}
        />
      )}

      {comentariosAbertos && (
        <ModalComentarios
          cores={cores}
          user={user}
          post={comentariosAbertos}
          onFechar={() => {
            setComentariosAbertos(null);
            buscar();
          }}
        />
      )}
    </SafeAreaView>
  );
}

function ModalPostar({ cores, user, onFechar, onPostado }) {
  const [foto, setFoto] = useState(null);
  const [legenda, setLegenda] = useState("");
  const [enviando, setEnviando] = useState(false);
  const estilos = criarEstilos(cores);

  async function escolherFoto() {
    const permissao = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissao.granted) {
      confirmar("Precisamos da permissão", "Autorize o acesso às fotos.");
      return;
    }
    const resultado = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.7 });
    if (resultado.canceled) return;
    setFoto(resultado.assets[0]);
  }

  async function publicar() {
    if (!foto) {
      confirmar("Escolha uma foto", "Selecione uma foto pra postar.");
      return;
    }
    setEnviando(true);
    try {
      const resposta = await fetch(foto.uri);
      const bytes = await resposta.arrayBuffer();
      const caminho = `comunidade/${user.id}/${Date.now()}.jpg`;
      const { error: erroUpload } = await supabase.storage.from("veiculos").upload(caminho, bytes, { contentType: "image/jpeg" });
      if (erroUpload) throw erroUpload;
      const { data } = supabase.storage.from("veiculos").getPublicUrl(caminho);
      const { error } = await supabase.from("posts_comunidade").insert({
        usuario_id: user.id,
        foto_url: data.publicUrl,
        legenda: legenda.trim() || null,
      });
      if (error) throw error;
      onPostado();
    } catch (e) {
      confirmar("Não deu pra postar", e.message || String(e));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <View style={estilos.overlay}>
      <View style={[estilos.modal, larguraWeb(400)]}>
        <Text style={estilos.tituloModal}>Nova publicação</Text>
        <TouchableOpacity style={estilos.slotFoto} onPress={escolherFoto}>
          {foto ? <Image source={{ uri: foto.uri }} style={estilos.imagemSlot} /> : <Text style={estilos.slotTexto}>Toque pra escolher uma foto</Text>}
        </TouchableOpacity>
        <TextInput style={estilos.campo} placeholder="Legenda (opcional)" placeholderTextColor={cores.textoSecundario} value={legenda} onChangeText={setLegenda} />
        <View style={estilos.linhaBotoesModal}>
          <TouchableOpacity style={estilos.botaoCancelar} onPress={onFechar}>
            <Text style={estilos.botaoCancelarTexto}>Cancelar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={estilos.botaoSalvar} onPress={publicar} disabled={enviando}>
            {enviando ? <ActivityIndicator color="#FFF" /> : <Text style={estilos.botaoSalvarTexto}>Publicar</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

function ModalComentarios({ cores, user, post, onFechar }) {
  const [comentarios, setComentarios] = useState([]);
  const [texto, setTexto] = useState("");
  const [carregando, setCarregando] = useState(true);
  const estilos = criarEstilos(cores);

  const buscar = useCallback(async () => {
    const { data } = await supabase
      .from("comentarios")
      .select("*, perfis(nome)")
      .eq("post_id", post.id)
      .order("criado_em", { ascending: true });
    setComentarios(data || []);
    setCarregando(false);
  }, [post.id]);

  useEffect(() => {
    buscar();
  }, [buscar]);

  async function enviar() {
    if (!texto.trim()) return;
    const t = texto.trim();
    setTexto("");
    const { error } = await supabase.from("comentarios").insert({ post_id: post.id, usuario_id: user.id, texto: t });
    if (!error) buscar();
  }

  return (
    <View style={estilos.overlay}>
      <View style={[estilos.modal, larguraWeb(420), { maxHeight: "80%" }]}>
        <Text style={estilos.tituloModal}>Comentários</Text>
        <ScrollView style={{ maxHeight: 280, marginBottom: ESPACAMENTO.md }}>
          {carregando ? (
            <ActivityIndicator color={cores.primaria} />
          ) : comentarios.length === 0 ? (
            <Text style={estilos.vazio}>Nenhum comentário ainda.</Text>
          ) : (
            comentarios.map((c) => (
              <Text key={c.id} style={estilos.legenda}>
                <Text style={estilos.nomeUsuario}>{c.perfis?.nome} </Text>
                {c.texto}
              </Text>
            ))
          )}
        </ScrollView>
        <View style={{ flexDirection: "row", gap: ESPACAMENTO.sm }}>
          <TextInput style={[estilos.campo, { flex: 1, marginBottom: 0 }]} placeholder="Escreva um comentário..." placeholderTextColor={cores.textoSecundario} value={texto} onChangeText={setTexto} onSubmitEditing={enviar} />
          <TouchableOpacity style={estilos.botaoEnviarComentario} onPress={enviar}>
            <Text style={{ color: "#FFF", fontFamily: FONTES.semiBold, fontSize: 13 }}>Enviar</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity onPress={onFechar} style={{ marginTop: ESPACAMENTO.md, alignItems: "center" }}>
          <Text style={{ color: cores.textoSecundario, fontFamily: FONTES.regular, fontSize: 13 }}>Fechar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function criarEstilos(cores) {
  return StyleSheet.create({
    tela: { flex: 1, backgroundColor: cores.fundo },
    conteudo: { alignItems: "center", padding: ESPACAMENTO.lg, paddingBottom: ESPACAMENTO.xxl },
    cabecalho: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: ESPACAMENTO.lg },
    titulo: { fontSize: 20, color: cores.texto, fontFamily: FONTES.bold },
    botaoAdd: { backgroundColor: cores.primaria, borderRadius: RAIO.pill, paddingHorizontal: ESPACAMENTO.lg, paddingVertical: 8 },
    botaoAddTexto: { color: "#FFF", fontSize: 12.5, fontFamily: FONTES.semiBold },
    vazio: { color: cores.textoSecundario, textAlign: "center", marginTop: ESPACAMENTO.xl, fontFamily: FONTES.regular },
    cartaoPost: { backgroundColor: cores.card, borderRadius: RAIO.lg, borderWidth: 1, borderColor: cores.borda, marginBottom: ESPACAMENTO.lg, overflow: "hidden", ...SOMBRA },
    cabecalhoPost: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: ESPACAMENTO.md },
    nomeUsuario: { fontSize: 13, color: cores.texto, fontFamily: FONTES.semiBold },
    tempo: { fontSize: 11, color: cores.textoSecundario, fontFamily: FONTES.regular },
    fotoPost: { width: "100%", height: 280 },
    linhaAcoesPost: { flexDirection: "row", gap: ESPACAMENTO.lg, padding: ESPACAMENTO.md, paddingBottom: ESPACAMENTO.sm },
    acaoPost: { flexDirection: "row", alignItems: "center", gap: 5 },
    iconeAcao: { fontSize: 16 },
    textoAcao: { fontSize: 12.5, color: cores.textoSecundario, fontFamily: FONTES.medium },
    legenda: { fontSize: 13, color: cores.texto, paddingHorizontal: ESPACAMENTO.md, paddingBottom: ESPACAMENTO.md, fontFamily: FONTES.regular, lineHeight: 18 },
    overlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.4)", alignItems: "center", justifyContent: "center", padding: ESPACAMENTO.lg },
    modal: { width: "100%", backgroundColor: cores.card, borderRadius: RAIO.xl, padding: ESPACAMENTO.xl },
    tituloModal: { fontSize: 17, color: cores.texto, fontFamily: FONTES.bold, marginBottom: ESPACAMENTO.md },
    slotFoto: {
      height: 160, borderRadius: RAIO.lg, borderWidth: 1.5, borderStyle: "dashed", borderColor: cores.borda,
      backgroundColor: cores.fundo, alignItems: "center", justifyContent: "center", marginBottom: ESPACAMENTO.md, overflow: "hidden",
    },
    imagemSlot: { width: "100%", height: "100%" },
    slotTexto: { fontSize: 12.5, color: cores.textoSecundario, fontFamily: FONTES.regular, textAlign: "center", paddingHorizontal: ESPACAMENTO.lg },
    campo: {
      borderWidth: 1, borderColor: cores.borda, backgroundColor: cores.fundo, borderRadius: RAIO.md,
      paddingHorizontal: ESPACAMENTO.lg, paddingVertical: ESPACAMENTO.md, fontSize: 14, color: cores.texto,
      marginBottom: ESPACAMENTO.md, fontFamily: FONTES.regular,
    },
    botaoEnviarComentario: { backgroundColor: cores.primaria, borderRadius: RAIO.pill, paddingHorizontal: ESPACAMENTO.lg, justifyContent: "center" },
    linhaBotoesModal: { flexDirection: "row", gap: ESPACAMENTO.md },
    botaoCancelar: { flex: 1, alignItems: "center", paddingVertical: ESPACAMENTO.md },
    botaoCancelarTexto: { color: cores.textoSecundario, fontFamily: FONTES.semiBold },
    botaoSalvar: { flex: 1, backgroundColor: cores.primaria, borderRadius: RAIO.pill, alignItems: "center", paddingVertical: ESPACAMENTO.md },
    botaoSalvarTexto: { color: "#FFF", fontFamily: FONTES.semiBold },
  });
}
