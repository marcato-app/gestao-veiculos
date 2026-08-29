import React, { useCallback, useEffect, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../theme/AuthContext";
import { supabase } from "../lib/supabaseClient";
import { useCores, ESPACAMENTO, RAIO, SOMBRA, larguraWeb, FONTES } from "../theme/estilos";
import { confirmar } from "../lib/confirmar";
import { aplicarMascaraData, dataBrParaIso, dataIsoParaBr } from "../lib/data";

function formatarReais(valor) {
  return `R$ ${Number(valor).toFixed(2).replace(".", ",")}`;
}

function Estrelas({ nota }) {
  const cheias = Math.round(nota);
  return <Text style={{ fontSize: 13 }}>{"★".repeat(cheias)}{"☆".repeat(5 - cheias)}</Text>;
}

export default function AbastecimentoScreen() {
  const cores = useCores();
  const { user } = useAuth();
  const [aba, setAba] = useState("registros");
  const estilos = criarEstilos(cores);

  return (
    <SafeAreaView style={estilos.tela} edges={["top", "bottom"]}>
      <View style={larguraWeb(680)}>
        <View style={estilos.segmentado}>
          <TouchableOpacity style={[estilos.segItem, aba === "registros" && estilos.segAtivo]} onPress={() => setAba("registros")}>
            <Text style={aba === "registros" ? estilos.segTextoAtivo : estilos.segTexto}>Abastecimentos</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[estilos.segItem, aba === "postos" && estilos.segAtivo]} onPress={() => setAba("postos")}>
            <Text style={aba === "postos" ? estilos.segTextoAtivo : estilos.segTexto}>Postos</Text>
          </TouchableOpacity>
        </View>
      </View>
      {aba === "registros" ? <SecaoRegistros cores={cores} user={user} /> : <SecaoPostos cores={cores} user={user} />}
    </SafeAreaView>
  );
}

function SecaoRegistros({ cores, user }) {
  const [veiculos, setVeiculos] = useState([]);
  const [veiculoSelecionado, setVeiculoSelecionado] = useState(null);
  const [registros, setRegistros] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [modalAberto, setModalAberto] = useState(false);
  const [postoNome, setPostoNome] = useState("");
  const [valor, setValor] = useState("");
  const [litros, setLitros] = useState("");
  const [km, setKm] = useState("");
  const [data, setData] = useState("");
  const [salvando, setSalvando] = useState(false);

  const buscarVeiculos = useCallback(async () => {
    if (!user) return;
    const { data: dados } = await supabase.from("veiculos").select("*").eq("usuario_id", user.id).order("criado_em");
    setVeiculos(dados || []);
    setCarregando(false);
  }, [user]);

  useEffect(() => {
    buscarVeiculos();
  }, [buscarVeiculos]);

  const buscarRegistros = useCallback(async (veiculo) => {
    const { data: dados } = await supabase
      .from("abastecimentos")
      .select("*")
      .eq("veiculo_id", veiculo.id)
      .order("data", { ascending: false });
    setRegistros(dados || []);
  }, []);

  function selecionarVeiculo(v) {
    setVeiculoSelecionado(v);
    buscarRegistros(v);
  }

  async function salvar() {
    if (!postoNome.trim() || !valor.trim() || !data.trim()) {
      confirmar("Preencha tudo", "Posto, valor e data são obrigatórios.");
      return;
    }
    const dataIso = dataBrParaIso(data);
    if (!dataIso) {
      confirmar("Data inválida", "Use o formato DD/MM/AAAA.");
      return;
    }
    setSalvando(true);
    try {
      const { error } = await supabase.from("abastecimentos").insert({
        veiculo_id: veiculoSelecionado.id,
        posto_nome: postoNome.trim(),
        valor: Number(valor.replace(",", ".")),
        litros: litros ? Number(litros.replace(",", ".")) : null,
        km: km ? Number(km) : null,
        data: dataIso,
      });
      if (error) throw error;
      setModalAberto(false);
      setPostoNome("");
      setValor("");
      setLitros("");
      setKm("");
      setData("");
      buscarRegistros(veiculoSelecionado);
    } catch (e) {
      confirmar("Não deu pra salvar", e.message || String(e));
    } finally {
      setSalvando(false);
    }
  }

  const estilos = criarEstilos(cores);

  if (carregando) return <ActivityIndicator color={cores.primaria} style={{ marginTop: ESPACAMENTO.xxl }} />;

  if (!veiculoSelecionado) {
    return (
      <ScrollView contentContainerStyle={estilos.conteudo}>
        <View style={larguraWeb(680)}>
          <Text style={estilos.subtitulo}>Escolha o veículo pra ver os abastecimentos.</Text>
          {veiculos.length === 0 ? (
            <Text style={estilos.vazio}>Cadastre um veículo primeiro na aba Veículos.</Text>
          ) : (
            veiculos.map((v) => (
              <TouchableOpacity key={v.id} style={estilos.cartaoVeiculo} onPress={() => selecionarVeiculo(v)}>
                <Text style={{ fontSize: 20 }}>{v.tipo === "moto" ? "🏍️" : "🚗"}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={estilos.nomeVeiculo}>{v.marca} {v.modelo}</Text>
                  <Text style={estilos.detalheVeiculo}>{v.placa}</Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>
    );
  }

  const totalMes = registros
    .filter((r) => r.data.slice(0, 7) === new Date().toISOString().slice(0, 7))
    .reduce((s, r) => s + Number(r.valor), 0);

  return (
    <>
      <ScrollView contentContainerStyle={estilos.conteudo}>
        <View style={larguraWeb(680)}>
          <TouchableOpacity onPress={() => setVeiculoSelecionado(null)} style={{ marginBottom: ESPACAMENTO.md }}>
            <Text style={estilos.link}>← Trocar veículo</Text>
          </TouchableOpacity>

          <View style={estilos.kpi}>
            <Text style={estilos.kpiValor}>{formatarReais(totalMes)}</Text>
            <Text style={estilos.kpiRotulo}>Gasto este mês</Text>
          </View>

          <View style={estilos.linhaSubtituloComBotao}>
            <Text style={estilos.rotuloSecao}>Registros</Text>
            <TouchableOpacity style={estilos.botaoAdd} onPress={() => setModalAberto(true)}>
              <Text style={estilos.botaoAddTexto}>+ Registrar</Text>
            </TouchableOpacity>
          </View>

          {registros.length === 0 ? (
            <Text style={estilos.vazio}>Nenhum abastecimento registrado ainda.</Text>
          ) : (
            registros.map((r) => (
              <View key={r.id} style={estilos.cartaoRegistro}>
                <View style={{ flex: 1 }}>
                  <Text style={estilos.nomePosto}>{r.posto_nome}</Text>
                  <Text style={estilos.detalheRegistro}>
                    {dataIsoParaBr(r.data)} {r.litros ? `· ${r.litros}L` : ""} {r.km ? `· ${Number(r.km).toLocaleString("pt-BR")} km` : ""}
                  </Text>
                </View>
                <Text style={estilos.valorRegistro}>{formatarReais(r.valor)}</Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {modalAberto && (
        <View style={estilos.overlay}>
          <View style={[estilos.modal, larguraWeb(400)]}>
            <Text style={estilos.tituloModal}>Novo abastecimento</Text>
            <TextInput style={estilos.campo} placeholder="Nome do posto" placeholderTextColor={cores.textoSecundario} value={postoNome} onChangeText={setPostoNome} />
            <TextInput style={estilos.campo} placeholder="Valor pago (R$)" placeholderTextColor={cores.textoSecundario} keyboardType="decimal-pad" value={valor} onChangeText={setValor} />
            <TextInput style={estilos.campo} placeholder="Litros (opcional)" placeholderTextColor={cores.textoSecundario} keyboardType="decimal-pad" value={litros} onChangeText={setLitros} />
            <TextInput style={estilos.campo} placeholder="Km no momento (opcional)" placeholderTextColor={cores.textoSecundario} keyboardType="number-pad" value={km} onChangeText={setKm} />
            <TextInput style={estilos.campo} placeholder="Data (DD/MM/AAAA)" placeholderTextColor={cores.textoSecundario} keyboardType="number-pad" maxLength={10} value={data} onChangeText={(t) => setData(aplicarMascaraData(t))} />
            <View style={estilos.linhaBotoesModal}>
              <TouchableOpacity style={estilos.botaoCancelar} onPress={() => setModalAberto(false)}>
                <Text style={estilos.botaoCancelarTexto}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={estilos.botaoSalvar} onPress={salvar} disabled={salvando}>
                {salvando ? <ActivityIndicator color="#FFF" /> : <Text style={estilos.botaoSalvarTexto}>Salvar</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </>
  );
}

function SecaoPostos({ cores, user }) {
  const [postos, setPostos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [modalNovoAberto, setModalNovoAberto] = useState(false);
  const [modalAvaliarAberto, setModalAvaliarAberto] = useState(null);
  const [nome, setNome] = useState("");
  const [endereco, setEndereco] = useState("");
  const [nota, setNota] = useState(5);
  const [comentario, setComentario] = useState("");
  const [salvando, setSalvando] = useState(false);

  const buscar = useCallback(async () => {
    setCarregando(true);
    const { data } = await supabase.from("postos_com_nota").select("*").order("nota_media", { ascending: false });
    setPostos(data || []);
    setCarregando(false);
  }, []);

  useEffect(() => {
    buscar();
  }, [buscar]);

  async function cadastrarPosto() {
    if (!nome.trim()) {
      confirmar("Preencha o nome", "Nome do posto é obrigatório.");
      return;
    }
    setSalvando(true);
    try {
      const { error } = await supabase.from("postos").insert({ nome: nome.trim(), endereco: endereco.trim() || null, criado_por: user.id });
      if (error) throw error;
      setModalNovoAberto(false);
      setNome("");
      setEndereco("");
      buscar();
    } catch (e) {
      confirmar("Não deu pra cadastrar", e.message || String(e));
    } finally {
      setSalvando(false);
    }
  }

  async function enviarAvaliacao() {
    setSalvando(true);
    try {
      const { error } = await supabase
        .from("avaliacoes_postos")
        .upsert({ posto_id: modalAvaliarAberto.id, usuario_id: user.id, nota, comentario: comentario.trim() || null }, { onConflict: "posto_id,usuario_id" });
      if (error) throw error;
      setModalAvaliarAberto(null);
      setNota(5);
      setComentario("");
      buscar();
    } catch (e) {
      confirmar("Não deu pra avaliar", e.message || String(e));
    } finally {
      setSalvando(false);
    }
  }

  const estilos = criarEstilos(cores);

  return (
    <>
      <ScrollView contentContainerStyle={estilos.conteudo}>
        <View style={larguraWeb(680)}>
          <View style={estilos.linhaSubtituloComBotao}>
            <Text style={estilos.rotuloSecao}>Ranking da comunidade</Text>
            <TouchableOpacity style={estilos.botaoAdd} onPress={() => setModalNovoAberto(true)}>
              <Text style={estilos.botaoAddTexto}>+ Cadastrar</Text>
            </TouchableOpacity>
          </View>
          {carregando ? (
            <ActivityIndicator color={cores.primaria} />
          ) : postos.length === 0 ? (
            <Text style={estilos.vazio}>Nenhum posto cadastrado ainda.</Text>
          ) : (
            postos.map((p) => (
              <TouchableOpacity key={p.id} style={estilos.cartaoPosto} onPress={() => setModalAvaliarAberto(p)}>
                <View style={{ flex: 1 }}>
                  <Text style={estilos.nomePosto}>{p.nome}</Text>
                  {p.endereco ? <Text style={estilos.detalheRegistro}>{p.endereco}</Text> : null}
                  <Text style={estilos.detalheRegistro}>{p.total_avaliacoes} avaliação{p.total_avaliacoes === 1 ? "" : "ões"}</Text>
                </View>
                <Estrelas nota={p.nota_media} />
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>

      {modalNovoAberto && (
        <View style={estilos.overlay}>
          <View style={[estilos.modal, larguraWeb(400)]}>
            <Text style={estilos.tituloModal}>Cadastrar posto</Text>
            <TextInput style={estilos.campo} placeholder="Nome do posto" placeholderTextColor={cores.textoSecundario} value={nome} onChangeText={setNome} />
            <TextInput style={estilos.campo} placeholder="Endereço (opcional)" placeholderTextColor={cores.textoSecundario} value={endereco} onChangeText={setEndereco} />
            <View style={estilos.linhaBotoesModal}>
              <TouchableOpacity style={estilos.botaoCancelar} onPress={() => setModalNovoAberto(false)}>
                <Text style={estilos.botaoCancelarTexto}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={estilos.botaoSalvar} onPress={cadastrarPosto} disabled={salvando}>
                {salvando ? <ActivityIndicator color="#FFF" /> : <Text style={estilos.botaoSalvarTexto}>Salvar</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {modalAvaliarAberto && (
        <View style={estilos.overlay}>
          <View style={[estilos.modal, larguraWeb(400)]}>
            <Text style={estilos.tituloModal}>Avaliar {modalAvaliarAberto.nome}</Text>
            <View style={{ flexDirection: "row", justifyContent: "center", gap: 6, marginBottom: ESPACAMENTO.md }}>
              {[1, 2, 3, 4, 5].map((n) => (
                <TouchableOpacity key={n} onPress={() => setNota(n)}>
                  <Text style={{ fontSize: 26 }}>{n <= nota ? "★" : "☆"}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput style={estilos.campo} placeholder="Comentário (opcional)" placeholderTextColor={cores.textoSecundario} value={comentario} onChangeText={setComentario} />
            <View style={estilos.linhaBotoesModal}>
              <TouchableOpacity style={estilos.botaoCancelar} onPress={() => setModalAvaliarAberto(null)}>
                <Text style={estilos.botaoCancelarTexto}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={estilos.botaoSalvar} onPress={enviarAvaliacao} disabled={salvando}>
                {salvando ? <ActivityIndicator color="#FFF" /> : <Text style={estilos.botaoSalvarTexto}>Avaliar</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </>
  );
}

function criarEstilos(cores) {
  return StyleSheet.create({
    tela: { flex: 1, backgroundColor: cores.fundo },
    conteudo: { alignItems: "center", padding: ESPACAMENTO.lg, paddingBottom: ESPACAMENTO.xxl },
    segmentado: { flexDirection: "row", backgroundColor: cores.card, borderWidth: 1, borderColor: cores.borda, borderRadius: RAIO.pill, padding: 4, margin: ESPACAMENTO.lg, marginBottom: 0 },
    segItem: { flex: 1, alignItems: "center", paddingVertical: 8, borderRadius: RAIO.pill },
    segAtivo: { backgroundColor: cores.primaria },
    segTexto: { color: cores.textoSecundario, fontSize: 12.5, fontFamily: FONTES.medium },
    segTextoAtivo: { color: "#FFF", fontSize: 12.5, fontFamily: FONTES.semiBold },
    subtitulo: { fontSize: 13, color: cores.textoSecundario, marginBottom: ESPACAMENTO.lg, fontFamily: FONTES.regular },
    link: { color: cores.primaria, fontSize: 13, fontFamily: FONTES.semiBold },
    vazio: { color: cores.textoSecundario, textAlign: "center", marginTop: ESPACAMENTO.xl, fontFamily: FONTES.regular },
    cartaoVeiculo: {
      flexDirection: "row", alignItems: "center", gap: ESPACAMENTO.md, backgroundColor: cores.card,
      borderRadius: RAIO.lg, borderWidth: 1, borderColor: cores.borda, padding: ESPACAMENTO.md, marginBottom: ESPACAMENTO.md, ...SOMBRA,
    },
    nomeVeiculo: { fontSize: 14, color: cores.texto, fontFamily: FONTES.semiBold },
    detalheVeiculo: { fontSize: 12, color: cores.textoSecundario, fontFamily: FONTES.regular },
    kpi: { backgroundColor: cores.card, borderWidth: 1, borderColor: cores.borda, borderRadius: RAIO.lg, padding: ESPACAMENTO.md, alignItems: "center", marginBottom: ESPACAMENTO.lg, ...SOMBRA },
    kpiValor: { fontSize: 19, color: cores.texto, fontFamily: FONTES.bold },
    kpiRotulo: { fontSize: 11, color: cores.textoSecundario, marginTop: 3, fontFamily: FONTES.regular },
    linhaSubtituloComBotao: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    rotuloSecao: { fontSize: 15, color: cores.texto, fontFamily: FONTES.bold, marginBottom: ESPACAMENTO.sm },
    botaoAdd: { backgroundColor: cores.primaria, borderRadius: RAIO.pill, paddingHorizontal: ESPACAMENTO.md, paddingVertical: 6 },
    botaoAddTexto: { color: "#FFF", fontSize: 12, fontFamily: FONTES.semiBold },
    cartaoRegistro: { flexDirection: "row", alignItems: "center", backgroundColor: cores.card, borderRadius: RAIO.lg, borderWidth: 1, borderColor: cores.borda, padding: ESPACAMENTO.md, marginBottom: ESPACAMENTO.sm },
    nomePosto: { fontSize: 13.5, color: cores.texto, fontFamily: FONTES.semiBold },
    detalheRegistro: { fontSize: 11.5, color: cores.textoSecundario, marginTop: 2, fontFamily: FONTES.regular },
    valorRegistro: { fontSize: 13, color: cores.primaria, fontFamily: FONTES.bold },
    cartaoPosto: { flexDirection: "row", alignItems: "center", backgroundColor: cores.card, borderRadius: RAIO.lg, borderWidth: 1, borderColor: cores.borda, padding: ESPACAMENTO.md, marginBottom: ESPACAMENTO.sm },
    campo: {
      borderWidth: 1, borderColor: cores.borda, backgroundColor: cores.card, borderRadius: RAIO.md,
      paddingHorizontal: ESPACAMENTO.lg, paddingVertical: ESPACAMENTO.md, fontSize: 14, color: cores.texto,
      marginBottom: ESPACAMENTO.md, fontFamily: FONTES.regular,
    },
    overlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.4)", alignItems: "center", justifyContent: "center", padding: ESPACAMENTO.lg },
    modal: { width: "100%", backgroundColor: cores.card, borderRadius: RAIO.xl, padding: ESPACAMENTO.xl },
    tituloModal: { fontSize: 17, color: cores.texto, fontFamily: FONTES.bold, marginBottom: ESPACAMENTO.md, textAlign: "center" },
    linhaBotoesModal: { flexDirection: "row", gap: ESPACAMENTO.md, marginTop: ESPACAMENTO.sm },
    botaoCancelar: { flex: 1, alignItems: "center", paddingVertical: ESPACAMENTO.md },
    botaoCancelarTexto: { color: cores.textoSecundario, fontFamily: FONTES.semiBold },
    botaoSalvar: { flex: 1, backgroundColor: cores.primaria, borderRadius: RAIO.pill, alignItems: "center", paddingVertical: ESPACAMENTO.md },
    botaoSalvarTexto: { color: "#FFF", fontFamily: FONTES.semiBold },
  });
}
