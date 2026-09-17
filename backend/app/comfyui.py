"""Minimal ComfyUI queue adapter for API-format workflows."""

import copy
import json
from pathlib import Path
from typing import Any

import httpx


ROOT = Path(__file__).resolve().parents[2]


class ConfigurationError(Exception):
    pass


def load_settings() -> dict[str, Any]:
    path = ROOT / "config" / "settings.json"
    if not path.is_file():
        raise ConfigurationError("Copiez config/settings.example.json vers config/settings.json et configurez votre workflow ComfyUI.")
    try:
        settings = json.loads(path.read_text(encoding="utf-8"))
        if not isinstance(settings, dict):
            raise ValueError("configuration invalide")
        return settings
    except (OSError, ValueError) as exc:
        raise ConfigurationError(f"Configuration illisible : {exc}") from exc


def build_workflow(settings: dict[str, Any], prompt: str, seed: int | None) -> dict[str, Any]:
    relative = Path(str(settings.get("workflow_path", "")))
    if not relative.parts or relative.is_absolute() or ".." in relative.parts:
        raise ConfigurationError("workflow_path doit désigner un fichier relatif au projet.")
    path = (ROOT / relative).resolve()
    if not path.is_relative_to(ROOT) or not path.is_file():
        raise ConfigurationError(f"Workflow introuvable : {relative}")
    try:
        workflow = json.loads(path.read_text(encoding="utf-8"))
        if not isinstance(workflow, dict):
            raise ValueError("le workflow API doit être un objet JSON")
        workflow = copy.deepcopy(workflow)
        workflow[str(settings["prompt_node_id"])]["inputs"]["text"] = prompt
        if seed is not None and settings.get("seed_node_id"):
            seed_input = str(settings.get("seed_input", "seed"))
            workflow[str(settings["seed_node_id"])]["inputs"][seed_input] = seed
        return workflow
    except (OSError, ValueError, KeyError, TypeError) as exc:
        raise ConfigurationError(f"Workflow invalide ou nœud configuré absent : {exc}") from exc


async def queue_generation(prompt: str, seed: int | None = None) -> dict[str, Any]:
    settings = load_settings()
    workflow = build_workflow(settings, prompt, seed)
    url = str(settings.get("comfyui_url", "http://127.0.0.1:8188")).rstrip("/")
    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.post(f"{url}/prompt", json={"prompt": workflow})
        response.raise_for_status()
        result = response.json()
    if not isinstance(result, dict) or not result.get("prompt_id"):
        raise ValueError("ComfyUI n'a pas renvoyé de prompt_id.")
    return {"prompt_id": result["prompt_id"], "status": "queued"}
