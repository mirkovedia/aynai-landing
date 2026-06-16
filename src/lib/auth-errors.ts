/** Traduce mensajes de error de Supabase Auth a textos en español. */
export const translateAuthError = (message: string): string => {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) return "Correo o contraseña incorrectos.";
  if (m.includes("user already registered")) return "Este correo ya está registrado.";
  if (m.includes("password should be at least"))
    return "La contraseña debe tener al menos 6 caracteres.";
  if (m.includes("email not confirmed"))
    return "Debes confirmar tu correo antes de entrar.";
  if (m.includes("unable to validate email address")) return "El correo no es válido.";
  return "Ocurrió un error. Inténtalo de nuevo.";
};
