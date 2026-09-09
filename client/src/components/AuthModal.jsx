import React, { useState } from 'react';
import { 
  Lock, Mail, User, Building, ArrowRight, ShieldCheck, 
  Sparkles, CheckCircle, Eye, EyeOff, AlertCircle
} from 'lucide-react';
import { login, register } from '../services/auth.js';

export default function AuthModal({ isOpen, onAuthSuccess }) {
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Form states
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === 'login') {
        const res = await login(email, password);
        onAuthSuccess(res.user);
      } else {
        if (!name.trim()) throw new Error('Inserisci il tuo nome');
        if (password.length < 6) throw new Error('La password deve avere almeno 6 caratteri');
        const res = await register(name, email, password, company);
        onAuthSuccess(res.user);
      }
    } catch (err) {
      setError(err.message || 'Errore durante l\'autenticazione');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-overlay">
      <div className="auth-card">
        {/* Left / Top Brand Highlight */}
        <div className="auth-header">
          <div className="auth-logo-badge">
            <Sparkles size={24} color="#FFFFFF" />
          </div>
          <h1 className="auth-title">NonPosto.io</h1>
          <p className="auth-subtitle">
            Piattaforma Professionale di Social Media Management & Automazione Multi-Canale
          </p>
        </div>

        {/* Tab Selector */}
        <div className="auth-tabs">
          <button 
            type="button"
            className={`auth-tab ${mode === 'login' ? 'active' : ''}`}
            onClick={() => { setMode('login'); setError(null); }}
          >
            Accedi
          </button>
          <button 
            type="button"
            className={`auth-tab ${mode === 'register' ? 'active' : ''}`}
            onClick={() => { setMode('register'); setError(null); }}
          >
            Crea Account Esclusivo
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="auth-error-banner">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="auth-form">
          {mode === 'register' && (
            <>
              <div className="form-group">
                <label>Nome Completo</label>
                <div className="auth-input-wrapper">
                  <User size={18} className="auth-input-icon" />
                  <input
                    type="text"
                    required
                    placeholder="Mario Rossi"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Azienda / Agenzia (opzionale)</label>
                <div className="auth-input-wrapper">
                  <Building size={18} className="auth-input-icon" />
                  <input
                    type="text"
                    placeholder="Nome Agenzia o Brand"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                  />
                </div>
              </div>
            </>
          )}

          <div className="form-group">
            <label>Indirizzo Email</label>
            <div className="auth-input-wrapper">
              <Mail size={18} className="auth-input-icon" />
              <input
                type="email"
                required
                placeholder="nome@azienda.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Password</label>
            <div className="auth-input-wrapper">
              <Lock size={18} className="auth-input-icon" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder={mode === 'register' ? 'Minimo 6 caratteri' : '••••••••'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                className="auth-eye-btn"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button 
            type="submit" 
            className="btn-primary auth-submit-btn" 
            disabled={loading}
          >
            {loading ? (
              <span>Caricamento...</span>
            ) : mode === 'login' ? (
              <>
                <span>Accedi alla Piattaforma</span>
                <ArrowRight size={18} />
              </>
            ) : (
              <>
                <span>Attiva il tuo Spazio Privato</span>
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        {/* Multi-Tenant Privacy Guarantee */}
        <div className="auth-guarantee-box">
          <div className="guarantee-item">
            <ShieldCheck size={18} color="#10B981" />
            <span>Spazio 100% isolato: i tuoi canali, post e token sono visibili solo a te.</span>
          </div>
          <div className="guarantee-item">
            <CheckCircle size={18} color="#8B5CF6" />
            <span>Supporto 8 social, Storage Cloud pCloud & server MCP AI integrati.</span>
          </div>
        </div>

        {/* Switch Link */}
        <div className="auth-footer-toggle">
          {mode === 'login' ? (
            <p>
              Non hai ancora un account?{' '}
              <button 
                type="button" 
                className="auth-link-btn"
                onClick={() => { setMode('register'); setError(null); }}
              >
                Registrati gratuitamente
              </button>
            </p>
          ) : (
            <p>
              Hai già un account?{' '}
              <button 
                type="button" 
                className="auth-link-btn"
                onClick={() => { setMode('login'); setError(null); }}
              >
                Accedi qui
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
