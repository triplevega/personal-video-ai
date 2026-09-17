"""Personal Video AI HTTP API."""

import httpx
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel, Field
from uuid import UUID
from typing import Literal

from .comfyui import ConfigurationError, get_job, get_job_video, queue_generation, upload_start_image
from .store import list_jobs, record_job

app = FastAPI(title="Personal Video AI", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:5173", "http://localhost:5173"],
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)


class GenerateRequest(BaseModel):
    prompt: str = Field(min_length=1, max_length=4000)
    seed: int | None = Field(default=None, ge=0)
    video_format: Literal["landscape", "square", "portrait"] = "landscape"
    duration_seconds: Literal[2, 3] = 2
    start_image: str | None = Field(default=None, pattern=r"^personal-video-ai-[0-9a-f]{32}\.(png|jpg|webp)$")


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok", "version": "0.1.0"}


@app.post("/api/generate", status_code=202)
async def generate(request: GenerateRequest) -> dict[str, str]:
    try:
        result = await queue_generation(request.prompt, request.seed, request.video_format, request.duration_seconds, request.start_image)
        record_job(result["prompt_id"], request.prompt, request.video_format, request.duration_seconds)
        return result
    except ConfigurationError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except (httpx.HTTPError, ValueError) as exc:
        raise HTTPException(status_code=502, detail=f"ComfyUI indisponible ou réponse invalide : {exc}") from exc


@app.post("/api/images", status_code=201)
async def upload_image(request: Request) -> dict[str, str]:
    media_type = request.headers.get("content-type", "").split(";", 1)[0].lower()
    extension = {"image/png": "png", "image/jpeg": "jpg", "image/webp": "webp"}.get(media_type)
    if not extension:
        raise HTTPException(status_code=415, detail="Choisissez une image PNG, JPEG ou WebP.")
    if request.headers.get("content-length") and int(request.headers["content-length"]) > 10_000_000:
        raise HTTPException(status_code=413, detail="L’image doit faire moins de 10 Mo.")
    content = await request.body()
    if not content or len(content) > 10_000_000:
        raise HTTPException(status_code=413, detail="L’image doit faire moins de 10 Mo.")
    signatures = {"png": content.startswith(b"\x89PNG\r\n\x1a\n"), "jpg": content.startswith(b"\xff\xd8\xff"), "webp": content.startswith(b"RIFF") and content[8:12] == b"WEBP"}
    if not signatures[extension]:
        raise HTTPException(status_code=415, detail="Le fichier ne correspond pas à une image valide.")
    try:
        return {"name": await upload_start_image(content, extension)}
    except ConfigurationError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except (httpx.HTTPError, ValueError) as exc:
        raise HTTPException(status_code=502, detail=f"Impossible d’envoyer l’image à ComfyUI : {exc}") from exc


@app.get("/api/jobs")
def history() -> list[dict]:
    return list_jobs()


@app.get("/api/jobs/{job_id}")
async def job_status(job_id: UUID) -> dict:
    try:
        return await get_job(str(job_id))
    except ConfigurationError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except (httpx.HTTPError, ValueError) as exc:
        raise HTTPException(status_code=502, detail=f"Impossible de lire la tâche ComfyUI : {exc}") from exc


@app.get("/api/jobs/{job_id}/video")
async def job_video(job_id: UUID) -> Response:
    try:
        content = await get_job_video(str(job_id))
    except ConfigurationError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except (httpx.HTTPError, ValueError) as exc:
        raise HTTPException(status_code=502, detail=f"Impossible de lire la vidéo ComfyUI : {exc}") from exc
    if content is None:
        raise HTTPException(status_code=404, detail="Vidéo indisponible pour cette tâche.")
    return Response(content=content, media_type="video/mp4")

