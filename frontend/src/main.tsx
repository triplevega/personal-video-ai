import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './style.css';

type VideoFormat = 'landscape' | 'square' | 'portrait';
type Quality = 'fast' | 'detailed';
type EngineId = 'auto' | 'wan' | 'ltx' | 'hunyuan';
type Engine = { id: EngineId; name: string; available: boolean };
type Job = { id: string; prompt: string; created_at: string; video_format: VideoFormat | null; duration_seconds: number | null; quality: Quality | null };
const formatLabels: Record<VideoFormat, string> = { landscape: 'Paysage', square: 'Carré', portrait: 'Portrait' };

function App() {
  const [health, setHealth] = useState('Vérification…');
  const [prompt, setPrompt] = useState('');
  const [videoFormat, setVideoFormat] = useState<VideoFormat>('landscape');
  const [durationSeconds, setDurationSeconds] = useState<2 | 3>(2);
  const [quality, setQuality] = useState<Quality>('detailed');
  const [engine, setEngine] = useState<EngineId>('auto');
  const [engines, setEngines] = useState<Engine[]>([]);
  const [startImage, setStartImage] = useState<File | null>(null);
  const [imageFormat, setImageFormat] = useState<VideoFormat | null>(null);
  const [result, setResult] = useState('');
  const [busy, setBusy] = useState(false);
  const [jobId, setJobId] = useState(() => new URLSearchParams(window.location.search).get('job') || localStorage.getItem('lastJobId') || '');
  const [jobRefresh, setJobRefresh] = useState(0);
  const [jobStatus, setJobStatus] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [jobs, setJobs] = useState<Job[]>([]);

  async function loadJobs() { try { const response = await fetch('/api/jobs'); if (response.ok) setJobs(await response.json()); } catch {} }

  useEffect(() => {
    fetch('/api/health').then(r => r.json()).then(data => setHealth(data.status === 'ok' ? `API connectée · v${data.version}` : 'API indisponible')).catch(() => setHealth('API indisponible'));
    fetch('/api/engines').then(r => r.json()).then(data => { if (Array.isArray(data)) setEngines(data); }).catch(() => {});
    void loadJobs();
  }, []);

  useEffect(() => {
    if (!jobId) return;
    let active = true; let timer: ReturnType<typeof setTimeout>;
    async function check() {
      try {
        const response = await fetch(`/api/jobs/${jobId}`); const data = await response.json(); if (!active) return;
        if (!response.ok) { setJobStatus(data.detail ?? 'Impossible de suivre la tâche.'); return; }
        if (data.status === 'completed') { setJobStatus('Vidéo terminée'); setVideoUrl(data.video_url ?? ''); void loadJobs(); }
        else if (data.status === 'failed') setJobStatus('La génération a échoué dans ComfyUI.');
        else { setJobStatus(data.status === 'running' ? 'Génération en cours…' : 'En attente dans ComfyUI…'); timer = setTimeout(check, 3000); }
      } catch { if (active) { setJobStatus('Connexion à ComfyUI interrompue. Nouvelle tentative…'); timer = setTimeout(check, 5000); } }
    }
    void check(); return () => { active = false; clearTimeout(timer); };
  }, [jobId, jobRefresh]);

  async function generate(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setResult('');
    try {
      let imageName: string | undefined;
      if (startImage) {
        if (startImage.size > 10_000_000) throw new Error('L’image doit faire moins de 10 Mo.');
        const upload = await fetch('/api/images', { method: 'POST', headers: { 'Content-Type': startImage.type }, body: startImage });
        const uploaded = await upload.json(); if (!upload.ok) throw new Error(uploaded.detail ?? 'Impossible d’envoyer l’image.'); imageName = uploaded.name;
      }
      const response = await fetch('/api/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt, video_format: videoFormat, duration_seconds: durationSeconds, start_image: imageName, quality, engine }) });
      const data = await response.json();
      if (response.ok) {
        localStorage.setItem('lastJobId', data.prompt_id); setVideoUrl(''); setJobStatus('En attente dans ComfyUI…'); setJobId(data.prompt_id); window.history.replaceState(null, '', `?job=${data.prompt_id}`);
        setResult(`Tâche envoyée avec ${data.engine === 'wan' ? 'Wan 2.2' : data.engine} : ${data.prompt_id}`); void loadJobs();
      } else setResult(data.detail ?? 'Erreur inconnue');
    } catch (error) { setResult(error instanceof Error ? error.message : 'Impossible de joindre l’API. Démarrez le backend.'); }
    finally { setBusy(false); }
  }

  function selectJob(id: string) { setResult(''); setVideoUrl(''); setJobStatus('Chargement de la vidéo…'); setJobId(id); setJobRefresh(value => value + 1); localStorage.setItem('lastJobId', id); window.history.replaceState(null, '', `?job=${id}`); }

  async function chooseImage(file: File | null) {
    setStartImage(file); setImageFormat(null); if (!file) return;
    try { const bitmap = await createImageBitmap(file); const ratio = bitmap.width / bitmap.height; bitmap.close(); const detected: VideoFormat = ratio < 0.85 ? 'portrait' : ratio > 1.15 ? 'landscape' : 'square'; setImageFormat(detected); setVideoFormat(detected); }
    catch { setResult('Impossible de lire les dimensions de l’image choisie.'); }
  }

  return <main>
    <div className="badge">MILESTONE 003</div><h1>Personal Video AI</h1>
    <p className="intro">Studio vidéo IA personnel · architecture multi-moteurs.</p><p className="status">● {health}</p>
    <form onSubmit={generate}>
      <label htmlFor="prompt">Décrivez une scène</label><textarea id="prompt" value={prompt} onChange={e => setPrompt(e.target.value)} minLength={1} maxLength={4000} required placeholder="Une forêt brumeuse au lever du soleil…"/>
      <div className="quality-field"><label htmlFor="engine">Moteur IA</label><select id="engine" value={engine} onChange={e => setEngine(e.target.value as EngineId)}>{(engines.length ? engines : [{id:'auto',name:'Auto',available:true},{id:'wan',name:'Wan 2.2',available:true},{id:'ltx',name:'LTX',available:false},{id:'hunyuan',name:'HunyuanVideo',available:false}] as Engine[]).map(item => <option key={item.id} value={item.id} disabled={!item.available}>{item.name}{!item.available ? ' · bientôt disponible' : ''}</option>)}</select><small>Auto utilise actuellement Wan 2.2. Cette couche permettra d’ajouter LTX et d’autres moteurs sans modifier l’interface.</small></div>
      <div className="image-field"><label htmlFor="start-image">Image de départ <span>(facultatif)</span></label><input id="start-image" type="file" accept="image/png,image/jpeg,image/webp" onChange={e => void chooseImage(e.target.files?.[0] ?? null)}/>{startImage && <button type="button" className="clear-image" onClick={() => { void chooseImage(null); const input = document.getElementById('start-image') as HTMLInputElement; input.value = ''; }}>Retirer l’image</button>}{imageFormat && videoFormat !== imageFormat && <p className="format-warning">L’image est au format {formatLabels[imageFormat].toLowerCase()}. Choisir un autre format peut couper une grande partie de l’image.</p>}</div>
      <div className="settings-row"><div><label htmlFor="video-format">Format</label><select id="video-format" value={videoFormat} onChange={e => setVideoFormat(e.target.value as VideoFormat)}><option value="landscape">Paysage</option><option value="square">Carré</option><option value="portrait">Portrait</option></select></div><div><label htmlFor="duration">Durée</label><select id="duration" value={durationSeconds} onChange={e => setDurationSeconds(Number(e.target.value) as 2 | 3)}><option value={2}>Environ 2 secondes</option><option value={3} disabled={quality === 'detailed'}>Environ 3 secondes {quality === 'detailed' ? '(mode rapide)' : ''}</option></select></div></div>
      <div className="quality-field"><label htmlFor="quality">Qualité</label><select id="quality" value={quality} onChange={e => { const next = e.target.value as Quality; setQuality(next); if (next === 'detailed') setDurationSeconds(2); }}><option value="detailed">Détaillée · plus nette</option><option value="fast">Rapide · basse résolution</option></select><small>{quality === 'detailed' ? 'Résolution plus élevée. Durée limitée à environ 2 secondes.' : 'Résolution réduite pour des essais plus rapides, jusqu’à environ 3 secondes.'}</small></div>
      <button disabled={busy || !prompt.trim()}>{busy ? 'Envoi…' : 'Générer la vidéo'}</button>
    </form>
    {result && <p className="result" role="status">{result}</p>}{jobStatus && <p className="result" role="status">{jobStatus}</p>}{videoUrl && <><video className="video" src={videoUrl} controls playsInline /><a className="download" href={videoUrl} download={`personal-video-ai-${jobId}.mp4`}>Télécharger la vidéo</a></>}
    <section className="history"><div className="history-heading"><h2>Mes créations</h2><button type="button" onClick={() => void loadJobs()}>Actualiser</button></div>{jobs.length === 0 ? <p className="note">Les vidéos envoyées depuis cette interface apparaîtront ici.</p> : <ul>{jobs.map(job => <li key={job.id}><button type="button" className={`history-item${job.id === jobId ? ' selected' : ''}`} onClick={() => selectJob(job.id)} aria-pressed={job.id === jobId}><span>{job.prompt}</span><small>{new Date(job.created_at).toLocaleString('fr-FR')}{job.video_format && job.duration_seconds ? ` · ${formatLabels[job.video_format]} · ≈ ${job.duration_seconds} s` : ''}{job.quality ? ` · ${job.quality === 'detailed' ? 'Détaillée' : 'Rapide'}` : ''}</small></button></li>)}</ul>}</section>
    <p className="note">Wan 2.2 reste le moteur actif pendant la migration multi-modèles. Gardez ComfyUI ouvert pendant le rendu.</p>
  </main>;
}

createRoot(document.getElementById('root')!).render(<App />);
