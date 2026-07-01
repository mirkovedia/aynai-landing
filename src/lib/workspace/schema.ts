type Ok<T> = { ok: true; value: T };
type Err = { ok: false; error: string };
type Result<T> = Ok<T> | Err;

/** Valida y sanitiza el título de un hito (1–200 chars). */
export const validateMilestoneTitle = (title: unknown): Result<string> => {
  if (typeof title !== "string") {
    return { ok: false, error: "Título inválido." };
  }
  const trimmed = title.trim();
  if (trimmed.length === 0) {
    return { ok: false, error: "El título no puede estar vacío." };
  }
  if (trimmed.length > 200) {
    return { ok: false, error: "El título no puede superar los 200 caracteres." };
  }
  return { ok: true, value: trimmed };
};

/** Valida el contenido de la nota compartida (0–5000 chars). Acepta vacío para borrar. */
export const validateNoteContent = (content: unknown): Result<string> => {
  if (typeof content !== "string") {
    return { ok: false, error: "Contenido inválido." };
  }
  if (content.length > 5000) {
    return { ok: false, error: "La nota no puede superar los 5000 caracteres." };
  }
  return { ok: true, value: content };
};
