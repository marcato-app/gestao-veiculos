import React, { useCallback, useEffect, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../theme/AuthContext";
import { supabase } from "../lib/supabaseClient";
import { useCores, ESPACAMENTO, RAIO, SOMBRA, larguraWeb, FONTES } from "../theme/estilos";
import { confirmar } from "../lib/confirmar";
import VeiculoFormScreen from "./VeiculoFormScreen";

export default function VeiculosScreen() {
  const cores = useCores();
  const { user } = useAuth();
  const [veiculos, setVeiculos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [telaFormulario, setTelaFormulario] = useState(null); // null | "novo" | veiculoId

  const buscar = useCallback(async () => {
    if (!user) return;
    setCarregando(true);
    const { data: dadosVeiculos } = await supabase
      .from("veiculos")
      .select("*")
      .eq("usuario_id", user.id)
      .order("criado_em", { ascending: false });

    const listaVeiculos = dadosVeiculos || [];
    if (listaVeiculos.length > 0) {
      const { data: dadosFotos } = await supabase
        .from("fotos_veiculo")
        .select("*")
        .in("veiculo_id", listaVeiculos.map((v) => v.id))
        .eq("tipo", "frente");
      const fotoPorVeiculo = Object.fromEntries((dadosFotos || []).map((f) => [f.veiculo_id, f.foto_url]));
      setVeiculos(listaVeiculos.map((v) => ({ ...v, fotoCapa: fotoPorVeiculo[v.id] || null })));
    } else {
      setVeiculos([]);
    }
    setCarregando(false);
  }, [user]);

  useEffect(() => {
    buscar();
  }, [buscar]);

  function excluirVeiculo(veiculo) {
    confirmar("Remover veículo", `Remover "${veiculo.marca} ${veiculo.modelo}" e todas as fotos/documentos dele?`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Remover",
        style: "destructive",
        onPress: async () => {
          const { error } = await supabase.from("veiculos").delete().eq("id", veiculo.id);
          if (error) confirmar("Não deu pra remover", error.message);
          else buscar();
        },
      },
    ]);
  }

  const estilos = criarEstilos(cores);

  if (telaFormulario !== null) {
    return (
      <VeiculoFormScreen
        veiculoId={telaFormulario === "novo" ? null : telaFormulario}
        onVoltar={() => {
          setTelaFormulario(null);
          buscar();
        }}
        onSalvo={buscar}
      />
    );
  }

  const kmTotal = veiculos.reduce((soma, v) => soma + Number(v.km_atual || 0), 0);

  return (
    <SafeAreaView style={estilos.tela} edges={["top", "bottom"]}>
      <ScrollView contentContainerStyle={estilos.conteudo}>
        <View style={larguraWeb(680)}>
          <View style={estilos.cabecalho}>
            <Text style={estilos.titulo}>Seus veículos</Text>
            <TouchableOpacity style={estilos.botaoNovo} onPress={() => setTelaFormulario("novo")}>
              <Text style={estilos.botaoNovoTexto}>+ Adicionar</Text>
            </TouchableOpacity>
          </View>

          {carregando ? (
            <ActivityIndicator color={cores.primaria} style={{ marginTop: ESPACAMENTO.xl }} />
          ) : (
            <>
              <View style={estilos.linhaKpis}>
                <View style={estilos.kpi}>
                  <Text style={estilos.kpiValor}>{veiculos.length}</Text>
                  <Text style={estilos.kpiRotulo}>Veículo{veiculos.length === 1 ? "" : "s"}</Text>
                </View>
                <View style={estilos.kpi}>
                  <Text style={estilos.kpiValor}>{kmTotal.toLocaleString("pt-BR")}</Text>
                  <Text style={estilos.kpiRotulo}>Km total</Text>
                </View>
              </View>

              {veiculos.length === 0 ? (
                <Text style={estilos.vazio}>Nenhum veículo cadastrado ainda. Toque em "+ Adicionar" pra começar.</Text>
              ) : (
                veiculos.map((v) => (
                  <TouchableOpacity key={v.id} style={estilos.cartaoVeiculo} onPress={() => setTelaFormulario(v.id)}>
                    {v.fotoCapa ? (
                      <Image source={{ uri: v.fotoCapa }} style={estilos.fotoVeiculo} />
                    ) : (
                      <View style={estilos.fotoVeiculoVazia}>
                        <Text style={{ fontSize: 22 }}>{v.tipo === "moto" ? "🏍️" : "🚗"}</Text>
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={estilos.nomeVeiculo}>{v.marca} {v.modelo}</Text>
                      <Text style={estilos.detalheVeiculo}>{v.placa} · {v.ano || "—"} · {v.cor || "sem cor"}</Text>
                      <Text style={estilos.kmVeiculo}>{Number(v.km_atual).toLocaleString("pt-BR")} km</Text>
                    </View>
                    <TouchableOpacity onPress={() => excluirVeiculo(v)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                      <Text style={estilos.acaoRemover}>Remover</Text>
                    </TouchableOpacity>
                  </TouchableOpacity>
                ))
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
    cabecalho: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: ESPACAMENTO.lg },
    titulo: { fontSize: 22, color: cores.texto, fontFamily: FONTES.bold },
    botaoNovo: { backgroundColor: cores.primaria, borderRadius: RAIO.pill, paddingHorizontal: ESPACAMENTO.lg, paddingVertical: ESPACAMENTO.sm },
    botaoNovoTexto: { color: "#FFF", fontSize: 13, fontFamily: FONTES.semiBold },
    linhaKpis: { flexDirection: "row", gap: ESPACAMENTO.md, marginBottom: ESPACAMENTO.lg },
    kpi: {
      flex: 1,
      backgroundColor: cores.card,
      borderRadius: RAIO.lg,
      borderWidth: 1,
      borderColor: cores.borda,
      padding: ESPACAMENTO.md,
      alignItems: "center",
      ...SOMBRA,
    },
    kpiValor: { fontSize: 20, color: cores.texto, fontFamily: FONTES.bold },
    kpiRotulo: { fontSize: 11, color: cores.textoSecundario, marginTop: 4, fontFamily: FONTES.regular },
    vazio: { color: cores.textoSecundario, textAlign: "center", marginTop: ESPACAMENTO.xxl, fontFamily: FONTES.regular },
    cartaoVeiculo: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: cores.card,
      borderRadius: RAIO.lg,
      borderWidth: 1,
      borderColor: cores.borda,
      padding: ESPACAMENTO.md,
      marginBottom: ESPACAMENTO.md,
      gap: ESPACAMENTO.md,
      ...SOMBRA,
    },
    fotoVeiculo: { width: 56, height: 56, borderRadius: RAIO.md },
    fotoVeiculoVazia: {
      width: 56,
      height: 56,
      borderRadius: RAIO.md,
      backgroundColor: cores.primariaClara,
      alignItems: "center",
      justifyContent: "center",
    },
    nomeVeiculo: { fontSize: 15, color: cores.texto, fontFamily: FONTES.semiBold },
    detalheVeiculo: { fontSize: 12.5, color: cores.textoSecundario, marginTop: 2, fontFamily: FONTES.regular },
    kmVeiculo: { fontSize: 12.5, color: cores.primaria, marginTop: 4, fontFamily: FONTES.semiBold },
    acaoRemover: { fontSize: 11.5, color: cores.erro, fontFamily: FONTES.semiBold },
  });
}
