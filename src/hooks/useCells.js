import { useState, useEffect, useCallback } from 'react';

export default function useCells(enabled = true) {
  const [cells, setCells] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchCells = useCallback(async () => {
    if (!enabled) {
      setCells([]);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const res = await fetch('/api/cells');
      if (res.status === 401) {
        setCells([]);
        return;
      }
      const data = await res.json();
      setCells(data);
    } catch (err) {
      console.error('Error fetching cells:', err);
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => { fetchCells(); }, [fetchCells]);

  const updateCell = async (id, updates) => {
    try {
      const res = await fetch(`/api/cells/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error('Error updating cell');
      const updated = await res.json();
      setCells(prev => prev.map(c => c.id === id ? updated : c));
      return updated;
    } catch (err) {
      console.error('Error updating cell:', err);
      throw err;
    }
  };

  return { cells, loading, updateCell, refetch: fetchCells };
}
