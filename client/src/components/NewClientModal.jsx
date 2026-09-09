import React, { useState } from 'react';
import { X, Building2, Plus, Check } from 'lucide-react';

const COLOR_PRESETS = [
  '#8B5CF6', '#EC4899', '#06B6D4', '#10B981', 
  '#F59E0B', '#EF4444', '#3B82F6', '#6366F1'
];

export default function NewClientModal({ 
  isOpen, 
  onClose, 
  onCreateClient 
}) {
  if (!isOpen) return null;

  const [name, setName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [color, setColor] = useState('#8B5CF6');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      await onCreateClient({
        name: name.trim(),
        logo_url: logoUrl.trim(),
        color
      });
      onClose();
    } catch (err) {
      alert('Errore creazione cliente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="standard-modal" style={{ maxWidth: 500 }}>
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title">
            <Building2 size={22} color="#8B5CF6" />
            <span>Nuovo Cliente / Workspace Multi-Account</span>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="modal-content-scroll">
          <p style={{ fontSize: '0.82rem', color: '#94A3B8' }}>
            Ogni cliente avrà il proprio calendario separato, canali collegati, libreria media e impostazioni indipendenti.
          </p>

          <div className="form-group">
            <label>Nome del Cliente / Brand:</label>
            <input
              type="text"
              className="input-field"
              placeholder="Es. Pasticceria Rossi, Studio Legale Alpha"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>URL Logo Aziendale (Opzionale):</label>
            <input
              type="url"
              className="input-field"
              placeholder="https://... o lascia vuoto per icona automatica"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Colore Brand:</label>
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              {COLOR_PRESETS.map(c => (
                <button
                  key={c}
                  type="button"
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: '50%',
                    backgroundColor: c,
                    border: color === c ? '2px solid white' : 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: color === c ? `0 0 10px ${c}` : 'none'
                  }}
                  onClick={() => setColor(c)}
                >
                  {color === c && <Check size={14} color="white" />}
                </button>
              ))}
            </div>
          </div>

          <div className="modal-footer" style={{ margin: '10px -24px -24px -24px' }}>
            <button type="button" className="btn-secondary" onClick={onClose}>
              Annulla
            </button>
            <button type="submit" className="btn-primary" disabled={isSubmitting}>
              <Plus size={16} />
              <span>{isSubmitting ? 'Creazione...' : 'Crea Cliente'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
