import { useState } from 'react';
import TextArea from './TextArea';
import Btn from './Btn';

export default function NoteForm({ onSave, onCancel }) {
  const [text, setText] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    onSave(text.trim());
    setText('');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <TextArea
        label="Nota de bilateral"
        value={text}
        onChange={setText}
        placeholder="Registrar acuerdos, decisiones o comentarios del bilateral..."
        rows={4}
      />
      <div className="flex gap-2 justify-end">
        <Btn type="button" variant="secondary" onClick={onCancel}>Cancelar</Btn>
        <Btn type="submit" disabled={!text.trim()}>Guardar nota</Btn>
      </div>
    </form>
  );
}
