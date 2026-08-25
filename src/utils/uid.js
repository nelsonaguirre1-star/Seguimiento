/**
 * Genera un ID alfanumérico de 8 caracteres.
 * @returns {string}
 */
export function uid() {
  return Math.random().toString(36).substring(2, 10);
}
