export function validarCampo(field, value) {
  value = value.trim();
  switch (field) {
    case "nome":
      return /^[A-Za-zÀ-ÿ\s]{2,}$/.test(value);
    case "email":
      return /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i.test(value);
    case "telefone":
      return /^\d{10,11}$/.test(value.replace(/\D/g, ""));
    case "cidade":
      return /^[A-Za-zÀ-ÿ\s]{2,}$/.test(value);
    case "horario":
      return value.length > 1;
    case "maquina":
      return ["Máquina A", "Máquina B", "Máquina C"].includes(value);
    default:
      return true;
  }
}

export function mensagemErro(field) {
  switch (field) {
    case "nome": return "Digite um nome válido (apenas letras, mínimo 2 caracteres).";
    case "email": return "Digite um e-mail válido (ex: nome@email.com).";
    case "telefone": return "Digite apenas números, com DDD (10 ou 11 dígitos).";
    case "cidade": return "Digite uma cidade válida (apenas letras).";
    case "maquina": return "Escolha uma das opções de máquina.";
    case "horario": return "Informe um horário válido.";
    default: return "Valor inválido.";
  }
}
