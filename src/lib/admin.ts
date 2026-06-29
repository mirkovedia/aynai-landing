/** Emails con acceso al panel de administración. */
export const ADMIN_EMAILS = ["baronvedia@gmail.com"];

export const isAdminEmail = (email: string | null | undefined): boolean =>
  Boolean(email && ADMIN_EMAILS.includes(email));
