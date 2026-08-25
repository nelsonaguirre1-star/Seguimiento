import { useState, useEffect } from 'react';
import useActivities from '../hooks/useActivities';
import useNotes from '../hooks/useNotes';
import ActivityCard from '../components/ActivityCard';
import ActivityForm from '../components/ActivityForm';
import NoteForm from '../components/NoteForm';
import Modal from '../components/Modal';
import Btn from '../components/Btn';
import Input from '../components/Input';
import { PRIORITIES } from '../utils/constants';

export default function BilateralView({ cells, readOnly = false }) {
  const [selectedCell, setSelectedCell] = useState('__all__');
  const { activities, loading, createActivity, updateActivity, deleteActivity, archiveActivity, toggleMilestone, refetch } = useActivities(selectedCell === '__all__' ? null : selectedCell);
  const [editingAct, setEditingAct] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [noteTarget, setNoteTarget] = useState(null);
  const [search, setSearch] = useState('');
  const [filterExecutive, setFilterExecutive] = useState(false);
  const [filterWeek, setFilterWeek] = useState('');
  const [notesMap, setNotesMap] = useState({});
  const [cellCounts, setCellCounts] = useState({});

  // Fetch activity counts for all cells
  useEffect(() => {
    const fetchCounts = async () => {
      const counts = {};
      await Promise.all(cells.map(async (c) => {
        try {
          const res = await fetch(`/api/activities?cellId=${c.id}`);
          const data = await res.json();
          counts[c.id] = data.filter(a => !a.archived).length;
        } catch { counts[c.id] = 0; }
      }));
      setCellCounts(counts);
    };
    if (cells.length) fetchCounts();
  }, [cells, activities]);

  // Fetch notes for all visible activities
  useEffect(() => {
    if (!activities.length) return;
    const fetchAll = async () => {
      const map = {};
      await Promise.all(activities.map(async (a) => {
        try {
          const res = await fetch(`/api/notes/${a.id}`);
          map[a.id] = await res.json();
        } catch { map[a.id] = []; }
      }));
      setNotesMap(map);
    };
    fetchAll();
  }, [activities]);

  useEffect(() => {
    if (cells.length && !selectedCell) setSelectedCell('__all__');
  }, [cells, selectedCell]);

  // Filter and sort by priority
  const filtered = activities
    .filter(a => {
      if (filterExecutive && !a.executive) return false;
      if (filterWeek) {
        // Parse ISO week format "YYYY-Www" to get Monday of that week
        const [yearStr, weekStr] = filterWeek.split('-W');
        const year = parseInt(yearStr);
        const week = parseInt(weekStr);
        // Calculate the Monday of the given ISO week
        const jan4 = new Date(year, 0, 4);
        const dayOfWeek = jan4.getDay() || 7; // Monday=1 ... Sunday=7
        const weekStart = new Date(jan4);
        weekStart.setDate(jan4.getDate() - dayOfWeek + 1 + (week - 1) * 7);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        const start = new Date(a.startDate);
        const end = new Date(a.endDate);
        // Activity overlaps with selected week
        if (end < weekStart || start > weekEnd) return false;
      }
      if (!search) return true;
      const s = search.toLowerCase();
      return a.name.toLowerCase().includes(s) || a.responsible.toLowerCase().includes(s);
    })
    .sort((a, b) => (PRIORITIES[b.priority]?.weight || 0) - (PRIORITIES[a.priority]?.weight || 0));

  const handleSave = async (form) => {
    if (readOnly) return;
    if (editingAct) {
      await updateActivity(editingAct.id, form);
    } else {
      const cellId = selectedCell === '__all__' ? form.cellId : selectedCell;
      await createActivity({ ...form, cellId });
    }
    setShowForm(false);
    setEditingAct(null);
  };

  const handleAddNote = async (text) => {
    if (readOnly) return;
    const targetId = noteTarget.id;
    await fetch(`/api/notes/${targetId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    setNoteTarget(null);
    const res = await fetch(`/api/notes/${targetId}`);
    const updated = await res.json();
    setNotesMap(prev => ({ ...prev, [targetId]: updated }));
  };

  const handleEditNote = async (activityId, noteId, text) => {
    if (readOnly) return;
    await fetch(`/api/notes/${activityId}/${noteId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    const res = await fetch(`/api/notes/${activityId}`);
    const updated = await res.json();
    setNotesMap(prev => ({ ...prev, [activityId]: updated }));
  };

  const handleDeleteNote = async (activityId, noteId) => {
    if (readOnly) return;
    await fetch(`/api/notes/${activityId}/${noteId}`, { method: 'DELETE' });
    const res = await fetch(`/api/notes/${activityId}`);
    const updated = await res.json();
    setNotesMap(prev => ({ ...prev, [activityId]: updated }));
  };

  const handleDownloadPDF = () => {
    window.print();
  };

  return (
    <div>
      {/* Cell selector */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <button
          onClick={() => setSelectedCell('__all__')}
          className={`px-3 py-1.5 rounded-sm text-sm font-medium transition-colors cursor-pointer ${
            selectedCell === '__all__'
              ? 'bg-navy-deep text-white'
              : 'bg-paper border border-ink/15 text-ink hover:bg-ink/4'
          }`}
        >
          Total
          <span className="ml-1 opacity-70">
            ({Object.values(cellCounts).reduce((s, v) => s + v, 0)})
          </span>
        </button>
        {cells.map(c => (
          <button
            key={c.id}
            onClick={() => setSelectedCell(c.id)}
            className={`px-3 py-1.5 rounded-sm text-sm font-medium transition-colors cursor-pointer ${
              selectedCell === c.id
                ? 'bg-navy-deep text-white'
                : 'bg-paper border border-ink/15 text-ink hover:bg-ink/4'
            }`}
          >
            {c.name}
            <span className="ml-1 opacity-70">
              ({cellCounts[c.id] ?? 0})
            </span>
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-4 no-print flex-wrap">
        <Input placeholder="Buscar por nombre o responsable..." value={search} onChange={setSearch} className="flex-1" />
        <input
          type="week"
          value={filterWeek}
          onChange={e => setFilterWeek(e.target.value)}
          className="px-2 py-1.5 rounded-sm text-xs border border-ink/15 bg-paper text-ink cursor-pointer"
          title="Filtrar por semana"
        />
        {filterWeek && (
          <button onClick={() => setFilterWeek('')} className="text-xs text-ink-mute hover:text-ink cursor-pointer">Limpiar</button>
        )}
        <button
          onClick={() => setFilterExecutive(!filterExecutive)}
          className={`px-3 py-2 rounded-sm text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
            filterExecutive
              ? 'bg-ochre text-paper'
              : 'bg-paper border border-ink/15 text-ink hover:bg-ink/4'
          }`}
        >
          Presidencia / VP
        </button>
        {!readOnly && <Btn onClick={() => { setEditingAct(null); setShowForm(true); }}>+ Actividad</Btn>}
        <Btn variant="secondary" onClick={handleDownloadPDF}>PDF</Btn>
      </div>

      {readOnly && (
        <p className="text-xs text-ink-mute mb-4">Modo solo lectura: puedes filtrar y consultar, sin cambios.</p>
      )}

      {/* Activities list */}
      {loading ? (
        <p className="text-ink-mute">Cargando...</p>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-ink-mute">
          <p className="text-lg">Sin actividades</p>
          <p className="text-sm">Crea la primera actividad para esta celula</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(act => (
            <ActivityCard
              key={act.id}
              act={act}
              cellName={selectedCell === '__all__' ? cells.find(c => c.id === act.cellId)?.name : cells.find(c => c.id === selectedCell)?.name}
              notes={notesMap[act.id] || []}
              onEdit={(a) => { if (!readOnly) { setEditingAct(a); setShowForm(true); } }}
              onArchive={readOnly ? () => {} : archiveActivity}
              onDelete={readOnly ? () => {} : deleteActivity}
              onAddNote={(a) => { if (!readOnly) setNoteTarget(a); }}
              onEditNote={handleEditNote}
              onDeleteNote={handleDeleteNote}
              onToggleMilestone={readOnly ? () => {} : toggleMilestone}
              readOnly={readOnly}
            />
          ))}
        </div>
      )}

      {/* Activity Form Modal */}
      {!readOnly && showForm && (
        <Modal title={editingAct ? 'Editar actividad' : 'Nueva actividad'} onClose={() => { setShowForm(false); setEditingAct(null); }} wide>
          <ActivityForm
            activity={editingAct}
            cells={cells}
            onSave={handleSave}
            onCancel={() => { setShowForm(false); setEditingAct(null); }}
          />
        </Modal>
      )}

      {/* Note Form Modal */}
      {!readOnly && noteTarget && (
        <Modal title={`Nota bilateral: ${noteTarget.name}`} onClose={() => setNoteTarget(null)}>
          <NoteForm onSave={handleAddNote} onCancel={() => setNoteTarget(null)} />
        </Modal>
      )}
    </div>
  );
}
