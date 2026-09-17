# Personal Video AI

Base locale pour un studio de génération vidéo personnel : API FastAPI, interface React et adaptateur ComfyUI. Le workflow API `workflows/video_api.json` correspond au modèle local Wan 2.2 TI2V 5B, réglé sur 640 × 352 et 49 images. Les poids du modèle doivent être installés séparément dans ComfyUI.

## Prérequis

- Python 3.11 ou plus récent
- Node.js 20 ou plus récent avec npm
- ComfyUI pour soumettre de vraies générations

## Démarrer l'API

Depuis `backend` :

```powershell
py -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000
```

Ouvrir http://127.0.0.1:8000/api/health ou http://127.0.0.1:8000/docs.

## Démarrer l'interface

Depuis `frontend` :

```powershell
npm.cmd install
npm.cmd run dev
```

Ouvrir http://127.0.0.1:5173. Vite transmet `/api` à l'API locale. L'utilisation de `npm.cmd` évite le blocage éventuel de `npm.ps1` par PowerShell.

## Brancher ComfyUI

1. Démarrer l'instance locale ComfyUI. Le modèle Wan 2.2 TI2V 5B, son VAE et son encodeur texte doivent être présents dans ComfyUI.
2. Copier `config/settings.example.json` vers `config/settings.json`. L'URL par défaut est `http://127.0.0.1:8188` et le nœud de prompt du workflow fourni est `6`.
3. Envoyer `POST /api/generate` avec `{"prompt":"Une scène de forêt au lever du soleil"}`. La réponse contient l'identifiant de tâche ComfyUI. `GET /api/jobs/{id}` expose son état et l'URL vidéo après la génération ; l'interface affiche automatiquement le résultat.

Sans configuration, `/api/generate` répond 503 avec une explication. Avec la configuration mais sans instance ComfyUI active, il répond 502. Le workflow fourni dépend des modèles Wan 2.2 installés localement.

## Historique

Chaque génération envoyée depuis l'interface est enregistrée dans `data/jobs.sqlite3`. La section **Mes créations** permet de rouvrir les rendus après avoir fermé le navigateur. `GET /api/jobs` fournit les entrées récentes. Les vidéos restent dans le dossier de sortie de ComfyUI : l'instance doit être ouverte pour les lire depuis cette application.

## Structure

- `backend/app/main.py` : routes API et validation
- `backend/app/comfyui.py` : adaptateur HTTP ComfyUI
- `frontend/` : interface minimale React/Vite/TypeScript
- `workflows/` : exports API ComfyUI
- `config/` : exemple de configuration
- `data/` : fichiers locaux ignorés par Git

