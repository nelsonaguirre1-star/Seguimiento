import { useState, useEffect } from 'react';
import ActivityCard from '../components/ActivityCard';

export default function ArchiveView({ cells, readOnly = false }) {
  const [archived, setArchived] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchArchived = async () => {
    try {
      const res = await fetch('/api/archive');
      setArchived(await res.json());
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchArchived(); }, []);

  const restoreActivity = async (id) => {
    if (readOnly) return;
    await fetch(`/api/activities/${id}/archive`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ archived: false }),
    });
    setArchived(prev => prev.filter(a => a.id !== id));
  };

  const toggleMilestone = async (actId, mid, done) => {
    if (readOnly) return;
    setArchived(prev => prev.map(a => {
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
    } catch { fetchArchived(); }
  };

  const getCellName = (cellId) => cells.find(c => c.id === cellId)?.name || cellId;

  if (loading) return <p className="text-ink-mute">Cargando...</p>;

  return (
    <div>
      <p className="text-sm text-ink-mute mb-4">
        Actividades archivadas (completadas o canceladas). Se pueden restaurar.
      </p>
      {readOnly && <p className="text-xs text-ink-mute mb-4">Modo solo lectura: sin restauración ni edición de hitos.</p>}

      {archived.length === 0 ? (
        <div className="text-center py-12 text-ink-mute">
          <p className="text-lg">Sin actividades archivadas</p>
        </div>
      ) : (
        <div className="space-y-3">
          {archived.map(act => (
            <ActivityCard
              key={act.id}
              act={act}
              cellName={getCellName(act.cellId)}
              notes={[]}
              onEdit={() => {}}
              onArchive={restoreActivity}
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
