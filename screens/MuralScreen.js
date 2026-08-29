import React, { useCallback, useEffect, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../theme/AuthContext";
import { supabase } from "../lib/supabaseClient";
import { useCores, ESPACAMENTO, RAIO, SOMBRA, larguraWeb, FONTES } from "../theme/estilos";
import { confirmar } from "../lib/confirmar";
import ChatDetalheScreen from "./ChatDetalheScreen";

function formatarReais(valor) {
  return `R$ ${Number(valor).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
}

export default function MuralScreen() {
  const cores = useCores();
  const { user } = useAuth();
  const [aba, setAba] = useState("comprar");
  const [conversaAberta, setConversaAberta] = useState(null);
  const estilos = criarEstilos(cores);

  if (conversaAberta) {
    return <ChatDetalheScreen conversa={conversaAberta} user={user} onVoltar={() => setConversaAberta(null)} />;
  }

  return (
    <SafeAreaView style={estilos.tela} edges={["top", "bottom"]}>
      <View style={larguraWeb(680)}>
        <View style={estilos.segmentado}>
          {[
            { id: "comprar", rotulo: "Comprar" },
            { id: "anunciar", rotulo: "Anunciar" },
            { id: "mensagens", rotulo: "Mensagens" },
          ].map((s) => (
            <TouchableOpacity key={s.id} style={[estilos.segItem, aba === s.id && estilos.segAtivo]} onPress={() => setAba(s.id)}>
              <Text style={aba === s.id ? estilos.segTextoAtivo : estilos.segTexto}>{s.rotulo}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      {aba === "comprar" && <SecaoComprar cores={cores} user={user} onAbrirConversa={setConversaAberta} />}
      {aba === "anunciar" && <SecaoAnunciar cores={cores} user={user} />}
      {aba === "mensagens" && <SecaoMensagens cores={cores} user={user} onAbrirConversa={setConversaAberta} />}
    </SafeAreaView>
  );
}

function SecaoComprar({ cores, user, onAbrirConversa }) {
  const [anuncios, setAnuncios] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [busca, setBusca] = useState("");
  const [detalheAberto, setDetalheAberto] = useState(null);

  const buscar = useCallback(async () => {
    setCarregando(true);
    const { data } = await supabase.from("anuncios_publico").select("*").order("criado_em", { ascending: false });
    setAnuncios((data || []).filter((a) => a.vendedor_id !== user.id));
    setCarregando(false);
  }, [user]);

  useEffect(() => {
    buscar();
  }, [buscar]);

  const filtrados = anuncios.filter((a) => {
    if (filtroTipo !== "todos" && a.tipo !== filtroTipo) return false;
    if (busca.trim() && !`${a.marca} ${a.modelo}`.toLowerCase().includes(busca.trim().toLowerCase())) return false;
    return true;
  });

  async function iniciarConversa(anuncio) {
    const { data: existente } = await supabase
      .from("conversas")
      .select("*")
      .eq("anuncio_id", anuncio.anuncio_id)
      .eq("comprador_id", user.id)
      .maybeSingle();

    let conversa = existente;
    if (!conversa) {
      const { data: nova, error } = await supabase
        .from("conversas")
        .insert({ anuncio_id: anuncio.anuncio_id, comprador_id: user.id, vendedor_id: anuncio.vendedor_id })
        .select()
        .single();
      if (error) {
        confirmar("Não deu pra iniciar a conversa", error.message);
        return;
      }
      conversa = nova;
    }
    onAbrirConversa({ ...conversa, vendedor_nome: anuncio.vendedor_nome, comprador_nome: "Você" });
  }

  const estilos = criarEstilos(cores);

  return (
    <>
      <ScrollView contentContainerStyle={estilos.conteudo}>
        <View style={larguraWeb(680)}>
          <View style={estilos.linhaFiltro}>
            {["todos", "carro", "moto"].map((t) => (
              <TouchableOpacity key={t} style={[estilos.chipFiltro, filtroTipo === t && estilos.chipFiltroAtivo]} onPress={() => setFiltroTipo(t)}>
                <Text style={filtroTipo === t ? estilos.chipFiltroTextoAtivo : estilos.chipFiltroTexto}>
                  {t === "todos" ? "Todos" : t === "carro" ? "🚗 Carro" : "🏍️ Moto"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <TextInput
            style={estilos.campoBusca}
            placeholder="Buscar por marca ou modelo..."
            placeholderTextColor={cores.textoSecundario}
            value={busca}
            onChangeText={setBusca}
          />

          {carregando ? (
            <ActivityIndicator color={cores.primaria} style={{ marginTop: ESPACAMENTO.xl }} />
          ) : filtrados.length === 0 ? (
            <Text style={estilos.vazio}>Nenhum anúncio encontrado.</Text>
          ) : (
            filtrados.map((a) => (
              <TouchableOpacity key={a.anuncio_id} style={estilos.cartaoAnuncio} onPress={() => setDetalheAberto(a)}>
                {a.foto_capa ? (
                  <Image source={{ uri: a.foto_capa }} style={estilos.fotoAnuncio} />
                ) : (
                  <View style={estilos.fotoAnuncioVazia}>
                    <Text style={{ fontSize: 20 }}>{a.tipo === "moto" ? "🏍️" : "🚗"}</Text>
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={estilos.nomeAnuncio}>{a.marca} {a.modelo}</Text>
                  <Text style={estilos.detalheAnuncio}>{a.ano} · {a.cor} · {Number(a.km_atual).toLocaleString("pt-BR")} km</Text>
                  <Text style={estilos.precoAnuncio}>{formatarReais(a.preco)}</Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>

      {detalheAberto && (
        <View style={estilos.overlay}>
          <View style={[estilos.modal, larguraWeb(420)]}>
            {detalheAberto.foto_capa && <Image source={{ uri: detalheAberto.foto_capa }} style={estilos.fotoDetalhe} />}
            <Text style={estilos.tituloModal}>{detalheAberto.marca} {detalheAberto.modelo}</Text>
            <Text style={estilos.detalheAnuncio}>{detalheAberto.ano} · {detalheAberto.cor} · {Number(detalheAberto.km_atual).toLocaleString("pt-BR")} km</Text>
            <Text style={estilos.precoAnuncio}>{formatarReais(detalheAberto.preco)}</Text>
            {detalheAberto.descricao ? <Text style={estilos.descricaoAnuncio}>{detalheAberto.descricao}</Text> : null}
            <Text style={estilos.vendedorAnuncio}>Vendedor: {detalheAberto.vendedor_nome}</Text>
            <View style={estilos.linhaBotoesModal}>
              <TouchableOpacity style={estilos.botaoCancelar} onPress={() => setDetalheAberto(null)}>
                <Text style={estilos.botaoCancelarTexto}>Fechar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={estilos.botaoSalvar} onPress={() => iniciarConversa(detalheAberto)}>
                <Text style={estilos.botaoSalvarTexto}>Conversar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </>
  );
}

function SecaoAnunciar({ cores, user }) {
  const [veiculos, setVeiculos] = useState([]);
  const [anuncios, setAnuncios] = useState({});
  const [carregando, setCarregando] = useState(true);
  const [modalAberto, setModalAberto] = useState(null);
  const [preco, setPreco] = useState("");
  const [descricao, setDescricao] = useState("");
  const [salvando, setSalvando] = useState(false);

  const buscar = useCallback(async () => {
    if (!user) return;
    setCarregando(true);
    const { data: dadosVeiculos } = await supabase.from("veiculos").select("*").eq("usuario_id", user.id);
    const { data: dadosAnuncios } = await supabase
      .from("anuncios")
      .select("*")
      .in("veiculo_id", (dadosVeiculos || []).map((v) => v.id));
    setVeiculos(dadosVeiculos || []);
    setAnuncios(Object.fromEntries((dadosAnuncios || []).map((a) => [a.veiculo_id, a])));
    setCarregando(false);
  }, [user]);

  useEffect(() => {
    buscar();
  }, [buscar]);

  function abrirAnunciar(veiculo) {
    const existente = anuncios[veiculo.id];
    setPreco(existente ? String(existente.preco) : "");
    setDescricao(existente ? existente.descricao || "" : "");
    setModalAberto(veiculo);
  }

  async function salvarAnuncio() {
    if (!preco.trim()) {
      confirmar("Preencha o preço", "Informe o preço de venda.");
      return;
    }
    setSalvando(true);
    try {
      const existente = anuncios[modalAberto.id];
      const dados = { preco: Number(preco.replace(",", ".")), descricao: descricao.trim() || null, ativo: true };
      if (existente) {
        const { error } = await supabase.from("anuncios").update(dados).eq("id", existente.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("anuncios").insert({ ...dados, veiculo_id: modalAberto.id });
        if (error) throw error;
      }
      setModalAberto(null);
      buscar();
    } catch (e) {
      confirmar("Não deu pra salvar", e.message || String(e));
    } finally {
      setSalvando(false);
    }
  }

  async function desativarAnuncio(veiculo) {
    const existente = anuncios[veiculo.id];
    if (!existente) return;
    const { error } = await supabase.from("anuncios").update({ ativo: false }).eq("id", existente.id);
    if (error) confirmar("Não deu pra desativar", error.message);
    else buscar();
  }

  const estilos = criarEstilos(cores);

  return (
    <>
      <ScrollView contentContainerStyle={estilos.conteudo}>
        <View style={larguraWeb(680)}>
          <Text style={estilos.subtitulo}>Escolha um veículo pra anunciar no mural.</Text>
          {carregando ? (
            <ActivityIndicator color={cores.primaria} />
          ) : veiculos.length === 0 ? (
            <Text style={estilos.vazio}>Cadastre um veículo primeiro na aba Veículos.</Text>
          ) : (
            veiculos.map((v) => {
              const anuncio = anuncios[v.id];
              return (
                <View key={v.id} style={estilos.cartaoVeiculo}>
                  <Text style={{ fontSize: 20 }}>{v.tipo === "moto" ? "🏍️" : "🚗"}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={estilos.nomeVeiculo}>{v.marca} {v.modelo}</Text>
                    <Text style={estilos.detalheVeiculo}>
                      {anuncio?.ativo ? `À venda · ${formatarReais(anuncio.preco)}` : "Não anunciado"}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => abrirAnunciar(v)}>
                    <Text style={estilos.link}>{anuncio?.ativo ? "Editar" : "Anunciar"}</Text>
                  </TouchableOpacity>
                  {anuncio?.ativo && (
                    <TouchableOpacity onPress={() => desativarAnuncio(v)}>
                      <Text style={[estilos.link, { color: cores.erro }]}>Tirar</Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      {modalAberto && (
        <View style={estilos.overlay}>
          <View style={[estilos.modal, larguraWeb(400)]}>
            <Text style={estilos.tituloModal}>Anunciar {modalAberto.marca} {modalAberto.modelo}</Text>
            <TextInput style={estilos.campo} placeholder="Preço (R$)" placeholderTextColor={cores.textoSecundario} keyboardType="decimal-pad" value={preco} onChangeText={setPreco} />
            <TextInput style={[estilos.campo, { minHeight: 70, textAlignVertical: "top" }]} placeholder="Descrição (opcional)" placeholderTextColor={cores.textoSecundario} multiline value={descricao} onChangeText={setDescricao} />
            <View style={estilos.linhaBotoesModal}>
              <TouchableOpacity style={estilos.botaoCancelar} onPress={() => setModalAberto(null)}>
                <Text style={estilos.botaoCancelarTexto}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={estilos.botaoSalvar} onPress={salvarAnuncio} disabled={salvando}>
                {salvando ? <ActivityIndicator color="#FFF" /> : <Text style={estilos.botaoSalvarTexto}>Publicar</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </>
  );
}

function SecaoMensagens({ cores, user, onAbrirConversa }) {
  const [conversas, setConversas] = useState([]);
  const [carregando, setCarregando] = useState(true);

  const buscar = useCallback(async () => {
    setCarregando(true);
    const { data } = await supabase
      .from("conversas")
      .select("*")
      .or(`comprador_id.eq.${user.id},vendedor_id.eq.${user.id}`)
      .order("criado_em", { ascending: false });

    const conversasComNomes = await Promise.all(
      (data || []).map(async (c) => {
        const outroId = c.comprador_id === user.id ? c.vendedor_id : c.comprador_id;
        const { data: perfil } = await supabase.from("perfis").select("nome").eq("id", outroId).maybeSingle();
        return { ...c, outroNome: perfil?.nome || "Usuário" };
      })
    );
    setConversas(conversasComNomes);
    setCarregando(false);
  }, [user]);

  useEffect(() => {
    buscar();
  }, [buscar]);

  const estilos = criarEstilos(cores);

  return (
    <ScrollView contentContainerStyle={estilos.conteudo}>
      <View style={larguraWeb(680)}>
        {carregando ? (
          <ActivityIndicator color={cores.primaria} />
        ) : conversas.length === 0 ? (
          <Text style={estilos.vazio}>Nenhuma conversa ainda.</Text>
        ) : (
          conversas.map((c) => (
            <TouchableOpacity
              key={c.id}
              style={estilos.cartaoConversa}
              onPress={() =>
                onAbrirConversa({
                  ...c,
                  vendedor_nome: c.vendedor_id === user.id ? "Você" : c.outroNome,
                  comprador_nome: c.comprador_id === user.id ? "Você" : c.outroNome,
                })
              }
            >
              <Text style={estilos.nomeVeiculo}>{c.outroNome}</Text>
            </TouchableOpacity>
          ))
        )}
      </View>
    </ScrollView>
  );
}

function criarEstilos(cores) {
  return StyleSheet.create({
    tela: { flex: 1, backgroundColor: cores.fundo },
    conteudo: { alignItems: "center", padding: ESPACAMENTO.lg, paddingBottom: ESPACAMENTO.xxl },
    segmentado: { flexDirection: "row", backgroundColor: cores.card, borderWidth: 1, borderColor: cores.borda, borderRadius: RAIO.pill, padding: 4, margin: ESPACAMENTO.lg, marginBottom: 0 },
    segItem: { flex: 1, alignItems: "center", paddingVertical: 8, borderRadius: RAIO.pill },
    segAtivo: { backgroundColor: cores.primaria },
    segTexto: { color: cores.textoSecundario, fontSize: 12, fontFamily: FONTES.medium },
    segTextoAtivo: { color: "#FFF", fontSize: 12, fontFamily: FONTES.semiBold },
    subtitulo: { fontSize: 13, color: cores.textoSecundario, marginBottom: ESPACAMENTO.lg, fontFamily: FONTES.regular },
    vazio: { color: cores.textoSecundario, textAlign: "center", marginTop: ESPACAMENTO.xl, fontFamily: FONTES.regular },
    link: { color: cores.primaria, fontSize: 12.5, fontFamily: FONTES.semiBold },
    linhaFiltro: { flexDirection: "row", gap: ESPACAMENTO.sm, marginBottom: ESPACAMENTO.md },
    chipFiltro: { borderWidth: 1, borderColor: cores.borda, borderRadius: RAIO.pill, paddingHorizontal: ESPACAMENTO.md, paddingVertical: 7 },
    chipFiltroAtivo: { backgroundColor: cores.primariaClara, borderColor: cores.primaria },
    chipFiltroTexto: { color: cores.textoSecundario, fontSize: 12, fontFamily: FONTES.medium },
    chipFiltroTextoAtivo: { color: cores.primaria, fontSize: 12, fontFamily: FONTES.semiBold },
    campoBusca: {
      borderWidth: 1, borderColor: cores.borda, backgroundColor: cores.card, borderRadius: RAIO.md,
      paddingHorizontal: ESPACAMENTO.lg, paddingVertical: ESPACAMENTO.md, fontSize: 14, color: cores.texto,
      marginBottom: ESPACAMENTO.lg, fontFamily: FONTES.regular,
    },
    cartaoAnuncio: {
      flexDirection: "row", alignItems: "center", gap: ESPACAMENTO.md, backgroundColor: cores.card,
      borderRadius: RAIO.lg, borderWidth: 1, borderColor: cores.borda, padding: ESPACAMENTO.md, marginBottom: ESPACAMENTO.md, ...SOMBRA,
    },
    fotoAnuncio: { width: 60, height: 60, borderRadius: RAIO.md },
    fotoAnuncioVazia: { width: 60, height: 60, borderRadius: RAIO.md, backgroundColor: cores.primariaClara, alignItems: "center", justifyContent: "center" },
    nomeAnuncio: { fontSize: 14.5, color: cores.texto, fontFamily: FONTES.semiBold },
    detalheAnuncio: { fontSize: 12, color: cores.textoSecundario, marginTop: 2, fontFamily: FONTES.regular },
    precoAnuncio: { fontSize: 14, color: cores.primaria, marginTop: 4, fontFamily: FONTES.bold },
    descricaoAnuncio: { fontSize: 13, color: cores.textoSecundario, marginTop: ESPACAMENTO.md, fontFamily: FONTES.regular },
    vendedorAnuncio: { fontSize: 12, color: cores.textoSecundario, marginTop: ESPACAMENTO.sm, fontFamily: FONTES.medium },
    fotoDetalhe: { width: "100%", height: 160, borderRadius: RAIO.lg, marginBottom: ESPACAMENTO.md },
    cartaoVeiculo: {
      flexDirection: "row", alignItems: "center", gap: ESPACAMENTO.md, backgroundColor: cores.card,
      borderRadius: RAIO.lg, borderWidth: 1, borderColor: cores.borda, padding: ESPACAMENTO.md, marginBottom: ESPACAMENTO.md, ...SOMBRA,
    },
    nomeVeiculo: { fontSize: 14, color: cores.texto, fontFamily: FONTES.semiBold },
    detalheVeiculo: { fontSize: 12, color: cores.textoSecundario, marginTop: 2, fontFamily: FONTES.regular },
    cartaoConversa: {
      backgroundColor: cores.card, borderRadius: RAIO.lg, borderWidth: 1, borderColor: cores.borda,
      padding: ESPACAMENTO.md, marginBottom: ESPACAMENTO.sm, ...SOMBRA,
    },
    campo: {
      borderWidth: 1, borderColor: cores.borda, backgroundColor: cores.fundo, borderRadius: RAIO.md,
      paddingHorizontal: ESPACAMENTO.lg, paddingVertical: ESPACAMENTO.md, fontSize: 14, color: cores.texto,
      marginBottom: ESPACAMENTO.md, fontFamily: FONTES.regular,
    },
    overlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.4)", alignItems: "center", justifyContent: "center", padding: ESPACAMENTO.lg },
    modal: { width: "100%", backgroundColor: cores.card, borderRadius: RAIO.xl, padding: ESPACAMENTO.xl },
    tituloModal: { fontSize: 17, color: cores.texto, fontFamily: FONTES.bold, marginBottom: ESPACAMENTO.sm },
    linhaBotoesModal: { flexDirection: "row", gap: ESPACAMENTO.md, marginTop: ESPACAMENTO.lg },
    botaoCancelar: { flex: 1, alignItems: "center", paddingVertical: ESPACAMENTO.md },
    botaoCancelarTexto: { color: cores.textoSecundario, fontFamily: FONTES.semiBold },
    botaoSalvar: { flex: 1, backgroundColor: cores.primaria, borderRadius: RAIO.pill, alignItems: "center", paddingVertical: ESPACAMENTO.md },
    botaoSalvarTexto: { color: "#FFF", fontFamily: FONTES.semiBold },
  });
}
