import React, { useCallback, useEffect, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../theme/AuthContext";
import { supabase } from "../lib/supabaseClient";
import { useCores, ESPACAMENTO, RAIO, SOMBRA, larguraWeb, FONTES } from "../theme/estilos";
import { confirmar } from "../lib/confirmar";
import { aplicarMascaraData, dataBrParaIso, dataIsoParaBr, diasParaData } from "../lib/data";

const TIPOS_MANUTENCAO = [
  { id: "peca", rotulo: "Peça trocada" },
  { id: "revisao", rotulo: "Revisão" },
  { id: "troca_oleo", rotulo: "Troca de óleo" },
];

function formatarReais(valor) {
  return valor ? `R$ ${Number(valor).toFixed(2).replace(".", ",")}` : "—";
}

function StatusLembrete({ diasFaltando, kmFaltando }) {
  const cores = useCores();
  let texto = "Sem lembrete definido";
  let cor = cores.textoSecundario;
  let fundo = "transparent";

  const atrasadoPorData = diasFaltando !== null && diasFaltando < 0;
  const atrasadoPorKm = kmFaltando !== null && kmFaltando < 0;
  const pertoPorData = diasFaltando !== null && diasFaltando >= 0 && diasFaltando <= 15;
  const pertoPorKm = kmFaltando !== null && kmFaltando >= 0 && kmFaltando <= 500;

  if (atrasadoPorData || atrasadoPorKm) {
    texto = "Atrasada";
    cor = cores.erro;
    fundo = cores.erroFundo;
  } else if (pertoPorData || pertoPorKm) {
    texto = "Chegando perto";
    cor = cores.aviso;
    fundo = cores.avisoFundo;
  } else if (diasFaltando !== null || kmFaltando !== null) {
    texto = "Em dia";
    cor = cores.sucesso;
    fundo = cores.sucessoFundo;
  }

  return (
    <View style={{ backgroundColor: fundo, borderRadius: RAIO.pill, paddingHorizontal: 10, paddingVertical: 4, alignSelf: "flex-start" }}>
      <Text style={{ color: cor, fontSize: 11, fontFamily: FONTES.semiBold }}>{texto}</Text>
    </View>
  );
}

export default function ManutencaoScreen() {
  const cores = useCores();
  const { user } = useAuth();
  const [veiculos, setVeiculos] = useState([]);
  const [veiculoSelecionado, setVeiculoSelecionado] = useState(null);
  const [historico, setHistorico] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [modalAberto, setModalAberto] = useState(false);
  const [tipo, setTipo] = useState("peca");
  const [peca, setPeca] = useState("");
  const [data, setData] = useState("");
  const [km, setKm] = useState("");
  const [oficina, setOficina] = useState("");
  const [valor, setValor] = useState("");
  const [salvando, setSalvando] = useState(false);

  const [proximaRevisaoData, setProximaRevisaoData] = useState("");
  const [proximaRevisaoKm, setProximaRevisaoKm] = useState("");
  const [proximaTrocaOleoData, setProximaTrocaOleoData] = useState("");
  const [proximaTrocaOleoKm, setProximaTrocaOleoKm] = useState("");

  const buscarVeiculos = useCallback(async () => {
    if (!user) return;
    const { data: dados } = await supabase.from("veiculos").select("*").eq("usuario_id", user.id).order("criado_em");
    setVeiculos(dados || []);
    setCarregando(false);
  }, [user]);

  useEffect(() => {
    buscarVeiculos();
  }, [buscarVeiculos]);

  const buscarHistorico = useCallback(async (veiculo) => {
    const { data: dados } = await supabase
      .from("manutencoes")
      .select("*")
      .eq("veiculo_id", veiculo.id)
      .order("data", { ascending: false });
    setHistorico(dados || []);
  }, []);

  function selecionarVeiculo(veiculo) {
    setVeiculoSelecionado(veiculo);
    setProximaRevisaoData(dataIsoParaBr(veiculo.proxima_revisao_data));
    setProximaRevisaoKm(veiculo.proxima_revisao_km ? String(veiculo.proxima_revisao_km) : "");
    setProximaTrocaOleoData(dataIsoParaBr(veiculo.proxima_troca_oleo_data));
    setProximaTrocaOleoKm(veiculo.proxima_troca_oleo_km ? String(veiculo.proxima_troca_oleo_km) : "");
    buscarHistorico(veiculo);
  }

  async function salvarLembretes() {
    const dataRevisaoIso = proximaRevisaoData ? dataBrParaIso(proximaRevisaoData) : null;
    const dataOleoIso = proximaTrocaOleoData ? dataBrParaIso(proximaTrocaOleoData) : null;
    if ((proximaRevisaoData && !dataRevisaoIso) || (proximaTrocaOleoData && !dataOleoIso)) {
      confirmar("Data inválida", "Use o formato DD/MM/AAAA.");
      return;
    }
    const { error } = await supabase
      .from("veiculos")
      .update({
        proxima_revisao_data: dataRevisaoIso,
        proxima_revisao_km: proximaRevisaoKm ? Number(proximaRevisaoKm) : null,
        proxima_troca_oleo_data: dataOleoIso,
        proxima_troca_oleo_km: proximaTrocaOleoKm ? Number(proximaTrocaOleoKm) : null,
      })
      .eq("id", veiculoSelecionado.id);
    if (error) {
      confirmar("Não deu pra salvar", error.message);
      return;
    }
    confirmar("Salvo!", "Lembretes atualizados.");
    buscarVeiculos();
  }

  async function salvarManutencao() {
    if (!peca.trim() || !data.trim()) {
      confirmar("Preencha tudo", "Descrição e data são obrigatórios.");
      return;
    }
    const dataIso = dataBrParaIso(data);
    if (!dataIso) {
      confirmar("Data inválida", "Use o formato DD/MM/AAAA.");
      return;
    }
    setSalvando(true);
    try {
      const { error } = await supabase.from("manutencoes").insert({
        veiculo_id: veiculoSelecionado.id,
        tipo,
        peca: peca.trim(),
        data: dataIso,
        km: km ? Number(km) : null,
        oficina: oficina.trim() || null,
        valor: valor ? Number(valor.replace(",", ".")) : null,
      });
      if (error) throw error;
      setModalAberto(false);
      setPeca("");
      setData("");
      setKm("");
      setOficina("");
      setValor("");
      setTipo("peca");
      buscarHistorico(veiculoSelecionado);
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

  if (!veiculoSelecionado) {
    return (
      <SafeAreaView style={estilos.tela} edges={["top", "bottom"]}>
        <ScrollView contentContainerStyle={estilos.conteudo}>
          <View style={larguraWeb(680)}>
            <Text style={estilos.titulo}>Manutenção</Text>
            <Text style={estilos.subtitulo}>Escolha o veículo pra ver o histórico e os lembretes.</Text>
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
      </SafeAreaView>
    );
  }

  const diasRevisao = diasParaData(veiculoSelecionado.proxima_revisao_data);
  const kmRevisao = veiculoSelecionado.proxima_revisao_km
    ? veiculoSelecionado.proxima_revisao_km - veiculoSelecionado.km_atual
    : null;
  const diasOleo = diasParaData(veiculoSelecionado.proxima_troca_oleo_data);
  const kmOleo = veiculoSelecionado.proxima_troca_oleo_km
    ? veiculoSelecionado.proxima_troca_oleo_km - veiculoSelecionado.km_atual
    : null;

  const ultimaRevisao = historico.find((m) => m.tipo === "revisao");
  const ultimaTrocaOleo = historico.find((m) => m.tipo === "troca_oleo");

  return (
    <SafeAreaView style={estilos.tela} edges={["top", "bottom"]}>
      <ScrollView contentContainerStyle={estilos.conteudo}>
        <View style={larguraWeb(680)}>
          <TouchableOpacity onPress={() => setVeiculoSelecionado(null)} style={{ marginBottom: ESPACAMENTO.md }}>
            <Text style={estilos.link}>← Trocar veículo</Text>
          </TouchableOpacity>
          <Text style={estilos.titulo}>{veiculoSelecionado.marca} {veiculoSelecionado.modelo}</Text>

          <View style={estilos.linhaLembretes}>
            <View style={estilos.cartaoLembrete}>
              <Text style={estilos.rotuloLembrete}>Revisão</Text>
              <StatusLembrete diasFaltando={diasRevisao} kmFaltando={kmRevisao} />
              <Text style={estilos.notaLembrete}>
                Última: {ultimaRevisao ? dataIsoParaBr(ultimaRevisao.data) : "—"}
              </Text>
            </View>
            <View style={estilos.cartaoLembrete}>
              <Text style={estilos.rotuloLembrete}>Troca de óleo</Text>
              <StatusLembrete diasFaltando={diasOleo} kmFaltando={kmOleo} />
              <Text style={estilos.notaLembrete}>
                Última: {ultimaTrocaOleo ? dataIsoParaBr(ultimaTrocaOleo.data) : "—"}
              </Text>
            </View>
          </View>

          <Text style={estilos.rotuloSecao}>Definir próximos lembretes</Text>
          <View style={estilos.linhaDupla}>
            <TextInput
              style={[estilos.campo, { flex: 1 }]}
              placeholder="Próx. revisão (DD/MM/AAAA)"
              placeholderTextColor={cores.textoSecundario}
              keyboardType="number-pad"
              maxLength={10}
              value={proximaRevisaoData}
              onChangeText={(t) => setProximaRevisaoData(aplicarMascaraData(t))}
            />
            <TextInput
              style={[estilos.campo, { flex: 1 }]}
              placeholder="ou km"
              placeholderTextColor={cores.textoSecundario}
              keyboardType="number-pad"
              value={proximaRevisaoKm}
              onChangeText={setProximaRevisaoKm}
            />
          </View>
          <View style={estilos.linhaDupla}>
            <TextInput
              style={[estilos.campo, { flex: 1 }]}
              placeholder="Próx. troca óleo (DD/MM/AAAA)"
              placeholderTextColor={cores.textoSecundario}
              keyboardType="number-pad"
              maxLength={10}
              value={proximaTrocaOleoData}
              onChangeText={(t) => setProximaTrocaOleoData(aplicarMascaraData(t))}
            />
            <TextInput
              style={[estilos.campo, { flex: 1 }]}
              placeholder="ou km"
              placeholderTextColor={cores.textoSecundario}
              keyboardType="number-pad"
              value={proximaTrocaOleoKm}
              onChangeText={setProximaTrocaOleoKm}
            />
          </View>
          <TouchableOpacity style={estilos.botaoSecundario} onPress={salvarLembretes}>
            <Text style={estilos.botaoSecundarioTexto}>Salvar lembretes</Text>
          </TouchableOpacity>

          <View style={estilos.linhaSubtituloComBotao}>
            <Text style={estilos.rotuloSecao}>Histórico</Text>
            <TouchableOpacity style={estilos.botaoAdd} onPress={() => setModalAberto(true)}>
              <Text style={estilos.botaoAddTexto}>+ Registrar</Text>
            </TouchableOpacity>
          </View>

          {historico.length === 0 ? (
            <Text style={estilos.vazio}>Nenhum registro ainda.</Text>
          ) : (
            historico.map((m) => (
              <View key={m.id} style={estilos.cartaoHistorico}>
                <View style={{ flex: 1 }}>
                  <Text style={estilos.nomePeca}>{m.peca}</Text>
                  <Text style={estilos.detalheHistorico}>
                    {dataIsoParaBr(m.data)} {m.km ? `· ${Number(m.km).toLocaleString("pt-BR")} km` : ""} {m.oficina ? `· ${m.oficina}` : ""}
                  </Text>
                </View>
                <Text style={estilos.valorHistorico}>{formatarReais(m.valor)}</Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {modalAberto && (
        <View style={estilos.overlay}>
          <View style={[estilos.modal, larguraWeb(420)]}>
            <Text style={estilos.tituloModal}>Novo registro</Text>

            <View style={estilos.linhaTipo}>
              {TIPOS_MANUTENCAO.map((t) => (
                <TouchableOpacity
                  key={t.id}
                  style={[estilos.opcaoTipo, tipo === t.id && estilos.opcaoTipoAtiva]}
                  onPress={() => setTipo(t.id)}
                >
                  <Text style={tipo === t.id ? estilos.opcaoTipoTextoAtivo : estilos.opcaoTipoTexto}>{t.rotulo}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={estilos.campo}
              placeholder="Descrição (ex: Pastilha de freio dianteira)"
              placeholderTextColor={cores.textoSecundario}
              value={peca}
              onChangeText={setPeca}
            />
            <TextInput
              style={estilos.campo}
              placeholder="Data (DD/MM/AAAA)"
              placeholderTextColor={cores.textoSecundario}
              keyboardType="number-pad"
              maxLength={10}
              value={data}
              onChangeText={(t) => setData(aplicarMascaraData(t))}
            />
            <TextInput
              style={estilos.campo}
              placeholder="Km no momento (opcional)"
              placeholderTextColor={cores.textoSecundario}
              keyboardType="number-pad"
              value={km}
              onChangeText={setKm}
            />
            <TextInput
              style={estilos.campo}
              placeholder="Oficina (opcional)"
              placeholderTextColor={cores.textoSecundario}
              value={oficina}
              onChangeText={setOficina}
            />
            <TextInput
              style={estilos.campo}
              placeholder="Valor (opcional)"
              placeholderTextColor={cores.textoSecundario}
              keyboardType="decimal-pad"
              value={valor}
              onChangeText={setValor}
            />

            <View style={estilos.linhaBotoesModal}>
              <TouchableOpacity style={estilos.botaoCancelar} onPress={() => setModalAberto(false)}>
                <Text style={estilos.botaoCancelarTexto}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={estilos.botaoSalvar} onPress={salvarManutencao} disabled={salvando}>
                {salvando ? <ActivityIndicator color="#FFF" /> : <Text style={estilos.botaoSalvarTexto}>Salvar</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

function criarEstilos(cores) {
  return StyleSheet.create({
    tela: { flex: 1, backgroundColor: cores.fundo },
    conteudo: { alignItems: "center", padding: ESPACAMENTO.lg, paddingBottom: ESPACAMENTO.xxl },
    titulo: { fontSize: 20, color: cores.texto, fontFamily: FONTES.bold, marginBottom: ESPACAMENTO.xs },
    subtitulo: { fontSize: 13, color: cores.textoSecundario, marginBottom: ESPACAMENTO.lg, fontFamily: FONTES.regular },
    link: { color: cores.primaria, fontSize: 13, fontFamily: FONTES.semiBold },
    vazio: { color: cores.textoSecundario, textAlign: "center", marginTop: ESPACAMENTO.xl, fontFamily: FONTES.regular },
    cartaoVeiculo: {
      flexDirection: "row",
      alignItems: "center",
      gap: ESPACAMENTO.md,
      backgroundColor: cores.card,
      borderRadius: RAIO.lg,
      borderWidth: 1,
      borderColor: cores.borda,
      padding: ESPACAMENTO.md,
      marginBottom: ESPACAMENTO.md,
      ...SOMBRA,
    },
    nomeVeiculo: { fontSize: 14, color: cores.texto, fontFamily: FONTES.semiBold },
    detalheVeiculo: { fontSize: 12, color: cores.textoSecundario, fontFamily: FONTES.regular },
    linhaLembretes: { flexDirection: "row", gap: ESPACAMENTO.md, marginTop: ESPACAMENTO.md, marginBottom: ESPACAMENTO.lg },
    cartaoLembrete: {
      flex: 1,
      backgroundColor: cores.card,
      borderRadius: RAIO.lg,
      borderWidth: 1,
      borderColor: cores.borda,
      padding: ESPACAMENTO.md,
      gap: ESPACAMENTO.xs,
      ...SOMBRA,
    },
    rotuloLembrete: { fontSize: 13, color: cores.texto, fontFamily: FONTES.semiBold },
    notaLembrete: { fontSize: 11, color: cores.textoSecundario, marginTop: 2, fontFamily: FONTES.regular },
    rotuloSecao: { fontSize: 15, color: cores.texto, fontFamily: FONTES.bold, marginTop: ESPACAMENTO.md, marginBottom: ESPACAMENTO.sm },
    linhaSubtituloComBotao: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    botaoAdd: { backgroundColor: cores.primaria, borderRadius: RAIO.pill, paddingHorizontal: ESPACAMENTO.md, paddingVertical: 6 },
    botaoAddTexto: { color: "#FFF", fontSize: 12, fontFamily: FONTES.semiBold },
    linhaDupla: { flexDirection: "row", gap: ESPACAMENTO.sm },
    campo: {
      borderWidth: 1,
      borderColor: cores.borda,
      backgroundColor: cores.card,
      borderRadius: RAIO.md,
      paddingHorizontal: ESPACAMENTO.lg,
      paddingVertical: ESPACAMENTO.md,
      fontSize: 14,
      color: cores.texto,
      marginBottom: ESPACAMENTO.md,
      fontFamily: FONTES.regular,
    },
    botaoSecundario: {
      borderWidth: 1.5,
      borderColor: cores.primaria,
      borderRadius: RAIO.pill,
      paddingVertical: ESPACAMENTO.sm,
      alignItems: "center",
      marginBottom: ESPACAMENTO.lg,
    },
    botaoSecundarioTexto: { color: cores.primaria, fontSize: 13, fontFamily: FONTES.semiBold },
    cartaoHistorico: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: cores.card,
      borderRadius: RAIO.lg,
      borderWidth: 1,
      borderColor: cores.borda,
      padding: ESPACAMENTO.md,
      marginBottom: ESPACAMENTO.sm,
    },
    nomePeca: { fontSize: 13.5, color: cores.texto, fontFamily: FONTES.semiBold },
    detalheHistorico: { fontSize: 11.5, color: cores.textoSecundario, marginTop: 2, fontFamily: FONTES.regular },
    valorHistorico: { fontSize: 13, color: cores.primaria, fontFamily: FONTES.bold },
    overlay: {
      position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: "rgba(0,0,0,0.4)", alignItems: "center", justifyContent: "center", padding: ESPACAMENTO.lg,
    },
    modal: { width: "100%", backgroundColor: cores.card, borderRadius: RAIO.xl, padding: ESPACAMENTO.xl },
    tituloModal: { fontSize: 17, color: cores.texto, fontFamily: FONTES.bold, marginBottom: ESPACAMENTO.md },
    linhaTipo: { flexDirection: "row", gap: 6, marginBottom: ESPACAMENTO.md },
    opcaoTipo: { flex: 1, borderWidth: 1, borderColor: cores.borda, borderRadius: RAIO.pill, paddingVertical: 8, alignItems: "center" },
    opcaoTipoAtiva: { backgroundColor: cores.primariaClara, borderColor: cores.primaria },
    opcaoTipoTexto: { color: cores.textoSecundario, fontSize: 10.5, fontFamily: FONTES.medium },
    opcaoTipoTextoAtivo: { color: cores.primaria, fontSize: 10.5, fontFamily: FONTES.semiBold },
    linhaBotoesModal: { flexDirection: "row", gap: ESPACAMENTO.md, marginTop: ESPACAMENTO.sm },
    botaoCancelar: { flex: 1, alignItems: "center", paddingVertical: ESPACAMENTO.md },
    botaoCancelarTexto: { color: cores.textoSecundario, fontFamily: FONTES.semiBold },
    botaoSalvar: { flex: 1, backgroundColor: cores.primaria, borderRadius: RAIO.pill, alignItems: "center", paddingVertical: ESPACAMENTO.md },
    botaoSalvarTexto: { color: "#FFF", fontFamily: FONTES.semiBold },
  });
}
