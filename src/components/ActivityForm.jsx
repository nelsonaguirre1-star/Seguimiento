import { useState } from 'react';
import Input from './Input';
import Select from './Select';
import TextArea from './TextArea';
import Btn from './Btn';
import { PRIORITIES, STATUSES, GAPS } from '../utils/constants';
import { uid } from '../utils/uid';

const emptyActivity = {
  name: '', cellId: '', priority: 'piedras_importantes', status: 'verde',
  responsible: '', startDate: '', endDate: '', gap: 'none',
  executive: false,
  milestones: [], blockers: [],
};

export default function ActivityForm({ activity, cells, onSave, onCancel }) {
  const [form, setForm] = useState(activity || emptyActivity);

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  // Milestones management
  const addMilestone = () => {
    set('milestones', [...form.milestones, { id: uid(), name: '', date: '', done: false }]);
  };
  const updateMilestone = (idx, key, val) => {
    const updated = [...form.milestones];
    updated[idx] = { ...updated[idx], [key]: val };
    set('milestones', updated);
  };
  const removeMilestone = (idx) => {
    set('milestones', form.milestones.filter((_, i) => i !== idx));
  };

  // Blockers management
  const addBlocker = () => {
    set('blockers', [...form.blockers, { id: uid(), text: '', date: new Date().toISOString().slice(0, 10), resolved: false }]);
  };
  const updateBlocker = (idx, key, val) => {
    const updated = [...form.blockers];
    updated[idx] = { ...updated[idx], [key]: val };
    set('blockers', updated);
  };
  const removeBlocker = (idx) => {
    set('blockers', form.blockers.filter((_, i) => i !== idx));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input label="Nombre de la actividad" value={form.name} onChange={v => set('name', v)} required />

      <div className="grid grid-cols-2 gap-3">
        <Select label="Celula" value={form.cellId} onChange={v => set('cellId', v)}>
          <option value="">Seleccionar...</option>
          {cells.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
        <Select label="Prioridad" value={form.priority} onChange={v => set('priority', v)}>
          {Object.entries(PRIORITIES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Input label="Fecha inicio" type="date" value={form.startDate} onChange={v => set('startDate', v)} required />
        <Input label="Fecha fin" type="date" value={form.endDate} onChange={v => set('endDate', v)} required />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Input label="Responsable" value={form.responsible} onChange={v => set('responsible', v)} required />
        <Select label="Estado (semaforo)" value={form.status} onChange={v => set('status', v)}>
          {Object.entries(STATUSES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </Select>
      </div>

      <Select label="Gap CDE v2.0" value={form.gap} onChange={v => set('gap', v)}>
        {Object.entries(GAPS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
      </Select>

      {/* Executive flag */}
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={form.executive || false}
          onChange={e => set('executive', e.target.checked)}
          className="rounded-sm accent-navy-deep w-4 h-4 cursor-pointer"
        />
        <span className="text-sm font-medium text-ink">Actividad de Presidencia / Vicepresidencia</span>
      </label>

      {/* Milestones */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-semibold text-ink-mute">Hitos</label>
          <Btn type="button" small variant="ghost" onClick={addMilestone}>+ Hito</Btn>
        </div>
        {form.milestones.map((m, i) => (
          <div key={m.id} className="flex items-center gap-2 mb-1">
            <input type="checkbox" checked={m.done} onChange={() => updateMilestone(i, 'done', !m.done)} className="rounded" />
            <input
              className="flex-1 text-sm border border-ink/15 rounded px-2 py-1"
              value={m.name} placeholder="Nombre del hito"
              onChange={e => updateMilestone(i, 'name', e.target.value)}
            />
            <input
              type="date" className="text-sm border border-ink/15 rounded px-2 py-1"
              value={m.date} onChange={e => updateMilestone(i, 'date', e.target.value)}
            />
            <button type="button" onClick={() => removeMilestone(i)} className="text-red-500 text-sm cursor-pointer">✕</button>
          </div>
        ))}
      </div>

      {/* Blockers */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-semibold text-ink-mute">Bloqueos</label>
          <Btn type="button" small variant="ghost" onClick={addBlocker}>+ Bloqueo</Btn>
        </div>
        {form.blockers.map((b, i) => (
          <div key={b.id} className="flex items-center gap-2 mb-1">
            <input type="checkbox" checked={b.resolved} onChange={() => updateBlocker(i, 'resolved', !b.resolved)} className="rounded" title="Resuelto" />
            <input
              className="flex-1 text-sm border border-ink/15 rounded px-2 py-1"
              value={b.text} placeholder="Descripcion del bloqueo"
              onChange={e => updateBlocker(i, 'text', e.target.value)}
            />
            <button type="button" onClick={() => removeBlocker(i)} className="text-red-500 text-sm cursor-pointer">✕</button>
          </div>
        ))}
      </div>

      {/* Submit */}
      <div className="flex gap-2 justify-end pt-2">
        <Btn type="button" variant="secondary" onClick={onCancel}>Cancelar</Btn>
        <Btn type="submit">{activity ? 'Guardar cambios' : 'Crear actividad'}</Btn>
      </div>
    </form>
  );
}
