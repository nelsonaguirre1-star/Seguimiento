import { useEffect, useState } from 'react';
import Card from '../components/Card';
import Btn from '../components/Btn';
import useBackup from '../hooks/useBackup';

export default function ConfigView({ cells, onUpdateCell, readOnly = false, currentUser = null }) {
  const { createBackup, exportData, importData } = useBackup();
  const [editingCell, setEditingCell] = useState(null);
  const [cellName, setCellName] = useState('');
  const [cellLeader, setCellLeader] = useState('');
  const [msg, setMsg] = useState('');
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [editingUserId, setEditingUserId] = useState(null);
  const [editingUserName, setEditingUserName] = useState('');
  const [editingUserRole, setEditingUserRole] = useState('reader');
  const [editingUserPassword, setEditingUserPassword] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newName, setNewName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('reader');
  const [importing, setImporting] = useState(false);

  const loadUsers = async () => {
    if (readOnly) return;
    setUsersLoading(true);
    try {
      const res = await fetch('/api/users');
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || 'No fue posible cargar usuarios');
      }
      const data = await res.json();
      setUsers(data || []);
    } catch (err) {
      setMsg(err.message || 'Error cargando usuarios');
      setTimeout(() => setMsg(''), 3000);
    } finally {
      setUsersLoading(false);
    }
  };

  useEffect(() => {
    if (!readOnly) loadUsers();
  }, [readOnly]);

  const startEdit = (cell) => {
    if (readOnly) return;
    setEditingCell(cell.id);
    setCellName(cell.name);
    setCellLeader(cell.leader || '');
  };

  const saveCell = async () => {
    if (readOnly) return;
    await onUpdateCell(editingCell, { name: cellName, leader: cellLeader });
    setEditingCell(null);
    setMsg('Celula actualizada');
    setTimeout(() => setMsg(''), 2000);
  };

  const handleBackup = async () => {
    if (readOnly) return;
    await createBackup();
    setMsg('Backup creado exitosamente');
    setTimeout(() => setMsg(''), 2000);
  };

  const handleExport = async () => {
    if (readOnly) return;
    await exportData();
    setMsg('Datos exportados');
    setTimeout(() => setMsg(''), 2000);
  };

  const handleImport = async (event) => {
    if (readOnly) return;
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    if (!confirm('Esta acción sobrescribirá los datos actuales. ¿Desea continuar?')) return;

    setImporting(true);
    try {
      const result = await importData(file);
      const imported = result?.imported || {};
      setMsg(`Importación exitosa · cells:${imported.cells ?? 0}, activities:${imported.activities ?? 0}, archive:${imported.archive ?? 0}, notes:${imported.notes ?? 0}`);
      setTimeout(() => setMsg(''), 5000);
      window.location.reload();
    } catch (err) {
      setMsg(err.message || 'Error importando datos');
      setTimeout(() => setMsg(''), 4000);
    } finally {
      setImporting(false);
    }
  };

  const handleReset = async () => {
    if (readOnly) return;
    if (!confirm('ATENCION: Esto eliminara TODOS los datos y restaurara el estado inicial. Esta seguro?')) return;
    if (!confirm('SEGUNDA CONFIRMACION: Todos los datos se perderan permanentemente. Continuar?')) return;
    // Reset by restoring to empty state - would need server endpoint
    setMsg('Reset no implementado en esta version');
    setTimeout(() => setMsg(''), 3000);
  };

  const startEditUser = (user) => {
    setEditingUserId(user.id);
    setEditingUserName(user.name || user.username);
    setEditingUserRole(user.role || 'reader');
    setEditingUserPassword('');
  };

  const cancelEditUser = () => {
    setEditingUserId(null);
    setEditingUserName('');
    setEditingUserRole('reader');
    setEditingUserPassword('');
  };

  const saveUser = async () => {
    if (!editingUserId) return;
    const payload = {
      name: editingUserName,
      role: editingUserRole,
    };
    if (editingUserPassword.trim()) payload.password = editingUserPassword.trim();

    const res = await fetch(`/api/users/${editingUserId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      setMsg(data?.error || 'No fue posible actualizar usuario');
      setTimeout(() => setMsg(''), 3000);
      return;
    }
    setUsers(prev => prev.map(u => (u.id === data.id ? data : u)));
    cancelEditUser();
    setMsg('Usuario actualizado');
    setTimeout(() => setMsg(''), 2000);
  };

  const createUser = async () => {
    const payload = {
      username: newUsername.trim(),
      name: newName.trim(),
      password: newPassword,
      role: newRole,
    };
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      setMsg(data?.error || 'No fue posible crear usuario');
      setTimeout(() => setMsg(''), 3000);
      return;
    }
    setUsers(prev => [...prev, data]);
    setNewUsername('');
    setNewName('');
    setNewPassword('');
    setNewRole('reader');
    setMsg('Usuario creado');
    setTimeout(() => setMsg(''), 2000);
  };

  const deleteUser = async (user) => {
    if (!confirm(`¿Eliminar usuario ${user.username}?`)) return;
    const res = await fetch(`/api/users/${user.id}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) {
      setMsg(data?.error || 'No fue posible eliminar usuario');
      setTimeout(() => setMsg(''), 3000);
      return;
    }
    setUsers(prev => prev.filter(u => u.id !== user.id));
    setMsg('Usuario eliminado');
    setTimeout(() => setMsg(''), 2000);
  };

  return (
    <div className="space-y-6">
      {readOnly && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-2 rounded-sm text-sm">
          Modo solo lectura activo: configuración y acciones de datos bloqueadas.
        </div>
      )}

      {msg && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-2 rounded-sm text-sm">
          {msg}
        </div>
      )}

      {/* Cells config */}
      <Card className="p-5">
        <h3 className="font-semibold text-navy-deep mb-3">Celulas del CDE</h3>
        <div className="space-y-2">
          {cells.map(c => (
            <div key={c.id} className="flex items-center gap-3 p-2 rounded-sm hover:bg-ink/4">
              {editingCell === c.id ? (
                <>
                  <input
                    className="flex-1 text-sm border border-ink/15 rounded px-2 py-1"
                    value={cellName}
                    onChange={e => setCellName(e.target.value)}
                  />
                  <input
                    className="w-40 text-sm border border-ink/15 rounded px-2 py-1"
                    value={cellLeader} onChange={e => setCellLeader(e.target.value)}
                    placeholder="Lider"
                  />
                  <Btn small onClick={saveCell}>Guardar</Btn>
                  <Btn small variant="ghost" onClick={() => setEditingCell(null)}>Cancelar</Btn>
                </>
              ) : (
                <>
                  <span className="flex-1 text-sm font-medium">{c.name}</span>
                  <span className="text-xs text-ink-mute w-40">{c.leader || 'Sin lider asignado'}</span>
                  {!readOnly && <Btn small variant="ghost" onClick={() => startEdit(c)}>Editar</Btn>}
                </>
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* Backup & Export */}
      <Card className="p-5">
        <h3 className="font-semibold text-navy-deep mb-3">Backup y Datos</h3>
        <div className="flex gap-3 flex-wrap">
          <Btn variant="secondary" onClick={handleBackup} disabled={readOnly}>Crear backup manual</Btn>
          <Btn variant="secondary" onClick={handleExport} disabled={readOnly}>Exportar datos (JSON)</Btn>
          <label className={`inline-flex items-center px-3 py-2 rounded-sm text-sm border ${readOnly || importing ? 'opacity-60 cursor-not-allowed border-ink/20 text-ink-mute' : 'cursor-pointer border-ink/30 text-ink hover:bg-ink/5'}`}>
            {importing ? 'Importando...' : 'Importar datos (JSON)'}
            <input
              type="file"
              accept="application/json,.json"
              className="hidden"
              disabled={readOnly || importing}
              onChange={handleImport}
            />
          </label>
          <Btn variant="danger" onClick={handleReset} disabled={readOnly}>Reset completo</Btn>
        </div>
        <p className="text-xs text-ink-mute mt-2">
          Los backups automaticos se generan antes de cada escritura (max 30 snapshots en /data/backups/).
        </p>
      </Card>

      {!readOnly && (
        <Card className="p-5">
          <h3 className="font-semibold text-navy-deep mb-3">Administración de usuarios</h3>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-4">
            <input
              className="text-sm border border-ink/15 rounded px-2 py-1"
              placeholder="Usuario (username)"
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value.toLowerCase())}
            />
            <input
              className="text-sm border border-ink/15 rounded px-2 py-1"
              placeholder="Nombre visible"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
            <input
              type="password"
              className="text-sm border border-ink/15 rounded px-2 py-1"
              placeholder="Contraseña"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            <div className="flex gap-2">
              <select
                className="text-sm border border-ink/15 rounded px-2 py-1 flex-1"
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
              >
                <option value="reader">Solo lectura</option>
                <option value="editor">Editor</option>
              </select>
              <Btn
                small
                onClick={createUser}
                disabled={!newUsername.trim() || !newPassword || newPassword.length < 6}
              >
                Crear
              </Btn>
            </div>
          </div>

          {usersLoading ? (
            <p className="text-sm text-ink-mute">Cargando usuarios...</p>
          ) : users.length === 0 ? (
            <p className="text-sm text-ink-mute">No hay usuarios.</p>
          ) : (
            <div className="space-y-2">
              {users.map(u => (
                <div key={u.id} className="border border-ink/10 rounded-sm p-2">
                  {editingUserId === u.id ? (
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-2 items-center">
                      <p className="text-sm text-ink-mute md:col-span-1">@{u.username}</p>
                      <input
                        className="text-sm border border-ink/15 rounded px-2 py-1 md:col-span-1"
                        value={editingUserName}
                        onChange={(e) => setEditingUserName(e.target.value)}
                      />
                      <select
                        className="text-sm border border-ink/15 rounded px-2 py-1 md:col-span-1"
                        value={editingUserRole}
                        onChange={(e) => setEditingUserRole(e.target.value)}
                        disabled={u.id === currentUser?.id}
                      >
                        <option value="reader">Solo lectura</option>
                        <option value="editor">Editor</option>
                      </select>
                      <input
                        type="password"
                        className="text-sm border border-ink/15 rounded px-2 py-1 md:col-span-1"
                        placeholder="Nueva contraseña (opcional)"
                        value={editingUserPassword}
                        onChange={(e) => setEditingUserPassword(e.target.value)}
                      />
                      <div className="flex gap-2 md:justify-end">
                        <Btn small onClick={saveUser}>Guardar</Btn>
                        <Btn small variant="ghost" onClick={cancelEditUser}>Cancelar</Btn>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 flex-wrap justify-between">
                      <div>
                        <p className="text-sm font-medium text-ink">{u.name || u.username}</p>
                        <p className="text-xs text-ink-mute">@{u.username} · {u.role === 'reader' ? 'Solo lectura' : 'Editor'}{u.id === currentUser?.id ? ' · Sesión actual' : ''}</p>
                      </div>
                      <div className="flex gap-2">
                        <Btn small variant="ghost" onClick={() => startEditUser(u)}>Editar</Btn>
                        <Btn
                          small
                          variant="danger"
                          onClick={() => deleteUser(u)}
                          disabled={u.id === currentUser?.id}
                        >
                          Eliminar
                        </Btn>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
