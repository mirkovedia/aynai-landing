type Ok<T> = { ok: true; value: T };
type Err = { ok: false; error: string };
type Result<T> = Ok<T> | Err;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Valida que un string sea un UUID v4 válido. */
export const validateExchangeId = (id: unknown): Result<string> => {
  if (typeof id !== "string" || !UUID_RE.test(id)) {
    return { ok: false, error: "ID de intercambio inválido." };
  }
  return { ok: true, value: id };
};

/** Valida y sanitiza el contenido de un mensaje. */
export const validateMessage = (content: unknown): Result<string> => {
  if (typeof content !== "string") {
    return { ok: false, error: "Mensaje inválido." };
  }
  const trimmed = content.trim();
  if (trimmed.length === 0) {
    return { ok: false, error: "El mensaje no puede estar vacío." };
  }
  if (trimmed.length > 2000) {
    return { ok: false, error: "El mensaje no puede superar los 2000 caracteres." };
  }
  return { ok: true, value: trimmed };
};
