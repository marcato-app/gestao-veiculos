import React, { useState } from "react";
import { View, ActivityIndicator, TouchableOpacity, Text } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useFonts, Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold, Poppins_700Bold } from "@expo-google-fonts/poppins";
import { AuthProvider, useAuth } from "./theme/AuthContext";
import { useCores, FONTES, ESPACAMENTO } from "./theme/estilos";
import AuthScreen from "./screens/AuthScreen";
import ResetPasswordScreen from "./screens/ResetPasswordScreen";
import VeiculosScreen from "./screens/VeiculosScreen";
import ManutencaoScreen from "./screens/ManutencaoScreen";
import AbastecimentoScreen from "./screens/AbastecimentoScreen";
import MuralScreen from "./screens/MuralScreen";
import TransferenciaScreen from "./screens/TransferenciaScreen";
import ComunidadeScreen from "./screens/ComunidadeScreen";
import PerfilScreen from "./screens/PerfilScreen";
import BarraInferior from "./components/BarraInferior";

const ABAS = [
  { id: "veiculos", label: "Veículos", icone: "car-outline", iconeAtivo: "car" },
  { id: "manutencao", label: "Manut.", icone: "construct-outline", iconeAtivo: "construct" },
  { id: "abastecimento", label: "Postos", icone: "water-outline", iconeAtivo: "water" },
  { id: "mural", label: "Mural", icone: "pricetags-outline", iconeAtivo: "pricetags" },
  { id: "perfil", label: "Perfil", icone: "person-outline", iconeAtivo: "person" },
];

function AppAutenticado() {
  const cores = useCores();
  const [abaAtiva, setAbaAtiva] = useState("veiculos");
  const [telaExtra, setTelaExtra] = useState(null); // null | "transferencias" | "comunidade"

  if (telaExtra) {
    return (
      <View style={{ flex: 1, backgroundColor: cores.fundo }}>
        <SafeAreaView edges={["top"]} style={{ paddingHorizontal: ESPACAMENTO.lg, paddingTop: ESPACAMENTO.sm }}>
          <TouchableOpacity onPress={() => setTelaExtra(null)}>
            <Text style={{ color: cores.primaria, fontSize: 14, fontFamily: FONTES.semiBold }}>← Voltar ao app</Text>
          </TouchableOpacity>
        </SafeAreaView>
        <View style={{ flex: 1 }}>
          {telaExtra === "transferencias" && <TransferenciaScreen />}
          {telaExtra === "comunidade" && <ComunidadeScreen />}
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: cores.fundo }}>
      <View style={{ flex: 1 }}>
        {abaAtiva === "veiculos" && <VeiculosScreen />}
        {abaAtiva === "manutencao" && <ManutencaoScreen />}
        {abaAtiva === "abastecimento" && <AbastecimentoScreen />}
        {abaAtiva === "mural" && <MuralScreen />}
        {abaAtiva === "perfil" && (
          <PerfilScreen
            onAbrirTransferencias={() => setTelaExtra("transferencias")}
            onAbrirComunidade={() => setTelaExtra("comunidade")}
          />
        )}
      </View>
      <BarraInferior abas={ABAS} abaAtiva={abaAtiva} onSelecionar={setAbaAtiva} />
    </View>
  );
}

function Raiz() {
  const cores = useCores();
  const { session, loading, recuperandoSenha } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: cores.fundo }}>
        <ActivityIndicator color={cores.primaria} />
      </View>
    );
  }

  if (recuperandoSenha) {
    return <ResetPasswordScreen />;
  }

  if (!session) {
    return <AuthScreen />;
  }

  return <AppAutenticado />;
}

export default function App() {
  const [fontesProntas] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  if (!fontesProntas) {
    return (
      <SafeAreaProvider>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#F5F4F0" }}>
          <ActivityIndicator color="#6C3CE9" />
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="auto" />
      <AuthProvider>
        <Raiz />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
