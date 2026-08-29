import React, { useCallback, useEffect, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { useAuth } from "../theme/AuthContext";
import { supabase } from "../lib/supabaseClient";
import { useCores, ESPACAMENTO, RAIO, SOMBRA, larguraWeb, FONTES } from "../theme/estilos";
import { confirmar } from "../lib/confirmar";
import { aplicarMascaraCpf } from "../lib/data";

const TERMO_TEXTO =
  "Ao aceitar, você declara que as informações fornecidas são verdadeiras e concorda com a " +
  "transferência de titularidade do veículo descrito nesta operação, nas condições combinadas " +
  "entre as partes fora deste app (preço, forma de pagamento, estado do veículo). Este termo " +
  "não substitui a transferência oficial no órgão de trânsito (DETRAN), que continua sendo " +
  "obrigação de ambas as partes.";

export default function TransferenciaScreen() {
  const cores = useCores();
  const { user } = useAuth();
  const [transferencias, setTransferencias] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [aberta, setAberta] = useState(null);
  const [modalNovaAberto, setModalNovaAberto] = useState(false);

  const buscar = useCallback(async () => {
    if (!user) return;
    setCarregando(true);
    const { data } = await supabase
      .from("transferencias")
      .select("*, veiculos(marca, modelo, placa)")
      .or(`vendedor_id.eq.${user.id},comprador_id.eq.${user.id}`)
      .order("criado_em", { ascending: false });
    setTransferencias(data || []);
    setCarregando(false);
  }, [user]);

  useEffect(() => {
    buscar();
  }, [buscar]);

  const estilos = criarEstilos(cores);

  if (aberta) {
    return (
      <TransferenciaDetalhe
        transferencia={aberta}
        user={user}
        onVoltar={() => {
          setAberta(null);
          buscar();
        }}
      />
    );
  }

  return (
    <SafeAreaView style={estilos.tela} edges={["top", "bottom"]}>
      <ScrollView contentContainerStyle={estilos.conteudo}>
        <View style={larguraWeb(680)}>
          <View style={estilos.cabecalho}>
            <Text style={estilos.titulo}>Transferências</Text>
            <TouchableOpacity style={estilos.botaoAdd} onPress={() => setModalNovaAberto(true)}>
              <Text style={estilos.botaoAddTexto}>+ Nova</Text>
            </TouchableOpacity>
          </View>
          <Text style={estilos.aviso}>
            Verificação de identidade aqui é manual (upload de documento/selfie), não é um serviço de
            KYC automático ainda. Trate como uma declaração assinada, não como garantia legal.
          </Text>

          {carregando ? (
            <ActivityIndicator color={cores.primaria} />
          ) : transferencias.length === 0 ? (
            <Text style={estilos.vazio}>Nenhuma transferência em andamento.</Text>
          ) : (
            transferencias.map((t) => (
              <TouchableOpacity key={t.id} style={estilos.cartao} onPress={() => setAberta(t)}>
                <View style={{ flex: 1 }}>
                  <Text style={estilos.nome}>{t.veiculos?.marca} {t.veiculos?.modelo}</Text>
                  <Text style={estilos.detalhe}>{t.veiculos?.placa} · você é {t.vendedor_id === user.id ? "o vendedor" : "o comprador"}</Text>
                </View>
                <Text style={[estilos.status, t.status === "concluida" && { color: cores.sucesso }]}>
                  {t.status === "concluida" ? "Concluída" : t.status === "cancelada" ? "Cancelada" : "Em andamento"}
                </Text>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>

      {modalNovaAberto && (
        <NovaTransferenciaModal
          cores={cores}
          user={user}
          onFechar={() => setModalNovaAberto(false)}
          onCriada={() => {
            setModalNovaAberto(false);
            buscar();
          }}
        />
      )}
    </SafeAreaView>
  );
}

function NovaTransferenciaModal({ cores, user, onFechar, onCriada }) {
  const [veiculos, setVeiculos] = useState([]);
  const [veiculoEscolhido, setVeiculoEscolhido] = useState(null);
  const [cpf, setCpf] = useState("");
  const [salvando, setSalvando] = useState(false);
  const estilos = criarEstilos(cores);

  useEffect(() => {
    supabase.from("veiculos").select("*").eq("usuario_id", user.id).then(({ data }) => setVeiculos(data || []));
  }, [user]);

  async function criar() {
    if (!veiculoEscolhido || !cpf.trim()) {
      confirmar("Preencha tudo", "Escolha o veículo e informe o CPF do comprador.");
      return;
    }
    setSalvando(true);
    try {
      const cpfLimpo = cpf.replace(/\D/g, "");
      const { data: perfilComprador, error: erroBusca } = await supabase
        .from("perfis")
        .select("id")
        .eq("cpf", cpfLimpo)
        .maybeSingle();
      if (erroBusca) throw erroBusca;
      if (!perfilComprador) {
        confirmar("CPF não encontrado", "O comprador precisa ter uma conta cadastrada no app com esse CPF.");
        return;
      }
      if (perfilComprador.id === user.id) {
        confirmar("CPF inválido", "Você não pode transferir pra si mesmo.");
        return;
      }
      const { error } = await supabase.from("transferencias").insert({
        veiculo_id: veiculoEscolhido.id,
        vendedor_id: user.id,
        comprador_id: perfilComprador.id,
      });
      if (error) throw error;
      onCriada();
    } catch (e) {
      confirmar("Não deu pra iniciar", e.message || String(e));
    } finally {
      setSalvando(false);
    }
  }

  return (
    <View style={estilos.overlay}>
      <View style={[estilos.modal, larguraWeb(420)]}>
        <Text style={estilos.tituloModal}>Iniciar transferência</Text>
        <Text style={estilos.rotulo}>Qual veículo?</Text>
        {veiculos.map((v) => (
          <TouchableOpacity
            key={v.id}
            style={[estilos.opcaoVeiculo, veiculoEscolhido?.id === v.id && estilos.opcaoVeiculoAtiva]}
            onPress={() => setVeiculoEscolhido(v)}
          >
            <Text style={veiculoEscolhido?.id === v.id ? estilos.opcaoVeiculoTextoAtivo : estilos.opcaoVeiculoTexto}>
              {v.marca} {v.modelo} · {v.placa}
            </Text>
          </TouchableOpacity>
        ))}
        <Text style={[estilos.rotulo, { marginTop: ESPACAMENTO.md }]}>CPF do comprador</Text>
        <TextInput
          style={estilos.campo}
          placeholder="123.456.789-00"
          placeholderTextColor={cores.textoSecundario}
          keyboardType="number-pad"
          maxLength={14}
          value={cpf}
          onChangeText={(t) => setCpf(aplicarMascaraCpf(t))}
        />
        <Text style={estilos.notaPequena}>O comprador precisa já ter uma conta cadastrada com esse CPF.</Text>
        <View style={estilos.linhaBotoesModal}>
          <TouchableOpacity style={estilos.botaoCancelar} onPress={onFechar}>
            <Text style={estilos.botaoCancelarTexto}>Cancelar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={estilos.botaoSalvar} onPress={criar} disabled={salvando}>
            {salvando ? <ActivityIndicator color="#FFF" /> : <Text style={estilos.botaoSalvarTexto}>Iniciar</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

function TransferenciaDetalhe({ transferencia, user, onVoltar }) {
  const cores = useCores();
  const souVendedor = transferencia.vendedor_id === user.id;
  const [t, setT] = useState(transferencia);
  const [urlDocumento, setUrlDocumento] = useState(null);
  const [urlSelfie, setUrlSelfie] = useState(null);
  const [enviando, setEnviando] = useState(null);

  const campoTermo = souVendedor ? "termo_aceito_vendedor" : "termo_aceito_comprador";
  const campoLgpd = souVendedor ? "consentimento_lgpd_vendedor" : "consentimento_lgpd_comprador";
  const campoDocPath = souVendedor ? "documento_vendedor_path" : "documento_comprador_path";
  const campoSelfiePath = souVendedor ? "selfie_vendedor_path" : "selfie_comprador_path";

  const carregarUrls = useCallback(async (registro) => {
    if (registro[campoDocPath]) {
      const { data } = await supabase.storage.from("documentos-transferencia").createSignedUrl(registro[campoDocPath], 3600);
      setUrlDocumento(data?.signedUrl || null);
    }
    if (registro[campoSelfiePath]) {
      const { data } = await supabase.storage.from("documentos-transferencia").createSignedUrl(registro[campoSelfiePath], 3600);
      setUrlSelfie(data?.signedUrl || null);
    }
  }, [campoDocPath, campoSelfiePath]);

  useEffect(() => {
    carregarUrls(t);
  }, [carregarUrls, t]);

  async function atualizar(campos) {
    const { data, error } = await supabase.from("transferencias").update(campos).eq("id", t.id).select().single();
    if (error) {
      confirmar("Não deu pra atualizar", error.message);
      return;
    }
    setT({ ...t, ...data });
  }

  async function enviarFoto(tipoFoto) {
    const permissao = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissao.granted) {
      confirmar("Precisamos da permissão", "Autorize o acesso às fotos.");
      return;
    }
    const resultado = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.7 });
    if (resultado.canceled) return;

    setEnviando(tipoFoto);
    try {
      const arquivo = resultado.assets[0];
      const resposta = await fetch(arquivo.uri);
      const bytes = await resposta.arrayBuffer();
      const caminho = `${user.id}/${t.id}-${tipoFoto}-${Date.now()}.jpg`;
      const { error: erroUpload } = await supabase.storage
        .from("documentos-transferencia")
        .upload(caminho, bytes, { contentType: "image/jpeg" });
      if (erroUpload) throw erroUpload;

      const campo = tipoFoto === "documento" ? campoDocPath : campoSelfiePath;
      await atualizar({ [campo]: caminho });
    } catch (e) {
      confirmar("Não deu pra enviar", e.message || String(e));
    } finally {
      setEnviando(null);
    }
  }

  async function concluirTransferencia() {
    if (!t.termo_aceito_vendedor || !t.termo_aceito_comprador) {
      confirmar("Falta aceite", "Os dois lados precisam aceitar o termo antes de concluir.");
      return;
    }
    if (!t.documento_vendedor_path || !t.documento_comprador_path) {
      confirmar("Falta documento", "Os dois lados precisam enviar o documento antes de concluir.");
      return;
    }
    confirmar("Concluir transferência", "Isso troca o dono do veículo no app. Confirma?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Concluir",
        onPress: async () => {
          const { error: erroVeiculo } = await supabase
            .from("veiculos")
            .update({ usuario_id: t.comprador_id })
            .eq("id", t.veiculo_id);
          if (erroVeiculo) {
            confirmar("Não deu pra concluir", erroVeiculo.message);
            return;
          }
          await atualizar({ status: "concluida" });
          confirmar("Pronto!", "O veículo agora pertence ao comprador no app.");
        },
      },
    ]);
  }

  const estilos = criarEstilos(cores);

  return (
    <SafeAreaView style={estilos.tela} edges={["top", "bottom"]}>
      <ScrollView contentContainerStyle={estilos.conteudo}>
        <View style={larguraWeb(560)}>
          <TouchableOpacity onPress={onVoltar} style={{ marginBottom: ESPACAMENTO.md }}>
            <Text style={estilos.link}>← Voltar</Text>
          </TouchableOpacity>
          <Text style={estilos.titulo}>Transferência</Text>
          <Text style={estilos.detalhe}>Você é {souVendedor ? "o vendedor" : "o comprador"} nesta transferência.</Text>

          {t.status === "concluida" ? (
            <Text style={[estilos.aviso, { color: cores.sucesso }]}>Esta transferência já foi concluída.</Text>
          ) : (
            <>
              <Text style={estilos.rotuloSecao}>Termo de transferência</Text>
              <Text style={estilos.termoTexto}>{TERMO_TEXTO}</Text>
              <TouchableOpacity style={estilos.linhaCheckbox} onPress={() => atualizar({ [campoTermo]: !t[campoTermo] })}>
                <View style={[estilos.checkbox, t[campoTermo] && estilos.checkboxMarcado]}>
                  {t[campoTermo] && <Text style={{ color: "#FFF", fontSize: 11 }}>✓</Text>}
                </View>
                <Text style={estilos.textoCheckbox}>Li e aceito o termo de transferência</Text>
              </TouchableOpacity>
              <TouchableOpacity style={estilos.linhaCheckbox} onPress={() => atualizar({ [campoLgpd]: !t[campoLgpd] })}>
                <View style={[estilos.checkbox, t[campoLgpd] && estilos.checkboxMarcado]}>
                  {t[campoLgpd] && <Text style={{ color: "#FFF", fontSize: 11 }}>✓</Text>}
                </View>
                <Text style={estilos.textoCheckbox}>
                  Consinto o uso dos meus dados (CPF, documento, foto) só pra esta verificação de transferência
                </Text>
              </TouchableOpacity>

              <Text style={estilos.rotuloSecao}>Seus documentos</Text>
              <View style={estilos.linhaFotos}>
                <TouchableOpacity style={estilos.slotFoto} onPress={() => enviarFoto("documento")} disabled={enviando === "documento"}>
                  {urlDocumento ? (
                    <Image source={{ uri: urlDocumento }} style={estilos.imagemSlot} />
                  ) : enviando === "documento" ? (
                    <ActivityIndicator color={cores.primaria} />
                  ) : (
                    <Text style={estilos.slotTexto}>+ Documento</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity style={estilos.slotFoto} onPress={() => enviarFoto("selfie")} disabled={enviando === "selfie"}>
                  {urlSelfie ? (
                    <Image source={{ uri: urlSelfie }} style={estilos.imagemSlot} />
                  ) : enviando === "selfie" ? (
                    <ActivityIndicator color={cores.primaria} />
                  ) : (
                    <Text style={estilos.slotTexto}>+ Selfie</Text>
                  )}
                </TouchableOpacity>
              </View>

              {souVendedor && (
                <TouchableOpacity style={estilos.botaoSalvar} onPress={concluirTransferencia}>
                  <Text style={estilos.botaoSalvarTexto}>Concluir transferência</Text>
                </TouchableOpacity>
              )}
            </>
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
    cabecalho: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: ESPACAMENTO.sm },
    titulo: { fontSize: 20, color: cores.texto, fontFamily: FONTES.bold },
    botaoAdd: { backgroundColor: cores.primaria, borderRadius: RAIO.pill, paddingHorizontal: ESPACAMENTO.lg, paddingVertical: 8 },
    botaoAddTexto: { color: "#FFF", fontSize: 12.5, fontFamily: FONTES.semiBold },
    aviso: { fontSize: 11.5, color: cores.aviso, backgroundColor: cores.avisoFundo, borderRadius: RAIO.md, padding: ESPACAMENTO.md, marginBottom: ESPACAMENTO.lg, fontFamily: FONTES.regular, lineHeight: 16 },
    vazio: { color: cores.textoSecundario, textAlign: "center", marginTop: ESPACAMENTO.xl, fontFamily: FONTES.regular },
    link: { color: cores.primaria, fontSize: 13, fontFamily: FONTES.semiBold },
    cartao: { flexDirection: "row", alignItems: "center", backgroundColor: cores.card, borderRadius: RAIO.lg, borderWidth: 1, borderColor: cores.borda, padding: ESPACAMENTO.md, marginBottom: ESPACAMENTO.sm, ...SOMBRA },
    nome: { fontSize: 14, color: cores.texto, fontFamily: FONTES.semiBold },
    detalhe: { fontSize: 12, color: cores.textoSecundario, marginTop: 2, fontFamily: FONTES.regular },
    status: { fontSize: 11.5, color: cores.textoSecundario, fontFamily: FONTES.semiBold },
    rotulo: { fontSize: 13, color: cores.texto, marginBottom: ESPACAMENTO.xs, fontFamily: FONTES.medium },
    rotuloSecao: { fontSize: 15, color: cores.texto, fontFamily: FONTES.bold, marginTop: ESPACAMENTO.lg, marginBottom: ESPACAMENTO.sm },
    opcaoVeiculo: { borderWidth: 1, borderColor: cores.borda, borderRadius: RAIO.md, padding: ESPACAMENTO.md, marginBottom: ESPACAMENTO.sm },
    opcaoVeiculoAtiva: { backgroundColor: cores.primariaClara, borderColor: cores.primaria },
    opcaoVeiculoTexto: { color: cores.texto, fontSize: 13, fontFamily: FONTES.regular },
    opcaoVeiculoTextoAtivo: { color: cores.primaria, fontSize: 13, fontFamily: FONTES.semiBold },
    campo: {
      borderWidth: 1, borderColor: cores.borda, backgroundColor: cores.fundo, borderRadius: RAIO.md,
      paddingHorizontal: ESPACAMENTO.lg, paddingVertical: ESPACAMENTO.md, fontSize: 14, color: cores.texto,
      marginBottom: ESPACAMENTO.xs, fontFamily: FONTES.regular,
    },
    notaPequena: { fontSize: 11, color: cores.textoSecundario, marginBottom: ESPACAMENTO.md, fontFamily: FONTES.regular },
    termoTexto: { fontSize: 12, color: cores.textoSecundario, lineHeight: 18, marginBottom: ESPACAMENTO.md, fontFamily: FONTES.regular },
    linhaCheckbox: { flexDirection: "row", alignItems: "center", gap: ESPACAMENTO.sm, marginBottom: ESPACAMENTO.md },
    checkbox: { width: 20, height: 20, borderRadius: 5, borderWidth: 1.5, borderColor: cores.borda, alignItems: "center", justifyContent: "center" },
    checkboxMarcado: { backgroundColor: cores.primaria, borderColor: cores.primaria },
    textoCheckbox: { flex: 1, fontSize: 12.5, color: cores.texto, fontFamily: FONTES.regular },
    linhaFotos: { flexDirection: "row", gap: ESPACAMENTO.md, marginBottom: ESPACAMENTO.lg },
    slotFoto: {
      flex: 1, aspectRatio: 1, borderRadius: RAIO.lg, borderWidth: 1.5, borderStyle: "dashed", borderColor: cores.borda,
      backgroundColor: cores.card, alignItems: "center", justifyContent: "center", overflow: "hidden",
    },
    imagemSlot: { width: "100%", height: "100%" },
    slotTexto: { fontSize: 12, color: cores.textoSecundario, fontFamily: FONTES.medium },
    overlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.4)", alignItems: "center", justifyContent: "center", padding: ESPACAMENTO.lg },
    modal: { width: "100%", backgroundColor: cores.card, borderRadius: RAIO.xl, padding: ESPACAMENTO.xl },
    tituloModal: { fontSize: 17, color: cores.texto, fontFamily: FONTES.bold, marginBottom: ESPACAMENTO.md },
    linhaBotoesModal: { flexDirection: "row", gap: ESPACAMENTO.md, marginTop: ESPACAMENTO.md },
    botaoCancelar: { flex: 1, alignItems: "center", paddingVertical: ESPACAMENTO.md },
    botaoCancelarTexto: { color: cores.textoSecundario, fontFamily: FONTES.semiBold },
    botaoSalvar: { flex: 1, backgroundColor: cores.primaria, borderRadius: RAIO.pill, alignItems: "center", paddingVertical: ESPACAMENTO.md, marginTop: ESPACAMENTO.sm },
    botaoSalvarTexto: { color: "#FFF", fontFamily: FONTES.semiBold },
  });
}
