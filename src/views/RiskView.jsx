import { useState, useEffect } from 'react';
import ActivityCard from '../components/ActivityCard';
import { calcPct } from '../utils/calc-pct';
import { calcTimeRisk } from '../utils/calc-time-risk';

export default function RiskView({ cells, readOnly = false }) {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchActivities = async () => {
    try {
      const res = await fetch('/api/activities');
      const data = await res.json();
      setActivities(data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchActivities(); }, []);

  const toggleMilestone = async (actId, mid, done) => {
    if (readOnly) return;
    // Optimistic
    setActivities(prev => prev.map(a => {
      if (a.id !== actId) return a;
      const milestones = a.milestones.map(m => m.id === mid ? { ...m, done } : m);
      const pct = milestones.length ? Math.round(milestones.filter(m => m.done).length / milestones.length * 100) : 0;
      return { ...a, milestones, pct };
    }));
    try {
      await fetch(`/api/activities/${actId}/milestone/${mid}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ done }),
      });
    } catch { fetchActivities(); }
  };

  // Filter: activities in yellow/red OR with active blockers
  const atRisk = activities.filter(a => {
    const hasRiskStatus = a.status === 'rojo' || a.status === 'amarillo';
    const hasBlockers = (a.blockers || []).some(b => !b.resolved);
    const pct = calcPct(a.milestones);
    const timeRisk = calcTimeRisk(a.startDate, a.endDate, pct);
    const hasTimeRisk = timeRisk === 'rojo' || timeRisk === 'amarillo';
    return hasRiskStatus || hasBlockers || hasTimeRisk;
  }).sort((a, b) => {
    // Red first, then yellow
    const order = { rojo: 0, amarillo: 1, verde: 2 };
    return (order[a.status] || 2) - (order[b.status] || 2);
  });

  const getCellName = (cellId) => cells.find(c => c.id === cellId)?.name || cellId;

  if (loading) return <p className="text-ink-mute">Cargando...</p>;

  return (
    <div>
      <p className="text-sm text-ink-mute mb-4">
        Actividades en amarillo/rojo, con bloqueos activos o riesgo temporal. Transversal a todas las celulas.
      </p>
      {readOnly && <p className="text-xs text-ink-mute mb-4">Modo solo lectura: sin edición de hitos ni notas.</p>}

      {atRisk.length === 0 ? (
        <div className="text-center py-12 text-ink-mute">
          <p className="text-lg">Sin riesgos detectados</p>
          <p className="text-sm">Todas las actividades van en verde y sin bloqueos</p>
        </div>
      ) : (
        <div className="space-y-3">
          {atRisk.map(act => (
            <ActivityCard
              key={act.id}
              act={act}
              cellName={getCellName(act.cellId)}
              notes={[]}
              onEdit={() => {}}
              onArchive={() => {}}
              onAddNote={() => {}}
              onToggleMilestone={toggleMilestone}
              readOnly={readOnly}
            />
          ))}
        </div>
      )}
    </div>
  );
}
