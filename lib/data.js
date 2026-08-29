// Máscaras e validação pros campos de cadastro (CPF, telefone).

export function aplicarMascaraCpf(valorDigitado) {
  const d = String(valorDigitado).replace(/\D/g, "").slice(0, 11);
  if (d.length > 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
  if (d.length > 6) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  if (d.length > 3) return `${d.slice(0, 3)}.${d.slice(3)}`;
  return d;
}

// Validação com dígito verificador de verdade (não só formato) --
// evita CPF inventado na hora do cadastro.
export function validarCpf(cpfFormatado) {
  const cpf = String(cpfFormatado).replace(/\D/g, "");
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;

  function calcularDigito(base) {
    let soma = 0;
    let peso = base.length + 1;
    for (const digito of base) {
      soma += Number(digito) * peso;
      peso -= 1;
    }
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  }

  const digito1 = calcularDigito(cpf.slice(0, 9));
  const digito2 = calcularDigito(cpf.slice(0, 9) + digito1);
  return cpf === cpf.slice(0, 9) + String(digito1) + String(digito2);
}

export function aplicarMascaraTelefone(valorDigitado) {
  const d = String(valorDigitado).replace(/\D/g, "").slice(0, 11);
  if (d.length > 10) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length > 6) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  if (d.length > 2) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return d;
}

export function aplicarMascaraPlaca(valorDigitado) {
  return String(valorDigitado)
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 7);
}

// Máscara e conversão de data no formato brasileiro (DD/MM/AAAA) pros
// campos de formulário -- o banco guarda como AAAA-MM-DD (tipo `date`).
export function aplicarMascaraData(valorDigitado) {
  const d = String(valorDigitado).replace(/\D/g, "").slice(0, 8);
  if (d.length > 4) return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
  if (d.length > 2) return `${d.slice(0, 2)}/${d.slice(2)}`;
  return d;
}

export function dataBrParaIso(dataBr) {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(dataBr).trim());
  if (!m) return null;
  const [, dia, mes, ano] = m;
  const diaNum = Number(dia);
  const mesNum = Number(mes);
  if (mesNum < 1 || mesNum > 12) return null;
  const diasNoMes = new Date(Number(ano), mesNum, 0).getDate();
  if (diaNum < 1 || diaNum > diasNoMes) return null;
  return `${ano}-${mes}-${dia}`;
}

export function dataIsoParaBr(dataIso) {
  if (!dataIso) return "";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(dataIso));
  if (!m) return "";
  const [, ano, mes, dia] = m;
  return `${dia}/${mes}/${ano}`;
}

// Quantos dias faltam pra "AAAA-MM-DD" (negativo se já passou).
export function diasParaData(dataIso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(dataIso || ""));
  if (!m) return null;
  const alvo = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  return Math.round((alvo.getTime() - hoje.getTime()) / (24 * 60 * 60 * 1000));
}
