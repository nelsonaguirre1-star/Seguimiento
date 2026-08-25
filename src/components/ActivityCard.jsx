import { useState } from 'react';
import Badge from './Badge';
import ProgressBar from './ProgressBar';
import Btn from './Btn';
import { PRIORITIES, STATUSES, GAPS } from '../utils/constants';
import { calcPct } from '../utils/calc-pct';
import { calcTimeRisk } from '../utils/calc-time-risk';
import { fmtDate } from '../utils/fmt-date';

export default function ActivityCard({ act, onEdit, onArchive, onDelete, onAddNote, onEditNote, onDeleteNote, onToggleMilestone, notes = [], cellName, readOnly = false }) {
  const [expanded, setExpanded] = useState(false);
  const [editingNote, setEditingNote] = useState(null);
  const [editNoteText, setEditNoteText] = useState('');

  const pct = calcPct(act.milestones);
  const timeRisk = calcTimeRisk(act.startDate, act.endDate, pct);
  const pri = PRIORITIES[act.priority] || PRIORITIES.arena;
  const status = STATUSES[act.status] || STATUSES.verde;
  const activeMilestones = act.milestones || [];
  const doneCount = activeMilestones.filter(m => m.done).length;
  const activeBlockers = (act.blockers || []).filter(b => !b.resolved);

  return (
    <div className="bg-paper border border-ink/10 rounded-sm overflow-hidden" style={{ borderTopColor: pri.color, borderTopWidth: 3 }}>
      {/* Header - always visible */}
      <div className="p-4 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <Badge color={pri.color} bg={pri.bg}>{pri.label}</Badge>
              <Badge color={status.color} bg={status.bg}>{status.label}</Badge>
              {act.executive && (
                <Badge color="#FFFFFF" bg="#0F2147">★ Presidencia/VP</Badge>
              )}
              {timeRisk !== act.status && (
                <Badge color={STATUSES[timeRisk]?.color} bg={STATUSES[timeRisk]?.bg}>
                  {timeRisk}
                </Badge>
              )}
              {activeBlockers.length > 0 && (
                <Badge color="#A02B2B" bg="#F6DCDC">{activeBlockers.length} bloq.</Badge>
              )}
              {cellName && <Badge>{cellName}</Badge>}
            </div>
            <h3 className="font-serif font-semibold text-ink truncate">{act.name}</h3>
            <p className="text-[11px] font-mono text-ink-mute mt-0.5">
              {cellName && <span className="font-semibold">{cellName}</span>}{cellName && ' · '}{act.responsible} · {fmtDate(act.startDate)} → {fmtDate(act.endDate)}
            </p>
          </div>
          <div className="text-right shrink-0 flex flex-col items-end gap-1">
            <span className="text-lg font-bold text-navy-deep font-mono">{pct}%</span>
            <p className="text-[11px] font-mono text-ink-mute">{doneCount}/{activeMilestones.length} hitos</p>
            {!readOnly && (
              <button
                onClick={(e) => { e.stopPropagation(); onAddNote(act); }}
                className="mt-1 px-2 py-0.5 text-[11px] font-medium rounded-sm bg-ink/5 border border-ink/15 text-ink hover:bg-ink/10 transition-colors cursor-pointer"
              >
                + Nota bilateral
              </button>
            )}
          </div>
        </div>
        <div className="mt-2">
          <ProgressBar pct={pct} />
        </div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-ink/10 px-4 pb-4">
          {/* Milestones */}
          {activeMilestones.length > 0 && (
            <div className="mt-3">
              <p className="text-[11px] font-mono font-semibold text-ink-mute mb-1">Hitos</p>
              <ul className="space-y-1">
                {activeMilestones.map(m => (
                  <li key={m.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={m.done}
                      disabled={readOnly}
                      onChange={(e) => { e.stopPropagation(); onToggleMilestone(act.id, m.id, !m.done); }}
                      className="rounded-sm cursor-pointer accent-navy-deep disabled:cursor-not-allowed"
                    />
                    <span className={m.done ? 'line-through text-ink-mute' : 'text-ink'}>{m.name}</span>
                    <span className="text-[11px] font-mono text-ink-mute ml-auto">{fmtDate(m.date)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Blockers */}
          {(act.blockers || []).length > 0 && (
            <div className="mt-3">
              <p className="text-[11px] font-mono font-semibold text-ink-mute mb-1">Bloqueos</p>
              <ul className="space-y-1">
                {act.blockers.map(b => (
                  <li key={b.id} className={`text-xs px-2 py-1 rounded-sm ${b.resolved ? 'bg-[#DCEBE0] text-[#2D6A4F] line-through' : 'bg-[#F6DCDC] text-[#A02B2B]'}`}>
                    {b.text} <span className="text-ink-mute">({fmtDate(b.date)})</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Recent notes */}
          {notes.length > 0 && (
            <div className="mt-3">
              <p className="text-[11px] font-mono font-semibold text-ink-mute mb-1">Notas recientes</p>
              {notes.slice(0, 5).map(n => (
                <div key={n.id} className="text-xs bg-ink/4 rounded-sm p-2 mb-1">
                  {editingNote === n.id && !readOnly ? (
                    <div className="flex flex-col gap-1">
                      <textarea
                        className="w-full border border-ink/20 rounded-sm p-1 text-xs bg-paper"
                        rows={2}
                        value={editNoteText}
                        onChange={e => setEditNoteText(e.target.value)}
                      />
                      <div className="flex gap-1">
                        <button onClick={(e) => { e.stopPropagation(); onEditNote(act.id, n.id, editNoteText); setEditingNote(null); }} className="text-[10px] px-1.5 py-0.5 bg-navy-deep text-white rounded-sm cursor-pointer">Guardar</button>
                        <button onClick={(e) => { e.stopPropagation(); setEditingNote(null); }} className="text-[10px] px-1.5 py-0.5 bg-ink/10 rounded-sm cursor-pointer">Cancelar</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-2">
                      <span><span className="font-mono font-medium">{fmtDate(n.date)}</span>: {n.text}</span>
                      {!readOnly && (
                        <div className="flex gap-1 shrink-0">
                          <button onClick={(e) => { e.stopPropagation(); setEditingNote(n.id); setEditNoteText(n.text); }} className="text-[10px] px-1 py-0.5 text-ink-mute hover:text-ink cursor-pointer">✏️</button>
                          <button onClick={(e) => { e.stopPropagation(); if (confirm('¿Eliminar esta nota?')) onDeleteNote(act.id, n.id); }} className="text-[10px] px-1 py-0.5 text-ink-mute hover:text-red-600 cursor-pointer">🗑️</button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
              {notes.length > 3 && <p className="text-xs text-ink-mute">+{notes.length - 3} notas anteriores</p>}
            </div>
          )}

          {/* Actions */}
          {!readOnly && (
            <div className="mt-3 flex gap-2 flex-wrap">
              <Btn small variant="secondary" onClick={() => onEdit(act)}>Editar</Btn>
              <Btn small variant="secondary" onClick={() => onAddNote(act)}>+ Nota bilateral</Btn>
              {!act.archived && (
                <Btn small variant="ochre" onClick={() => onArchive(act.id, true)}>
                  Cumplimiento
                </Btn>
              )}
              {act.archived && (
                <Btn small variant="secondary" onClick={() => onArchive(act.id, false)}>
                  Reabrir
                </Btn>
              )}
              {onDelete && (
                <Btn small variant="danger" onClick={() => { if (confirm('¿Eliminar esta actividad?')) onDelete(act.id); }}>Eliminar</Btn>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
