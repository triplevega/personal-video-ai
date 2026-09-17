# Personal Video AI — Milestone 001

Base locale pour un studio de génération vidéo personnel : API FastAPI, interface React et adaptateur ComfyUI. Ce jalon vérifie le démarrage de l'application ; il ne fournit pas encore de modèle vidéo ni de workflow prêt à générer.

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

1. Démarrer ComfyUI et exporter un workflow au format **API** dans `workflows/video_api.json`.
2. Copier `config/settings.example.json` vers `config/settings.json` et adapter l'URL, le chemin du workflow et les identifiants de nœuds.
3. Le nœud de texte indiqué par `prompt_node_id` doit posséder une entrée `text`. La durée et le seed sont facultatifs : renseigner les identifiants et noms d'entrées seulement si le workflow les propose.
4. Envoyer `POST /api/generate` avec `{"prompt":"Une scène de forêt au lever du soleil"}`. La réponse contient l'identifiant de tâche ComfyUI ; le suivi et le téléchargement vidéo viendront dans un jalon suivant.

Sans configuration, `/api/generate` répond 503 avec une explication. Aucun workflow générique ne peut garantir une vidéo sans connaître les modèles et nœuds installés dans ComfyUI.

## Structure

- `backend/app/main.py` : routes API et validation
- `backend/app/comfyui.py` : adaptateur HTTP ComfyUI
- `frontend/` : interface minimale React/Vite/TypeScript
- `workflows/` : exports API ComfyUI
- `config/` : exemple de configuration
- `data/` : fichiers locaux ignorés par Git

