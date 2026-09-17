import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './style.css';

function App() {
  const [health, setHealth] = useState('Vérification…');
  const [prompt, setPrompt] = useState('');
  const [result, setResult] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch('/api/health').then(r => r.json()).then(data => setHealth(data.status === 'ok' ? 'API connectée' : 'API indisponible')).catch(() => setHealth('API indisponible'));
  }, []);

  async function generate(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setResult('');
    try {
      const response = await fetch('/api/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt }) });
      const data = await response.json();
      setResult(response.ok ? `Tâche envoyée à ComfyUI : ${data.prompt_id}` : (data.detail ?? 'Erreur inconnue'));
    } catch {
      setResult('Impossible de joindre l’API. Démarrez le backend.');
    } finally {
      setBusy(false);
    }
  }

  return <main><div className="badge">MILESTONE 001</div><h1>Personal Video AI</h1><p className="intro">Votre studio vidéo IA personnel, en construction.</p><p className="status">● {health}</p><form onSubmit={generate}><label htmlFor="prompt">Décrivez une scène</label><textarea id="prompt" value={prompt} onChange={e => setPrompt(e.target.value)} minLength={1} maxLength={4000} required placeholder="Une forêt brumeuse au lever du soleil…"/><button disabled={busy || !prompt.trim()}>{busy ? 'Envoi…' : 'Envoyer à ComfyUI'}</button></form>{result && <p className="result" role="status">{result}</p>}<p className="note">La génération nécessite un workflow vidéo ComfyUI configuré. Consultez le README pour le brancher.</p></main>;
}

createRoot(document.getElementById('root')!).render(<App />);
