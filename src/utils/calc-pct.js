/**
 * Calcula el porcentaje de avance basado en hitos completados.
 * @param {Array} milestones - Lista de hitos [{done: boolean}]
 * @returns {number} Porcentaje 0-100
 */
export function calcPct(milestones) {
  if (!milestones || milestones.length === 0) return 0;
  const done = milestones.filter(m => m.done).length;
  return Math.round((done / milestones.length) * 100);
}
