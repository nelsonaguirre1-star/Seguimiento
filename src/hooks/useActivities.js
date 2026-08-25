import { useState, useEffect, useCallback } from 'react';

export default function useActivities(cellId = null) {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchActivities = useCallback(async () => {
    try {
      const url = cellId ? `/api/activities?cellId=${cellId}` : '/api/activities';
      const res = await fetch(url);
      const data = await res.json();
      setActivities(data);
    } catch (err) {
      console.error('Error fetching activities:', err);
    } finally {
      setLoading(false);
    }
  }, [cellId]);

  useEffect(() => { fetchActivities(); }, [fetchActivities]);

  const createActivity = async (activity) => {
    const res = await fetch('/api/activities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(activity),
    });
    if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
    const created = await res.json();
    setActivities(prev => [...prev, created]);
    return created;
  };

  const updateActivity = async (id, updates) => {
    const res = await fetch(`/api/activities/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
    const updated = await res.json();
    setActivities(prev => prev.map(a => a.id === id ? updated : a));
    return updated;
  };

  const deleteActivity = async (id) => {
    const res = await fetch(`/api/activities/${id}`, { method: 'DELETE' });
    if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
    setActivities(prev => prev.filter(a => a.id !== id));
  };

  const archiveActivity = async (id, archived = true) => {
    const res = await fetch(`/api/activities/${id}/archive`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ archived }),
    });
    if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
    setActivities(prev => prev.filter(a => a.id !== id));
    return await res.json();
  };

  const toggleMilestone = async (actId, milestoneId, done) => {
    // Optimistic update
    setActivities(prev => prev.map(a => {
      if (a.id !== actId) return a;
      const milestones = a.milestones.map(m => m.id === milestoneId ? { ...m, done } : m);
      const pct = milestones.length ? Math.round(milestones.filter(m => m.done).length / milestones.length * 100) : 0;
      return { ...a, milestones, pct };
    }));

    try {
      const res = await fetch(`/api/activities/${actId}/milestone/${milestoneId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ done }),
      });
      if (!res.ok) throw new Error('Failed to toggle milestone');
      const updated = await res.json();
      setActivities(prev => prev.map(a => a.id === actId ? updated : a));
    } catch (err) {
      // Revert on error
      fetchActivities();
      console.error(err);
    }
  };

  return { activities, loading, createActivity, updateActivity, deleteActivity, archiveActivity, toggleMilestone, refetch: fetchActivities };
}
