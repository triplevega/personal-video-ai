import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './style.css';

type Job = { id: string; prompt: string; created_at: string };

function App() {
  const [health, setHealth] = useState('Vérification…');
  const [prompt, setPrompt] = useState('');
  const [result, setResult] = useState('');
  const [busy, setBusy] = useState(false);
  const [jobId, setJobId] = useState(() => new URLSearchParams(window.location.search).get('job') || localStorage.getItem('lastJobId') || '');
  const [jobStatus, setJobStatus] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [jobs, setJobs] = useState<Job[]>([]);

  async function loadJobs() {
    try {
      const response = await fetch('/api/jobs');
      if (response.ok) setJobs(await response.json());
    } catch {
      // The connection state above already reports when the API is unavailable.
    }
  }

  useEffect(() => {
    fetch('/api/health').then(r => r.json()).then(data => setHealth(data.status === 'ok' ? 'API connectée' : 'API indisponible')).catch(() => setHealth('API indisponible'));
    void loadJobs();
  }, []);

  useEffect(() => {
    if (!jobId) return;
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    async function check() {
      try {
        const response = await fetch(`/api/jobs/${jobId}`);
        const data = await response.json();
        if (!active) return;
        if (!response.ok) {
          setJobStatus(data.detail ?? 'Impossible de suivre la tâche.');
          return;
        }
        if (data.status === 'completed') {
          setJobStatus('Vidéo terminée');
          setVideoUrl(data.video_url ?? '');
          void loadJobs();
        } else if (data.status === 'failed') {
          setJobStatus('La génération a échoué dans ComfyUI.');
        } else {
          setJobStatus(data.status === 'running' ? 'Génération en cours…' : 'En attente dans ComfyUI…');
          timer = setTimeout(check, 3000);
        }
      } catch {
        if (active) {
          setJobStatus('Connexion à ComfyUI interrompue. Nouvelle tentative…');
          timer = setTimeout(check, 5000);
        }
      }
    }
    void check();
    return () => { active = false; clearTimeout(timer); };
  }, [jobId]);

  async function generate(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setResult('');
    try {
      const response = await fetch('/api/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt }) });
      const data = await response.json();
      if (response.ok) {
        localStorage.setItem('lastJobId', data.prompt_id);
        setVideoUrl('');
        setJobStatus('En attente dans ComfyUI…');
        setJobId(data.prompt_id);
        window.history.replaceState(null, '', `?job=${data.prompt_id}`);
        setResult(`Tâche envoyée à ComfyUI : ${data.prompt_id}`);
        void loadJobs();
      } else {
        setResult(data.detail ?? 'Erreur inconnue');
      }
    } catch {
      setResult('Impossible de joindre l’API. Démarrez le backend.');
    } finally {
      setBusy(false);
    }
  }

  function selectJob(id: string) {
    setResult('');
    setVideoUrl('');
    setJobStatus('');
    setJobId(id);
    localStorage.setItem('lastJobId', id);
    window.history.replaceState(null, '', `?job=${id}`);
  }

  return <main><div className="badge">MILESTONE 002</div><h1>Personal Video AI</h1><p className="intro">Votre studio vidéo IA personnel, en construction.</p><p className="status">● {health}</p><form onSubmit={generate}><label htmlFor="prompt">Décrivez une scène</label><textarea id="prompt" value={prompt} onChange={e => setPrompt(e.target.value)} minLength={1} maxLength={4000} required placeholder="Une forêt brumeuse au lever du soleil…"/><button disabled={busy || !prompt.trim()}>{busy ? 'Envoi…' : 'Envoyer à ComfyUI'}</button></form>{result && <p className="result" role="status">{result}</p>}{jobStatus && <p className="result" role="status">{jobStatus}</p>}{videoUrl && <><video className="video" src={videoUrl} controls playsInline /><a className="download" href={videoUrl} download={`personal-video-ai-${jobId}.mp4`}>Télécharger la vidéo</a></>}<section className="history"><div className="history-heading"><h2>Mes créations</h2><button type="button" onClick={() => void loadJobs()}>Actualiser</button></div>{jobs.length === 0 ? <p className="note">Les vidéos envoyées depuis cette interface apparaîtront ici.</p> : <ul>{jobs.map(job => <li key={job.id}><button type="button" className={`history-item${job.id === jobId ? ' selected' : ''}`} onClick={() => selectJob(job.id)} aria-pressed={job.id === jobId}><span>{job.prompt}</span><small>{new Date(job.created_at).toLocaleString('fr-FR')}</small></button></li>)}</ul>}</section><p className="note">La génération utilise le workflow local Wan 2.2. Gardez ComfyUI ouvert pendant le rendu.</p></main>;
}

createRoot(document.getElementById('root')!).render(<App />);

