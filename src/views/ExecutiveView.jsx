import { useState, useEffect } from 'react';
import Card from '../components/Card';
import Badge from '../components/Badge';
import ProgressBar from '../components/ProgressBar';
import { PRIORITIES, STATUSES, GAPS } from '../utils/constants';
import { calcPct } from '../utils/calc-pct';

export default function ExecutiveView({ cells, onNavigateCell }) {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/activities')
      .then(r => r.json())
      .then(setActivities)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // KPIs
  const total = activities.length;
  const inRed = activities.filter(a => a.status === 'rojo').length;
  const activeBlockers = activities.reduce((sum, a) => sum + (a.blockers || []).filter(b => !b.resolved).length, 0);

  // Per-cell stats
  const cellStats = cells.map(c => {
    const cellActs = activities.filter(a => a.cellId === c.id);
    const avgPct = cellActs.length ? Math.round(cellActs.reduce((s, a) => s + calcPct(a.milestones), 0) / cellActs.length) : 0;
    const rocas = cellActs.filter(a => a.priority === 'roca').length;
    const piedrasUrgentes = cellActs.filter(a => a.priority === 'piedras_urgentes').length;
    const piedrasImportantes = cellActs.filter(a => a.priority === 'piedras_importantes').length;
    const arenas = cellActs.filter(a => a.priority === 'arena').length;
    const reds = cellActs.filter(a => a.status === 'rojo').length;
    const yellows = cellActs.filter(a => a.status === 'amarillo').length;
    const blockers = cellActs.reduce((s, a) => s + (a.blockers || []).filter(b => !b.resolved).length, 0);
    return { ...c, cellActs, avgPct, rocas, piedrasUrgentes, piedrasImportantes, arenas, reds, yellows, blockers };
  });

  // Gap mapping
  const gapCounts = Object.keys(GAPS).reduce((acc, key) => {
    if (key === 'none') return acc;
    acc[key] = activities.filter(a => a.gap === key).length;
    return acc;
  }, {});

  if (loading) return <p className="text-ink-mute">Cargando...</p>;

  return (
    <div>
      {/* KPI Strip */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-navy-deep">{total}</p>
          <p className="text-xs text-ink-mute">Total actividades</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-red-600">{inRed}</p>
          <p className="text-xs text-ink-mute">En rojo</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-amber-600">{activeBlockers}</p>
          <p className="text-xs text-ink-mute">Bloqueos activos</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-navy-deep">{cells.length}</p>
          <p className="text-xs text-ink-mute">Celulas</p>
        </Card>
      </div>

      {/* Cell grid */}
      <h3 className="text-sm font-semibold text-ink-mute mb-3">Celulas</h3>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {cellStats.map(c => (
          <Card key={c.id} className="p-4" onClick={() => onNavigateCell(c.id)}>
            <h4 className="font-semibold text-sm mb-2 truncate">{c.name}</h4>
            <ProgressBar pct={c.avgPct} />
            <p className="text-xs text-ink-mute mt-1">{c.avgPct}% promedio</p>
            <div className="flex gap-1 mt-2 flex-wrap">
              {c.rocas > 0 && <Badge color={PRIORITIES.roca.color} bg={PRIORITIES.roca.bg}>{c.rocas}R</Badge>}
              {c.piedrasUrgentes > 0 && <Badge color={PRIORITIES.piedras_urgentes.color} bg={PRIORITIES.piedras_urgentes.bg}>{c.piedrasUrgentes} Piedras urgentes</Badge>}
              {c.piedrasImportantes > 0 && <Badge color={PRIORITIES.piedras_importantes.color} bg={PRIORITIES.piedras_importantes.bg}>{c.piedrasImportantes} Piedras importantes</Badge>}
              {c.arenas > 0 && <Badge color={PRIORITIES.arena.color} bg={PRIORITIES.arena.bg}>{c.arenas}A</Badge>}
              {c.reds > 0 && <Badge color="#DC2626" bg="#FEE2E2">{c.reds} 🔴</Badge>}
              {c.blockers > 0 && <Badge color="#DC2626" bg="#FEE2E2">🚧{c.blockers}</Badge>}
            </div>
          </Card>
        ))}
      </div>

      {/* Gaps CDE v2.0 */}
      <h3 className="text-sm font-semibold text-ink-mute mb-3">Mapeo Gaps CDE v2.0</h3>
      <div className="grid grid-cols-4 gap-4">
        {Object.entries(GAPS).filter(([k]) => k !== 'none').map(([key, val]) => (
          <Card key={key} className="p-3 text-center">
            <p className="text-xl font-bold text-navy-deep">{gapCounts[key] || 0}</p>
            <p className="text-xs text-ink-mute">{val.label}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
