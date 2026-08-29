// Barra de abas inferior com um círculo colorido que desliza
// (translateX) até a aba tocada, com uma animação de "aperta e volta"
// (scale) no toque -- mesmo comportamento do Marcato PDV, adaptado
// pra um componente reutilizável (recebe as abas por prop em vez de
// fixas). Só anima translateX/scale, nunca backgroundColor/sombra por
// aba (isso trava performance).
import React, { useEffect, useRef, useState } from "react";
import { View, Text, TouchableOpacity, Animated, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useCores, ESPACAMENTO, RAIO, FONTES, SOMBRA_ALTA } from "../theme/estilos";

const CIRCULO_DIAMETRO = 56;
const TABBAR_PADDING = 6;
const TABBAR_GAP = 4;

export default function BarraInferior({ abas, abaAtiva, onSelecionar }) {
  const cores = useCores();
  const [larguraBarra, setLarguraBarra] = useState(0);

  const circuloX = useRef(new Animated.Value(0)).current;
  const circuloEscala = useRef(new Animated.Value(1)).current;

  function xAlvoDoIndice(indice, largura) {
    const largoItem = (largura - TABBAR_PADDING * 2 - TABBAR_GAP * (abas.length - 1)) / abas.length;
    const x = TABBAR_PADDING + indice * (largoItem + TABBAR_GAP);
    return x + largoItem / 2 - CIRCULO_DIAMETRO / 2;
  }

  function selecionarAba(item) {
    Animated.sequence([
      Animated.timing(circuloEscala, { toValue: 0.9, duration: 90, useNativeDriver: true }),
      Animated.spring(circuloEscala, { toValue: 1, friction: 4, tension: 120, useNativeDriver: true }),
    ]).start();
    onSelecionar(item.id);
  }

  useEffect(() => {
    if (!larguraBarra) return;
    const indice = abas.findIndex((item) => item.id === abaAtiva);
    circuloX.setValue(xAlvoDoIndice(Math.max(indice, 0), larguraBarra));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [larguraBarra]);

  useEffect(() => {
    if (!larguraBarra) return;
    const indice = abas.findIndex((item) => item.id === abaAtiva);
    Animated.spring(circuloX, {
      toValue: xAlvoDoIndice(Math.max(indice, 0), larguraBarra),
      friction: 8,
      tension: 80,
      useNativeDriver: true,
    }).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abaAtiva]);

  const abaAtivaInfo = abas.find((item) => item.id === abaAtiva);
  const estilos = criarEstilos(cores);

  return (
    <View style={estilos.tabBarWrap}>
      <View style={estilos.tabBar} onLayout={(e) => setLarguraBarra(e.nativeEvent.layout.width)}>
        {abas.map((item) => {
          const ativo = abaAtiva === item.id;
          if (ativo) return <View key={item.id} style={estilos.tabItem} />;
          return (
            <TouchableOpacity key={item.id} style={estilos.tabItem} onPress={() => selecionarAba(item)}>
              <Ionicons name={item.icone} size={21} color={cores.textoSecundario} />
              <Text style={estilos.tabText}>{item.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Animated.View
        style={[estilos.floatWrap, { transform: [{ translateX: circuloX }] }]}
        pointerEvents="box-none"
      >
        <Animated.View style={{ transform: [{ scale: circuloEscala }] }}>
          <View style={estilos.circuloBotao}>
            <Ionicons name={abaAtivaInfo?.iconeAtivo} size={26} color="#FFFFFF" />
          </View>
        </Animated.View>
        <Text style={estilos.floatTexto}>{abaAtivaInfo?.label}</Text>
      </Animated.View>
    </View>
  );
}

function criarEstilos(cores) {
  return StyleSheet.create({
    tabBarWrap: { position: "relative", paddingHorizontal: ESPACAMENTO.lg, paddingTop: 6, paddingBottom: 22 },
    tabBar: {
      flexDirection: "row",
      alignItems: "center",
      borderRadius: RAIO.pill,
      borderWidth: 1,
      borderColor: cores.borda,
      backgroundColor: cores.card,
      paddingVertical: 6,
      paddingHorizontal: TABBAR_PADDING,
      gap: TABBAR_GAP,
      ...SOMBRA_ALTA,
    },
    tabItem: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 7, gap: 3 },
    tabText: { fontSize: 11, color: cores.textoSecundario, fontFamily: FONTES.regular },
    floatWrap: { position: "absolute", top: -22, left: 0, width: CIRCULO_DIAMETRO, alignItems: "center", gap: 3 },
    circuloBotao: {
      width: CIRCULO_DIAMETRO,
      height: CIRCULO_DIAMETRO,
      borderRadius: CIRCULO_DIAMETRO / 2,
      backgroundColor: cores.primaria,
      borderWidth: 3,
      borderColor: cores.fundo,
      alignItems: "center",
      justifyContent: "center",
    },
    floatTexto: { fontSize: 10, color: cores.primaria, fontFamily: FONTES.semiBold },
  });
}
