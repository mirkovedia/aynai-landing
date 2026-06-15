/**
 * Une clases condicionales filtrando valores falsy.
 * Alternativa ligera a `clsx` para no agregar dependencias extra.
 */
export const cn = (...classes: Array<string | false | null | undefined>): string =>
  classes.filter(Boolean).join(" ");
