import { useState, useCallback } from 'react';

export default function useNotes(activityId) {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchNotes = useCallback(async () => {
    if (!activityId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/notes/${activityId}`);
      const data = await res.json();
      setNotes(data);
    } catch (err) {
      console.error('Error fetching notes:', err);
    } finally {
      setLoading(false);
    }
  }, [activityId]);

  const addNote = async (text) => {
    const res = await fetch(`/api/notes/${activityId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) throw new Error('Error adding note');
    const note = await res.json();
    setNotes(prev => [note, ...prev]);
    return note;
  };

  return { notes, loading, fetchNotes, addNote };
}
