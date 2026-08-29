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
