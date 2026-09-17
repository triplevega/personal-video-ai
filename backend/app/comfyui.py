"""Minimal ComfyUI queue adapter for API-format workflows."""

import copy
import json
from pathlib import Path
from typing import Any

import httpx


ROOT = Path(__file__).resolve().parents[2]
FORMAT_SIZES = {"landscape": (640, 352), "square": (512, 512), "portrait": (352, 640)}
DURATION_FRAMES = {2: 49, 3: 73}


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


def build_workflow(settings: dict[str, Any], prompt: str, seed: int | None, video_format: str = "landscape", duration_seconds: int = 2) -> dict[str, Any]:
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
        width, height = FORMAT_SIZES[video_format]
        video_inputs = workflow[str(settings.get("video_node_id", "55"))]["inputs"]
        video_inputs.update(width=width, height=height, length=DURATION_FRAMES[duration_seconds])
        if seed is not None and settings.get("seed_node_id"):
            seed_input = str(settings.get("seed_input", "seed"))
            workflow[str(settings["seed_node_id"])]["inputs"][seed_input] = seed
        return workflow
    except (OSError, ValueError, KeyError, TypeError) as exc:
        raise ConfigurationError(f"Workflow invalide ou nœud configuré absent : {exc}") from exc


async def queue_generation(prompt: str, seed: int | None = None, video_format: str = "landscape", duration_seconds: int = 2) -> dict[str, Any]:
    settings = load_settings()
    workflow = build_workflow(settings, prompt, seed, video_format, duration_seconds)
    url = str(settings.get("comfyui_url", "http://127.0.0.1:8188")).rstrip("/")
    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.post(f"{url}/prompt", json={"prompt": workflow})
        response.raise_for_status()
        result = response.json()
    if not isinstance(result, dict) or not result.get("prompt_id"):
        raise ValueError("ComfyUI n'a pas renvoyé de prompt_id.")
    return {"prompt_id": result["prompt_id"], "status": "queued"}


async def get_job(job_id: str) -> dict[str, Any]:
    """Read a queued job from ComfyUI history and locate its MP4 output."""
    settings = load_settings()
    url = str(settings.get("comfyui_url", "http://127.0.0.1:8188")).rstrip("/")
    async with httpx.AsyncClient(timeout=15) as client:
        response = await client.get(f"{url}/history/{job_id}")
        response.raise_for_status()
        history = response.json()
    entry = history.get(job_id) if isinstance(history, dict) else None
    if not isinstance(entry, dict):
        return {"status": "queued"}
    state = entry.get("status", {}).get("status_str")
    if state != "success":
        return {"status": "failed" if state == "error" else "running"}
    for output in entry.get("outputs", {}).values():
        for file in output.get("images", []) + output.get("videos", []):
            if str(file.get("filename", "")).lower().endswith(".mp4"):
                return {"status": "completed", "video_url": f"/api/jobs/{job_id}/video"}
    return {"status": "completed"}


async def get_job_video(job_id: str) -> bytes | None:
    """Fetch only an MP4 that belongs to the requested ComfyUI job."""
    settings = load_settings()
    url = str(settings.get("comfyui_url", "http://127.0.0.1:8188")).rstrip("/")
    async with httpx.AsyncClient(timeout=60) as client:
        history_response = await client.get(f"{url}/history/{job_id}")
        history_response.raise_for_status()
        history = history_response.json()
        entry = history.get(job_id) if isinstance(history, dict) else None
        if not isinstance(entry, dict) or entry.get("status", {}).get("status_str") != "success":
            return None
        for output in entry.get("outputs", {}).values():
            for file in output.get("images", []) + output.get("videos", []):
                if str(file.get("filename", "")).lower().endswith(".mp4"):
                    video_response = await client.get(f"{url}/view", params={
                        "filename": file["filename"],
                        "subfolder": file.get("subfolder", ""),
                        "type": file.get("type", "output"),
                    })
                    video_response.raise_for_status()
                    return video_response.content
    return None

