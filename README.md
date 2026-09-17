# Personal Video AI — Milestone 001

Base locale pour un studio de génération vidéo personnel : API FastAPI, interface React et adaptateur ComfyUI. Le workflow API `workflows/video_api.json` correspond au modèle local Wan 2.2 TI2V 5B, réglé sur 640 × 352 et 49 images. Les poids du modèle doivent être installés séparément dans ComfyUI.

## Prérequis

- Python 3.11 ou plus récent
- Node.js 20 ou plus récent et pnpm (ou npm)
- ComfyUI pour soumettre de vraies générations

## Démarrer l'API

Depuis `backend` :

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Ouvrir http://127.0.0.1:8000/api/health ou http://127.0.0.1:8000/docs.

## Démarrer l'interface

Depuis `frontend` :

```powershell
pnpm install
pnpm dev
```

Avec npm : `npm install`, puis `npm run dev`. Ouvrir http://127.0.0.1:5173. Vite transmet `/api` à l'API locale.

## Brancher ComfyUI

1. Démarrer l'instance locale ComfyUI. Le modèle Wan 2.2 TI2V 5B, son VAE et son encodeur texte doivent être présents dans ComfyUI.
2. Copier `config/settings.example.json` vers `config/settings.json`. L'URL par défaut est `http://127.0.0.1:8188` et le nœud de prompt du workflow fourni est `6`.
3. Envoyer `POST /api/generate` avec `{"prompt":"Une scène de forêt au lever du soleil"}`. La réponse contient l'identifiant de tâche ComfyUI ; le suivi et le téléchargement vidéo viendront dans un jalon suivant.

Sans configuration, `/api/generate` répond 503 avec une explication. Avec la configuration mais sans instance ComfyUI active, il répond 502. Le workflow fourni dépend des modèles Wan 2.2 installés localement.

## Structure

- `backend/app/main.py` : routes API et validation
- `backend/app/comfyui.py` : adaptateur HTTP ComfyUI
- `frontend/` : interface minimale React/Vite/TypeScript
- `workflows/` : exports API ComfyUI
- `config/` : exemple de configuration
- `data/` : fichiers locaux ignorés par Git

