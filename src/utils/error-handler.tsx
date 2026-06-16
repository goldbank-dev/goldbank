/**
 * Tratamento padronizado de erros e sucessos — usa Sonner (toast global).
 * Funciona fora de componentes React (não depende de hook/contexto).
 */
import { toast } from "sonner";

export const handleError = (error: any, defaultMessage = "Ocorreu um erro inesperado"): string => {
  console.error("Error handled:", error);

  let message = defaultMessage;

  if (typeof error === "string") {
    message = error;
  } else if (error instanceof Error) {
    message = error.message;
  } else if (error?.message) {
    message = error.message;
  } else if (error?.error_description) {
    message = error.error_description;
  } else if (error?.details) {
    message = error.details;
  } else if (error?.error?.message) {
    message = error.error.message;
  }

  // Mapeia erros técnicos para mensagens amigáveis em português
  if (message.includes("Failed to fetch") || message.includes("NetworkError")) {
    message = "Erro de conexão. Verifique sua internet.";
  } else if (message.includes("JWT") || message.includes("session")) {
    message = "Sua sessão expirou. Por favor, faça login novamente.";
  } else if (message.includes("Invalid login credentials")) {
    message = "E-mail ou senha incorretos.";
  } else if (message.includes("Email not confirmed")) {
    message = "E-mail não confirmado. Verifique sua caixa de entrada.";
  } else if (message.includes("Error sending confirmation email")) {
    message = "Erro ao enviar e-mail de confirmação. Tente novamente.";
  } else if (message.includes("not found")) {
    message = "Recurso não encontrado.";
  } else if (message.includes("insufficient") || message.includes("Saldo insuficiente")) {
    message = "Saldo insuficiente para realizar esta operação.";
  } else if (message.includes("User already registered")) {
    message = "Este e-mail já está cadastrado. Faça login.";
  } else if (message.includes("Password should be")) {
    message = "Senha deve ter pelo menos 6 caracteres.";
  }

  toast.error(message, {
    duration:    5000,
    style:       { background: '#1a0505', border: '1px solid #7f1d1d', color: '#fca5a5' },
  });

  return message;
};

export const handleSuccess = (message: string): void => {
  toast.success(message, {
    duration: 4000,
    style:    { background: '#051a0a', border: '1px solid #14532d', color: '#86efac' },
  });
};

export const handleInfo = (message: string): void => {
  toast.info(message, { duration: 4000 });
};
