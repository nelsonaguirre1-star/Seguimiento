/**
 * Formatea una fecha YYYY-MM-DD a dd/mm/yyyy.
 * @param {string} dateStr - Fecha en formato ISO
 * @returns {string} Fecha formateada
 */
export function fmtDate(dateStr) {
  if (!dateStr) return '—';
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}
