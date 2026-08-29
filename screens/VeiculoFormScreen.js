import React, { useCallback, useEffect, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { useAuth } from "../theme/AuthContext";
import { supabase } from "../lib/supabaseClient";
import { useCores, ESPACAMENTO, RAIO, SOMBRA, larguraWeb, FONTES } from "../theme/estilos";
import { confirmar } from "../lib/confirmar";
import { aplicarMascaraPlaca } from "../lib/data";

const TIPOS_FOTO = [
  { id: "frente", rotulo: "Frente" },
  { id: "verso", rotulo: "Verso" },
  { id: "lateral", rotulo: "Lateral" },
  { id: "interior", rotulo: "Interior" },
];

export default function VeiculoFormScreen({ veiculoId, onVoltar, onSalvo }) {
  const cores = useCores();
  const { user } = useAuth();
  const [tipo, setTipo] = useState("carro");
  const [placa, setPlaca] = useState("");
  const [marca, setMarca] = useState("");
  const [modelo, setModelo] = useState("");
  const [ano, setAno] = useState("");
  const [cor, setCor] = useState("");
  const [kmAtual, setKmAtual] = useState("");
  const [idSalvo, setIdSalvo] = useState(veiculoId || null);
  const [fotos, setFotos] = useState([]);
  const [documentos, setDocumentos] = useState([]);
  const [carregando, setCarregando] = useState(!!veiculoId);
  const [salvando, setSalvando] = useState(false);
  const [enviandoTipo, setEnviandoTipo] = useState(null);

  const buscarAnexos = useCallback(async (id) => {
    const [{ data: dadosFotos }, { data: dadosDocs }] = await Promise.all([
      supabase.from("fotos_veiculo").select("*").eq("veiculo_id", id).order("criado_em", { ascending: true }),
      supabase.from("documentos_veiculo").select("*").eq("veiculo_id", id).order("criado_em", { ascending: false }),
    ]);
    setFotos(dadosFotos || []);
    setDocumentos(dadosDocs || []);
  }, []);

  useEffect(() => {
    if (!veiculoId) return;
    (async () => {
      const { data, error } = await supabase.from("veiculos").select("*").eq("id", veiculoId).maybeSingle();
      if (!error && data) {
        setTipo(data.tipo);
        setPlaca(data.placa);
        setMarca(data.marca);
        setModelo(data.modelo);
        setAno(data.ano ? String(data.ano) : "");
        setCor(data.cor || "");
        setKmAtual(String(data.km_atual));
        await buscarAnexos(data.id);
      }
      setCarregando(false);
    })();
  }, [veiculoId, buscarAnexos]);

  async function salvarDadosBasicos() {
    if (!placa.trim() || !marca.trim() || !modelo.trim()) {
      confirmar("Preencha tudo", "Placa, marca e modelo são obrigatórios.");
      return;
    }
    const dados = {
      tipo,
      placa: aplicarMascaraPlaca(placa),
      marca: marca.trim(),
      modelo: modelo.trim(),
      ano: ano ? Number(ano) : null,
      cor: cor.trim() || null,
      km_atual: Number(kmAtual) || 0,
    };

    setSalvando(true);
    try {
      if (idSalvo) {
        const { error } = await supabase.from("veiculos").update(dados).eq("id", idSalvo);
        if (error) throw error;
        confirmar("Salvo!", "Dados do veículo atualizados.");
      } else {
        const { data, error } = await supabase
          .from("veiculos")
          .insert({ ...dados, usuario_id: user.id })
          .select()
          .single();
        if (error) throw error;
        setIdSalvo(data.id);
        confirmar("Veículo cadastrado!", "Agora você já pode adicionar fotos e o documento.");
      }
      onSalvo?.();
    } catch (e) {
      confirmar("Não deu pra salvar", e.message || String(e));
    } finally {
      setSalvando(false);
    }
  }

  async function enviarFoto(tipoFoto) {
    if (!idSalvo) return;
    const permissao = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissao.granted) {
      confirmar("Precisamos da permissão", "Autorize o acesso às fotos.");
      return;
    }
    const resultado = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });
    if (resultado.canceled) return;

    setEnviandoTipo(tipoFoto);
    try {
      const arquivo = resultado.assets[0];
      const resposta = await fetch(arquivo.uri);
      const bytes = await resposta.arrayBuffer();
      const caminho = `${user.id}/${idSalvo}/foto-${tipoFoto}-${Date.now()}.jpg`;

      const { error: erroUpload } = await supabase.storage
        .from("veiculos")
        .upload(caminho, bytes, { contentType: "image/jpeg" });
      if (erroUpload) throw erroUpload;

      const { data } = supabase.storage.from("veiculos").getPublicUrl(caminho);
      const { error: erroInsert } = await supabase
        .from("fotos_veiculo")
        .insert({ veiculo_id: idSalvo, tipo: tipoFoto, foto_url: data.publicUrl });
      if (erroInsert) throw erroInsert;

      await buscarAnexos(idSalvo);
    } catch (e) {
      confirmar(
        "Não deu pra enviar a foto",
        "Verifique se o bucket público \"veiculos\" existe no Supabase Storage. Detalhe: " + (e.message || e)
      );
    } finally {
      setEnviandoTipo(null);
    }
  }

  async function enviarDocumento() {
    if (!idSalvo) return;
    const permissao = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissao.granted) {
      confirmar("Precisamos da permissão", "Autorize o acesso às fotos.");
      return;
    }
    const resultado = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (resultado.canceled) return;

    setEnviandoTipo("documento");
    try {
      const arquivo = resultado.assets[0];
      const resposta = await fetch(arquivo.uri);
      const bytes = await resposta.arrayBuffer();
      const caminho = `${user.id}/${idSalvo}/crlv-${Date.now()}.jpg`;

      const { error: erroUpload } = await supabase.storage
        .from("veiculos")
        .upload(caminho, bytes, { contentType: "image/jpeg" });
      if (erroUpload) throw erroUpload;

      const { data } = supabase.storage.from("veiculos").getPublicUrl(caminho);
      const { error: erroInsert } = await supabase
        .from("documentos_veiculo")
        .insert({ veiculo_id: idSalvo, tipo: "crlv", arquivo_url: data.publicUrl });
      if (erroInsert) throw erroInsert;

      await buscarAnexos(idSalvo);
    } catch (e) {
      confirmar("Não deu pra enviar o documento", e.message || String(e));
    } finally {
      setEnviandoTipo(null);
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
        <View style={larguraWeb(560)}>
          <TouchableOpacity onPress={onVoltar} style={{ marginBottom: ESPACAMENTO.lg }}>
            <Text style={estilos.link}>← Voltar</Text>
          </TouchableOpacity>

          <Text style={estilos.titulo}>{idSalvo ? "Editar veículo" : "Novo veículo"}</Text>

          <View style={estilos.linhaTipo}>
            <TouchableOpacity
              style={[estilos.opcaoTipo, tipo === "carro" && estilos.opcaoTipoAtiva]}
              onPress={() => setTipo("carro")}
            >
              <Text style={tipo === "carro" ? estilos.opcaoTipoTextoAtivo : estilos.opcaoTipoTexto}>🚗 Carro</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[estilos.opcaoTipo, tipo === "moto" && estilos.opcaoTipoAtiva]}
              onPress={() => setTipo("moto")}
            >
              <Text style={tipo === "moto" ? estilos.opcaoTipoTextoAtivo : estilos.opcaoTipoTexto}>🏍️ Moto</Text>
            </TouchableOpacity>
          </View>

          <Text style={estilos.rotulo}>Placa</Text>
          <TextInput
            style={estilos.campo}
            placeholder="ABC1D23"
            placeholderTextColor={cores.textoSecundario}
            autoCapitalize="characters"
            value={placa}
            onChangeText={(t) => setPlaca(aplicarMascaraPlaca(t))}
          />

          <Text style={estilos.rotulo}>Marca</Text>
          <TextInput
            style={estilos.campo}
            placeholder="Ex: Volkswagen"
            placeholderTextColor={cores.textoSecundario}
            value={marca}
            onChangeText={setMarca}
          />

          <Text style={estilos.rotulo}>Modelo</Text>
          <TextInput
            style={estilos.campo}
            placeholder="Ex: Gol"
            placeholderTextColor={cores.textoSecundario}
            value={modelo}
            onChangeText={setModelo}
          />

          <View style={estilos.linhaDupla}>
            <View style={{ flex: 1 }}>
              <Text style={estilos.rotulo}>Ano</Text>
              <TextInput
                style={estilos.campo}
                placeholder="2020"
                placeholderTextColor={cores.textoSecundario}
                keyboardType="number-pad"
                maxLength={4}
                value={ano}
                onChangeText={setAno}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={estilos.rotulo}>Cor</Text>
              <TextInput
                style={estilos.campo}
                placeholder="Prata"
                placeholderTextColor={cores.textoSecundario}
                value={cor}
                onChangeText={setCor}
              />
            </View>
          </View>

          <Text style={estilos.rotulo}>Km atual</Text>
          <TextInput
            style={estilos.campo}
            placeholder="0"
            placeholderTextColor={cores.textoSecundario}
            keyboardType="number-pad"
            value={kmAtual}
            onChangeText={setKmAtual}
          />

          <TouchableOpacity style={estilos.botao} onPress={salvarDadosBasicos} disabled={salvando}>
            {salvando ? <ActivityIndicator color="#FFF" /> : <Text style={estilos.botaoTexto}>{idSalvo ? "Salvar alterações" : "Cadastrar veículo"}</Text>}
          </TouchableOpacity>

          {idSalvo ? (
            <>
              <Text style={estilos.rotuloSecao}>Fotos</Text>
              <View style={estilos.gradeFotos}>
                {TIPOS_FOTO.map((tipoFoto) => {
                  const fotoExistente = fotos.find((f) => f.tipo === tipoFoto.id);
                  return (
                    <TouchableOpacity
                      key={tipoFoto.id}
                      style={estilos.slotFoto}
                      onPress={() => enviarFoto(tipoFoto.id)}
                      disabled={enviandoTipo === tipoFoto.id}
                    >
                      {fotoExistente ? (
                        <Image source={{ uri: fotoExistente.foto_url }} style={estilos.imagemSlot} />
                      ) : enviandoTipo === tipoFoto.id ? (
                        <ActivityIndicator color={cores.primaria} />
                      ) : (
                        <Text style={estilos.slotTexto}>+ {tipoFoto.rotulo}</Text>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={estilos.rotuloSecao}>Documento (CRLV)</Text>
              {documentos.length > 0 ? (
                <Image source={{ uri: documentos[0].arquivo_url }} style={estilos.imagemDocumento} />
              ) : null}
              <TouchableOpacity style={estilos.botaoSecundario} onPress={enviarDocumento} disabled={enviandoTipo === "documento"}>
                {enviandoTipo === "documento" ? (
                  <ActivityIndicator color={cores.primaria} />
                ) : (
                  <Text style={estilos.botaoSecundarioTexto}>
                    {documentos.length > 0 ? "Trocar foto do CRLV" : "Enviar foto do CRLV"}
                  </Text>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <Text style={estilos.avisoFotos}>Salve os dados básicos primeiro pra poder adicionar fotos e documento.</Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function criarEstilos(cores) {
  return StyleSheet.create({
    tela: { flex: 1, backgroundColor: cores.fundo },
    conteudo: { alignItems: "center", padding: ESPACAMENTO.lg, paddingBottom: ESPACAMENTO.xxl },
    link: { color: cores.primaria, fontSize: 14, fontFamily: FONTES.semiBold },
    titulo: { fontSize: 22, color: cores.texto, marginBottom: ESPACAMENTO.lg, fontFamily: FONTES.bold },
    linhaTipo: { flexDirection: "row", gap: ESPACAMENTO.sm, marginBottom: ESPACAMENTO.lg },
    opcaoTipo: {
      flex: 1,
      borderWidth: 1,
      borderColor: cores.borda,
      borderRadius: RAIO.pill,
      paddingVertical: ESPACAMENTO.sm,
      alignItems: "center",
    },
    opcaoTipoAtiva: { backgroundColor: cores.primariaClara, borderColor: cores.primaria },
    opcaoTipoTexto: { color: cores.textoSecundario, fontSize: 14, fontFamily: FONTES.medium },
    opcaoTipoTextoAtivo: { color: cores.primaria, fontSize: 14, fontFamily: FONTES.semiBold },
    rotulo: { fontSize: 13, color: cores.texto, marginBottom: ESPACAMENTO.xs, fontFamily: FONTES.medium },
    rotuloSecao: { fontSize: 16, color: cores.texto, marginTop: ESPACAMENTO.xl, marginBottom: ESPACAMENTO.md, fontFamily: FONTES.bold },
    campo: {
      borderWidth: 1,
      borderColor: cores.borda,
      backgroundColor: cores.card,
      borderRadius: RAIO.md,
      paddingHorizontal: ESPACAMENTO.lg,
      paddingVertical: ESPACAMENTO.md,
      fontSize: 15,
      color: cores.texto,
      marginBottom: ESPACAMENTO.md,
      fontFamily: FONTES.regular,
    },
    linhaDupla: { flexDirection: "row", gap: ESPACAMENTO.md },
    botao: {
      backgroundColor: cores.primaria,
      borderRadius: RAIO.pill,
      paddingVertical: ESPACAMENTO.md,
      alignItems: "center",
      marginTop: ESPACAMENTO.sm,
    },
    botaoTexto: { color: "#FFF", fontSize: 16, fontFamily: FONTES.semiBold },
    botaoSecundario: {
      borderWidth: 1,
      borderColor: cores.primaria,
      borderRadius: RAIO.pill,
      paddingVertical: ESPACAMENTO.md,
      alignItems: "center",
    },
    botaoSecundarioTexto: { color: cores.primaria, fontSize: 14, fontFamily: FONTES.semiBold },
    gradeFotos: { flexDirection: "row", flexWrap: "wrap", gap: ESPACAMENTO.sm, marginBottom: ESPACAMENTO.lg },
    slotFoto: {
      width: 108,
      height: 108,
      borderRadius: RAIO.lg,
      borderWidth: 1,
      borderStyle: "dashed",
      borderColor: cores.borda,
      backgroundColor: cores.card,
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
    },
    imagemSlot: { width: "100%", height: "100%" },
    slotTexto: { fontSize: 12, color: cores.textoSecundario, fontFamily: FONTES.medium },
    imagemDocumento: { width: "100%", height: 160, borderRadius: RAIO.lg, marginBottom: ESPACAMENTO.md, ...SOMBRA },
    avisoFotos: { color: cores.textoSecundario, fontSize: 13, textAlign: "center", marginTop: ESPACAMENTO.xl, fontFamily: FONTES.regular },
  });
}
