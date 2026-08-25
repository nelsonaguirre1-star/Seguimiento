/**
 * Detecta riesgo temporal comparando avance real vs tiempo transcurrido.
 * @param {string} startDate - Fecha inicio YYYY-MM-DD
 * @param {string} endDate - Fecha fin YYYY-MM-DD
 * @param {number} pct - Porcentaje de avance actual (0-100)
 * @returns {'verde'|'amarillo'|'rojo'} Nivel de riesgo temporal
 */
export function calcTimeRisk(startDate, endDate, pct) {
  const now = new Date();
  const start = new Date(startDate);
  const end = new Date(endDate);
  const totalTime = end - start;

  if (totalTime <= 0) return 'verde';

  const elapsed = Math.max(0, now - start);
  const timePct = Math.min(100, (elapsed / totalTime) * 100);
  const diff = pct - timePct;

  if (diff >= -5) return 'verde';
  if (diff >= -20) return 'amarillo';
  return 'rojo';
}
