import React, { useState } from "react";
import { View, ActivityIndicator } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useFonts, Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold, Poppins_700Bold } from "@expo-google-fonts/poppins";
import { AuthProvider, useAuth } from "./theme/AuthContext";
import { useCores } from "./theme/estilos";
import AuthScreen from "./screens/AuthScreen";
import ResetPasswordScreen from "./screens/ResetPasswordScreen";
import VeiculosScreen from "./screens/VeiculosScreen";
import PerfilScreen from "./screens/PerfilScreen";
import BarraInferior from "./components/BarraInferior";

const ABAS = [
  { id: "veiculos", label: "Veículos", icone: "car-outline", iconeAtivo: "car" },
  { id: "perfil", label: "Perfil", icone: "person-outline", iconeAtivo: "person" },
];

function AppAutenticado() {
  const cores = useCores();
  const [abaAtiva, setAbaAtiva] = useState("veiculos");

  return (
    <View style={{ flex: 1, backgroundColor: cores.fundo }}>
      <View style={{ flex: 1 }}>
        {abaAtiva === "veiculos" && <VeiculosScreen />}
        {abaAtiva === "perfil" && <PerfilScreen />}
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
