import React, { createContext, useContext, useEffect, useState } from "react";
import * as Linking from "expo-linking";
import { supabase } from "../lib/supabaseClient";

const AuthContext = createContext({
  session: null,
  user: null,
  loading: true,
  recuperandoSenha: false,
  signIn: async () => {},
  signUp: async () => {},
  signOut: async () => {},
  resetPassword: async () => {},
  atualizarSenha: async () => {},
  cancelarRecuperacaoSenha: () => {},
});

function extrairTokensDoLink(url) {
  if (!url) return null;
  const hashIndex = url.indexOf("#");
  const queryIndex = url.indexOf("?");
  const parteParams =
    hashIndex >= 0 ? url.slice(hashIndex + 1) : queryIndex >= 0 ? url.slice(queryIndex + 1) : "";
  if (!parteParams) return null;

  const params = new URLSearchParams(parteParams);
  const access_token = params.get("access_token");
  const refresh_token = params.get("refresh_token");
  const type = params.get("type");
  if (access_token && refresh_token) {
    return { access_token, refresh_token, type };
  }
  return null;
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [recuperandoSenha, setRecuperandoSenha] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const { data: assinatura } = supabase.auth.onAuthStateChange((evento, novaSessao) => {
      setSession(novaSessao);
      if (evento === "PASSWORD_RECOVERY") {
        setRecuperandoSenha(true);
      }
    });

    async function tratarUrl(url) {
      const tokens = extrairTokensDoLink(url);
      if (!tokens) return;
      const { error } = await supabase.auth.setSession({
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
      });
      if (!error && tokens.type === "recovery") {
        setRecuperandoSenha(true);
      }
    }

    Linking.getInitialURL().then(tratarUrl);
    const assinaturaLink = Linking.addEventListener("url", ({ url }) => tratarUrl(url));

    return () => {
      assinatura.subscription.unsubscribe();
      assinaturaLink.remove();
    };
  }, []);

  async function signIn(email, senha) {
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
    if (error) throw error;
  }

  async function signUp(email, senha, dadosPerfil) {
    const { error } = await supabase.auth.signUp({
      email,
      password: senha,
      options: { data: dadosPerfil },
    });
    if (error) throw error;
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  async function resetPassword(email) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: Linking.createURL("redefinir-senha"),
    });
    if (error) throw error;
  }

  async function atualizarSenha(novaSenha) {
    const { error } = await supabase.auth.updateUser({ password: novaSenha });
    if (error) throw error;
    setRecuperandoSenha(false);
  }

  function cancelarRecuperacaoSenha() {
    setRecuperandoSenha(false);
    supabase.auth.signOut();
  }

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        loading,
        recuperandoSenha,
        signIn,
        signUp,
        signOut,
        resetPassword,
        atualizarSenha,
        cancelarRecuperacaoSenha,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
