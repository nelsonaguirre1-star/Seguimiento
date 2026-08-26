export default function useBackup() {
  const createBackup = async () => {
    const res = await fetch('/api/backup', { method: 'POST' });
    if (!res.ok) throw new Error('Error creating backup');
    return await res.json();
  };

  const restore = async (filename) => {
    const res = await fetch('/api/restore', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename }),
    });
    if (!res.ok) throw new Error('Error restoring backup');
    return await res.json();
  };

  const exportData = async () => {
    const res = await fetch('/api/export');
    if (!res.ok) throw new Error('Error exporting');
    const data = await res.json();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `seguimiento-cde-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importData = async (file) => {
    if (!file) throw new Error('Debe seleccionar un archivo JSON');

    let payload;
    try {
      const text = await file.text();
      payload = JSON.parse(text);
    } catch {
      throw new Error('El archivo no es un JSON válido');
    }

    const res = await fetch('/api/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data?.error || 'Error importando datos');
    }

    return data;
  };

  return { createBackup, restore, exportData, importData };
}
