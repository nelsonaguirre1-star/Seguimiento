import { useEffect, useMemo, useState } from 'react';
import Card from '../components/Card';
import Badge from '../components/Badge';
import Input from '../components/Input';
import { PRIORITIES } from '../utils/constants';
import { calcPct } from '../utils/calc-pct';
import { fmtDate } from '../utils/fmt-date';

const CUADRANTES = [
  { key: 'piedras1', title: 'Piedras 1', subtitle: 'Importante, no urgente', tone: 'bg-sky-50 border-sky-200' },
  { key: 'rocas', title: 'Rocas', subtitle: 'Importante + urgente', tone: 'bg-red-50 border-red-200' },
  { key: 'arena', title: 'Arena', subtitle: 'Ni importante ni urgente', tone: 'bg-stone-50 border-stone-200' },
  { key: 'piedras2', title: 'Piedras 2', subtitle: 'Urgente, no importante', tone: 'bg-amber-50 border-amber-200' },
];

const DISTRIBUTION_ORDER = ['arena', 'piedras1', 'piedras2', 'rocas'];
const DISTRIBUTION_LABELS = {
  arena: 'Gris · Arena',
  piedras1: 'Azul · Piedras importantes',
  piedras2: 'Amarillo · Piedras urgentes',
  rocas: 'Rojo · Rocas',
};

function nextMilestone(activity) {
  const pending = (activity.milestones || []).filter(m => !m.done && m.date).sort((a, b) => a.date.localeCompare(b.date));
  return pending.length ? pending[0] : null;
}

function statusLabel(status) {
  const map = { verde: 'En curso', amarillo: 'En riesgo', rojo: 'Bloqueada' };
  return map[status] || status || 'Sin estado';
}

function sanitizeQuadrant(value) {
  if (value === 'rocas' || value === 'piedras1' || value === 'piedras2' || value === 'arena') return value;
  return null;
}

function priorityFromQuadrant(quadrant) {
  if (quadrant === 'rocas') return 'roca';
  if (quadrant === 'piedras1') return 'piedras_importantes';
  if (quadrant === 'piedras2') return 'piedras_urgentes';
  if (quadrant === 'arena') return 'arena';
  return null;
}

export default function ResumenView({ cells, readOnly = false }) {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCells, setSelectedCells] = useState(['__all__']);
  const [detailAct, setDetailAct] = useState(null);
  const [detailNotes, setDetailNotes] = useState([]);
  const [notesLoading, setNotesLoading] = useState(false);
  const [newNoteText, setNewNoteText] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  const loadActivities = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/activities');
      const data = await res.json();
      setActivities((data || []).map(a => ({ ...a, cuadrante: sanitizeQuadrant(a.cuadrante) || sanitizeQuadrant(priorityFromQuadrant(a.priority)) })));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadActivities(); }, []);

  useEffect(() => {
    const onEsc = (e) => { if (e.key === 'Escape') setDetailAct(null); };
    document.addEventListener('keydown', onEsc);
    return () => document.removeEventListener('keydown', onEsc);
  }, []);

  const cellMap = useMemo(() => {
    const map = {};
    cells.forEach(c => { map[c.id] = c.name; });
    return map;
  }, [cells]);

  const filtered = useMemo(() => {
    const activeCellSet = new Set(selectedCells);
    const useAll = activeCellSet.has('__all__');
    const term = search.trim().toLowerCase();
    return activities.filter(a => {
      if (!useAll && !activeCellSet.has(a.cellId)) return false;
      if (!term) return true;
      return String(a.name || '').toLowerCase().includes(term) || String(a.responsible || '').toLowerCase().includes(term);
    });
  }, [activities, selectedCells, search]);

  const byQuadrant = useMemo(() => {
    const groups = { rocas: [], piedras1: [], piedras2: [], arena: [], nulls: [] };
    filtered.forEach(a => {
      const q = sanitizeQuadrant(a.cuadrante);
      if (!q) groups.nulls.push(a);
      else groups[q].push(a);
    });
    return groups;
  }, [filtered]);

  const distribution = useMemo(() => {
    const classified = filtered.filter(a => sanitizeQuadrant(a.cuadrante));
    const total = classified.length;
    if (!total) return [];
    return CUADRANTES.map(q => {
      const count = classified.filter(a => a.cuadrante === q.key).length;
      const pct = Math.round((count / total) * 100);
      return { ...q, count, pct };
    });
  }, [filtered]);

  const distributionForDisplay = useMemo(() => {
    const order = DISTRIBUTION_ORDER.reduce((acc, key, index) => {
      acc[key] = index;
      return acc;
    }, {});
    return [...distribution].sort((a, b) => (order[a.key] ?? 99) - (order[b.key] ?? 99));
  }, [distribution]);

  const refreshOne = async (id) => {
    try {
      const res = await fetch('/api/activities');
      const data = await res.json();
      const list = (data || []).map(a => ({ ...a, cuadrante: sanitizeQuadrant(a.cuadrante) || sanitizeQuadrant(priorityFromQuadrant(a.priority)) }));
      setActivities(list);
      const current = list.find(a => a.id === id);
      if (current) setDetailAct(current);
    } catch (err) {
      console.error(err);
    }
  };

  const assignQuadrant = async (activity, quadrant) => {
    if (readOnly) return;
    const value = sanitizeQuadrant(quadrant);
    const nextPriority = priorityFromQuadrant(value);
    if (!nextPriority) return;
    try {
      await fetch(`/api/activities/${activity.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priority: nextPriority }),
      });
      setActivities(prev => prev.map(a => (a.id === activity.id ? { ...a, priority: nextPriority, cuadrante: value } : a)));
      if (detailAct?.id === activity.id) setDetailAct(prev => ({ ...prev, priority: nextPriority, cuadrante: value }));
    } catch (err) {
      console.error(err);
    }
  };

  const saveNote = async () => {
    if (readOnly) return;
    const text = newNoteText.trim();
    if (!text || !detailAct) return;
    setSavingNote(true);
    try {
      const res = await fetch(`/api/notes/${detailAct.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      const nota = await res.json();
      setDetailNotes(prev => [nota, ...prev]);
      setNewNoteText('');
    } catch (err) {
      console.error(err);
    } finally {
      setSavingNote(false);
    }
  };

  const openDetail = async (activity) => {
    setDetailAct(activity);
    setNewNoteText('');
    setNotesLoading(true);
    try {
      const res = await fetch(`/api/notes/${activity.id}`);
      const data = await res.json();
      setDetailNotes(data || []);
    } catch (err) {
      console.error(err);
      setDetailNotes([]);
    } finally {
      setNotesLoading(false);
    }
  };

  const toggleCell = (cellId) => {
    if (cellId === '__all__') {
      setSelectedCells(['__all__']);
      return;
    }
    setSelectedCells(prev => {
      const hasAll = prev.includes('__all__');
      const base = hasAll ? [] : [...prev];
      if (base.includes(cellId)) {
        const next = base.filter(id => id !== cellId);
        return next.length ? next : ['__all__'];
      }
      return [...base, cellId];
    });
  };

  const onDragStart = (e, act) => {
    if (readOnly) return;
    e.dataTransfer.setData('text/activity-id', act.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const onDropQuadrant = async (e, q) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/activity-id');
    const act = activities.find(a => a.id === id);
    if (!act) return;
    await assignQuadrant(act, q);
  };

  const onDropUnclassified = async (e) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/activity-id');
    const act = activities.find(a => a.id === id);
    if (!act) return;
    await assignQuadrant(act, 'arena');
  };

  if (loading) return <p className="text-ink-mute">Cargando...</p>;

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h3 className="font-semibold text-ink">Matriz de priorización</h3>
            <p className="text-sm text-ink-mute">Importancia (vertical) y urgencia (horizontal)</p>
          </div>
          <div className="min-w-[280px] flex-1 max-w-[460px]">
            <Input placeholder="Buscar por actividad o responsable..." value={search} onChange={setSearch} />
          </div>
        </div>

        <div className="mt-4">
          <p className="text-xs font-semibold text-ink-mute mb-2">Células</p>
          <div className="flex gap-2 flex-wrap">
            <button
              type="button"
              aria-pressed={selectedCells.includes('__all__')}
              onClick={() => toggleCell('__all__')}
              className={`px-2 py-1 rounded-sm text-xs border cursor-pointer ${selectedCells.includes('__all__') ? 'bg-navy-deep text-white border-navy-deep' : 'bg-paper border-ink/20 text-ink'}`}
            >
              Todas
            </button>
            {cells.map(c => {
              const active = selectedCells.includes(c.id) && !selectedCells.includes('__all__');
              return (
                <button
                  key={c.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => toggleCell(c.id)}
                  className={`px-2 py-1 rounded-sm text-xs border cursor-pointer ${active ? 'bg-navy-deep text-white border-navy-deep' : 'bg-paper border-ink/20 text-ink'}`}
                >
                  {c.name}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-4">
          <p className="text-xs font-semibold text-ink-mute mb-2">Distribución del conjunto filtrado (clasificadas)</p>
          {distribution.length === 0 ? (
            <p className="text-xs text-ink-mute">Sin actividades clasificadas en el filtro actual.</p>
          ) : (
            <div>
              <div className="hidden md:flex mb-1 text-[11px] text-ink-mute">
                {distributionForDisplay.map(d => (
                  <div key={`label-${d.key}`} style={{ width: `${d.pct}%` }} className="text-center truncate px-1">
                    {DISTRIBUTION_LABELS[d.key] || d.title}
                  </div>
                ))}
              </div>
              <div className="h-3 rounded-sm overflow-hidden border border-ink/10 flex">
                {distributionForDisplay.map(d => (
                  <div key={d.key} style={{ width: `${d.pct}%` }} className={d.key === 'rocas' ? 'bg-red-300' : d.key === 'piedras1' ? 'bg-sky-300' : d.key === 'piedras2' ? 'bg-amber-300' : 'bg-stone-300'} />
                ))}
              </div>
              <div className="flex flex-wrap gap-2 mt-2 text-xs text-ink-mute">
                {distributionForDisplay.map(d => (
                  <span key={d.key}>{d.title}: {d.count} ({d.pct}%)</span>
                ))}
              </div>
            </div>
          )}
        </div>

        {readOnly && (
          <p className="text-xs text-ink-mute mt-3">Modo solo lectura: puedes filtrar y consultar, sin reclasificar ni editar.</p>
        )}
      </Card>

      <div className="flex items-start gap-3">
        <div className="text-xs text-ink-mute [writing-mode:vertical-rl] rotate-180 hidden md:block">Importancia ↑</div>
        <div className="flex-1">
          <div className="text-right text-xs text-ink-mute mb-1">Urgencia →</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {CUADRANTES.map(q => {
              const list = byQuadrant[q.key] || [];
              return (
                <section
                  key={q.key}
                  onDragOver={readOnly ? undefined : (e) => e.preventDefault()}
                  onDrop={readOnly ? undefined : (e) => onDropQuadrant(e, q.key)}
                  className={`rounded-sm border p-3 min-h-[220px] ${q.tone}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h4 className="font-semibold text-ink">{q.title}</h4>
                      <p className="text-xs text-ink-mute">{q.subtitle}</p>
                    </div>
                    <Badge>{list.length}</Badge>
                  </div>

                  {list.length === 0 ? (
                    <p className="text-xs text-ink-mute">No hay actividades en este cuadrante con los filtros actuales.</p>
                  ) : (
                    <div className="space-y-2">
                      {list.map(act => {
                        const pri = PRIORITIES[act.priority] || PRIORITIES.arena;
                        const pct = calcPct(act.milestones || []);
                        const next = nextMilestone(act);
                        const overdue = next ? new Date(next.date) < new Date(new Date().toISOString().slice(0, 10)) : false;
                        return (
                          <button
                            key={act.id}
                            type="button"
                            draggable={!readOnly}
                            onDragStart={(e) => onDragStart(e, act)}
                            onClick={() => openDetail(act)}
                            className="w-full text-left bg-paper border border-ink/15 rounded-sm p-2 hover:border-ink/30 focus:outline-none focus:ring-2 focus:ring-navy-deep/40 cursor-pointer"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-sm font-medium text-ink truncate">{act.name}</p>
                              <Badge color={pri.color} bg={pri.bg}>{pri.label}</Badge>
                            </div>
                            <p className="text-xs text-ink-mute mt-1">{cellMap[act.cellId] || act.cellId} · {act.responsible}</p>
                            <p className="text-xs text-ink mt-1">Avance: <span className="font-semibold">{pct}%</span></p>
                            <p className={`text-xs mt-1 ${overdue ? 'text-red-700 font-semibold' : 'text-ink-mute'}`}>
                              Próximo hito: {next ? fmtDate(next.date) : 'Sin hitos pendientes'}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        </div>
      </div>

      {byQuadrant.nulls.length > 0 && (
        <Card className="p-4" onDragOver={readOnly ? undefined : (e) => e.preventDefault()} onDrop={readOnly ? undefined : onDropUnclassified}>
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-semibold text-ink">Sin clasificar</h4>
            <Badge>{byQuadrant.nulls.length}</Badge>
          </div>
          <p className="text-xs text-ink-mute mb-2">{readOnly ? 'Vista de consulta.' : 'Arrastra aquí para mover una actividad a Arena.'}</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {byQuadrant.nulls.map(act => (
              <button
                key={act.id}
                type="button"
                draggable={!readOnly}
                onDragStart={(e) => onDragStart(e, act)}
                onClick={() => openDetail(act)}
                className="w-full text-left bg-paper border border-ink/15 rounded-sm p-2 hover:border-ink/30 focus:outline-none focus:ring-2 focus:ring-navy-deep/40 cursor-pointer"
              >
                <p className="text-sm font-medium text-ink truncate">{act.name}</p>
                <p className="text-xs text-ink-mute mt-1">{cellMap[act.cellId] || act.cellId} · {act.responsible}</p>
              </button>
            ))}
          </div>
        </Card>
      )}

      {detailAct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => setDetailAct(null)}>
          <div className="absolute inset-0 bg-black/40" />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Detalle de actividad"
            onClick={(e) => e.stopPropagation()}
            className="relative bg-paper w-full max-w-4xl max-h-[90vh] overflow-auto rounded-sm p-5"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-ink">{detailAct.name}</h3>
                <p className="text-xs text-ink-mute">{cellMap[detailAct.cellId] || detailAct.cellId} · {detailAct.responsible}</p>
              </div>
              <button
                type="button"
                onClick={() => setDetailAct(null)}
                className="text-xl leading-none text-ink-mute hover:text-ink cursor-pointer"
              >
                ×
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <Card className="p-3">
                <p className="text-xs text-ink-mute">Estado</p>
                <p className="text-sm font-medium text-ink">{statusLabel(detailAct.status)}</p>
                <p className="text-xs text-ink-mute mt-2">Avance</p>
                <p className="text-sm font-medium text-ink">{calcPct(detailAct.milestones || [])}%</p>
                <p className="text-xs text-ink-mute mt-2">Descripción</p>
                <p className="text-sm text-ink">{detailAct.description || 'Sin descripción registrada'}</p>
              </Card>

              <Card className="p-3">
                <label className="text-xs text-ink-mute block mb-1">Cuadrante</label>
                <select
                  value={detailAct.cuadrante || ''}
                  disabled={readOnly}
                  onChange={async (e) => {
                    const value = e.target.value || null;
                    await assignQuadrant(detailAct, value);
                    await refreshOne(detailAct.id);
                  }}
                  className="w-full border border-ink/20 rounded-sm px-2 py-1 text-sm disabled:opacity-60"
                >
                  <option value="rocas">Rocas</option>
                  <option value="piedras1">Piedras 1</option>
                  <option value="piedras2">Piedras 2</option>
                  <option value="arena">Arena</option>
                </select>
                <p className="text-xs text-ink-mute mt-2">{readOnly ? 'Modo lectura: clasificación bloqueada.' : 'Este control permite reclasificar por teclado y actualiza prioridad.'}</p>
              </Card>
            </div>

            <Card className="p-3 mt-4">
              <h4 className="font-semibold text-sm text-ink mb-2">Hitos</h4>
              {(detailAct.milestones || []).length === 0 ? (
                <p className="text-xs text-ink-mute">Sin hitos registrados.</p>
              ) : (
                <div className="overflow-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-ink-mute text-xs">
                        <th className="py-1">Nombre</th>
                        <th className="py-1">Responsable</th>
                        <th className="py-1">Fecha compromiso</th>
                        <th className="py-1">Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(detailAct.milestones || []).map(m => {
                        const overdue = !m.done && m.date && new Date(m.date) < new Date(new Date().toISOString().slice(0, 10));
                        return (
                          <tr key={m.id} className="border-t border-ink/10">
                            <td className="py-1">{m.name}</td>
                            <td className="py-1">{detailAct.responsible}</td>
                            <td className={`py-1 ${overdue ? 'text-red-700 font-semibold' : ''}`}>{m.date ? fmtDate(m.date) : '-'}</td>
                            <td className="py-1">{m.done ? 'Completada' : overdue ? 'Vencida' : 'Pendiente'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>

            <Card className="p-3 mt-4">
              <h4 className="font-semibold text-sm text-ink mb-2">Bitácora de notas</h4>
              {!readOnly && (
                <div className="mb-3">
                  <textarea
                    value={newNoteText}
                    onChange={e => setNewNoteText(e.target.value)}
                    placeholder="Registrar acuerdos, decisiones o comentarios..."
                    rows={3}
                    className="w-full border border-ink/20 rounded-sm px-2 py-1 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-navy-deep/40"
                  />
                  <div className="flex justify-end mt-1">
                    <button
                      type="button"
                      disabled={!newNoteText.trim() || savingNote}
                      onClick={saveNote}
                      className="px-3 py-1 text-xs rounded-sm bg-navy-deep text-white disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed hover:bg-navy-deep/90"
                    >
                      {savingNote ? 'Guardando...' : 'Guardar nota'}
                    </button>
                  </div>
                </div>
              )}
              {readOnly && <p className="text-xs text-ink-mute mb-2">Modo lectura: no se pueden agregar notas.</p>}
              {notesLoading ? (
                <p className="text-xs text-ink-mute">Cargando notas...</p>
              ) : detailNotes.length === 0 ? (
                <p className="text-xs text-ink-mute">Sin notas registradas.</p>
              ) : (
                <div className="space-y-2">
                  {detailNotes.map(n => (
                    <div key={n.id} className="text-xs bg-ink/5 rounded-sm p-2">
                      <p className="text-ink-mute mb-1">{fmtDate(n.date)} · Registro</p>
                      <p className="text-ink">{n.text}</p>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
